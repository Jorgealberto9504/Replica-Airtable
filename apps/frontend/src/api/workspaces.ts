// apps/frontend/src/api/workspaces.ts
import { getJSON, postJSON, API_URL } from './http';

/* Tipos que usan los componentes */
export type Workspace = {
  id: number;
  name: string;
  createdAt?: string;
};

export type BaseItem = {
  id: number;
  name: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  workspaceId: number;
  ownerId: number;
  createdAt: string;
  /** opcional: nombre del dueño si el backend lo envía */
  ownerName?: string;
};

/* === Workspaces === */

// GET /workspaces
export function listMyWorkspaces() {
  return getJSON<{ ok: boolean; workspaces: Workspace[] }>('/workspaces');
}

// POST /workspaces  { name }
export function createWorkspace(input: { name: string }) {
  return postJSON<{ ok: boolean; workspace: Workspace }>('/workspaces', input);
}

// PATCH /workspaces/:workspaceId  { name }
export async function updateWorkspace(workspaceId: number, input: { name: string }) {
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const b = await res.json();
      if (b?.error) msg = b.error;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as { ok: boolean; workspace: Workspace };
}

// DELETE /workspaces/:workspaceId (soft delete → papelera)
export async function deleteWorkspace(workspaceId: number) {
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}`, {
    method: 'DELETE',
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
  return { ok: true } as const;
}

export function listAccessibleBases() {
  return getJSON<{ ok: boolean; bases: BaseItem[] }>('/bases');
}

/* === Bases dentro de un workspace === */

// GET /workspaces/:workspaceId/bases
export function listBasesForWorkspace(workspaceId: number) {
  return getJSON<{ ok: boolean; bases: BaseItem[] }>(
    `/workspaces/${workspaceId}/bases`
  );
}

// POST /workspaces/:workspaceId/bases  { name, visibility? }
export function createBaseInWorkspace(
  workspaceId: number,
  input: { name: string; visibility?: 'PUBLIC' | 'PRIVATE' }
) {
  return postJSON<{ ok: boolean; base: BaseItem }>(
    `/workspaces/${workspaceId}/bases`,
    input
  );
}

export type BaseDetail = {
  id: number;
  name: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'SHARED';
};

export async function getBaseDetail(baseId: number) {
  return getJSON<{ ok: boolean; base?: BaseDetail }>(`/bases/${baseId}`);
}