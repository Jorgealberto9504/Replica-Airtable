// apps/frontend/src/pages/components/TabsBar.tsx
// Barra de tabs de tablas con drag & drop y menú contextual (sin estilos inline fijos)
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TabItem } from '../../api/tables';

type Props = {
  baseId: number;
  tabs: TabItem[];
  activeId: number | null;
  canManage: boolean;
  onSelect: (tableId: number) => void;
  onCreate?: () => void;
  onRename: (tableId: number) => void;
  onTrash: (tableId: number) => void;
  onReorder?: (orderedIds: number[]) => Promise<void> | void;
};

export default function TabsBar({
  tabs,
  activeId,
  canManage,
  onSelect,
  onCreate,
  onRename,
  onTrash,
  onReorder,
}: Props) {
  // ✅ Memoiza safeTabs para contentar a react-hooks/exhaustive-deps
  const safeTabs = useMemo<TabItem[]>(
    () => (Array.isArray(tabs) ? tabs : []),
    [tabs]
  );

  // menú contextual
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0, left: 0 });
  function openMenu(e: React.MouseEvent, tabId: number) {
    setMenuFor(tabId);
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const gap = 6;
    const desiredLeft = r.left;
    const fitsRight = desiredLeft + 220 < window.innerWidth - 8;
    setMenuPos({ top: r.bottom + gap, ...(fitsRight ? { left: desiredLeft } : { right: window.innerWidth - r.right }) });
  }
  function closeMenu() { setMenuFor(null); }

  // scroller + flechas
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
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
    const onR = () => updateArrows();
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  // ✅ deps estables (safeTabs memoizado). Si quieres aún más fino: [safeTabs.length]
  useEffect(() => { updateArrows(); }, [safeTabs]);

  // drag & drop
  function onDragStart(e: React.DragEvent<HTMLButtonElement>, id: number) {
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) { if (onReorder) e.preventDefault(); }
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

  // ✅ depende de safeTabs memoizado
  const sortedTabs = useMemo(
    () => [...safeTabs].sort((a, b) => a.position - b.position),
    [safeTabs]
  );

  return (
    <div className="tabs-wrap">
      {showLeft && (
        <button
          className="tabs-scroll-btn left"
          aria-label="Ver pestañas anteriores"
          onClick={() => scrollByPx(-280)}
        >‹</button>
      )}

      <div className="tabs-scroller" ref={scrollerRef} onScroll={updateArrows}>
        <div className="tabs-strip">
          {sortedTabs.map(t => {
            const isActive = t.id === activeId;
            return (
              <div
                key={t.id}
                className={`tab-slot${isActive ? ' is-active' : ''}`}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, t.id)}
              >
                <button
                  draggable={!!onReorder}
                  onDragStart={(e) => onDragStart(e, t.id)}
                  className="tab-btn"
                  aria-pressed={isActive}
                  onClick={() => onSelect(t.id)}
                  title={t.name}
                >
                  {t.name}
                </button>

                {/* Si prefieres que siempre se renderice y CSS lo oculte salvo activa:
                    usa {canManage && ( ... )} y deja el CSS .tab-slot.is-active .tab-menu-btn */}
                {canManage && isActive && (
                  <button
                    className="tab-menu-btn"
                    aria-label={`Opciones de ${t.name}`}
                    onClick={(e) => openMenu(e, t.id)}
                    title="Opciones"
                  >
                    ▾
                  </button>
                )}
              </div>
            );
          })}

          {canManage && onCreate && (
            <button className="tab-action-btn" onClick={onCreate} title="Nueva tabla">+</button>
          )}
        </div>
      </div>

      {showRight && (
        <button
          className="tabs-scroll-btn right"
          aria-label="Ver pestañas siguientes"
          onClick={() => scrollByPx(280)}
        >›</button>
      )}

      {menuFor != null && (
        <>
          <div className="context-overlay" onClick={closeMenu} />
          <div
            role="menu"
            className="context-panel"
            style={{
              position: 'fixed',
              top: menuPos.top,
              ...(menuPos.left != null ? { left: menuPos.left } : { right: menuPos.right }),
            }}
          >
            <button className="menu-item" onClick={() => { closeMenu(); onRename(menuFor); }}>Renombrar</button>
            <button className="menu-item-eliminar" onClick={() => { closeMenu(); onTrash(menuFor); }}>Enviar a papelera</button>
          </div>
        </>
      )}
    </div>
  );
}