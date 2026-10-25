"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { usePusherEvent } from "@/hooks/usePusherEvent";
import { PUSHER_EVENTS, isPusherEnabled, tenantChannel } from "@/lib/pusher";
import { isManagerOrUp } from "@/lib/roles";
import { formatDate, formatMoney, toInputDate } from "@/lib/format";
import SalesTrendChart, { type SalesPoint } from "@/components/charts/SalesTrendChart";
import TopProductsChart, { type TopProduct } from "@/components/charts/TopProductsChart";
import StockLevelChart from "@/components/charts/StockLevelChart";
import { Badge, Card, Empty, Loading, PageHeader, tableClass, tdClass, thClass } from "@/components/ui";
import type { LowStockProduct, OrderListItem, Paginated, Product } from "@/lib/types";

type TodaySummary = {
  date: string;
  orderCount: number;
  totalRevenue: string;
  totalProfit: string;
};

// one line in the "Live activity" box
type Activity = { id: number; text: string; time: Date };

// date range for the graphs: last 7 days (sales) and last 30 days (top products)
function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toInputDate(date);
}
const TODAY = toInputDate(new Date());
const WEEK_AGO = daysAgo(6);
const MONTH_AGO = daysAgo(29);

export default function DashboardPage() {
  const { user } = useAuth();
  const canSeeMoney = isManagerOrUp(user);

  // staff can't see the summary (backend gives 403), so we don't ask for it
  const summary = useFetch<TodaySummary>(canSeeMoney ? "/orders/today-summary" : null);
  const lowStock = useFetch<{ items: LowStockProduct[]; total: number }>("/products/low-stock");
  const orders = useFetch<Paginated<OrderListItem>>("/orders", { limit: 5 });

  // data for the graphs
  const sales = useFetch<{ summary: SalesPoint[] }>(
    canSeeMoney ? "/reports/sales-summary" : null,
    { dateFrom: WEEK_AGO, dateTo: TODAY, groupBy: "day" },
  );
  const topProducts = useFetch<TopProduct[]>(
    canSeeMoney ? "/reports/top-products" : null,
    { dateFrom: MONTH_AGO, dateTo: TODAY, limit: 5 },
  );
  const stockProducts = useFetch<Paginated<Product>>("/products", { limit: 10 });

  const [activity, setActivity] = useState<Activity[]>([]);

  function addActivity(text: string) {
    // keep only the newest 10 lines
    setActivity((old) => [{ id: Date.now() + Math.random(), text, time: new Date() }, ...old].slice(0, 10));
  }

  // ── REALTIME ────────────────────────────────
  // When anyone in my company makes a sale, this runs on MY screen too.
  const channel = tenantChannel(user);

  usePusherEvent(channel, PUSHER_EVENTS.ORDER_CREATED, (data: { orderNumber: string; total: string }) => {
    addActivity(`🛒 New sale ${data.orderNumber} — ${formatMoney(data.total)}`);
    summary.reload();
    orders.reload();
    sales.reload(); // graph updates live too
    topProducts.reload();
  });

  usePusherEvent(channel, PUSHER_EVENTS.ORDER_UPDATED, (data: { orderNumber: string; status: string }) => {
    addActivity(`📦 Order ${data.orderNumber} is now ${data.status}`);
    summary.reload();
    orders.reload();
  });

  usePusherEvent(channel, PUSHER_EVENTS.STOCK_UPDATED, (data: { productName: string; currentStock: number }) => {
    addActivity(`📊 ${data.productName} stock is now ${data.currentStock}`);
    lowStock.reload();
    stockProducts.reload();
  });

  usePusherEvent(channel, PUSHER_EVENTS.PAYMENT_RECEIVED, (data: { orderNumber: string; amount: string; method: string }) => {
    addActivity(`💰 Payment ${formatMoney(data.amount)} (${data.method}) for ${data.orderNumber}`);
  });

  return (
    <div>
      <PageHeader title={`Hello, ${user?.fullName}`} subtitle="Here is what is happening in your shop today." />

      {/* ── summary cards ── */}
      {canSeeMoney && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Orders today" value={summary.data ? String(summary.data.orderCount) : "…"} />
          <StatCard label="Revenue today" value={summary.data ? formatMoney(summary.data.totalRevenue) : "…"} />
          <StatCard label="Profit today" value={summary.data ? formatMoney(summary.data.totalProfit) : "…"} />
        </div>
      )}

      {/* ── graphs ── */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {canSeeMoney && (
          <>
            <Card title="Revenue — last 7 days" className="lg:col-span-2">
              <SalesTrendChart points={sales.data?.summary ?? []} dateFrom={WEEK_AGO} dateTo={TODAY} />
            </Card>
            <Card title="Top products — last 30 days">
              <TopProductsChart products={topProducts.data ?? []} />
            </Card>
          </>
        )}
        <Card title="Stock levels" className="lg:col-span-3">
          <StockLevelChart
            items={(stockProducts.data?.items ?? []).map((p) => ({
              name: p.name,
              currentStock: p.currentStock,
              reorderLevel: p.reorderLevel,
            }))}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── recent orders ── */}
        <Card title="Recent orders" className="lg:col-span-2" action={<Link href="/orders" className="text-sm text-indigo-600 hover:underline">View all</Link>}>
          {orders.loading && !orders.data ? (
            <Loading />
          ) : orders.data?.items.length ? (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Order</th>
                    <th className={thClass}>Customer</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Total</th>
                    <th className={thClass}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data.items.map((order) => (
                    <tr key={order.id}>
                      <td className={tdClass}>
                        <Link href={`/orders/${order.id}`} className="font-medium text-indigo-600 hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className={tdClass}>{order.customerName}</td>
                      <td className={tdClass}><Badge value={order.status} /></td>
                      <td className={tdClass}>{formatMoney(order.total)}</td>
                      <td className={tdClass}>{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="No orders yet. Make your first sale from New Sale (POS)." />
          )}
        </Card>

        {/* ── live activity (Pusher) ── */}
        <Card title="Live activity">
          {!isPusherEnabled() && (
            <p className="text-sm text-slate-500">
              Realtime is off. Add your Pusher key to <code>.env.local</code> to see live updates here.
            </p>
          )}
          {isPusherEnabled() && activity.length === 0 && (
            <p className="text-sm text-slate-500">Waiting for activity… open the POS in another tab and make a sale!</p>
          )}
          <ul className="space-y-2">
            {activity.map((item) => (
              <li key={item.id} className="text-sm text-slate-700">
                {item.text}
                <span className="block text-xs text-slate-400">{item.time.toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* ── low stock ── */}
        <Card title={`Low stock (${lowStock.data?.total ?? 0})`} className="lg:col-span-3">
          {lowStock.data?.items.length ? (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Product</th>
                    <th className={thClass}>SKU</th>
                    <th className={thClass}>In stock</th>
                    <th className={thClass}>Reorder level</th>
                    <th className={thClass}>Short by</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.data.items.map((p) => (
                    <tr key={p.id}>
                      <td className={tdClass}>
                        <Link href={`/products/${p.id}`} className="text-indigo-600 hover:underline">{p.name}</Link>
                      </td>
                      <td className={tdClass}>{p.sku}</td>
                      <td className={tdClass}><Badge value="low" label={String(p.currentStock)} /></td>
                      <td className={tdClass}>{p.reorderLevel}</td>
                      <td className={tdClass}>{p.shortage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="All products have enough stock 🎉" />
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
