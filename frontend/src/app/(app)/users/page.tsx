"use client";

// Team page (Owner only): add managers / staff, turn accounts on and off.
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { apiPatch, apiPost, getErrorMessage } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/roles";
import {
  Badge, Button, Card, ErrorBox, Input, Loading, Modal, PageHeader, Select,
  tableClass, tdClass, thClass,
} from "@/components/ui";
import type { Role, User } from "@/lib/types";

export default function UsersPage() {
  const { user: me } = useAuth();
  const { data: users, loading, error, reload } = useFetch<User[]>("/users");
  const [showCreate, setShowCreate] = useState(false);
  const [actionError, setActionError] = useState("");

  async function toggleActive(user: User) {
    setActionError("");
    try {
      await apiPatch(`/users/${user.id}`, { isActive: !user.isActive });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  async function changeRole(user: User, role: Role) {
    setActionError("");
    try {
      await apiPatch(`/users/${user.id}`, { role });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Team" subtitle="People who can log in to your company.">
        <Button onClick={() => setShowCreate(true)}>+ Add team member</Button>
      </PageHeader>

      <Card>
        <ErrorBox message={error || actionError} />
        {loading && !users ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Role</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {users?.map((u) => (
                  <tr key={u.id}>
                    <td className={tdClass}>{u.fullName}{u.id === me?.id && " (you)"}</td>
                    <td className={tdClass}>{u.email}</td>
                    <td className={tdClass}>
                      {u.id === me?.id ? (
                        ROLE_LABELS[u.role]
                      ) : (
                        <select className="rounded border border-slate-300 px-2 py-1 text-sm" value={u.role} onChange={(e) => changeRole(u, e.target.value as Role)}>
                          <option value="business_admin">Owner</option>
                          <option value="warehouse_manager">Manager</option>
                          <option value="sales_staff">Staff</option>
                        </select>
                      )}
                    </td>
                    <td className={tdClass}>
                      <Badge value={u.isActive ? "ok" : "low"} label={u.isActive ? "Active" : "Inactive"} />
                    </td>
                    <td className={`${tdClass} text-right`}>
                      {u.id !== me?.id && (
                        <button onClick={() => toggleActive(u)} className="text-sm text-indigo-600 hover:underline">
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showCreate} title="Add team member" onClose={() => setShowCreate(false)}>
        <UserForm onDone={() => { setShowCreate(false); reload(); }} />
      </Modal>
    </div>
  );
}

function UserForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "sales_staff" });
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
      await apiPost("/users", form);
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
      <Input label="Full name (letters only)" required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
      <Input label="Email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
      <Input label="Password" type="password" required value={form.password} onChange={(e) => update("password", e.target.value)} />
      <p className="text-xs text-slate-500">Uppercase, lowercase, number and a special character (@$!%*?&).</p>
      <Select label="Role" value={form.role} onChange={(e) => update("role", e.target.value)}>
        <option value="sales_staff">Staff — sell, add customers</option>
        <option value="warehouse_manager">Manager — + products, stock, reports</option>
        <option value="business_admin">Owner — everything</option>
      </Select>
      <Button type="submit" loading={saving} className="w-full">Create</Button>
    </form>
  );
}
