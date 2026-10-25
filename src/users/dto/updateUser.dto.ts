import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUserDto } from './createUser.dto';

// All fields from CreateUserDto become optional + we add isActive
export class UpdatedUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
