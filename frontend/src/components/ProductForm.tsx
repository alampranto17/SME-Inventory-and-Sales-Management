"use client";

// Form for CREATE and EDIT product.
// - no `product` prop  -> create (POST /products)
// - with `product`     -> edit   (PATCH /products/:id)
import { useState } from "react";
import { apiPatch, apiPost, getErrorMessage } from "@/lib/api";
import { checkImageFile, uploadProductImage } from "@/lib/uploadImage";
import ProductImage from "@/components/ProductImage";
import { useFetch } from "@/hooks/useFetch";
import { Button, ErrorBox, Input, Select } from "@/components/ui";
import type { Category, Product } from "@/lib/types";

type Props = {
  product?: Product;
  onSaved: () => void;
};

export default function ProductForm({ product, onSaved }: Props) {
  const isEdit = Boolean(product);
  const { data: categories } = useFetch<Category[]>("/categories");

  // form values are strings (that's what <input> gives us)
  const [form, setForm] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    categoryId: product?.categoryId ?? "",
    costPrice: product?.costPrice ?? "",
    sellingPrice: product?.sellingPrice ?? "",
    reorderLevel: product ? String(product.reorderLevel) : "10",
    unit: product?.unit ?? "pcs",
    initialStock: "0",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // the photo the user picked (not uploaded yet) + a preview link for it
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setPhoto(file);
    // URL.createObjectURL -> a temporary link so we can show the photo right away
    setPreview(URL.createObjectURL(file));
  }

  function update(field: keyof typeof form, value: string) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    // convert strings -> numbers for the API
    const body: Record<string, unknown> = {
      name: form.name,
      sku: form.sku,
      barcode: form.barcode || undefined,
      categoryId: form.categoryId || null,
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      reorderLevel: Number(form.reorderLevel),
      unit: form.unit,
    };

    try {
      // 1. save the product (JSON)
      let productId = product?.id;
      if (isEdit) {
        await apiPatch(`/products/${productId}`, body);
      } else {
        body.initialStock = Number(form.initialStock);
        const created = await apiPost<Product>("/products", body);
        productId = created.id;
      }

      // 2. then upload the photo (a file can't go inside JSON)
      if (photo && productId) {
        await uploadProductImage(productId, photo);
      }

      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ErrorBox message={error} />

      {/* ── photo ── */}
      <div className="flex items-center gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="h-16 w-16 rounded-md object-cover" />
        ) : (
          <ProductImage imageUrl={product?.imageUrl} name={form.name || "?"} size={64} />
        )}
        <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          {preview || product?.imageUrl ? "Change photo" : "Add photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
        </label>
        <span className="text-xs text-slate-500">JPG, PNG or WEBP · max 5 MB</span>
      </div>

      <Input label="Name *" required value={form.name} onChange={(e) => update("name", e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="SKU *" required value={form.sku} onChange={(e) => update("sku", e.target.value)} />
        <Input label="Barcode" value={form.barcode} onChange={(e) => update("barcode", e.target.value)} />
      </div>
      <Select label="Category" value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)}>
        <option value="">— No category —</option>
        {categories?.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Cost price *" type="number" step="0.01" min="0" required value={form.costPrice} onChange={(e) => update("costPrice", e.target.value)} />
        <Input label="Selling price *" type="number" step="0.01" min="0.01" required value={form.sellingPrice} onChange={(e) => update("sellingPrice", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Reorder level *" type="number" min="0" required value={form.reorderLevel} onChange={(e) => update("reorderLevel", e.target.value)} />
        <Select label="Unit *" value={form.unit} onChange={(e) => update("unit", e.target.value)}>
          <option value="pcs">pcs</option>
          <option value="kg">kg</option>
          <option value="litre">litre</option>
          <option value="box">box</option>
        </Select>
      </div>
      {!isEdit && (
        <Input label="Starting stock (goes to main warehouse)" type="number" min="0" value={form.initialStock} onChange={(e) => update("initialStock", e.target.value)} />
      )}
      <Button type="submit" loading={saving} className="w-full">
        {isEdit ? "Save changes" : "Create product"}
      </Button>
    </form>
  );
}
