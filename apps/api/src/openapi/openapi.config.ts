import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

// Single source of truth for the OpenAPI document, shared by the live UI
// (main.ts) and the build-time generator (generate-openapi.ts).
// Paths are emitted WITHOUT the global prefix (e.g. /auth/login); the
// `/api/v1` server entry below makes the live "Try it out" hit the real
// route, while the web axios mutator carries /api/v1 in its baseURL.
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Inventory & Warehouse System API')
    .setDescription('REST API for the Inventory & Warehouse System')
    .setVersion('1.0')
    .addServer('/api/v1')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  return SwaggerModule.createDocument(app, config);
}
