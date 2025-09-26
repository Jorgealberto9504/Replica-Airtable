// apps/frontend/src/pages/Dashboard.tsx
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import Header from '../components/Header';
import AdminRegisterModal from './components/AdminRegisterModal';

import { useAuth } from '../auth/AuthContext';

import WorkspaceSidebar from './components/WorkspaceSidebar';
import BaseGrid from './components/BaseGrid';
import CreateWorkspaceModal from './components/CreateWorkspaceModal';
import CreateBaseModal from './components/CreateBaseModal';

import { listMyWorkspaces, listBasesForWorkspace } from '../api/workspaces';

export default function Dashboard() {
  const { user: me, loading, logout } = useAuth();

  const [selectedWs, setSelectedWs] = useState<number | null>(null);
  const [openRegister, setOpenRegister] = useState(false);
  const [openCreateWs, setOpenCreateWs] = useState(false);
  const [openCreateBase, setOpenCreateBase] = useState(false);

  const [qBases, setQBases] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  if (loading) {
    return (
      <div className="page-center">
        <div className="card">
          <h2 className="section-title mb-2">Verificando sesión…</h2>
          <p className="muted">Un momento por favor.</p>
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

      {/* Shell principal */}
      <div className="main-wrap">
        {/* Sidebar */}
        <aside className="ws-sidebar">
          <WorkspaceSidebar
            selectedId={selectedWs}
            onSelect={setSelectedWs}
            onOpenCreate={() => setOpenCreateWs(true)}
            canCreate={canCreate}
          />
        </aside>

        {/* Contenido */}
        <main className="flex-1">
          <BaseGrid
            workspaceId={selectedWs}
            onCreateBase={() => setOpenCreateBase(true)}
            canCreate={canCreate}
            query={qBases}
            showInlineSearch={false}
            reloadKey={reloadKey}
          />
        </main>
      </div>

      <AdminRegisterModal open={openRegister} onClose={() => setOpenRegister(false)} />

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