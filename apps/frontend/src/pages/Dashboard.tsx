// apps/frontend/src/pages/Dashboard.tsx

import { Navigate } from 'react-router-dom';

// UI compartida
import Header from '../components/Header';
import AdminRegisterModal from './components/AdminRegisterModal';

// 🔑 Traemos el estado global de sesión desde el Context
import { useAuth } from '../auth/AuthContext';
import { useState } from 'react';

export default function Dashboard() {
  // Del contexto obtenemos el usuario, estado de carga y el método de logout
  const { user: me, loading, logout } = useAuth();
  const [openRegister, setOpenRegister] = useState(false);

  // Mientras verificamos la sesión
  if (loading) {
    return (
      <div className="page-center">
        <div className="card">
          <h2 className="title" style={{ marginBottom: 8 }}>Verificando sesión…</h2>
          <p style={{ color: '#6b7280' }}>Un momento por favor.</p>
        </div>
      </div>
    );
  }

  // Si no hay sesión válida, fuera
  if (!me) return <Navigate to="/login" replace />;

  // Cerrar sesión usando el método del contexto
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.href = '/login';
    }
  };

  const heading = me.platformRole === 'SYSADMIN' ? 'Dashboard Admin' : 'Dashboard';

  return (
    <>
      <Header
        user={me}
        onLogout={handleLogout}
        onOpenRegister={() => setOpenRegister(true)}
      />

      <main className="dashboard-main">
        <section className="dashboard-card">
          <h2 style={{ marginBottom: 8 }}>{heading}</h2>
          <p style={{ color: '#6b7280' }}>
            Aqui Visualizaremos las bases que tengamos creadas.
          </p>
        </section>
      </main>

      <AdminRegisterModal
        open={openRegister}
        onClose={() => setOpenRegister(false)}
      />
    </>
  );
}