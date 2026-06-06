import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from '../app.module';
import { buildOpenApiDocument } from './openapi.config';

// Writes apps/api/openapi.json. Run against BUILT output
// (`nest build && node dist/openapi/generate-openapi.js`) so the
// @nestjs/swagger CLI plugin has applied request-DTO metadata.
// Does not call app.init()/listen(), so no database connection is needed.
async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = buildOpenApiDocument(app);
  const outPath = join(process.cwd(), 'openapi.json');
  writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  console.log(`Wrote ${outPath}`);
}

generate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
