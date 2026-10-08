import { UserRole } from '../../users/user-role.enum';

export interface JwtUser {
  userId: string;
  email: string;
  role: UserRole;
}
