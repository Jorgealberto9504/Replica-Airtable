// apps/frontend/src/components/Header.tsx
import { Link, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import logo from '../assets/mbq-logo.png';

type User = {
  fullName?: string;
  email?: string;
  platformRole?: 'USER' | 'SYSADMIN';
  canCreateBases?: boolean; // decide si ve la papelera
};

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type Props = {
  user?: User;
  onLogout: () => void;
  onOpenRegister?: () => void; // sólo para SYSADMIN
  /** Cuando se envía, muestra el buscador centrado en el header */
  searchBox?: SearchBoxProps;
};

export default function Header({ user, onLogout, onOpenRegister, searchBox }: Props) {
  const nav = useNavigate();
  const isAdmin = user?.platformRole === 'SYSADMIN';
  // Solo SYSADMIN o creadores ven la opción de "Papelera de reciclaje"
  const canSeeTrash = isAdmin || !!user?.canCreateBases;

  // Avatar + dropdown
  const [openMenu, setOpenMenu] = useState(false);
  const initial = useMemo(() => {
    const s = (user?.fullName || user?.email || '').trim();
    return s ? s[0]!.toUpperCase() : 'U';
  }, [user?.fullName, user?.email]);

  function toggleMenu() { setOpenMenu(v => !v); }
  function closeMenu() { setOpenMenu(false); }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0px 16px',
        background: '#ffffff',
        borderBottom: '2px solid #e5e7eb',
       
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
        <img src={logo} alt="MBQ" style={{ height: 80 }} />
      </Link>

      {/* Centro: buscador (si se pasa) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {searchBox && (
          <input
            className="input topbar-search"
            placeholder={searchBox.placeholder ?? 'Buscar…'}
            value={searchBox.value}
            onChange={(e) => searchBox.onChange(e.target.value)}
          />
        )}
      </div>

      {/* Derecha: acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        {isAdmin && onOpenRegister && (
          <button
            onClick={onOpenRegister}
            className="btn primary"
            style={{ padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}
          >
            Registrar usuario
          </button>
        )}

        {/* Pill de rol (opcional) */}
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

        {/* Avatar con inicial → abre menú */}
        <button
          onClick={toggleMenu}
          aria-haspopup="menu"
          aria-expanded={openMenu}
          style={{
            width: 36, height: 36,
            borderRadius: '50%',
            border: '1px solid #e5e7eb',
            background: '#f3f4f6',
            fontWeight: 800,
            cursor: 'pointer',
          }}
          title={user?.fullName || user?.email || 'Usuario'}
        >
          {initial}
        </button>

        {/* Overlay para cerrar clic fuera y menú */}
        {openMenu && (
          <>
            <div
              onClick={closeMenu}
              style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'transparent' }}
            />
            <div
              role="menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 48,
                zIndex: 50,
                width: 280,
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                boxShadow: '0 10px 20px rgba(0,0,0,.08)',
                overflow: 'hidden',
              }}
            >
              {/* Header del menú: nombre completo si existe */}
              <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 800 }}>
                  {user?.fullName || user?.email || 'Usuario'}
                </div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>
                  {user?.email || '—'}
                </div>
              </div>

              {/* NUEVO: Gestión de usuarios (solo SYSADMIN) */}
              {isAdmin && (
                <button
                  className="menu-item"
                  onClick={() => { closeMenu(); nav('/admin/users'); }}
                >
                  👥 Gestión de usuarios
                </button>
              )}

              {/* Papelera */}
              {canSeeTrash && (
                <button
                  className="menu-item"
                  onClick={() => { closeMenu(); nav('/trash'); }}
                >
                  🗑️ Papelera de reciclaje
                </button>
              )}

              <button
                className="menu-item"
                onClick={() => { closeMenu(); onLogout(); }}
              >
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}