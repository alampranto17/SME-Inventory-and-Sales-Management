import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
