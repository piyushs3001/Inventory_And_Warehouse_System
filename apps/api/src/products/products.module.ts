import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ActivityModule } from '../activity/activity.module';
import { BarcodesModule } from '../barcodes/barcodes.module';
import { StorageModule } from '../storage/storage.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [AuthModule, ActivityModule, BarcodesModule, StorageModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
