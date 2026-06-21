import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTenantsDto } from './dto/createTenants.dto';
import { UpdateTenantDto } from './dto/updateTenants.dto';
import { TenantStatus } from './enums/tenantStatus.enum';

@Injectable()
export class TenantsService {
  private tenants = [
    {
      id: 1,
      name: 'Default Company',
      slug: 'default-company',
      plan: 'GROWTH',
      status: 'ACTIVE',
    },
    {
      id: 2,
      name: 'Admin Tenant',
      slug: 'admin-tenant',
      plan: 'STARTER',
      status: 'ACTIVE',
    },
  ];
  createTenants(dto: CreateTenantsDto): object {
    // 0. if slug is exists then you can create tenants;
    const exists = this.tenants.find((t) => t.slug === dto.slug);

    if (exists) {
      throw new BadRequestException('Slug must be unique');
    }

    // 1. modify dto adding id;
    const id = this.tenants.length + 1;
    const tenant = {
      id: id,
      ...dto,
      status: TenantStatus.ACTIVE,
    };

    // adding temporary in-memory

    this.tenants.push(tenant);

    return tenant;
  }

  findAll() {
    return this.tenants;
  }
  findOne(slug: string) {
    const tenant = this.tenants.find((t) => t.slug === slug);

    if (!tenant) {
      throw new BadRequestException(`Tenant "${slug}" not found`);
    }

    return tenant;
  }

  update(slug: string, dto: UpdateTenantDto) {
    const index = this.tenants.findIndex((t) => t.slug === slug);

    console.log('index : ', index);

    if (index === -1) {
      throw new BadRequestException(`Tenant "${slug}" not found`);
    }

    this.tenants[index] = {
      ...this.tenants[index],
      ...dto,
    };

    return this.tenants[index];
  }

  suspend(slug: string) {
    const index = this.tenants.findIndex((t) => t.slug === slug);
    if (index === -1) {
      throw new BadRequestException(`Tenants "${slug} not found"`);
    }

    this.tenants[index] = {
      ...this.tenants[index],
      status: TenantStatus.SUSPENDED,
    };

    return this.tenants[index];
  }

  delete(slug: string) {
    const index = this.tenants.findIndex((t) => t.slug === slug);
    if (index === -1) {
      throw new BadRequestException(`Tenants "${slug}" not found`);
    }
    const deletedTenant = this.tenants.filter((t) => t.slug === slug);

    this.tenants = this.tenants.filter((t) => t.slug !== slug);

    return {
      message: 'Deleted successfully',
      data: deletedTenant,
    };
  }
}
