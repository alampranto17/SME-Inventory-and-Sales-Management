import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import {
  ALL_TENANT_ROLES,
  MANAGER_AND_UP,
} from 'src/common/constants/roles.constants';
import {
  AdjustStockDto,
  MovementQueryDto,
  ReceiveStockDto,
  TransferStockDto,
} from './dto/inventory.dto';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

@Controller('inventory')
@Roles(...ALL_TENANT_ROLES)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.inventoryService.findAll(user.tenantId);
  }

  // IMPORTANT: put fixed routes ("movements") BEFORE ":productId"
  // otherwise Nest thinks "movements" is a productId
  @Get('movements')
  findMovements(
    @CurrentUser() user: AuthUser,
    @Query() query: MovementQueryDto,
  ) {
    return this.inventoryService.findMovements(user.tenantId, query);
  }

  @Get(':productId')
  findByProduct(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.inventoryService.findByProduct(user.tenantId, productId);
  }

  @Post('adjust')
  @Roles(...MANAGER_AND_UP)
  @HttpCode(HttpStatus.OK)
  adjust(@CurrentUser() user: AuthUser, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjust(user, dto);
  }

  @Post('receive')
  @Roles(...MANAGER_AND_UP)
  @HttpCode(HttpStatus.OK)
  receive(@CurrentUser() user: AuthUser, @Body() dto: ReceiveStockDto) {
    return this.inventoryService.receive(user, dto);
  }

  @Post('transfer')
  @Roles(...MANAGER_AND_UP)
  @HttpCode(HttpStatus.OK)
  transfer(@CurrentUser() user: AuthUser, @Body() dto: TransferStockDto) {
    return this.inventoryService.transfer(user, dto);
  }
}
