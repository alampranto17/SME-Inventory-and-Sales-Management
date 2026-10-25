"use client";

// POS = Point Of Sale. Pick products -> cart -> "Complete sale".
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { usePusherEvent } from "@/hooks/usePusherEvent";
import { PUSHER_EVENTS, tenantChannel } from "@/lib/pusher";
import { apiPost, getErrorMessage } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import ProductImage from "@/components/ProductImage";
import { Button, Card, Empty, ErrorBox, Input, PageHeader, Select } from "@/components/ui";
import type { Customer, Order, Paginated, Product } from "@/lib/types";

// one line in the cart
type CartLine = {
  product: Product;
  quantity: number;
  discount: number;
};

export default function PosPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const products = useFetch<Paginated<Product>>("/products", { search: search || undefined, limit: 24 });
  const customers = useFetch<Paginated<Customer>>("/customers", { limit: 100 });

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [orderDiscount, setOrderDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // REALTIME: someone else sold something -> stock numbers change here too
  usePusherEvent(tenantChannel(user), PUSHER_EVENTS.STOCK_UPDATED, () => products.reload());

  // ── cart actions ──
  function addToCart(product: Product) {
    setCart((old) => {
      const existing = old.find((line) => line.product.id === product.id);
      if (existing) {
        // already in cart -> quantity + 1
        return old.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...old, { product, quantity: 1, discount: 0 }];
    });
  }

  function changeLine(productId: string, field: "quantity" | "discount", value: number) {
    setCart((old) =>
      old.map((line) => (line.product.id === productId ? { ...line, [field]: value } : line)),
    );
  }

  function removeLine(productId: string) {
    setCart((old) => old.filter((line) => line.product.id !== productId));
  }

  // ── money (same formula as the backend) ──
  const lineTotal = (line: CartLine) =>
    Number(line.product.sellingPrice) * line.quantity - line.discount;
  const subtotal = cart.reduce((sum, line) => sum + lineTotal(line), 0);
  const total = subtotal - Number(orderDiscount || 0) + Number(tax || 0);

  async function completeSale() {
    setError("");
    setSaving(true);
    try {
      const order = await apiPost<Order>("/orders", {
        customerId: customerId || undefined,
        items: cart.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
          discount: line.discount || undefined,
        })),
        discount: Number(orderDiscount) || undefined,
        tax: Number(tax) || undefined,
      });
      // go to the order page (there you can take payment / print invoice)
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Sale" subtitle="Tap a product to add it to the cart." />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── product grid ── */}
        <div className="lg:col-span-3">
          <Input placeholder="Search product or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.data?.items.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.currentStock <= 0}
                className="rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-indigo-400 disabled:opacity-40"
              >
                <ProductImage imageUrl={p.imageUrl} name={p.name} size={56} className="mb-2" />
                <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-500">{p.sku}</p>
                <p className="mt-2 text-sm font-semibold text-indigo-600">{formatMoney(p.sellingPrice)}</p>
                <p className={`text-xs ${p.isLowStock ? "text-red-600" : "text-slate-500"}`}>
                  Stock: {p.currentStock}
                </p>
              </button>
            ))}
          </div>
          {products.data?.items.length === 0 && <Empty text="No products found." />}
        </div>

        {/* ── cart ── */}
        <Card title="Cart" className="lg:col-span-2">
          <ErrorBox message={error} />

          {cart.length === 0 ? (
            <Empty text="Cart is empty." />
          ) : (
            <div className="space-y-3">
              {cart.map((line) => (
                <div key={line.product.id} className="rounded-md border border-slate-200 p-2">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-medium">{line.product.name}</p>
                    <button onClick={() => removeLine(line.product.id)} className="text-xs text-red-600">Remove</button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 items-end gap-2">
                    <Input label="Qty" type="number" min="1" value={line.quantity}
                      onChange={(e) => changeLine(line.product.id, "quantity", Math.max(1, Number(e.target.value)))} />
                    <Input label="Discount" type="number" min="0" value={line.discount}
                      onChange={(e) => changeLine(line.product.id, "discount", Number(e.target.value))} />
                    <p className="pb-2 text-right text-sm font-semibold">{formatMoney(lineTotal(line))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
            <Select label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in customer</option>
              {customers.data?.items.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Order discount" type="number" min="0" value={orderDiscount} onChange={(e) => setOrderDiscount(e.target.value)} />
              <Input label="Tax" type="number" min="0" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatMoney(total)}</span></div>
            </div>

            <Button className="w-full" disabled={cart.length === 0} loading={saving} onClick={completeSale}>
              Complete sale
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
