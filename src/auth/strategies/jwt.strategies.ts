// src/auth/strategies/jwt.strategy.ts

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/users/enums/userRole.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: any) {
    // if/else আলাদা করো — object এর বাইরে
    const tenantSlug =
      payload.role === UserRole.SUPER_ADMIN ? null : payload.tenantSlug;

    return {
      email: payload.email,
      role: payload.role,
      tenantSlug: tenantSlug,
    };
  }
}
