// apps/frontend/src/pages/BaseResolve.tsx
// -----------------------------------------------------------------------------
// Redirige a la primera tabla de la base (sin estilos).
// -----------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { listTabs } from '../api/tables';

export default function BaseResolve() {
  const { baseId = '' } = useParams();
  const [target, setTarget] = useState<{ baseId: number; tableId: number } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const id = Number(baseId);
      if (!Number.isFinite(id)) { setNotFound(true); return; }
      try {
        const r = await listTabs(id);
        const first = r.tabs.sort((a,b) => a.position - b.position)[0];
        if (!first) { setNotFound(true); return; }
        setTarget({ baseId: id, tableId: first.id });
      } catch {
        setNotFound(true);
      }
    })();
  }, [baseId]);

  if (notFound) return <Navigate to="/dashboard" replace />;
  if (!target) return null;
  return <Navigate to={`/bases/${target.baseId}/t/${target.tableId}`} replace />;
}