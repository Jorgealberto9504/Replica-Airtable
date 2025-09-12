// apps/frontend/src/api/trash.ts
import { getJSON, postJSON, API_URL, HTTPError } from './http';

/* ======= BASES (owner) ======= */
// GET /bases/trash
export function listMyTrashedBases() {
  return getJSON<{ ok: boolean; bases: Array<{ id:number; name:string; visibility:'PUBLIC'|'PRIVATE'; ownerId:number; workspaceId:number; trashedAt?:string }> }>(
    '/bases/trash'
  );
}
// POST /bases/trash/empty
export function emptyMyBaseTrash() {
  return postJSON<{ ok: boolean }>('/bases/trash/empty', {});
}
// POST /bases/:baseId/restore
export function restoreBase(baseId: number) {
  return postJSON<{ ok: boolean; base: any }>(`/bases/${baseId}/restore`, {});
}
// DELETE /bases/:baseId/permanent
export async function deleteBasePermanent(baseId: number) {
  const res = await fetch(`${API_URL}/bases/${baseId}/permanent`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const b = await res.json(); if (b?.error) msg = b.error; } catch {}
    throw new Error(msg);
  }
  return { ok: true } as const;
}

/* ======= TABLAS (owner) ======= */
// GET /bases/:baseId/tables/trash
export function listTrashedTablesForBase(baseId: number) {
  return getJSON<{ ok: boolean; tables: Array<{ id:number; name:string; trashedAt?:string }> }>(
    `/bases/${baseId}/tables/trash`
  );
}
// POST /bases/:baseId/tables/trash/empty
export function emptyTableTrash(baseId: number) {
  return postJSON<{ ok: boolean }>(`/bases/${baseId}/tables/trash/empty`, {});
}
// POST /bases/:baseId/tables/:tableId/restore
export function restoreTable(baseId: number, tableId: number) {
  return postJSON<{ ok: boolean; table: any }>(`/bases/${baseId}/tables/${tableId}/restore`, {});
}
// DELETE /bases/:baseId/tables/:tableId/permanent
export async function deleteTablePermanent(baseId: number, tableId: number) {
  const res = await fetch(`${API_URL}/bases/${baseId}/tables/${tableId}/permanent`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const b = await res.json(); if (b?.error) msg = b.error; } catch {}
    throw new Error(msg);
  }
  return { ok: true } as const;
}

/* ======= TABLAS (ADMIN – global) ======= */
export type TrashedTableAdmin = {
  id: number;
  name: string;
  trashedAt?: string;
  base: {
    id: number;
    name: string;
    owner?: { id: number; fullName?: string; email?: string } | null;
  };
};

// GET /bases/admin/tables/trash?ownerId=&baseId=
export function listAllTrashedTablesAdmin(params?: { ownerId?: number; baseId?: number }) {
  const qs = new URLSearchParams();
  if (params?.ownerId) qs.set('ownerId', String(params.ownerId));
  if (params?.baseId) qs.set('baseId', String(params.baseId));
  const url = qs.toString()
    ? `/bases/admin/tables/trash?${qs.toString()}`
    : '/bases/admin/tables/trash';
  return getJSON<{ ok: boolean; tables: TrashedTableAdmin[] }>(url);
}

// POST /bases/admin/:baseId/tables/:tableId/restore
export function restoreTableAdmin(baseId: number, tableId: number) {
  return postJSON<{ ok: boolean; table: any }>(
    `/bases/admin/${baseId}/tables/${tableId}/restore`,
    {}
  );
}

// DELETE /bases/admin/:baseId/tables/:tableId/permanent
export async function deleteTablePermanentAdmin(baseId: number, tableId: number) {
  const res = await fetch(`${API_URL}/bases/admin/${baseId}/tables/${tableId}/permanent`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const b = await res.json(); if (b?.error) msg = b.error; } catch {}
    throw new Error(msg);
  }
  return { ok: true } as const;
}

/* ======= WORKSPACES (owner) — opcional ======= */
export async function listMyTrashedWorkspacesSafe() {
  try {
    return await getJSON<{ ok: boolean; workspaces: Array<{ id:number; name:string; trashedAt?:string }> }>(
      '/workspaces/trash'
    );
  } catch (e: any) {
    if (e instanceof HTTPError && e.status === 404) return { ok: false, workspaces: [] as any[] };
    throw e;
  }
}
export async function restoreWorkspace(workspaceId: number) {
  const res = await postJSON<{ ok: boolean; workspace: any }>(`/workspaces/${workspaceId}/restore`, {});
  return res;
}
export async function deleteWorkspacePermanent(workspaceId: number) {
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/permanent`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const b = await res.json(); if (b?.error) msg = b.error; } catch {}
    throw new Error(msg);
  }
  return { ok: true } as const;
}
export async function emptyWorkspaceTrash() {
  return postJSON<{ ok: boolean }>('/workspaces/trash/empty', {});
}