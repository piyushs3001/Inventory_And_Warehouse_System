import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Global exception filter (e2e)', () => {
  let app: INestApplication;
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
    http = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('normalizes an unmatched-route 404 (filter is globally registered)', async () => {
    const res = await request(http).get('/api/v1/does-not-exist').expect(404);
    const body = res.body as Record<string, unknown>;
    expect(body).toMatchObject({
      statusCode: 404,
      path: '/api/v1/does-not-exist',
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('normalizes a validation 400 with the same envelope', async () => {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email' })
      .expect(400);
    const body = res.body as Record<string, unknown>;
    expect(body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      path: '/api/v1/auth/login',
    });
    expect(typeof body.timestamp).toBe('string');
    expect(Array.isArray(body.message)).toBe(true);
  });
});
