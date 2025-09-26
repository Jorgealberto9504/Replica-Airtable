// apps/frontend/src/components/Header.tsx
import { Link, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import logo from '../assets/mbq-logo.png';

type User = {
  fullName?: string;
  email?: string;
  platformRole?: 'USER' | 'SYSADMIN';
  canCreateBases?: boolean;
};

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type Props = {
  user?: User;
  onLogout: () => void;
  onOpenRegister?: () => void; // sólo SYSADMIN
  searchBox?: SearchBoxProps;
};

export default function Header({ user, onLogout, onOpenRegister, searchBox }: Props) {
  const nav = useNavigate();
  const isAdmin = user?.platformRole === 'SYSADMIN';
  const canSeeTrash = isAdmin || !!user?.canCreateBases;

  const [openMenu, setOpenMenu] = useState(false);
  const initial = useMemo(() => {
    const s = (user?.fullName || user?.email || '').trim();
    return s ? s[0]!.toUpperCase() : 'U';
  }, [user?.fullName, user?.email]);

  function toggleMenu() { setOpenMenu(v => !v); }
  function closeMenu() { setOpenMenu(false); }

  return (
    <header className="topbar gap-3">
      {/* Izquierda: logo */}
      <Link to="/dashboard" className="brand-link">
        <img src={logo} alt="MBQ" className="brand-logo h-16 md:h-20" />
      </Link>

      {/* Centro: buscador opcional */}
      <div className="header-center">
        {searchBox && (
          <input
            className="input header-search"
            placeholder={searchBox.placeholder ?? 'Buscar…'}
            value={searchBox.value}
            onChange={(e) => searchBox.onChange(e.target.value)}
          />
        )}
      </div>

      {/* Derecha: acciones */}
      <div className="header-actions">
        {isAdmin && onOpenRegister && (
          <button onClick={onOpenRegister} className="btn-primary">
            Registrar usuario
          </button>
        )}

        {user?.platformRole && (
          <span className="role-pill">{user.platformRole}</span>
        )}

        {/* Avatar */}
        <button
          onClick={toggleMenu}
          aria-haspopup="menu"
          aria-expanded={openMenu}
          className="avatar-btn"
          title={user?.fullName || user?.email || 'Usuario'}
        >
          {initial}
        </button>

        {/* Overlay + panel */}
        {openMenu && (
          <>
            <button className="dropdown-overlay" onClick={closeMenu} aria-label="Cerrar menú" />
            <div role="menu" className="dropdown-panel">
              <div className="dropdown-header">
                <div className="font-extrabold">{user?.fullName || user?.email || 'Usuario'}</div>
                <div className="dropdown-email">{user?.email || '—'}</div>
              </div>

              {isAdmin && (
                <button
                  className="menu-item"
                  onClick={() => { closeMenu(); nav('/admin/users'); }}
                >
                  👥 Gestión de usuarios
                </button>
              )}

              {canSeeTrash && (
                <button
                  className="menu-item"
                  onClick={() => { closeMenu(); nav('/trash'); }}
                >
                  🗑️ Papelera de reciclaje
                </button>
              )}

              <button className="menu-item" onClick={() => { closeMenu(); onLogout(); }}>
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}