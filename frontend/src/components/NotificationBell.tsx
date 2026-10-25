"use client";

// 🔔 The bell in the top bar.
// 1. loads my notifications from the API
// 2. listens on MY Pusher channel -> a new notification appears instantly
// 3. shows a small popup ("toast") for 5 seconds when one arrives
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { usePusherEvent } from "@/hooks/usePusherEvent";
import { PUSHER_EVENTS, userChannel } from "@/lib/pusher";
import { formatDate } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

type NotificationsResponse = { unreadCount: number; items: AppNotification[] };

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. first load
  useEffect(() => {
    apiGet<NotificationsResponse>("/notifications")
      .then((data) => {
        setItems(data.items);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {});
  }, []);

  // 2. REALTIME: backend sends "new-notification" to private-user-{myId}
  usePusherEvent<AppNotification>(
    userChannel(user),
    PUSHER_EVENTS.NEW_NOTIFICATION,
    (notification) => {
      setItems((old) => [notification, ...old]); // add on top
      setUnreadCount((count) => count + 1);

      // 3. show toast, hide it after 5 seconds
      setToast(notification);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 5000);
    },
  );

  async function openNotification(notification: AppNotification) {
    if (!notification.isRead) {
      await apiPatch(`/notifications/${notification.id}/read`);
      setItems((old) =>
        old.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setOpen(false);
    setToast(null);
    if (notification.link) router.push(notification.link);
  }

  async function markAllRead() {
    await apiPatch("/notifications/read-all");
    setItems((old) => old.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* dropdown list */}
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="p-4 text-center text-sm text-slate-500">No notifications</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                className={`block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50 ${n.isRead ? "" : "bg-indigo-50/60"}`}
              >
                <p className="text-sm font-medium text-slate-800">{n.title}</p>
                <p className="text-xs text-slate-600">{n.message}</p>
                <p className="mt-1 text-[11px] text-slate-400">{formatDate(n.createdAt)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* toast popup in the bottom-right corner */}
      {toast && (
        <button
          onClick={() => openNotification(toast)}
          className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xl"
        >
          <p className="text-sm font-semibold text-slate-900">🔔 {toast.title}</p>
          <p className="mt-1 text-xs text-slate-600">{toast.message}</p>
        </button>
      )}
    </div>
  );
}
