import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// What passport puts on request.user for the refresh strategy.
export interface RequestUserWithRefresh extends JwtPayload {
  refreshToken: string;
}
