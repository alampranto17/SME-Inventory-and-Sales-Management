// ─────────────────────────────────────────────
// PUSHER (realtime) — frontend side
// ─────────────────────────────────────────────
// How it works:
//
//   Backend:   pusher.trigger("private-tenant-123", "order-created", data)
//                        │
//                        ▼
//               Pusher cloud server
//                        │
//                        ▼
//   Frontend:  channel = pusher.subscribe("private-tenant-123")
//              channel.bind("order-created", (data) => { ...update the UI })
//
// We use 2 channels:
//   private-tenant-{tenantId} -> everyone in the company (orders, stock)
//   private-user-{userId}     -> only me (my notifications)
//
// Channels that start with "private-" need permission.
// pusher-js asks our backend automatically:
//   POST {API_URL}/pusher/auth   (with our JWT token)
// and the backend says "yes" only for YOUR company / YOUR user.
// ─────────────────────────────────────────────
import Pusher from "pusher-js";
import { API_URL } from "./api";
import { getAccessToken } from "./authStorage";
import type { User } from "./types";

// Same event names as backend/src/pusher/pusher.service.ts
export const PUSHER_EVENTS = {
  ORDER_CREATED: "order-created",
  ORDER_UPDATED: "order-updated",
  STOCK_UPDATED: "stock-updated",
  PAYMENT_RECEIVED: "payment-received",
  NEW_NOTIFICATION: "new-notification",
};

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "ap2";

// We keep ONE connection for the whole app (a "singleton").
let pusher: Pusher | null = null;

export function isPusherEnabled() {
  return Boolean(PUSHER_KEY);
}

export function getPusher(): Pusher | null {
  // no key in .env.local -> realtime is off, app still works
  if (!PUSHER_KEY) return null;

  // already connected -> reuse it
  if (pusher) return pusher;

  pusher = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    // where pusher-js asks for permission to join private channels
    channelAuthorization: {
      endpoint: `${API_URL}/pusher/auth`,
      transport: "ajax",
      // send our JWT so the backend knows who we are.
      // (a function, so it always uses the newest token)
      headersProvider: () => ({
        Authorization: `Bearer ${getAccessToken()}`,
      }),
    },
  });

  return pusher;
}

// call on logout
export function disconnectPusher() {
  if (pusher) {
    pusher.disconnect();
    pusher = null;
  }
}

// channel name helpers (must match the backend)
export function tenantChannel(user: User | null) {
  return user?.tenantId ? `private-tenant-${user.tenantId}` : null;
}

export function userChannel(user: User | null) {
  return user ? `private-user-${user.id}` : null;
}
