import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from 'src/users/enums/userRole.enum';

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
    });
  }

  async validate(payload: any) {
    const tenantSlug =
      payload.role === UserRole.SUPER_ADMIN ? null : payload.tenantSlug;

    return {
      email: payload.email,
      role: payload.role,
      tenantSlug: tenantSlug,
    };
  }
}
