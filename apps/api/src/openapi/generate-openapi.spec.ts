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

  it('documents users error responses', () => {
    const doc = buildOpenApiDocument(app);
    expect(Object.keys(doc.paths['/users'].post!.responses)).toEqual(
      expect.arrayContaining(['201', '400', '401', '403', '409']),
    );
    expect(Object.keys(doc.paths['/users/{id}'].get!.responses)).toEqual(
      expect.arrayContaining(['200', '401', '403', '404']),
    );
    expect(doc.paths['/users/{id}'].get!.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'id', in: 'path' }),
      ]),
    );
    expect(Object.keys(doc.paths['/users/{id}'].patch!.responses)).toEqual(
      expect.arrayContaining(['400', '404']),
    );
    expect(Object.keys(doc.paths['/users/{id}'].delete!.responses)).toEqual(
      expect.arrayContaining(['404']),
    );
    expect(
      Object.keys(doc.paths['/users/{id}/warehouses'].put!.responses),
    ).toEqual(expect.arrayContaining(['400', '404']));
  });

  it('documents warehouses error responses', () => {
    const doc = buildOpenApiDocument(app);
    const listResponses = Object.keys(doc.paths['/warehouses'].get!.responses);
    expect(listResponses).toEqual(expect.arrayContaining(['200', '401']));
    expect(listResponses).not.toContain('403'); // list is scope-filtered, not role-gated
    expect(Object.keys(doc.paths['/warehouses/{id}'].get!.responses)).toEqual(
      expect.arrayContaining(['200', '401', '404']),
    );
    expect(
      Object.keys(doc.paths['/warehouses/{id}'].get!.responses),
    ).not.toContain('403');
    expect(Object.keys(doc.paths['/warehouses'].post!.responses)).toEqual(
      expect.arrayContaining(['201', '400', '401', '403']),
    );
    expect(Object.keys(doc.paths['/warehouses/{id}'].patch!.responses)).toEqual(
      expect.arrayContaining(['200', '400', '401', '403', '404']),
    );
    expect(
      Object.keys(doc.paths['/warehouses/{id}'].delete!.responses),
    ).toEqual(expect.arrayContaining(['200', '401', '403', '404']));
    expect(
      Object.keys(doc.paths['/warehouses/{id}/staff'].post!.responses),
    ).toEqual(expect.arrayContaining(['201', '400', '401', '403', '404']));
  });
});
