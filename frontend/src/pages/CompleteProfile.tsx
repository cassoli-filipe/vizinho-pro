import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { RegisterProfileData } from '../types';
import { Building2, Shield, User, Hammer, MapPin } from 'lucide-react';
import { MapPicker } from '../components/MapPicker';

export const CompleteProfile: React.FC = () => {
  const { user, profile, completeProfile, logout } = useAuth();
  const navigate = useNavigate();

  // Estados de Controle
  const [userType, setUserType] = useState<'morador' | 'prestador'>('morador');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');

  // Campos específicos de Prestador
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('eletricista');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<number>(-23.5615);
  const [lng, setLng] = useState<number>(-46.6565);
  const [radius, setRadius] = useState<number>(10);

  // Estados de erro/carregamento
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se o usuário não estiver logado no Supabase Auth, manda para o Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se o usuário já tiver perfil completo (sem flag de missing), manda para a página inicial correspondente
  if (profile && !profile.isProfileMissing) {
    const destination = profile.user_type === 'prestador' ? '/dashboard' : '/search';
    return <Navigate to={destination} replace />;
  }

  // Máscara de CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 9) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
    } else if (value.length > 6) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
    } else if (value.length > 3) {
      value = `${value.slice(0, 3)}.${value.slice(3)}`;
    }
    
    setCpf(value);
  };

  // Algoritmo de Validação de CPF
  const validateCpf = (cpfStr: string): boolean => {
    const cleanCpf = cpfStr.replace(/\D/g, '');
    
    if (cleanCpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;

    return true;
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }

    if (!validateCpf(cpf)) {
      setError('CPF inválido. Certifique-se de digitar um CPF válido no formato oficial.');
      return;
    }

    setLoading(true);

    const profileData: RegisterProfileData = {
      user_type: userType,
      full_name: fullName,
      cpf: cpf.replace(/\D/g, ''),
      phone: phone || undefined,
      ...(userType === 'prestador' && {
        business_name: businessName || fullName,
        category,
        description,
        center_lat: lat,
        center_lng: lng,
        radius_km: radius,
      }),
    };

    try {
      await completeProfile(profileData);
      if (userType === 'prestador') {
        navigate('/dashboard');
      } else {
        navigate('/search');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar o perfil.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={styles.page} className="fade-in">
      <div className="container" style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <Building2 size={32} color="var(--primary-color)" />
            <h2 style={styles.title}>Complete seu Cadastro</h2>
            <p style={styles.subtitle}>
              Sua conta no autenticador está ativa ({user.email}), mas precisamos dos dados do seu perfil para continuar.
            </p>
          </div>

          {/* Seleção do Tipo de Perfil */}
          <div style={styles.typeSelectorRow}>
            <button
              type="button"
              style={{
                ...styles.selectorBtn,
                ...(userType === 'morador' ? styles.selectorBtnActive : styles.selectorBtnInactive),
              }}
              onClick={() => setUserType('morador')}
            >
              <User size={18} />
              <span>Sou Morador / Condômino</span>
            </button>
            
            <button
              type="button"
              style={{
                ...styles.selectorBtn,
                ...(userType === 'prestador' ? styles.selectorBtnActive : styles.selectorBtnInactive),
              }}
              onClick={() => setUserType('prestador')}
            >
              <Hammer size={18} />
              <span>Sou Prestador de Serviços</span>
            </button>
          </div>

          <form onSubmit={handleCompleteSubmit} style={styles.form}>
            {/* Informações Pessoais */}
            <div style={styles.sectionHeader}>
              <User size={16} />
              <span>Dados Pessoais</span>
            </div>

            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Paulo Silva" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div style={styles.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">CPF (Apenas números)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="123.456.789-00" 
                  value={cpf}
                  onChange={handleCpfChange}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Telefone (Opcional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="(11) 99999-9999" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Informações específicas de Prestador */}
            {userType === 'prestador' && (
              <div style={{ marginTop: '20px' }}>
                <div style={styles.sectionHeader}>
                  <Hammer size={16} />
                  <span>Detalhes do Prestador</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Nome Comercial / Nome Fantasia</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ex: Paulo Silva EletroReparos" 
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Categoria de Serviço</label>
                  <select 
                    className="form-input" 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ appearance: 'auto', cursor: 'pointer' }}
                  >
                    <option value="eletricista">Eletricista</option>
                    <option value="piscineiro">Piscineiro</option>
                    <option value="jardineiro">Jardineiro</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Descrição dos Serviços Realizados</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Fale um pouco sobre sua experiência, especialidades..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    required
                  ></textarea>
                </div>

                <div style={styles.sectionHeader}>
                  <MapPin size={16} />
                  <span>Área de Cobertura (Geolocalização)</span>
                </div>

                <MapPicker 
                  lat={lat} 
                  lng={lng} 
                  radiusKm={radius} 
                  onChange={(newLat, newLng) => {
                    setLat(newLat);
                    setLng(newLng);
                  }}
                />

                <div style={styles.formRow}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Latitude Central</label>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      value={lat}
                      onChange={(e) => setLat(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Longitude Central</label>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      value={lng}
                      onChange={(e) => setLng(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Raio de Atendimento: <strong>{radius} km</strong></label>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={radius} 
                    onChange={(e) => setRadius(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#0046C0', cursor: 'pointer' }}
                  />
                </div>
              </div>
            )}

            {error && <p style={styles.errorText}>{error}</p>}

            <button type="submit" disabled={loading} className="btn btn-primary" style={styles.submitBtn}>
              {loading ? 'Salvando Perfil...' : 'Salvar e Concluir'}
            </button>
          </form>

          <div style={styles.footerRow}>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Sair e logar com outra conta
            </button>
          </div>

          {/* Selo LGPD */}
          <div style={styles.lgpdBadge}>
            <Shield size={14} color="var(--text-muted)" />
            <span>Seus dados pessoais são armazenados de acordo com as leis brasileiras de proteção de dados (LGPD). O CPF é criptografado com algoritmo hash no banco.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px 0 80px 0',
    backgroundColor: '#F8FAFC',
    flex: '1',
    display: 'flex',
    alignItems: 'center',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '680px',
    margin: '0 auto',
    width: '100%',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '24px',
    border: '1px solid var(--border-color)',
    padding: '40px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '28px',
    textAlign: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0F172A',
    marginTop: '16px',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    maxWidth: '520px',
  },
  typeSelectorRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '28px',
    width: '100%',
  },
  selectorBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    border: '1px solid var(--border-color)',
    transition: 'all 0.2s ease',
  },
  selectorBtnActive: {
    backgroundColor: '#0046C0',
    color: 'white',
    borderColor: '#0046C0',
    boxShadow: '0 4px 12px rgba(0, 70, 192, 0.15)',
  },
  selectorBtnInactive: {
    backgroundColor: 'white',
    color: 'var(--text-secondary)',
    borderColor: '#E2E8F0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
    marginBottom: '16px',
    marginTop: '16px',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '8px',
    marginTop: '24px',
  },
  errorText: {
    color: 'red',
    fontSize: '13.5px',
    marginTop: '12px',
    fontWeight: '500',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '16px',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    fontSize: '13px',
    fontWeight: '500',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  lgpdBadge: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-color)',
    fontSize: '11px',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
  }
};
