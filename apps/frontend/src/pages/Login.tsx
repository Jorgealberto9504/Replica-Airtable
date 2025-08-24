// apps/frontend/src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postJSON } from '../api/http';
import logo from '../assets/mbq-logo.png';

type LoginResp = {
  ok: boolean;
  user?: {
    id: number;
    email: string;
    fullName: string;
    platformRole: 'USER' | 'SYSADMIN';
    mustChangePassword: boolean;
  };
};

export default function Login() {
  const nav = useNavigate();

  // estado del formulario y UI
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      // nota: si tu backend guarda emails con el mismo casing que registraste,
      // deja `email` tal cual. Si decides normalizar, usa: const emailToSend = email.trim().toLowerCase();
      const resp = await postJSON<LoginResp>('/auth/login', {
        email: email.trim(),
        password: password.trim(),
      });

      if (resp.ok) {
        // si en el futuro necesitas forzar cambio de contraseña:
        // if (resp.user?.mustChangePassword) return nav('/change-password', { replace: true });
        nav('/dashboard', { replace: true });
        return;
      }
      setErr('Credenciales inválidas');
    } catch (e: any) {
      setErr(e?.message ?? 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Marca de agua a pantalla completa */}
      <div className="login-bg" style={{ backgroundImage: `url(${logo})` }} aria-hidden="true" />

      <div className="card login-card">
        <h1 className="title" style={{ textAlign: 'center' }}>Iniciar sesión</h1>

        {err && <div className="alert error" role="alert">{err}</div>}

        <form onSubmit={handleSubmit} className="form" style={{ display: 'grid', gap: 12 }}>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tucorreo@mbqinc.com"
            autoComplete="username"
            required
          />

          <label className="label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}