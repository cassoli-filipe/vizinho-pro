import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const { isAuthenticated, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fechar menu ao navegar — setState síncrono em efeito é intencional aqui.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = isAuthenticated
    ? [
        { href: '/search', label: 'Buscar Profissionais' },
        ...(profile?.user_type === 'prestador'
          ? [{ href: '/dashboard', label: 'Meu Painel' }]
          : []),
      ]
    : [];

  return (
    <>
      <header
        style={{
          ...styles.header,
          boxShadow: scrolled ? 'var(--shadow-md)' : 'none',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          backgroundColor: scrolled ? 'rgba(255,255,255,0.92)' : 'white',
        }}
      >
        <div className="container" style={styles.container}>
          {/* Logo */}
          <Link to="/" style={styles.logoContainer}>
            <div style={styles.logoIconWrap}>
              <MapPin size={16} color="white" />
            </div>
            <span style={styles.logoText}>
              Vizinho<span style={styles.logoPro}>Pro</span>
            </span>
          </Link>

          {/* Nav Desktop */}
          {navLinks.length > 0 && (
            <nav style={styles.nav}>
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  style={isActive(link.href) ? styles.navLinkActive : styles.navLink}
                >
                  {link.label}
                  {isActive(link.href) && <span style={styles.activeDot} />}
                </Link>
              ))}
            </nav>
          )}

          {/* Auth Desktop */}
          <div style={styles.authContainer}>
            {isAuthenticated ? (
              <div style={styles.userMenu}>
                <Link
                  to={profile?.user_type === 'prestador' ? '/dashboard' : '/search'}
                  style={styles.userChip}
                >
                  <div style={styles.userAvatar}>
                    {profile?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.userInfo}>
                    <span style={styles.userName}>{profile?.full_name?.split(' ')[0]}</span>
                    <span style={styles.userType}>
                      {profile?.user_type === 'prestador' ? 'Prestador' : 'Morador'}
                    </span>
                  </div>
                </Link>
                <button onClick={handleLogout} style={styles.logoutBtn} title="Sair">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div style={styles.authBtns}>
                <Link to="/login" style={styles.loginLink}>Entrar</Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Cadastrar
                </Link>
              </div>
            )}

            {/* Hamburger Mobile */}
            <button
              style={styles.hamburger}
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Abrir menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div style={styles.drawerOverlay} onClick={() => setMobileOpen(false)} />
          <div style={styles.drawer} className="slide-up">
            {navLinks.map(link => (
              <Link key={link.href} to={link.href} style={styles.drawerLink}>
                <span>{link.label}</span>
                <ChevronRight size={16} color="var(--text-muted)" />
              </Link>
            ))}
            {!isAuthenticated && (
              <>
                <Link to="/login" style={styles.drawerLink}>
                  <span>Entrar</span>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </Link>
                <div style={{ padding: '12px 20px' }}>
                  <Link to="/register" className="btn btn-primary" style={{ width: '100%' }}>
                    Criar Conta Grátis
                  </Link>
                </div>
              </>
            )}
            {isAuthenticated && (
              <button onClick={handleLogout} style={styles.drawerLogout}>
                <LogOut size={16} />
                <span>Sair da conta</span>
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 200,
    height: '68px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid var(--border)',
    transition: 'box-shadow 0.25s ease, background-color 0.25s ease',
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },
  logoIconWrap: {
    width: '32px',
    height: '32px',
    borderRadius: '9px',
    background: 'var(--gradient-brand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,70,192,0.3)',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  logoPro: {
    color: 'var(--primary)',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  navLink: {
    position: 'relative',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--ease-fast)',
    textDecoration: 'none',
  },
  navLinkActive: {
    position: 'relative',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--primary)',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--brand-50)',
    textDecoration: 'none',
  },
  activeDot: {
    display: 'block',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    margin: '2px auto 0',
  },
  authContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  authBtns: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  loginLink: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--ease-fast)',
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 12px 5px 5px',
    backgroundColor: 'var(--gray-100)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-full)',
    transition: 'var(--ease-fast)',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  userAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--gradient-brand)',
    color: 'white',
    fontSize: '13px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.2,
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  userType: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  logoutBtn: {
    width: '34px',
    height: '34px',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--ease-fast)',
  },
  hamburger: {
    display: 'none',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    padding: '5px',
    alignItems: 'center',
    justifyContent: 'center',
    '@media (max-width: 768px)': {
      display: 'flex',
    },
  } as React.CSSProperties,
  drawerOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 190,
    backgroundColor: 'rgba(15,23,42,0.4)',
    backdropFilter: 'blur(2px)',
  },
  drawer: {
    position: 'fixed',
    top: '68px',
    left: 0,
    right: 0,
    zIndex: 195,
    backgroundColor: 'white',
    borderBottom: '1px solid var(--border)',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
  },
  drawerLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    fontSize: '15px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border)',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  drawerLogout: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 20px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--danger)',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    borderTop: '1px solid var(--border)',
    width: '100%',
    textAlign: 'left',
  },
};

// CSS responsivo injetado uma vez
const styleEl = document.createElement('style');
styleEl.innerHTML = `
  @media (max-width: 768px) {
    .header-hamburger { display: flex !important; }
    .header-nav, .header-auth-btns, .header-user-menu { display: none !important; }
  }
`;
document.head.appendChild(styleEl);
