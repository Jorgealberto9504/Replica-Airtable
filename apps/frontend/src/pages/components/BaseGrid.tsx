// Grid de Bases con búsqueda (opcional), paginación y menú por tarjeta
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { BaseItem } from '../../api/workspaces';
import { listBasesForWorkspace } from '../../api/workspaces';

import {
  listBases,
  renameBase,
  deleteBase,
  updateBaseVisibility,
  type BaseVisibility,
} from '../../api/bases';

// 🔐 sesión/usuario para controlar permisos
import { useAuth } from '../../auth/AuthContext';

type GridItem = BaseItem & { ownerName?: string };

type Props = {
  workspaceId: number | null;
  onCreateBase?: () => void;
  canCreate?: boolean;

  /** Si lo pasas, el grid usará este query externo (navbar) */
  query?: string;
  /** Si false, oculta el input interno del grid */
  showInlineSearch?: boolean;

  /** Cambia cuando necesitamos forzar una recarga externa (p.ej. tras crear) */
  reloadKey?: number;
};

export default function BaseGrid({
  workspaceId,
  onCreateBase,
  canCreate,
  query,
  showInlineSearch = true,
  reloadKey,
}: Props) {
  const nav = useNavigate();
  const { user: me } = useAuth();
  const isAdmin = me?.platformRole === 'SYSADMIN';

  // Datos
  const [items, setItems] = useState<GridItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Búsqueda local (solo si showInlineSearch=true)
  const [qLocal, setQLocal] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(qLocal.trim()), 300);
    return () => clearTimeout(t);
  }, [qLocal]);

  // Query efectivo (externo si viene del header, si no el local)
  const searchQ = (showInlineSearch ? qDebounced : (query ?? '')).trim();

  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState<number | null>(null);
  const totalPages = Math.max(1, Math.ceil(((total ?? items.length) || 1) / pageSize));

  // Reset página al cambiar workspace o query
  useEffect(() => { setPage(1); }, [workspaceId, searchQ, pageSize]);

  // Permisos por tarjeta
  function canManageBase(b: GridItem): boolean {
    return Boolean(isAdmin || (me?.id && b.ownerId && me.id === b.ownerId));
  }

  // Carga
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (workspaceId === 0) {
          // EXPLORAR: usa /bases con soporte de q/paginación
          const r = await listBases({ page, pageSize, q: searchQ });
          if (!alive) return;
          const rows: GridItem[] = r.bases.map((b: any) => ({
            id: b.id,
            name: b.name,
            visibility: b.visibility,
            workspaceId: b.workspaceId ?? 0,
            ownerId: (b as any).ownerId ?? 0,
            createdAt: b.createdAt ?? '',
            // nombre del dueño (el backend ya manda owner.fullName en /bases)
            ownerName: (b as any).owner?.fullName ?? undefined,
          }));
          setItems(rows);
          setTotal(r.total ?? null);
        } else if (workspaceId) {
          // WORKSPACE: lista y filtra/pagina en front
          const r = await listBasesForWorkspace(workspaceId);
          if (!alive) return;
          let rows: GridItem[] = (r.bases as any[]).map((b: any) => ({
            ...b,
            ownerId: b.ownerId ?? 0,
            ownerName: b.owner?.fullName, // por si lo traes también en este endpoint
          }));
          if (searchQ) {
            const ql = searchQ.toLowerCase();
            rows = rows.filter(b => (b.name ?? '').toLowerCase().includes(ql));
          }
          setTotal(rows.length);
          const start = (page - 1) * pageSize;
          setItems(rows.slice(start, start + pageSize));
        } else {
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [workspaceId, page, pageSize, searchQ, reloadKey]); // recarga cuando cambie reloadKey

  const canCreateHere = Boolean(canCreate && workspaceId && workspaceId !== 0);

  function openBase(id: number) {
    nav(`/bases/${id}`);
  }

  // ====== Menú contextual por tarjeta ======
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0, left: 0 });
  function openMenu(e: React.MouseEvent, baseId: number) {
    e.stopPropagation();
    const b = items.find(x => x.id === baseId);
    if (!b || !canManageBase(b)) return; // bloquear si no puede
    setMenuFor(baseId);
    const btn = e.currentTarget as HTMLButtonElement;
    const r = btn.getBoundingClientRect();
    const gap = 6;
    const desiredLeft = r.left;
    const fitsRight = desiredLeft + 220 < window.innerWidth - 8;
    setMenuPos({
      top: r.bottom + gap,
      ...(fitsRight ? { left: desiredLeft } : { right: window.innerWidth - r.right }),
    });
  }
  function closeMenu() { setMenuFor(null); }

  // ====== Modales simples: renombrar / privacidad ======
  const [renameOpen, setRenameOpen] = useState<{ open: boolean; id?: number; name: string }>({ open: false, name: '' });
  const [privacyOpen, setPrivacyOpen] = useState<{ open: boolean; id?: number; v: BaseVisibility }>({ open: false, v: 'PRIVATE' });

  async function submitRename() {
    if (!renameOpen.id) return;
    const b = items.find(x => x.id === renameOpen.id);
    if (!b || !canManageBase(b)) { setRenameOpen({ open: false, name: '' }); return; }

    const name = renameOpen.name.trim();
    if (!name) return;
    try {
      await renameBase(renameOpen.id, name);
    } catch (e: any) {
      if (String(e?.message || '').toUpperCase().includes('FORBIDDEN')) {
        alert('No tienes permisos para renombrar esta base.');
      } else {
        alert(e?.message || 'No se pudo renombrar la base');
      }
    }
    setRenameOpen({ open: false, name: '' });

    // Refrescar manteniendo página actual
    if (workspaceId === 0) {
      const r = await listBases({ page, pageSize, q: searchQ });
      const rows: GridItem[] = r.bases.map((b: any) => ({
        id: b.id,
        name: b.name,
        visibility: b.visibility,
        workspaceId: b.workspaceId ?? 0,
        ownerId: (b as any).ownerId ?? 0,
        createdAt: b.createdAt ?? '',
        ownerName: (b as any).owner?.fullName ?? undefined,
      }));
      setItems(rows);
      setTotal(r.total ?? null);
    } else if (workspaceId) {
      const r = await listBasesForWorkspace(workspaceId);
      let rows: GridItem[] = (r.bases as any[]).map((b: any) => ({
        ...b,
        ownerId: b.ownerId ?? 0,
        ownerName: b.owner?.fullName,
      }));
      if (searchQ) rows = rows.filter(b => (b.name ?? '').toLowerCase().includes(searchQ.toLowerCase()));
      setTotal(rows.length);
      const start = (page - 1) * pageSize;
      setItems(rows.slice(start, start + pageSize));
    }
  }

  async function submitPrivacy() {
    if (!privacyOpen.id) return;
    const b = items.find(x => x.id === privacyOpen.id);
    if (!b || !canManageBase(b)) { setPrivacyOpen({ open: false, v: 'PRIVATE' }); return; }

    try {
      await updateBaseVisibility(privacyOpen.id, privacyOpen.v);
    } catch (e: any) {
      if (String(e?.message || '').toUpperCase().includes('FORBIDDEN')) {
        alert('No tienes permisos para cambiar la privacidad de esta base.');
      } else {
        alert(e?.message || 'No se pudo actualizar la privacidad');
      }
    }
    setPrivacyOpen({ open: false, v: 'PRIVATE' });

    // Refrescar
    if (workspaceId === 0) {
      const r = await listBases({ page, pageSize, q: searchQ });
      const rows: GridItem[] = r.bases.map((b: any) => ({
        id: b.id,
        name: b.name,
        visibility: b.visibility,
        workspaceId: b.workspaceId ?? 0,
        ownerId: (b as any).ownerId ?? 0,
        createdAt: b.createdAt ?? '',
        ownerName: (b as any).owner?.fullName ?? undefined,
      }));
      setItems(rows);
      setTotal(r.total ?? null);
    } else if (workspaceId) {
      const r = await listBasesForWorkspace(workspaceId);
      let rows: GridItem[] = (r.bases as any[]).map((b: any) => ({
        ...b,
        ownerId: b.ownerId ?? 0,
        ownerName: b.owner?.fullName,
      }));
      if (searchQ) rows = rows.filter(b => (b.name ?? '').toLowerCase().includes(searchQ.toLowerCase()));
      setTotal(rows.length);
      const start = (page - 1) * pageSize;
      setItems(rows.slice(start, start + pageSize));
    }
  }

  async function sendToTrash(id: number) {
    closeMenu();
    const b = items.find(x => x.id === id);
    if (!b || !canManageBase(b)) return;

    if (!confirm('¿Enviar esta base a la papelera?')) return;
    try {
      await deleteBase(id);
    } catch (e: any) {
      if (String(e?.message || '').toUpperCase().includes('FORBIDDEN')) {
        alert('No tienes permisos para enviar esta base a la papelera.');
      } else {
        alert(e?.message || 'No se pudo enviar a la papelera');
      }
      return;
    }

    // Si quedamos sin ítems en la página, retrocede una página
    const nextCount = (total ?? items.length) - 1;
    const nextTotalPages = Math.max(1, Math.ceil(nextCount / pageSize));
    if (page > nextTotalPages) setPage(nextTotalPages);

    // Refrescar
    if (workspaceId === 0) {
      const r = await listBases({ page, pageSize, q: searchQ });
      const rows: GridItem[] = r.bases.map((b: any) => ({
        id: b.id,
        name: b.name,
        visibility: b.visibility,
        workspaceId: b.workspaceId ?? 0,
        ownerId: (b as any).ownerId ?? 0,
        createdAt: b.createdAt ?? '',
        ownerName: (b as any).owner?.fullName ?? undefined,
      }));
      setItems(rows);
      setTotal(r.total ?? null);
    } else if (workspaceId) {
      const r = await listBasesForWorkspace(workspaceId);
      let rows: GridItem[] = (r.bases as any[]).map((b: any) => ({
        ...b,
        ownerId: b.ownerId ?? 0,
        ownerName: b.owner?.fullName,
      }));
      if (searchQ) rows = rows.filter(b => (b.name ?? '').toLowerCase().includes(searchQ.toLowerCase()));
      setTotal(rows.length);
      const start = (page - 1) * pageSize;
      setItems(rows.slice(start, start + pageSize));
    }
  }

  const toolbarRight = useMemo(() => {
    const totalKnown = total ?? items.length;
    return `${totalKnown} resultado${totalKnown === 1 ? '' : 's'}`;
  }, [total, items]);

  return (
    <section style={{ flex: 1, padding: 16 }}>
      {/* Toolbar: título + crear (el buscador ya está en el navbar) */}
      <div className="list-toolbar">
        <h2 style={{ margin: 0 }}>{workspaceId === 0 ? 'Explorar bases' : 'Bases'}</h2>

        <div className="toolbar-right">
          {!showInlineSearch ? null : (
            <input
              className="input search"
              placeholder="Buscar bases…"
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
            />
          )}
          <span className="muted">{toolbarRight}</span>

          {canCreateHere && (
            <button onClick={onCreateBase} className="btn primary">Nueva base</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#6b7280' }}>Cargando…</div>
      ) : items.length === 0 ? (
        <div style={{ color: '#9ca3af' }}>No hay bases</div>
      ) : (
        <>
          <div className="bases-grid">
            {items.map((b) => {
              const showMenu = canManageBase(b);
              return (
                <div
                  key={b.id}
                  className="base-card"
                  role="group"
                  tabIndex={0}
                  onClick={() => openBase(b.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') openBase(b.id); }}
                  title={`Abrir ${b.name}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="base-card-head">
                    <button
                      className="base-card-title"
                      onClick={(e) => { e.stopPropagation(); openBase(b.id); }}
                    >
                      {b.name}
                    </button>

                    {showMenu && (
                      <div className="base-card-actions">
                        <button
                          className="icon-btn"
                          aria-label={`Acciones para ${b.name}`}
                          onClick={(e) => openMenu(e, b.id)}
                        >
                          ⋯
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="base-card-meta">
                    {b.visibility === 'PUBLIC' ? 'Pública' : 'Privada'}
                    {b.ownerName ? <> · {b.ownerName}</> : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginación */}
          <div className="pagination">
            <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
            <span>Página {page} de {totalPages}</span>
            <button className="btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Siguiente</button>

            <span style={{ marginLeft: 12 }}>Ver</span>
            <select
              className="select"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
            <span>por página</span>
          </div>
        </>
      )}

      {/* Overlay de menú contextual */}
      {menuFor != null && (
        <>
          <div
            onClick={closeMenu}
            style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 999 }}
          />
          <div
            role="menu"
            style={{
              position: 'fixed',
              top: menuPos.top,
              ...(menuPos.left != null ? { left: menuPos.left } : { right: menuPos.right }),
              zIndex: 1000,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              boxShadow: '0 10px 20px rgba(0,0,0,.08)',
              width: 220,
              padding: 6,
            }}
          >
            {(() => {
              const b = items.find(x => x.id === menuFor);
              const currentName = b?.name ?? '';
              const currentVis = (b?.visibility ?? 'PRIVATE') as BaseVisibility;
              return (
                <>
                  <button
                    className="menu-item"
                    onClick={() => setRenameOpen({ open: true, id: menuFor!, name: currentName })}
                  >
                    Cambiar nombre
                  </button>
                  <button
                    className="menu-item"
                    onClick={() => setPrivacyOpen({ open: true, id: menuFor!, v: currentVis })}
                  >
                    Cambiar privacidad
                  </button>
                  <button className="menu-item" onClick={() => sendToTrash(menuFor!)}>
                    Enviar a papelera
                  </button>
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* Modal: Renombrar base */}
      {renameOpen.open && (
        <div className="modal-overlay" onClick={() => setRenameOpen({ open: false, name: '' })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Cambiar nombre</h3>
              <button className="modal-close" onClick={() => setRenameOpen({ open: false, name: '' })}>✕</button>
            </div>
            <div className="modal-body">
              <input
                className="input"
                value={renameOpen.name}
                onChange={(e) => setRenameOpen((s) => ({ ...s, name: e.target.value }))}
                placeholder="Nuevo nombre"
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setRenameOpen({ open: false, name: '' })}>Cancelar</button>
              <button className="btn primary" onClick={submitRename} disabled={!renameOpen.name.trim()}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cambiar privacidad */}
      {privacyOpen.open && (
        <div className="modal-overlay" onClick={() => setPrivacyOpen({ open: false, v: 'PRIVATE' })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Cambiar privacidad</h3>
              <button className="modal-close" onClick={() => setPrivacyOpen({ open: false, v: 'PRIVATE' })}>✕</button>
            </div>
            <div className="modal-body">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="radio"
                  name="vis"
                  checked={privacyOpen.v === 'PRIVATE'}
                  onChange={() => setPrivacyOpen((s) => ({ ...s, v: 'PRIVATE' }))}
                />
                Privada
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input
                  type="radio"
                  name="vis"
                  checked={privacyOpen.v === 'PUBLIC'}
                  onChange={() => setPrivacyOpen((s) => ({ ...s, v: 'PUBLIC' }))}
                />
                Pública
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setPrivacyOpen({ open: false, v: 'PRIVATE' })}>Cancelar</button>
              <button className="btn primary" onClick={submitPrivacy}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}