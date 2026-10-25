"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { usePusherEvent } from "@/hooks/usePusherEvent";
import { PUSHER_EVENTS, tenantChannel } from "@/lib/pusher";
import { formatDate, formatMoney } from "@/lib/format";
import {
  Badge, Button, Card, Empty, ErrorBox, Input, Loading, PageHeader, Pagination, Select,
  tableClass, tdClass, thClass,
} from "@/components/ui";
import type { OrderListItem, Paginated } from "@/lib/types";

const LIMIT = 15;

export default function OrdersPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useFetch<Paginated<OrderListItem>>("/orders", {
    status: status || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: LIMIT,
  });

  // REALTIME: new or changed order anywhere in the company -> refresh list
  usePusherEvent(tenantChannel(user), PUSHER_EVENTS.ORDER_CREATED, () => reload());
  usePusherEvent(tenantChannel(user), PUSHER_EVENTS.ORDER_UPDATED, () => reload());

  return (
    <div>
      <PageHeader title="Orders" subtitle="All sales of your company.">
        <Link href="/pos"><Button>+ New sale</Button></Link>
      </PageHeader>

      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </div>

        <ErrorBox message={error} />

        {loading && !data ? (
          <Loading />
        ) : data?.items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Order</th>
                    <th className={thClass}>Customer</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Total</th>
                    <th className={thClass}>Paid</th>
                    <th className={thClass}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o) => (
                    <tr key={o.id}>
                      <td className={tdClass}>
                        <Link href={`/orders/${o.id}`} className="font-medium text-indigo-600 hover:underline">{o.orderNumber}</Link>
                      </td>
                      <td className={tdClass}>{o.customerName}</td>
                      <td className={tdClass}><Badge value={o.status} /></td>
                      <td className={tdClass}>{formatMoney(o.total)}</td>
                      <td className={tdClass}>{formatMoney(o.paidAmount)}</td>
                      <td className={tdClass}>{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} limit={LIMIT} total={data.total} onChange={setPage} />
          </>
        ) : (
          <Empty text="No orders found." />
        )}
      </Card>
    </div>
  );
}
