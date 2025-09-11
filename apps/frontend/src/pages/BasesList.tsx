import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../auth/AuthContext';
import {
  listBases,
  renameBase,
  deleteBase,
  type BaseListItem,
  type BaseVisibility,
} from '../api/bases';
import CreateBaseAnywhereModal from './components/CreateBaseAnywhereModal';

type Pager = { page: number; pageSize: number; total?: number };

export default function BasesList() {
  const { user: me, logout } = useAuth();
  const nav = useNavigate();

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [pager, setPager] = useState<Pager>({ page: 1, pageSize: 12 });
  const [items, setItems] = useState<BaseListItem[]>([]);
  const [loading, setLoading] = useState(false);

  // crear base (en cualquier workspace)
  const [openCreate, setOpenCreate] = useState(false);

  // renombrar
  const [openRename, setOpenRename] = useState<{ open: boolean; id?: number; current?: string }>({ open: false });
  const [renameName, setRenameName] = useState('');
  const [renameErr, setRenameErr] = useState('');

  const canManage = me?.platformRole === 'SYSADMIN' || !!me?.canCreateBases;

  // debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    setLoading(true);
    try {
      const r = await listBases({
        page: pager.page,
        pageSize: pager.pageSize,
        q: debouncedQ,
      });
      // si el backend devuelve total, úsalo; si no, dejamos undefined y usamos heurística
      setPager(p => ({ ...p, total: r.total }));
      setItems(r.bases);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pager.page, pager.pageSize, debouncedQ]);

  // fallback: si no hay total, calculamos si hay "siguiente" según tamaño
  const lastPage = useMemo(() => {
    if (pager.total != null) {
      return Math.max(1, Math.ceil(pager.total / pager.pageSize));
    }
    return undefined;
  }, [pager.total, pager.pageSize]);

  const hasPrev = pager.page > 1;
  const hasNext =
    pager.total != null
      ? pager.page < (lastPage ?? 1)
      : items.length >= pager.pageSize; // heurística si no hay total

  function goto(page: number) {
    setPager(p => ({ ...p, page: Math.max(1, page) }));
  }

  /* ========== acciones card ========== */
  function openRenameModal(id: number, current: string) {
    setRenameErr('');
    setRenameName(current);
    setOpenRename({ open: true, id, current });
  }

  async function submitRename() {
    if (!openRename.id || !renameName.trim()) return;
    try {
      setRenameErr('');
      await renameBase(openRename.id, renameName.trim());
      setOpenRename({ open: false });
      await load();
    } catch (e: any) {
      setRenameErr(e?.message || 'No se pudo renombrar');
    }
  }

  async function submitDelete(id: number) {
    if (!confirm('¿Enviar la base a la papelera?')) return;
    await deleteBase(id);
    // si estamos en última página y queda vacía, retrocede una
    if (items.length === 1 && pager.page > 1) {
      goto(pager.page - 1);
    } else {
      await load();
    }
  }

  return (
    <>
      <Header user={me ?? undefined} onLogout={logout} />

      <div className="content">
        <div className="list-toolbar">
          <h2 className="title" style={{ margin: 0 }}>Mis bases</h2>
          <div className="toolbar-right">
            <input
              className="input search"
              placeholder="Buscar bases…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                // al buscar, vuelve a página 1
                setPager(p => ({ ...p, page: 1 }));
              }}
            />
            <select
              className="select"
              value={pager.pageSize}
              onChange={(e) => setPager(p => ({ ...p, page: 1, pageSize: Number(e.target.value) }))}
              title="Tamaño de página"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
            {canManage && (
              <button className="btn primary" onClick={() => setOpenCreate(true)}>
                Nueva base
              </button>
            )}
          </div>
        </div>

        <div className="bases-grid">
          {loading ? (
            <div className="muted">Cargando…</div>
          ) : items.length === 0 ? (
            <div className="muted">No hay resultados</div>
          ) : (
            items.map(b => (
              <div key={b.id} className="base-card">
                <div className="base-card-head">
                  <button
                    className="base-card-title"
                    onClick={() => nav(`/bases/${b.id}`)}
                    title={b.name}
                  >
                    {b.name}
                  </button>
                  {canManage && (
                    <div className="base-card-actions">
                      <button className="icon-btn" title="Renombrar" onClick={() => openRenameModal(b.id, b.name)}>✎</button>
                      <button className="icon-btn" title="Eliminar" onClick={() => submitDelete(b.id)}>🗑</button>
                    </div>
                  )}
                </div>
                <div className="base-card-meta">
                  <span className={`pill ${b.visibility === 'PUBLIC' ? 'pill-green' : 'pill-gray'}`}>
                    {b.visibility === 'PUBLIC' ? 'Pública' : b.visibility === 'SHARED' ? 'Compartida' : 'Privada'}
                  </span>
                  {b.workspaceName && (
                    <span className="muted"> · {b.workspaceName}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* paginación */}
        <div className="pagination">
          <button className="btn" disabled={!hasPrev} onClick={() => goto(pager.page - 1)}>« Anterior</button>
          <span className="muted">
            Página {pager.page}
            {lastPage ? ` de ${lastPage}` : ''}
          </span>
          <button className="btn" disabled={!hasNext} onClick={() => goto(pager.page + 1)}>Siguiente »</button>
        </div>
      </div>

      {/* Modal crear (elegir workspace dentro) */}
      {canManage && (
        <CreateBaseAnywhereModal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onCreated={() => {
            setOpenCreate(false);
            // refresco en página 1 para ver la nueva
            setPager(p => ({ ...p, page: 1 }));
            load();
          }}
        />
      )}

      {/* Modal renombrar */}
      {openRename.open && (
        <div className="modal-overlay" onClick={() => setOpenRename({ open: false })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Renombrar base</h3>
              <button className="icon-btn" onClick={() => setOpenRename({ open: false })}>✕</button>
            </div>
            <div className="modal-body">
              <input
                className="input"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Nuevo nombre"
                autoFocus
              />
              {renameErr && <div className="alert error" style={{ marginTop: 8 }}>{renameErr}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setOpenRename({ open: false })}>Cancelar</button>
              <button className="btn primary" onClick={submitRename}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}