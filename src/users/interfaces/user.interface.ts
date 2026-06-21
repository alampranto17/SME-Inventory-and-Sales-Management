import { UserRole } from '../enums/userRole.enum';

export interface user {
  fullname: string;
  email: string;
  phone?: string;
  tenantSlug?: string;
  role: UserRole;
  isActive: boolean;
}
