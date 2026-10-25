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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import {
  ALL_TENANT_ROLES,
  MANAGER_AND_UP,
} from 'src/common/constants/roles.constants';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

@Controller('suppliers')
@Roles(...ALL_TENANT_ROLES)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.suppliersService.findAll(user.tenantId);
  }

  @Post()
  @Roles(...MANAGER_AND_UP)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(user.tenantId, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.suppliersService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(...MANAGER_AND_UP)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(...MANAGER_AND_UP)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.suppliersService.remove(user.tenantId, id);
  }
}
