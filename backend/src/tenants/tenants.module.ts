import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { Tenant } from './entities/tenant.entity';

@Module({
  // forFeature -> lets this module use @InjectRepository(Tenant)
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenantsService],
  controllers: [TenantsController],
  exports: [TenantsService],
})
export class TenantsModule {}
