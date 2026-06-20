import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [AuthModule, ActivityModule, NotificationsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  // Exported so the procurement and transfer flows can funnel their stock
  // changes through the same applyMovement (item update + ledger, one tx).
  exports: [InventoryService],
})
export class InventoryModule {}
