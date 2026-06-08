import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div style={styles.page} className="fade-in">
      <div style={styles.content}>
        {/* Número 404 grande */}
        <div style={styles.errorCode}>
          <span style={styles.four}>4</span>
          <div style={styles.zeroOuter}>
            <div style={styles.zeroInner} />
          </div>
          <span style={styles.four}>4</span>
        </div>

        <div style={styles.textContent}>
          <h1 style={styles.title}>Página não encontrada</h1>
          <p style={styles.subtitle}>
            Parece que essa página não existe ou foi movida para outro endereço.
            <br />
            Vamos te levar de volta para um lugar seguro.
          </p>
        </div>

        <div style={styles.actions}>
          <Link to="/" className="btn btn-primary btn-lg">
            <Home size={17} />
            <span>Ir para o Início</span>
          </Link>
          <Link to="/search" className="btn btn-outline btn-lg">
            <Search size={17} />
            <span>Buscar Profissionais</span>
          </Link>
        </div>

        <button
          onClick={() => window.history.back()}
          style={styles.backBtn}
        >
          <ArrowLeft size={14} />
          <span>Voltar à página anterior</span>
        </button>

        {/* Decorativo */}
        <div style={styles.decoration}>
          <div style={styles.decorCircle1} />
          <div style={styles.decorCircle2} />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    backgroundColor: 'var(--bg)',
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '32px',
    position: 'relative',
    zIndex: 1,
    maxWidth: '520px',
  },
  errorCode: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    userSelect: 'none',
  },
  four: {
    fontSize: '120px',
    fontWeight: '900',
    color: 'var(--primary)',
    lineHeight: 1,
    letterSpacing: '-4px',
    textShadow: '0 8px 32px rgba(0,70,192,0.2)',
  },
  zeroOuter: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    border: '10px solid var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0,70,192,0.2)',
    margin: '0 4px',
  },
  zeroInner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'var(--gradient-brand)',
  },
  textContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    lineHeight: '1.65',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'var(--ease-fast)',
  },
  decoration: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
  },
  decorCircle1: {
    position: 'absolute',
    top: '-120px',
    right: '-120px',
    width: '360px',
    height: '360px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,70,192,0.06) 0%, transparent 70%)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: '-80px',
    left: '-100px',
    width: '280px',
    height: '280px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,37,102,0.06) 0%, transparent 70%)',
  },
};
