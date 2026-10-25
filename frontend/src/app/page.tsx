"use client";

// "/" -> send the user to the right place
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.role === "super_admin") router.replace("/tenants");
    else router.replace("/dashboard");
  }, [ready, user, router]);

  return <p className="p-8 text-center text-sm text-slate-500">Loading...</p>;
}
