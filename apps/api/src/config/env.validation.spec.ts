import { validateEnv } from './env.validation';

const complete = {
  DATABASE_URL:
    'postgresql://iws:iws_password@localhost:5432/iws?schema=public',
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_ACCESS_KEY: 'minio',
  S3_SECRET_KEY: 'minio_password',
  S3_BUCKET: 'iws',
};

describe('validateEnv', () => {
  it('throws when DATABASE_URL is missing', () => {
    const incomplete: Record<string, unknown> = { ...complete };
    delete incomplete.DATABASE_URL;
    expect(() => validateEnv(incomplete)).toThrow(/DATABASE_URL/);
  });

  it('passes and returns values when all required vars are present', () => {
    const result = validateEnv(complete);
    expect(result.DATABASE_URL).toBe(complete.DATABASE_URL);
    expect(result.PORT).toBe(3001); // default applied
  });
});
