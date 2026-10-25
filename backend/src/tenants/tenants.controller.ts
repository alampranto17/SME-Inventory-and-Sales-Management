import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantsDto } from './dto/createTenants.dto';
import { UpdateTenantDto } from './dto/updateTenants.dto';
import { CreateShopDto } from './dto/createShop.dto';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import { UserRole } from 'src/users/enums/userRole.enum';

// JwtAuthGuard + RolesGuard are global (see main.ts), so we only need @Roles
@Controller('tenants')
@Roles(UserRole.SUPER_ADMIN)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('create')
  createTenants(@Body() dto: CreateTenantsDto) {
    return this.tenantsService.createTenants(dto);
  }

  // shop + owner account in one step (used by the "Add shop" form)
  @Post('create-with-owner')
  createShopWithOwner(@Body() dto: CreateShopDto) {
    return this.tenantsService.createShopWithOwner(dto);
  }

  @Get()
  findAll() {
    return this.tenantsService.findAllWithOwners();
  }
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.tenantsService.findOne(slug);
  }

  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(slug, dto);
  }

  @Post(':slug/suspend')
  suspend(@Param('slug') slug: string) {
    return this.tenantsService.suspend(slug);
  }

  @Delete(':slug')
  delete(@Param('slug') slug: string) {
    return this.tenantsService.delete(slug);
  }
}
