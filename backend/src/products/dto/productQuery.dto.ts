import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

// GET /products?search=rice&category=uuid&page=1&limit=20
export class ProductQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  category?: string;
}
