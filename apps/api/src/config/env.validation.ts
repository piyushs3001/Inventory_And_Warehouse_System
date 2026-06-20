import * as Joi from 'joi';

export interface EnvVars {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  CORS_ORIGIN: string;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  S3_ENDPOINT: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;
  S3_BUCKET: string;
  // Optional LLM provider keys — when absent, the AI Chat Assistant reports
  // "not configured" rather than fabricating answers. Statistical AI features
  // (reorder, forecast, PO generator, report summary) work without them.
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  // Optional SMTP transport for password-reset emails. When unset, the reset
  // flow still works (generic responses) but no email is sent — the reset URL
  // is logged in non-production instead. STAFF_/ADMIN_APP_URL build reset links.
  SMTP_HOST?: string;
  SMTP_PORT: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  MAIL_FROM?: string;
  STAFF_APP_URL: string;
  ADMIN_APP_URL: string;
}

export const envSchema = Joi.object<EnvVars, true>({
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
  S3_ENDPOINT: Joi.string().required(),
  S3_ACCESS_KEY: Joi.string().required(),
  S3_SECRET_KEY: Joi.string().required(),
  S3_BUCKET: Joi.string().required(),
  OPENAI_API_KEY: Joi.string().optional(),
  GEMINI_API_KEY: Joi.string().optional(),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(465),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  MAIL_FROM: Joi.string().optional(),
  STAFF_APP_URL: Joi.string().default('http://localhost:5000'),
  ADMIN_APP_URL: Joi.string().default('http://localhost:5001'),
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
