import { Role, UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: Role;
  status: UserStatus;
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  avatarUrl?: string | null;
  locale?: string;
  timezone?: string;
}
