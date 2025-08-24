import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchMe } from '../api/auth';
import type { MeResp } from '../api/auth';
import Header from '../components/Header';
import AdminRegisterModal from './components/AdminRegisterModal';

export default function Dashboard() {
  const [me, setMe] = useState<MeResp['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [openRegister, setOpenRegister] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMe();
        setMe(data.user);
      } catch {
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;
  if (!me) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  };

  return (
    <>
      <Header
        user={me}
        onLogout={handleLogout}
        onOpenRegister={() => setOpenRegister(true)} // <-- botón del navbar
      />

      <main
        style={{
          maxWidth: 960,
          margin: '24px auto',
          padding: 16,
        }}
      >
        <section
          style={{
            maxWidth: 560,
            margin: '40px auto',
            padding: 24,
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
          }}
        >
          <h2 style={{ marginBottom: 8 }}>Dashboard Admin</h2>
          <p style={{ color: '#6b7280' }}>
            Desde aquí podrás registrar usuarios de la plataforma.
          </p>
        </section>
      </main>

      {/* Modal de registro controlado aquí */}
      <AdminRegisterModal
        open={openRegister}
        onClose={() => setOpenRegister(false)}
      />
    </>
  );
}