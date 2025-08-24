// apps/frontend/src/pages/components/AdminRegisterModal.tsx
import { useState } from 'react';
import Modal from '../../components/Modal';
import { adminRegisterUser } from '../../api/auth';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void; // callback para refrescar lista en el futuro
};

function isEmailBasic(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// validación rápida (el backend también valida con reglas fuertes)
function looksStrong(pwd: string) {
  return pwd.length >= 8
    && /[a-z]/.test(pwd)
    && /[A-Z]/.test(pwd)
    && /\d/.test(pwd)
    && /[^A-Za-z0-9]/.test(pwd);
}

export default function AdminRegisterModal({ open, onClose, onCreated }: Props) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [platformRole, setPlatformRole] = useState<'USER' | 'SYSADMIN'>('USER');
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);

    if (!fullName || !email || !tempPassword) {
      setErr('Todos los campos son obligatorios');
      return;
    }
    if (!isEmailBasic(email)) {
      setErr('Email inválido');
      return;
    }
    if (!looksStrong(tempPassword)) {
      setErr('La contraseña debe tener 8+ caracteres, mayúscula, minúscula, número y símbolo.');
      return;
    }

    setLoading(true);
    try {
      const resp = await adminRegisterUser({ email, fullName, tempPassword, platformRole });
      if (resp.ok) {
        setOkMsg('Usuario registrado correctamente');
        setEmail(''); setFullName(''); setTempPassword(''); setPlatformRole('USER');
        onCreated?.();
      } else {
        setErr('No se pudo registrar');
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registro de usuario">
      <form onSubmit={handleSubmit} className="form">
        {err && <div className="alert error">{err}</div>}
        {okMsg && <div className="alert" style={{ background:'#e6f4ff', border:'1px solid #bfdbfe', color:'#1d4ed8' }}>{okMsg}</div>}

        <label className="label">Nombre completo</label>
        <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} />

        <label className="label">Email</label>
        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@mbqinc.com" />

        <label className="label">Contraseña temporal</label>
        <input className="input" type="password" value={tempPassword} onChange={e => setTempPassword(e.target.value)} placeholder="Aa12345!" />

        <label className="label">Rol global</label>
        <select className="input" value={platformRole} onChange={e => setPlatformRole(e.target.value as any)}>
          <option value="USER">USER</option>
          <option value="SYSADMIN">SYSADMIN</option>
        </select>

        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={loading}>{loading ? 'Guardando…' : 'Registrar'}</button>
        </div>
      </form>
    </Modal>
  );
}