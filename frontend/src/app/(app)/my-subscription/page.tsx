"use client";

// SHOP OWNER: my plan and my monthly bills for this software.
import { useFetch } from "@/hooks/useFetch";
import { formatDate, formatMoney } from "@/lib/format";
import {
  Badge, Card, Empty, ErrorBox, Loading, PageHeader, tableClass, tdClass, thClass,
} from "@/components/ui";

type MyBills = {
  shopName: string;
  plan: string;
  monthlyPrice: string;
  totalDue: string;
  invoices: {
    id: string;
    month: string;
    plan: string;
    amount: string;
    status: "paid" | "unpaid";
    isOverdue: boolean;
    dueDate: string;
    paidAt: string | null;
    method: string | null;
  }[];
};

export default function MySubscriptionPage() {
  const { data, loading, error } = useFetch<MyBills>("/subscriptions/my");

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  const d = data!;
  const due = Number(d.totalDue);

  return (
    <div>
      <PageHeader title="My Subscription" subtitle={`Software plan of ${d.shopName}`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Current plan" value={d.plan} />
        <Stat label="Monthly price" value={formatMoney(d.monthlyPrice)} />
        <Stat label="You owe" value={formatMoney(d.totalDue)} danger={due > 0} />
      </div>

      {due > 0 && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Please pay {formatMoney(d.totalDue)} by bKash / Nagad / bank to the platform admin.
          The bill turns to &quot;Paid&quot; after the admin confirms your payment.
        </div>
      )}

      <Card title="My bills">
        {d.invoices.length ? (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Month</th>
                  <th className={thClass}>Plan</th>
                  <th className={thClass}>Amount</th>
                  <th className={thClass}>Pay before</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Paid on</th>
                </tr>
              </thead>
              <tbody>
                {d.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className={tdClass}>{invoice.month}</td>
                    <td className={tdClass}>{invoice.plan}</td>
                    <td className={tdClass}>{formatMoney(invoice.amount)}</td>
                    <td className={tdClass}>{invoice.dueDate}</td>
                    <td className={tdClass}>
                      {invoice.status === "paid" ? (
                        <Badge value="ok" label="Paid" />
                      ) : (
                        <Badge value="low" label={invoice.isOverdue ? "Overdue" : "Unpaid"} />
                      )}
                    </td>
                    <td className={tdClass}>
                      {invoice.paidAt ? `${formatDate(invoice.paidAt)} (${invoice.method})` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No bills yet." />
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${danger ? "text-red-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
