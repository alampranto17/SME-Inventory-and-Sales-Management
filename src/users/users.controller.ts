import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard } from 'src/common/Guards/user-role.guards';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import { UserRole } from './enums/userRole.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  findAll() {
    return this.usersService.findAll();
  }
}
