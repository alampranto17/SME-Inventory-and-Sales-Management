import { Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/createUser.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('createSuperAdmin')
  createSuperAdmin(dto: CreateUserDto) {
    return this.usersService.createSuperAdmin(dto);
  }
}
