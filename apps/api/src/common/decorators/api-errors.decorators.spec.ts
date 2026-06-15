import { Test } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiAuthErrors, ApiValidationError } from './api-errors.decorators';

@Controller('probe')
class ProbeController {
  @Get()
  @ApiAuthErrors()
  @ApiValidationError()
  hit(): string {
    return 'ok';
  }
}

describe('api-errors decorators', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
  });

  afterAll(async () => app.close());

  it('declares 400/401/403 all referencing ErrorResponseDto', () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    const responses = doc.paths['/probe'].get!.responses as Record<
      string,
      { content?: { 'application/json': { schema: { $ref?: string } } } }
    >;
    for (const code of ['400', '401', '403']) {
      expect(responses[code]).toBeDefined();
      expect(
        responses[code].content?.['application/json'].schema.$ref,
      ).toContain('ErrorResponseDto');
    }
  });
});
