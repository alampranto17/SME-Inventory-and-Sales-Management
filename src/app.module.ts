import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './database/database.config';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { BillingModule } from './billing/billing.module';
import { AuthModule } from './auth/auth.module';
import { PusherModule } from './pusher/pusher.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { OrdersModule } from './orders/orders.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // database connection (settings come from .env)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),

    // turns on @Cron() jobs
    ScheduleModule.forRoot(),

    // rate limit: 60 requests per minute per IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

    PusherModule,
    UsersModule,
    TenantsModule,
    BillingModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    CustomersModule,
    SuppliersModule,
    OrdersModule,
    PurchaseOrdersModule,
    PaymentsModule,
    ReportsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // rate limit guard for every route
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
