export interface JwtUser {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}
