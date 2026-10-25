import { PartialType } from '@nestjs/mapped-types';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'phone is required' })
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

// GET /customers?search=Karim&page=1&limit=20
export class CustomerQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}
