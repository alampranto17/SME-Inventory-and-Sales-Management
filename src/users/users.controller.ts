import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/createUser.dto';
import { RolesGuard } from 'src/common/Guards/user-role.guards';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import { UserRole } from './enums/userRole.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('createsuperadmin')
  createSuperAdmin(@Body() dto: CreateUserDto) {
    return this.usersService.createSuperAdmin(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  findAll() {
    return this.usersService.findAll();
  }
}
