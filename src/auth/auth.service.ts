import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './../users/users.service';
import { CreateUserDto } from 'src/users/dto/createUser.dto';
import { LoginDto } from './dto/login.dto';

type JwtPayload = {
  sub: number;
  email: string;
  role: string;
  tenantSlug: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  createAdmin(dto: CreateUserDto) {
    return this.usersService.createSuperAdmin(dto);
  }

  async userLogin(dto: LoginDto) {
    const user = await this.usersService.findOne(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account is deactivated');
    }

    // // bcrypt password check (IMPORTANT)
    // const isPasswordMatch = await bcrypt.compare(dto.password, user.password);

    if (dto.password !== user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateTokens(user);
  }

  // ─────────────────────────────────────────────
  // TOKEN GENERATION
  // ─────────────────────────────────────────────
  generateTokens(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantSlug: user.tenantSlug ?? '',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: Number(process.env.JWT_EXPIRES_IN) ?? 15 * 60,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN) ?? 7 * 60 * 60,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantSlug: user.tenantSlug ?? null,
      },
    };
  }
}
