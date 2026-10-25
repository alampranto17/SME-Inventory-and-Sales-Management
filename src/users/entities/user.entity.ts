import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/userRole.enum';
import { Tenant } from 'src/tenants/entities/tenant.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // super admin has no company, so tenantId can be null
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  // @Exclude() = never send this field in an API response
  @Exclude()
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Exclude()
  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    nullable: true,
  })
  refreshTokenHash: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.SALES_STAFF })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
