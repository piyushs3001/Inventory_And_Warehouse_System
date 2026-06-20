import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

describe('Insights: ActivityLog + Notifications + Dashboard + Reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let users: UsersService;
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
    http = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await clearAll();
    await app.close();
  });

  let adminToken: string;
  let managerToken: string;
  let staffToken: string;
  let adminId: string;
  let w1: string;
  let pA: string;

  async function login(email: string): Promise<string> {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return (res.body as { accessToken: string }).accessToken;
  }

  async function clearAll(): Promise<void> {
    // Full dependency-ordered wipe — the shared dev DB may hold rows from other
    // suites/QA (POs, transfers, counts), so clear the whole graph before the
    // entities they reference.
    await prisma.activityLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.goodsReceiptLine.deleteMany();
    await prisma.goodsReceipt.deleteMany();
    await prisma.purchaseOrderLine.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.stockTransferLine.deleteMany();
    await prisma.stockTransfer.deleteMany();
    await prisma.stockCountLine.deleteMany();
    await prisma.stockCount.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.user.deleteMany();
  }

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

  beforeEach(async () => {
    await clearAll();
    const admin = await users.create({
      name: 'Admin',
      email: 'admin@in.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    const manager = await users.create({
      name: 'Mgr',
      email: 'mgr@in.local',
      password: 'password123',
      role: Role.WAREHOUSE_MANAGER,
    });
    const staff = await users.create({
      name: 'Stf',
      email: 'stf@in.local',
      password: 'password123',
      role: Role.STAFF,
    });
    adminId = admin.id;
    const wh1 = await prisma.warehouse.create({
      data: {
        name: 'W1',
        users: { connect: [{ id: manager.id }, { id: staff.id }] },
      },
    });
    w1 = wh1.id;
    const a = await prisma.product.create({
      data: { name: 'Prod A', sku: 'PA', reorderLevel: 50, costPrice: 2 },
    });
    pA = a.id;

    adminToken = await login('admin@in.local');
    managerToken = await login('mgr@in.local');
    staffToken = await login('stf@in.local');
  });

  // ---- ActivityLog pairs with every StockMovement ----

  it('a stock change writes BOTH a StockMovement and an ActivityLog in the same transaction', async () => {
    await adjust(adminToken, {
      productId: pA,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 60,
      reason: 'opening',
    });
    const moves = await prisma.stockMovement.count({
      where: { productId: pA, warehouseId: w1 },
    });
    const logs = await prisma.activityLog.findMany({
      where: { entityType: 'InventoryItem', action: 'STOCK_ADJUSTMENT' },
    });
    expect(moves).toBe(1);
    expect(logs.length).toBe(1);
    expect(logs[0].warehouseId).toBe(w1);
    expect(logs[0].userId).toBe(adminId);
  });

  it('crossing the reorder threshold downward creates a low-stock notification for overseers', async () => {
    await adjust(adminToken, {
      productId: pA,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 60,
      reason: 'seed',
    }); // 60 > 50
    const before = await prisma.notification.count({
      where: { type: 'LOW_STOCK' },
    });
    expect(before).toBe(0); // not low yet
    await adjust(adminToken, {
      productId: pA,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: -15,
      reason: 'sold',
    }); // → 45 ≤ 50
    const lowNotes = await prisma.notification.findMany({
      where: { type: 'LOW_STOCK' },
    });
    // Admin (global) + manager (assigned to w1) both overseers → 2 notifications.
    expect(lowNotes.length).toBeGreaterThanOrEqual(1);
    const mine = await request(http)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const list = mine.body as { id: string; type: string; read: boolean }[];
    expect(list.some((n) => n.type === 'LOW_STOCK')).toBe(true);

    // Mark one read (owner-scoped).
    const first = list[0];
    const read = await request(http)
      .patch(`/api/v1/notifications/${first.id}/read`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((read.body as { read: boolean }).read).toBe(true);
  });

  it('cannot mark another user notification read → 404', async () => {
    await adjust(adminToken, {
      productId: pA,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 60,
      reason: 'seed',
    });
    await adjust(adminToken, {
      productId: pA,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: -20,
      reason: 'sold',
    });
    const adminNote = await prisma.notification.findFirstOrThrow({
      where: { userId: adminId },
    });
    await request(http)
      .patch(`/api/v1/notifications/${adminNote.id}/read`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(404);
  });

  // ---- Activity-log viewer ----

  it('activity-log viewer is SUPER_ADMIN only', async () => {
    await adjust(adminToken, {
      productId: pA,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 10,
      reason: 'x',
    });
    const adminView = await request(http)
      .get('/api/v1/activity-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (adminView.body as { data: unknown[]; total: number }).total,
    ).toBeGreaterThanOrEqual(1);
    await request(http)
      .get('/api/v1/activity-logs')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);
    await request(http)
      .get('/api/v1/activity-logs')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('activity-log filters by action', async () => {
    await adjust(adminToken, {
      productId: pA,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 10,
      reason: 'x',
    });
    const res = await request(http)
      .get('/api/v1/activity-logs?action=STOCK_ADJUSTMENT')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as { data: { action: string }[] };
    expect(body.data.every((r) => r.action === 'STOCK_ADJUSTMENT')).toBe(true);
  });

  // ---- Dashboard ----

  it('dashboard returns scope-aware KPIs', async () => {
    await adjust(adminToken, {
      productId: pA,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 30,
      reason: 'x',
    });
    const res = await request(http)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const d = res.body as {
      totalProducts: number;
      totalStockUnits: number;
      stockValue: string;
      lowStockCount: number;
      topProducts: unknown[];
    };
    expect(d.totalProducts).toBeGreaterThanOrEqual(1);
    expect(d.totalStockUnits).toBe(30);
    expect(d.stockValue).toBe('60.00'); // 30 × costPrice 2
    expect(d.lowStockCount).toBe(1); // 30 ≤ reorder 50
    expect(d.topProducts.length).toBeGreaterThanOrEqual(1);
  });

  // ---- Reports ----

  it('inventory report returns columns/rows and exports CSV', async () => {
    await adjust(adminToken, {
      productId: pA,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 30,
      reason: 'x',
    });
    const rep = await request(http)
      .get('/api/v1/reports/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = rep.body as {
      type: string;
      columns: unknown[];
      rows: { sku: string }[];
      summary: Record<string, unknown>;
    };
    expect(body.type).toBe('inventory');
    expect(body.columns.length).toBeGreaterThan(0);
    expect(body.rows.some((r) => r.sku === 'PA')).toBe(true);
    expect(body.summary['Total stock value']).toBe('60.00');

    const csv = await request(http)
      .get('/api/v1/reports/inventory/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('SKU');
    expect(csv.text).toContain('PA');
  });

  it('unknown report type → 400', async () => {
    await request(http)
      .get('/api/v1/reports/nonsense')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('reports are gated to manager/admin → staff 403', async () => {
    await request(http)
      .get('/api/v1/reports/inventory')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('entity CRUD writes an ActivityLog (product create)', async () => {
    await request(http)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Prod', sku: 'NEWP' })
      .expect(201);
    const log = await prisma.activityLog.findFirst({
      where: { action: 'PRODUCT_CREATE' },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(adminId);
  });

  it('unauthenticated dashboard → 401', async () => {
    await request(http).get('/api/v1/dashboard').expect(401);
  });
});
