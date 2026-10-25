"use client";

// Super admin dashboard: every shop (company) that uses the app.
// Here the super admin creates a new shop + its owner.
// The owner then logs in and adds his own employees on the "Team" page.
import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { api, apiPatch, apiPost, getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, CHART_COLORS } from "@/components/charts/chartColors";
import {
  Badge, Button, Card, ErrorBox, Input, Loading, Modal, PageHeader, Select, SuccessBox,
  tableClass, tdClass, thClass,
} from "@/components/ui";

type Plan = "STARTER" | "GROWTH" | "ENTERPRISE";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  status: "ACTIVE" | "SUSPENDED" | "CANCELLED";
  createdAt: string;
  owner: { fullName: string; email: string } | null;
  userCount: number;
};

export default function TenantsPage() {
  const { data: tenants, loading, error, reload } = useFetch<Tenant[]>("/tenants");
  const [showCreate, setShowCreate] = useState(false);
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  async function suspend(slug: string) {
    if (!confirm("Suspend this shop? Nobody in it will be able to log in.")) return;
    try {
      await api.post(`/tenants/${slug}/suspend`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  async function activate(slug: string) {
    try {
      await apiPatch(`/tenants/${slug}`, { status: "ACTIVE" });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  // graph data: how many shops on each plan
  const plans: Plan[] = ["STARTER", "GROWTH", "ENTERPRISE"];
  const planData = plans.map((plan) => ({
    plan,
    shops: tenants?.filter((t) => t.plan === plan).length ?? 0,
  }));

  return (
    <div>
      <PageHeader title="Shops" subtitle={`${tenants?.length ?? 0} shops use the platform.`}>
        <Button onClick={() => setShowCreate(true)}>+ Add shop</Button>
      </PageHeader>

      <ErrorBox message={error || actionError} />
      <SuccessBox message={success} />

      <Card title="Shops per plan" className="mb-6">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={planData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="plan" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
              <Tooltip cursor={{ fill: "#f1f5f9" }} />
              <Bar dataKey="shops" name="Shops" fill={CHART_COLORS.series1} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="All shops">
        {loading && !tenants ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Shop</th>
                  <th className={thClass}>Owner</th>
                  <th className={thClass}>People</th>
                  <th className={thClass}>Plan</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Joined</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {tenants?.map((t) => (
                  <tr key={t.id}>
                    <td className={tdClass}>
                      <p className="font-medium text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.slug}</p>
                    </td>
                    <td className={tdClass}>
                      {t.owner ? (
                        <>
                          <p>{t.owner.fullName}</p>
                          <p className="text-xs text-slate-500">{t.owner.email}</p>
                        </>
                      ) : (
                        <span className="text-slate-400">No owner</span>
                      )}
                    </td>
                    <td className={tdClass}>{t.userCount}</td>
                    <td className={tdClass}>{t.plan}</td>
                    <td className={tdClass}><Badge value={t.status === "ACTIVE" ? "ok" : "low"} label={t.status} /></td>
                    <td className={tdClass}>{formatDate(t.createdAt)}</td>
                    <td className={`${tdClass} text-right`}>
                      {t.status === "ACTIVE" ? (
                        <button onClick={() => suspend(t.slug)} className="text-sm text-red-600 hover:underline">Suspend</button>
                      ) : (
                        <button onClick={() => activate(t.slug)} className="text-sm text-indigo-600 hover:underline">Activate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showCreate} title="Add a new shop" onClose={() => setShowCreate(false)}>
        <ShopForm
          onDone={(message) => {
            setShowCreate(false);
            setSuccess(message);
            reload();
          }}
        />
      </Modal>
    </div>
  );
}

// ── form: shop details + owner account ──
function ShopForm({ onDone }: { onDone: (message: string) => void }) {
  const [form, setForm] = useState({
    shopName: "",
    plan: "STARTER",
    ownerFullName: "",
    ownerEmail: "",
    ownerPhone: "",
    ownerPassword: "",
  });
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
      // one call creates: shop + main warehouse + owner account
      await apiPost("/tenants/create-with-owner", {
        ...form,
        ownerPhone: form.ownerPhone || undefined,
      });
      onDone(
        `"${form.shopName}" is ready. The owner can log in with ${form.ownerEmail} and the password you set.`,
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ErrorBox message={error} />

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shop</p>
      <Input label="Shop name *" required value={form.shopName} onChange={(e) => update("shopName", e.target.value)} />
      <Select label="Plan" value={form.plan} onChange={(e) => update("plan", e.target.value)}>
        <option value="STARTER">Starter</option>
        <option value="GROWTH">Growth</option>
        <option value="ENTERPRISE">Enterprise</option>
      </Select>

      <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Shop owner (login account)</p>
      <Input label="Owner full name * (letters only)" required value={form.ownerFullName} onChange={(e) => update("ownerFullName", e.target.value)} />
      <Input label="Owner email *" type="email" required value={form.ownerEmail} onChange={(e) => update("ownerEmail", e.target.value)} />
      <Input label="Owner phone (01XXXXXXXXX)" value={form.ownerPhone} onChange={(e) => update("ownerPhone", e.target.value)} />
      <Input label="Owner password *" type="password" required value={form.ownerPassword} onChange={(e) => update("ownerPassword", e.target.value)} />
      <p className="text-xs text-slate-500">Min 8 characters with uppercase, lowercase, number and a special character (@$!%*?&).</p>

      <Button type="submit" loading={saving} className="w-full">Create shop + owner</Button>
    </form>
  );
}
