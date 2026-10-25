import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { OrderItem } from 'src/orders/entities/orderItem.entity';
import { Inventory } from 'src/inventory/entities/inventory.entity';
import { PurchaseOrderItem } from 'src/purchase-orders/entities/purchaseOrderItem.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { InventoryModule } from 'src/inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Inventory, PurchaseOrderItem]),
    InventoryModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
