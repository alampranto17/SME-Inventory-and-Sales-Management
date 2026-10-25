import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('customers')
@Unique(['tenantId', 'phone'])
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  // how much money the customer still owes us
  // + when they buy, - when they pay
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
