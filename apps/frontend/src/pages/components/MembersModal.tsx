// apps/frontend/src/pages/components/MembersModal.tsx
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
  open: boolean;
  onClose: () => void;
};

const ROLES: MembershipRole[] = ['VIEWER', 'COMMENTER', 'EDITOR'];

export default function MembersModal({ baseId, open, onClose }: Props) {
  const [items, setItems] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // invitación
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MembershipRole>('EDITOR');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await listMembers(baseId);
        setItems(r.members);
      } catch (e: any) {
        setErr(e?.message ?? 'No se pudieron cargar los miembros');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, baseId]);

  async function handleInvite() {
    setInviting(true);
    setErr(null);
    try {
      await inviteMember(baseId, { email: email.trim(), role: inviteRole });
      setEmail('');
      const r = await listMembers(baseId);
      setItems(r.members);
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo invitar');
    } finally {
      setInviting(false);
    }
  }

  async function handleChangeRole(memberId: number, role: MembershipRole) {
    setErr(null);
    try {
      await updateMemberRole(baseId, memberId, role);
      setItems(cur =>
        cur.map(m => (m.id === memberId ? { ...m, role } as MemberRow : m))
      );
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo cambiar el rol');
    }
  }

  async function handleRemove(memberId: number) {
    setErr(null);
    try {
      await removeMember(baseId, memberId);
      setItems(cur => cur.filter(m => m.id !== memberId));
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo quitar el miembro');
    }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Miembros</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {err && <div className="alert error" style={{ marginBottom: 12 }}>{err}</div>}

        {/* Invitar */}
        <div className="invite-row">
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input"
          />
          <select
            className="select"
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value as MembershipRole)}
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="btn primary" onClick={handleInvite} disabled={inviting || !email}>
            {inviting ? 'Invitando…' : 'Invitar'}
          </button>
        </div>

        {/* Lista de miembros */}
        <div className="members-list">
          {loading ? (
            <div style={{ color: '#6b7280' }}>Cargando…</div>
          ) : items.length === 0 ? (
            <div style={{ color: '#9ca3af' }}>No hay miembros</div>
          ) : (
            items.map(m => (
              <div key={m.id} className="member-row">
                <div className="member-user">
                  <div className="member-name">{m.user.fullName}</div>
                  <div className="member-email">{m.user.email}</div>
                </div>
                <div className="member-actions">
                  <select
                    className="select"
                    value={m.role}
                    onChange={e => handleChangeRole(m.id, e.target.value as MembershipRole)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button className="btn danger" onClick={() => handleRemove(m.id)}>
                    Quitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}