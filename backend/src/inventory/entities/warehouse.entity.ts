import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// A place where stock is kept (shop, godown, warehouse ...)
// Every company gets one "Main Warehouse" when it registers.
@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  // the default warehouse is used when you don't pick one (POS sales)
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
