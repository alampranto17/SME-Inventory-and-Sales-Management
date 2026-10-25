import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { TenantExsitsGuard } from 'src/common/Guards/tenantExsits.guards';
import { CurrentTenants } from 'src/common/decorators/current-tenant.decorator';
import { ChangePlanDto } from './dto/changePlan.dto';
import { ChangeStatusDto } from './dto/changeStatus.dto';
import { Public } from 'src/common/decorators/public.decoretor';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import { UserRole } from 'src/users/enums/userRole.enum';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @Public()
  getPlans() {
    return this.billingService.getPlans();
  }

  @Get(':slug')
  @UseGuards(TenantExsitsGuard)
  getBilling(@CurrentTenants() tenant: any) {
    return this.billingService.getBilling(tenant);
  }

  // only the company owner (or super admin) can change plan / status
  @Patch(':slug/change-plan')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  @UseGuards(TenantExsitsGuard)
  changePlan(@CurrentTenants() tenant: any, @Body() dto: ChangePlanDto) {
    return this.billingService.changePlan(tenant, dto);
  }

  @Patch(':slug/change-status')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(TenantExsitsGuard)
  changeStatus(@CurrentTenants() tenant: any, @Body() dto: ChangeStatusDto) {
    return this.billingService.changeStatus(tenant, dto);
  }
}
