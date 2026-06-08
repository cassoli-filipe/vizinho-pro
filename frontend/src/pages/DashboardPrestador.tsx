import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import type { ProviderDetail, ReviewDetail, ProviderMetrics } from '../types';
import { MapPicker } from '../components/MapPicker';
import { useToast } from '../context/ToastContext';
import {
  Star, MapPin, Hammer, Save, Check, ShieldAlert,
  Users, BadgeCheck, Eye, MessageSquare, Send, TrendingUp,
} from 'lucide-react';

/* ── Métrica card ──────────────────────────────────── */
const MetricCard: React.FC<{
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent: string;
}> = ({ icon, value, label, accent }) => (
  <div style={{ ...metricCardStyles.card, borderTop: `3px solid ${accent}` }}>
    <div style={{ ...metricCardStyles.iconWrap, backgroundColor: accent + '18' }}>
      {icon}
    </div>
    <div style={metricCardStyles.value}>{value !== undefined && value !== null && value !== '' ? value : '—'}</div>
    <div style={metricCardStyles.label}>{label}</div>
  </div>
);

const metricCardStyles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'white',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
    boxShadow: 'var(--shadow-xs)',
    flex: 1,
    minWidth: '140px',
  },
  iconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: '26px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    lineHeight: 1,
    letterSpacing: '-0.5px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
};

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════ */
export const DashboardPrestador: React.FC = () => {
  const { profile } = useAuth();
  const toast = useToast();

  const [providerDetails, setProviderDetails] = useState<ProviderDetail | null>(null);
  const [metrics, setMetrics] = useState<ProviderMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<number>(-23.5615);
  const [lng, setLng] = useState<number>(-46.6565);
  const [radius, setRadius] = useState<number>(10);
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [experienceYears, setExperienceYears] = useState<number | ''>('');
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState('');

  const [updating, setUpdating] = useState(false);

  // Review response state
  const [openResponseId, setOpenResponseId] = useState<string | null>(null);
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchProviderData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const [data, met] = await Promise.all([
        apiService.getProviderMeDetails(),
        apiService.getProviderMetrics(),
      ]);
      setProviderDetails(data);
      setMetrics(met);
      setBusinessName(data.business_name);
      setDescription(data.description || '');
      setLat(data.center_lat);
      setLng(data.center_lng);
      setRadius(data.radius_km);
      setContactWhatsapp(data.contact_whatsapp || '');
      setExperienceYears(data.experience_years ?? '');
      setServices(data.services || []);
      // Pre-fill response texts for reviews that already have a response
      const prefill: Record<string, string> = {};
      for (const rev of data.recent_reviews) {
        if (rev.provider_response) prefill[rev.id] = rev.provider_response;
      }
      setResponseTexts((prev) => ({ ...prefill, ...prev }));
    } catch (e) {
      console.error('Erro ao carregar os dados do prestador:', e);
      toast.error('Erro de Conexão', 'Não foi possível carregar os dados completos do seu perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProviderData();
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await apiService.updateProviderMe({
        business_name: businessName,
        description,
        center_lat: lat,
        center_lng: lng,
        radius_km: radius,
        contact_whatsapp: contactWhatsapp || undefined,
        experience_years: experienceYears !== '' ? Number(experienceYears) : undefined,
        services: services.length > 0 ? services : undefined,
      });
      setProviderDetails((prev) =>
        prev ? { ...prev, business_name: businessName, description, center_lat: lat, center_lng: lng, radius_km: radius } : prev
      );
      toast.success('Perfil atualizado!', 'Suas alterações foram salvas com sucesso.');
    } catch {
      toast.error('Erro ao salvar', 'Não foi possível atualizar o perfil. Tente novamente.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRespondToReview = async (reviewId: string) => {
    const text = (responseTexts[reviewId] ?? '').trim();
    if (!text) return;
    setSubmittingId(reviewId);
    try {
      await apiService.respondToReview(reviewId, text);
      toast.success('Resposta publicada!', 'Sua resposta foi salva e ficará visível aos moradores.');
      setOpenResponseId(null);
      await fetchProviderData();
    } catch {
      toast.error('Erro ao responder', 'Não foi possível salvar a resposta. Tente novamente.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '150px 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  const initials = providerDetails?.business_name
    ?.split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('') ?? '?';

  return (
    <div style={styles.page} className="fade-in">
      <div className="container" style={styles.container}>

        {/* ── Top Banner ── */}
        <div style={styles.topBanner}>
          <div style={styles.topBannerInner}>
            <div style={styles.avatarRing}>
              <div style={styles.avatar}>{initials}</div>
            </div>
            <div style={styles.bannerMeta}>
              <span style={styles.panelLabel}>Painel do Profissional</span>
              <h1 style={styles.businessTitle}>{providerDetails?.business_name}</h1>
              <div style={styles.bannerTagRow}>
                <span style={styles.categoryTag}>
                  {providerDetails?.category?.toUpperCase()}
                </span>
                <span style={styles.statusBadge}>
                  <BadgeCheck size={12} />
                  Assinatura Ativa
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Métricas ── */}
        <div style={styles.metricsRow}>
          <MetricCard
            icon={<Star size={18} color="var(--warning)" />}
            value={providerDetails?.avg_rating ? `${providerDetails.avg_rating.toFixed(1)} ★` : '—'}
            label="Nota Média"
            accent="var(--warning)"
          />
          <MetricCard
            icon={<Users size={18} color="var(--primary)" />}
            value={providerDetails?.review_count ?? 0}
            label="Avaliações"
            accent="var(--primary)"
          />
          <MetricCard
            icon={<Eye size={18} color="#7C3AED" />}
            value={metrics?.profile_views ?? 0}
            label="Visitas (30d)"
            accent="#7C3AED"
          />
          <MetricCard
            icon={<MessageSquare size={18} color="var(--success)" />}
            value={metrics?.whatsapp_clicks ?? 0}
            label="Cliques WhatsApp"
            accent="var(--success)"
          />
          <MetricCard
            icon={<TrendingUp size={18} color="var(--info)" />}
            value={metrics ? `${metrics.conversion_rate}%` : '—'}
            label="Taxa Conversão"
            accent="var(--info)"
          />
        </div>

        {/* ── Grid de conteúdo ── */}
        <div style={styles.contentGrid}>
          {/* Coluna Esquerda: Edição */}
          <div style={styles.leftCol}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <Hammer size={18} color="var(--primary)" />
                <span>Configurar Perfil & Cobertura</span>
              </h2>

              <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="form-group">
                  <label className="form-label">Nome Fantasia / Comercial</label>
                  <input
                    type="text"
                    className="form-input"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descrição dos Serviços</label>
                  <textarea
                    className="form-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="var(--primary)" />
                    Área de Cobertura (Mapa Interativo)
                  </label>
                  <MapPicker
                    lat={lat}
                    lng={lng}
                    radiusKm={radius}
                    onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
                  />
                  <div style={styles.coordinatesRow}>
                    <span style={styles.coordBadge}>Lat: <strong>{lat}</strong></span>
                    <span style={styles.coordBadge}>Lng: <strong>{lng}</strong></span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Raio de Atendimento: <strong style={{ color: 'var(--primary)' }}>{radius} km</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">WhatsApp de Contato</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="(11) 99999-9999"
                      value={contactWhatsapp}
                      onChange={(e) => setContactWhatsapp(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Anos de Experiência</label>
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
                  <label className="form-label">Serviços Oferecidos</label>
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
                      className="btn btn-outline"
                      onClick={() => {
                        const trimmed = newService.trim();
                        if (trimmed && !services.includes(trimmed)) {
                          setServices([...services, trimmed]);
                          setNewService('');
                        }
                      }}
                      style={{ whiteSpace: 'nowrap', padding: '10px 16px' }}
                    >
                      + Adicionar
                    </button>
                  </div>
                  {services.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {services.map((svc, i) => (
                        <span
                          key={i}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            backgroundColor: 'var(--brand-50)', color: 'var(--primary)',
                            fontSize: '12px', fontWeight: '500', padding: '4px 10px',
                            borderRadius: '20px', border: '1px solid var(--primary)',
                          }}
                        >
                          {svc}
                          <button
                            type="button"
                            onClick={() => setServices(services.filter((_, j) => j !== i))}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '0 0 0 2px', color: 'inherit', fontSize: '14px', lineHeight: 1,
                            }}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="btn btn-primary"
                  style={{ padding: '13px', marginTop: '8px', fontWeight: '700', fontSize: '15px' }}
                >
                  {updating
                    ? <><div className="spinner spinner-sm" /><span>Salvando...</span></>
                    : <><Save size={16} /><span>Salvar Alterações</span></>
                  }
                </button>
              </form>
            </div>
          </div>

          {/* Coluna Direita: Avaliações com resposta */}
          <div style={styles.rightCol}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <Star size={18} color="var(--warning)" />
                <span>Avaliações dos Clientes</span>
              </h2>

              {!providerDetails?.recent_reviews?.length ? (
                <div style={styles.noReviews}>
                  <ShieldAlert size={32} color="var(--text-muted)" />
                  <p style={{ marginTop: '12px', fontWeight: '500' }}>Nenhuma avaliação ainda.</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    As avaliações dos seus clientes aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {providerDetails.recent_reviews.map((rev: ReviewDetail) => {
                    const isOpen = openResponseId === rev.id;
                    const responseText = responseTexts[rev.id] ?? '';
                    const isSubmitting = submittingId === rev.id;

                    return (
                      <div key={rev.id} style={styles.reviewCard}>
                        <div style={styles.reviewHeader}>
                          <div>
                            <p style={styles.reviewAuthor}>{rev.resident_full_name}</p>
                            <div style={{ display: 'flex', gap: '2px', marginTop: '3px' }}>
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={12}
                                  fill={i < rev.rating ? 'var(--warning)' : 'none'}
                                  color={i < rev.rating ? 'var(--warning)' : 'var(--border)'}
                                />
                              ))}
                            </div>
                          </div>
                          <span style={styles.reviewDate}>
                            {new Date(rev.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        <p style={styles.reviewText}>"{rev.comment || 'Sem comentário escrito.'}"</p>

                        {rev.verified_hire && (
                          <div style={styles.verifiedHire}>
                            <Check size={11} color="var(--success)" />
                            <span>Contratação verificada</span>
                          </div>
                        )}

                        {/* Resposta existente */}
                        {rev.provider_response && !isOpen && (
                          <div style={styles.existingResponse}>
                            <p style={styles.existingResponseLabel}>Sua resposta</p>
                            <p style={styles.existingResponseText}>{rev.provider_response}</p>
                            <button
                              type="button"
                              style={styles.editResponseBtn}
                              onClick={() => setOpenResponseId(rev.id)}
                            >
                              Editar resposta
                            </button>
                          </div>
                        )}

                        {/* Formulário de resposta */}
                        {isOpen ? (
                          <div style={styles.responseForm}>
                            <textarea
                              placeholder="Escreva sua resposta ao cliente..."
                              value={responseText}
                              onChange={(e) =>
                                setResponseTexts((prev) => ({ ...prev, [rev.id]: e.target.value }))
                              }
                              rows={3}
                              style={styles.responseTextarea}
                              maxLength={1000}
                            />
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => setOpenResponseId(null)}
                                style={{ fontSize: '12px', padding: '7px 12px' }}
                                disabled={isSubmitting}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => handleRespondToReview(rev.id)}
                                disabled={isSubmitting || !responseText.trim()}
                                style={{ fontSize: '12px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                {isSubmitting
                                  ? <><div className="spinner spinner-sm" /><span>Enviando...</span></>
                                  : <><Send size={12} /><span>Publicar</span></>
                                }
                              </button>
                            </div>
                          </div>
                        ) : !rev.provider_response ? (
                          <button
                            type="button"
                            style={styles.replyBtn}
                            onClick={() => setOpenResponseId(rev.id)}
                          >
                            <MessageSquare size={12} />
                            <span>Responder avaliação</span>
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '0 0 80px', backgroundColor: 'var(--bg)', flex: 1 },
  container: { display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '32px' },
  topBanner: {
    background: 'var(--gradient-brand)', borderRadius: 'var(--radius-xl)',
    padding: '32px 40px', boxShadow: 'var(--shadow-brand)', color: 'white',
  },
  topBannerInner: { display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' },
  avatarRing: { padding: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', flexShrink: 0 },
  avatar: {
    width: '68px', height: '68px', borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.4)',
    fontSize: '22px', fontWeight: '800', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '-0.5px',
  },
  bannerMeta: { display: 'flex', flexDirection: 'column', gap: '6px' },
  panelLabel: { fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '1px' },
  businessTitle: { fontSize: '26px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px' },
  bannerTagRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  categoryTag: {
    fontSize: '11px', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '3px 10px',
    borderRadius: 'var(--radius-full)', letterSpacing: '0.5px',
  },
  statusBadge: {
    fontSize: '11px', fontWeight: '700', backgroundColor: 'rgba(16,185,129,0.25)',
    border: '1px solid rgba(16,185,129,0.4)', color: '#A7F3D0', padding: '3px 10px',
    borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '4px',
  },
  metricsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' },
  contentGrid: { display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px', alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '24px' },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '88px' },
  card: { backgroundColor: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '32px', boxShadow: 'var(--shadow-sm)' },
  cardTitle: {
    fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)',
    display: 'flex', alignItems: 'center', gap: '8px',
    borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '22px',
  },
  coordinatesRow: { display: 'flex', gap: '10px', marginTop: '8px' },
  coordBadge: { fontSize: '12px', color: 'var(--text-secondary)', backgroundColor: 'var(--gray-100)', padding: '3px 10px', borderRadius: 'var(--radius-sm)' },
  noReviews: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: 'var(--text-secondary)', textAlign: 'center' },
  reviewCard: { borderBottom: '1px solid var(--border)', paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  reviewAuthor: { fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' },
  reviewDate: { fontSize: '11px', color: 'var(--text-muted)' },
  reviewText: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', fontStyle: 'italic' },
  verifiedHire: {
    display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px',
    color: 'var(--success)', fontWeight: '600', backgroundColor: 'var(--success-bg)',
    padding: '2px 8px', borderRadius: 'var(--radius-full)', width: 'fit-content',
  },
  replyBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    fontSize: '11px', fontWeight: '600', color: 'var(--primary)',
    background: 'none', border: '1px solid var(--primary)',
    borderRadius: '6px', padding: '5px 12px', cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  existingResponse: {
    backgroundColor: 'var(--gray-50)', borderLeft: '3px solid var(--primary)',
    borderRadius: '0 8px 8px 0', padding: '10px 14px',
  },
  existingResponseLabel: { fontSize: '10px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' },
  existingResponseText: { fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', fontStyle: 'italic', marginBottom: '6px' },
  editResponseBtn: {
    fontSize: '11px', fontWeight: '600', color: 'var(--primary)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '0',
  },
  responseForm: { display: 'flex', flexDirection: 'column', gap: '8px' },
  responseTextarea: {
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--border)', borderRadius: '8px',
    fontSize: '13px', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
  },
};
