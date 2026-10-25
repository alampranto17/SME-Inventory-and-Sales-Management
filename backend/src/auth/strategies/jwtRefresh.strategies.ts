import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { JwtPayload } from '../auth.service';

// Same as JwtStrategy but checks the REFRESH token (different secret).
// Send it like: Authorization: Bearer <refreshToken>
@Injectable()
export class JWTRefreshStrategry extends PassportStrategy(
  Strategy,
  'Jwt_Refresh_Token',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') as string,
      passReqToCallback: true, // so we can read the raw token below
    });
  }

  validate(req: Request, payload: JwtPayload) {
    // we need the raw token to compare it with the one saved in the DB
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    return {
      id: payload.sub,
      refreshToken,
    };
  }
}
