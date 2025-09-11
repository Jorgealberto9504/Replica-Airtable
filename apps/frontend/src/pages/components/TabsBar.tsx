// Barra de tabs de tablas con drag & drop y menú contextual
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TabItem } from '../../api/tables';

type Props = {
  baseId: number;
  tabs: TabItem[];                 // puede venir []
  activeId: number | null;
  canManage: boolean;
  onSelect: (tableId: number) => void;
  onCreate?: () => void;
  onRename: (tableId: number) => void;
  onTrash: (tableId: number) => void;
  onReorder?: (orderedIds: number[]) => Promise<void> | void;
};

export default function TabsBar({
  baseId: _baseId,
  tabs,
  activeId,
  canManage,
  onSelect,
  onCreate,
  onRename,
  onTrash,
  onReorder,
}: Props) {
  const safeTabs = Array.isArray(tabs) ? tabs : []; // 🔒 robusto

  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0, left: 0 });

  // Scroller con flechas
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft]   = useState(false);
  const [showRight, setShowRight] = useState(false);

  function updateArrows() {
    const el = scrollerRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 4);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }
  function scrollByPx(px: number) {
    scrollerRef.current?.scrollBy({ left: px, behavior: 'smooth' });
  }

  useEffect(() => {
    updateArrows();
    const onResize = () => updateArrows();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { updateArrows(); }, [safeTabs]);

  // Menú contextual
  function openMenu(e: React.MouseEvent, tabId: number) {
    setMenuFor(tabId);
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

  // Drag & drop
  function onDragStart(e: React.DragEvent<HTMLButtonElement>, id: number) {
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!onReorder) return;
    e.preventDefault();
  }
  async function onDrop(e: React.DragEvent<HTMLDivElement>, overId: number) {
    if (!onReorder) return;
    e.preventDefault();
    const draggedId = Number(e.dataTransfer.getData('text/plain'));
    if (!draggedId || draggedId === overId) return;

    const ids = sortedTabs.map(t => t.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0) return;

    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, draggedId);

    await onReorder(next);
  }

  const sortedTabs = useMemo(
    () => [...safeTabs].sort((a, b) => a.position - b.position),
    [safeTabs]
  );

  return (
    <div className="tabs-wrap">
      {/* Flecha izquierda */}
      {showLeft && (
        <button className="tabs-scroll-btn left" aria-label="Ver pestañas anteriores" onClick={() => scrollByPx(-280)}>
          ‹
        </button>
      )}

      {/* Scroller */}
      <div className="tabs-scroller" ref={scrollerRef} onScroll={updateArrows}>
        <div className="tabs-strip">
          {sortedTabs.map((t) => {
            const isActive = t.id === activeId;
            return (
              <div
                key={t.id}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, t.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <button
                  draggable={!!onReorder}
                  onDragStart={(e) => onDragStart(e, t.id)}
                  className="chip"
                  aria-pressed={isActive}
                  onClick={() => onSelect(t.id)}
                  style={{
                    padding: isActive ? '9px 16px' : '6px 12px',
                    fontWeight: isActive ? 800 : 600,
                    border: isActive ? '1px solid #c7d2fe' : '1px solid #e5e7eb',
                    transform: isActive ? 'translateY(-2px)' : 'none',
                    zIndex: isActive ? 2 : 1,
                  }}
                >
                  {t.name}
                </button>

                {canManage && (
                  <button
                    className="chip"
                    aria-label={`Menú de ${t.name}`}
                    onClick={(e) => openMenu(e, t.id)}
                    style={{ padding: '6px 8px' }}
                  >
                    …
                  </button>
                )}
              </div>
            );
          })}

          {canManage && onCreate && (
            <button className="btn" onClick={onCreate} style={{ marginLeft: 8 }}>
              + Nueva tabla
            </button>
          )}
        </div>
      </div>

      {/* Flecha derecha */}
      {showRight && (
        <button className="tabs-scroll-btn right" aria-label="Ver pestañas siguientes" onClick={() => scrollByPx(280)}>
          ›
        </button>
      )}

      {/* Menú contextual */}
      {menuFor != null && (
        <>
          <div
            onClick={closeMenu}
            style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 49 }}
          />
          <div
            role="menu"
            style={{
              position: 'fixed',
              top: menuPos.top,
              ...(menuPos.left != null ? { left: menuPos.left } : { right: menuPos.right }),
              zIndex: 50,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              boxShadow: '0 10px 20px rgba(0,0,0,.08)',
              width: 220,
              padding: 6,
            }}
          >
            <button className="menu-item" onClick={() => { closeMenu(); onRename(menuFor); }}>
              Renombrar
            </button>
            <button className="menu-item" onClick={() => { closeMenu(); onTrash(menuFor); }}>
              Enviar a papelera
            </button>
          </div>
        </>
      )}
    </div>
  );
}