"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/api";
import { Button, ErrorBox, Input } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // stop the browser from reloading the page
    setError("");
    setLoading(true);
    try {
      await login(email, password); // AuthContext does the rest
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Log in</h1>
        <p className="mb-5 mt-1 text-sm text-slate-500">SME Inventory & Sales</p>

        <ErrorBox message={error} />

        <div className="space-y-4">
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" loading={loading} className="w-full">
            Log in
          </Button>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Owners, managers, staff and the platform admin all log in here.
          New shop? Contact the platform admin to get your account.
        </p>
      </form>
    </div>
  );
}
