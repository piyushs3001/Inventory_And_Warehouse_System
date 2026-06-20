import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

describe('AI: reorder + forecast + chat + summarize + generate-po (e2e)', () => {
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
  let staffToken: string;
  let managerToken: string; // scoped to W2 (which has no stock)
  let w1: string;
  let pA: string; // low stock + has supplier history
  let pB: string; // low stock, no supplier history
  let supplierId: string;

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
    await prisma.stockTransferLine.deleteMany();
    await prisma.stockTransfer.deleteMany();
    await prisma.stockCountLine.deleteMany();
    await prisma.stockCount.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.product.deleteMany();
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
      email: 'admin@ai.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    const staff = await users.create({
      name: 'Stf',
      email: 'stf@ai.local',
      password: 'password123',
      role: Role.STAFF,
    });
    const manager = await users.create({
      name: 'Mgr',
      email: 'mgr@ai.local',
      password: 'password123',
      role: Role.WAREHOUSE_MANAGER,
    });
    const wh1 = await prisma.warehouse.create({
      data: { name: 'W1', users: { connect: [{ id: staff.id }] } },
    });
    w1 = wh1.id;
    // W2 exists only to scope the manager away from W1's stock.
    await prisma.warehouse.create({
      data: { name: 'W2', users: { connect: [{ id: manager.id }] } },
    });
    const a = await prisma.product.create({
      data: { name: 'Prod A', sku: 'PA', reorderLevel: 50, costPrice: 2 },
    });
    const b = await prisma.product.create({
      data: { name: 'Prod B', sku: 'PB', reorderLevel: 50, costPrice: 1 },
    });
    pA = a.id;
    pB = b.id;
    const supplier = await prisma.supplier.create({ data: { name: 'Acme' } });
    supplierId = supplier.id;

    adminToken = await login('admin@ai.local');
    staffToken = await login('stf@ai.local');
    managerToken = await login('mgr@ai.local');

    // Prior PO history for A (gives A a supplier); B has none.
    await prisma.purchaseOrder.create({
      data: {
        supplierId,
        warehouseId: w1,
        status: 'COMPLETED',
        createdById: admin.id,
        lines: { create: [{ productId: pA, quantity: 100, unitCost: 2 }] },
      },
    });

    // Stock + consumption: A ends at 40 (≤50) with 10 consumed; B ends at 30 with 5 consumed.
    await adjust(adminToken, {
      productId: pA,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 50,
      reason: 'in',
    });
    await adjust(adminToken, {
      productId: pA,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: -10,
      reason: 'out',
    });
    await adjust(adminToken, {
      productId: pB,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: 35,
      reason: 'in',
    });
    await adjust(adminToken, {
      productId: pB,
      warehouseId: w1,
      bucket: 'AVAILABLE',
      delta: -5,
      reason: 'out',
    });
  });

  it('reorder suggestions rank low-stock items with qty + rationale', async () => {
    const res = await request(http)
      .get('/api/v1/ai/reorder-suggestions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const list = res.body as {
      sku: string;
      available: number;
      suggestedQty: number;
      dailyConsumption: number;
      rationale: string;
    }[];
    const a = list.find((s) => s.sku === 'PA');
    expect(a).toBeDefined();
    expect(a!.available).toBe(40);
    expect(a!.suggestedQty).toBe(60); // 2*50 - 40
    expect(a!.dailyConsumption).toBeGreaterThan(0);
    expect(a!.rationale).toContain('reorder level');
  });

  it('forecast returns moving-average consumption + projected stockout', async () => {
    const res = await request(http)
      .post('/api/v1/ai/forecast')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ days: 7 })
      .expect(200);
    const body = res.body as {
      days: number;
      items: {
        sku: string;
        avgDailyConsumption: number;
        forecastDemand: number;
        projectedStockoutDate: string | null;
      }[];
    };
    expect(body.days).toBe(7);
    const a = body.items.find((i) => i.sku === 'PA');
    expect(a!.avgDailyConsumption).toBeGreaterThan(0);
    expect(a!.projectedStockoutDate).not.toBeNull();
  });

  it('chat falls back to a transparent keyword lookup (no LLM) instead of fabricating', async () => {
    const res = await request(http)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ question: 'How much Prod A do we have?' })
      .expect(200);
    const body = res.body as {
      configured: boolean;
      answer: string;
      sources: string[];
    };
    expect(body.configured).toBe(false); // no LLM key
    expect(body.answer.toLowerCase()).toContain('keyword lookup');
    expect(body.answer).toContain('available');
    expect(body.sources).toContain('PA');
  });

  it('report summary is figure-accurate (templated, no LLM)', async () => {
    const res = await request(http)
      .post('/api/v1/ai/summarize-report')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'inventory' })
      .expect(200);
    const body = res.body as {
      type: string;
      llmEnhanced: boolean;
      summary: string;
      figures: Record<string, unknown>;
    };
    expect(body.type).toBe('inventory');
    expect(body.llmEnhanced).toBe(false);
    expect(body.summary.length).toBeGreaterThan(0);
    expect(body.figures).toHaveProperty('Total stock value');
  });

  it('generate-po creates Draft POs for products with supplier history, skips the rest', async () => {
    const res = await request(http)
      .post('/api/v1/ai/generate-po')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);
    const body = res.body as {
      created: {
        status: string;
        supplierName: string;
        lines: { sku: string }[];
      }[];
      skipped: { productName: string }[];
    };
    // A has supplier history → a Draft PO; B has none → skipped.
    expect(body.created.length).toBe(1);
    expect(body.created[0].status).toBe('DRAFT');
    expect(body.created[0].lines.some((l) => l.sku === 'PA')).toBe(true);
    expect(body.skipped.some((s) => s.productName === 'Prod B')).toBe(true);
  });

  it('summarize-report and generate-po are manager/admin only → staff 403', async () => {
    await request(http)
      .post('/api/v1/ai/summarize-report')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ type: 'inventory' })
      .expect(403);
    await request(http)
      .post('/api/v1/ai/generate-po')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({})
      .expect(403);
  });

  it('staff can read reorder suggestions (scoped)', async () => {
    await request(http)
      .get('/api/v1/ai/reorder-suggestions')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
  });

  it('unauthenticated reorder → 401', async () => {
    await request(http).get('/api/v1/ai/reorder-suggestions').expect(401);
  });

  it('AI output is scope-limited and out-of-scope POs are rejected', async () => {
    // Manager is scoped to W2 (empty); all stock is in W1.
    const reorder = await request(http)
      .get('/api/v1/ai/reorder-suggestions')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect((reorder.body as unknown[]).length).toBe(0); // no W1 stock leaks

    const forecast = await request(http)
      .post('/api/v1/ai/forecast')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(200);
    expect((forecast.body as { items: unknown[] }).items.length).toBe(0);

    // Chat must not disclose W1-only products to the W2 manager.
    const chat = await request(http)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ question: 'How much Prod A do we have?' })
      .expect(200);
    expect((chat.body as { sources: string[] }).sources).not.toContain('PA');

    // generate-po targeting an out-of-scope warehouse creates nothing — the
    // reorder source is scope-filtered, so no out-of-scope PO is ever drafted.
    const gen = await request(http)
      .post('/api/v1/ai/generate-po')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ warehouseId: w1 })
      .expect(200);
    expect((gen.body as { created: unknown[] }).created.length).toBe(0);
  });
});
