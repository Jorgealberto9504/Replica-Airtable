// apps/frontend/src/router.tsx
// Enrutador de la app. Aquí definimos qué componente se renderiza para cada URL.
// NOTA: Este árbol de <Routes> debe estar envuelto por <BrowserRouter> en main.tsx.

import { Routes, Route, Navigate } from 'react-router-dom'; // <Routes>/<Route> definen rutas; <Navigate> redirige
import Login from './pages/Login';               // pantalla de login
import Dashboard from './pages/Dashboard';       // panel principal (privado)

export default function AppRouter() {
  return (
    // <Routes> es el contenedor de todas las rutas (solo renderiza el <Route> que “matchea”)
    <Routes>
      {/* === Rutas públicas === */}

      {/* /login → muestra el formulario de inicio de sesión */}
      <Route path="/login" element={<Login />} />


      {/* === Rutas privadas === */}
      {/* /dashboard → pantalla principal tras autenticación.
          La protección (verificar sesión) por ahora la resuelve el propio componente Dashboard.
          Más adelante puedes envolverla con un <RequireAuth> si prefieres un guard de ruta. */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* === Fallback / Catch-all === */}
      {/* Cualquier ruta no conocida redirige a /login. 
          `replace` evita añadir la URL inválida al historial del navegador. */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}