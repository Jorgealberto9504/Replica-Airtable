import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { listTabs } from '../api/tables';
// Si ya tienes un endpoint /bases/:baseId/resolve, puedes llamarlo aquí;
// de lo contrario usamos listTabs para obtener la primera.

export default function BaseResolve() {
  const { baseId = '' } = useParams();
  const [target, setTarget] = useState<{ baseId: number; tableId: number } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const id = Number(baseId);
      if (!Number.isFinite(id)) { setNotFound(true); return; }
      try {
        // 1) intenta con listTabs y toma la primera por posición
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
  if (!target) return null; // pantalla en blanco un instante (muy rápido)
  return <Navigate to={`/bases/${target.baseId}/t/${target.tableId}`} replace />;
}