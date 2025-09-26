// apps/frontend/src/pages/components/CreateOrRenameTableModal.tsx
// -----------------------------------------------------------------------------
// Modal reutilizable para crear/renombrar tabla. Sin estilos inline.
// -----------------------------------------------------------------------------
import { useState, useEffect } from 'react';

type Props = {
  open: boolean;
  title: string;
  placeholder: string;
  initialValue?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
};

export default function CreateOrRenameTableModal({
  open, title, placeholder, initialValue, onClose, onSubmit, loading,
}: Props) {
  const [name, setName] = useState(initialValue ?? '');
  useEffect(() => { setName(initialValue ?? ''); }, [initialValue, open]);
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="m-0">{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <input
            className="input"
            placeholder={placeholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="modal-footer justify-end">
          <button className="btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={() => onSubmit(name.trim())}
            disabled={loading || name.trim().length === 0}
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}