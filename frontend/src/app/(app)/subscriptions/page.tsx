"use client";

// SUPER ADMIN: monthly software bills of every shop.
//  - see how much was billed / collected / is still due
//  - press "Generate bills" to create this month's bills
//  - press "Mark paid" when a shop owner has paid you
import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { apiPatch, apiPost, getErrorMessage } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import BillingChart, { type BillingPoint } from "@/components/charts/BillingChart";
import {
  Badge, Button, Card, Empty, ErrorBox, Input, Loading, Modal, PageHeader, Select, SuccessBox,
  tableClass, tdClass, thClass,
} from "@/components/ui";

type Summary = {
  month: string;
  billed: string;
  collected: string;
  due: string;
  overdueAmount: string;
  billCount: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  activeShops: number;
  monthlyRecurringRevenue: string;
  chart: BillingPoint[];
};

type Invoice = {
  id: string;
  shopName: string;
  month: string;
  plan: string;
  amount: string;
  status: "paid" | "unpaid";
  isOverdue: boolean;
  dueDate: string;
  paidAt: string | null;
  method: string | null;
  reference: string | null;
};

// this month as "2026-10" (what <input type="month"> uses)
function thisMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SubscriptionsPage() {
  const [month, setMonth] = useState(thisMonth());
  const [status, setStatus] = useState("");
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const summary = useFetch<Summary>("/subscriptions/summary", { month });
  const invoices = useFetch<Invoice[]>("/subscriptions/invoices", {
    month,
    status: status || undefined,
  });

  function reloadAll() {
    summary.reload();
    invoices.reload();
  }

  async function generateBills() {
    setError("");
    setSuccess("");
    try {
      const result = await apiPost<{ created: number }>("/subscriptions/generate", { month });
      setSuccess(`${result.created} new bills created for ${month}.`);
      reloadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function markUnpaid(invoice: Invoice) {
    if (!confirm(`Mark the bill of ${invoice.shopName} as UNPAID again?`)) return;
    try {
      await apiPatch(`/subscriptions/invoices/${invoice.id}/unpay`);
      reloadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const s = summary.data;

  return (
    <div>
      <PageHeader title="Billing" subtitle="Monthly software bills of every shop. Bills are created automatically on the 1st of each month.">
        <div className="flex items-end gap-2">
          <Input label="Month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <Button onClick={generateBills}>Generate bills</Button>
        </div>
      </PageHeader>

      <ErrorBox message={error || summary.error || invoices.error} />
      <SuccessBox message={success} />

      {/* ── the numbers ── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Billed (${s?.billCount ?? 0} shops)`} value={s ? formatMoney(s.billed) : "…"} />
        <Stat label={`Collected (${s?.paidCount ?? 0} paid)`} value={s ? formatMoney(s.collected) : "…"} />
        <Stat label={`Still due (${s?.unpaidCount ?? 0} unpaid)`} value={s ? formatMoney(s.due) : "…"} danger={Number(s?.due) > 0} />
        <Stat label={`Overdue (${s?.overdueCount ?? 0} shops)`} value={s ? formatMoney(s.overdueAmount) : "…"} danger={Number(s?.overdueAmount) > 0} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card title="Billed vs collected — last 6 months" className="lg:col-span-2">
          <BillingChart points={s?.chart ?? []} />
        </Card>
        <Card title="Expected every month">
          <p className="text-3xl font-semibold text-slate-900">{s ? formatMoney(s.monthlyRecurringRevenue) : "…"}</p>
          <p className="mt-2 text-sm text-slate-500">
            What your {s?.activeShops ?? 0} active shops pay per month on their current plans.
          </p>
        </Card>
      </div>

      {/* ── the bills ── */}
      <Card
        title={`Bills for ${month}`}
        action={
          <div className="w-40">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </Select>
          </div>
        }
      >
        {invoices.loading && !invoices.data ? (
          <Loading />
        ) : invoices.data?.length ? (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Shop</th>
                  <th className={thClass}>Plan</th>
                  <th className={thClass}>Amount</th>
                  <th className={thClass}>Due date</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Payment</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {invoices.data.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className={`${tdClass} font-medium`}>{invoice.shopName}</td>
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
                      {invoice.paidAt ? (
                        <span className="text-xs text-slate-600">
                          {invoice.method}{invoice.reference ? ` · ${invoice.reference}` : ""}
                          <br />
                          {formatDate(invoice.paidAt)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      {invoice.status === "unpaid" ? (
                        <Button onClick={() => setPayInvoice(invoice)}>Mark paid</Button>
                      ) : (
                        <button onClick={() => markUnpaid(invoice)} className="text-xs text-slate-500 hover:underline">Undo</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text='No bills for this month. Press "Generate bills".' />
        )}
      </Card>

      <Modal open={Boolean(payInvoice)} title="Mark bill as paid" onClose={() => setPayInvoice(null)}>
        {payInvoice && (
          <PayForm
            invoice={payInvoice}
            onDone={() => {
              setSuccess(`${payInvoice.shopName} marked as paid.`);
              setPayInvoice(null);
              reloadAll();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function PayForm({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const [method, setMethod] = useState("bkash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiPatch(`/subscriptions/invoices/${invoice.id}/pay`, {
        method,
        reference: reference || undefined,
      });
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ErrorBox message={error} />
      <p className="text-sm text-slate-600">
        <b>{invoice.shopName}</b> — {invoice.month} — {formatMoney(invoice.amount)}
      </p>
      <Select label="Paid with" value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="bkash">bKash</option>
        <option value="nagad">Nagad</option>
        <option value="rocket">Rocket</option>
        <option value="bank">Bank transfer</option>
        <option value="card">Card</option>
        <option value="cash">Cash</option>
      </Select>
      <Input label="Transaction / reference no." value={reference} onChange={(e) => setReference(e.target.value)} />
      <Button type="submit" loading={saving} className="w-full">Save payment</Button>
    </form>
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
