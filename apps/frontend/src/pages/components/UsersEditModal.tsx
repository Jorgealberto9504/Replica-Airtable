import { useEffect, useState } from 'react';
import { getUserAdmin, updateUserAdmin, resetUserPasswordAdmin } from '../../api/users';
import type { AdminUser } from '../../api/users';

type Props = {
  open: boolean;
  userId: number;
  onClose: () => void;
  onSaved: () => void;
};

export default function UsersEditModal({ open, userId, onClose, onSaved }: Props) {
  const [u, setU] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) { setU(null); return; }
    (async () => {
      setLoading(true);
      try {
        const r = await getUserAdmin(userId);
        setU(r.user);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, userId]);

  if (!open) return null;

  async function save() {
    if (!u) return;
    setLoading(true);
    try {
      await updateUserAdmin(u.id, {
        fullName: u.fullName,
        platformRole: u.platformRole,
        isActive: u.isActive,
        canCreateBases: u.canCreateBases,
        mustChangePassword: u.mustChangePassword,
      });
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  async function resetPwd() {
    if (!u) return;
    const np = prompt(`Nueva contraseña para ${u.fullName || u.email}:`);
    if (!np) return;
    await resetUserPasswordAdmin(u.id, np);
    alert('Contraseña actualizada.');
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.35)',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 700, maxWidth: '92vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="list-toolbar" style={{ marginTop: 0 }}>
          <h3 style={{ margin: 0 }}>Editar usuario</h3>
        </div>

        {loading || !u ? (
          <div>Cargando…</div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span className="muted">Nombre completo</span>
                <input className="input" value={u.fullName || ''} onChange={e => setU({ ...u, fullName: e.target.value })} />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span className="muted">Email (no editable)</span>
                <input className="input" value={u.email} disabled />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span className="muted">Rol de plataforma</span>
                <select
                  className="select"
                  value={u.platformRole}
                  onChange={e => setU({ ...u, platformRole: e.target.value as any })}
                >
                  <option value="USER">USER</option>
                  <option value="SYSADMIN">SYSADMIN</option>
                </select>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!u.isActive}
                    onChange={e => setU({ ...u, isActive: e.target.checked })}
                  /> Activo
                </label>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!u.canCreateBases}
                    onChange={e => setU({ ...u, canCreateBases: e.target.checked })}
                  /> Puede crear bases
                </label>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!u.mustChangePassword}
                    onChange={e => setU({ ...u, mustChangePassword: e.target.checked })}
                  /> Forzar cambio de contraseña
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={onClose}>Cancelar</button>
              <button className="btn danger" onClick={resetPwd}>Resetear contraseña…</button>
              <button className="btn primary" onClick={save}>Guardar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}