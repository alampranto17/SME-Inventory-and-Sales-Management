import { UserRole } from '../enums/userRole.enum';

export interface User {
  fullName: string;
  email: string;
  phone?: string;
  tenantSlug?: string;
  password: string;
  role?: UserRole;
  isActive: boolean;
  secretKey?: string;
}
