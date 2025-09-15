// Sidebar de Workspaces (columna izquierda)
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Workspace } from '../../api/workspaces';
import { listMyWorkspaces, updateWorkspace, deleteWorkspace } from '../../api/workspaces';
import { confirmToast } from '../../ui/confirmToast';

type Props = {
  selectedId: number | null;
  onSelect: (id: number) => void;
  onOpenCreate?: () => void;
  canCreate?: boolean;
};

export default function WorkspaceSidebar({
  selectedId,
  onSelect,
  onOpenCreate,
  canCreate,
}: Props) {
  const [items, setItems] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });

  const [renameTarget, setRenameTarget] = useState<Workspace | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const menuRef = useRef<HTMLDivElement | null>(null);

  async function reload() {
    const resp = await listMyWorkspaces();
    setItems(resp.workspaces);
  }

  useEffect(() => {
    (async () => {
      try {
        await reload();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 👇 NUEVO: escuchar creación de workspace y actualizar la lista al instante
  useEffect(() => {
    const onCreated = (ev: Event) => {
      const ws = (ev as CustomEvent<Workspace>).detail;
      if (!ws) return;
      setItems((prev) => {
        // evita duplicados si ya está en la lista
        if (prev.some((x) => x.id === ws.id)) return prev;
        return [ws, ...prev];
      });
    };
    window.addEventListener('workspace:created', onCreated as EventListener);
    return () => window.removeEventListener('workspace:created', onCreated as EventListener);
  }, []);

  // --- helpers de posicionamiento del menú ---
  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }
  function computeMenuPosition(anchor: HTMLElement, menuEl?: HTMLElement) {
    const pad = 8;
    const rect = anchor.getBoundingClientRect();
    const approxW = menuEl?.offsetWidth ?? 200;
    const approxH = menuEl?.offsetHeight ?? 96;
    const spaceBelow = window.innerHeight - rect.bottom - pad;
    const spaceAbove = rect.top - pad;
    const openBelow = spaceBelow >= approxH || spaceBelow >= spaceAbove;
    let top = openBelow ? rect.bottom + 6 : rect.top - approxH - 6;
    let left = clamp(rect.right - approxW, pad, window.innerWidth - approxW - pad);
    top = clamp(top, pad, window.innerHeight - approxH - pad);
    return { top, left };
  }
  function repositionMenu() {
    if (openMenuId == null) return;
    const btn = btnRefs.current.get(openMenuId);
    if (!btn) return;
    setMenuPos(computeMenuPosition(btn, menuRef.current || undefined));
  }

  useLayoutEffect(() => {
    if (openMenuId == null) return;
    repositionMenu();
    const t = setTimeout(repositionMenu, 0);
    return () => clearTimeout(t);
  }, [openMenuId]);

  useEffect(() => {
    if (openMenuId == null) return;
    const onWindow = () => repositionMenu();
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenMenuId(null); };
    window.addEventListener('scroll', onWindow, true);
    window.addEventListener('resize', onWindow);
    window.addEventListener('keydown', onEsc);
    const sc = scrollRef.current; sc?.addEventListener('scroll', onWindow);
    return () => {
      window.removeEventListener('scroll', onWindow, true);
      window.removeEventListener('resize', onWindow);
      window.removeEventListener('keydown', onEsc);
      sc?.removeEventListener('scroll', onWindow);
    };
  }, [openMenuId]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (openMenuId == null) return;
      const menuEl = menuRef.current;
      const btnEl = btnRefs.current.get(openMenuId) || null;
      const target = e.target as Node;
      if (menuEl?.contains(target)) return;
      if (btnEl?.contains(target)) return;
      setOpenMenuId(null);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [openMenuId]);

  function openRenameModal(w: Workspace) {
    setOpenMenuId(null);
    setRenameTarget(w);
    setRenameValue(w.name);
  }

  async function confirmRename() {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name || name === renameTarget.name) { setRenameTarget(null); return; }
    setSaving(true);
    try {
      await updateWorkspace(renameTarget.id, { name });
      await reload();
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo renombrar el workspace');
    } finally {
      setSaving(false);
      setRenameTarget(null);
    }
  }

  async function handleDelete(w: Workspace) {
    const ok = await confirmToast({
      title: 'Enviar a papelera',
      body: <>¿Enviar el workspace <b>{w.name}</b> a la papelera?</>,
      confirmText: 'Enviar',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteWorkspace(w.id);
      await reload();
      if (selectedId === w.id) onSelect(0);
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo eliminar el workspace');
    } finally {
      setOpenMenuId(null);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 12, gap: 8 }}>
      <div ref={scrollRef} style={{ overflowY: 'auto', paddingRight: 4 }}>
        <div
          onClick={() => { setOpenMenuId(null); onSelect(0); }}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            background: selectedId === 0 ? '#eef2ff' : 'transparent',
            fontWeight: selectedId === 0 ? 700 : 500,
            marginBottom: 8,
          }}
        >
          Explorar
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Miembro + públicas</div>
        </div>

        {loading ? (
          <div style={{ color: '#6b7280', padding: 8 }}>Cargando…</div>
        ) : items.length === 0 ? (
          <div style={{ color: '#9ca3af', padding: 8 }}>Sin workspaces</div>
        ) : (
          items.map((w) => (
            <div
              key={w.id}
              onClick={() => { setOpenMenuId(null); onSelect(w.id); }}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                background: selectedId === w.id ? '#eef2ff' : 'transparent',
                fontWeight: selectedId === w.id ? 700 : 500,
                marginBottom: 6,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>{w.name}</div>
              <button
                aria-label="Opciones"
                title="Opciones"
                ref={(el) => { if (el) btnRefs.current.set(w.id, el); else btnRefs.current.delete(w.id); }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId((prev) => {
                    const next = prev === w.id ? null : w.id;
                    requestAnimationFrame(() => repositionMenu());
                    return next;
                  });
                }}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 18, lineHeight: 1, padding: '2px 6px', borderRadius: 6,
                }}
              >
                ⋮
              </button>

              {openMenuId === w.id &&
                createPortal(
                  <div
                    ref={menuRef}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'fixed',
                      top: menuPos.top,
                      left: menuPos.left,
                      minWidth: 180,
                      background: 'white',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 10,
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                      zIndex: 3000,
                      overflow: 'hidden',
                    }}
                  >
                    <MenuItem onClick={() => openRenameModal(w)}>Cambiar nombre</MenuItem>
                    <MenuItem danger onClick={() => handleDelete(w)}>Eliminar</MenuItem>
                  </div>,
                  document.body
                )}
            </div>
          ))
        )}
      </div>

      {canCreate && onOpenCreate && (
        <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)', marginBottom: 50 }}>
          <button
            onClick={onOpenCreate}
            className="btn primary"
            style={{ width: '100%', textAlign: 'center', borderRadius: 10, padding: '10px 12px', fontWeight: 700 }}
          >
            + Nuevo workspace
          </button>
        </div>
      )}

      {renameTarget &&
        createPortal(
          <>
            <div
              onClick={() => !saving && setRenameTarget(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 3500 }}
            />
            <div
              role="dialog"
              aria-modal="true"
              style={{ position: 'fixed', zIndex: 3600, inset: 0, display: 'grid', placeItems: 'center', padding: 16 }}
              onKeyDown={(e) => { if (e.key === 'Escape' && !saving) setRenameTarget(null); }}
            >
              <div
                className="card"
                style={{
                  width: '100%', maxWidth: 520, background: '#fff', borderRadius: 16,
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                  padding: 16, position: 'relative',
                }}
              >
                <button
                  onClick={() => !saving && setRenameTarget(null)}
                  aria-label="Cerrar"
                  style={{ position: 'absolute', right: 12, top: 12, border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}
                >
                  ×
                </button>

                <h3 style={{ margin: '4px 0 12px', fontSize: 18, fontWeight: 700 }}>Cambiar nombre</h3>

                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !saving) confirmRename(); }}
                  placeholder="Nombre del workspace"
                  className="input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border, #e5e7eb)', outline: 'none', fontSize: 14 }}
                />

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                  <button className="btn" onClick={() => !saving && setRenameTarget(null)} disabled={saving}>Cancelar</button>
                  <button className="btn primary" onClick={confirmRename} disabled={saving || !renameValue.trim()}>
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

function MenuItem({
  children,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: 13,
        color: danger ? '#b91c1c' : '#111827',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}