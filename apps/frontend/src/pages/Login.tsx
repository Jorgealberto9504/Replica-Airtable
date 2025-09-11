// apps/frontend/src/pages/Login.tsx

// Hooks de React y navegación de React Router.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Cliente HTTP del proyecto (usa VITE_API_URL y `credentials: 'include'` para cookies).
import { postJSON } from '../api/http';

// Asset del logo que se usa como marca de agua de fondo en la pantalla de Login.
import logo from '../assets/mbq-logo.png';

// ====== Tipo de la respuesta que esperamos del backend al hacer /auth/login ======
type LoginResp = {
  ok: boolean;
  user?: {
    id: number;
    email: string;
    fullName: string;
    platformRole: 'USER' | 'SYSADMIN';
    mustChangePassword: boolean; // si es true, en el futuro podemos forzar flujo de cambio de password
    canCreateBases?: boolean;     // añadido por consistencia con lo que expone /auth/me
  };
};

// ====== Componente principal de Login ======
export default function Login() {
  // Hook de navegación para redirigir después de un login exitoso
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
      // Normalizamos los valores antes de enviarlos
      const resp = await postJSON<LoginResp>('/auth/login', {
        email: email.trim(),     // si algún día decides forzar lowercase, usa .toLowerCase()
        password: password.trim()
      });

      if (resp.ok && resp.user) {
        // (opcional) golpe rápido a /auth/me para “despertar” la cookie en dev
        try {
          await fetch(
            `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/auth/me`,
            { credentials: 'include' }
          );
        } catch {}

        // <<< REDIRECCIÓN INMEDIATA SEGÚN mustChangePassword >>>
        if (resp.user.mustChangePassword) {
          // a la pantalla especial de cambio de contraseña (sin recarga dura)
          nav('/change-password', { replace: true });
          return;
        }

        // si no debe cambiar password → al dashboard (recarga dura para asegurar cookie)
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
    <div className="login-page">
      {/* Marca de agua a pantalla completa (el CSS se encarga de cubrir y centrar) */}
      <div
        className="login-bg"
        style={{ backgroundImage: `url(${logo})` }}
        aria-hidden="true" // decorativo: no lo leen los lectores de pantalla
      />

      {/* Tarjeta de login */}
      <div className="card login-card">
        <h1 className="title" style={{ textAlign: 'center' }}>Iniciar sesión</h1>

        {/* Bloque de error si existe */}
        {err && <div className="alert error" role="alert">{err}</div>}

        {/* Formulario controlado */}
        <form onSubmit={handleSubmit} className="form" style={{ display: 'grid', gap: 12 }}>
          {/* Campo Email */}
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

          {/* Campo Password */}
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

          {/* Botón de envío: deshabilitado mientras loading=true */}
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}