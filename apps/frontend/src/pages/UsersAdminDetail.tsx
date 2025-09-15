import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { getUserAdmin, updateUserAdmin, resetUserPasswordAdmin } from '../api/users';
import type { AdminUser } from '../api/users';
import { confirmToast } from '../ui/confirmToast'; // 🆕 toast bonito

export default function UsersAdminDetail() {
  const { id } = useParams();
  const userId = Number(id);
  const { user: me, logout } = useAuth();
  const nav = useNavigate();

  const isAdmin = me?.platformRole === 'SYSADMIN';
  const [u, setU] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin || !userId) return;
    (async () => {
      try {
        const r = await getUserAdmin(userId);
        setU(r.user);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, userId]);

  async function save() {
    if (!u) return;
    const r = await updateUserAdmin(u.id, {
      fullName: u.fullName,
      platformRole: u.platformRole,
      isActive: u.isActive,
      canCreateBases: u.canCreateBases,
    });
    setU(r.user);

    // 🆕 reemplaza alert
    await confirmToast({
      title: 'Usuario actualizado',
      body: <>Los cambios se guardaron correctamente.</>,
      confirmOnly: true,
      variant: 'success',
      confirmText: 'Entendido',
    });
  }

  async function resetPwd() {
    if (!u) return;
    await resetUserPasswordAdmin(u.id); // "Aa12345!" por defecto

    // 🆕 reemplaza alert
    await confirmToast({
      title: 'Contraseña restablecida',
      body: <>Se generó la contraseña temporal <b>Aa12345!</b>. Se pedirá cambiarla al iniciar sesión.</>,
      confirmOnly: true,
      variant: 'success',
      confirmText: 'Entendido',
    });
  }

  if (!isAdmin) {
    return (
      <>
        <Header user={me ?? undefined} onLogout={logout} />
        <main className="content">
          <div className="card"><b>403:</b> Solo SYSADMIN puede gestionar usuarios.</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header user={me ?? undefined} onLogout={logout} />
      <main className="content">
        <div className="list-toolbar" style={{ marginTop: 20 }}>
          <h2 style={{ margin: 0 }}>Detalle de usuario</h2>
        </div>

        {loading ? (
          <div className="card">Cargando…</div>
        ) : !u ? (
          <div className="card">Usuario no encontrado.</div>
        ) : (
          <div className="card">
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 26 }}>
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
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => nav('/admin/users')}>Volver</button>
              <button className="btn primary" onClick={save}>Guardar</button>
              <button className="btn danger" onClick={resetPwd}>Resetear contraseña…</button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}