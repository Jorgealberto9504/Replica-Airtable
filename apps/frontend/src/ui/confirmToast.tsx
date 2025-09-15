import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

type Variant = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

type Options = {
  title?: string;
  body?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;        // mantiene compatibilidad: pinta el botón confirmar como .btn.danger
  overlay?: boolean;       // true por defecto

  // 🆕 extras para usarlo como "alert"
  confirmOnly?: boolean;   // si true, NO muestra el botón Cancelar
  variant?: Variant;       // acento de color (borde izquierdo)
  autoCloseMs?: number;    // autocierre (ej. 3000). Solo si quieres
};

const VAR_COLORS: Record<Variant, string> = {
  neutral: '#e5e7eb',
  success: '#10b981',
  info:    '#3b82f6',
  warning: '#f59e0b',
  danger:  '#ef4444',
};

/** Muestra un toast de confirmación/alerta y resuelve true/false */
export function confirmToast(opts: Options): Promise<boolean> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  return new Promise<boolean>((resolve) => {
    const close = (v: boolean) => {
      root.unmount();
      container.remove();
      resolve(v);
    };

    function Toast() {
      // Teclas rápidas
      useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
          if (e.key === 'Escape') close(false);
          if (e.key === 'Enter')  close(true);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
      }, []);

      // Autocierre opcional
      useEffect(() => {
        if (opts.autoCloseMs && opts.autoCloseMs > 0) {
          const t = setTimeout(() => close(true), opts.autoCloseMs);
          return () => clearTimeout(t);
        }
      }, []);

      const variant = opts.variant ?? (opts.danger ? 'danger' : 'neutral');
      const accent  = VAR_COLORS[variant];

      return (
        <>
          {opts.overlay !== false && (
            <div
              onClick={() => close(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.35)',
                zIndex: 5000,
              }}
            />
          )}

          <div
            style={{
              position: 'fixed',
              zIndex: 5010,
              top: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 24px)',
              maxWidth: 520,
            }}
          >
            {/* Card MBQ */}
            <div
              className="card"
              style={{
                border: '1px solid var(--border, #e5e7eb)',
                borderRadius: 12,
                boxShadow:
                  '0 10px 15px -3px rgba(0,0,0,.08), 0 4px 6px -2px rgba(0,0,0,.05)',
                background: '#fff',
                color: '#111827',
                padding: 14,
                borderLeft: `6px solid ${accent}`,  // acento de color
              }}
            >
              {opts.title && (
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{opts.title}</div>
              )}

              {opts.body && <div className="muted" style={{ opacity: 0.95 }}>{opts.body}</div>}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {/* Oculto si confirmOnly === true */}
                {!opts.confirmOnly && (
                  <button className="btn" onClick={() => close(false)}>
                    {opts.cancelText ?? 'Cancelar'}
                  </button>
                )}
                <button
                  className={`btn ${opts.danger ? 'danger' : 'primary'}`}
                  onClick={() => close(true)}
                >
                  {opts.confirmText ?? (opts.confirmOnly ? 'Entendido' : 'Aceptar')}
                </button>
              </div>
            </div>
          </div>
        </>
      );
    }

    root.render(<Toast />);
  });
}