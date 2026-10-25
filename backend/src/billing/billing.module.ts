import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionInvoice } from './entities/subscriptionInvoice.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { TenantsModule } from 'src/tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionInvoice, Tenant]),
    TenantsModule,
  ],
  controllers: [BillingController, SubscriptionsController],
  providers: [BillingService, SubscriptionsService],
})
export class BillingModule {}
