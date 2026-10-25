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
import { UsersService } from './users.service';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import { UserRole } from './enums/userRole.enum';
import { CreateUserDto } from './dto/createUser.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpdatedUserDto } from './dto/updateUser.dto';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

// RolesGuard is global (main.ts) so @Roles() is enough here
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  findAll(@CurrentUser() user: AuthUser) {
    return this.usersService.findAll(user);
  }

  // super admin -> create the owner of a company (needs tenantSlug in body)
  @Post('create-buisness-Owner')
  @Roles(UserRole.SUPER_ADMIN)
  createOwner(@Body() dto: CreateUserDto) {
    return this.usersService.createOwner(dto);
  }

  // owner -> create manager / staff for his own company
  @Post()
  @Roles(UserRole.BUSINESS_ADMIN)
  createUser(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  updateUser(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatedUserDto,
  ) {
    return this.usersService.updateUser(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  deactivateUser(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.deactivateUser(user, id);
  }
}
