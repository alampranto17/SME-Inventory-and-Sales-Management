import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TenantPlan } from '../enums/tenantPlan.enum';

// POST /tenants/create-with-owner  (super admin only)
// Creates a new shop AND its owner account in one step.
export class CreateShopDto {
  // ── shop ──
  @IsString()
  @IsNotEmpty({ message: 'Shop name is required' })
  @MinLength(3, { message: 'Shop name must be at least 3 characters' })
  @MaxLength(200)
  shopName: string;

  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;

  // ── owner ──
  @IsString()
  @IsNotEmpty({ message: 'Owner name is required' })
  @Matches(/^[a-zA-Z\s]{3,50}$/, {
    message: 'Owner name must be 3-50 characters and letters only',
  })
  ownerFullName: string;

  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Invalid owner email format',
  })
  ownerEmail: string;

  @IsOptional()
  @Matches(/^01[3-9]\d{8}$/, {
    message: 'Invalid phone — Bangladesh format required: 01XXXXXXXXX',
  })
  ownerPhone?: string;

  @IsString()
  @MinLength(8, { message: 'Owner password must be at least 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must have uppercase, lowercase, number and special character (@$!%*?&)',
    },
  )
  ownerPassword: string;
}
