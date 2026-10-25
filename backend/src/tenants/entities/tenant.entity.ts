import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantPlan } from '../enums/tenantPlan.enum';
import { TenantStatus } from '../enums/tenantStatus.enum';

// One tenant = one company that uses our SaaS.
// Table name: tenants
@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true, length: 255 })
  slug: string;

  @Column({ type: 'enum', enum: TenantPlan, default: TenantPlan.STARTER })
  plan: TenantPlan;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.ACTIVE })
  status: TenantStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
