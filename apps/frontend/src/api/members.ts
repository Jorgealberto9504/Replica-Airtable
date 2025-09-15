// -----------------------------------------------------------------------------
// Endpoints de miembros de base (frontend)
// -----------------------------------------------------------------------------
import { getJSON, postJSON, API_URL } from './http';

export type MembershipRole = 'VIEWER' | 'COMMENTER' | 'EDITOR';

export type MemberRow = {
  id: number; // <-- ESTE ES EL membershipId (NO el userId)
  role: MembershipRole;
  user: {
    id: number;
    fullName: string;
    email: string;
  };
};

export async function listMembers(baseId: number) {
  return getJSON<{ ok: boolean; members: MemberRow[] }>(`/bases/${baseId}/members`);
}

export async function inviteMember(
  baseId: number,
  input: { email: string; role: MembershipRole }
) {
  return postJSON<{ ok: boolean }>(`/bases/${baseId}/members`, input);
}

export async function updateMemberRole(
  baseId: number,
  memberId: number,
  role: MembershipRole
) {
  // <-- IMPORTANTE: el backend espera PATCH /bases/:baseId/members/:memberId { role }
  const res = await fetch(`${API_URL}/bases/${baseId}/members/${memberId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
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

export async function removeMember(baseId: number, memberId: number) {
  const res = await fetch(`${API_URL}/bases/${baseId}/members/${memberId}`, {
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