"use client";

// Purchase order detail: send it, receive it (adds stock), or cancel it.
import { useState } from "react";
import { useParams } from "next/navigation";
import { useFetch } from "@/hooks/useFetch";
import { apiPatch, apiPost, getErrorMessage } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import {
  Badge, Button, Card, ErrorBox, Input, Loading, PageHeader, SuccessBox,
  tableClass, tdClass, thClass,
} from "@/components/ui";
import type { PurchaseOrder } from "@/lib/types";

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const po = useFetch<PurchaseOrder>(`/purchase-orders/${id}`);

  // how many arrived, per product. Empty = everything arrived.
  const [received, setReceived] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function run(action: () => Promise<unknown>, message: string) {
    setError("");
    setSuccess("");
    try {
      await action();
      setSuccess(message);
      po.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function receive() {
    const items = (po.data?.items ?? []).map((item) => ({
      productId: item.productId,
      receivedQty: received[item.productId] !== undefined && received[item.productId] !== ""
        ? Number(received[item.productId])
        : item.quantity,
    }));
    return run(() => apiPatch(`/purchase-orders/${id}/receive`, { items }), "Received! Stock has been added.");
  }

  if (po.loading && !po.data) return <Loading />;
  if (po.error) return <ErrorBox message={po.error} />;
  const p = po.data!;
  const isOpen = p.status === "draft" || p.status === "sent";

  return (
    <div>
      <PageHeader title={`Purchase order ${p.poNumber}`} subtitle={`${p.supplier.name} · ${formatDate(p.createdAt)}`}>
        {p.status === "draft" && (
          <Button variant="secondary" onClick={() => run(() => apiPatch(`/purchase-orders/${id}/send`), "Marked as sent")}>Mark as sent</Button>
        )}
        {isOpen && <Button onClick={receive}>Receive goods</Button>}
        {isOpen && (
          <Button variant="danger" onClick={() => run(() => apiPost(`/purchase-orders/${id}/cancel`), "Cancelled")}>Cancel</Button>
        )}
      </PageHeader>

      <ErrorBox message={error} />
      <SuccessBox message={success} />

      <Card title={`Items · status: ${p.status}`} action={<Badge value={p.status} />}>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Product</th>
                <th className={thClass}>Ordered</th>
                <th className={thClass}>Unit cost</th>
                <th className={thClass}>Total</th>
                <th className={thClass}>{isOpen ? "Arrived (edit if less)" : "Received"}</th>
              </tr>
            </thead>
            <tbody>
              {p.items?.map((item) => (
                <tr key={item.id}>
                  <td className={tdClass}>{item.product.name}</td>
                  <td className={tdClass}>{item.quantity}</td>
                  <td className={tdClass}>{formatMoney(item.unitCost)}</td>
                  <td className={tdClass}>{formatMoney(item.total)}</td>
                  <td className={tdClass}>
                    {isOpen ? (
                      <div className="w-24">
                        <Input type="number" min="0" max={item.quantity} placeholder={String(item.quantity)}
                          value={received[item.productId] ?? ""}
                          onChange={(e) => setReceived({ ...received, [item.productId]: e.target.value })} />
                      </div>
                    ) : (
                      item.receivedQty
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-right text-sm font-semibold">Total: {formatMoney(p.total)}</p>
      </Card>
    </div>
  );
}
