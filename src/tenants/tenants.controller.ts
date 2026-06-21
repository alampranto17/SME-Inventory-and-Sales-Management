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

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('create')
  createTenants(@Body() dto: CreateTenantsDto) {
    return { data: this.tenantsService.createTenants(dto) };
  }

  @Get()
  findAll() {
    return { data: this.tenantsService.findAll() };
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
