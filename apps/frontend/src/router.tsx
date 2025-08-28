// apps/frontend/src/router.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RequireAuth from './auth/RequireAuth';

export default function AppRouter() {
  return (
    <Routes>
      {/* públicas */}
      <Route path="/login" element={<Login />} />

      {/* privadas */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}