import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ExternalLink, MessageCircle, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={styles.footer}>
      {/* Main footer content */}
      <div className="container" style={styles.grid}>
        {/* Coluna 1: Brand */}
        <div style={styles.brandCol}>
          <Link to="/" style={styles.logoContainer}>
            <div style={styles.logoIconWrap}>
              <MapPin size={14} color="white" />
            </div>
            <span style={styles.logoText}>
              Vizinho<span style={styles.logoPro}>Pro</span>
            </span>
          </Link>
          <p style={styles.tagline}>
            Conectando moradores a profissionais de confiança, indicados pelos próprios vizinhos.
          </p>
          <div style={styles.socialRow}>
            <a href="#" style={styles.socialBtn} aria-label="Instagram">
              <ExternalLink size={16} />
            </a>
            <a href="#" style={styles.socialBtn} aria-label="LinkedIn">
              <MessageCircle size={16} />
            </a>
            <a href="#" style={styles.socialBtn} aria-label="Site">
              <Globe size={16} />
            </a>
          </div>
        </div>

        {/* Coluna 2: Para Moradores */}
        <div>
          <h4 style={styles.colTitle}>Para Moradores</h4>
          <ul style={styles.linkList}>
            <li><Link to="/search" style={styles.footerLink}>Buscar Profissionais</Link></li>
            <li><a href="#como-funciona" style={styles.footerLink}>Como Funciona</a></li>
            <li><a href="#" style={styles.footerLink}>Avaliações Verificadas</a></li>
            <li><a href="#" style={styles.footerLink}>Segurança & LGPD</a></li>
          </ul>
        </div>

        {/* Coluna 3: Para Prestadores */}
        <div>
          <h4 style={styles.colTitle}>Para Prestadores</h4>
          <ul style={styles.linkList}>
            <li><Link to="/register/prestador" style={styles.footerLink}>Divulgar Serviços</Link></li>
            <li><a href="#" style={styles.footerLink}>Planos & Assinatura</a></li>
            <li><a href="#" style={styles.footerLink}>Área de Cobertura</a></li>
            <li><a href="#" style={styles.footerLink}>Central de Ajuda</a></li>
          </ul>
        </div>

        {/* Coluna 4: Empresa */}
        <div>
          <h4 style={styles.colTitle}>Empresa</h4>
          <ul style={styles.linkList}>
            <li><a href="#" style={styles.footerLink}>Sobre Nós</a></li>
            <li><a href="#" style={styles.footerLink}>Política de Privacidade</a></li>
            <li><a href="#" style={styles.footerLink}>Termos de Uso</a></li>
            <li><a href="#" style={styles.footerLink}>Fale Conosco</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={styles.bottomBar}>
        <div className="container" style={styles.bottomContent}>
          <span style={styles.copyright}>
            © {new Date().getFullYear()} VizinhoPro. Todos os direitos reservados.
          </span>
          <span style={styles.compliance}>
            🔒 Plataforma em conformidade com a LGPD
          </span>
        </div>
      </div>
    </footer>
  );
};

const styles: Record<string, React.CSSProperties> = {
  footer: {
    backgroundColor: 'var(--gray-900)',
    color: 'white',
    marginTop: 'auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: '48px',
    padding: '60px 24px 40px',
  },
  brandCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    width: 'fit-content',
  },
  logoIconWrap: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'var(--gradient-brand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'white',
    letterSpacing: '-0.3px',
  },
  logoPro: {
    color: 'var(--brand-300)',
  },
  tagline: {
    fontSize: '13px',
    color: 'var(--gray-400)',
    lineHeight: '1.6',
    maxWidth: '260px',
  },
  socialRow: {
    display: 'flex',
    gap: '8px',
  },
  socialBtn: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--gray-800)',
    border: '1px solid var(--gray-700)',
    color: 'var(--gray-400)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--ease-fast)',
    cursor: 'pointer',
  },
  colTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '16px',
  },
  linkList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  footerLink: {
    fontSize: '13px',
    color: 'var(--gray-400)',
    textDecoration: 'none',
    transition: 'var(--ease-fast)',
    cursor: 'pointer',
  },
  bottomBar: {
    borderTop: '1px solid var(--gray-800)',
  },
  bottomContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  copyright: {
    fontSize: '12px',
    color: 'var(--gray-500)',
  },
  compliance: {
    fontSize: '12px',
    color: 'var(--gray-500)',
  },
};
