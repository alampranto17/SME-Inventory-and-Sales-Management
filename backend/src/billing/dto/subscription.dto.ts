import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { InvoiceStatus } from '../enums/invoiceStatus.enum';

const MONTH_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_MESSAGE = 'month must look like 2026-10';

// GET /subscriptions/summary?month=2026-10
export class MonthQueryDto {
  @IsOptional()
  @Matches(MONTH_FORMAT, { message: MONTH_MESSAGE })
  month?: string;
}

// GET /subscriptions/invoices?month=2026-10&status=unpaid&tenantId=...
export class InvoiceQueryDto extends MonthQueryDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

// POST /subscriptions/generate  { month?: "2026-10" }
export class GenerateBillsDto extends MonthQueryDto {}

// PATCH /subscriptions/invoices/:id/pay
export class MarkPaidDto {
  @IsString()
  @IsNotEmpty({ message: 'method is required' })
  @IsIn(['cash', 'bkash', 'nagad', 'rocket', 'card', 'bank'], {
    message: 'method must be one of: cash, bkash, nagad, rocket, card, bank',
  })
  method: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;
}
