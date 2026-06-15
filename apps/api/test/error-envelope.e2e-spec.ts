/**
 * error-envelope.e2e-spec.ts
 *
 * Asserts that the API's LIVE error responses match the documented
 * ErrorResponseDto envelope (statusCode, error, message, timestamp, path)
 * for three representative HTTP status codes:
 *
 *   401 — guarded endpoint called with no bearer token
 *   404 — valid route, non-existent warehouse UUID, authenticated as Super Admin
 *   400 — valid POST route with a missing required field, authenticated as Super Admin
 *
 * Bootstrap pattern matches all other e2e specs in this directory:
 * Test.createTestingModule → setGlobalPrefix('api/v1') → useGlobalPipes(ValidationPipe)
 * → app.init().  The global AllExceptionsFilter is wired via AppModule so it is active.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

/** Random UUID that will not match any seeded warehouse. */
const NONEXISTENT_UUID = '00000000-dead-beef-cafe-000000000000';

describe('ErrorResponseDto envelope — live error responses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let users: UsersService;
  let http: Server;
  let adminToken: string;

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
      email: 'admin@envelope.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });

    const loginRes = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@envelope.local', password: 'password123' })
      .expect(200);

    adminToken = (loginRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Case 1 — 401: guarded endpoint with NO token
  // ---------------------------------------------------------------------------
  it('GET /auth/me without a token → 401 with ErrorResponseDto envelope', async () => {
    const res = await request(http).get('/api/v1/auth/me').expect(401);
    const body = res.body as Record<string, unknown>;

    expect(body).toMatchObject({ statusCode: 401 });
    expect(typeof body.error).toBe('string');
    expect(body.message).toBeDefined();
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.path).toBe('string');
    expect(body.path as string).toContain('/auth/me');
  });

  // ---------------------------------------------------------------------------
  // Case 2 — 404: valid route, non-existent warehouse UUID, authenticated
  // ---------------------------------------------------------------------------
  it('GET /warehouses/<nonexistent-uuid> as Super Admin → 404 with ErrorResponseDto envelope', async () => {
    const res = await request(http)
      .get(`/api/v1/warehouses/${NONEXISTENT_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
    const body = res.body as Record<string, unknown>;

    expect(body).toMatchObject({ statusCode: 404 });
    expect(typeof body.error).toBe('string');
    expect(body.message).toBeDefined();
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.path).toBe('string');
    expect(body.path as string).toContain('/warehouses/');
  });

  // ---------------------------------------------------------------------------
  // Case 3 — 400: POST /warehouses with missing required `name` field
  // ---------------------------------------------------------------------------
  it('POST /warehouses with empty body as Super Admin → 400 with ErrorResponseDto envelope and array message', async () => {
    const res = await request(http)
      .post('/api/v1/warehouses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);
    const body = res.body as Record<string, unknown>;

    expect(body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    expect(body.message).toBeDefined();
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.path).toBe('string');
    expect(Array.isArray(body.message)).toBe(true);
    expect(body.path as string).toContain('/warehouses');
  });
});
