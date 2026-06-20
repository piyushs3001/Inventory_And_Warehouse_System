import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';
import { MailService } from '../src/mail/mail.service';

describe('Password reset (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let users: UsersService;
  let http: Server;
  const sentUrls: string[] = [];

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

    // SMTP is unconfigured in tests; capture the reset URL the service would email.
    const mail = moduleRef.get(MailService);
    jest
      .spyOn(mail, 'sendPasswordReset')
      .mockImplementation((_to: string, url: string) => {
        sentUrls.push(url);
        return Promise.resolve();
      });
  });

  beforeEach(async () => {
    sentUrls.length = 0;
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
    await users.create({
      name: 'Rosa',
      email: 'rosa@test.local',
      password: 'password123',
      role: Role.STAFF,
    });
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  function tokenFromLastUrl(): string {
    const url = new URL(sentUrls[sentUrls.length - 1]);
    return url.searchParams.get('token') ?? '';
  }

  it('forgot-password returns a generic 200 and sends a reset link for a known email', async () => {
    const res = await request(http)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'rosa@test.local', app: 'staff' })
      .expect(200);
    expect((res.body as { message: string }).message).toMatch(/if an account/i);
    expect(sentUrls).toHaveLength(1);
    expect(sentUrls[0]).toContain('/reset-password?token=');
  });

  it('forgot-password returns the same 200 for an unknown email (no enumeration)', async () => {
    const res = await request(http)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@test.local', app: 'staff' })
      .expect(200);
    expect((res.body as { message: string }).message).toMatch(/if an account/i);
    expect(sentUrls).toHaveLength(0);
  });

  it('rejects forgot-password with an invalid app value (400)', async () => {
    await request(http)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'rosa@test.local', app: 'nope' })
      .expect(400);
  });

  it('validate reports usable then unusable, and a full reset lets the user log in', async () => {
    await request(http)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'rosa@test.local', app: 'staff' })
      .expect(200);
    const token = tokenFromLastUrl();

    await request(http)
      .get(`/api/v1/auth/reset-password/validate?token=${token}`)
      .expect(200)
      .expect((r) => expect((r.body as { valid: boolean }).valid).toBe(true));

    await request(http)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'newPassword1' })
      .expect(200);

    // Old password no longer works; new one does.
    await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'rosa@test.local', password: 'password123' })
      .expect(401);
    await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'rosa@test.local', password: 'newPassword1' })
      .expect(200);

    // Token is now used → validate is false and reuse is rejected.
    await request(http)
      .get(`/api/v1/auth/reset-password/validate?token=${token}`)
      .expect(200)
      .expect((r) => expect((r.body as { valid: boolean }).valid).toBe(false));
    await request(http)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'anotherPass9' })
      .expect(400);
  });

  it('rejects reset-password with an unknown token (400)', async () => {
    await request(http)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'does-not-exist', password: 'newPassword1' })
      .expect(400);
  });

  it('rejects reset-password with a too-short password (400 validation)', async () => {
    await request(http)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'rosa@test.local', app: 'staff' })
      .expect(200);
    const token = tokenFromLastUrl();
    await request(http)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'short' })
      .expect(400);
  });
});
