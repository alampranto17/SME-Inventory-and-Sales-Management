import { UserRole } from 'src/users/enums/userRole.enum';

// Role groups so we don't repeat the same list in every controller.
//
// Owner   = BUSINESS_ADMIN
// Manager = WAREHOUSE_MANAGER
// Staff   = SALES_STAFF
//
// Usage:  @Roles(...MANAGER_AND_UP)

// Everyone who belongs to a company (super admin is NOT included,
// because super admin has no tenant / company)
export const ALL_TENANT_ROLES = [
  UserRole.BUSINESS_ADMIN,
  UserRole.WAREHOUSE_MANAGER,
  UserRole.SALES_STAFF,
];

export const MANAGER_AND_UP = [
  UserRole.BUSINESS_ADMIN,
  UserRole.WAREHOUSE_MANAGER,
];

export const OWNER_ONLY = [UserRole.BUSINESS_ADMIN];
