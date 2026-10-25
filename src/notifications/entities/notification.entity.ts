import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationType } from '../enums/notificationType.enum';

// In-app notification. Each row belongs to ONE user.
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  // frontend page to open when the user clicks it, e.g. /products/123
  @Column({ type: 'varchar', length: 255, nullable: true })
  link: string | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
