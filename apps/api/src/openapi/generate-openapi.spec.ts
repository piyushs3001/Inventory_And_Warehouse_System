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
});
