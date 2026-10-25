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
import { Customer } from 'src/customers/entities/customer.entity';
import { OrderStatus } from '../enums/orderStatus.enum';
import { OrderItem } from './orderItem.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  // human friendly number like ORD-0042
  @Column({ name: 'order_number', length: 50 })
  orderNumber: string;

  // null = walk-in customer
  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  // stock is taken from this warehouse
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.CONFIRMED })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: string;

  // how much has been paid so far (see payments module)
  @Column({
    name: 'paid_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  paidAmount: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  // cascade: true -> when we save an order, its items are saved too
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
