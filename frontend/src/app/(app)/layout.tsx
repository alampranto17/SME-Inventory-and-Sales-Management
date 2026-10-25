// The "(app)" folder is a ROUTE GROUP: the brackets mean it is NOT part
// of the url. /dashboard is app/(app)/dashboard/page.tsx
//
// Every page inside this folder gets the sidebar + top bar + login check.
import AppShell from "@/components/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
