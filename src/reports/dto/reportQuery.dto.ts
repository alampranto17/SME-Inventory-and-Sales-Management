import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

// ?dateFrom=2026-06-01&dateTo=2026-06-30
export class DateRangeDto {
  @IsDateString({}, { message: 'dateFrom and dateTo are required' })
  dateFrom: string;

  @IsDateString({}, { message: 'dateFrom and dateTo are required' })
  dateTo: string;
}

// ...&groupBy=day
export class SalesSummaryQueryDto extends DateRangeDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month' = 'day';
}

// ...&limit=10
export class TopProductsQueryDto extends DateRangeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
