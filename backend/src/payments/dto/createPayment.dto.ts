import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../enums/payment.enum';

export class CreatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'amount must be a positive number' })
  amount: number;

  @IsEnum(PaymentMethod, {
    message: 'method must be one of: cash, bkash, nagad, card, bank',
  })
  method: PaymentMethod;

  // bKash / Nagad transaction number etc.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;
}
