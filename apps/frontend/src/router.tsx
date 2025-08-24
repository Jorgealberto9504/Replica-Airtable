// apps/frontend/src/router.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegisterInfo from './pages/RegisterInfo';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* públicas */}
        <Route path="/login" element={<Login />} />
        {/* /register es informativa porque el registro lo hace el SYSADMIN */}
        <Route path="/register" element={<RegisterInfo />} />

        {/* privadas (protección dentro del componente) */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* default */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}