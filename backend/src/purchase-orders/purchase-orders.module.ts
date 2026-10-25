import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/purchaseOrder.entity';
import { PurchaseOrderItem } from './entities/purchaseOrderItem.entity';
import { Product } from 'src/products/entities/product.entity';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { SuppliersModule } from 'src/suppliers/suppliers.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder, PurchaseOrderItem, Product]),
    SuppliersModule,
    InventoryModule,
    NotificationsModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
