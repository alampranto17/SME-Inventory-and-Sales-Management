import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/createCategory.dto';
import { UpdateCategoryDto } from './dto/updateCategory.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import {
  ALL_TENANT_ROLES,
  MANAGER_AND_UP,
} from 'src/common/constants/roles.constants';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

// @Roles on the class = default for every route.
// @Roles on a method overrides it for that route.
@Controller('categories')
@Roles(...ALL_TENANT_ROLES)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.categoriesService.findAll(user.tenantId);
  }

  @Post()
  @Roles(...MANAGER_AND_UP)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @Roles(...MANAGER_AND_UP)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(...MANAGER_AND_UP)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.remove(user.tenantId, id);
  }
}
