import { CreateUserDto } from 'src/users/dto/createUser.dto';
import { AuthService } from './auth.service';
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './Guards/JwtRefresh.Auth.Guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decoretor';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

// 5 requests per minute on login / register (stops password guessing)
const AUTH_LIMIT = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/super-admin')
  @Public()
  createAdmin(@Body() dto: CreateUserDto) {
    return this.authService.createAdmin(dto);
  }

  // NOTE: there is no public "sign up" route on purpose.
  // Only the super admin creates shops + owners:
  //   POST /tenants/create-with-owner
  // (authService.register() is still used by the seed script)

  @Post('login')
  @Public()
  @Throttle(AUTH_LIMIT)
  @HttpCode(HttpStatus.OK)
  userLogin(@Body() dto: LoginDto) {
    return this.authService.userLogin(dto);
  }

  // @Public() skips the normal access-token guard,
  // then JwtRefreshGuard checks the REFRESH token instead.
  @Post('refresh')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  userRefresh(@CurrentUser() user: { id: string; refreshToken: string }) {
    return this.authService.refresh(user.id, user.refreshToken);
  }

  @Get('profile')
  profile(@CurrentUser() user: AuthUser) {
    return this.authService.profile(user.id);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: AuthUser) {
    return this.authService.logout(user.id);
  }
}
