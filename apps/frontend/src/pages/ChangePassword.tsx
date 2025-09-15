// apps/frontend/src/pages/ChangePassword.tsx
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

    if (!pwd || !confirm) {
      setErr('Completa ambos campos');
      return;
    }
    if (pwd !== confirm) {
      setErr('La confirmación no coincide');
      return;
    }

    setLoading(true);
    try {
      // backend valida fuerza y rota el JWT
      const resp = await postJSON<{ ok: boolean }>('/auth/change-password', {
        newPassword: pwd,
        confirm,
      });
      if (resp.ok) {
        setOk(true);
        // tras un pequeño respiro, vamos al dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 400);
      } else {
        setErr('No se pudo cambiar la contraseña');
      }
    } catch (e: any) {
      // el backend manda mensajes claros (p. ej. STRONG_PWD_HELP)
      setErr(e?.message ?? 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="card" style={{ minWidth: 360 }}>
        <h2 className="title" style={{ marginBottom: 8 }}>Cambiar contraseña</h2>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>
          Debes actualizar tu contraseña para continuar.
        </p>

        {err && <div className="alert error" role="alert">{err}</div>}
        {ok && <div className="alert success" role="alert">Contraseña actualizada.</div>}

        <form onSubmit={handleSubmit} className="form" style={{ display: 'grid', gap: 12 }}>
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

          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}