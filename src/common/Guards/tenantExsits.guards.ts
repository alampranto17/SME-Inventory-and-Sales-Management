import { TenantsService } from './../../tenants/tenants.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
@Injectable()
export class TenantExsitsGuard implements CanActivate {
  constructor(private readonly tenantService: TenantsService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const slug = request.params.slug;

    // console.log('slug : ', slug);

    const tenant = this.tenantService.findOne(slug);

    // console.log('guard : ', tenant);

    if (!tenant) {
      throw new NotFoundException(`Tenant "${slug}" not found`);
    }
    request.tenant = tenant;

    return true;
  }
}
