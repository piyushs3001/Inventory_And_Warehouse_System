import { INestApplication, ValidationPipe } from '@nestjs/common';

export interface AppSetupOptions {
  /** Allowed browser origin(s) for CORS. A single origin or a list. */
  corsOrigin: string | string[];
}

/**
 * Single source of truth for app-wide configuration, shared by the production
 * bootstrap (`main.ts`) and e2e tests so they never drift. Applies the global
 * `/api/v1` prefix, the strict validation pipe, and CORS.
 *
 * CORS is required because the web app (`:3000`) and API (`:3001`) are different
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
}
