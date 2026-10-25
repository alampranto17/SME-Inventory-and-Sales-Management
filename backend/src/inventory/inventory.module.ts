import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from './entities/inventory.entity';
import { StockMovement } from './entities/stockMovement.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Product } from 'src/products/entities/product.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { WarehousesController } from './warehouses.controller';
import { LowStockCron } from './lowStock.cron';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventory,
      StockMovement,
      Warehouse,
      Product,
      Tenant,
    ]),
    NotificationsModule,
    UsersModule,
  ],
  controllers: [InventoryController, WarehousesController],
  providers: [InventoryService, LowStockCron],
  // other modules (products, orders, purchase-orders) use InventoryService
  exports: [InventoryService],
})
export class InventoryModule {}
