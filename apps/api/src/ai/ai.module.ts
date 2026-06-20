import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReportsModule } from '../reports/reports.module';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  // Reuses ReportsService (summaries) and PurchaseOrdersService (Draft PO
  // generation) so AI output funnels through the same validated flows.
  imports: [AuthModule, ReportsModule, PurchaseOrdersModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
