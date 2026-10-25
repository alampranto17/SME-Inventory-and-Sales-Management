import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  PurchaseOrderQueryDto,
  ReceivePurchaseOrderDto,
} from './dto/purchaseOrder.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import { MANAGER_AND_UP } from 'src/common/constants/roles.constants';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

// buying stock is a manager job -> all routes are Manager+
@Controller('purchase-orders')
@Roles(...MANAGER_AND_UP)
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PurchaseOrderQueryDto) {
    return this.poService.findAll(user.tenantId, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePurchaseOrderDto) {
    return this.poService.create(user, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.poService.findOne(user.tenantId, id);
  }

  @Patch(':id/send')
  markSent(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.poService.markSent(user.tenantId, id);
  }

  @Patch(':id/receive')
  receive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.poService.receive(user, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.poService.cancel(user.tenantId, id);
  }
}
