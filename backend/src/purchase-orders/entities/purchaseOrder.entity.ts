import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { PurchaseOrderStatus } from '../enums/purchaseOrderStatus.enum';
import { PurchaseOrderItem } from './purchaseOrderItem.entity';

// A purchase order (PO) = we are BUYING stock from a supplier.
@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'po_number', length: 50 })
  poNumber: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  // stock goes into this warehouse when received
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
  })
  status: PurchaseOrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'received_at', type: 'timestamp', nullable: true })
  receivedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, {
    cascade: true,
  })
  items: PurchaseOrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
