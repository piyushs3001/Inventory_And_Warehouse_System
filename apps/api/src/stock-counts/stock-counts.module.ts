import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ActivityModule } from '../activity/activity.module';
import { StockCountsController } from './stock-counts.controller';
import { StockCountsService } from './stock-counts.service';

@Module({
  imports: [AuthModule, InventoryModule, ActivityModule],
  controllers: [StockCountsController],
  providers: [StockCountsService],
})
export class StockCountsModule {}
