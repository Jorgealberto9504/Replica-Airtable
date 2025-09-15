import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Header from '../components/Header';
import MembersModal from './components/MembersModal';
import TabsBar from './components/TabsBar';

import { useAuth } from '../auth/AuthContext';
import { getBaseDetail, resolveBase, type BaseVisibility } from '../api/bases';

import {
  listTabs,
  reorderTabs,
  createTable,
  renameTable,
  trashTable,
  type TabItem,
  getTableMeta,
  type GridColumnMeta,
} from '../api/tables';

import { confirmToast } from '../ui/confirmToast';

export default function BaseView() {
  const nav = useNavigate();
  const { baseId: baseIdStr, tableId: tableIdStr } = useParams();
  const baseId = Number(baseIdStr);
  const urlTableId = tableIdStr ? Number(tableIdStr) : null;

  const { user: me, logout } = useAuth();

  const [baseName, setBaseName] = useState('');
  const [visibility, setVisibility] = useState<BaseVisibility>('PRIVATE');
  const [ownerName, setOwnerName] = useState<string | undefined>(undefined);

  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [resolving, setResolving] = useState(false);

  const [gridMeta, setGridMeta] = useState<any>(null);

  // META columnas (7.3.4)
  const [cols, setCols] = useState<GridColumnMeta[]>([]);
  const [loadingCols, setLoadingCols] = useState(false);

  const [canManage, setCanManage] = useState(false);

  // Miembros modal
  const [openMembers, setOpenMembers] = useState(false);

  // Modales crear/renombrar
  const [openCreate, setOpenCreate] = useState(false);
  const [openRename, setOpenRename] = useState<{ open: boolean; id?: number }>({ open: false });
  const [formName, setFormName] = useState('');
  const [formErr, setFormErr] = useState<string>('');

  // ====== Detalle de base y permisos efectivos ======
  useEffect(() => {
    (async () => {
      const d = await getBaseDetail(baseId);
      setBaseName(d.base.name);
      setVisibility(d.base.visibility);
      setOwnerName(d.base.owner?.fullName);
      const isAdmin = me?.platformRole === 'SYSADMIN';
      const isOwner = d.base.ownerId === me?.id;
      const hasPerm = Boolean((d as any).permissions?.schemaManage);
      setCanManage(Boolean(isAdmin || isOwner || hasPerm));
    })();
  }, [baseId, me?.id, me?.platformRole]);

  // ====== Cargar tabs (NO toca la selección activa; la controla la URL) ======
  async function refreshTabs() {
    setLoadingTabs(true);
    try {
      const r = await listTabs(baseId);
      setTabs(r.tabs);
    } finally {
      setLoadingTabs(false);
    }
  }
  useEffect(() => { refreshTabs(); /* eslint-disable-next-line */ }, [baseId]);

  // ====== Resolver tabla por defecto si no hay :tableId ======
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!baseId || urlTableId != null) return; // ya tenemos tabla en URL
      setResolving(true);
      try {
        const r = await resolveBase(baseId);
        if (cancelled) return;
        setGridMeta(r.gridMeta ?? null);
        if (r.defaultTableId) {
          nav(`/bases/${baseId}/t/${r.defaultTableId}`, { replace: true });
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => { cancelled = true; };
  }, [baseId, urlTableId, nav]);

  // ====== Normalizar si la URL trae un tableId inexistente ======
  const sortedTabs = useMemo(
    () => [...tabs].sort((a, b) => a.position - b.position),
    [tabs]
  );
  useEffect(() => {
    if (!loadingTabs && urlTableId && sortedTabs.length) {
      const exists = sortedTabs.some(t => t.id === urlTableId);
      if (!exists) {
        nav(`/bases/${baseId}/t/${sortedTabs[0].id}`, { replace: true });
      }
    }
  }, [loadingTabs, urlTableId, sortedTabs, baseId, nav]);

  // ====== Cargar metadatos de columnas cuando cambia la tabla activa ======
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!urlTableId) { setCols([]); return; }
      setLoadingCols(true);
      try {
        const r = await getTableMeta(baseId, urlTableId);
        if (!cancelled) {
          const ordered = (r.meta?.columns ?? []).slice().sort((a, b) => (a.position ?? 1e9) - (b.position ?? 1e9));
          setCols(ordered);
        }
      } finally {
        if (!cancelled) setLoadingCols(false);
      }
    })();
    return () => { cancelled = true; };
  }, [baseId, urlTableId]);

  // ====== Handlers TabsBar ======
  function handleSelect(tableId: number) {
    if (tableId !== urlTableId) nav(`/bases/${baseId}/t/${tableId}`);
  }
  function handleOpenCreate() { setFormName(''); setFormErr(''); setOpenCreate(true); }
  function handleOpenRename(tableId: number) {
    const t = tabs.find(x => x.id === tableId);
    setFormName(t?.name ?? '');
    setFormErr('');
    setOpenRename({ open: true, id: tableId });
  }
  async function handleTrash(tableId: number) {
    const t = tabs.find(x => x.id === tableId);
    const ok = await confirmToast({
      title: 'Enviar a papelera',
      body: <>¿Quieres enviar la tabla <b>{t?.name ?? 'sin nombre'}</b> a la papelera?</>,
      confirmText: 'Enviar',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (!ok) return;

    try {
      await trashTable(baseId, tableId);
      await refreshTabs();
      if (urlTableId === tableId) {
        const r = await resolveBase(baseId);
        if (r.defaultTableId) nav(`/bases/${baseId}/t/${r.defaultTableId}`, { replace: true });
        else nav(`/bases/${baseId}`, { replace: true });
      }
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo enviar la tabla a la papelera');
    }
  }
  async function handleReorder(orderedIds: number[]) {
    const map = new Map(tabs.map((t) => [t.id, t]));
    const next = orderedIds.map((id, i) => ({ ...(map.get(id)!), position: i + 1 }));
    setTabs(next);
    try {
      await reorderTabs(baseId, orderedIds);
    } catch {
      await refreshTabs();
    }
  }

  // Guardar “Nueva tabla”
  async function submitCreate() {
    if (!formName.trim()) return;
    try {
      setFormErr('');
      const r = await createTable(baseId, formName.trim());
      setOpenCreate(false);
      setFormName('');
      await refreshTabs();
      nav(`/bases/${baseId}/t/${r.table.id}`);
    } catch (e: any) {
      setFormErr(e?.message || 'No se pudo crear la tabla');
    }
  }

  // Guardar “Renombrar tabla”
  async function submitRename() {
    if (!formName.trim() || !openRename.id) return;
    try {
      setFormErr('');
      await renameTable(baseId, openRename.id, formName.trim());
      setOpenRename({ open: false });
      setFormName('');
      await refreshTabs();
    } catch (e: any) {
      setFormErr(e?.message || 'No se pudo renombrar la tabla');
    }
  }

  /* >>> Cambiado aquí: usa degradado MBQ y formato pill/pequeño <<< */
  const headerRight = (
    <div style={{ display: 'flex', gap: 8 }}>
      {canManage && (
        <button
          className="btn primary pill sm"
          onClick={() => setOpenMembers(true)}
          title="Gestionar miembros"
        >
          Miembros
        </button>
      )}
    </div>
  );

  const currentTab = urlTableId ? sortedTabs.find(t => t.id === urlTableId) : null;

  return (
    <>
      <Header user={me ?? undefined} onLogout={logout} />
      <main style={{ padding: 16 }}>
        {/* Título de la base */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h1 style={{ margin: 0 }}>{baseName}</h1>
          <span className="badge" style={{ background: '#ecfdf5', color: '#065f46' }}>
            {visibility === 'PUBLIC' ? 'Pública' : visibility === 'SHARED' ? 'Compartida' : 'Privada'}
          </span>
          {ownerName ? <span className="muted"> · {ownerName}</span> : null}
          <div style={{ marginLeft: 'auto' }}>{headerRight}</div>
        </div>

        {/* Barra de tabs */}
        <TabsBar
          baseId={baseId}
          tabs={sortedTabs}
          activeId={urlTableId}
          canManage={canManage}
          onSelect={handleSelect}
          onCreate={canManage ? handleOpenCreate : undefined}
          onRename={handleOpenRename}
          onTrash={handleTrash}
          onReorder={canManage ? handleReorder : undefined}
        />

        {/* Contenido inferior */}
        {loadingTabs || resolving ? (
          <div className="card" style={{ marginTop: 16, color: '#6b7280' }}>Cargando…</div>
        ) : sortedTabs.length === 0 ? (
          <div className="card" style={{ marginTop: 16 }}>
            <b>No hay tablas en esta base.</b>
            <div className="muted">El propietario aún no ha creado tablas.</div>
          </div>
        ) : currentTab ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>
              Vista de tabla <b>{currentTab.name}</b>
              {gridMeta?.totalTables != null && (
                <span className="muted" style={{ marginLeft: 8 }}>
                  (Meta: {gridMeta.totalTables} tablas en total)
                </span>
              )}
            </div>

            {/* Header del grid con metadatos de columnas */}
            {loadingCols ? (
              <div className="muted">Cargando columnas…</div>
            ) : cols.length === 0 ? (
              <div className="muted">Aún no hay columnas definidas.</div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridAutoFlow: 'column',
                  gridAutoColumns: 'min-content',
                  gap: 8,
                  overflowX: 'auto',
                  paddingBottom: 6,
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                {cols.map(c => (
                  <div
                    key={c.id}
                    className="chip"
                    style={{
                      minWidth: (c.width ?? 140),
                      fontWeight: 700,
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                    }}
                    title={`${c.label} (${c.type})`}
                  >
                    {c.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ marginTop: 16 }}>
            Normalizando selección…
          </div>
        )}
      </main>

      {/* Modal miembros */}
      <MembersModal baseId={baseId} open={openMembers} onClose={() => setOpenMembers(false)} />

      {/* Modales crear/renombrar */}
      {(openCreate || openRename.open) && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>
                {openCreate ? 'Nueva tabla' : 'Renombrar tabla'}
              </h3>
              <button
                className="modal-close"
                onClick={() => {
                  setOpenCreate(false);
                  setOpenRename({ open: false });
                  setFormErr('');
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <input
                className="input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nombre de la tabla"
                autoFocus
              />
              {formErr && <div className="alert error" style={{ marginTop: 8 }}>{formErr}</div>}
            </div>
            <div className="modal-footer">
              <button
                className="btn"
                onClick={() => {
                  setOpenCreate(false);
                  setOpenRename({ open: false });
                  setFormErr('');
                }}
              >
                Cancelar
              </button>
              <button className="btn primary" onClick={openCreate ? submitCreate : submitRename}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}