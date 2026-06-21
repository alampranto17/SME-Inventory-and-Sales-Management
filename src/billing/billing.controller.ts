import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { TenantExsitsGuard } from 'src/common/Guards/tenantExsits.guards';
import { CurrentTenants } from 'src/common/decorators/current-tenant.decorator';
import { ChangePlanDto } from './dto/changePlan.dto';
import { ChangeStatusDto } from './dto/changeStatus.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  getPlans() {
    return this.billingService.getPlans();
  }

  @Get(':slug')
  @UseGuards(TenantExsitsGuard)
  getBilling(@CurrentTenants() tenant: any) {
    return this.billingService.getBilling(tenant);
  }
  @Patch(':slug/change-plan')
  @UseGuards(TenantExsitsGuard)
  changePlan(@CurrentTenants() tenant: any, @Body() dto: ChangePlanDto) {
    return this.billingService.changePlan(tenant, dto);
  }

  @Patch(':slug/change-status')
  @UseGuards(TenantExsitsGuard)
  changeStatus(@CurrentTenants() tenant: any, @Body() dto: ChangeStatusDto) {
    return this.billingService.changeStatus(tenant,dto);
  }

  
}
