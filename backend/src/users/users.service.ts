import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { TenantsService } from 'src/tenants/tenants.service';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdatedUserDto } from './dto/updateUser.dto';
import { UserRole } from './enums/userRole.enum';
import { User } from './entities/user.entity';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

// bcrypt "salt rounds" -> higher = safer but slower. 12 is the plan's rule.
const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly tenantService: TenantsService,
  ) {}

  // turn "MyPass@1" into a hash like "$2a$12$...."
  hashPassword(password: string) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async createSuperAdmin(dto: CreateUserDto) {
    const superAdminExists = await this.userRepo.exists({
      where: { role: UserRole.SUPER_ADMIN },
    });

    if (superAdminExists) {
      if (!dto.secretKey) {
        throw new ForbiddenException(
          'Secret key is required to create another super admin',
        );
      }
      if (dto.secretKey !== process.env.SUPER_ADMIN_SECRET) {
        throw new ForbiddenException('Invalid secret key');
      }
    }

    await this.checkEmailIsFree(dto.email);

    const user = this.userRepo.create({
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone ?? null,
      role: UserRole.SUPER_ADMIN,
      passwordHash: await this.hashPassword(dto.password),
      tenantId: null,
      isActive: true,
    });

    return this.userRepo.save(user);
  }

  // super admin sees all users, others see only their company users
  findAll(currentUser: AuthUser) {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return this.userRepo.find({ order: { createdAt: 'DESC' } });
    }

    return this.userRepo.find({
      where: { tenantId: currentUser.tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  // used by login -> find by email (with the tenant, to get the slug)
  findOne(email: string) {
    return this.userRepo.findOne({
      where: { email },
      relations: { tenant: true },
    });
  }

  findById(id: string) {
    return this.userRepo.findOne({
      where: { id },
      relations: { tenant: true },
    });
  }

  // super admin creates the first owner (business admin) of a company
  async createOwner(dto: CreateUserDto) {
    if (!dto.tenantSlug) {
      throw new BadRequestException('Tenant Slug must need to create');
    }

    // throws error if the tenant does not exist
    const tenant = await this.tenantService.findOne(dto.tenantSlug);

    await this.checkEmailIsFree(dto.email);

    const newUser = this.userRepo.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash: await this.hashPassword(dto.password),
      role: UserRole.BUSINESS_ADMIN,
      tenantId: tenant.id,
      isActive: true,
    });

    return this.userRepo.save(newUser);
  }

  // business admin creates manager / staff inside HIS company
  async createUser(currentUser: AuthUser, dto: CreateUserDto) {
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'You are not allow to create super admin role',
      );
    }

    await this.checkEmailIsFree(dto.email);

    const newUser = this.userRepo.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash: await this.hashPassword(dto.password),
      role: dto.role ?? UserRole.SALES_STAFF,
      // tenant always comes from the token, never from the body
      tenantId: currentUser.tenantId,
      isActive: true,
    });

    return this.userRepo.save(newUser);
  }

  async updateUser(currentUser: AuthUser, id: string, dto: UpdatedUserDto) {
    const user = await this.findUserInMyCompany(currentUser, id);

    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You can not make someone super admin');
    }

    if (dto.email && dto.email !== user.email) {
      await this.checkEmailIsFree(dto.email);
      user.email = dto.email;
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) user.passwordHash = await this.hashPassword(dto.password);

    const saved = await this.userRepo.save(user);
    return { message: 'User updated successfully', data: saved };
  }

  // we never hard delete users, we just turn them off
  async deactivateUser(currentUser: AuthUser, id: string) {
    if (currentUser.id === id) {
      throw new BadRequestException('You can not deactivate yourself');
    }

    const user = await this.findUserInMyCompany(currentUser, id);
    user.isActive = false;
    user.refreshTokenHash = null;
    await this.userRepo.save(user);

    return { message: 'User deactivated successfully', data: user };
  }

  // save (or clear) the refresh token hash -> used by login / logout
  async setRefreshToken(userId: string, refreshTokenHash: string | null) {
    await this.userRepo.update({ id: userId }, { refreshTokenHash });
  }

  // used by notifications: "send to all managers + owner of this company"
  findByRoles(tenantId: string, roles: UserRole[]) {
    return this.userRepo.find({
      where: { tenantId, role: In(roles), isActive: true },
    });
  }

  // ─────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────
  private async checkEmailIsFree(email: string) {
    const exist = await this.userRepo.exists({ where: { email } });
    if (exist) {
      throw new BadRequestException(`Email "${email}" already exists`);
    }
  }

  private async findUserInMyCompany(currentUser: AuthUser, id: string) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
    if (!isSuperAdmin && user.tenantId !== currentUser.tenantId) {
      // same message as "not found" -> don't tell others it exists
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
