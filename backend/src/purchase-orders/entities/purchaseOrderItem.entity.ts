import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchaseOrder.entity';
import { Product } from 'src/products/entities/product.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  // how many actually arrived (can be less than quantity)
  @Column({ name: 'received_qty', type: 'int', default: 0 })
  receivedQty: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 2 })
  unitCost: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: string;
}
