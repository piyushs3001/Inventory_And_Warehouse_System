import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

describe('Barcodes (e2e)', () => {
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
    await clearCatalog();
    await prisma.user.deleteMany();
    await app.close();
  });

  let adminToken: string;
  let staffToken: string;
  let productId: string;
  let skuVariantId: string;
  let barcodeVariantId: string;

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
    await prisma.category.deleteMany();
  }

  const PNG_PREFIX = 'data:image/png;base64,';

  beforeEach(async () => {
    await clearCatalog();
    await prisma.user.deleteMany();

    await users.create({
      name: 'Admin',
      email: 'admin@bc.local',
      password: 'password123',
      role: Role.SUPER_ADMIN,
    });
    await users.create({
      name: 'Staff',
      email: 'staff@bc.local',
      password: 'password123',
      role: Role.STAFF,
    });
    adminToken = await login('admin@bc.local');
    staffToken = await login('staff@bc.local');

    const product = await prisma.product.create({
      data: { name: 'BC Product', sku: 'BC-PROD' },
    });
    productId = product.id;
    const v1 = await prisma.productVariant.create({
      data: { productId, sku: 'BC-VAR-SKU' },
    });
    skuVariantId = v1.id;
    const v2 = await prisma.productVariant.create({
      data: { productId, sku: 'BC-VAR-2', barcode: '5012345678900' },
    });
    barcodeVariantId = v2.id;
  });

  it('GET product barcode → 200, encodes SKU as a PNG data URI (default code128)', async () => {
    const res = await request(http)
      .get(`/api/v1/products/${productId}/barcode`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as { value: string; symbology: string; png: string };
    expect(body.value).toBe('BC-PROD');
    expect(body.symbology).toBe('code128');
    expect(body.png.startsWith(PNG_PREFIX)).toBe(true);
  });

  it('GET product barcode?symbology=qr → 200, qr', async () => {
    const res = await request(http)
      .get(`/api/v1/products/${productId}/barcode?symbology=qr`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((res.body as { symbology: string }).symbology).toBe('qr');
  });

  it('Staff GET product barcode → 200 (reads open to any authenticated user)', async () => {
    await request(http)
      .get(`/api/v1/products/${productId}/barcode`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
  });

  it('invalid symbology → 400', async () => {
    await request(http)
      .get(`/api/v1/products/${productId}/barcode?symbology=bogus`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('unknown product → 404', async () => {
    await request(http)
      .get('/api/v1/products/11111111-1111-4111-8111-111111111111/barcode')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('variant barcode falls back to SKU when no barcode value', async () => {
    const res = await request(http)
      .get(`/api/v1/products/${productId}/variants/${skuVariantId}/barcode`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((res.body as { value: string }).value).toBe('BC-VAR-SKU');
  });

  it('variant barcode uses the barcode value when present', async () => {
    const res = await request(http)
      .get(`/api/v1/products/${productId}/variants/${barcodeVariantId}/barcode`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((res.body as { value: string }).value).toBe('5012345678900');
  });

  it('variant barcode under the wrong product → 404', async () => {
    const other = await prisma.product.create({
      data: { name: 'Other', sku: 'BC-OTHER' },
    });
    await request(http)
      .get(`/api/v1/products/${other.id}/variants/${skuVariantId}/barcode`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('unauthenticated → 401', async () => {
    await request(http)
      .get(`/api/v1/products/${productId}/barcode`)
      .expect(401);
  });
});
