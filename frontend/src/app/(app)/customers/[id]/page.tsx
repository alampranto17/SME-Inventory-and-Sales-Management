"use client";

// Customer detail + ledger (everything they bought and paid)
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { isManagerOrUp } from "@/lib/roles";
import { formatDate, formatMoney } from "@/lib/format";
import {
  Badge, Card, Empty, ErrorBox, Loading, PageHeader, tableClass, tdClass, thClass,
} from "@/components/ui";
import type { Customer, OrderListItem, Paginated } from "@/lib/types";

type Ledger = {
  outstandingBalance: string;
  transactions: { date: string; type: "SALE" | "PAYMENT"; amount: string; reference: string }[];
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canSeeLedger = isManagerOrUp(user);

  const customer = useFetch<Customer>(`/customers/${id}`);
  const orders = useFetch<Paginated<OrderListItem>>("/orders", { customerId: id, limit: 20 });
  // only managers/owners may see the ledger (backend gives 403 to staff)
  const ledger = useFetch<Ledger>(canSeeLedger ? `/customers/${id}/ledger` : null);

  if (customer.loading && !customer.data) return <Loading />;
  if (customer.error) return <ErrorBox message={customer.error} />;
  const c = customer.data!;

  return (
    <div>
      <PageHeader title={c.name} subtitle={`${c.phone}${c.email ? " · " + c.email : ""}`} />

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Outstanding balance</p>
        <p className={`text-2xl font-semibold ${Number(c.balance) > 0 ? "text-red-600" : "text-slate-900"}`}>{formatMoney(c.balance)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Orders">
          {orders.data?.items.length ? (
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Order</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.items.map((o) => (
                  <tr key={o.id}>
                    <td className={tdClass}><Link href={`/orders/${o.id}`} className="text-indigo-600 hover:underline">{o.orderNumber}</Link></td>
                    <td className={tdClass}><Badge value={o.status} /></td>
                    <td className={tdClass}>{formatMoney(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty text="No orders yet." />
          )}
        </Card>

        {canSeeLedger && (
          <Card title="Ledger">
            {ledger.data?.transactions.length ? (
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Date</th>
                    <th className={thClass}>Type</th>
                    <th className={thClass}>Reference</th>
                    <th className={thClass}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.data.transactions.map((t, index) => (
                    <tr key={index}>
                      <td className={tdClass}>{formatDate(t.date)}</td>
                      <td className={tdClass}><Badge value={t.type === "SALE" ? "OUT" : "IN"} label={t.type} /></td>
                      <td className={tdClass}>{t.reference}</td>
                      <td className={tdClass}>{formatMoney(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty text="No transactions." />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
