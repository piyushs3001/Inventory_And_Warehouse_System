import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ActivityModule } from '../activity/activity.module';
import { BarcodesModule } from '../barcodes/barcodes.module';
import { StorageModule } from '../storage/storage.module';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';

@Module({
  imports: [AuthModule, ActivityModule, BarcodesModule, StorageModule],
  controllers: [VariantsController],
  providers: [VariantsService],
})
export class VariantsModule {}
