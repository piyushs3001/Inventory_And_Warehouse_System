import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';

// ---------------------------------------------------------------------------
// Minimal ConfigService stub — returns STORAGE_LOCAL_DIR from a temp dir
// ---------------------------------------------------------------------------

function makeService(tmpDir: string, baseUrl?: string): LocalStorageService {
  const config = {
    get: (key: string) => {
      if (key === 'STORAGE_LOCAL_DIR') return tmpDir;
      if (key === 'PUBLIC_FILES_BASE_URL') return baseUrl ?? undefined;
      return undefined;
    },
  };
  return new LocalStorageService(config as never);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LocalStorageService', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'iws-storage-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // save
  // -------------------------------------------------------------------------

  describe('save', () => {
    it('writes the file under <STORAGE_LOCAL_DIR>/<prefix>/<uuid>.<ext> and returns the key', async () => {
      const service = makeService(tmpDir);
      const buffer = Buffer.from('fake-image-data');

      const { key } = await service.save(
        { buffer, originalName: 'photo.jpg', mimeType: 'image/jpeg' },
        'products',
      );

      expect(key).toMatch(/^products\/[a-f0-9-]+\.jpg$/);

      const fullPath = path.join(tmpDir, key);
      const written = await fs.readFile(fullPath);
      expect(written.equals(buffer)).toBe(true);
    });

    it('uses the mime-type extension for a png', async () => {
      const service = makeService(tmpDir);
      const { key } = await service.save(
        {
          buffer: Buffer.from('x'),
          originalName: 'noext',
          mimeType: 'image/png',
        },
        'variants',
      );
      expect(key).toMatch(/^variants\/[a-f0-9-]+\.png$/);
    });

    it('creates nested prefix directories automatically', async () => {
      const service = makeService(tmpDir);
      const { key } = await service.save(
        {
          buffer: Buffer.from('x'),
          originalName: 'a.webp',
          mimeType: 'image/webp',
        },
        'products/123',
      );
      expect(key).toMatch(/^products\/123\/[a-f0-9-]+\.webp$/);
      await expect(fs.access(path.join(tmpDir, key))).resolves.toBeUndefined();
    });

    it('throws BadRequestException for a non-image mime type', async () => {
      const service = makeService(tmpDir);
      await expect(
        service.save(
          {
            buffer: Buffer.from('x'),
            originalName: 'file.pdf',
            mimeType: 'application/pdf',
          },
          'products',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when no extension can be resolved', async () => {
      const service = makeService(tmpDir);
      await expect(
        service.save(
          {
            buffer: Buffer.from('x'),
            originalName: 'noext',
            mimeType: 'image/unknown-format',
          },
          'products',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  describe('delete', () => {
    it('removes an existing file', async () => {
      const service = makeService(tmpDir);
      const { key } = await service.save(
        {
          buffer: Buffer.from('data'),
          originalName: 'img.png',
          mimeType: 'image/png',
        },
        'products',
      );
      const fullPath = path.join(tmpDir, key);

      await service.delete(key);

      await expect(fs.access(fullPath)).rejects.toThrow();
    });

    it('is a no-op (does not throw) when the file does not exist', async () => {
      const service = makeService(tmpDir);
      await expect(
        service.delete('products/nonexistent.jpg'),
      ).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // getUrl
  // -------------------------------------------------------------------------

  describe('getUrl', () => {
    it('returns null when key is null', () => {
      const service = makeService(tmpDir);
      expect(service.getUrl(null)).toBeNull();
    });

    it('returns a URL ending with /uploads/<key>', () => {
      const service = makeService(tmpDir, 'http://localhost:5002');
      const url = service.getUrl('products/abc.jpg');
      expect(url).toBe('http://localhost:5002/uploads/products/abc.jpg');
    });

    it('falls back to the default base URL when PUBLIC_FILES_BASE_URL is not set', () => {
      const service = makeService(tmpDir, undefined);
      const url = service.getUrl('variants/xyz.png');
      expect(url).toMatch(/\/uploads\/variants\/xyz\.png$/);
      expect(url).not.toBeNull();
    });
  });
});
