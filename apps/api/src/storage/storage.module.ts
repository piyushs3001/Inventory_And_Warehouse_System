import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageService } from './local-storage.service';

/**
 * Provides `StorageService` bound to `LocalStorageService`.
 *
 * To swap in an S3/MinIO implementation later, replace the `useClass` here —
 * all consumers depend on the abstract `StorageService` token and will
 * automatically receive the new implementation.
 */
@Module({
  providers: [
    {
      provide: StorageService,
      useClass: LocalStorageService,
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
