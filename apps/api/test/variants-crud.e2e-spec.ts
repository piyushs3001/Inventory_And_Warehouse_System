import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

describe('Variants CRUD + Authz (e2e)', () => {
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
  let productId: string;

  async function login(email: string): Promise<string> {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return (res.body as { accessToken: string }).accessToken;
  }

  // This suite runs after the stock suites, which leave inventory_items
  // referencing products — so a global product wipe would hit the FK. Variants
  // are unique to this suite (safe to clear wholesale); products are scoped to
  // the SKUs we create here so we never touch another suite's stock-bearing rows.
  const OWNED_SKUS = ['COLA-1', 'OTHER-1'];

  async function clearCatalog(): Promise<void> {
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany({ where: { sku: { in: OWNED_SKUS } } });
  }

  async function createVariant(
    token: string,
    pid: string,
    body: Record<string, unknown>,
    expectStatus = 201,
  ): Promise<{ id: string }> {
    const res = await request(http)
      .post(`/api/v1/products/${pid}/variants`)
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
      email: 'admin@var.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    await users.create({
      name: 'Manager',
      email: 'manager@var.local',
      password: 'password123',
      role: Role.WAREHOUSE_MANAGER,
    });
    await users.create({
      name: 'Staff',
      email: 'staff@var.local',
      password: 'password123',
      role: Role.STAFF,
    });

    adminToken = await login('admin@var.local');
    managerToken = await login('manager@var.local');
    staffToken = await login('staff@var.local');

    const product = await prisma.product.create({
      data: { name: 'Cola', sku: 'COLA-1' },
    });
    productId = product.id;
  });

  it('Manager POST variant → 201 with attributes echoed back', async () => {
    const res = await request(http)
      .post(`/api/v1/products/${productId}/variants`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ sku: 'COLA-1-RED', attributes: { color: 'Red' } })
      .expect(201);
    const body = res.body as {
      sku: string;
      attributes: Record<string, string>;
    };
    expect(body.sku).toBe('COLA-1-RED');
    expect(body.attributes).toEqual({ color: 'Red' });
  });

  it('Staff POST variant → 403', async () => {
    await request(http)
      .post(`/api/v1/products/${productId}/variants`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ sku: 'NOPE-1' })
      .expect(403);
  });

  it('Staff GET variants → 200 (reads open to any authenticated user)', async () => {
    await createVariant(adminToken, productId, { sku: 'COLA-1-RED' });
    const res = await request(http)
      .get(`/api/v1/products/${productId}/variants`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    expect((res.body as { sku: string }[]).map((v) => v.sku)).toContain(
      'COLA-1-RED',
    );
  });

  it('duplicate variant SKU → 409', async () => {
    await createVariant(adminToken, productId, { sku: 'DUP-V' });
    await createVariant(adminToken, productId, { sku: 'DUP-V' }, 409);
  });

  it('variant SKU colliding with an existing product SKU → 409', async () => {
    // 'COLA-1' is the parent product's SKU; a variant must not reuse it.
    await createVariant(adminToken, productId, { sku: 'COLA-1' }, 409);
  });

  it('rejects attributes with non-string values (400)', async () => {
    await request(http)
      .post(`/api/v1/products/${productId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: 'BAD-ATTR', attributes: { size: 42 } })
      .expect(400);
  });

  it('unknown productId → 404', async () => {
    await request(http)
      .post('/api/v1/products/11111111-1111-4111-8111-111111111111/variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: 'ORPHAN-1' })
      .expect(404);
  });

  it('a variant under another product is not found via this product (404)', async () => {
    const other = await prisma.product.create({
      data: { name: 'Other', sku: 'OTHER-1' },
    });
    const variant = await createVariant(adminToken, productId, {
      sku: 'COLA-1-RED',
    });
    await request(http)
      .get(`/api/v1/products/${other.id}/variants/${variant.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('archive excludes from default list but includeArchived shows it', async () => {
    const variant = await createVariant(adminToken, productId, {
      sku: 'TEMP-V',
    });
    const del = await request(http)
      .delete(`/api/v1/products/${productId}/variants/${variant.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((del.body as { status: string }).status).toBe('ARCHIVED');

    const def = await request(http)
      .get(`/api/v1/products/${productId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((def.body as { id: string }[]).map((v) => v.id)).not.toContain(
      variant.id,
    );

    const all = await request(http)
      .get(`/api/v1/products/${productId}/variants?includeArchived=true`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((all.body as { id: string }[]).map((v) => v.id)).toContain(
      variant.id,
    );
  });

  it('unauthenticated GET variants → 401', async () => {
    await request(http)
      .get(`/api/v1/products/${productId}/variants`)
      .expect(401);
  });
});
