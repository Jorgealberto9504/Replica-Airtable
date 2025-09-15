// apps/frontend/src/api/users.ts
import { getJSON, postJSON, patchJSON } from './http';

export type PlatformRole = 'USER' | 'SYSADMIN';

export type AdminUser = {
  id: number;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  isActive: boolean;
  canCreateBases: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  passwordUpdatedAt?: string | null;
};

export type UsersListResponse = {
  ok: boolean;
  users: AdminUser[];
  page: number;
  limit: number;
  total: number;
};

// GET /users/admin?page=&limit=&q=
export async function listUsersAdmin(params?: { page?: number; limit?: number; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.q) qs.set('q', params.q);
  const url = `/users/admin${qs.toString() ? `?${qs.toString()}` : ''}`;
  return getJSON<UsersListResponse>(url);
}

// GET /users/admin/:id
export function getUserAdmin(id: number) {
  return getJSON<{ ok: boolean; user: AdminUser }>(`/users/admin/${id}`);
}

// PATCH /users/admin/:id
export function updateUserAdmin(
  id: number,
  patch: Partial<Pick<AdminUser, 'fullName' | 'platformRole' | 'isActive' | 'canCreateBases' | 'mustChangePassword'>>
) {
  return patchJSON<{ ok: boolean; user: AdminUser }>(`/users/admin/${id}`, patch);
}

// POST /users/admin/:id/reset-password { newPassword }
export function resetUserPasswordAdmin(id: number, newPassword = 'Aa12345!') {
  return postJSON<{ ok: boolean }>(`/users/admin/${id}/reset-password`, { newPassword });
}