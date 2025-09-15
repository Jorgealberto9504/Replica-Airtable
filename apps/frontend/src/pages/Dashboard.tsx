import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// UI compartida
import Header from '../components/Header';
import AdminRegisterModal from './components/AdminRegisterModal';

// 🔑 Estado global de sesión
import { useAuth } from '../auth/AuthContext';

// Workspaces / bases
import WorkspaceSidebar from './components/WorkspaceSidebar';
import BaseGrid from './components/BaseGrid';
import CreateWorkspaceModal from './components/CreateWorkspaceModal';
import CreateBaseModal from './components/CreateBaseModal';

// Helpers API
import { listMyWorkspaces, listBasesForWorkspace } from '../api/workspaces';

export default function Dashboard() {
  const { user: me, loading, logout } = useAuth();

  // Selección / modales
  const [selectedWs, setSelectedWs] = useState<number | null>(null);
  const [openRegister, setOpenRegister] = useState(false);
  const [openCreateWs, setOpenCreateWs] = useState(false);
  const [openCreateBase, setOpenCreateBase] = useState(false);

  // Query de búsqueda global (navbar)
  const [qBases, setQBases] = useState('');

  // 🔁 Señal para forzar recarga del grid tras crear
  const [reloadKey, setReloadKey] = useState(0);

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

  if (!me) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const resp = await listMyWorkspaces();
        setSelectedWs(resp.workspaces[0]?.id ?? 0);
      } catch {
        setSelectedWs(0);
      }
    })();
  }, []);

  const canCreate = me.platformRole === 'SYSADMIN' || !!(me as any).canCreateBases;

  async function refreshAfterCreate() {
    // “calentamos” y además disparamos recarga del grid
    if (selectedWs) {
      await listBasesForWorkspace(selectedWs).catch(() => {});
    }
    setReloadKey((k) => k + 1);
  }

  return (
    <>
      <Header
        user={me}
        onLogout={handleLogout}
        onOpenRegister={() => setOpenRegister(true)}
        searchBox={{
          value: qBases,
          onChange: setQBases,
          placeholder: 'Buscar bases…',
        }}
      />

      {/* Wrapper general: fondo del contenido central */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', background: '#f9fafb' }}>
        {/* === Sidebar blanco como el navbar === */}
        <aside
          className="ws-sidebar"
          style={{
            background: '#ffffff',
            borderRight: '1px solid var(--border)',
            width: 260,
            display: 'flex',          // asegura que el contenido interno pueda ocupar 100% de alto
            flexDirection: 'column',
          }}
        >
          <WorkspaceSidebar
            selectedId={selectedWs}
            onSelect={setSelectedWs}
            onOpenCreate={() => setOpenCreateWs(true)}
            canCreate={canCreate}
          />
        </aside>

        {/* Contenido principal */}
        <main style={{ flex: 1 }}>
          <BaseGrid
            workspaceId={selectedWs}
            onCreateBase={() => setOpenCreateBase(true)}
            canCreate={canCreate}
            query={qBases}
            showInlineSearch={false}
            reloadKey={reloadKey}     // 👈 fuerza recarga tras crear
          />
        </main>
      </div>

      <AdminRegisterModal
        open={openRegister}
        onClose={() => setOpenRegister(false)}
      />

      <CreateWorkspaceModal
        open={openCreateWs}
        onClose={() => setOpenCreateWs(false)}
        onCreated={refreshAfterCreate}
      />

      <CreateBaseModal
        open={openCreateBase}
        onClose={() => setOpenCreateBase(false)}
        workspaceId={selectedWs}
        onCreated={refreshAfterCreate}
      />
    </>
  );
}