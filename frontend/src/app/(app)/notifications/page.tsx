"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { usePusherEvent } from "@/hooks/usePusherEvent";
import { PUSHER_EVENTS, userChannel } from "@/lib/pusher";
import { apiPatch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Button, Card, Empty, Loading, PageHeader } from "@/components/ui";
import type { AppNotification } from "@/lib/types";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, loading, reload } = useFetch<{ unreadCount: number; items: AppNotification[] }>(
    "/notifications",
    { unreadOnly: unreadOnly || undefined },
  );

  // REALTIME: new notification -> show it in this list too
  usePusherEvent(userChannel(user), PUSHER_EVENTS.NEW_NOTIFICATION, () => reload());

  async function markRead(id: string) {
    await apiPatch(`/notifications/${id}/read`);
    reload();
  }

  async function markAllRead() {
    await apiPatch("/notifications/read-all");
    reload();
  }

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${data?.unreadCount ?? 0} unread`}>
        <Button variant="secondary" onClick={() => setUnreadOnly(!unreadOnly)}>
          {unreadOnly ? "Show all" : "Show unread only"}
        </Button>
        <Button onClick={markAllRead}>Mark all read</Button>
      </PageHeader>

      <Card>
        {loading && !data ? (
          <Loading />
        ) : data?.items.length ? (
          <ul className="divide-y divide-slate-100">
            {data.items.map((n) => (
              <li key={n.id} className={`flex items-start justify-between gap-4 py-3 ${n.isRead ? "" : "font-medium"}`}>
                <div>
                  <p className="text-sm text-slate-900">{n.isRead ? "" : "● "}{n.title}</p>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="text-xs text-slate-400">{formatDate(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-3 text-sm">
                  {n.link && <Link href={n.link} className="text-indigo-600 hover:underline">Open</Link>}
                  {!n.isRead && <button onClick={() => markRead(n.id)} className="text-slate-500 hover:underline">Mark read</button>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No notifications." />
        )}
      </Card>
    </div>
  );
}
