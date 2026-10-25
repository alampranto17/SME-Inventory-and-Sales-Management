import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from 'src/categories/entities/category.entity';

// SKU must be unique inside one company (two companies can use the same SKU)
@Entity('products')
@Unique(['tenantId', 'sku'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100 })
  sku: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode: string | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  // decimal columns come back from postgres as STRING ("85.00")
  // use Number(product.costPrice) when you need to do math
  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2 })
  costPrice: string;

  @Column({ name: 'selling_price', type: 'decimal', precision: 10, scale: 2 })
  sellingPrice: string;

  @Column({ name: 'reorder_level', type: 'int', default: 0 })
  reorderLevel: number;

  @Column({ length: 50, default: 'pcs' })
  unit: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
