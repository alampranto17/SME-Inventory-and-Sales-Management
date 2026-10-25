"use client";

// The frame around every logged-in page: sidebar + top bar.
// It also PROTECTS the pages: no user -> go to /login.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS, isManagerOrUp, isOwner, isSuperAdmin } from "@/lib/roles";
import { usePusherStatus } from "@/hooks/usePusherStatus";
import NotificationBell from "./NotificationBell";
import type { User } from "@/lib/types";

type NavItem = { href: string; label: string; show: (user: User) => boolean };

// show = which roles can see this menu item
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", show: (u) => !isSuperAdmin(u) },
  { href: "/pos", label: "New Sale (POS)", show: (u) => !isSuperAdmin(u) },
  { href: "/orders", label: "Orders", show: (u) => !isSuperAdmin(u) },
  { href: "/products", label: "Products", show: (u) => !isSuperAdmin(u) },
  { href: "/categories", label: "Categories", show: (u) => !isSuperAdmin(u) },
  { href: "/inventory", label: "Inventory", show: (u) => !isSuperAdmin(u) },
  { href: "/customers", label: "Customers", show: (u) => !isSuperAdmin(u) },
  { href: "/suppliers", label: "Suppliers", show: (u) => !isSuperAdmin(u) },
  { href: "/purchase-orders", label: "Purchase Orders", show: isManagerOrUp },
  { href: "/reports", label: "Reports", show: isManagerOrUp },
  { href: "/users", label: "Team", show: isOwner },
  { href: "/my-subscription", label: "My Subscription", show: isOwner },
  { href: "/tenants", label: "Shops", show: isSuperAdmin },
  { href: "/subscriptions", label: "Billing", show: isSuperAdmin },
  { href: "/notifications", label: "Notifications", show: (u) => !isSuperAdmin(u) },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pusherStatus = usePusherStatus();
  const [menuOpen, setMenuOpen] = useState(false);

  // not logged in -> login page
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return <p className="p-8 text-center text-sm text-slate-500">Loading...</p>;
  }

  const links = NAV_ITEMS.filter((item) => item.show(user));

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Sidebar ── (hidden on phones until you tap ☰) */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-base font-bold text-indigo-600">SME Inventory</p>
          <p className="truncate text-xs text-slate-500">{user.companyName ?? "Platform admin"}</p>
        </div>
        <nav className="p-2">
          {links.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm ${active ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-700 hover:bg-slate-100"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* dark background behind the open menu on phones */}
      {menuOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setMenuOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Top bar ── */}
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
          <button className="rounded-md p-2 text-xl md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            ☰
          </button>

          <div className="ml-auto flex items-center gap-3">
            {/* realtime status dot */}
            <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex" title={`Pusher: ${pusherStatus}`}>
              <span className={`h-2 w-2 rounded-full ${pusherStatus === "connected" ? "bg-green-500" : "bg-slate-300"}`} />
              {pusherStatus === "connected" ? "Live" : pusherStatus === "off" ? "Realtime off" : pusherStatus}
            </span>

            {/* super admin has no shop, so no shop notifications */}
            {!isSuperAdmin(user) && <NotificationBell />}

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{user.fullName}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
            </div>
            <button onClick={logout} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              Logout
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
