import * as Joi from 'joi';

export interface EnvVars {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  S3_ENDPOINT: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;
  S3_BUCKET: string;
}

export const envSchema = Joi.object<EnvVars, true>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  S3_ENDPOINT: Joi.string().required(),
  S3_ACCESS_KEY: Joi.string().required(),
  S3_SECRET_KEY: Joi.string().required(),
  S3_BUCKET: Joi.string().required(),
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
