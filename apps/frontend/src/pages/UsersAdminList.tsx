// apps/frontend/src/pages/UsersAdminList.tsx
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import { useAuth } from '../auth/AuthContext';
import { listUsersAdmin, updateUserAdmin, resetUserPasswordAdmin } from '../api/users';
import type { AdminUser } from '../api/users';
import { confirmToast } from '../ui/confirmToast';

export default function UsersAdminList() {
  const { user: me, logout } = useAuth();

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  const [rows, setRows] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const isAdmin = me?.platformRole === 'SYSADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      try {
        const r = await listUsersAdmin({ page, limit, q });
        setRows(r.users || []);
        setTotal(r.total || 0);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, page, limit, q]);

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

  function openEditFor(u: AdminUser) {
    setEditing({ ...u });
    setOpenEdit(true);
  }

  async function saveEdit() {
    if (!editing) return;
    await updateUserAdmin(editing.id, {
      fullName: editing.fullName,
      platformRole: editing.platformRole,
      isActive: editing.isActive,
      canCreateBases: editing.canCreateBases,
    });
    setOpenEdit(false);
    const r = await listUsersAdmin({ page, limit, q });
    setRows(r.users || []);
    setTotal(r.total || 0);

    await confirmToast({
      title: 'Usuario actualizado',
      body: <>Los cambios se guardaron correctamente.</>,
      confirmOnly: true,
      variant: 'success',
      confirmText: 'Entendido',
    });
  }

  async function doResetPassword() {
    if (!editing) return;
    await resetUserPasswordAdmin(editing.id);

    await confirmToast({
      title: 'Contraseña restablecida',
      body: <>Se generó la contraseña temporal <b>Aa12345!</b>. Se pedirá cambiarla al iniciar sesión.</>,
      confirmOnly: true,
      variant: 'success',
      confirmText: 'Entendido',
    });
  }

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Header
        user={me ?? undefined}
        onLogout={logout}
        searchBox={{
          value: q,
          onChange: (value: string) => { setPage(1); setQ(value); },
          placeholder: 'Buscar usuarios…',
        }}
      />

      <main className="content">
        <div className="list-toolbar mt-5 gap-2">
          <h2 className="section-title m-0 flex-1">Gestionar usuarios</h2>
          <select
            className="select"
            value={limit}
            onChange={e => { setPage(1); setLimit(Number(e.target.value)); }}
          >
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
          </select>
        </div>

        {loading ? (
          <div className="card">Cargando…</div>
        ) : rows.length === 0 ? (
          <div className="card">No hay usuarios para mostrar.</div>
        ) : (
          <div className="bases-grid">
            {rows.map(u => (
              <div key={u.id} className="base-card">
                <div className="base-card-head">
                  <div className="base-card-title">{u.fullName || 'Usuario'}</div>
                </div>
                <div className="base-card-meta">
                  {u.email} · Rol: <b>{u.platformRole}</b> · Estado: <b>{u.isActive ? 'Activo' : 'Inactivo'}</b>
                  {u.canCreateBases ? ' · Creador' : ''}
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="btn" onClick={() => openEditFor(u)}>Editar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pagination mt-3">
          <button className="btn" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>Anterior</button>
          <span className="px-2">Página {page} de {pages}</span>
          <button className="btn" disabled={page>=pages} onClick={() => setPage(p => Math.min(pages, p+1))}>Siguiente</button>
        </div>
      </main>

      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Editar usuario">
        {!editing ? null : (
          <>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="muted">Nombre completo</span>
                <input
                  className="input"
                  value={editing.fullName || ''}
                  onChange={e => setEditing({ ...editing, fullName: e.target.value })}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="muted">Email (no editable)</span>
                <input className="input" value={editing.email} disabled />
              </label>

              <label className="grid gap-1.5">
                <span className="muted">Rol de plataforma</span>
                <select
                  className="select"
                  value={editing.platformRole}
                  onChange={e => setEditing({ ...editing, platformRole: e.target.value as any })}
                >
                  <option value="USER">USER</option>
                  <option value="SYSADMIN">SYSADMIN</option>
                </select>
              </label>

              <div className="flex items-center gap-4 pt-6">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!editing.isActive}
                    onChange={e => setEditing({ ...editing, isActive: e.target.checked })}
                  /> Activo
                </label>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!editing.canCreateBases}
                    onChange={e => setEditing({ ...editing, canCreateBases: e.target.checked })}
                  /> Puede crear bases
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn" onClick={() => setOpenEdit(false)}>Cancelar</button>
              <button className="btn-danger" onClick={doResetPassword}>Resetear contraseña…</button>
              <button className="btn-primary" onClick={saveEdit}>Guardar</button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}