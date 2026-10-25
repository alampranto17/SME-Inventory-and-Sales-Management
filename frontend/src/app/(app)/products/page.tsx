"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { usePusherEvent } from "@/hooks/usePusherEvent";
import { PUSHER_EVENTS, tenantChannel } from "@/lib/pusher";
import { api, getErrorMessage } from "@/lib/api";
import { isManagerOrUp } from "@/lib/roles";
import { formatMoney } from "@/lib/format";
import ProductForm from "@/components/ProductForm";
import ProductImage from "@/components/ProductImage";
import {
  Badge, Button, Card, Empty, ErrorBox, Input, Loading, Modal, PageHeader,
  Pagination, Select, SuccessBox, tableClass, tdClass, thClass,
} from "@/components/ui";
import type { Category, Paginated, Product } from "@/lib/types";

const LIMIT = 10;

export default function ProductsPage() {
  const { user } = useAuth();
  const canEdit = isManagerOrUp(user);

  // filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  // useFetch loads again every time search / category / page changes
  const { data, setData, loading, error, reload } = useFetch<Paginated<Product>>("/products", {
    search: search || undefined,
    category: category || undefined,
    page,
    limit: LIMIT,
  });
  const { data: categories } = useFetch<Category[]>("/categories");

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // REALTIME: when stock changes (a sale somewhere), update the number in the table
  usePusherEvent(tenantChannel(user), PUSHER_EVENTS.STOCK_UPDATED, (event: { productId: string; currentStock: number }) => {
    setData((old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((p) =>
          p.id === event.productId
            ? { ...p, currentStock: event.currentStock, isLowStock: event.currentStock <= p.reorderLevel }
            : p,
        ),
      };
    });
  });

  return (
    <div>
      <PageHeader title="Products" subtitle="Your product catalog and current stock.">
        {canEdit && (
          <>
            <Button variant="secondary" onClick={() => setShowImport(true)}>Import CSV</Button>
            <Button onClick={() => setShowCreate(true)}>+ Add product</Button>
          </>
        )}
      </PageHeader>

      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Input
            placeholder="Search name or SKU…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // new search -> back to page 1
            }}
          />
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        <ErrorBox message={error} />

        {loading && !data ? (
          <Loading />
        ) : data?.items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Name</th>
                    <th className={thClass}>SKU</th>
                    <th className={thClass}>Category</th>
                    <th className={thClass}>Price</th>
                    <th className={thClass}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.id}>
                      <td className={tdClass}>
                        <div className="flex items-center gap-3">
                          <ProductImage imageUrl={p.imageUrl} name={p.name} size={36} />
                          <Link href={`/products/${p.id}`} className="font-medium text-indigo-600 hover:underline">{p.name}</Link>
                        </div>
                      </td>
                      <td className={tdClass}>{p.sku}</td>
                      <td className={tdClass}>{p.categoryName ?? "-"}</td>
                      <td className={tdClass}>{formatMoney(p.sellingPrice)}</td>
                      <td className={tdClass}>
                        <Badge value={p.isLowStock ? "low" : "ok"} label={`${p.currentStock} ${p.unit}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} limit={LIMIT} total={data.total} onChange={setPage} />
          </>
        ) : (
          <Empty text="No products found." />
        )}
      </Card>

      <Modal open={showCreate} title="Add product" onClose={() => setShowCreate(false)}>
        <ProductForm
          onSaved={() => {
            setShowCreate(false);
            reload();
          }}
        />
      </Modal>

      <Modal open={showImport} title="Import products from CSV" onClose={() => setShowImport(false)}>
        <CsvImport
          onDone={() => {
            reload();
          }}
        />
      </Modal>
    </div>
  );
}

// ── CSV upload ─────────────────────────────────
type ImportResult = {
  imported: number;
  failed: number;
  errors: { row: number; sku?: string; reason: string }[];
};

function CsvImport({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload() {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      // files are sent as "multipart/form-data", field name must be "file"
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/products/bulk-import", formData);
      setResult(res.data.data);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-600">First row must be the column names:</p>
      <pre className="overflow-x-auto rounded bg-slate-100 p-2 text-xs">
        name,sku,costPrice,sellingPrice,reorderLevel,unit,initialStock{"\n"}Atta 1kg,ATTA-002,55,75,100,pcs,50
      </pre>
      <ErrorBox message={error} />
      <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Button onClick={upload} disabled={!file} loading={uploading}>Upload</Button>

      {result && (
        <div>
          <SuccessBox message={`Imported ${result.imported} products. Failed: ${result.failed}`} />
          {result.errors.map((err) => (
            <p key={err.row} className="text-xs text-red-600">
              Row {err.row} {err.sku ? `(${err.sku})` : ""}: {err.reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
