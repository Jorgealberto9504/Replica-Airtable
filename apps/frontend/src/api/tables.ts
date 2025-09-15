import { getJSON, postJSON, API_URL } from './http';

export type TabItem = { id: number; name: string; position: number };

// === NAV ===
export function listTabs(baseId: number) {
  return getJSON<{ ok: boolean; tabs: TabItem[] }>(`/bases/${baseId}/tables/nav`);
}

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

// === CRUD ===
export function createTable(baseId: number, name: string) {
  return postJSON<{ ok: boolean; table: { id: number; name: string } }>(
    `/bases/${baseId}/tables`,
    { name }
  );
}

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

// === META GRID (7.3.4) ===
export type GridColumnMeta = {
  id: string;
  key: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'DATETIME' | string;
  width?: number;
  position?: number;
};

export async function getTableMeta(baseId: number, tableId: number) {
  const res = await fetch(`${API_URL}/bases/${baseId}/tables/${tableId}/meta`, {
    credentials: 'include',
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const b = await res.json();
      if (b?.error) msg = b.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<{ ok: boolean; meta: { columns: GridColumnMeta[] } }>;
}

