"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { usePusherEvent } from "@/hooks/usePusherEvent";
import { PUSHER_EVENTS, tenantChannel } from "@/lib/pusher";
import { formatMoney, toInputDate } from "@/lib/format";
import SalesTrendChart, { type SalesPoint } from "@/components/charts/SalesTrendChart";
import TopProductsChart, { type TopProduct } from "@/components/charts/TopProductsChart";
import ValuationChart, { type ValuationItem } from "@/components/charts/ValuationChart";
import { Card, ErrorBox, Input, PageHeader, tableClass, tdClass, thClass } from "@/components/ui";

type SalesSummary = {
  summary: SalesPoint[];
  totals: { orderCount: number; revenue: string; profit: string };
};

type ProfitLoss = {
  revenue: string;
  cogs: string;
  grossProfit: string;
  margin: string;
  taxCollected: string;
};

type Valuation = {
  totalCostValue: string;
  totalRetailValue: string;
  potentialProfit: string;
  items: ValuationItem[];
};

type LowStockAlert = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  shortage: number;
  lastSupplier: { name: string; phone: string | null } | null;
};

// default range: the last 30 days
function defaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return toInputDate(date);
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState(defaultFrom());
  const [dateTo, setDateTo] = useState(toInputDate(new Date()));
  const range = { dateFrom, dateTo };

  const sales = useFetch<SalesSummary>("/reports/sales-summary", { ...range, groupBy: "day" });
  const profitLoss = useFetch<ProfitLoss>("/reports/profit-loss", range);
  const topProducts = useFetch<TopProduct[]>("/reports/top-products", { ...range, limit: 10 });
  const valuation = useFetch<Valuation>("/reports/inventory-valuation");
  const lowStock = useFetch<LowStockAlert[]>("/reports/low-stock-alert");

  // REALTIME: a new sale -> numbers and graphs update by themselves
  usePusherEvent(tenantChannel(user), PUSHER_EVENTS.ORDER_CREATED, () => {
    sales.reload();
    profitLoss.reload();
    topProducts.reload();
    valuation.reload();
  });

  const pl = profitLoss.data;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Revenue = sales after discount, without tax. Profit = revenue - cost of goods sold.">
        <div className="flex items-end gap-2">
          <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </PageHeader>

      <ErrorBox message={sales.error || profitLoss.error} />

      {/* ── numbers ── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders" value={String(sales.data?.totals.orderCount ?? "…")} />
        <Stat label="Revenue" value={pl ? formatMoney(pl.revenue) : "…"} />
        <Stat label="Gross profit" value={pl ? formatMoney(pl.grossProfit) : "…"} />
        <Stat label="Margin" value={pl ? `${pl.margin}%` : "…"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Revenue per day" className="lg:col-span-2">
          <SalesTrendChart points={sales.data?.summary ?? []} dateFrom={dateFrom} dateTo={dateTo} />
        </Card>

        <Card title="Top products (qty sold)">
          <TopProductsChart products={topProducts.data ?? []} />
        </Card>

        <Card title="Stock value" className="lg:col-span-3">
          {valuation.data && (
            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <Stat label="At cost price" value={formatMoney(valuation.data.totalCostValue)} />
              <Stat label="At selling price" value={formatMoney(valuation.data.totalRetailValue)} />
              <Stat label="Potential profit" value={formatMoney(valuation.data.potentialProfit)} />
            </div>
          )}
          <ValuationChart items={valuation.data?.items ?? []} />
        </Card>

        <Card title="Low stock — what to re-order" className="lg:col-span-3">
          {lowStock.data?.length ? (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Product</th>
                    <th className={thClass}>In stock</th>
                    <th className={thClass}>Reorder level</th>
                    <th className={thClass}>Short by</th>
                    <th className={thClass}>Last supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.data.map((p) => (
                    <tr key={p.id}>
                      <td className={tdClass}>{p.name} <span className="text-slate-400">({p.sku})</span></td>
                      <td className={tdClass}>{p.currentStock}</td>
                      <td className={tdClass}>{p.reorderLevel}</td>
                      <td className={tdClass}>{p.shortage}</td>
                      <td className={tdClass}>{p.lastSupplier ? `${p.lastSupplier.name} ${p.lastSupplier.phone ?? ""}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nothing to re-order 🎉</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
