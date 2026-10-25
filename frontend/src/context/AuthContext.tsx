"use client";

// ─────────────────────────────────────────────
// AuthContext = the logged-in user, available in EVERY component.
//
//   const { user, login, logout } = useAuth();
// ─────────────────────────────────────────────
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiPost } from "@/lib/api";
import { clearLogin, getSavedUser, saveLogin } from "@/lib/authStorage";
import { disconnectPusher } from "@/lib/pusher";
import type { User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  ready: boolean; // false while we read localStorage on first load
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // 1. on first load: is someone already logged in?
  //    (localStorage only exists in the browser, so we read it in useEffect)
  useEffect(() => {
    // reading from the browser once on load is a normal reason to set state in an effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getSavedUser());
    setReady(true);
  }, []);

  // 2. login -> save tokens -> go to dashboard
  async function login(email: string, password: string) {
    const data = await apiPost<LoginResponse>("/auth/login", { email, password });
    saveLogin(data.accessToken, data.refreshToken, data.user);
    setUser(data.user);
    router.push(data.user.role === "super_admin" ? "/tenants" : "/dashboard");
  }

  // 3. logout -> tell backend -> clear everything -> go to login page
  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // even if the server call fails we still log out locally
    }
    clearLogin();
    disconnectPusher();
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}
