import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { MovementsModule } from './movements/movements.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { TransfersModule } from './transfers/transfers.module';
import { StockCountsModule } from './stock-counts/stock-counts.module';
import { ActivityModule } from './activity/activity.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Generous per-route default (abuse backstop); brute-force-sensitive routes
    // (login/register) tighten this with @Throttle. Tracking is per route+IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    WarehousesModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    MovementsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    TransfersModule,
    StockCountsModule,
    ActivityModule,
    NotificationsModule,
    DashboardModule,
    ReportsModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
