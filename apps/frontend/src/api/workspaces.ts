// apps/frontend/src/api/workspaces.ts
import { getJSON, postJSON } from './http';

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