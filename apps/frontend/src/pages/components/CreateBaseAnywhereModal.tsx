// apps/frontend/src/pages/components/CreateBaseAnywhereModal.tsx
// -----------------------------------------------------------------------------
// Crear base en cualquier workspace. Sin estilos inline.
// -----------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { listMyWorkspaces, createBaseInWorkspace } from '../../api/workspaces';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

type WS = { id: number; name: string };

export default function CreateBaseAnywhereModal({ open, onClose, onCreated }: Props) {
  const [workspaces, setWorkspaces] = useState<WS[]>([]);
  const [wsId, setWsId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const r = await listMyWorkspaces();
        setWorkspaces(r.workspaces ?? []);
        setWsId(r.workspaces?.[0]?.id ?? null);
      } catch {
        setWorkspaces([]);
        setWsId(null);
      }
    })();
  }, [open]);

  if (!open) return null;

  async function submit() {
    if (!wsId || !name.trim()) return;
    setSubmitting(true);
    try {
      await createBaseInWorkspace(wsId, { name: name.trim(), visibility });
      onCreated?.();
      setName('');
      setVisibility('PRIVATE');
      onClose();
    } catch (e: any) {
      alert(e?.message || 'No se pudo crear la base');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="m-0">Nueva base</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body grid gap-3">
          <label className="field">
            <span>Workspace</span>
            <select
              className="select"
              value={wsId ?? ''}
              onChange={e => setWsId(Number(e.target.value) || null)}
            >
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Nombre</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CRM, Inventario, Proyectos…"
            />
          </label>

          <label className="field">
            <span>Visibilidad</span>
            <select
              className="select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}
            >
              <option value="PRIVATE">PRIVATE</option>
              <option value="PUBLIC">PUBLIC</option>
            </select>
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={submitting || !name.trim() || !wsId} onClick={submit}>
            {submitting ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}