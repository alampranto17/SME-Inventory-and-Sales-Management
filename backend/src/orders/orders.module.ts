import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/orderItem.entity';
import { Product } from 'src/products/entities/product.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { OrdersService } from './orders.service';
import { InvoiceService } from './invoice.service';
import { OrdersController } from './orders.controller';
import { InventoryModule } from 'src/inventory/inventory.module';
import { CustomersModule } from 'src/customers/customers.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, Tenant]),
    InventoryModule,
    CustomersModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, InvoiceService],
  exports: [OrdersService],
})
export class OrdersModule {}
