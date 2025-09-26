// apps/frontend/src/pages/components/UsersEditModal.tsx
// -----------------------------------------------------------------------------
// Modal de edición de usuario (sin estilos inline)
// -----------------------------------------------------------------------------
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
      onClose();
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="m-0">Editar usuario</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading || !u ? (
          <div className="modal-body">Cargando…</div>
        ) : (
          <>
            <div className="modal-body grid gap-3 md:grid-cols-2">
              <label className="field">
                <span className="muted">Nombre completo</span>
                <input className="input" value={u.fullName || ''} onChange={e => setU({ ...u, fullName: e.target.value })} />
              </label>

              <label className="field">
                <span className="muted">Email (no editable)</span>
                <input className="input" value={u.email} disabled />
              </label>

              <label className="field">
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

              <div className="flex items-center gap-4">
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

            <div className="modal-footer justify-end">
              <button className="btn" onClick={onClose}>Cancelar</button>
              <button className="btn-danger" onClick={resetPwd}>Resetear contraseña…</button>
              <button className="btn-primary" onClick={save} disabled={loading}>Guardar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}