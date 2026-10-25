"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { apiDelete, apiPost, getErrorMessage } from "@/lib/api";
import { isManagerOrUp } from "@/lib/roles";
import {
  Button, Card, Empty, ErrorBox, Input, Loading, Modal, PageHeader, tableClass, tdClass, thClass,
} from "@/components/ui";
import type { Supplier } from "@/lib/types";

export default function SuppliersPage() {
  const { user } = useAuth();
  const canEdit = isManagerOrUp(user);
  const { data, loading, error, reload } = useFetch<Supplier[]>("/suppliers");
  const [showCreate, setShowCreate] = useState(false);

  async function remove(id: string) {
    if (!confirm("Deactivate this supplier?")) return;
    await apiDelete(`/suppliers/${id}`);
    reload();
  }

  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Companies you buy stock from.">
        {canEdit && <Button onClick={() => setShowCreate(true)}>+ Add supplier</Button>}
      </PageHeader>

      <Card>
        <ErrorBox message={error} />
        {loading && !data ? (
          <Loading />
        ) : data?.length ? (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Contact person</th>
                  <th className={thClass}>Phone</th>
                  <th className={thClass}>Email</th>
                  {canEdit && <th className={thClass}></th>}
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.id}>
                    <td className={`${tdClass} font-medium`}>{s.name}</td>
                    <td className={tdClass}>{s.contactPerson ?? "-"}</td>
                    <td className={tdClass}>{s.phone ?? "-"}</td>
                    <td className={tdClass}>{s.email ?? "-"}</td>
                    {canEdit && (
                      <td className={`${tdClass} text-right`}>
                        <button onClick={() => remove(s.id)} className="text-sm text-red-600 hover:underline">Remove</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No suppliers yet." />
        )}
      </Card>

      <Modal open={showCreate} title="Add supplier" onClose={() => setShowCreate(false)}>
        <SupplierForm onDone={() => { setShowCreate(false); reload(); }} />
      </Modal>
    </div>
  );
}

function SupplierForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: "", contactPerson: "", phone: "", email: "", address: "" });
  const [error, setError] = useState("");

  function update(field: keyof typeof form, value: string) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // remove empty fields: { name: "A", phone: "" } -> { name: "A" }
      const body = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ""));
      await apiPost("/suppliers", body);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ErrorBox message={error} />
      <Input label="Name *" required value={form.name} onChange={(e) => update("name", e.target.value)} />
      <Input label="Contact person" value={form.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} />
      <Input label="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
      <Input label="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
      <Input label="Address" value={form.address} onChange={(e) => update("address", e.target.value)} />
      <Button type="submit" className="w-full">Save</Button>
    </form>
  );
}
