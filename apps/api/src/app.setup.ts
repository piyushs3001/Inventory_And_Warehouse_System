import * as fs from 'node:fs';
import * as express from 'express';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_STORAGE_LOCAL_DIR } from './storage/storage.defaults';

export interface AppSetupOptions {
  /** Allowed browser origin(s) for CORS. A single origin or a list. */
  corsOrigin: string | string[];
}

/**
 * Single source of truth for app-wide configuration, shared by the production
 * bootstrap (`main.ts`) and e2e tests so they never drift. Applies the global
 * `/api/v1` prefix, the strict validation pipe, and CORS.
 *
 * CORS is required because the web app (`:5000`) and API (`:5001`) are different
 * origins; without it the browser blocks every request and the SPA surfaces the
 * failure as a generic error. `credentials: true` is set for future cookie/refresh
 * flows; the JWT is currently sent via the Authorization header.
 */
export function configureApp(
  app: INestApplication,
  opts: AppSetupOptions,
): void {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({ origin: opts.corsOrigin, credentials: true });

  // Serve uploaded product/variant images at GET /uploads/<key>.
  // The directory is created here so the API starts cleanly even before the
  // first image is uploaded. Files are public and read-only — no auth guard.
  const config = app.get(ConfigService);
  const uploadsDir =
    config.get<string>('STORAGE_LOCAL_DIR') ?? DEFAULT_STORAGE_LOCAL_DIR;

  fs.mkdirSync(uploadsDir, { recursive: true });
  // Set security headers on every served file:
  //   X-Content-Type-Options: nosniff — prevents browsers from MIME-sniffing away
  //     from the declared content type (defence against content-confusion attacks).
  //   Content-Disposition: inline — tells browsers to display, not download, but
  //     combined with nosniff ensures the declared type is honoured, blocking any
  //     SVG that slipped through upload validation from executing scripts inline.
  app.use(
    '/uploads',
    express.static(uploadsDir, {
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', 'inline');
      },
    }),
  );
}
