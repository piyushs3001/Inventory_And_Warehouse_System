import * as Joi from 'joi';

export interface EnvVars {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  CORS_ORIGIN: string;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  // Required only when STORAGE_DRIVER is not 'local'.
  S3_ENDPOINT?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
  S3_BUCKET?: string;
  // Optional LLM provider keys — when absent, the AI Chat Assistant reports
  // "not configured" rather than fabricating answers. Statistical AI features
  // (reorder, forecast, PO generator, report summary) work without them.
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  // Storage
  STORAGE_DRIVER?: 'local';
  STORAGE_LOCAL_DIR?: string;
  PUBLIC_FILES_BASE_URL?: string;
}

// Using a looser object type so that `Joi.when()` alternatives (which return
// `AlternativesSchema`, not `StringSchema`) don't break strict type checking
// while still validating against the `EnvVars` interface at runtime.
export const envSchema = Joi.object<EnvVars>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(5002),
  CORS_ORIGIN: Joi.string().default(
    'http://localhost:5000,http://localhost:5001',
  ),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  // S3/MinIO credentials are only required when STORAGE_DRIVER is not 'local'.
  // With the default local driver they are unused; keep them optional so the
  // app boots cleanly without cloud credentials in dev.
  S3_ENDPOINT: Joi.when('STORAGE_DRIVER', {
    is: Joi.valid('local').required(),
    then: Joi.string().optional(),
    otherwise: Joi.string().required(),
  }),
  S3_ACCESS_KEY: Joi.when('STORAGE_DRIVER', {
    is: Joi.valid('local').required(),
    then: Joi.string().optional(),
    otherwise: Joi.string().required(),
  }),
  S3_SECRET_KEY: Joi.when('STORAGE_DRIVER', {
    is: Joi.valid('local').required(),
    then: Joi.string().optional(),
    otherwise: Joi.string().required(),
  }),
  S3_BUCKET: Joi.when('STORAGE_DRIVER', {
    is: Joi.valid('local').required(),
    then: Joi.string().optional(),
    otherwise: Joi.string().required(),
  }),
  OPENAI_API_KEY: Joi.string().optional(),
  GEMINI_API_KEY: Joi.string().optional(),
  // Storage — all optional; defaults live in LocalStorageService
  STORAGE_DRIVER: Joi.string().valid('local').default('local'),
  STORAGE_LOCAL_DIR: Joi.string().optional(),
  PUBLIC_FILES_BASE_URL: Joi.string().optional(),
});

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const { error, value } = envSchema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  }) as { error?: Joi.ValidationError; value: EnvVars };
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
  return value;
}
