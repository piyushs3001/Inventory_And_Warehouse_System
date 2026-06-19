import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

describe('Categories CRUD + Authz (e2e)', () => {
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
    await clearCategories();
    await prisma.user.deleteMany();
    await app.close();
  });

  let adminToken: string;
  let managerToken: string;
  let staffToken: string;

  async function login(email: string): Promise<string> {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return (res.body as { accessToken: string }).accessToken;
  }

  // Self-referential FK: null out parents before bulk delete so order can't bite.
  async function clearCategories(): Promise<void> {
    await prisma.category.updateMany({ data: { parentId: null } });
    await prisma.category.deleteMany();
  }

  async function createCategory(
    token: string,
    body: { name: string; parentId?: string },
    expectStatus = 201,
  ): Promise<{ id: string }> {
    const res = await request(http)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(expectStatus);
    return res.body as { id: string };
  }

  beforeEach(async () => {
    await clearCategories();
    await prisma.user.deleteMany();

    await users.create({
      name: 'Admin',
      email: 'admin@cat.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    await users.create({
      name: 'Manager',
      email: 'manager@cat.local',
      password: 'password123',
      role: Role.WAREHOUSE_MANAGER,
    });
    await users.create({
      name: 'Staff',
      email: 'staff@cat.local',
      password: 'password123',
      role: Role.STAFF,
    });

    adminToken = await login('admin@cat.local');
    managerToken = await login('manager@cat.local');
    staffToken = await login('staff@cat.local');
  });

  it('Super Admin POST /categories → 201', async () => {
    const cat = await createCategory(adminToken, { name: 'Beverages' });
    expect(cat.id).toBeDefined();
  });

  it('Manager POST /categories → 201 (managers manage the catalog)', async () => {
    const cat = await createCategory(managerToken, { name: 'Snacks' });
    expect(cat.id).toBeDefined();
  });

  it('Staff POST /categories → 403', async () => {
    await request(http)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Forbidden' })
      .expect(403);
  });

  it('Staff GET /categories → 200 (reads open to any authenticated user)', async () => {
    await createCategory(adminToken, { name: 'Visible' });
    const res = await request(http)
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    expect((res.body as { name: string }[]).map((c) => c.name)).toContain(
      'Visible',
    );
  });

  it('creates a child with a valid parentId → 201', async () => {
    const parent = await createCategory(adminToken, { name: 'Beverages' });
    const child = await createCategory(adminToken, {
      name: 'Sodas',
      parentId: parent.id,
    });
    expect(child.id).toBeDefined();
  });

  it('POST with an unknown parentId → 400', async () => {
    await request(http)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Orphan',
        parentId: '11111111-1111-4111-8111-111111111111',
      })
      .expect(400);
  });

  it('PATCH setting a category as its own parent → 400', async () => {
    const cat = await createCategory(adminToken, { name: 'Beverages' });
    await request(http)
      .patch(`/api/v1/categories/${cat.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parentId: cat.id })
      .expect(400);
  });

  it('PATCH re-parenting under own descendant → 409 (cycle)', async () => {
    const parent = await createCategory(adminToken, { name: 'Beverages' });
    const child = await createCategory(adminToken, {
      name: 'Sodas',
      parentId: parent.id,
    });
    // Make the parent a child of its own child → cycle.
    await request(http)
      .patch(`/api/v1/categories/${parent.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parentId: child.id })
      .expect(409);
  });

  it('DELETE a category that has children → 409', async () => {
    const parent = await createCategory(adminToken, { name: 'Beverages' });
    await createCategory(adminToken, { name: 'Sodas', parentId: parent.id });
    await request(http)
      .delete(`/api/v1/categories/${parent.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('DELETE a leaf category → 200, then GET → 404', async () => {
    const cat = await createCategory(adminToken, { name: 'Disposable' });
    await request(http)
      .delete(`/api/v1/categories/${cat.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(http)
      .get(`/api/v1/categories/${cat.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('unauthenticated GET /categories → 401', async () => {
    await request(http).get('/api/v1/categories').expect(401);
  });
});
