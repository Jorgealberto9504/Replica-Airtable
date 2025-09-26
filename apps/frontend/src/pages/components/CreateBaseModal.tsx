// apps/frontend/src/pages/components/CreateBaseModal.tsx
// Modal para crear Base dentro de un Workspace (sin estilos inline fijos)
import { useState } from 'react';
import { createBaseInWorkspace } from '../../api/workspaces';

type Props = {
  open: boolean;
  workspaceId: number | null;
  onClose: () => void;
  onCreated?: () => void;
};

export default function CreateBaseModal({ open, workspaceId, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !name.trim()) return;
    setSubmitting(true);
    try {
      await createBaseInWorkspace(workspaceId, { name: name.trim(), visibility });
      onCreated?.();
      onClose();
      setName('');
      setVisibility('PRIVATE');
    } catch (err: any) {
      alert(err.message || 'No se pudo crear la base');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="m-0 font-bold">Nueva base</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <label className="field">
            <span className="label">Nombre</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CRM, Inventario, Proyectos…"
            />
          </label>

          <label className="field">
            <span className="label">Visibilidad</span>
            <select
              className="select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}
            >
              <option value="PRIVATE">PRIVATE</option>
              <option value="PUBLIC">PUBLIC</option>
            </select>
          </label>
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn">Cancelar</button>
          <button
            type="button"
            onClick={handleSubmit as any}
            disabled={submitting || !name.trim() || !workspaceId}
            className="btn-primary"
          >
            {submitting ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}