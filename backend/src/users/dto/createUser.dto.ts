// src/modules/users/dto/create-user.dto.ts

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  MinLength,
  Matches,
  IsBoolean,
} from 'class-validator';
import { UserRole } from '../enums/userRole.enum';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @Matches(/^[a-zA-Z\s]{3,50}$/, {
    message: 'Full name must be 3-50 characters and letters only',
  })
  fullName: string;

  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Invalid email format',
  })
  email: string;

  @IsOptional()
  @Matches(/^01[3-9]\d{8}$/, {
    message: 'Invalid phone — Bangladesh format required: 01XXXXXXXXX',
  })
  phone?: string;
  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid role' })
  @IsNotEmpty({ message: 'Role is required' })
  role?: UserRole;

  @IsOptional()
  @IsString()
  tenantSlug?: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/,
    {
      message:
        'Password must have uppercase, lowercase, number and special character (@$!%*?&)',
    },
  )
  password: string;
  @IsOptional()
  @IsString()
  secretKey?: string;
}
