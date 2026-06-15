import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';
import { buildOpenApiDocument } from './openapi.config';

describe('OpenAPI document', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    // No app.init() — avoids Prisma connecting; createDocument only needs metadata.
    app = moduleRef.createNestApplication();
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents the auth + users routes', () => {
    const doc = buildOpenApiDocument(app);
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining(['/auth/login', '/auth/me', '/users']),
    );
  });

  it('declares the bearer security scheme', () => {
    const doc = buildOpenApiDocument(app);
    expect(doc.components?.securitySchemes?.['access-token']).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
  });

  it('includes the response DTO schemas', () => {
    const doc = buildOpenApiDocument(app);
    expect(Object.keys(doc.components?.schemas ?? {})).toEqual(
      expect.arrayContaining(['TokensDto', 'UserDto', 'WarehouseRefDto']),
    );
  });

  it('documents the health endpoint with a HealthDto response', () => {
    const doc = buildOpenApiDocument(app);
    const get = doc.paths['/health'].get!;
    expect(get.tags).toContain('health');
    expect(
      (
        get.responses['200'] as {
          content?: Record<string, { schema: { $ref?: string } }>;
        }
      ).content?.['application/json'].schema.$ref,
    ).toContain('HealthDto');
  });

  it('documents auth error responses', () => {
    const doc = buildOpenApiDocument(app);
    expect(Object.keys(doc.paths['/auth/login'].post!.responses)).toEqual(
      expect.arrayContaining(['200', '400', '401']),
    );
    expect(Object.keys(doc.paths['/auth/me'].get!.responses)).toEqual(
      expect.arrayContaining(['200', '401']),
    );
    expect(Object.keys(doc.paths['/auth/refresh'].post!.responses)).toEqual(
      expect.arrayContaining(['200', '401']),
    );
    expect(Object.keys(doc.paths['/auth/logout'].post!.responses)).toEqual(
      expect.arrayContaining(['401']),
    );
    expect(doc.paths['/auth/login'].post!.summary).toBeTruthy();
    const login401 = doc.paths['/auth/login'].post!.responses['401'] as {
      content?: Record<string, { schema: { $ref?: string } }>;
    };
    expect(login401.content?.['application/json'].schema.$ref).toContain(
      'ErrorResponseDto',
    );
  });
});
