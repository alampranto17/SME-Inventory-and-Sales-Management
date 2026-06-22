import { CreateUserDto } from 'src/users/dto/createUser.dto';
import { AuthService } from './auth.service';
import { Body, Controller, Post } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/super-admin')
  createAdmin(@Body() dto: CreateUserDto) {
    return this.authService.createAdmin(dto);
  }

  @Post('Login')
  userLogin(@Body() dto: LoginDto) {
    return this.authService.userLogin(dto);
  }
}
