import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { PaymentMethod, PaymentStatus } from '../enums/payment.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // copied from the order, makes the customer ledger query easy
  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  // bKash / Nagad transaction id, card slip number ...
  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.COMPLETED,
  })
  status: PaymentStatus;

  @CreateDateColumn({ name: 'paid_at' })
  paidAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
