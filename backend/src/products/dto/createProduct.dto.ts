import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'sku is required' })
  @MaxLength(100)
  sku: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'costPrice can not be negative' })
  costPrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'sellingPrice must be a positive number' })
  sellingPrice: number;

  @IsInt()
  @Min(0)
  reorderLevel: number;

  @IsString()
  @IsNotEmpty({ message: 'unit is required (pcs / kg / litre / box)' })
  @MaxLength(50)
  unit: string;

  @IsOptional()
  @IsUrl({}, { message: 'imageUrl must be a valid url' })
  imageUrl?: string;

  // optional: put this much stock in the default warehouse right away
  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock?: number;
}
