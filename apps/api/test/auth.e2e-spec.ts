import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

describe('Auth + Authorization (e2e)', () => {
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
    await users.create({
      name: 'Admin',
      email: 'admin@test.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    await users.create({
      name: 'Stan',
      email: 'staff@test.local',
      password: 'password123',
      role: Role.STAFF,
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  async function login(
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return res.body as { accessToken: string; refreshToken: string };
  }

  it('logs in and returns the profile from /auth/me', async () => {
    const { accessToken } = await login('admin@test.local');
    const me = await request(http)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((me.body as { email: string }).email).toBe('admin@test.local');
  });

  it('rejects /auth/me without a token', async () => {
    await request(http).get('/api/v1/auth/me').expect(401);
  });

  it('allows Super Admin to list users but forbids Staff', async () => {
    const admin = await login('admin@test.local');
    await request(http)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const staff = await login('staff@test.local');
    await request(http)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(403);
  });

  it('rotates tokens on refresh and invalidates them on logout', async () => {
    const { refreshToken, accessToken } = await login('admin@test.local');

    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(200);

    await request(http)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    // After logout the stored hash is cleared → refresh is forbidden.
    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(403);
  });
});
