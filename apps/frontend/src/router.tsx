// apps/frontend/src/router.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RequireAuth from './auth/RequireAuth';
import BaseView from './pages/BaseView';
import ChangePassword from './pages/ChangePassword';
import TrashView from './pages/TrashView';

// NUEVO: gestión de usuarios (solo SYSADMIN; la page valida el rol)
import UsersAdminList from './pages/UsersAdminList';
import UsersAdminDetail from './pages/UsersAdminDetail';

export default function AppRouter() {
  return (
    <Routes>
      {/* públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />

      {/* privadas */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />

   

      {/* Papelera */}
      <Route
        path="/trash"
        element={
          <RequireAuth>
            <TrashView />
          </RequireAuth>
        }
      />

      {/* Gestión de usuarios */}
      <Route
        path="/admin/users"
        element={
          <RequireAuth>
            <UsersAdminList />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/users/:id"
        element={
          <RequireAuth>
            <UsersAdminDetail />
          </RequireAuth>
        }
      />

      {/* Base sin tabla (resolverá default si existe) */}
      <Route
        path="/bases/:baseId"
        element={
          <RequireAuth>
            <BaseView />
          </RequireAuth>
        }
      />

      {/* Base con tabla activa en URL */}
      <Route
        path="/bases/:baseId/t/:tableId"
        element={
          <RequireAuth>
            <BaseView />
          </RequireAuth>
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}