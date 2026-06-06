import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

describe('Warehouses (e2e)', () => {
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

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.warehouse.deleteMany();
    await users.create({
      name: 'Admin',
      email: 'admin@test.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    await prisma.warehouse.createMany({
      data: [{ name: 'Central Warehouse' }, { name: 'North Depot' }],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.warehouse.deleteMany();
    await app.close();
  });

  async function loginAsSuperAdmin(): Promise<string> {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.local', password: 'password123' })
      .expect(200);
    return (res.body as { accessToken: string }).accessToken;
  }

  it('returns 200 with an array of warehouses for Super Admin', async () => {
    const token = await loginAsSuperAdmin();
    const res = await request(http)
      .get('/api/v1/warehouses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const body = res.body as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    for (const item of body) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
    }
  });

  it('returns 401 with no token', async () => {
    await request(http).get('/api/v1/warehouses').expect(401);
  });
});
