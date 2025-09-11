import { getJSON, postJSON, API_URL } from './http';

export type TabItem = { id: number; name: string; position: number };

// GET /bases/:baseId/tables/nav
export function listTabs(baseId: number) {
  return getJSON<{ ok: boolean; tabs: TabItem[] }>(`/bases/${baseId}/tables/nav`);
}

// PATCH /bases/:baseId/tables/reorder  { orderedIds: number[] }
export async function reorderTabs(baseId: number, orderedIds: number[]) {
  const res = await fetch(`${API_URL}/bases/${baseId}/tables/reorder`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<{ ok: boolean; tabs: TabItem[] }>;
}

// POST /bases/:baseId/tables  { name }
export function createTable(baseId: number, name: string) {
  return postJSON<{ ok: boolean; table: { id: number; name: string } }>(
    `/bases/${baseId}/tables`,
    { name }
  );
}

// PATCH /bases/:baseId/tables/:tableId  { name }
export async function renameTable(baseId: number, tableId: number, name: string) {
  const res = await fetch(`${API_URL}/bases/${baseId}/tables/${tableId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<{ ok: boolean; table: { id: number; name: string } }>;
}

// DELETE /bases/:baseId/tables/:tableId  (soft delete → papelera)
export async function trashTable(baseId: number, tableId: number) {
  const res = await fetch(`${API_URL}/bases/${baseId}/tables/${tableId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return { ok: true } as const;
}