// apps/frontend/src/auth/RequireAuth.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, mustChangePassword } = useAuth();
  if (loading) return null;

  // Si debe cambiar password, lo mandamos a la pantalla especial
  if (mustChangePassword) return <Navigate to="/change-password" replace />;

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}