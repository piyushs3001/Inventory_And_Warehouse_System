import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const WEB_ORIGIN = 'http://localhost:5000';

describe('CORS (e2e)', () => {
  let app: INestApplication;
  let http: Server;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    // configureApp is the single source of truth shared with main.ts, so this
    // e2e guards the real production CORS config — not a mirror of it.
    configureApp(app, { corsOrigin: WEB_ORIGIN });
    await app.init();
    http = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers the preflight (OPTIONS) for the web origin with allow-origin', async () => {
    const res = await request(http)
      .options('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');
    // A configured preflight is a 2xx/204, NOT the 404 you get with no CORS.
    expect(res.status).toBeLessThan(400);
    expect(res.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
  });

  it('reflects the allow-origin header on an actual cross-origin request', async () => {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: 'admin@iws.local', password: 'definitely-wrong' });
    // The browser blocks the response unless this header is present, regardless
    // of the 401 body — so assert the header, not the status.
    expect(res.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
  });
});
