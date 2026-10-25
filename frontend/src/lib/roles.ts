// Same role rules as the backend (backend/src/common/constants/roles.constants.ts)
// We use them to HIDE buttons the user can't use.
// (The backend still checks everything — hiding is only for a nicer UI.)
import type { Role, User } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  business_admin: "Owner",
  warehouse_manager: "Manager",
  sales_staff: "Staff",
};

export function isOwner(user: User | null) {
  return user?.role === "business_admin";
}

// Owner or Manager
export function isManagerOrUp(user: User | null) {
  return user?.role === "business_admin" || user?.role === "warehouse_manager";
}

export function isSuperAdmin(user: User | null) {
  return user?.role === "super_admin";
}
