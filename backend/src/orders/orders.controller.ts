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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { OrdersService } from './orders.service';
import { InvoiceService } from './invoice.service';
import {
  CancelOrderDto,
  CreateOrderDto,
  OrderQueryDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import {
  ALL_TENANT_ROLES,
  MANAGER_AND_UP,
} from 'src/common/constants/roles.constants';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

@Controller('orders')
@Roles(...ALL_TENANT_ROLES)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: OrderQueryDto) {
    return this.ordersService.findAll(user.tenantId, query);
  }

  // staff can sell
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user, dto);
  }

  @Get('today-summary')
  @Roles(...MANAGER_AND_UP)
  todaySummary(@CurrentUser() user: AuthUser) {
    return this.ordersService.todaySummary(user.tenantId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findOne(user.tenantId, id);
  }

  @Patch(':id/status')
  @Roles(...MANAGER_AND_UP)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(user, id, dto);
  }

  @Post(':id/cancel')
  @Roles(...MANAGER_AND_UP)
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancel(user, id, dto);
  }

  // returns a PDF file, not JSON -> we use @Res() to send it ourselves
  @Get(':id/invoice')
  async invoice(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { pdf, fileName } = await this.invoiceService.createInvoicePdf(
      user.tenantId,
      id,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }
}
