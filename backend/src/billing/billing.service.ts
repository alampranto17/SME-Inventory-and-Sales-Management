import { BadRequestException, Injectable } from '@nestjs/common';
import { BILLING_PLANS } from './constants/billing.constants';
import { TenantsService } from 'src/tenants/tenants.service';
import { ChangePlanDto } from './dto/changePlan.dto';
import { ChangeStatusDto } from './dto/changeStatus.dto';

@Injectable()
export class BillingService {
  constructor(private readonly tenantsService: TenantsService) {}

  getPlans() {
    const plans = BILLING_PLANS;
    return plans;
  }
  getBilling(tenant: any) {
    const plan = BILLING_PLANS.find((t) => t.plan === tenant.plan);

    return {
      data: tenant,
      plan_prices: plan?.pricing,
    };
  }

  async changePlan(tenant: any, dto: ChangePlanDto) {
    if (!dto.plan) {
      throw new BadRequestException('plan  is required');
    }

    if (dto.plan && dto.plan === tenant.plan) {
      throw new BadRequestException(`Already on "${dto.plan}" plan`);
    }

    const update = await this.tenantsService.update(tenant.slug, {
      ...(dto.plan && { plan: dto.plan }),
    });

    return {
      status: 'successfully updated',
      data: update,
    };
  }

  async changeStatus(tenant: any, dto: ChangeStatusDto) {
    // 1. checking dto is present or not
    if (!dto.status) {
      throw new BadRequestException('status is required');
    }
    //2.check dto plan jodi thake tahole dto.status and tenants match korche ki na.
    if (dto.status && dto.status === tenant.status) {
      throw new BadRequestException(`Already on "${dto.status}" status`);
    }
    const update = await this.tenantsService.update(tenant.slug, {
      ...(dto.status && { status: dto.status }),
    });

    return {
      status: 'successfully updated',
      data: update,
    };
  }
}
