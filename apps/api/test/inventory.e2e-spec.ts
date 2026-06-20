import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { MovementType } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';
import { InventoryService } from '../src/inventory/inventory.service';

describe('Inventory + Movements (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let users: UsersService;
  let inventory: InventoryService;
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
    inventory = moduleRef.get(InventoryService);
    http = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await clearAll();
    await app.close();
  });

  let adminToken: string;
  let managerToken: string;
  let staffToken: string;
  let w1: string; // manager + staff scoped here
  let w2: string; // out of manager/staff scope
  let productId: string;

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
    await prisma.inventoryItem.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.user.deleteMany();
  }

  beforeEach(async () => {
    await clearAll();

    const admin = await users.create({
      name: 'Admin',
      email: 'admin@inv.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    const manager = await users.create({
      name: 'Manager',
      email: 'manager@inv.local',
      password: 'password123',
      role: Role.WAREHOUSE_MANAGER,
    });
    const staff = await users.create({
      name: 'Staff',
      email: 'staff@inv.local',
      password: 'password123',
      role: Role.STAFF,
    });
    void admin;

    const wh1 = await prisma.warehouse.create({
      data: {
        name: 'Central DC',
        users: { connect: [{ id: manager.id }, { id: staff.id }] },
      },
    });
    const wh2 = await prisma.warehouse.create({
      data: { name: 'North Depot' },
    });
    w1 = wh1.id;
    w2 = wh2.id;

    const product = await prisma.product.create({
      data: { name: 'Cola 330ml', sku: 'COLA-330', reorderLevel: 50 },
    });
    productId = product.id;

    adminToken = await login('admin@inv.local');
    managerToken = await login('manager@inv.local');
    staffToken = await login('staff@inv.local');
  });

  function adjust(
    token: string,
    body: Record<string, unknown>,
    expectStatus = 200,
  ) {
    return request(http)
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(expectStatus);
  }

  // ---- Positive ----

  it('adjust creates the item, updates the bucket, and writes one ADJUSTMENT movement', async () => {
    const res = await adjust(managerToken, {
      productId,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 10,
      reason: 'Opening stock',
    });
    const item = res.body as {
      available: number;
      total: number;
      lowStock: boolean;
    };
    expect(item.available).toBe(10);
    expect(item.total).toBe(10);
    expect(item.lowStock).toBe(true); // 10 <= reorderLevel 50

    const movements = await prisma.stockMovement.findMany({
      where: { productId, warehouseId: w1 },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe('ADJUSTMENT');
    expect(movements[0].availableDelta).toBe(10);
    expect(movements[0].beforeQty).toBe(0);
    expect(movements[0].afterQty).toBe(10);
    expect(movements[0].reason).toBe('Opening stock');
  });

  it('reserve shifts available -> reserved, total unchanged, movement written', async () => {
    await adjust(managerToken, {
      productId,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 30,
      reason: 'seed',
    });

    const res = await request(http)
      .post('/api/v1/inventory/reserve')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ productId, warehouseId: w1, quantity: 12, reason: 'SO-1' })
      .expect(200);
    const item = res.body as {
      available: number;
      reserved: number;
      total: number;
    };
    expect(item.available).toBe(18);
    expect(item.reserved).toBe(12);
    expect(item.total).toBe(30);

    const reserveMove = await prisma.stockMovement.findFirst({
      where: { productId, warehouseId: w1, reservedDelta: 12 },
    });
    expect(reserveMove).not.toBeNull();
    expect(reserveMove?.availableDelta).toBe(-12);
    expect(reserveMove?.beforeQty).toBe(30);
    expect(reserveMove?.afterQty).toBe(30); // reservation does not change total on hand
  });

  it('buckets reconcile with the sum of movement deltas across history', async () => {
    await adjust(adminToken, {
      productId,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 100,
      reason: 'recv',
    });
    await adjust(adminToken, {
      productId,
      warehouseId: w1,
      bucket: 'DAMAGED',
      delta: 5,
      reason: 'broken',
    });
    await request(http)
      .post('/api/v1/inventory/reserve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ productId, warehouseId: w1, quantity: 20 })
      .expect(200);

    const moves = await prisma.stockMovement.findMany({
      where: { productId, warehouseId: w1 },
    });
    const sum = (
      k: 'availableDelta' | 'reservedDelta' | 'damagedDelta' | 'inTransitDelta',
    ) => moves.reduce((a, m) => a + m[k], 0);

    const item = await prisma.inventoryItem.findUniqueOrThrow({
      where: { productId_warehouseId: { productId, warehouseId: w1 } },
    });
    expect(item.available).toBe(sum('availableDelta')); // 100 - 20 = 80
    expect(item.reserved).toBe(sum('reservedDelta')); // 20
    expect(item.damaged).toBe(sum('damagedDelta')); // 5
    expect(item.available).toBe(80);
  });

  it('GET /inventory returns four buckets + total and is scope-filtered for a manager', async () => {
    await adjust(adminToken, {
      productId,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 10,
      reason: 'x',
    });
    await adjust(adminToken, {
      productId,
      warehouseId: w2,
      bucket: 'AVAILABLE',
      delta: 7,
      reason: 'x',
    });

    const mgr = await request(http)
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    const mgrBody = mgr.body as {
      data: { warehouseId: string }[];
      total: number;
    };
    expect(mgrBody.data.every((r) => r.warehouseId === w1)).toBe(true);
    expect(mgrBody.data.some((r) => r.warehouseId === w2)).toBe(false);

    const adminRes = await request(http)
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const adminBody = adminRes.body as { data: { warehouseId: string }[] };
    expect(adminBody.data.some((r) => r.warehouseId === w2)).toBe(true);
  });

  it('lowStock filter returns only low-stock rows with an accurate total', async () => {
    // product (reorderLevel 50) at 10 available → low.
    await adjust(adminToken, {
      productId,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 10,
      reason: 'low',
    });
    // a second product with reorderLevel 0 (never low) at 5 available.
    const healthy = await prisma.product.create({
      data: { name: 'Healthy SKU', sku: 'HEALTHY-1', reorderLevel: 0 },
    });
    await adjust(adminToken, {
      productId: healthy.id,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 5,
      reason: 'ok',
    });

    const res = await request(http)
      .get('/api/v1/inventory?lowStock=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as {
      data: { productId: string; lowStock: boolean }[];
      total: number;
    };
    expect(body.total).toBe(1);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].productId).toBe(productId);
    expect(body.data[0].lowStock).toBe(true);
  });

  it('GET /movements filters by type and is scope-filtered', async () => {
    await adjust(adminToken, {
      productId,
      warehouseId: w2,
      bucket: 'AVAILABLE',
      delta: 9,
      reason: 'x',
    });

    const mgr = await request(http)
      .get('/api/v1/movements')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    // The only movement so far is in w2, outside the manager's scope.
    expect((mgr.body as { data: unknown[] }).data).toHaveLength(0);

    const byType = await request(http)
      .get('/api/v1/movements?type=ADJUSTMENT')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (byType.body as { data: { type: string }[] }).data.every(
        (m) => m.type === 'ADJUSTMENT',
      ),
    ).toBe(true);
  });

  // ---- Negative ----

  it('staff cannot adjust → 403', async () => {
    await adjust(
      staffToken,
      {
        productId,
        warehouseId: w1,
        bucket: 'AVAILABLE',
        delta: 5,
        reason: 'no',
      },
      403,
    );
  });

  it('manager adjusting an out-of-scope warehouse → 403', async () => {
    await adjust(
      managerToken,
      {
        productId,
        warehouseId: w2,
        bucket: 'AVAILABLE',
        delta: 5,
        reason: 'no',
      },
      403,
    );
  });

  it('adjustment that drives a bucket below zero → 400, no movement written', async () => {
    await adjust(adminToken, {
      productId,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 3,
      reason: 'seed',
    });
    await adjust(
      adminToken,
      {
        productId,
        warehouseId: w1,
        bucket: 'AVAILABLE',
        delta: -10,
        reason: 'too much',
      },
      400,
    );

    const item = await prisma.inventoryItem.findUniqueOrThrow({
      where: { productId_warehouseId: { productId, warehouseId: w1 } },
    });
    expect(item.available).toBe(3); // unchanged
    const moves = await prisma.stockMovement.count({
      where: { productId, warehouseId: w1 },
    });
    expect(moves).toBe(1); // only the seed adjustment
  });

  it('reserving more than available → 400', async () => {
    await adjust(adminToken, {
      productId,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 5,
      reason: 'seed',
    });
    await request(http)
      .post('/api/v1/inventory/reserve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ productId, warehouseId: w1, quantity: 10 })
      .expect(400);
  });

  it('adjust missing reason → 400', async () => {
    await adjust(
      adminToken,
      { productId, warehouseId: w1, bucket: 'AVAILABLE', delta: 5 },
      400,
    );
  });

  it('unauthenticated GET /inventory → 401', async () => {
    await request(http).get('/api/v1/inventory').expect(401);
  });

  // ---- Transaction integrity: item update + movement write roll back together ----

  it('a failing movement write rolls back the inventory upsert (same transaction)', async () => {
    // No item exists yet for (product, w1). applyMovement upserts the item and
    // THEN writes the movement; an invalid userId makes the movement INSERT fail
    // the foreign key, which must roll the whole transaction back — including
    // the item upsert. This proves the quantity change and its ledger row are
    // genuinely atomic, not "update then log".
    await expect(
      inventory.applyMovement({
        productId,
        warehouseId: w1,
        deltas: { available: 25 },
        type: MovementType.ADJUSTMENT,
        userId: '00000000-0000-4000-8000-000000000000', // no such user
        reason: 'should roll back',
      }),
    ).rejects.toBeDefined();

    const item = await prisma.inventoryItem.findUnique({
      where: { productId_warehouseId: { productId, warehouseId: w1 } },
    });
    expect(item).toBeNull(); // the upsert was rolled back with the failed movement
    const moves = await prisma.stockMovement.count({
      where: { productId, warehouseId: w1 },
    });
    expect(moves).toBe(0);
  });
});
