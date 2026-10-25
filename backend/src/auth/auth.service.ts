import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { UsersService } from './../users/users.service';
import { CreateUserDto } from 'src/users/dto/createUser.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from 'src/users/entities/user.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { Warehouse } from 'src/inventory/entities/warehouse.entity';
import { UserRole } from 'src/users/enums/userRole.enum';
import { TenantPlan } from 'src/tenants/enums/tenantPlan.enum';
import { TenantStatus } from 'src/tenants/enums/tenantStatus.enum';
import { MailService } from 'src/notifications/mail.service';

// What we put inside the JWT token
export type JwtPayload = {
  sub: string; // user id
  email: string;
  role: UserRole;
  tenantId: string;
  tenantSlug: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  createAdmin(dto: CreateUserDto) {
    return this.usersService.createSuperAdmin(dto);
  }

  // ─────────────────────────────────────────────
  // REGISTER: new company + owner account
  // ─────────────────────────────────────────────
  async register(dto: RegisterDto) {
    // 1. email must be new
    const exists = await this.usersService.findOne(dto.email);
    if (exists) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.usersService.hashPassword(dto.password);

    // 2. we save into 3 tables (tenants, warehouses, users).
    //    A transaction means: if one save fails, NOTHING is saved.
    const owner = await this.dataSource.transaction(async (manager) => {
      const tenant = await manager.save(
        manager.create(Tenant, {
          name: dto.companyName,
          slug: this.makeSlug(dto.companyName),
          plan: TenantPlan.STARTER,
        }),
      );

      // every company starts with one warehouse
      await manager.save(
        manager.create(Warehouse, {
          tenantId: tenant.id,
          name: 'Main Warehouse',
          isDefault: true,
        }),
      );

      return manager.save(
        manager.create(User, {
          tenantId: tenant.id,
          fullName: dto.fullName,
          email: dto.email,
          passwordHash,
          role: UserRole.BUSINESS_ADMIN,
        }),
      );
    });

    // 3. welcome email (does nothing if mail is not configured)
    void this.mailService.send(
      owner.email,
      'Welcome to SME Inventory',
      `Hi ${owner.fullName}, your company "${dto.companyName}" is ready. You can log in now.`,
    );

    return {
      message: 'Registration successful',
      data: {
        tenantId: owner.tenantId,
        userId: owner.id,
        email: owner.email,
        role: owner.role,
      },
    };
  }

  // ─────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────
  async userLogin(dto: LoginDto) {
    const user = await this.usersService.findOne(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // bcrypt password check (IMPORTANT)
    const isPasswordMatch = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Your account has been deactivated. Contact admin.',
      );
    }

    // the super admin can suspend a whole shop -> nobody in it can log in
    this.checkShopIsActive(user);

    const tokens = await this.generateTokens(user);
    return { message: 'Login successful', data: tokens };
  }

  // ─────────────────────────────────────────────
  // REFRESH: old refresh token -> new pair of tokens
  // ─────────────────────────────────────────────
  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);

    // the token must be the SAME one we saved at login (rotation).
    // after logout the saved hash is null -> refresh fails.
    const isValid =
      user &&
      user.isActive &&
      user.refreshTokenHash === this.hashToken(refreshToken);

    if (!isValid) {
      throw new UnauthorizedException(
        'Refresh token is invalid or expired. Please log in again.',
      );
    }

    this.checkShopIsActive(user);

    const tokens = await this.generateTokens(user);
    return { message: 'Token refreshed', data: tokens };
  }

  async profile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async logout(userId: string) {
    await this.usersService.setRefreshToken(userId, null);
    return { message: 'Logged out successfully', data: null };
  }

  // ─────────────────────────────────────────────
  // TOKEN GENERATION
  // ─────────────────────────────────────────────
  async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId as string,
      tenantSlug: user.tenant?.slug ?? null,
    };

    // values in .env are in SECONDS (900 = 15 min)
    const accessExpires = Number(
      this.configService.get('JWT_EXPIRES_IN') ?? 15 * 60,
    );
    const refreshExpires = Number(
      this.configService.get('JWT_REFRESH_EXPIRES_IN') ?? 7 * 24 * 60 * 60,
    );

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: accessExpires,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpires,
      // a random id makes every refresh token unique, even 2 tokens
      // created in the same second -> the old one really stops working
      jwtid: randomUUID(),
    });

    // save a hash of the refresh token, so we can check it later
    await this.usersService.setRefreshToken(
      user.id,
      this.hashToken(refreshToken),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpires,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug ?? null,
        companyName: user.tenant?.name ?? null,
      },
    };
  }

  // super admin has no shop (tenant), so only check users that have one
  private checkShopIsActive(user: User) {
    if (user.tenant && user.tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException(
        'Your shop account is suspended. Contact the platform admin.',
      );
    }
  }

  // sha256 hash. (bcrypt only reads the first 72 characters,
  // and JWT tokens are longer, so bcrypt is not good here)
  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  // "Rahim Traders" -> "rahim-traders-a1b2"
  private makeSlug(name: string) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `${base}-${randomBytes(2).toString('hex')}`;
  }
}
