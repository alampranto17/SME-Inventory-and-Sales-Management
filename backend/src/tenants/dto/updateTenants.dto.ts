import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantsDto } from './createTenants.dto';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { TenantStatus } from '../enums/tenantStatus.enum';

export class UpdateTenantDto extends PartialType(CreateTenantsDto) {
  @IsOptional()
  @IsNotEmpty()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}
