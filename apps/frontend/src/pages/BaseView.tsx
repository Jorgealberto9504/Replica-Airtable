// apps/frontend/src/pages/BaseView.tsx
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

  const [cols, setCols] = useState<GridColumnMeta[]>([]);
  const [loadingCols, setLoadingCols] = useState(false);

  const [canManage, setCanManage] = useState(false);

  const [openMembers, setOpenMembers] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [openRename, setOpenRename] = useState<{ open: boolean; id?: number }>({ open: false });
  const [formName, setFormName] = useState('');
  const [formErr, setFormErr] = useState<string>('');

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!baseId || urlTableId != null) return;
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
    <div className="flex gap-2">
      {canManage && (
        <button
          className="btn-primary pill btn-sm"
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
      <main className="content">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="m-0 text-2xl font-extrabold">{baseName}</h1>
          <span className="badge badge-green">
            {visibility === 'PUBLIC' ? 'Pública' : visibility === 'SHARED' ? 'Compartida' : 'Privada'}
          </span>
          {ownerName ? <span className="muted"> · {ownerName}</span> : null}
          <div className="ml-auto">{headerRight}</div>
        </div>

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

        {loadingTabs || resolving ? (
          <div className="card mt-4 text-slate-500">Cargando…</div>
        ) : sortedTabs.length === 0 ? (
          <div className="card mt-4">
            <b>No hay tablas en esta base.</b>
            <div className="muted">El propietario aún no ha creado tablas.</div>
          </div>
        ) : currentTab ? (
          <div className="card mt-4">
            <div className="mb-2">
              Vista de tabla <b>{currentTab.name}</b>
              {gridMeta?.totalTables != null && (
                <span className="muted ml-2">
                  (Meta: {gridMeta.totalTables} tablas en total)
                </span>
              )}
            </div>

            {loadingCols ? (
              <div className="muted">Cargando columnas…</div>
            ) : cols.length === 0 ? (
              <div className="muted">Aún no hay columnas definidas.</div>
            ) : (
              <div className="grid grid-flow-col auto-cols-min gap-2 overflow-x-auto pb-1 border-b border-slate-200">
                {cols.map(c => (
                  <div
                    key={c.id}
                    className="chip font-extrabold bg-slate-50 border border-slate-200"
                    style={{ minWidth: (c.width ?? 140) }}
                    title={`${c.label} (${c.type})`}
                  >
                    {c.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="card mt-4">Normalizando selección…</div>
        )}
      </main>

      <MembersModal baseId={baseId} open={openMembers} onClose={() => setOpenMembers(false)} />

      {(openCreate || openRename.open) && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="m-0 font-bold">
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
              {formErr && <div className="alert-error mt-2">{formErr}</div>}
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
              <button className="btn-primary" onClick={openCreate ? submitCreate : submitRename}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}