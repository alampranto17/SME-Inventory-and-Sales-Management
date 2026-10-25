import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TenantPlan } from '../enums/tenantPlan.enum';
import { TenantStatus } from '../enums/tenantStatus.enum';

export class CreateTenantsDto {
  @IsString()
  @MinLength(3, { message: 'Name field must be max 3 character' })
  @MaxLength(200, { message: 'Name field must be under 200 character' })
  @IsNotEmpty({ message: 'Name field must fillup.' })
  name: string;
  @IsString()
  @Matches(/[a-z0-9-]+$/, {
    message: 'slug must be lowercase alphanumeric with hyphens',
  })
  @IsNotEmpty({ message: 'Slug is required' })
  slug: string;
  @IsNotEmpty({ message: 'Plan is required.' })
  @IsEnum(TenantPlan)
  plan: TenantPlan;
}
