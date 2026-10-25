import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { productImageOptions } from './productImage.upload';
import { CreateProductDto } from './dto/createProduct.dto';
import { UpdateProductDto } from './dto/updateProduct.dto';
import { ProductQueryDto } from './dto/productQuery.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import {
  ALL_TENANT_ROLES,
  MANAGER_AND_UP,
  OWNER_ONLY,
} from 'src/common/constants/roles.constants';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

const TEN_MB = 10 * 1024 * 1024;

@Controller('products')
@Roles(...ALL_TENANT_ROLES)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ProductQueryDto) {
    return this.productsService.findAll(user.tenantId, query);
  }

  @Post()
  @Roles(...MANAGER_AND_UP)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(user, dto);
  }

  // fixed routes BEFORE ':id'
  @Get('low-stock')
  findLowStock(@CurrentUser() user: AuthUser) {
    return this.productsService.findLowStock(user.tenantId);
  }

  // form-data with a field called "file"
  @Post('bulk-import')
  @Roles(...MANAGER_AND_UP)
  @UseInterceptors(FileInterceptor('file'))
  bulkImport(
    @CurrentUser() user: AuthUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: TEN_MB })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.productsService.bulkImport(user, file);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(...MANAGER_AND_UP)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user.tenantId, id, dto);
  }

  // form-data with a field called "image" (jpg / png / webp, max 5 MB)
  @Post(':id/image')
  @Roles(...MANAGER_AND_UP)
  @UseInterceptors(FileInterceptor('image', productImageOptions))
  uploadImage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.uploadImage(user.tenantId, id, file);
  }

  @Delete(':id/image')
  @Roles(...MANAGER_AND_UP)
  removeImage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.removeImage(user.tenantId, id);
  }

  @Delete(':id')
  @Roles(...OWNER_ONLY)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.remove(user.tenantId, id);
  }
}
