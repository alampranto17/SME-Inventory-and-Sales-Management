import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notificationType.enum';
import { UsersService } from 'src/users/users.service';
import { PUSHER_EVENTS, PusherService } from 'src/pusher/pusher.service';
import { MailService } from './mail.service';
import { MANAGER_AND_UP } from 'src/common/constants/roles.constants';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { UserRole } from 'src/users/enums/userRole.enum';

// what you pass when you want to create a notification
export type NotificationInput = {
  tenantId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly usersService: UsersService,
    private readonly pusherService: PusherService,
    private readonly mailService: MailService,
  ) {}

  // ─────────────────────────────────────────────
  // CREATE (used by other services)
  // ─────────────────────────────────────────────

  // send one notification to ONE user
  async notifyUser(userId: string, input: NotificationInput) {
    // 1. save in database
    const notification = await this.notificationRepo.save(
      this.notificationRepo.create({
        ...input,
        userId,
        link: input.link ?? null,
      }),
    );

    // 2. push it to the user's browser in realtime (Pusher)
    void this.pusherService.sendToUser(
      userId,
      PUSHER_EVENTS.NEW_NOTIFICATION,
      notification,
    );

    return notification;
  }

  // send the same notification to every user with these roles
  async notifyRoles(
    tenantId: string,
    roles: UserRole[],
    input: Omit<NotificationInput, 'tenantId'>,
    alsoEmail = false,
  ) {
    const users = await this.usersService.findByRoles(tenantId, roles);

    for (const user of users) {
      await this.notifyUser(user.id, { ...input, tenantId });

      if (alsoEmail) {
        void this.mailService.send(user.email, input.title, input.message);
      }
    }
  }

  // called when stock goes below reorder level
  notifyLowStock(
    tenantId: string,
    product: { id: string; name: string; reorderLevel: number },
    currentStock: number,
  ) {
    return this.notifyRoles(
      tenantId,
      MANAGER_AND_UP,
      {
        type: NotificationType.LOW_STOCK,
        title: 'Low Stock Alert',
        message: `${product.name} is running low. Current stock: ${currentStock} (Threshold: ${product.reorderLevel})`,
        link: `/products/${product.id}`,
      },
      true, // also send email
    );
  }

  // ─────────────────────────────────────────────
  // API (GET /notifications, PATCH /notifications/:id/read)
  // ─────────────────────────────────────────────
  async findMine(user: AuthUser, unreadOnly = false) {
    const where = unreadOnly
      ? { userId: user.id, isRead: false }
      : { userId: user.id };

    const items = await this.notificationRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const unreadCount = await this.notificationRepo.count({
      where: { userId: user.id, isRead: false },
    });

    return { unreadCount, items };
  }

  async markRead(user: AuthUser, id: string) {
    // we search by id AND userId -> you can't read another user's notification
    const notification = await this.notificationRepo.findOne({
      where: { id, userId: user.id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    await this.notificationRepo.save(notification);

    return {
      message: 'Notification marked as read',
      data: { id: notification.id, isRead: true },
    };
  }

  async markAllRead(user: AuthUser) {
    await this.notificationRepo.update(
      { userId: user.id, isRead: false },
      { isRead: true },
    );
    return { message: 'All notifications marked as read', data: null };
  }
}
