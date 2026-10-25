import { Body, Controller, Get, Post } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import {
  ALL_TENANT_ROLES,
  MANAGER_AND_UP,
} from 'src/common/constants/roles.constants';
import { CreateWarehouseDto } from './dto/inventory.dto';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

@Controller('warehouses')
@Roles(...ALL_TENANT_ROLES)
export class WarehousesController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.inventoryService.findAllWarehouses(user.tenantId);
  }

  @Post()
  @Roles(...MANAGER_AND_UP)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWarehouseDto) {
    return this.inventoryService.createWarehouse(user.tenantId, dto);
  }
}
