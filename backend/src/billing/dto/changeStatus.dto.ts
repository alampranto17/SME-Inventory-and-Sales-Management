import { IsEnum, IsNotEmpty } from 'class-validator';
import { TenantStatus } from 'src/tenants/enums/tenantStatus.enum';

export class ChangeStatusDto {
  @IsNotEmpty({ message: 'Plan is required' })
  @IsEnum(TenantStatus)
  status: TenantStatus;
}
