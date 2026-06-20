import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';
import { TransfersService } from '../src/transfers/transfers.service';

describe('Stock Operations: Transfers + Stock Counts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let users: UsersService;
  let transfers: TransfersService;
  let http: Server;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = moduleRef.get(PrismaService);
    users = moduleRef.get(UsersService);
    transfers = moduleRef.get(TransfersService);
    http = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await clearAll();
    await app.close();
  });

  let adminToken: string;
  let managerToken: string; // scoped to w1 only
  let staffToken: string; // scoped to w1
  let w1: string;
  let w2: string;
  let pA: string;
  let pB: string;

  async function login(email: string): Promise<string> {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return (res.body as { accessToken: string }).accessToken;
  }

  async function clearAll(): Promise<void> {
    await prisma.activityLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.stockCountLine.deleteMany();
    await prisma.stockCount.deleteMany();
    await prisma.stockTransferLine.deleteMany();
    await prisma.stockTransfer.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.user.deleteMany();
  }

  async function setAvailable(
    productId: string,
    warehouseId: string,
    qty: number,
  ): Promise<void> {
    await prisma.inventoryItem.create({
      data: { productId, warehouseId, available: qty },
    });
  }

  beforeEach(async () => {
    await clearAll();
    await users.create({
      name: 'Admin',
      email: 'admin@so.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    const manager = await users.create({
      name: 'Mgr',
      email: 'mgr@so.local',
      password: 'password123',
      role: Role.WAREHOUSE_MANAGER,
    });
    const staff = await users.create({
      name: 'Stf',
      email: 'stf@so.local',
      password: 'password123',
      role: Role.STAFF,
    });

    const wh1 = await prisma.warehouse.create({
      data: {
        name: 'W1',
        users: { connect: [{ id: manager.id }, { id: staff.id }] },
      },
    });
    const wh2 = await prisma.warehouse.create({ data: { name: 'W2' } });
    w1 = wh1.id;
    w2 = wh2.id;
    const a = await prisma.product.create({
      data: { name: 'Prod A', sku: 'PA' },
    });
    const b = await prisma.product.create({
      data: { name: 'Prod B', sku: 'PB' },
    });
    pA = a.id;
    pB = b.id;

    adminToken = await login('admin@so.local');
    managerToken = await login('mgr@so.local');
    staffToken = await login('stf@so.local');
  });

  // ===== Transfers =====

  function requestTransfer(
    token: string,
    source: string,
    dest: string,
    qty = 20,
    expectStatus = 201,
  ) {
    return request(http)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceWarehouseId: source,
        destinationWarehouseId: dest,
        lines: [{ productId: pA, quantity: qty }],
      })
      .expect(expectStatus);
  }

  it('transfer lifecycle moves stock A→B with conserved in-transit and Transfer movements', async () => {
    await setAvailable(pA, w1, 50);
    const t = (await requestTransfer(adminToken, w1, w2, 20)).body as {
      id: string;
      status: string;
      code: string;
    };
    expect(t.status).toBe('REQUESTED');
    expect(t.code).toMatch(/^TR-\d{5}$/);

    // Source held: available 30, inTransit 20.
    let src = await prisma.inventoryItem.findUniqueOrThrow({
      where: { productId_warehouseId: { productId: pA, warehouseId: w1 } },
    });
    expect(src.available).toBe(30);
    expect(src.inTransit).toBe(20);

    await request(http)
      .post(`/api/v1/transfers/${t.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(http)
      .post(`/api/v1/transfers/${t.id}/receive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    src = await prisma.inventoryItem.findUniqueOrThrow({
      where: { productId_warehouseId: { productId: pA, warehouseId: w1 } },
    });
    const dest = await prisma.inventoryItem.findUniqueOrThrow({
      where: { productId_warehouseId: { productId: pA, warehouseId: w2 } },
    });
    expect(src.available).toBe(30);
    expect(src.inTransit).toBe(0); // hold cleared
    expect(dest.available).toBe(20);
    // Stock conserved across both warehouses: 30 + 20 = 50.
    expect(src.available + src.inTransit + dest.available).toBe(50);

    const moves = await prisma.stockMovement.findMany({
      where: { type: 'TRANSFER', refId: t.id },
    });
    // request (1) + receive source-clear (1) + receive dest-land (1) = 3
    expect(moves).toHaveLength(3);
  });

  it('cannot receive before approval → 409', async () => {
    await setAvailable(pA, w1, 50);
    const t = (await requestTransfer(adminToken, w1, w2, 10)).body as {
      id: string;
    };
    await request(http)
      .post(`/api/v1/transfers/${t.id}/receive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('cannot receive an already-completed transfer (optimistic status lock) → 409', async () => {
    await setAvailable(pA, w1, 50);
    const t = (await requestTransfer(adminToken, w1, w2, 10)).body as {
      id: string;
    };
    await request(http)
      .post(`/api/v1/transfers/${t.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(http)
      .post(`/api/v1/transfers/${t.id}/receive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    // Second receive must be rejected and must NOT move stock again.
    await request(http)
      .post(`/api/v1/transfers/${t.id}/receive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
    const dest = await prisma.inventoryItem.findUniqueOrThrow({
      where: { productId_warehouseId: { productId: pA, warehouseId: w2 } },
    });
    expect(dest.available).toBe(10); // not 20
  });

  it('cannot request more than available → 400', async () => {
    await setAvailable(pA, w1, 5);
    await requestTransfer(adminToken, w1, w2, 999, 400);
  });

  it('cancel releases the in-transit hold back to source available', async () => {
    await setAvailable(pA, w1, 40);
    const t = (await requestTransfer(adminToken, w1, w2, 15)).body as {
      id: string;
    };
    await request(http)
      .post(`/api/v1/transfers/${t.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const src = await prisma.inventoryItem.findUniqueOrThrow({
      where: { productId_warehouseId: { productId: pA, warehouseId: w1 } },
    });
    expect(src.available).toBe(40);
    expect(src.inTransit).toBe(0);
  });

  it('staff can request a transfer from their warehouse but cannot approve → 403', async () => {
    await setAvailable(pA, w1, 50);
    const t = (await requestTransfer(staffToken, w1, w2, 10)).body as {
      id: string;
    };
    await request(http)
      .post(`/api/v1/transfers/${t.id}/approve`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('manager cannot request a transfer out of a warehouse outside scope → 403', async () => {
    await setAvailable(pA, w2, 50);
    await requestTransfer(managerToken, w2, w1, 10, 403); // source w2 not in mgr scope
  });

  it('approve requires source-warehouse scope → 403 for a manager scoped only to the destination', async () => {
    await setAvailable(pA, w2, 50);
    const t = (await requestTransfer(adminToken, w2, w1, 10)).body as {
      id: string;
    }; // source w2, dest w1
    // Manager (w1) can SEE it (dest in scope) but cannot approve (source w2 out of scope).
    await request(http)
      .post(`/api/v1/transfers/${t.id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);
  });

  it('rejects same source/destination → 400', async () => {
    await setAvailable(pA, w1, 50);
    await requestTransfer(adminToken, w1, w1, 10, 400);
  });

  it('a failed transfer request transaction commits nothing', async () => {
    await setAvailable(pA, w1, 50);
    const scope = { isGlobal: true } as const;
    await expect(
      transfers.create(scope, '00000000-0000-4000-8000-000000000000', {
        sourceWarehouseId: w1,
        destinationWarehouseId: w2,
        lines: [{ productId: pA, quantity: 10 }],
      }),
    ).rejects.toBeDefined();
    const count = await prisma.stockTransfer.count();
    expect(count).toBe(0);
    const src = await prisma.inventoryItem.findUniqueOrThrow({
      where: { productId_warehouseId: { productId: pA, warehouseId: w1 } },
    });
    expect(src.available).toBe(50); // untouched
    expect(src.inTransit).toBe(0);
  });

  // ===== Stock Counts =====

  function createCount(token: string, warehouseId = w1, expectStatus = 201) {
    return request(http)
      .post('/api/v1/stock-counts')
      .set('Authorization', `Bearer ${token}`)
      .send({ warehouseId })
      .expect(expectStatus);
  }

  it('count session snapshots system stock, computes variance, and reconciles via Adjustment', async () => {
    await setAvailable(pA, w1, 50);
    await setAvailable(pB, w1, 30);
    const count = (await createCount(adminToken)).body as {
      id: string;
      status: string;
      lines: { sku: string; recordedQty: number }[];
    };
    expect(count.status).toBe('OPEN');
    expect(count.lines).toHaveLength(2);
    expect(count.lines.find((l) => l.sku === 'PA')?.recordedQty).toBe(50);

    // Staff enters physical counts: A short by 2, B exact.
    const entered = await request(http)
      .patch(`/api/v1/stock-counts/${count.id}/counts`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        entries: [
          { productId: pA, countedQty: 48 },
          { productId: pB, countedQty: 30 },
        ],
      })
      .expect(200);
    const lineA = (
      entered.body as { lines: { sku: string; variance: number | null }[] }
    ).lines.find((l) => l.sku === 'PA');
    expect(lineA?.variance).toBe(-2);

    // Admin reconciles → A adjusted to 48, B unchanged.
    const rec = await request(http)
      .post(`/api/v1/stock-counts/${count.id}/reconcile`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((rec.body as { status: string }).status).toBe('RECONCILED');

    const invA = await prisma.inventoryItem.findUniqueOrThrow({
      where: { productId_warehouseId: { productId: pA, warehouseId: w1 } },
    });
    expect(invA.available).toBe(48);
    const adj = await prisma.stockMovement.findMany({
      where: { type: 'ADJUSTMENT', refType: 'STOCK_COUNT', productId: pA },
    });
    expect(adj).toHaveLength(1);
    expect(adj[0].availableDelta).toBe(-2);
    // B had zero variance → no movement.
    const adjB = await prisma.stockMovement.count({
      where: { refType: 'STOCK_COUNT', productId: pB },
    });
    expect(adjB).toBe(0);
  });

  it('cannot enter counts on a reconciled session → 409', async () => {
    await setAvailable(pA, w1, 50);
    const count = (await createCount(adminToken)).body as { id: string };
    await request(http)
      .patch(`/api/v1/stock-counts/${count.id}/counts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ entries: [{ productId: pA, countedQty: 50 }] })
      .expect(200);
    await request(http)
      .post(`/api/v1/stock-counts/${count.id}/reconcile`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(http)
      .patch(`/api/v1/stock-counts/${count.id}/counts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ entries: [{ productId: pA, countedQty: 10 }] })
      .expect(409);
  });

  it('staff cannot create or reconcile a count → 403', async () => {
    await setAvailable(pA, w1, 50);
    await createCount(staffToken, w1, 403);
    const count = (await createCount(adminToken)).body as { id: string };
    await request(http)
      .post(`/api/v1/stock-counts/${count.id}/reconcile`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('entering a count for a product not in the session → 400', async () => {
    await setAvailable(pA, w1, 50);
    const count = (await createCount(adminToken)).body as { id: string };
    await request(http)
      .patch(`/api/v1/stock-counts/${count.id}/counts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ entries: [{ productId: pB, countedQty: 5 }] })
      .expect(400);
  });

  it('manager cannot open a count for an out-of-scope warehouse → 403', async () => {
    await createCount(managerToken, w2, 403);
  });

  it('unauthenticated transfer list → 401', async () => {
    await request(http).get('/api/v1/transfers').expect(401);
  });
});
