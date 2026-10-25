import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProductDto } from './createProduct.dto';

// every field optional, but you can NOT change stock here
// (use /inventory/adjust for that)
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['initialStock'] as const),
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
