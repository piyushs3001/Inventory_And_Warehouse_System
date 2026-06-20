import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';
import { PurchaseOrdersService } from '../src/purchase-orders/purchase-orders.service';

describe('Procurement: Suppliers + Purchase Orders + Receiving (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let users: UsersService;
  let pos: PurchaseOrdersService;
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
    pos = moduleRef.get(PurchaseOrdersService);
    http = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await clearAll();
    await app.close();
  });

  let adminToken: string;
  let managerToken: string;
  let staffToken: string;
  let managerId: string;
  let w1: string;
  let w2: string;
  let supplierId: string;
  let pA: string; // product A, ordered 100
  let pB: string; // product B, ordered 30

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
    await prisma.goodsReceiptLine.deleteMany();
    await prisma.goodsReceipt.deleteMany();
    await prisma.purchaseOrderLine.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.product.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.user.deleteMany();
  }

  beforeEach(async () => {
    await clearAll();
    await users.create({
      name: 'Admin',
      email: 'admin@po.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    const manager = await users.create({
      name: 'Manager',
      email: 'manager@po.local',
      password: 'password123',
      role: Role.WAREHOUSE_MANAGER,
    });
    const staff = await users.create({
      name: 'Staff',
      email: 'staff@po.local',
      password: 'password123',
      role: Role.STAFF,
    });
    managerId = manager.id;

    const wh1 = await prisma.warehouse.create({
      data: {
        name: 'Central',
        users: { connect: [{ id: manager.id }, { id: staff.id }] },
      },
    });
    const wh2 = await prisma.warehouse.create({ data: { name: 'North' } });
    w1 = wh1.id;
    w2 = wh2.id;

    const supplier = await prisma.supplier.create({ data: { name: 'Acme' } });
    supplierId = supplier.id;
    const a = await prisma.product.create({
      data: { name: 'Widget A', sku: 'WIDA' },
    });
    const b = await prisma.product.create({
      data: { name: 'Widget B', sku: 'WIDB' },
    });
    pA = a.id;
    pB = b.id;

    adminToken = await login('admin@po.local');
    managerToken = await login('manager@po.local');
    staffToken = await login('staff@po.local');
  });

  function createPo(token: string, warehouseId = w1, expectStatus = 201) {
    return request(http)
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierId,
        warehouseId,
        expectedDate: '2099-01-01',
        lines: [
          { productId: pA, quantity: 100, unitCost: 1.5 },
          { productId: pB, quantity: 30, unitCost: 2 },
        ],
      })
      .expect(expectStatus);
  }

  async function advanceToApproved(): Promise<string> {
    const po = (await createPo(managerToken)).body as { id: string };
    await request(http)
      .post(`/api/v1/purchase-orders/${po.id}/send`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    await request(http)
      .post(`/api/v1/purchase-orders/${po.id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    return po.id;
  }

  // ---- Positive ----

  it('creates a Draft PO with generated code and computed total', async () => {
    const res = await createPo(managerToken);
    const po = res.body as {
      code: string;
      status: string;
      totalCost: string;
      lines: { unitCost: string; outstandingQty: number }[];
    };
    expect(po.status).toBe('DRAFT');
    expect(po.code).toMatch(/^PO-\d{5}$/);
    expect(po.totalCost).toBe('210.00'); // 100*1.5 + 30*2
    expect(po.lines[0].unitCost).toMatch(/\.\d{2}$/);
    expect(po.lines.find((_l, i) => i === 0)?.outstandingQty).toBe(100);
  });

  it('walks the full lifecycle Draft→Sent→Approved→Partially Received→Completed with correct stock + movements', async () => {
    const poId = await advanceToApproved();

    // Partial receipt: A 50/100 (5 damaged extra), B 30/30 → Partially Received
    const r1 = await request(http)
      .post(`/api/v1/purchase-orders/${poId}/receipts`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        deliveryNote: 'DN-1',
        lines: [
          { productId: pA, soundQty: 50, damagedQty: 5 },
          { productId: pB, soundQty: 30, damagedQty: 0 },
        ],
      })
      .expect(201);
    expect((r1.body as { resultingPoStatus: string }).resultingPoStatus).toBe(
      'PARTIALLY_RECEIVED',
    );

    const invA = await prisma.inventoryItem.findUniqueOrThrow({
      where: { productId_warehouseId: { productId: pA, warehouseId: w1 } },
    });
    expect(invA.available).toBe(50);
    expect(invA.damaged).toBe(5);
    const recvMoves = await prisma.stockMovement.findMany({
      where: { productId: pA, warehouseId: w1, type: 'RECEIVE' },
    });
    expect(recvMoves).toHaveLength(1);
    expect(recvMoves[0].refType).toBe('PURCHASE_ORDER');
    expect(recvMoves[0].refId).toBe(poId);
    expect(recvMoves[0].availableDelta).toBe(50);
    expect(recvMoves[0].damagedDelta).toBe(5);

    // Final receipt: A already has 50 sound + 5 damaged (55 accounted); 45 more
    // sound fully reconciles the line (95 sound + 5 damaged = 100 ordered). → Completed
    const r2 = await request(http)
      .post(`/api/v1/purchase-orders/${poId}/receipts`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ lines: [{ productId: pA, soundQty: 45, damagedQty: 0 }] })
      .expect(201);
    expect((r2.body as { resultingPoStatus: string }).resultingPoStatus).toBe(
      'COMPLETED',
    );

    const po = await request(http)
      .get(`/api/v1/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = po.body as {
      status: string;
      completedAt: string | null;
      lines: {
        sku: string;
        receivedQty: number;
        damagedQty: number;
        outstandingQty: number;
      }[];
    };
    expect(body.status).toBe('COMPLETED');
    expect(body.completedAt).not.toBeNull();
    const lineA = body.lines.find((l) => l.sku === 'WIDA')!;
    expect(lineA.receivedQty).toBe(95);
    expect(lineA.damagedQty).toBe(5);
    expect(lineA.outstandingQty).toBe(0); // 100 - 95 - 5
  });

  it('supplier performance reflects receipt history', async () => {
    const poId = await advanceToApproved();
    await request(http)
      .post(`/api/v1/purchase-orders/${poId}/receipts`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        lines: [
          { productId: pA, soundQty: 96, damagedQty: 4 }, // 100 accounted = ordered
          { productId: pB, soundQty: 30, damagedQty: 0 },
        ],
      })
      .expect(201);

    const perf = await request(http)
      .get(`/api/v1/suppliers/${supplierId}/performance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const p = perf.body as {
      totalOrders: number;
      completedOrders: number;
      unitsOrdered: number;
      unitsReceived: number;
      unitsDamaged: number;
      quantityAccuracy: number;
      damageRate: number;
    };
    expect(p.totalOrders).toBe(1);
    expect(p.completedOrders).toBe(1); // every line fully accounted (sound+damaged)
    expect(p.unitsOrdered).toBe(130);
    expect(p.unitsReceived).toBe(126); // sound only
    expect(p.unitsDamaged).toBe(4);
    expect(p.quantityAccuracy).toBe(0.9692); // 126/130
    expect(p.damageRate).toBe(0.0308); // 4/130
  });

  // ---- Negative / authz / state machine ----

  it('staff cannot create a PO → 403', async () => {
    await createPo(staffToken, w1, 403);
  });

  it('manager cannot create a PO for an out-of-scope warehouse → 403', async () => {
    await createPo(managerToken, w2, 403);
  });

  it('cannot receive before approval (Draft) → 409', async () => {
    const po = (await createPo(managerToken)).body as { id: string };
    await request(http)
      .post(`/api/v1/purchase-orders/${po.id}/receipts`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ lines: [{ productId: pA, soundQty: 10, damagedQty: 0 }] })
      .expect(409);
  });

  it('cannot approve a Draft (must be Sent) → 409', async () => {
    const po = (await createPo(managerToken)).body as { id: string };
    await request(http)
      .post(`/api/v1/purchase-orders/${po.id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(409);
  });

  it('rejects over-receipt (sound exceeds ordered) → 400', async () => {
    const poId = await advanceToApproved();
    await request(http)
      .post(`/api/v1/purchase-orders/${poId}/receipts`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ lines: [{ productId: pA, soundQty: 101, damagedQty: 0 }] })
      .expect(400);
  });

  it('rejects over-receipt when sound + damaged exceeds ordered → 400', async () => {
    const poId = await advanceToApproved();
    // 100 sound + 5 damaged = 105 units against a 100-unit line.
    await request(http)
      .post(`/api/v1/purchase-orders/${poId}/receipts`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ lines: [{ productId: pA, soundQty: 100, damagedQty: 5 }] })
      .expect(400);
    // Nothing booked.
    const inv = await prisma.inventoryItem.findUnique({
      where: { productId_warehouseId: { productId: pA, warehouseId: w1 } },
    });
    expect(inv).toBeNull();
  });

  it('rejects a receipt that lists the same product twice → 400', async () => {
    const poId = await advanceToApproved();
    await request(http)
      .post(`/api/v1/purchase-orders/${poId}/receipts`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        lines: [
          { productId: pA, soundQty: 60, damagedQty: 0 },
          { productId: pA, soundQty: 60, damagedQty: 0 },
        ],
      })
      .expect(400);
  });

  it('close-out marks a short-shipped Partially Received PO Completed', async () => {
    const poId = await advanceToApproved();
    // Receive less than ordered, then close out the remainder.
    await request(http)
      .post(`/api/v1/purchase-orders/${poId}/receipts`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        lines: [
          { productId: pA, soundQty: 40, damagedQty: 0 },
          { productId: pB, soundQty: 30, damagedQty: 0 },
        ],
      })
      .expect(201);
    const close = await request(http)
      .post(`/api/v1/purchase-orders/${poId}/close`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect((close.body as { status: string }).status).toBe('COMPLETED');
  });

  it('cannot close a PO that is not Partially Received → 409', async () => {
    const poId = await advanceToApproved(); // APPROVED, no receipts yet
    await request(http)
      .post(`/api/v1/purchase-orders/${poId}/close`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(409);
  });

  it('rejects a receipt line for a product not on the PO → 400', async () => {
    const poId = await advanceToApproved();
    const other = await prisma.product.create({
      data: { name: 'Other', sku: 'OTHER' },
    });
    await request(http)
      .post(`/api/v1/purchase-orders/${poId}/receipts`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ lines: [{ productId: other.id, soundQty: 5, damagedQty: 0 }] })
      .expect(400);
  });

  it('unauthenticated PO list → 401', async () => {
    await request(http).get('/api/v1/purchase-orders').expect(401);
  });

  // ---- Atomic receipt: a failure in the receipt transaction leaves NO partial state ----

  it('a failed receipt transaction commits nothing (receipt + line + movement + inventory all roll back)', async () => {
    const poId = await advanceToApproved();
    const scope = { isGlobal: true } as const;

    // Force the GoodsReceipt INSERT to fail its receivedById FK by passing a
    // non-existent user. The whole $transaction must roll back.
    await expect(
      pos.receive(scope, '00000000-0000-4000-8000-000000000000', poId, {
        lines: [{ productId: pA, soundQty: 40, damagedQty: 0 }],
      }),
    ).rejects.toBeDefined();

    const receipts = await prisma.goodsReceipt.count({
      where: { purchaseOrderId: poId },
    });
    expect(receipts).toBe(0);
    const line = await prisma.purchaseOrderLine.findFirstOrThrow({
      where: { purchaseOrderId: poId, productId: pA },
    });
    expect(line.receivedQty).toBe(0);
    const moves = await prisma.stockMovement.count({
      where: { productId: pA, warehouseId: w1 },
    });
    expect(moves).toBe(0);
    const inv = await prisma.inventoryItem.findUnique({
      where: { productId_warehouseId: { productId: pA, warehouseId: w1 } },
    });
    expect(inv).toBeNull();
    // PO stays Approved (status change rolled back too).
    const po = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: poId },
    });
    expect(po.status).toBe('APPROVED');
    void managerId;
  });
});
