// Sidebar de Workspaces (columna izquierda)
import { useEffect, useState } from 'react';
import type { Workspace } from '../../api/workspaces';
import { listMyWorkspaces } from '../../api/workspaces';

type Props = {
  selectedId: number | null;
  onSelect: (id: number) => void;
  onOpenCreate?: () => void; // botón "Nuevo workspace" (si tienes permisos)
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

  useEffect(() => {
    (async () => {
      try {
        const resp = await listMyWorkspaces();
        setItems(resp.workspaces);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <aside style={{ width: 260, padding: 12 }}>
      {/* Item fijo: Explorar (id virtual = 0) */}
      <div
        onClick={() => onSelect(0)}
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
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
          Miembro + públicas
        </div>
      </div>

      {/* Workspaces reales */}
      {loading ? (
        <div style={{ color: '#6b7280', padding: 8 }}>Cargando…</div>
      ) : items.length === 0 ? (
        <div style={{ color: '#9ca3af', padding: 8 }}>Sin workspaces</div>
      ) : (
        items.map((w) => (
          <div
            key={w.id}
            onClick={() => onSelect(w.id)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              background: selectedId === w.id ? '#eef2ff' : 'transparent',
              fontWeight: selectedId === w.id ? 700 : 500,
              marginBottom: 6,
            }}
          >
            {w.name}
          </div>
        ))
      )}

      {/* Botón "Nuevo workspace" si procede */}
      {canCreate && onOpenCreate && (
        <button
          onClick={onOpenCreate}
          style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 8,
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
          }}
        >
          + Nuevo workspace
        </button>
      )}
    </aside>
  );
}