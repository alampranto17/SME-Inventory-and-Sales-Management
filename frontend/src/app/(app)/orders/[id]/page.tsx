"use client";

// Order detail: items, payments, change status, cancel, download invoice.
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { usePusherEvent } from "@/hooks/usePusherEvent";
import { PUSHER_EVENTS, tenantChannel } from "@/lib/pusher";
import { api, apiPatch, apiPost, getErrorMessage } from "@/lib/api";
import { isManagerOrUp } from "@/lib/roles";
import { formatDate, formatMoney } from "@/lib/format";
import {
  Badge, Button, Card, ErrorBox, Input, Loading, Modal, PageHeader, Select,
  tableClass, tdClass, thClass,
} from "@/components/ui";
import type { Order, OrderStatus, Payment, PaymentMethod } from "@/lib/types";

type PaymentsResponse = {
  items: Payment[];
  totalPaid: string;
  orderTotal: string;
  balanceRemaining: string;
};

// what is the next status? (same rules as the backend)
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  draft: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canManage = isManagerOrUp(user);

  const order = useFetch<Order>(`/orders/${id}`);
  const payments = useFetch<PaymentsResponse>(`/payments/by-order/${id}`);

  const [showPay, setShowPay] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState("");

  function reloadAll() {
    order.reload();
    payments.reload();
  }

  // REALTIME: if someone else changes THIS order or pays it, refresh
  usePusherEvent(tenantChannel(user), PUSHER_EVENTS.ORDER_UPDATED, (e: { id: string }) => {
    if (e.id === id) reloadAll();
  });
  usePusherEvent(tenantChannel(user), PUSHER_EVENTS.PAYMENT_RECEIVED, (e: { orderId: string }) => {
    if (e.orderId === id) reloadAll();
  });

  async function moveToNextStatus(next: OrderStatus) {
    setError("");
    try {
      await apiPatch(`/orders/${id}/status`, { status: next });
      reloadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // the invoice is a PDF file, not JSON -> download it as a "blob"
  async function downloadInvoice() {
    try {
      const res = await api.get(`/orders/${id}/invoice`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${order.data?.orderNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (order.loading && !order.data) return <Loading />;
  if (order.error) return <ErrorBox message={order.error} />;
  const o = order.data!;
  const next = NEXT_STATUS[o.status];
  const canCancel = o.status === "draft" || o.status === "confirmed";
  const due = Number(o.balanceDue);

  return (
    <div>
      <PageHeader title={`Order ${o.orderNumber}`} subtitle={formatDate(o.createdAt)}>
        <Button variant="secondary" onClick={downloadInvoice}>Download invoice</Button>
        {o.status !== "cancelled" && due > 0 && <Button onClick={() => setShowPay(true)}>Take payment</Button>}
        {canManage && next && (
          <Button variant="secondary" onClick={() => moveToNextStatus(next)}>Mark as {next}</Button>
        )}
        {canManage && canCancel && (
          <Button variant="danger" onClick={() => setShowCancel(true)}>Cancel order</Button>
        )}
      </PageHeader>

      <ErrorBox message={error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Items" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Product</th>
                  <th className={thClass}>Qty</th>
                  <th className={thClass}>Price</th>
                  <th className={thClass}>Discount</th>
                  <th className={thClass}>Total</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((item) => (
                  <tr key={item.id}>
                    <td className={tdClass}>
                      <Link href={`/products/${item.productId}`} className="text-indigo-600 hover:underline">{item.productName}</Link>
                    </td>
                    <td className={tdClass}>{item.quantity}</td>
                    <td className={tdClass}>{formatMoney(item.unitPrice)}</td>
                    <td className={tdClass}>{formatMoney(item.discount)}</td>
                    <td className={tdClass}>{formatMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Summary">
          <div className="space-y-2 text-sm">
            <Line label="Status" value={<Badge value={o.status} />} />
            <Line label="Customer" value={o.customer ? <Link className="text-indigo-600 hover:underline" href={`/customers/${o.customer.id}`}>{o.customer.name}</Link> : "Walk-in"} />
            <Line label="Subtotal" value={formatMoney(o.subtotal)} />
            <Line label="Discount" value={`-${formatMoney(o.discount)}`} />
            <Line label="Tax" value={formatMoney(o.tax)} />
            <Line label="Total" value={<b>{formatMoney(o.total)}</b>} />
            <Line label="Paid" value={formatMoney(o.paidAmount)} />
            <Line label="Balance due" value={<b className={due > 0 ? "text-red-600" : "text-green-600"}>{formatMoney(o.balanceDue)}</b>} />
            {o.notes && <p className="pt-2 text-slate-600">Note: {o.notes}</p>}
            {o.cancelReason && <p className="pt-2 text-red-600">Cancelled: {o.cancelReason}</p>}
          </div>
        </Card>

        <Card title="Payments" className="lg:col-span-3">
          {payments.data?.items.length ? (
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Method</th>
                  <th className={thClass}>Reference</th>
                  <th className={thClass}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.data.items.map((p) => (
                  <tr key={p.id}>
                    <td className={tdClass}>{formatDate(p.paidAt)}</td>
                    <td className={tdClass}>{p.method}</td>
                    <td className={tdClass}>{p.reference ?? "-"}</td>
                    <td className={tdClass}>{formatMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">No payments yet.</p>
          )}
        </Card>
      </div>

      <Modal open={showPay} title="Take payment" onClose={() => setShowPay(false)}>
        <PaymentForm orderId={id} due={due} onDone={() => { setShowPay(false); reloadAll(); }} />
      </Modal>
      <Modal open={showCancel} title="Cancel order" onClose={() => setShowCancel(false)}>
        <CancelForm orderId={id} onDone={() => { setShowCancel(false); reloadAll(); }} />
      </Modal>
    </div>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function PaymentForm({ orderId, due, onDone }: { orderId: string; due: number; onDone: () => void }) {
  const [amount, setAmount] = useState(String(due));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiPost("/payments", {
        orderId,
        amount: Number(amount),
        method,
        reference: reference || undefined,
      });
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ErrorBox message={error} />
      <Input label={`Amount (due ${formatMoney(due)})`} type="number" step="0.01" min="0.01" max={due} required value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Select label="Method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
        <option value="cash">Cash</option>
        <option value="bkash">bKash</option>
        <option value="nagad">Nagad</option>
        <option value="card">Card</option>
        <option value="bank">Bank transfer</option>
      </Select>
      {method !== "cash" && (
        <Input label="Transaction / reference no." value={reference} onChange={(e) => setReference(e.target.value)} />
      )}
      <Button type="submit" loading={saving} className="w-full">Save payment</Button>
    </form>
  );
}

function CancelForm({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost(`/orders/${orderId}/cancel`, { reason });
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ErrorBox message={error} />
      <p className="text-sm text-slate-600">The stock of all items will be put back.</p>
      <Input label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button type="submit" variant="danger" loading={saving} className="w-full">Cancel order</Button>
    </form>
  );
}
