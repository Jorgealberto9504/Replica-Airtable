// apps/frontend/src/api/auth.ts
import { getJSON, postJSON } from './http';

export type MeResp = {
  ok: boolean;
  user?: {
    id: number;
    email: string;
    fullName: string;
    platformRole: 'USER' | 'SYSADMIN';
    mustChangePassword: boolean;
  };
};

export function fetchMe() {
  return getJSON<MeResp>('/auth/me');
}

export function doLogout() {
  return postJSON<{ ok: boolean }>('/auth/logout', {});
}

export function adminRegisterUser(input: {
  email: string;
  fullName: string;
  tempPassword: string;
  platformRole?: 'USER' | 'SYSADMIN';
}) {
  return postJSON<{ ok: boolean; user?: any }>('/auth/admin/register', input);
}