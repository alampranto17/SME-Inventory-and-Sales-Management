import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { MovementType } from '../enums/movementType.enum';

// All small inventory DTOs live in one file to keep things easy to find.

// POST /inventory/adjust
export class AdjustStockDto {
  @IsUUID()
  productId: string;

  // optional -> default warehouse is used
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  // negative to reduce (-5), positive to add (+10)
  @IsInt({ message: 'quantity must be a whole number' })
  @NotEquals(0, { message: 'quantity can not be 0' })
  quantity: number;

  @IsString()
  @IsNotEmpty({ message: 'reason is required' })
  @MaxLength(255)
  reason: string;
}

// POST /inventory/receive
export class ReceiveStockDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsInt()
  @Min(1, { message: 'quantity must be a positive number' })
  quantity: number;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @IsString()
  @IsNotEmpty({ message: 'reason is required' })
  @MaxLength(255)
  reason: string;
}

// POST /inventory/transfer
export class TransferStockDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  fromWarehouseId: string;

  @IsUUID()
  toWarehouseId: string;

  @IsInt()
  @Min(1, { message: 'quantity must be a positive number' })
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

// GET /inventory/movements?productId=&type=&dateFrom=&dateTo=&page=&limit=
export class MovementQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

// POST /warehouses
export class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  address?: string;
}

// used inside services (not an HTTP body), so no validation decorators
export type StockChangeInput = {
  tenantId: string;
  productId: string;
  warehouseId: string;
  change: number; // + add, - remove
  type: MovementType;
  reason: string;
  userId: string | null;
  referenceId?: string | null;
  toWarehouseId?: string | null;
};
