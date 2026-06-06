import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes a password to a non-plaintext string', async () => {
    const hash = await service.hash('S3cret!');
    expect(hash).not.toBe('S3cret!');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifies a correct password', async () => {
    const hash = await service.hash('S3cret!');
    await expect(service.compare('S3cret!', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('S3cret!');
    await expect(service.compare('wrong', hash)).resolves.toBe(false);
  });
});
