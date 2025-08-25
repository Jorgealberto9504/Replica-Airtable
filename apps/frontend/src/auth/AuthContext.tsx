// apps/frontend/src/auth/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { fetchMe, doLogout } from '../api/auth';
import { postJSON } from '../api/http';

export type PlatformRole = 'USER' | 'SYSADMIN';
export type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  mustChangePassword: boolean;
  canCreateBases?: boolean; // podría llegar por /auth/me
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);




  // solicitamos al backend los datos del usuario y los guardamos en setUser
  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        setUser(me.user ?? null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const resp = await postJSON<{ ok: boolean; user?: AuthUser }>('/auth/login', {
      email: email.trim(),
      password: password.trim(),
    });
    if (!resp.ok || !resp.user) throw new Error('Credenciales inválidas');
    setUser(resp.user);
    return resp.user;
  }

  async function logout() {
    await doLogout();
    setUser(null);
  }

  async function refresh() {
    setLoading(true);
    try {
      const me = await fetchMe();
      setUser(me.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);    
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}