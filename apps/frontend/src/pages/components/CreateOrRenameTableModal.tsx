// apps/frontend/src/pages/components/CreateOrRenameTableModal.tsx
import { useState, useEffect } from 'react';

export default function CreateOrRenameTableModal({
  open,
  title,
  placeholder,
  initialValue,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  title: string;
  placeholder: string;
  initialValue?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
}) {
  const [name, setName] = useState(initialValue ?? '');

  useEffect(() => { setName(initialValue ?? ''); }, [initialValue, open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3 className="title" style={{ marginBottom: 12 }}>{title}</h3>
        <input
          className="input"
          placeholder={placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button
            className="btn primary"
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