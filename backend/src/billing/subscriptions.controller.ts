import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import {
  GenerateBillsDto,
  InvoiceQueryDto,
  MarkPaidDto,
  MonthQueryDto,
} from './dto/subscription.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import { UserRole } from 'src/users/enums/userRole.enum';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

// Monthly software bills. Most routes are for the SUPER ADMIN.
// (We use "subscriptions" and not "billing" because BillingController
//  already has a "billing/:slug" route that would catch "billing/invoices")
@Controller('subscriptions')
@Roles(UserRole.SUPER_ADMIN)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('summary')
  summary(@Query() query: MonthQueryDto) {
    return this.subscriptionsService.summary(query.month);
  }

  @Get('invoices')
  findInvoices(@Query() query: InvoiceQueryDto) {
    return this.subscriptionsService.findInvoices(query);
  }

  // create this month's bills now (the cron job also does it on the 1st)
  @Post('generate')
  generate(@Body() dto: GenerateBillsDto) {
    return this.subscriptionsService.generateBills(dto.month);
  }

  @Patch('invoices/:id/pay')
  markPaid(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MarkPaidDto) {
    return this.subscriptionsService.markPaid(id, dto);
  }

  @Patch('invoices/:id/unpay')
  markUnpaid(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.markUnpaid(id);
  }

  // shop owner sees his own bills
  @Get('my')
  @Roles(UserRole.BUSINESS_ADMIN)
  myBills(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.myBills(user.tenantId);
  }
}
