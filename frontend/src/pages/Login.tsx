import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loggedProfile = await login(email, password);
      if (loggedProfile.isProfileMissing) {
        navigate('/complete-profile');
      } else if (loggedProfile?.user_type === 'prestador') {
        navigate('/dashboard');
      } else {
        navigate('/search');
      }
    } catch {
      setError('Credenciais inválidas ou erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page} className="fade-in">
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoIconWrap}>
            <MapPin size={20} color="white" />
          </div>
          <span style={styles.logoText}>Vizinho<span style={styles.logoPro}>Pro</span></span>
        </div>

        <h2 style={styles.title}>Entre no VizinhoPro</h2>
        <p style={styles.subtitle}>Digite seus dados para acessar sua conta</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p style={styles.errorText}>{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary" style={styles.submitBtn}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={styles.footerLink}>
          Não tem uma conta? <Link to="/register" style={styles.registerLink}>Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    backgroundColor: 'var(--bg)',
    backgroundImage: 'radial-gradient(ellipse at 50% -20%, var(--brand-100) 0%, transparent 70%)',
    flex: '1',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '24px',
  },
  logoIconWrap: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    background: 'var(--gradient-neon)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-neon-cyan)',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  logoPro: {
    color: 'var(--primary)',
  },
  title: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    marginBottom: '6px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  submitBtn: {
    width: '100%',
    padding: '13px',
    fontWeight: '700',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    marginTop: '8px',
  },
  errorText: {
    fontSize: '13px',
    color: 'var(--danger)',
    marginBottom: '12px',
  },
  footerLink: {
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
  },
  registerLink: {
    color: 'var(--primary)',
    fontWeight: '600',
  }
};
