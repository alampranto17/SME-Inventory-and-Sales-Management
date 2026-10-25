"use client";

// Product detail page: /products/123
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { usePusherEvent } from "@/hooks/usePusherEvent";
import { PUSHER_EVENTS, tenantChannel } from "@/lib/pusher";
import { apiDelete, getErrorMessage } from "@/lib/api";
import { checkImageFile, uploadProductImage } from "@/lib/uploadImage";
import ProductImage from "@/components/ProductImage";
import { isManagerOrUp, isOwner } from "@/lib/roles";
import { formatDate, formatMoney } from "@/lib/format";
import ProductForm from "@/components/ProductForm";
import {
  Badge, Button, Card, ErrorBox, Loading, Modal, PageHeader, tableClass, tdClass, thClass,
} from "@/components/ui";
import type { Movement, Paginated, Product, StockRow } from "@/lib/types";

type ProductStock = { totalQuantity: number; warehouses: StockRow[] };

export default function ProductDetailPage() {
  // [id] in the folder name -> params.id
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const product = useFetch<Product>(`/products/${id}`);
  const stock = useFetch<ProductStock>(`/inventory/${id}`);
  const movements = useFetch<Paginated<Movement>>("/inventory/movements", { productId: id, limit: 10 });

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  // live: reload when THIS product's stock changes
  usePusherEvent(tenantChannel(user), PUSHER_EVENTS.STOCK_UPDATED, (event: { productId: string }) => {
    if (event.productId === id) {
      product.reload();
      stock.reload();
      movements.reload();
    }
  });

  // upload a new photo straight from the detail page
  async function changePhoto(file: File | undefined) {
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) return setError(problem);
    setError("");
    try {
      await uploadProductImage(id, file);
      product.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function removePhoto() {
    if (!confirm("Remove this photo?")) return;
    try {
      await apiDelete(`/products/${id}/image`);
      product.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deactivate() {
    if (!confirm("Deactivate this product? It will be hidden from the list.")) return;
    try {
      await apiDelete(`/products/${id}`);
      router.push("/products");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (product.loading && !product.data) return <Loading />;
  if (product.error) return <ErrorBox message={product.error} />;
  const p = product.data!;

  return (
    <div>
      <PageHeader title={p.name} subtitle={`SKU: ${p.sku}${p.isActive ? "" : " · INACTIVE"}`}>
        {isManagerOrUp(user) && <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>}
        {isOwner(user) && p.isActive && <Button variant="danger" onClick={deactivate}>Deactivate</Button>}
      </PageHeader>

      <ErrorBox message={error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Details">
          {/* ── photo ── */}
          <div className="mb-4 flex flex-col items-center gap-2">
            <ProductImage imageUrl={p.imageUrl} name={p.name} size={160} />
            {isManagerOrUp(user) && (
              <div className="flex gap-3 text-sm">
                <label className="cursor-pointer text-indigo-600 hover:underline">
                  {p.imageUrl ? "Change photo" : "Add photo"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={(e) => changePhoto(e.target.files?.[0])} />
                </label>
                {p.imageUrl && (
                  <button onClick={removePhoto} className="text-red-600 hover:underline">Remove</button>
                )}
              </div>
            )}
          </div>

          <dl className="space-y-2 text-sm">
            <Row label="Category" value={p.categoryName ?? "-"} />
            <Row label="Barcode" value={p.barcode ?? "-"} />
            <Row label="Cost price" value={formatMoney(p.costPrice)} />
            <Row label="Selling price" value={formatMoney(p.sellingPrice)} />
            <Row label="Unit" value={p.unit} />
            <Row label="Reorder level" value={String(p.reorderLevel)} />
            <Row label="Total stock" value={<Badge value={p.isLowStock ? "low" : "ok"} label={String(p.currentStock)} />} />
          </dl>
        </Card>

        <Card title="Stock by warehouse" className="lg:col-span-2">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Warehouse</th>
                <th className={thClass}>Quantity</th>
                <th className={thClass}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {stock.data?.warehouses.map((w) => (
                <tr key={w.warehouseId}>
                  <td className={tdClass}>{w.warehouseName}</td>
                  <td className={tdClass}>{w.quantity}</td>
                  <td className={tdClass}>{formatDate(w.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Last stock movements" className="lg:col-span-3">
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Type</th>
                  <th className={thClass}>Qty</th>
                  <th className={thClass}>Reason</th>
                  <th className={thClass}>Date</th>
                </tr>
              </thead>
              <tbody>
                {movements.data?.items.map((m) => (
                  <tr key={m.id}>
                    <td className={tdClass}><Badge value={m.type} /></td>
                    <td className={tdClass}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                    <td className={tdClass}>{m.reason}</td>
                    <td className={tdClass}>{formatDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={editing} title="Edit product" onClose={() => setEditing(false)}>
        <ProductForm
          product={p}
          onSaved={() => {
            setEditing(false);
            product.reload();
          }}
        />
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
