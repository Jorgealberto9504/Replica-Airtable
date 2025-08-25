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
  };
};

// ====== Componente principal de Login ======
export default function Login() {
  // Hook de navegación para redirigir después de un login exitoso
  const nav = useNavigate();

  // ====== Estado local del formulario ======
  // email/password: valores controlados de los inputs
  // err: mensaje de error para mostrar en la UI
  // loading: bandera para deshabilitar el botón mientras se hace la petición
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ====== Manejador del submit del formulario ======
  // - Previene recarga de página
  // - Limpia error previo y activa loading
  // - Llama a POST /auth/login con email y password
  // - Si ok -> navega a /dashboard
  // - Si falla -> muestra mensaje de error
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      // Nota: si en el backend decidimos guardar emails normalizados, aquí podríamos usar .toLowerCase().
      const resp = await postJSON<LoginResp>('/auth/login', {
        email: email.trim(),
        password: password.trim(),
      });

      if (resp.ok) {
        // Si en el futuro queremos forzar cambio de contraseña:
        // if (resp.user?.mustChangePassword) return nav('/change-password', { replace: true });

        // Redirige al dashboard (reemplaza la historia para no volver con "atrás")
        nav('/dashboard', { replace: true });
        return;
      }

      // Si el backend respondió ok:false, mostramos un mensaje genérico
      setErr('Credenciales inválidas');
    } catch (e: any) {
      // Errores de red o de status HTTP no-OK parseados por handleRes en http.ts
      setErr(e?.message ?? 'Error de conexión');
    } finally {
      // Siempre apagar loading al final
      setLoading(false);
    }
  }

  // ====== Render ======
  // Estructura:
  // - Contenedor .login-page (centra la tarjeta)
  // - Fondo .login-bg con el logo como marca de agua (CSS en styles/global.css)
  // - Tarjeta .login-card con el formulario
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
            onChange={e => setEmail(e.target.value)} // actualiza estado
            placeholder="tucorreo@mbqinc.com"
            autoComplete="username"
            required
          />

          {/* Campo Password */}
          <label className="label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)} // actualiza estado
            placeholder="••••••••"
            autoComplete="current-password"
            required
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