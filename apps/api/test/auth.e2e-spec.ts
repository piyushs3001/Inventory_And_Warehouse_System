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

  it('a deactivated user cannot refresh or log in (immediate revocation)', async () => {
    const { refreshToken } = await login('staff@test.local');
    const staff = await prisma.user.findUniqueOrThrow({
      where: { email: 'staff@test.local' },
    });
    await users.deactivate(staff.id);

    // Old refresh token must be rejected (status re-checked + hash cleared).
    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(403);

    // And a fresh login is rejected generically.
    await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@test.local', password: 'password123' })
      .expect(401);
  });

  it('login with an unknown email returns a generic 401 (no user enumeration)', async () => {
    await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.local', password: 'password123' })
      .expect(401);
  });

  describe('self-registration → approval → login', () => {
    it('registers a pending STAFF account with no scope and no tokens', async () => {
      const res = await request(http)
        .post('/api/v1/auth/register')
        .send({
          name: 'Rosa',
          email: 'rosa@test.local',
          password: 'password123',
        })
        .expect(201);
      const body = res.body as {
        id: string;
        role: string;
        status: string;
        warehouses: unknown[];
        accessToken?: string;
      };
      expect(body.role).toBe(Role.STAFF);
      expect(body.status).toBe('PENDING_APPROVAL');
      expect(body.warehouses).toEqual([]);
      expect(body.accessToken).toBeUndefined();
    });

    it('ignores client-supplied role/status — always STAFF + PENDING_APPROVAL', async () => {
      const res = await request(http)
        .post('/api/v1/auth/register')
        .send({
          name: 'Mallory',
          email: 'mallory@test.local',
          password: 'password123',
          role: Role.SUPER_ADMIN,
          status: 'ACTIVE',
        })
        .expect(201);
      const body = res.body as { role: string; status: string };
      expect(body.role).toBe(Role.STAFF);
      expect(body.status).toBe('PENDING_APPROVAL');
    });

    it('blocks a pending account from logging in (403), then allows it after approval', async () => {
      const reg = await request(http)
        .post('/api/v1/auth/register')
        .send({
          name: 'Rosa',
          email: 'rosa@test.local',
          password: 'password123',
        })
        .expect(201);
      const id = (reg.body as { id: string }).id;

      // Pending → login forbidden.
      await request(http)
        .post('/api/v1/auth/login')
        .send({ email: 'rosa@test.local', password: 'password123' })
        .expect(403);

      // Super Admin approves.
      const admin = await login('admin@test.local');
      const approved = await request(http)
        .post(`/api/v1/users/${id}/activate`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);
      expect((approved.body as { status: string }).status).toBe('ACTIVE');

      // Now login succeeds.
      await request(http)
        .post('/api/v1/auth/login')
        .send({ email: 'rosa@test.local', password: 'password123' })
        .expect(200);
    });

    it('rejects a duplicate email (409) and invalid input (400)', async () => {
      await request(http)
        .post('/api/v1/auth/register')
        .send({
          name: 'Dup',
          email: 'admin@test.local',
          password: 'password123',
        })
        .expect(409);

      await request(http)
        .post('/api/v1/auth/register')
        .send({ name: 'Bad', email: 'not-an-email', password: 'short' })
        .expect(400);
    });

    it('forbids a non-admin from approving a user', async () => {
      const reg = await request(http)
        .post('/api/v1/auth/register')
        .send({
          name: 'Rosa',
          email: 'rosa@test.local',
          password: 'password123',
        })
        .expect(201);
      const id = (reg.body as { id: string }).id;

      const staff = await login('staff@test.local');
      await request(http)
        .post(`/api/v1/users/${id}/activate`)
        .set('Authorization', `Bearer ${staff.accessToken}`)
        .expect(403);
    });
  });
});
