import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';
import { configureApp } from '../src/app.setup';
import { ConfigService } from '@nestjs/config';

/**
 * A minimal 1×1 JPEG image buffer (valid JPEG header).
 * Kept tiny to avoid disk overhead; only the MIME type + size constraints matter.
 */
function makeImageBuffer(): Buffer {
  // Minimal valid JPEG (1×1 white pixel, base64-encoded)
  return Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
      'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN' +
      'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
      'MjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=',
    'base64',
  );
}

/** Create a valid >5 MB buffer filled with repeated JPEG-like bytes. */
function makeOversizeBuffer(): Buffer {
  // Just over 5 MB of arbitrary bytes — size matters, not validity
  return Buffer.alloc(5 * 1024 * 1024 + 1, 0xff);
}

describe('Product & Variant Image Upload/Delete (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let users: UsersService;
  let http: Server;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    const config = app.get(ConfigService);
    configureApp(app, {
      corsOrigin: config.get('CORS_ORIGIN', 'http://localhost:5000'),
    });
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
  let variantId: string;

  async function login(email: string): Promise<string> {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return (res.body as { accessToken: string }).accessToken;
  }

  async function clearCatalog(): Promise<void> {
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
  }

  beforeEach(async () => {
    await clearCatalog();
    await prisma.user.deleteMany();

    await users.create({
      name: 'Admin',
      email: 'admin@img.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    await users.create({
      name: 'Manager',
      email: 'manager@img.local',
      password: 'password123',
      role: Role.WAREHOUSE_MANAGER,
    });
    await users.create({
      name: 'Staff',
      email: 'staff@img.local',
      password: 'password123',
      role: Role.STAFF,
    });

    adminToken = await login('admin@img.local');
    managerToken = await login('manager@img.local');
    staffToken = await login('staff@img.local');

    const product = await prisma.product.create({
      data: { name: 'Cola', sku: 'IMG-COLA-1' },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId, sku: 'IMG-COLA-1-RED' },
    });
    variantId = variant.id;
  });

  // ── PRODUCT IMAGE ──────────────────────────────────────────────────────────

  describe('POST /products/:id/image', () => {
    it('admin uploads an image → 200, imageUrl is set (non-null, /uploads/ path)', async () => {
      const res = await request(http)
        .post(`/api/v1/products/${productId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', makeImageBuffer(), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);
      const body = res.body as { imageUrl: string | null };
      expect(body.imageUrl).not.toBeNull();
      expect(body.imageUrl).toMatch(/\/uploads\/products\//);
    });

    it('manager uploads an image → 200', async () => {
      const res = await request(http)
        .post(`/api/v1/products/${productId}/image`)
        .set('Authorization', `Bearer ${managerToken}`)
        .attach('file', makeImageBuffer(), {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(200);
      expect((res.body as { imageUrl: string | null }).imageUrl).not.toBeNull();
    });

    it('replacing an image deletes the old file and sets a new imageUrl', async () => {
      // First upload
      const first = await request(http)
        .post(`/api/v1/products/${productId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', makeImageBuffer(), {
          filename: 'first.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);
      const firstUrl = (first.body as { imageUrl: string }).imageUrl;

      // Second upload (replace)
      const second = await request(http)
        .post(`/api/v1/products/${productId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', makeImageBuffer(), {
          filename: 'second.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);
      const secondUrl = (second.body as { imageUrl: string }).imageUrl;

      // URLs should be different (different UUID filenames)
      expect(secondUrl).not.toBe(firstUrl);
      expect(secondUrl).toMatch(/\/uploads\/products\//);
    });

    it('STAFF upload → 403', async () => {
      await request(http)
        .post(`/api/v1/products/${productId}/image`)
        .set('Authorization', `Bearer ${staffToken}`)
        .attach('file', makeImageBuffer(), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(403);
    });

    it('non-image MIME → 400', async () => {
      await request(http)
        .post(`/api/v1/products/${productId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('fake pdf'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
    });

    it('oversize file (>5 MB) → 400', async () => {
      await request(http)
        .post(`/api/v1/products/${productId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', makeOversizeBuffer(), {
          filename: 'big.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });

    it('missing file → 400', async () => {
      await request(http)
        .post(`/api/v1/products/${productId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('unknown product id → 404', async () => {
      await request(http)
        .post('/api/v1/products/11111111-1111-4111-8111-111111111111/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', makeImageBuffer(), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(404);
    });
  });

  describe('DELETE /products/:id/image', () => {
    it('deletes the image → 200, imageUrl becomes null', async () => {
      // Upload first
      await request(http)
        .post(`/api/v1/products/${productId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', makeImageBuffer(), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      // Delete
      const res = await request(http)
        .delete(`/api/v1/products/${productId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((res.body as { imageUrl: string | null }).imageUrl).toBeNull();
    });

    it('deleting when no image is set → 200 (idempotent)', async () => {
      const res = await request(http)
        .delete(`/api/v1/products/${productId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((res.body as { imageUrl: string | null }).imageUrl).toBeNull();
    });

    it('STAFF delete → 403', async () => {
      await request(http)
        .delete(`/api/v1/products/${productId}/image`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });
  });

  // ── VARIANT IMAGE ──────────────────────────────────────────────────────────

  describe('POST /products/:productId/variants/:id/image', () => {
    it('admin uploads a variant image → 200, imageUrl set', async () => {
      const res = await request(http)
        .post(`/api/v1/products/${productId}/variants/${variantId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', makeImageBuffer(), {
          filename: 'var.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);
      const body = res.body as { imageUrl: string | null };
      expect(body.imageUrl).not.toBeNull();
      expect(body.imageUrl).toMatch(/\/uploads\/product-variants\//);
    });

    it('replacing a variant image sets a new imageUrl', async () => {
      const first = await request(http)
        .post(`/api/v1/products/${productId}/variants/${variantId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', makeImageBuffer(), {
          filename: 'v1.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);
      const firstUrl = (first.body as { imageUrl: string }).imageUrl;

      const second = await request(http)
        .post(`/api/v1/products/${productId}/variants/${variantId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', makeImageBuffer(), {
          filename: 'v2.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);
      const secondUrl = (second.body as { imageUrl: string }).imageUrl;

      expect(secondUrl).not.toBe(firstUrl);
    });

    it('STAFF upload variant → 403', async () => {
      await request(http)
        .post(`/api/v1/products/${productId}/variants/${variantId}/image`)
        .set('Authorization', `Bearer ${staffToken}`)
        .attach('file', makeImageBuffer(), {
          filename: 'var.jpg',
          contentType: 'image/jpeg',
        })
        .expect(403);
    });

    it('non-image MIME for variant → 400', async () => {
      await request(http)
        .post(`/api/v1/products/${productId}/variants/${variantId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('fake'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('oversize variant image → 400', async () => {
      await request(http)
        .post(`/api/v1/products/${productId}/variants/${variantId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', makeOversizeBuffer(), {
          filename: 'big.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });
  });

  describe('DELETE /products/:productId/variants/:id/image', () => {
    it('deletes variant image → 200, imageUrl becomes null', async () => {
      // Upload first
      await request(http)
        .post(`/api/v1/products/${productId}/variants/${variantId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', makeImageBuffer(), {
          filename: 'var.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      const res = await request(http)
        .delete(`/api/v1/products/${productId}/variants/${variantId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((res.body as { imageUrl: string | null }).imageUrl).toBeNull();
    });

    it('STAFF delete variant image → 403', async () => {
      await request(http)
        .delete(`/api/v1/products/${productId}/variants/${variantId}/image`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });
  });
});
