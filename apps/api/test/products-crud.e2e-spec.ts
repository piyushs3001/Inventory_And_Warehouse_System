import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

describe('Products CRUD + Authz (e2e)', () => {
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
    await clearCatalog();
    await prisma.user.deleteMany();
    await app.close();
  });

  let adminToken: string;
  let managerToken: string;
  let staffToken: string;
  let categoryId: string;

  async function login(email: string): Promise<string> {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return (res.body as { accessToken: string }).accessToken;
  }

  async function clearCatalog(): Promise<void> {
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
  }

  async function createProduct(
    token: string,
    body: Record<string, unknown>,
    expectStatus = 201,
  ): Promise<{ id: string }> {
    const res = await request(http)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(expectStatus);
    return res.body as { id: string };
  }

  beforeEach(async () => {
    await clearCatalog();
    await prisma.user.deleteMany();

    await users.create({
      name: 'Admin',
      email: 'admin@prod.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    await users.create({
      name: 'Manager',
      email: 'manager@prod.local',
      password: 'password123',
      role: Role.WAREHOUSE_MANAGER,
    });
    await users.create({
      name: 'Staff',
      email: 'staff@prod.local',
      password: 'password123',
      role: Role.STAFF,
    });

    adminToken = await login('admin@prod.local');
    managerToken = await login('manager@prod.local');
    staffToken = await login('staff@prod.local');

    const category = await prisma.category.create({
      data: { name: 'Beverages' },
    });
    categoryId = category.id;
  });

  it('Manager POST /products → 201, prices returned as fixed 2-decimal strings', async () => {
    const res = await request(http)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Cola', sku: 'COLA-1', costPrice: 0.45, sellingPrice: 1.2 })
      .expect(201);
    const body = res.body as { costPrice: string; sellingPrice: string };
    expect(body.costPrice).toBe('0.45');
    expect(body.sellingPrice).toBe('1.20');
  });

  it('Staff POST /products → 403', async () => {
    await request(http)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Nope', sku: 'NOPE-1' })
      .expect(403);
  });

  it('Staff GET /products → 200 (reads open to any authenticated user)', async () => {
    await createProduct(adminToken, { name: 'Cola', sku: 'COLA-1' });
    const res = await request(http)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    expect((res.body as { sku: string }[]).map((p) => p.sku)).toContain(
      'COLA-1',
    );
  });

  it('duplicate SKU → 409', async () => {
    await createProduct(adminToken, { name: 'Cola', sku: 'DUP-1' });
    await createProduct(adminToken, { name: 'Cola Two', sku: 'DUP-1' }, 409);
  });

  it('unknown categoryId → 400', async () => {
    await request(http)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'X',
        sku: 'X-1',
        categoryId: '11111111-1111-4111-8111-111111111111',
      })
      .expect(400);
  });

  it('archive excludes from default list but includeArchived shows it', async () => {
    const product = await createProduct(adminToken, {
      name: 'Temp',
      sku: 'TEMP-1',
    });
    const del = await request(http)
      .delete(`/api/v1/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((del.body as { status: string }).status).toBe('ARCHIVED');

    const def = await request(http)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((def.body as { id: string }[]).map((p) => p.id)).not.toContain(
      product.id,
    );

    const all = await request(http)
      .get('/api/v1/products?includeArchived=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((all.body as { id: string }[]).map((p) => p.id)).toContain(
      product.id,
    );
  });

  it('filters by categoryId and search', async () => {
    await createProduct(adminToken, {
      name: 'Cola',
      sku: 'COLA-1',
      categoryId,
    });
    await createProduct(adminToken, { name: 'Stapler', sku: 'STAP-1' });

    const byCat = await request(http)
      .get(`/api/v1/products?categoryId=${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const catSkus = (byCat.body as { sku: string }[]).map((p) => p.sku);
    expect(catSkus).toContain('COLA-1');
    expect(catSkus).not.toContain('STAP-1');

    const bySearch = await request(http)
      .get('/api/v1/products?search=stap')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const searchSkus = (bySearch.body as { sku: string }[]).map((p) => p.sku);
    expect(searchSkus).toContain('STAP-1');
    expect(searchSkus).not.toContain('COLA-1');
  });

  it('deleting a category that has a product → 409 (cross-slice dependency)', async () => {
    await createProduct(adminToken, {
      name: 'Cola',
      sku: 'COLA-1',
      categoryId,
    });
    await request(http)
      .delete(`/api/v1/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('unauthenticated GET /products → 401', async () => {
    await request(http).get('/api/v1/products').expect(401);
  });
});
