import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2 } from 'lucide-react';

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
          <Building2 size={28} color="var(--primary-color)" />
          <span style={styles.logoText}>CondoServ</span>
        </div>

        <h2 style={styles.title}>Entre no CondoServ</h2>
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
    backgroundColor: '#F8FAFC',
    flex: '1',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '24px',
  },
  logoText: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0046C0',
    letterSpacing: '-0.5px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: '6px',
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
    padding: '12px',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  errorText: {
    fontSize: '13px',
    color: 'red',
    marginBottom: '12px',
  },
  footerLink: {
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
  },
  registerLink: {
    color: '#0046C0',
    fontWeight: '600',
  }
};
