"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { usePusherEvent } from "@/hooks/usePusherEvent";
import { PUSHER_EVENTS, tenantChannel } from "@/lib/pusher";
import { apiPost, getErrorMessage } from "@/lib/api";
import { isManagerOrUp } from "@/lib/roles";
import { formatDate } from "@/lib/format";
import {
  Badge, Button, Card, Empty, ErrorBox, Input, Loading, Modal, PageHeader,
  Pagination, Select, tableClass, tdClass, thClass,
} from "@/components/ui";
import type { Movement, Paginated, Product, StockRow, Warehouse } from "@/lib/types";

// which popup is open
type Action = "adjust" | "receive" | "transfer" | "warehouse" | null;

export default function InventoryPage() {
  const { user } = useAuth();
  const canEdit = isManagerOrUp(user);

  const [tab, setTab] = useState<"stock" | "movements">("stock");
  const [action, setAction] = useState<Action>(null);
  const [movementType, setMovementType] = useState("");
  const [page, setPage] = useState(1);

  const stock = useFetch<StockRow[]>("/inventory");
  const warehouses = useFetch<Warehouse[]>("/warehouses");
  const movements = useFetch<Paginated<Movement>>("/inventory/movements", {
    type: movementType || undefined,
    page,
    limit: 20,
  });

  // REALTIME: any stock change in the company -> reload the tables
  usePusherEvent(tenantChannel(user), PUSHER_EVENTS.STOCK_UPDATED, () => {
    stock.reload();
    movements.reload();
  });

  function closeAndReload() {
    setAction(null);
    stock.reload();
    movements.reload();
    warehouses.reload();
  }

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stock in every warehouse and the full history of changes.">
        {canEdit && (
          <>
            <Button variant="secondary" onClick={() => setAction("warehouse")}>+ Warehouse</Button>
            <Button variant="secondary" onClick={() => setAction("transfer")}>Transfer</Button>
            <Button variant="secondary" onClick={() => setAction("adjust")}>Adjust</Button>
            <Button onClick={() => setAction("receive")}>Receive stock</Button>
          </>
        )}
      </PageHeader>

      {/* tabs */}
      <div className="mb-4 flex gap-2">
        {(["stock", "movements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border border-slate-300"}`}
          >
            {t === "stock" ? "Stock levels" : "Movements"}
          </button>
        ))}
      </div>

      {tab === "stock" && (
        <Card>
          {stock.loading && !stock.data ? (
            <Loading />
          ) : stock.data?.length ? (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Product</th>
                    <th className={thClass}>SKU</th>
                    <th className={thClass}>Warehouse</th>
                    <th className={thClass}>Quantity</th>
                    <th className={thClass}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.data.map((row) => (
                    <tr key={row.productId + row.warehouseId}>
                      <td className={tdClass}>{row.productName}</td>
                      <td className={tdClass}>{row.sku}</td>
                      <td className={tdClass}>{row.warehouseName}</td>
                      <td className={tdClass}>
                        <Badge value={row.quantity <= row.reorderLevel ? "low" : "ok"} label={String(row.quantity)} />
                      </td>
                      <td className={tdClass}>{formatDate(row.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="No stock yet." />
          )}
        </Card>
      )}

      {tab === "movements" && (
        <Card>
          <div className="mb-4 w-48">
            <Select value={movementType} onChange={(e) => { setMovementType(e.target.value); setPage(1); }}>
              <option value="">All types</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="ADJUST">ADJUST</option>
              <option value="TRANSFER">TRANSFER</option>
            </Select>
          </div>
          {movements.data?.items.length ? (
            <>
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Date</th>
                      <th className={thClass}>Product</th>
                      <th className={thClass}>Type</th>
                      <th className={thClass}>Qty</th>
                      <th className={thClass}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.data.items.map((m) => (
                      <tr key={m.id}>
                        <td className={tdClass}>{formatDate(m.createdAt)}</td>
                        <td className={tdClass}>{m.productName}</td>
                        <td className={tdClass}><Badge value={m.type} /></td>
                        <td className={tdClass}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                        <td className={tdClass}>{m.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} limit={20} total={movements.data.total} onChange={setPage} />
            </>
          ) : (
            <Empty text="No movements." />
          )}
        </Card>
      )}

      <Modal open={action === "adjust"} title="Adjust stock" onClose={() => setAction(null)}>
        <StockForm kind="adjust" warehouses={warehouses.data ?? []} onDone={closeAndReload} />
      </Modal>
      <Modal open={action === "receive"} title="Receive stock" onClose={() => setAction(null)}>
        <StockForm kind="receive" warehouses={warehouses.data ?? []} onDone={closeAndReload} />
      </Modal>
      <Modal open={action === "transfer"} title="Transfer between warehouses" onClose={() => setAction(null)}>
        <StockForm kind="transfer" warehouses={warehouses.data ?? []} onDone={closeAndReload} />
      </Modal>
      <Modal open={action === "warehouse"} title="New warehouse" onClose={() => setAction(null)}>
        <WarehouseForm onDone={closeAndReload} />
      </Modal>
    </div>
  );
}

// ── one form for adjust / receive / transfer ──
function StockForm({
  kind,
  warehouses,
  onDone,
}: {
  kind: "adjust" | "receive" | "transfer";
  warehouses: Warehouse[];
  onDone: () => void;
}) {
  const products = useFetch<Paginated<Product>>("/products", { limit: 100 });
  const defaultWarehouse = warehouses.find((w) => w.isDefault)?.id ?? "";

  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState(defaultWarehouse);
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    // if the user did not touch the dropdown, use the default warehouse
    const fromId = warehouseId || defaultWarehouse;
    try {
      if (kind === "transfer") {
        await apiPost("/inventory/transfer", {
          productId,
          fromWarehouseId: fromId,
          toWarehouseId,
          quantity: Number(quantity),
          reason: reason || undefined,
        });
      } else {
        // adjust: quantity can be negative (-5) / receive: must be positive
        await apiPost(`/inventory/${kind}`, {
          productId,
          warehouseId: fromId,
          quantity: Number(quantity),
          reason,
        });
      }
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
      <Select label="Product" required value={productId} onChange={(e) => setProductId(e.target.value)}>
        <option value="">— choose —</option>
        {products.data?.items.map((p) => (
          <option key={p.id} value={p.id}>{p.name} ({p.currentStock})</option>
        ))}
      </Select>
      <Select label={kind === "transfer" ? "From warehouse" : "Warehouse"} required value={warehouseId || defaultWarehouse} onChange={(e) => setWarehouseId(e.target.value)}>
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </Select>
      {kind === "transfer" && (
        <Select label="To warehouse" required value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)}>
          <option value="">— choose —</option>
          {warehouses.filter((w) => w.id !== warehouseId).map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </Select>
      )}
      <Input
        label={kind === "adjust" ? "Quantity (use minus to remove, e.g. -5)" : "Quantity"}
        type="number"
        required
        min={kind === "adjust" ? undefined : 1}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <Input
        label={kind === "transfer" ? "Reason (optional)" : "Reason"}
        required={kind !== "transfer"}
        placeholder={kind === "adjust" ? "Damaged goods" : "Weekly restock"}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button type="submit" loading={saving} className="w-full">Save</Button>
    </form>
  );
}

function WarehouseForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiPost("/warehouses", { name, address: address || undefined });
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ErrorBox message={error} />
      <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
      <Button type="submit" className="w-full">Create</Button>
    </form>
  );
}
