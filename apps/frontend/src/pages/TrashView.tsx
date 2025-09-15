import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../auth/AuthContext';
import {
  listMyTrashedBases, restoreBase, deleteBasePermanent, emptyMyBaseTrash,
  listTrashedTablesForBase, restoreTable, deleteTablePermanent, emptyTableTrash,
  listMyTrashedWorkspacesSafe, restoreWorkspace, deleteWorkspacePermanent, emptyWorkspaceTrash,
  // 👇 nuevos (admin)
  listAllTrashedTablesAdmin, restoreTableAdmin, deleteTablePermanentAdmin,
} from '../api/trash';
import { listBases } from '../api/bases';
import { confirmToast } from '../ui/confirmToast';

type Tab = 'workspaces' | 'bases' | 'tables';

type TableTrashItemUI = {
  id: number;
  name: string;
  trashedAt?: string;
  baseId: number;
  baseName: string;
  ownerName?: string;
  isAdmin: boolean; // para decidir qué endpoints usar al restaurar/borrar
};

export default function TrashView() {
  const { user, logout } = useAuth();
  const isAdmin = user?.platformRole === 'SYSADMIN';

  /** Tabs */
  const [tab, setTab] = useState<Tab>('bases');

  /** ====== BASES ====== */
  const [bases, setBases] = useState<Array<{ id:number; name:string; visibility:'PUBLIC'|'PRIVATE'; trashedAt?:string }>>([]);
  const [loadingBases, setLoadingBases] = useState(false);
  async function loadBases() {
    setLoadingBases(true);
    try {
      const r = await listMyTrashedBases();
      setBases(r.bases || []);
    } finally {
      setLoadingBases(false);
    }
  }

  /** ====== TABLAS (ahora global por rol) ====== */
  const [tables, setTables] = useState<TableTrashItemUI[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  async function loadTablesAll() {
    setLoadingTables(true);
    try {
      if (isAdmin) {
        // Admin: un solo endpoint global con base y owner incluidos
        const r = await listAllTrashedTablesAdmin();
        const rows: TableTrashItemUI[] = (r.tables || []).map(t => ({
          id: t.id,
          name: t.name,
          trashedAt: t.trashedAt,
          baseId: t.base.id,
          baseName: t.base.name,
          ownerName: t.base.owner?.fullName,
          isAdmin: true,
        }));
        setTables(rows);
      } else {
        // User: agregamos todas sus bases accesibles + papelera de cada base
        const lb = await listBases({ page: 1, pageSize: 500 });
        const basesMap = new Map<number, { name: string; ownerName?: string }>();
        lb.bases.forEach(b => basesMap.set(b.id, { name: b.name, ownerName: (b as any).owner?.fullName ?? (b as any).ownerName }));

        const perBase = await Promise.all(
          lb.bases.map(async (b) => {
            try {
              const r = await listTrashedTablesForBase(b.id);
              return (r.tables || []).map(t => ({
                id: t.id,
                name: t.name,
                trashedAt: t.trashedAt,
                baseId: b.id,
                baseName: basesMap.get(b.id)?.name || `Base ${b.id}`,
                ownerName: basesMap.get(b.id)?.ownerName,
                isAdmin: false,
              }) as TableTrashItemUI);
            } catch {
              return [] as TableTrashItemUI[];
            }
          })
        );
        setTables(perBase.flat());
      }
    } finally {
      setLoadingTables(false);
    }
  }

  // Vaciar TODA la papelera de tablas (todas las bases representadas en la lista)
  async function emptyAllTablesTrash() {
    const ok = await confirmToast({
      title: 'Vaciar papelera de tablas',
      body: 'Se eliminarán DEFINITIVAMENTE todas las tablas listadas. Esta acción no se puede deshacer.',
      confirmText: 'Vaciar',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (!ok) return;

    if (isAdmin) {
      // Admin: borra tabla por tabla con endpoint admin
      for (const t of tables) {
        try {
          await deleteTablePermanentAdmin(t.baseId, t.id);
        } catch { /* opcional: toast por error */ }
      }
    } else {
      // User: vacía por base usando el endpoint existente
      const baseIds = Array.from(new Set(tables.map(t => t.baseId)));
      for (const baseId of baseIds) {
        try {
          await emptyTableTrash(baseId);
        } catch { /* opcional: toast por error */ }
      }
    }

    await loadTablesAll();
  }

  /** ====== WORKSPACES (opcional) ====== */
  const [workspaces, setWorkspaces] = useState<Array<{ id:number; name:string; trashedAt?:string }>>([]);
  const [loadingWS, setLoadingWS] = useState(false);
  const [wsAvailable, setWsAvailable] = useState(true);
  async function loadWorkspaces() {
    setLoadingWS(true);
    try {
      const r = await listMyTrashedWorkspacesSafe();
      if ((r as any).ok === false) { setWsAvailable(false); setWorkspaces([]); }
      else setWorkspaces((r as any).workspaces || []);
    } finally {
      setLoadingWS(false);
    }
  }

  // Cargas iniciales por tab
  useEffect(() => {
    if (tab === 'bases') loadBases();
    if (tab === 'tables') loadTablesAll();
    if (tab === 'workspaces') loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAdmin]);

  const headerRight = <div />;

  return (
    <>
      <Header user={user ?? undefined} onLogout={logout} />
      <main className="content">
        <div className="list-toolbar" style={{ marginTop: 20 }}>
          <h2 style={{ margin: 0 }}>Papelera de reciclaje</h2>
        </div>

        {/* Tabs superiores */}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {wsAvailable && (
            <button className="chip" aria-pressed={tab==='workspaces'} onClick={() => setTab('workspaces')}>
              Workspaces
            </button>
          )}
          <button className="chip" aria-pressed={tab==='bases'} onClick={() => setTab('bases')}>
            Bases
          </button>
          <button className="chip" aria-pressed={tab==='tables'} onClick={() => setTab('tables')}>
            Tablas
          </button>
        </div>

        {/* ===== WORKSPACES ===== */}
        {tab === 'workspaces' && (
          <section>
            {!wsAvailable ? (
              <div className="card">
                <b>Workspaces no disponible.</b>
                <div className="muted">Tu backend aún no expone la papelera de workspaces.</div>
              </div>
            ) : loadingWS ? (
              <div className="card">Cargando…</div>
            ) : workspaces.length === 0 ? (
              <div className="card">No hay workspaces en la papelera.</div>
            ) : (
              <>
                <div className="bases-grid">
                  {workspaces.map(w => (
                    <div key={w.id} className="base-card">
                      <div className="base-card-head">
                        <div className="base-card-title">{w.name}</div>
                      </div>
                      <div className="base-card-meta">Eliminado: {w.trashedAt ? new Date(w.trashedAt).toLocaleString() : '—'}</div>
                      <div style={{ display:'flex', gap:8, marginTop:10 }}>
                        <button className="btn" onClick={async () => { await restoreWorkspace(w.id); await loadWorkspaces(); }}>
                          Restaurar
                        </button>
                        <button className="btn danger" onClick={async () => {
                          const ok = await confirmToast({
                            title: 'Borrar definitivamente',
                            body: <>Se eliminará el workspace <b>{w.name}</b> y no se podrá recuperar.</>,
                            confirmText: 'Borrar',
                            cancelText: 'Cancelar',
                            danger: true,
                          });
                          if (!ok) return;
                          await deleteWorkspacePermanent(w.id); await loadWorkspaces();
                        }}>
                          Borrar definitivo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pagination">
                  <button className="btn danger" onClick={async () => {
                    const ok = await confirmToast({
                      title: 'Vaciar papelera de workspaces',
                      body: 'Se eliminarán definitivamente todos los workspaces de tu papelera.',
                      confirmText: 'Vaciar',
                      cancelText: 'Cancelar',
                      danger: true,
                    });
                    if (!ok) return;
                    await emptyWorkspaceTrash(); await loadWorkspaces();
                  }}>
                    Vaciar papelera de workspaces
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ===== BASES ===== */}
        {tab === 'bases' && (
          <section>
            {loadingBases ? (
              <div className="card">Cargando…</div>
            ) : bases.length === 0 ? (
              <div className="card">No hay bases en la papelera.</div>
            ) : (
              <>
                <div className="bases-grid">
                  {bases.map(b => (
                    <div key={b.id} className="base-card">
                      <div className="base-card-head">
                        <div className="base-card-title">{b.name}</div>
                      </div>
                      <div className="base-card-meta">
                        {b.visibility === 'PUBLIC' ? 'Pública' : 'Privada'} · Eliminada: {b.trashedAt ? new Date(b.trashedAt).toLocaleString() : '—'}
                      </div>
                      <div style={{ display:'flex', gap:8, marginTop:10 }}>
                        <button className="btn" onClick={async () => { await restoreBase(b.id); await loadBases(); }}>
                          Restaurar
                        </button>
                        <button className="btn danger" onClick={async () => {
                          const ok = await confirmToast({
                            title: 'Borrar definitivamente',
                            body: <>¿Eliminar la base <b>{b.name}</b> de forma permanente?</>,
                            confirmText: 'Borrar',
                            cancelText: 'Cancelar',
                            danger: true,
                          });
                          if (!ok) return;
                          await deleteBasePermanent(b.id); await loadBases();
                        }}>
                          Borrar definitivo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pagination">
                  <button className="btn danger" onClick={async () => {
                    const ok = await confirmToast({
                      title: 'Vaciar papelera de bases',
                      body: 'Se eliminarán definitivamente todas las bases de tu papelera.',
                      confirmText: 'Vaciar',
                      cancelText: 'Cancelar',
                      danger: true,
                    });
                    if (!ok) return;
                    await emptyMyBaseTrash(); await loadBases();
                  }}>
                    Vaciar papelera de bases
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ===== TABLAS (GLOBAL) ===== */}
        {tab === 'tables' && (
          <section>
            {loadingTables ? (
              <div className="card">Cargando…</div>
            ) : tables.length === 0 ? (
              <div className="card">No hay tablas en la papelera.</div>
            ) : (
              <>
                <div className="bases-grid">
                  {tables.map(t => (
                    <div key={`${t.baseId}-${t.id}`} className="base-card">
                      <div className="base-card-head">
                        <div className="base-card-title">{t.name}</div>
                      </div>
                      <div className="base-card-meta">
                        Eliminada: {t.trashedAt ? new Date(t.trashedAt).toLocaleString() : '—'} ·{' '}
                        <b>Base:</b> {t.baseName}{t.ownerName ? <> · <b>Dueño:</b> {t.ownerName}</> : null}
                      </div>
                      <div style={{ display:'flex', gap:8, marginTop:10 }}>
                        <button
                          className="btn"
                          onClick={async () => {
                            if (t.isAdmin) await restoreTableAdmin(t.baseId, t.id);
                            else await restoreTable(t.baseId, t.id);
                            await loadTablesAll();
                          }}
                        >
                          Restaurar
                        </button>
                        <button
                          className="btn danger"
                          onClick={async () => {
                            const ok = await confirmToast({
                              title: 'Borrar definitivamente',
                              body: <>¿Eliminar la tabla <b>{t.name}</b> de forma permanente?</>,
                              confirmText: 'Borrar',
                              cancelText: 'Cancelar',
                              danger: true,
                            });
                            if (!ok) return;
                            if (t.isAdmin) await deleteTablePermanentAdmin(t.baseId, t.id);
                            else await deleteTablePermanent(t.baseId, t.id);
                            await loadTablesAll();
                          }}
                        >
                          Borrar definitivo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón global para vaciar TODO lo listado */}
                <div className="pagination" style={{ marginTop: 16 }}>
                  <button className="btn danger" onClick={emptyAllTablesTrash}>
                    Vaciar papelera de tablas
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </>
  );
}