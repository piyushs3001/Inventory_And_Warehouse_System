import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { ReceiptsController } from './receipts.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

@Module({
  // InventoryModule exports InventoryService so receiving funnels stock changes
  // through the same applyMovement (item + ledger, one transaction).
  imports: [AuthModule, InventoryModule, ActivityModule, NotificationsModule],
  controllers: [PurchaseOrdersController, ReceiptsController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
