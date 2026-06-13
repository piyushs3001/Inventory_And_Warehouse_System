import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

describe('Warehouses CRUD + Authz (e2e)', () => {
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
    await prisma.user.deleteMany();
    await prisma.warehouse.deleteMany();
    await app.close();
  });

  // -------------------------------------------------------------------------
  // Shared state per test — re-seeded in beforeEach so each test is isolated.
  // -------------------------------------------------------------------------
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;
  let managerId: string;
  let staffId: string;
  let warehouseAId: string;
  let warehouseBId: string;

  async function login(email: string): Promise<string> {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return (res.body as { accessToken: string }).accessToken;
  }

  beforeEach(async () => {
    await prisma.warehouse.deleteMany();
    await prisma.user.deleteMany();

    // Seed users
    const admin = await users.create({
      name: 'Admin',
      email: 'admin@crud.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    const manager = await users.create({
      name: 'Manager',
      email: 'manager@crud.local',
      password: 'password123',
      role: Role.WAREHOUSE_MANAGER,
    });
    const staff = await users.create({
      name: 'Staff',
      email: 'staff@crud.local',
      password: 'password123',
      role: Role.STAFF,
    });
    managerId = manager.id;
    staffId = staff.id;
    void admin; // suppress unused-var; admin is accessed via login

    // Seed two warehouses
    const wA = await prisma.warehouse.create({ data: { name: 'Warehouse A' } });
    const wB = await prisma.warehouse.create({ data: { name: 'Warehouse B' } });
    warehouseAId = wA.id;
    warehouseBId = wB.id;

    // Assign only Warehouse A to the Manager
    await users.setWarehouses(managerId, [warehouseAId]);

    // Login all three
    adminToken = await login('admin@crud.local');
    managerToken = await login('manager@crud.local');
    staffToken = await login('staff@crud.local');
  });

  // -------------------------------------------------------------------------
  // Case 1: Super Admin sees BOTH warehouses (global scope)
  // -------------------------------------------------------------------------
  it('Super Admin GET /warehouses → 200 and sees both A and B', async () => {
    const res = await request(http)
      .get('/api/v1/warehouses')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const ids = (res.body as { id: string }[]).map((w) => w.id);
    expect(ids).toContain(warehouseAId);
    expect(ids).toContain(warehouseBId);
  });

  // -------------------------------------------------------------------------
  // Case 2: Manager sees ONLY warehouse A (scope filter)
  // -------------------------------------------------------------------------
  it('Manager GET /warehouses → 200 and sees only A, not B', async () => {
    const res = await request(http)
      .get('/api/v1/warehouses')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    const ids = (res.body as { id: string }[]).map((w) => w.id);
    expect(ids).toContain(warehouseAId);
    expect(ids).not.toContain(warehouseBId);
  });

  // -------------------------------------------------------------------------
  // Case 3: Manager GET /:id for out-of-scope warehouse B → 404 (no info leak)
  // -------------------------------------------------------------------------
  it('Manager GET /warehouses/:id for out-of-scope B → 404', async () => {
    await request(http)
      .get(`/api/v1/warehouses/${warehouseBId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(404);
  });

  // -------------------------------------------------------------------------
  // Case 4: Manager GET /:id for in-scope warehouse A → 200
  // -------------------------------------------------------------------------
  it('Manager GET /warehouses/:id for in-scope A → 200', async () => {
    const res = await request(http)
      .get(`/api/v1/warehouses/${warehouseAId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect((res.body as { id: string }).id).toBe(warehouseAId);
  });

  // -------------------------------------------------------------------------
  // Case 5: Manager POST /warehouses → 403 (write is SUPER_ADMIN only)
  // -------------------------------------------------------------------------
  it('Manager POST /warehouses → 403', async () => {
    await request(http)
      .post('/api/v1/warehouses')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'New Warehouse' })
      .expect(403);
  });

  // -------------------------------------------------------------------------
  // Case 6: Staff POST /warehouses/:id/staff → 403 (write is SUPER_ADMIN only)
  // -------------------------------------------------------------------------
  it('Staff POST /warehouses/:id/staff → 403', async () => {
    await request(http)
      .post(`/api/v1/warehouses/${warehouseAId}/staff`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ userIds: [staffId] })
      .expect(403);
  });

  // -------------------------------------------------------------------------
  // Case 7: Super Admin create → 201, then delete → 200 INACTIVE,
  //         then absent from default list but present with ?includeArchived=true
  // -------------------------------------------------------------------------
  it('Super Admin can create, then archive; archived is excluded by default but visible with includeArchived=true', async () => {
    // Create
    const createRes = await request(http)
      .post('/api/v1/warehouses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Temp Warehouse' })
      .expect(201);
    const newId = (createRes.body as { id: string }).id;
    expect(newId).toBeDefined();

    // Delete (archive)
    const deleteRes = await request(http)
      .delete(`/api/v1/warehouses/${newId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((deleteRes.body as { status: string }).status).toBe('INACTIVE');

    // Absent from default list
    const defaultList = await request(http)
      .get('/api/v1/warehouses')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const defaultIds = (defaultList.body as { id: string }[]).map((w) => w.id);
    expect(defaultIds).not.toContain(newId);

    // Present with includeArchived=true
    const archivedList = await request(http)
      .get('/api/v1/warehouses?includeArchived=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const archivedIds = (archivedList.body as { id: string }[]).map(
      (w) => w.id,
    );
    expect(archivedIds).toContain(newId);
  });

  // -------------------------------------------------------------------------
  // Case 8: Super Admin POST /:id/staff assigns staff to warehouse;
  //         staff's scope now includes that warehouse.
  // -------------------------------------------------------------------------
  it('Super Admin POST /warehouses/:id/staff assigns scope; staff then sees the warehouse in GET /warehouses', async () => {
    // Staff has no assignment yet — scope should be empty
    const beforeRes = await request(http)
      .get('/api/v1/warehouses')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    expect(beforeRes.body).toEqual([]);

    // Super Admin assigns staff to warehouse A
    // NestJS defaults @Post to 201; @ApiOkResponse is a Swagger annotation only.
    const assignRes = await request(http)
      .post(`/api/v1/warehouses/${warehouseAId}/staff`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds: [staffId] })
      .expect(201);
    expect((assignRes.body as { id: string }).id).toBe(warehouseAId);

    // Verify via service
    const scope = await users.getWarehouseScope(staffId);
    expect(scope).toContain(warehouseAId);

    // Verify via HTTP: staff now sees warehouse A
    const afterRes = await request(http)
      .get('/api/v1/warehouses')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    const ids = (afterRes.body as { id: string }[]).map((w) => w.id);
    expect(ids).toContain(warehouseAId);
  });
});
