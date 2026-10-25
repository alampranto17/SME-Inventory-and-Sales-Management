"use client";

import { useState } from "react";
import Link from "next/link";
import { useFetch } from "@/hooks/useFetch";
import { apiPost, getErrorMessage } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import {
  Button, Card, Empty, ErrorBox, Input, Loading, Modal, PageHeader, Pagination,
  tableClass, tdClass, thClass,
} from "@/components/ui";
import type { Customer, Paginated } from "@/lib/types";

const LIMIT = 15;

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data, loading, error, reload } = useFetch<Paginated<Customer>>("/customers", {
    search: search || undefined,
    page,
    limit: LIMIT,
  });

  return (
    <div>
      <PageHeader title="Customers" subtitle="People who buy from you, and how much they owe.">
        <Button onClick={() => setShowCreate(true)}>+ Add customer</Button>
      </PageHeader>

      <Card>
        <div className="mb-4 sm:w-72">
          <Input placeholder="Search name or phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
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
                    <th className={thClass}>Phone</th>
                    <th className={thClass}>Email</th>
                    <th className={thClass}>Owes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.id}>
                      <td className={tdClass}>
                        <Link href={`/customers/${c.id}`} className="font-medium text-indigo-600 hover:underline">{c.name}</Link>
                      </td>
                      <td className={tdClass}>{c.phone}</td>
                      <td className={tdClass}>{c.email ?? "-"}</td>
                      <td className={`${tdClass} ${Number(c.balance) > 0 ? "font-medium text-red-600" : ""}`}>{formatMoney(c.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} limit={LIMIT} total={data.total} onChange={setPage} />
          </>
        ) : (
          <Empty text="No customers yet." />
        )}
      </Card>

      <Modal open={showCreate} title="Add customer" onClose={() => setShowCreate(false)}>
        <CustomerForm onDone={() => { setShowCreate(false); reload(); }} />
      </Modal>
    </div>
  );
}

function CustomerForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiPost("/customers", {
        name: form.name,
        phone: form.phone,
        // send empty fields as "undefined" so the backend skips them
        email: form.email || undefined,
        address: form.address || undefined,
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
      <Input label="Name *" required value={form.name} onChange={(e) => update("name", e.target.value)} />
      <Input label="Phone *" required value={form.phone} onChange={(e) => update("phone", e.target.value)} />
      <Input label="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
      <Input label="Address" value={form.address} onChange={(e) => update("address", e.target.value)} />
      <Button type="submit" loading={saving} className="w-full">Save</Button>
    </form>
  );
}
