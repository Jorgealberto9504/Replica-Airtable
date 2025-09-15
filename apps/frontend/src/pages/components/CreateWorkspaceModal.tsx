import { useState } from 'react';
import { createWorkspace } from '../../api/workspaces';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void; // opcional: por si el padre quiere refrescar
};

export default function CreateWorkspaceModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      // ← hacemos el POST y obtenemos el workspace creado
      const res = await createWorkspace({ name: name.trim() });
      const ws = res.workspace;

      // ← avisamos globalmente que se creó un workspace nuevo
      window.dispatchEvent(new CustomEvent('workspace:created', { detail: ws }));

      // (opcional) callback del padre si lo usa
      onCreated?.();

      // UI
      onClose();
      setName('');
    } catch (err: any) {
      alert(err.message || 'No se pudo crear el workspace');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Nuevo workspace</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <label className="field">
            <span>Nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Equipo de Marketing"
            />
          </label>
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn">Cancelar</button>
          <button
            type="button"
            onClick={handleSubmit as any}
            disabled={submitting || !name.trim()}
            className="btn primary"
          >
            {submitting ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}