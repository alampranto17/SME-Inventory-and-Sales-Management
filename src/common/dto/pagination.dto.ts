import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Reusable ?page=1&limit=20 query params.
// Other query DTOs can "extends PaginationDto" to get these two fields.
export class PaginationDto {
  @IsOptional()
  @Type(() => Number) // query params come as string, convert to number
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
