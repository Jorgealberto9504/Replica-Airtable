// -----------------------------------------------------------------------------
// Panel de Miembros (lado derecho en BaseView)
// - Lista miembros
// - Invita (email + rol)
// - Cambia rol
// - Quita miembro
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
  canManage: boolean; // el backend ya valida, esto es solo para UI
};

const ROLES: MembershipRole[] = ['VIEWER', 'COMMENTER', 'EDITOR'];

export default function MembersPanel({ baseId, canManage }: Props) {
  const [items, setItems] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Invitación
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MembershipRole>('EDITOR'); // default

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseId]);

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
      // refresco liviano: actualizo en memoria
      setItems((xs) => xs.map((m) => (m.id === memberId ? { ...m, role } : m)));
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo cambiar el rol');
    }
  }

  async function handleRemove(memberId: number) {
    setErr(null);
    try {
      await removeMember(baseId, memberId);
      setItems((xs) => xs.filter((m) => m.id !== memberId));
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo quitar al miembro');
    }
  }

  return (
    <section className="card" style={{ width: 420, padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Miembros</h3>

      {err && (
        <div className="alert error" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      {/* Invitar */}
      {canManage && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="input"
            placeholder="correo@ejemplo.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="input"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as MembershipRole)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button className="btn primary" onClick={handleInvite}>
            Invitar
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ color: '#6b7280' }}>Cargando…</div>
      ) : items.length === 0 ? (
        <div style={{ color: '#9ca3af' }}>No hay miembros</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((m) => (
            <div
              key={m.id} // <-- key único, evita el warning de React
              style={{
                display: 'grid',
                gridTemplateColumns: canManage ? '1fr auto auto' : '1fr',
                gap: 8,
                alignItems: 'center',
                padding: 8,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{m.user.fullName}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{m.user.email}</div>
              </div>

              {/* Rol */}
              {canManage ? (
                <select
                  className="input"
                  value={m.role}
                  onChange={(e) => handleChangeRole(m.id, e.target.value as MembershipRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: '#f3f4f6',
                    fontSize: 12,
                    justifySelf: 'start',
                  }}
                >
                  {m.role}
                </div>
              )}

              {/* Quitar */}
              {canManage && (
                <button className="btn" onClick={() => handleRemove(m.id)}>
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}