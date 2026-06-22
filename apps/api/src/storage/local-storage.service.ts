import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

/**
 * Known image mime-types mapped to their canonical file extension.
 * NOTE: image/svg+xml is intentionally excluded — SVG can embed <script> tags
 * (stored-XSS). Full magic-byte validation is deferred (no-new-deps constraint);
 * rejecting SVG + nosniff headers removes the script-execution vector for the
 * remaining raster types.
 */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
};

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
   */
  private resolveExt(mimeType: string, originalName: string): string {
    if (!mimeType.startsWith('image/')) {
      throw new BadRequestException(
        `Unsupported file type "${mimeType}". Only image/* files are accepted.`,
      );
    }
    // SVG is explicitly rejected: it can carry embedded <script> tags (stored-XSS).
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
      this.config.get<string>('STORAGE_LOCAL_DIR') ??
      path.resolve(process.cwd(), '../../var/uploads')
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
    const ext = this.resolveExt(file.mimeType, file.originalName);
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
