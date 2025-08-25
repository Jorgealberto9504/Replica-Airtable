// apps/frontend/src/pages/Dashboard.tsx

// Hooks de React para manejar estado y efectos secundarios
import { useEffect, useState } from 'react';

// <Navigate> nos permite redirigir si el usuario no está autenticado
import { Navigate } from 'react-router-dom';

// Cliente de la API de auth: fetchMe llama a GET /auth/me y devuelve el usuario si hay sesión
import { fetchMe } from '../api/auth';
import type { MeResp } from '../api/auth';

// Componentes UI compartidos
import Header from '../components/Header';                 // barra superior (logo, rol, salir, etc.)
import AdminRegisterModal from './components/AdminRegisterModal'; // modal para registrar usuarios (solo SYSADMIN)

export default function Dashboard() {
  // Estado con la información del usuario autenticado (o null si no hay sesión)
  const [me, setMe] = useState<MeResp['user'] | null>(null);

  // Bandera de carga mientras verificamos la sesión con /auth/me
  const [loading, setLoading] = useState(true);

  // Controla la apertura/cierre del modal de registro
  const [openRegister, setOpenRegister] = useState(false);

  // Al montar el componente: consultamos al backend si hay sesión válida
  useEffect(() => {
    (async () => {
      try {
        // Llama a GET /auth/me (requiere cookie HttpOnly con el JWT)
        const data = await fetchMe();
        setMe(data.user);    // si hay sesión: guardamos al usuario
      } catch {
        // si falla (401, 403, sin cookie, etc.) dejamos al usuario como no autenticado
        setMe(null);
      } finally {
        // en cualquier caso, dejamos de "cargar"
        setLoading(false);
      }
    })();
  }, []); // [] => solo se ejecuta una vez al montar

  // Mientras verificamos la sesión no renderizamos nada (podrías mostrar un spinner si quieres)
  if (loading) return null;

  // Si NO hay usuario autenticado, redirigimos a /login
  if (!me) return <Navigate to="/login" replace />;

  // Acción al presionar "Salir" en el Header:
  // - llama a POST /auth/logout para borrar la cookie en el backend
  // - redirige al login
  const handleLogout = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  };

  return (
    <>
      {/* Barra superior fija con logo, rol, botón de registrar (si eres SYSADMIN) y botón de salir */}
      <Header
        user={me}                              // datos del usuario para mostrar rol/nombre
        onLogout={handleLogout}                // función para cerrar sesión
        onOpenRegister={() => setOpenRegister(true)} // abre el modal de registro (solo visible si es SYSADMIN)
      />

      {/* Contenido principal del dashboard.
          Estas clases vienen de styles/global.css y evitan usar estilos inline */}
      <main className="dashboard-main">
        <section className="dashboard-card">
          <h2 style={{ marginBottom: 8 }}>Dashboard Admin</h2>
          <p style={{ color: '#6b7280' }}>
            Aqui Visualizaremos las bases que tengamos creadas.
          </p>
        </section>
      </main>

      {/* Modal de registro controlado desde este componente (patrón "controlled component"):
          - open decide si se muestra
          - onClose cambia openRegister a false */}
      <AdminRegisterModal
        open={openRegister}
        onClose={() => setOpenRegister(false)}
      />
    </>
  );
}