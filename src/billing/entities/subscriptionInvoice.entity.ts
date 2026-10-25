import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { TenantPlan } from 'src/tenants/enums/tenantPlan.enum';
import { InvoiceStatus } from '../enums/invoiceStatus.enum';

// One row = the monthly software bill of ONE shop for ONE month.
// Example: "Rahim Traders, 2026-10, GROWTH plan, 7999 BDT, unpaid"
//
// @Unique -> a shop can never get 2 bills for the same month
@Entity('subscription_invoices')
@Unique(['tenantId', 'month'])
export class SubscriptionInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // "2026-10"  (year-month)
  @Index()
  @Column({ length: 7 })
  month: string;

  // we copy the plan + price, so old bills stay correct
  // even if the shop changes plan or prices change later
  @Column({ type: 'enum', enum: TenantPlan })
  plan: TenantPlan;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.UNPAID })
  status: InvoiceStatus;

  // last day to pay, e.g. "2026-10-10"
  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  // how the shop paid: bkash / nagad / bank ...
  @Column({ type: 'varchar', length: 50, nullable: true })
  method: string | null;

  // bKash transaction id, bank slip number ...
  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
