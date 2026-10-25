import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  DateRangeDto,
  SalesSummaryQueryDto,
  TopProductsQueryDto,
} from './dto/reportQuery.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import {
  ALL_TENANT_ROLES,
  MANAGER_AND_UP,
} from 'src/common/constants/roles.constants';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

@Controller('reports')
@Roles(...MANAGER_AND_UP)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-summary')
  salesSummary(
    @CurrentUser() user: AuthUser,
    @Query() query: SalesSummaryQueryDto,
  ) {
    return this.reportsService.salesSummary(user.tenantId, query);
  }

  @Get('top-products')
  topProducts(
    @CurrentUser() user: AuthUser,
    @Query() query: TopProductsQueryDto,
  ) {
    return this.reportsService.topProducts(user.tenantId, query);
  }

  @Get('inventory-valuation')
  inventoryValuation(@CurrentUser() user: AuthUser) {
    return this.reportsService.inventoryValuation(user.tenantId);
  }

  @Get('profit-loss')
  profitLoss(@CurrentUser() user: AuthUser, @Query() query: DateRangeDto) {
    return this.reportsService.profitLoss(user.tenantId, query);
  }

  // staff can also see this one
  @Get('low-stock-alert')
  @Roles(...ALL_TENANT_ROLES)
  lowStockAlert(@CurrentUser() user: AuthUser) {
    return this.reportsService.lowStockAlert(user.tenantId);
  }
}
