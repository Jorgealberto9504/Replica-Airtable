// apps/frontend/src/api/auth.ts
import { getJSON, postJSON } from './http';

export type Role = 'USER' | 'SYSADMIN';

export type Me = {
  id: number;
  email: string;
  fullName: string;
  platformRole: Role;
  mustChangePassword?: boolean;
};

export function login(email: string, password: string) {
  return postJSON<{ ok: true; user: Me }>('/auth/login', { email, password });
}

export function me() {
  return getJSON<{ ok: boolean; user: Me }>('/auth/me');
}

export function logout() {
  return postJSON<{ ok: boolean }>('/auth/logout', {});
}

export function adminRegister(body: {
  fullName: string;
  email: string;
  tempPassword: string;
  platformRole: Role;
}) {
  return postJSON<{ ok: true; user: { id: number; email: string; fullName: string } }>(
    '/auth/admin/register',
    body
  );
}