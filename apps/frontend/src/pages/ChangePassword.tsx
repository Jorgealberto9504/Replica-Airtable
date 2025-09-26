// apps/frontend/src/pages/ChangePassword.tsx
// -----------------------------------------------------------------------------
// Cambiar contraseña (sin estilos inline).
// -----------------------------------------------------------------------------
import { useState } from 'react';
import { postJSON } from '../api/http';

export default function ChangePassword() {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(false);

    if (!pwd || !confirm) { setErr('Completa ambos campos'); return; }
    if (pwd !== confirm) { setErr('La confirmación no coincide'); return; }

    setLoading(true);
    try {
      const resp = await postJSON<{ ok: boolean }>('/auth/change-password', {
        newPassword: pwd,
        confirm,
      });
      if (resp.ok) {
        setOk(true);
        setTimeout(() => { window.location.href = '/dashboard'; }, 400);
      } else {
        setErr('No se pudo cambiar la contraseña');
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="card w-[360px]">
        <h2 className="section-title m-0 mb-2">Cambiar contraseña</h2>
        <p className="muted mb-4">Debes actualizar tu contraseña para continuar.</p>

        {err && <div className="alert-error" role="alert">{err}</div>}
        {ok && <div className="alert-success" role="alert">Contraseña actualizada.</div>}

        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="label" htmlFor="pwd">Nueva contraseña</label>
          <input
            id="pwd"
            className="input"
            type="password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={loading}
            required
          />

          <label className="label" htmlFor="confirm">Confirmar contraseña</label>
          <input
            id="confirm"
            className="input"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={loading}
            required
          />

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}