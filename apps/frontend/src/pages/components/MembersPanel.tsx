// apps/frontend/src/pages/components/MembersPanel.tsx
// -----------------------------------------------------------------------------
// Panel de miembros (lado derecho). Sin estilos inline.
// -----------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import {
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  type MemberRow,
  type MembershipRole,
} from '../../api/members';

type Props = {
  baseId: number;
  canManage: boolean;
};

const ROLES: MembershipRole[] = ['VIEWER', 'COMMENTER', 'EDITOR'];

export default function MembersPanel({ baseId, canManage }: Props) {
  const [items, setItems] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MembershipRole>('EDITOR');

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const r = await listMembers(baseId);
      setItems(r.members);
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudieron cargar los miembros');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [baseId]);

  async function handleInvite() {
    setErr(null);
    try {
      await inviteMember(baseId, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo invitar');
    }
  }

  async function handleChangeRole(memberId: number, role: MembershipRole) {
    setErr(null);
    try {
      await updateMemberRole(baseId, memberId, role);
      setItems(xs => xs.map(m => (m.id === memberId ? { ...m, role } : m)));
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo cambiar el rol');
    }
  }

  async function handleRemove(memberId: number) {
    setErr(null);
    try {
      await removeMember(baseId, memberId);
      setItems(xs => xs.filter(m => m.id !== memberId));
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo quitar al miembro');
    }
  }

  return (
    <section className="card members-panel">
      <h3 className="section-title m-0 mb-3">Miembros</h3>

      {err && <div className="alert-error mb-3">{err}</div>}

      {canManage && (
        <div className="invite-row">
          <input
            className="input flex-1"
            placeholder="correo@ejemplo.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <select
            className="select"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as MembershipRole)}
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="btn-primary" onClick={handleInvite}>Invitar</button>
        </div>
      )}

      {loading ? (
        <div className="muted">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="muted">No hay miembros</div>
      ) : (
        <div className="members-list">
          {items.map(m => (
            <div key={m.id} className={`member-row${canManage ? ' has-actions' : ''}`}>
              <div className="member-user">
                <div className="member-name">{m.user.fullName}</div>
                <div className="member-email">{m.user.email}</div>
              </div>

              {canManage ? (
                <>
                  <select
                    className="select"
                    value={m.role}
                    onChange={e => handleChangeRole(m.id, e.target.value as MembershipRole)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button className="btn" onClick={() => handleRemove(m.id)}>Quitar</button>
                </>
              ) : (
                <span className="role-chip">{m.role}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}