import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { Warehouse } from './warehouse.entity';

// One row = how many pieces of ONE product are in ONE warehouse.
@Entity('inventory')
@Unique(['productId', 'warehouseId'])
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ name: 'reserved_qty', type: 'int', default: 0 })
  reservedQty: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
