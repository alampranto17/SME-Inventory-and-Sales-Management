import { TenantsService } from './../../tenants/tenants.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from 'src/users/enums/userRole.enum';

@Injectable()
export class TenantExsitsGuard implements CanActivate {
  constructor(private readonly tenantService: TenantsService) {}

  // async because we now read the tenant from the database
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug = request.params.slug;
    const user = request.user;

    // findOne throws an error if tenant is not found
    const tenant = await this.tenantService.findOne(slug);

    // a business admin can only see HIS OWN company.
    // super admin can see every company.
    if (user.role !== UserRole.SUPER_ADMIN && user.tenantId !== tenant.id) {
      throw new ForbiddenException('You can only access your own company');
    }

    request.tenant = tenant;

    return true;
  }
}
