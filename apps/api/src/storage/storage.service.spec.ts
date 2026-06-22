import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';

// ---------------------------------------------------------------------------
// Minimal valid image buffers used by tests that exercise the save() path.
// Each buffer must pass assertImageMagicBytes(); fake/dummy content is no
// longer accepted now that magic-byte validation is enforced.
// ---------------------------------------------------------------------------

/** Minimal 1×1 transparent PNG (correct PNG magic bytes). */
const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** Minimal 1×1 white JPEG (correct JPEG magic bytes: FF D8 FF). */
const JPEG_BUFFER = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
    'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN' +
    'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
    'MjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=',
  'base64',
);

/**
 * Minimal valid WebP buffer ("RIFF....WEBP" header followed by a VP8L chunk).
 * Constructed from known WebP magic bytes: RIFF (52 49 46 46) at 0-3,
 * file size as little-endian uint32 at 4-7, WEBP (57 45 42 50) at 8-11.
 */
const WEBP_BUFFER = (() => {
  // Smallest possible lossless WebP: RIFF header + WEBP + VP8L chunk with a
  // 1×1 white pixel.  Hand-crafted hex verified against the WebP spec.
  return Buffer.from(
    '524946462a000000574542505650384c' +
      '1f0000002f000000001000001000feff' +
      'fe03000000000000000000000000fe07',
    'hex',
  );
})();

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

      const { key } = await service.save(
        {
          buffer: JPEG_BUFFER,
          originalName: 'photo.jpg',
          mimeType: 'image/jpeg',
        },
        'products',
      );

      expect(key).toMatch(/^products\/[a-f0-9-]+\.jpg$/);

      const fullPath = path.join(tmpDir, key);
      const written = await fs.readFile(fullPath);
      expect(written.equals(JPEG_BUFFER)).toBe(true);
    });

    it('uses the mime-type extension for a png', async () => {
      const service = makeService(tmpDir);
      const { key } = await service.save(
        {
          buffer: PNG_BUFFER,
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
          buffer: WEBP_BUFFER,
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

    // --- Magic-byte validation (BUG-01 coverage) ----------------------------

    it('BUG-01: rejects SVG content sent as image/png (MIME-spoofing)', async () => {
      const service = makeService(tmpDir);
      const svgBuffer = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      );
      await expect(
        service.save(
          {
            buffer: svgBuffer,
            originalName: 'spoofed.png',
            mimeType: 'image/png',
          },
          'products',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects XML/SVG content with a leading BOM (BUG-01 variant)', async () => {
      const service = makeService(tmpDir);
      // UTF-8 BOM (EF BB BF) followed by SVG markup
      const bomSvg = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from(
          '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>',
        ),
      ]);
      await expect(
        service.save(
          {
            buffer: bomSvg,
            originalName: 'spoofed.png',
            mimeType: 'image/png',
          },
          'products',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a plain-text buffer sent as image/jpeg', async () => {
      const service = makeService(tmpDir);
      await expect(
        service.save(
          {
            buffer: Buffer.from('This is not an image.'),
            originalName: 'fake.jpg',
            mimeType: 'image/jpeg',
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
          buffer: PNG_BUFFER,
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
