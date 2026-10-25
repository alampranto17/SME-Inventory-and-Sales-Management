// Saves the login tokens + user in the browser's localStorage,
// so the user stays logged in after a page refresh.
import type { User } from "./types";

const ACCESS_KEY = "sme_access_token";
const REFRESH_KEY = "sme_refresh_token";
const USER_KEY = "sme_user";

export function saveLogin(accessToken: string, refreshToken: string, user?: User) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getSavedUser(): User | null {
  const text = localStorage.getItem(USER_KEY);
  return text ? (JSON.parse(text) as User) : null;
}

export function clearLogin() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
