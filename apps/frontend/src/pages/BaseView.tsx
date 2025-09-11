import { useEffect, useMemo, useRef, useState } from 'react';
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
} from '../api/tables';

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
        // si no hay tablas, nos quedamos en /bases/:baseId y mostramos vacío
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => { cancelled = true; };
  }, [baseId, urlTableId, nav]);

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
    if (!confirm('¿Enviar esta tabla a la papelera?')) return;
    await trashTable(baseId, tableId);
    await refreshTabs();
    // si borramos la activa, resolvemos a la siguiente por defecto (o vacío)
    if (urlTableId === tableId) {
      const r = await resolveBase(baseId);
      if (r.defaultTableId) nav(`/bases/${baseId}/t/${r.defaultTableId}`, { replace: true });
      else nav(`/bases/${baseId}`, { replace: true });
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
      // Ir a la nueva tabla creada
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

  const headerRight = (
    <div style={{ display: 'flex', gap: 8 }}>
      {canManage && (
        <button className="btn" onClick={() => setOpenMembers(true)}>Miembros</button>
      )}
    </div>
  );

  // Tab actual (derivado de URL)
  const sortedTabs = useMemo(
    () => [...tabs].sort((a, b) => a.position - b.position),
    [tabs]
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
            Vista de tabla <b>{currentTab.name}</b>
            {gridMeta?.totalTables != null && (
              <div className="muted" style={{ marginTop: 4 }}>
                (Meta: {gridMeta.totalTables} tablas en total)
              </div>
            )}
          </div>
        ) : (
          // Caso raro: hay tablas pero la URL trae un id inexistente → normalizamos a la primera
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