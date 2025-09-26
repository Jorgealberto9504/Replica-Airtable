// apps/frontend/src/ui/confirmToast.tsx
// -----------------------------------------------------------------------------
// confirmToast: mensaje de confirmación/alerta en forma de toast.
// - Sin estilos inline; usa clases centralizadas del index.css
// - Soporta variantes (neutral/success/info/warning/danger)
// - Puede actuar como "alert" (solo botón Confirmar) con auto-cierre opcional
// -----------------------------------------------------------------------------
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

type Variant = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

type Options = {
  title?: string;
  body?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;        // compat: pinta el botón confirmar como .btn.danger
  overlay?: boolean;       // true por defecto

  // extras tipo "alert"
  confirmOnly?: boolean;   // si true, NO muestra Cancelar
  variant?: Variant;       // acento de color (borde izquierdo)
  autoCloseMs?: number;    // autocierre (ej. 3000)
};

const VAR_CLASS: Record<Variant, string> = {
  neutral: 'toast-accent-neutral',
  success: 'toast-accent-success',
  info:    'toast-accent-info',
  warning: 'toast-accent-warning',
  danger:  'toast-accent-danger',
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
      }, [opts.autoCloseMs]);

      const variant: Variant = opts.variant ?? (opts.danger ? 'danger' : 'neutral');
      const accentClass = VAR_CLASS[variant];

      return (
        <>
          {opts.overlay !== false && (
            <div className="toast-overlay" onClick={() => close(false)} />
          )}

          <div className="toast-wrap">
            <div className={`toast-card ${accentClass}`}>
              {opts.title && <div className="toast-title">{opts.title}</div>}
              {opts.body && <div className="toast-body">{opts.body}</div>}

              <div className="toast-actions">
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