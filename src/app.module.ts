import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [UsersModule, TenantsModule, BillingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
