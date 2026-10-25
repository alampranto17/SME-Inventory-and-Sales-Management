import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ length: 100 })
  name: string;

  // parentId lets us make sub-categories (Grains -> Basmati)
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
