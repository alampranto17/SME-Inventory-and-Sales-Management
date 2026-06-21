import { Injectable } from '@nestjs/common';
import { TenantsService } from 'src/tenants/tenants.service';
import { CreateUserDto } from './dto/createUser.dto';

@Injectable()
export class UsersService {
  constructor(private readonly tenantService: TenantsService) {}

  createSuperAdmin(dto: CreateUserDto) {}
}
