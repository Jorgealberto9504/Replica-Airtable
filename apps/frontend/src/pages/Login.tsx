import { useState } from 'react';
import {
  login as apiLogin,
  me as apiMe,
  logout as apiLogout,
  adminRegister as apiAdminRegister,
  type Me,
  type Role,
} from '../api/auth';

export default function Login() {
  // --- login ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [me, setMe] = useState<Me | null>(null);

  // --- registro admin ---
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTempPwd, setNewTempPwd] = useState('');
  const [newRole, setNewRole] = useState<Role>('USER');

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg('');
    try {
      const res = await apiLogin(email, password); // { ok, user }
      setMsg(`Bienvenido ${res.user.fullName} (${res.user.platformRole})`);

      // refrescar "me"
      const m = await apiMe(); // { ok, user }
      setMe(m.user);
    } catch (err: any) {
      setMsg(err?.message ?? 'Error al iniciar sesión');
    }
  }

  async function onCheckMe() {
    setMsg('');
    setMe(null);
    try {
      const m = await apiMe();
      setMe(m.user);
    } catch (err: any) {
      setMsg(err?.message ?? 'Sesión no válida');
    }
  }

  async function onLogout() {
    setMsg('');
    setMe(null);
    try {
      await apiLogout();
      setMsg('Sesión cerrada');
    } catch (err: any) {
      setMsg(err?.message ?? 'Error al cerrar sesión');
    }
  }

  async function onAdminRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg('');
    try {
      const res = await apiAdminRegister({
        fullName: newFullName,
        email: newEmail,
        tempPassword: newTempPwd,
        platformRole: newRole,
      });
      setMsg(`Creado: ${res.user.fullName} (${res.user.email})`);
      setNewFullName('');
      setNewEmail('');
      setNewTempPwd('');
      setNewRole('USER');
    } catch (err: any) {
      setMsg(err?.message ?? 'Error al crear usuario');
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '2rem auto', fontFamily: 'system-ui, Arial' }}>
      <h2>Login</h2>

      <form onSubmit={onLogin} style={{ display: 'grid', gap: 8 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        />
        <button type="submit">Entrar</button>
      </form>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={onCheckMe}>/auth/me</button>
        <button onClick={onLogout}>Logout</button>
      </div>

      {msg && (
        <p style={{ marginTop: 12 }}>
          <b>Mensaje:</b> {msg}
        </p>
      )}

      {me && (
        <div style={{ marginTop: 12 }}>
          <pre style={{ background: '', padding: 12, borderRadius: 6 }}>
            {JSON.stringify(me, null, 2)}
          </pre>
        </div>
      )}

      {me?.platformRole === 'SYSADMIN' && (
        <div style={{ borderTop: '1px solid #ddd', marginTop: 24, paddingTop: 16 }}>
          <h3>Admin: registrar usuario</h3>

          <form onSubmit={onAdminRegister} style={{ display: 'grid', gap: 8 }}>
            <input
              type="text"
              placeholder="Nombre completo"
              value={newFullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFullName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Correo (dominio permitido)"
              value={newEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Password temporal (fuerte)"
              value={newTempPwd}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTempPwd(e.target.value)}
            />

            <select
              value={newRole}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setNewRole(e.target.value as Role)
              }
            >
              <option value="USER">USER</option>
              <option value="SYSADMIN">SYSADMIN</option>
            </select>

            <button type="submit">Crear usuario</button>

            <small>
              Reglas: al menos 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter
              especial.
            </small>
          </form>
        </div>
      )}
    </div>
  );
}