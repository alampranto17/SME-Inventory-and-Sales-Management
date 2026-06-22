import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantsService } from 'src/tenants/tenants.service';
import { CreateUserDto } from './dto/createUser.dto';
import { User } from './interfaces/user.interface';
import { UserRole } from './enums/userRole.enum';
import { use } from 'passport';

@Injectable()
export class UsersService {
  private users: User[] = [];
  constructor(private readonly tenantService: TenantsService) {}

  createSuperAdmin(dto: CreateUserDto) {
    const superAdminExists = this.users.some(
      (u) => u.role === UserRole.SUPER_ADMIN,
    );

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

    const exists = this.users.find((u) => u.email === dto.email);
    if (exists) {
      throw new BadRequestException(`Email "${dto.email}" already exists`);
    }

    const user: User = {
      email: dto.email,
      fullName: dto.fullName,
      role: UserRole.SUPER_ADMIN,
      password: dto.password,
      isActive: true,
    };

    this.users.push(user);

    return user;
  }

  findAll(): User[] {
    return this.users;
  }
  findOne(email: string) {
    const user = this.users.find((t) => t.email === email);
    return user;
  }
}
