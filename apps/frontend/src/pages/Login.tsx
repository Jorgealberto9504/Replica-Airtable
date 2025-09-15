// apps/frontend/src/pages/Login.tsx

// Hooks de React y navegación de React Router.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Cliente HTTP del proyecto (usa VITE_API_URL y `credentials: 'include'` para cookies).
import { postJSON } from '../api/http';

// Asset del logo
import logo from '../assets/mbq-logo.png';

// ====== Tipo de la respuesta que esperamos del backend al hacer /auth/login ======
type LoginResp = {
  ok: boolean;
  user?: {
    id: number;
    email: string;
    fullName: string;
    platformRole: 'USER' | 'SYSADMIN';
    mustChangePassword: boolean;
    canCreateBases?: boolean;
  };
};

// ====== Componente principal de Login ======
export default function Login() {
  const nav = useNavigate();

  // ====== Estado local del formulario ======
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ====== Manejador del submit del formulario ======
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const resp = await postJSON<LoginResp>('/auth/login', {
        email: email.trim(),
        password: password.trim()
      });

      if (resp.ok && resp.user) {
        try {
          await fetch(
            `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/auth/me`,
            { credentials: 'include' }
          );
        } catch {}

        if (resp.user.mustChangePassword) {
          nav('/change-password', { replace: true });
          return;
        }
        window.location.href = '/dashboard';
        return;
      }
      setErr('Credenciales inválidas');
    } catch (e: any) {
      setErr(e?.message ?? 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  // ====== Render ======
  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Panel izquierdo: gradiente + logo */}
        <aside className="auth-illustration">
          <img src={logo} alt="MBQ" className="auth-logo" />
          <div className="auth-illu-copy">
            <h2>Bienvenido a MBQ</h2>
            <p>Organiza, colabora y acelera tu trabajo.</p>
          </div>
        </aside>

        {/* Panel derecho: formulario (misma lógica de siempre) */}
        <section className="auth-form">
          <h1 className="auth-title">Iniciar sesión</h1>

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
              spellCheck={false}
              required
              disabled={loading}
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
              disabled={loading}
            />

            <button className="btn primary pill" type="submit" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}