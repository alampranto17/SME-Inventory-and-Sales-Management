"use client";

import { useState } from "react";
import Link from "next/link";
import { useFetch } from "@/hooks/useFetch";
import { apiPost, getErrorMessage } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import {
  Badge, Button, Card, Empty, ErrorBox, Input, Loading, Modal, PageHeader, Select,
  tableClass, tdClass, thClass,
} from "@/components/ui";
import type { Paginated, Product, PurchaseOrder, Supplier } from "@/lib/types";

export default function PurchaseOrdersPage() {
  const { data, loading, error, reload } = useFetch<Paginated<PurchaseOrder>>("/purchase-orders", { limit: 50 });
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Buy stock from suppliers. When goods arrive, press Receive.">
        <Button onClick={() => setShowCreate(true)}>+ New purchase order</Button>
      </PageHeader>

      <Card>
        <ErrorBox message={error} />
        {loading && !data ? (
          <Loading />
        ) : data?.items.length ? (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>PO</th>
                  <th className={thClass}>Supplier</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Total</th>
                  <th className={thClass}>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((po) => (
                  <tr key={po.id}>
                    <td className={tdClass}>
                      <Link href={`/purchase-orders/${po.id}`} className="font-medium text-indigo-600 hover:underline">{po.poNumber}</Link>
                    </td>
                    <td className={tdClass}>{po.supplier?.name}</td>
                    <td className={tdClass}><Badge value={po.status} /></td>
                    <td className={tdClass}>{formatMoney(po.total)}</td>
                    <td className={tdClass}>{formatDate(po.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No purchase orders yet." />
        )}
      </Card>

      <Modal open={showCreate} title="New purchase order" onClose={() => setShowCreate(false)}>
        <PurchaseOrderForm onDone={() => { setShowCreate(false); reload(); }} />
      </Modal>
    </div>
  );
}

type Line = { productId: string; quantity: string; unitCost: string };

function PurchaseOrderForm({ onDone }: { onDone: () => void }) {
  const suppliers = useFetch<Supplier[]>("/suppliers");
  const products = useFetch<Paginated<Product>>("/products", { limit: 100 });

  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1", unitCost: "" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function changeLine(index: number, field: keyof Line, value: string) {
    setLines(lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiPost("/purchase-orders", {
        supplierId,
        notes: notes || undefined,
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity),
          // empty -> backend uses the product's cost price
          unitCost: line.unitCost ? Number(line.unitCost) : undefined,
        })),
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
      <Select label="Supplier *" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
        <option value="">— choose —</option>
        {suppliers.data?.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </Select>

      {lines.map((line, index) => (
        <div key={index} className="grid grid-cols-6 items-end gap-2">
          <div className="col-span-3">
            <Select label={index === 0 ? "Product" : undefined} required value={line.productId} onChange={(e) => changeLine(index, "productId", e.target.value)}>
              <option value="">— choose —</option>
              {products.data?.items.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <Input label={index === 0 ? "Qty" : undefined} type="number" min="1" required value={line.quantity} onChange={(e) => changeLine(index, "quantity", e.target.value)} />
          <div className="col-span-2">
            <Input label={index === 0 ? "Unit cost" : undefined} type="number" step="0.01" min="0" placeholder="auto" value={line.unitCost} onChange={(e) => changeLine(index, "unitCost", e.target.value)} />
          </div>
        </div>
      ))}
      <button type="button" className="text-sm text-indigo-600 hover:underline"
        onClick={() => setLines([...lines, { productId: "", quantity: "1", unitCost: "" }])}>
        + Add another product
      </button>

      <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Button type="submit" loading={saving} className="w-full">Create purchase order</Button>
    </form>
  );
}
