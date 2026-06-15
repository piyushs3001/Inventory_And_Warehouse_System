import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { buildOpenApiDocument } from './openapi/openapi.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  // CORS_ORIGIN may be a comma-separated list of allowed browser origins.
  const corsOrigin = (
    config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5000'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  configureApp(app, { corsOrigin });

  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = config.get<number>('PORT') ?? 5001;
  await app.listen(port);
}
void bootstrap();
