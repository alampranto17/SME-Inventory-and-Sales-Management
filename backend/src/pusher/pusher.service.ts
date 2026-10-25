import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';

// ─────────────────────────────────────────────
// HOW PUSHER WORKS (simple version)
// ─────────────────────────────────────────────
// 1. Backend "triggers" an event on a channel:
//      pusher.trigger('private-tenant-123', 'order-created', { ... })
// 2. Pusher's server sends it to every browser that "subscribed"
//    to that channel.
// 3. Frontend (pusher-js) listens:
//      channel.bind('order-created', (data) => { ... })
//
// We use 2 kinds of channels:
//   private-tenant-{tenantId}  -> everyone in the same company
//   private-user-{userId}      -> only one user (notifications)
//
// "private-" channels need permission. pusher-js asks our backend
// POST /api/v1/pusher/auth  and we say yes/no. (see pusher.controller.ts)
// ─────────────────────────────────────────────

// All event names in one place, so frontend + backend use the same text
export const PUSHER_EVENTS = {
  ORDER_CREATED: 'order-created',
  ORDER_UPDATED: 'order-updated',
  STOCK_UPDATED: 'stock-updated',
  PAYMENT_RECEIVED: 'payment-received',
  NEW_NOTIFICATION: 'new-notification',
};

@Injectable()
export class PusherService {
  private readonly logger = new Logger(PusherService.name);
  private pusher: Pusher | null = null;

  constructor(private readonly configService: ConfigService) {
    const appId = this.configService.get<string>('PUSHER_APP_ID');
    const key = this.configService.get<string>('PUSHER_KEY');
    const secret = this.configService.get<string>('PUSHER_SECRET');
    const cluster = this.configService.get<string>('PUSHER_CLUSTER') ?? 'ap2';

    // If keys are missing the app still works, just without realtime.
    if (!appId || !key || !secret) {
      this.logger.warn('Pusher keys not found in .env -> realtime is OFF');
      return;
    }

    this.pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
    this.logger.log('Pusher connected');
  }

  // channel name helpers
  tenantChannel(tenantId: string) {
    return `private-tenant-${tenantId}`;
  }

  userChannel(userId: string) {
    return `private-user-${userId}`;
  }

  // Send an event. We never "await" this in services -> a Pusher
  // problem should never break an order or a payment.
  async trigger(channel: string, event: string, data: any) {
    if (!this.pusher) return;

    try {
      await this.pusher.trigger(channel, event, data);
    } catch (error) {
      this.logger.error(`Pusher trigger failed: ${error.message}`);
    }
  }

  // shortcut: send to everyone in a company
  sendToTenant(tenantId: string, event: string, data: any) {
    return this.trigger(this.tenantChannel(tenantId), event, data);
  }

  // shortcut: send to one user
  sendToUser(userId: string, event: string, data: any) {
    return this.trigger(this.userChannel(userId), event, data);
  }

  // Used by POST /pusher/auth to give a browser permission
  // to listen to a private channel.
  authorizeChannel(socketId: string, channel: string) {
    if (!this.pusher) return null;
    return this.pusher.authorizeChannel(socketId, channel);
  }
}
