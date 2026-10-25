// src/auth/strategies/jwt.strategy.ts

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  // whatever we return here becomes `request.user`
  // and you get it with @CurrentUser() in controllers
  validate(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      tenantSlug: payload.tenantSlug,
    };
  }
}
