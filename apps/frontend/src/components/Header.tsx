import { Link } from 'react-router-dom';
import logo from '../assets/mbq-logo.png';

type User = {
  fullName?: string;
  platformRole?: 'USER' | 'SYSADMIN';
};

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type Props = {
  user?: User;
  onLogout: () => void;
  onOpenRegister?: () => void; // se usa sólo para SYSADMIN
  /** Cuando se envía, muestra el buscador centrado en el header */
  searchBox?: SearchBoxProps;
};

export default function Header({ user, onLogout, onOpenRegister, searchBox }: Props) {
  const isAdmin = user?.platformRole === 'SYSADMIN';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Izquierda: logo */}
      <Link
        to="/dashboard"
        style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
      >
        <img src={logo} alt="MBQ" style={{ height: 65 }} />
      </Link>

      {/* Centro: buscador (si se pasa) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {searchBox && (
          <input
            className="input"
            style={{ maxWidth: 480, width: '100%', borderRadius: 999 }}
            placeholder={searchBox.placeholder ?? 'Buscar…'}
            value={searchBox.value}
            onChange={(e) => searchBox.onChange(e.target.value)}
          />
        )}
      </div>

      {/* Derecha: acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isAdmin && onOpenRegister && (
          <button
            onClick={onOpenRegister}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: '#2563eb',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Registrar usuario
          </button>
        )}
        {user?.platformRole && (
          <span
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              background: '#eef2ff',
              color: '#3730a3',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {user.platformRole}
          </span>
        )}
        <button
          onClick={onLogout}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            color: '#111827',
            cursor: 'pointer',
          }}
        >
          Salir
        </button>
      </div>
    </header>
  );
}