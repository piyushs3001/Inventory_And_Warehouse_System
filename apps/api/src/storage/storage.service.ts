/**
 * Abstract storage service — the DI token consumed by the rest of the API.
 * The local-disk implementation (`LocalStorageService`) is the default.
 * An S3/MinIO implementation can be swapped in later without touching callers.
 */
export abstract class StorageService {
  /**
   * Persist `file` under `prefix` and return a stable storage `key`.
   * Only `image/*` MIME types are accepted; others throw `BadRequestException`.
   * The key format is `<prefix>/<uuid>.<ext>`.
   */
  abstract save(
    file: {
      buffer: Buffer;
      originalName: string;
      mimeType: string;
    },
    prefix: string,
  ): Promise<{ key: string }>;

  /**
   * Remove the file identified by `key`. A missing file is silently ignored
   * (idempotent delete — safe for replace-then-delete flows).
   */
  abstract delete(key: string): Promise<void>;

  /**
   * Convert a storage key to a publicly accessible URL.
   * Returns `null` when `key` is `null` (convenient for nullable DB columns).
   */
  abstract getUrl(key: string | null): string | null;
}
