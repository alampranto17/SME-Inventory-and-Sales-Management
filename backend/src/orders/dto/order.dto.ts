import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { OrderStatus } from '../enums/orderStatus.enum';

// one line inside the order
export class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1, { message: 'quantity must be a positive integer' })
  quantity: number;

  // optional -> product selling price is used
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;
}

// POST /orders
export class CreateOrderDto {
  // no customer = walk-in customer
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  // @ValidateNested + @Type -> also validate every item inside the array
  @IsArray()
  @ArrayMinSize(1, { message: 'items array cannot be empty' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// PATCH /orders/:id/status
export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'Invalid status' })
  status: OrderStatus;
}

// POST /orders/:id/cancel
export class CancelOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'reason is required for cancellation' })
  reason: string;
}

// GET /orders?status=&dateFrom=&dateTo=&customerId=&page=&limit=
export class OrderQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}
