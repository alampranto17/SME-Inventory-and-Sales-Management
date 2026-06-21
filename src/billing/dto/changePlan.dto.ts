import { IsEnum, IsNotEmpty } from 'class-validator';
import { TenantPlan } from 'src/tenants/enums/tenantPlan.enum';

export class ChangePlanDto {
  @IsNotEmpty({ message: 'Plan is required' })
  @IsEnum(TenantPlan)
  plan: TenantPlan;
}
