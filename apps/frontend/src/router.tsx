// apps/frontend/src/router.tsx (o AppRouter.tsx según tu estructura)
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RequireAuth from './auth/RequireAuth';
import BaseView from './pages/BaseView';
import ChangePassword from './pages/ChangePassword';
import BasesList from './pages/BasesList';
import TrashView from './pages/TrashView'; // <<<<<< NUEVO

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

      <Route
        path="/bases"
        element={
          <RequireAuth>
            <BasesList />
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