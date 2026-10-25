import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PurchaseOrderStatus } from '../enums/purchaseOrderStatus.enum';

export class PurchaseOrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  // optional -> product cost price is used
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;
}

// POST /purchase-orders
export class CreatePurchaseOrderDto {
  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'at least one item is required' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReceiveItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(0)
  receivedQty: number;
}

// PATCH /purchase-orders/:id/receive
// body is optional -> if no items are sent, everything is received
export class ReceivePurchaseOrderDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items?: ReceiveItemDto[];
}

export class PurchaseOrderQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;
}
