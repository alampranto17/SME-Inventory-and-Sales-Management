import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategies';
import { JWTRefreshStrategry } from './strategies/jwtRefresh.strategies';
import { PassportModule } from '@nestjs/passport';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    UsersModule,
    NotificationsModule, // for MailService (welcome email)
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // secret + expiry are passed in auth.service when we sign
    JwtModule.register({}),
  ],
  providers: [AuthService, JwtStrategy, JWTRefreshStrategry],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
