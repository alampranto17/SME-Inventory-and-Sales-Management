import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/createPayment.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import { ALL_TENANT_ROLES } from 'src/common/constants/roles.constants';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

@Controller('payments')
@Roles(...ALL_TENANT_ROLES)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.paymentsService.findAll(user.tenantId, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user, dto);
  }

  @Get('by-order/:orderId')
  findByOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.paymentsService.findByOrder(user.tenantId, orderId);
  }
}
