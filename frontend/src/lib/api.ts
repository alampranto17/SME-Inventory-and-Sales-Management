// ─────────────────────────────────────────────
// All calls to the backend go through this file.
// ─────────────────────────────────────────────
// The backend always answers like:  { statusCode, message, data }
// The helpers below (apiGet, apiPost ...) return only "data",
// so in your pages you can write:
//
//   const products = await apiGet<Paginated<Product>>("/products");
//
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  clearLogin,
  getAccessToken,
  getRefreshToken,
  saveLogin,
} from "./authStorage";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

export const api = axios.create({ baseURL: API_URL });

// 1. Before every request -> add the token to the header
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. After every response -> if the token expired (401),
//    get a new one with the refresh token and try again ONE time.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  // we use plain axios here (not `api`) so this call is not intercepted
  const res = await axios.post(`${API_URL}/auth/refresh`, null, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });

  const { accessToken, refreshToken: newRefreshToken, user } = res.data.data;
  saveLogin(accessToken, newRefreshToken, user);
  return accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // _retry is our own flag: "did we already try to refresh for this request?"
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthCall = original?.url?.startsWith("/auth/");

    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;

      try {
        // if 5 requests fail at the same time, refresh only once
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const newToken = await refreshPromise;
        refreshPromise = null;

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        refreshPromise = null;
        // refresh failed -> log out.
        // (we are outside React here, so we can't use useRouter)
        clearLogin();
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

// ─────────────────────────────────────────────
// Small helpers (return only the "data" part)
// ─────────────────────────────────────────────
export async function apiGet<T>(url: string, params?: object): Promise<T> {
  const res = await api.get(url, { params });
  return res.data.data;
}

export async function apiPost<T>(url: string, body?: object): Promise<T> {
  const res = await api.post(url, body);
  return res.data.data;
}

export async function apiPatch<T>(url: string, body?: object): Promise<T> {
  const res = await api.patch(url, body);
  return res.data.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await api.delete(url);
  return res.data.data;
}

// Turn any error into a message you can show to the user
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Can not reach the server. Is the backend running?";
    return error.response.data?.message ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
