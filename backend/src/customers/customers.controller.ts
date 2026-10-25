import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  CustomerQueryDto,
  UpdateCustomerDto,
} from './dto/customer.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import {
  ALL_TENANT_ROLES,
  MANAGER_AND_UP,
} from 'src/common/constants/roles.constants';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

@Controller('customers')
@Roles(...ALL_TENANT_ROLES)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: CustomerQueryDto) {
    return this.customersService.findAll(user.tenantId, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user.tenantId, dto);
  }

  @Get(':id/ledger')
  @Roles(...MANAGER_AND_UP)
  ledger(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customersService.ledger(user.tenantId, id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customersService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user.tenantId, id, dto);
  }
}
