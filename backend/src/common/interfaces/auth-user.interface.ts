import { UserRole } from 'src/users/enums/userRole.enum';

// This is what `@CurrentUser()` gives you inside a controller.
// It comes from the JWT token (see auth/strategies/jwt.strategies.ts)
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string; // company id — use it in EVERY query
  tenantSlug: string | null;
}
