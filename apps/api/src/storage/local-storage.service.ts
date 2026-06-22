import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { DEFAULT_STORAGE_LOCAL_DIR } from './storage.defaults';

/**
 * Known image mime-types mapped to their canonical file extension.
 * Restricted to the four raster formats with well-defined magic-byte signatures
 * (PNG, JPEG, GIF, WebP). image/svg+xml is intentionally excluded — SVG can
 * embed <script> tags (stored-XSS). AVIF, BMP, and TIFF are excluded because
 * their magic-byte patterns are not validated below; accepting them would widen
 * the attack surface without adding meaningful utility.
 */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/**
 * Validate a buffer's actual content against known raster image magic bytes.
 *
 * - SVG / XML: rejected regardless of declared MIME if the first ~256 bytes
 *   (after stripping leading whitespace/BOM) begin with `<?xml` or `<svg`, or
 *   if `<svg` appears anywhere in the first 256 bytes (case-insensitive).
 *   This blocks MIME-spoofed SVG uploads (BUG-01).
 *
 * - Raster signatures accepted (authoritative check):
 *     PNG  — 89 50 4E 47 0D 0A 1A 0A
 *     JPEG — FF D8 FF
 *     GIF  — 47 49 46 38  ("GIF8")
 *     WebP — 52 49 46 46 … 57 45 42 50  ("RIFF….WEBP", bytes 0-3 and 8-11)
 *
 * Throws BadRequestException for any buffer that does not satisfy the above.
 */
function assertImageMagicBytes(buffer: Buffer): void {
  if (buffer.length === 0) {
    throw new BadRequestException('File is not a valid image.');
  }

  // Strip leading BOM (EF BB BF) and whitespace to reach the real content start.
  let start = 0;
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    start = 3; // UTF-8 BOM
  }
  while (start < buffer.length && buffer[start] <= 0x20) {
    start++;
  }

  // Inspect up to the first 256 bytes for SVG / XML markers.
  const probe = buffer
    .subarray(start, start + 256)
    .toString('latin1')
    .toLowerCase();

  if (
    probe.startsWith('<?xml') ||
    probe.startsWith('<svg') ||
    probe.includes('<svg')
  ) {
    throw new BadRequestException(
      'SVG uploads are not allowed for security reasons.',
    );
  }

  // Check raster magic bytes from the very start of the buffer (not `start`),
  // because valid rasters never have leading whitespace before the signature.
  const b = buffer;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return;
  }

  // JPEG: FF D8 FF
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return;
  }

  // GIF: 47 49 46 38 ("GIF8")
  if (
    b.length >= 4 &&
    b[0] === 0x47 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x38
  ) {
    return;
  }

  // WebP: "RIFF" (bytes 0-3) + "WEBP" (bytes 8-11)
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return;
  }

  throw new BadRequestException('File is not a valid image.');
}

/** Default base URL when PUBLIC_FILES_BASE_URL is not configured. */
const DEFAULT_BASE_URL = 'http://localhost:5002';

@Injectable()
export class LocalStorageService extends StorageService {
  constructor(private readonly config: ConfigService) {
    super();
  }

  /**
   * Derive a file extension from MIME type first, then fall back to the
   * original file name. Throws `BadRequestException` for non-image MIMEs or
   * when no extension can be resolved.
   *
   * This is a declared-MIME check (defence-in-depth). The authoritative
   * content-based check is `assertImageMagicBytes()`, called in `save()`.
   */
  private resolveExt(mimeType: string, originalName: string): string {
    if (!mimeType.startsWith('image/')) {
      throw new BadRequestException(
        `Unsupported file type "${mimeType}". Only image/* files are accepted.`,
      );
    }
    // SVG is explicitly rejected at the MIME level (defence-in-depth).
    // The magic-byte check in save() provides the authoritative rejection
    // even when SVG content is sent with a spoofed MIME type.
    if (mimeType.toLowerCase() === 'image/svg+xml') {
      throw new BadRequestException(
        'SVG uploads are not allowed for security reasons.',
      );
    }

    // Prefer known MIME → extension mapping.
    const fromMime = MIME_TO_EXT[mimeType.toLowerCase()];
    if (fromMime) return fromMime;

    // Fall back to the extension from the original filename.
    const fromName = path
      .extname(originalName)
      .replace(/^\./, '')
      .toLowerCase();
    if (fromName) return fromName;

    throw new BadRequestException(
      `Could not determine a file extension for MIME type "${mimeType}".`,
    );
  }

  private get storageDir(): string {
    return (
      this.config.get<string>('STORAGE_LOCAL_DIR') ?? DEFAULT_STORAGE_LOCAL_DIR
    );
  }

  private get baseUrl(): string {
    return this.config.get<string>('PUBLIC_FILES_BASE_URL') ?? DEFAULT_BASE_URL;
  }

  /**
   * Guard against path-traversal: ensure the resolved target stays inside
   * storageDir. A key like `../../etc/passwd` would otherwise escape.
   */
  private assertContained(resolvedTarget: string): void {
    const base = path.resolve(this.storageDir);
    if (
      resolvedTarget !== base &&
      !resolvedTarget.startsWith(base + path.sep)
    ) {
      throw new BadRequestException('Invalid storage key.');
    }
  }

  override async save(
    file: { buffer: Buffer; originalName: string; mimeType: string },
    prefix: string,
  ): Promise<{ key: string }> {
    // 1. Declared-MIME check (defence-in-depth — fast, runs before buffer work).
    const ext = this.resolveExt(file.mimeType, file.originalName);

    // 2. Magic-byte check (authoritative) — validates actual buffer content
    //    independent of the client-supplied Content-Type header, blocking
    //    MIME-spoofing attacks such as SVG sent as image/png (BUG-01).
    assertImageMagicBytes(file.buffer);

    const filename = `${randomUUID()}.${ext}`;
    const key = `${prefix}/${filename}`;
    const destPath = path.resolve(this.storageDir, key);

    // Defence-in-depth: the key is UUID-based so traversal is impossible in
    // practice, but we guard here to keep the invariant explicit.
    this.assertContained(destPath);

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, file.buffer);

    return { key };
  }

  override async delete(key: string): Promise<void> {
    const target = path.resolve(this.storageDir, key);
    this.assertContained(target);
    try {
      await fs.unlink(target);
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw err;
      // File already gone — treat as success (idempotent).
    }
  }

  override getUrl(key: string | null): string | null {
    if (key === null) return null;
    return `${this.baseUrl}/uploads/${key}`;
  }
}
