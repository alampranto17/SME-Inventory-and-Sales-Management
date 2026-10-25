import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { MovementType } from '../enums/movementType.enum';

// Audit log. Every time stock changes we save one row here.
// We NEVER update or delete rows in this table.
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  // only used for TRANSFER
  @Column({ name: 'to_warehouse_id', type: 'uuid', nullable: true })
  toWarehouseId: string | null;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  // positive = stock added, negative = stock removed
  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  // id of the order / purchase order that caused this movement
  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
