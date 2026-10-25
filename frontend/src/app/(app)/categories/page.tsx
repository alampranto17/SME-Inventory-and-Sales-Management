"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { apiDelete, apiPost, getErrorMessage } from "@/lib/api";
import { isManagerOrUp } from "@/lib/roles";
import {
  Button, Card, Empty, ErrorBox, Input, Loading, PageHeader, Select, tableClass, tdClass, thClass,
} from "@/components/ui";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const { user } = useAuth();
  const canEdit = isManagerOrUp(user);
  const { data: categories, loading, error, reload } = useFetch<Category[]>("/categories");

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await apiPost("/categories", { name, parentId: parentId || undefined });
      setName("");
      setParentId("");
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this category? Products in it will have no category.")) return;
    try {
      await apiDelete(`/categories/${id}`);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  // find the parent name for the table
  const nameOf = (id: string | null) => categories?.find((c) => c.id === id)?.name ?? "-";

  return (
    <div>
      <PageHeader title="Categories" subtitle="Group your products. Use a parent to make sub-categories." />

      <div className="grid gap-6 lg:grid-cols-3">
        {canEdit && (
          <Card title="Add category">
            <form onSubmit={addCategory} className="space-y-3">
              <ErrorBox message={formError} />
              <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
              <Select label="Parent (optional)" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">— none —</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <Button type="submit" loading={saving} className="w-full">Add</Button>
            </form>
          </Card>
        )}

        <Card title="All categories" className={canEdit ? "lg:col-span-2" : "lg:col-span-3"}>
          <ErrorBox message={error} />
          {loading && !categories ? (
            <Loading />
          ) : categories?.length ? (
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Parent</th>
                  {canEdit && <th className={thClass}></th>}
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className={tdClass}>{c.name}</td>
                    <td className={tdClass}>{nameOf(c.parentId)}</td>
                    {canEdit && (
                      <td className={`${tdClass} text-right`}>
                        <button onClick={() => remove(c.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty />
          )}
        </Card>
      </div>
    </div>
  );
}
