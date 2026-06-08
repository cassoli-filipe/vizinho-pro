import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { RegisterProfileData } from '../types';
import { Building2, ChevronLeft, Shield, User, Hammer, MapPin } from 'lucide-react';
import { MapPicker } from '../components/MapPicker';

export const RegisterForm: React.FC = () => {
  const { type } = useParams<{ type: 'morador' | 'prestador' }>();
  const { register } = useAuth();
  const navigate = useNavigate();

  const userType = type || 'morador';

  // Estados dos Campos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [experienceYears, setExperienceYears] = useState<number | ''>('');
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState('');

  // Estados de Controle
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Algoritmo Oficial de Validação de CPF
  const validateCpf = (cpfStr: string): boolean => {
    const cleanCpf = cpfStr.replace(/\D/g, '');
    
    if (cleanCpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false; // dígitos todos iguais

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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar CPF
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
        ...(contactWhatsapp && { contact_whatsapp: contactWhatsapp }),
        ...(experienceYears !== '' && { experience_years: Number(experienceYears) }),
        ...(services.length > 0 && { services }),
      }),
    };

    try {
      await register(email, password, profileData);
      if (userType === 'prestador') {
        navigate('/dashboard');
      } else {
        navigate('/search');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao realizar cadastro.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page} className="fade-in">
      <div className="container" style={styles.container}>
        <Link to="/register" style={styles.backLink}>
          <ChevronLeft size={16} />
          <span>Voltar para perfis</span>
        </Link>

        <div style={styles.card}>
          <div style={styles.header}>
            <Building2 size={24} color="var(--primary-color)" />
            <h2 style={styles.title}>
              Cadastro de {userType === 'prestador' ? 'Prestador' : 'Morador'}
            </h2>
            <p style={styles.subtitle}>Preencha as informações para criar sua conta</p>
          </div>

          <form onSubmit={handleRegisterSubmit} style={styles.form}>
            {/* Seção 1: Dados Gerais de Perfil */}
            <div style={styles.sectionHeader}>
              <User size={16} />
              <span>Informações Pessoais</span>
            </div>

            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: João da Silva" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div style={styles.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">E-mail</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="joao@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Senha</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Mínimo 6 caracteres" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">CPF (Apenas Números)</label>
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

            {/* Seção 2: Dados de Prestador (Se aplicável) */}
            {userType === 'prestador' && (
              <div style={{ marginTop: '20px' }}>
                <div style={styles.sectionHeader}>
                  <Hammer size={16} />
                  <span>Detalhes do Prestador de Serviços</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Nome Comercial / Nome Fantasia</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ex: Elétrica Rápida João" 
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
                  <label className="form-label">Descrição do Escopo do seu Trabalho</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Explique o tipo de serviço que realiza, qualificações..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    required
                  ></textarea>
                </div>

                <div style={styles.formRow}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">WhatsApp (Opcional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="(11) 99999-9999"
                      value={contactWhatsapp}
                      onChange={(e) => setContactWhatsapp(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Anos de Experiência (Opcional)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Ex: 5"
                      min={0}
                      max={60}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Serviços que você oferece (Opcional)</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: Instalação de tomadas"
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = newService.trim();
                          if (trimmed && !services.includes(trimmed)) {
                            setServices([...services, trimmed]);
                            setNewService('');
                          }
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        const trimmed = newService.trim();
                        if (trimmed && !services.includes(trimmed)) {
                          setServices([...services, trimmed]);
                          setNewService('');
                        }
                      }}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      + Adicionar
                    </button>
                  </div>
                  {services.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {services.map((svc, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--brand-50)', color: 'var(--primary)', fontSize: '12px', fontWeight: '500', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--primary)' }}>
                          {svc}
                          <button
                            type="button"
                            onClick={() => setServices(services.filter((_, j) => j !== i))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 2px', color: 'inherit', fontSize: '14px', lineHeight: 1 }}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
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
              {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
            </button>
          </form>

          {/* Selo LGPD */}
          <div style={styles.lgpdBadge}>
            <Shield size={14} color="var(--text-muted)" />
            <span>Seus dados são protegidos em conformidade com a LGPD. O CPF é armazenado com hash criptografado.</span>
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
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '680px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    padding: '40px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
    textAlign: 'center',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0F172A',
    marginTop: '12px',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
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
    marginTop: '12px',
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
    fontSize: '13px',
    marginTop: '12px',
    fontWeight: '500',
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
