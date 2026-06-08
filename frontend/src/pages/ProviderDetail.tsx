import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Shield, Award, Star, FileText, Check, Phone,
  MessageSquare, Mail, Info, Send, ChevronLeft,
  AlertTriangle, Briefcase, DollarSign,
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { ProviderDetail as ProviderDetailType, ReviewDetail } from '../types';

const LOCATION_KEY_LAT = 'condoserv:search_lat';
const LOCATION_KEY_LNG = 'condoserv:search_lng';

export const ProviderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, profile } = useAuth();
  const toast = useToast();

  const [provider, setProvider] = useState<ProviderDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  // Review state
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Hire state
  const [showHireForm, setShowHireForm] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState('');
  const [submittingHire, setSubmittingHire] = useState(false);
  const [hireSuccess, setHireSuccess] = useState(false);

  const fetchProviderData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const storedLat = localStorage.getItem(LOCATION_KEY_LAT);
      const storedLng = localStorage.getItem(LOCATION_KEY_LNG);
      const viewerLat = storedLat ? parseFloat(storedLat) : undefined;
      const viewerLng = storedLng ? parseFloat(storedLng) : undefined;
      const data = await apiService.getProvider(id, viewerLat, viewerLng);
      setProvider(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProviderData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWhatsAppClick = () => {
    if (!id) return;
    const outOfArea = provider?.is_within_service_area === false;
    apiService
      .recordProviderEvent(id, { event_type: 'WHATSAPP_CLICK', out_of_area: outOfArea })
      .catch(() => {});
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      await apiService.createReview({ provider_id: id, rating, comment: comment || undefined });
      setReviewSuccess(true);
      setComment('');
      await fetchProviderData();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setReviewError(detail ?? 'Erro ao enviar avaliação. Certifique-se de que é um morador.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleHireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmittingHire(true);
    try {
      const val = estimatedValue.trim() ? parseFloat(estimatedValue.replace(',', '.')) : null;
      await apiService.createHire({ provider_id: id, estimated_value: val });
      setHireSuccess(true);
      setShowHireForm(false);
      setEstimatedValue('');
      toast.success('Contratação registrada!', 'Histórico atualizado em Minhas Contratações.');
    } catch {
      toast.error('Erro ao registrar', 'Não foi possível registrar a contratação. Tente novamente.');
    } finally {
      setSubmittingHire(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="container" style={styles.errorContainer}>
        <h2>Prestador não encontrado</h2>
        <Link to="/search" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Voltar para a Busca
        </Link>
      </div>
    );
  }

  const isEletricista = provider.id === '00000000-0000-0000-0000-000000000004';
  const experienceLabel =
    provider.experience_years != null
      ? `${provider.experience_years} ano${provider.experience_years !== 1 ? 's' : ''}`
      : '—';

  const isMorador = isAuthenticated && profile?.user_type === 'morador';
  const outOfArea = provider.is_within_service_area === false;

  return (
    <div style={styles.page} className="fade-in">
      <div className="container">
        <Link to="/search" style={styles.backLink}>
          <ChevronLeft size={16} />
          <span>Voltar para busca</span>
        </Link>

        {/* Indicador de cobertura */}
        {outOfArea && (
          <div style={styles.coverageWarning}>
            <AlertTriangle size={18} color="#B45309" style={{ flexShrink: 0 }} />
            <span style={styles.coverageWarningText}>
              Este prestador normalmente não atende sua região. Verifique com ele antes de contratar.
            </span>
          </div>
        )}

        {/* Header */}
        <div style={styles.profileHeader}>
          <img
            src={provider.image_url ?? undefined}
            alt={provider.full_name}
            style={styles.profileAvatar}
          />
          <div style={styles.profileMeta}>
            <div style={styles.badgeRow}>
              <span className="badge badge-success" style={styles.verifyBadge}>
                <Shield size={13} />
                <span>Documentação Verificada</span>
              </span>
              {isEletricista && (
                <span className="badge badge-info" style={styles.featuredBadge}>
                  <Award size={13} />
                  <span>Profissional Destaque</span>
                </span>
              )}
              {outOfArea && (
                <span style={styles.outOfAreaBadge}>
                  <AlertTriangle size={11} />
                  <span>Fora da sua região</span>
                </span>
              )}
            </div>
            <h1 style={styles.profileName}>{provider.full_name}</h1>
            <p style={styles.profileCategory}>
              {provider.category.charAt(0).toUpperCase() + provider.category.slice(1)}{' '}
              Residencial & Predial
            </p>
            <div style={styles.metricsGrid}>
              <div style={styles.metricItem}>
                <div style={styles.metricValueRow}>
                  <span style={styles.metricValue}>
                    {provider.avg_rating ? provider.avg_rating.toFixed(1) : '—'}
                  </span>
                  <Star size={16} fill="var(--warning)" color="var(--warning)" />
                </div>
                <span style={styles.metricLabel}>Avaliação Média</span>
              </div>
              <div style={styles.metricItemDivider} />
              <div style={styles.metricItem}>
                <span style={styles.metricValue}>{provider.review_count}</span>
                <span style={styles.metricLabel}>Avaliações</span>
              </div>
              <div style={styles.metricItemDivider} />
              <div style={styles.metricItem}>
                <span style={styles.metricValue}>{experienceLabel}</span>
                <span style={styles.metricLabel}>Anos de Experiência</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={styles.bodyGrid}>
          {/* Coluna Esquerda */}
          <div style={styles.leftCol}>
            {/* Escopo */}
            <div style={styles.contentBlock}>
              <div style={styles.blockTitleRow}>
                <FileText size={20} color="var(--text-secondary)" />
                <h2 style={styles.blockTitle}>Escopo de Trabalho</h2>
              </div>
              <p style={styles.blockDesc}>{provider.description}</p>
              {provider.services && provider.services.length > 0 ? (
                <div style={styles.checklist}>
                  {provider.services.map((svc: string, i: number) => (
                    <div key={i} style={styles.checkItem}>
                      <div style={styles.checkIcon}>
                        <Check size={12} color="#10B981" />
                      </div>
                      <span style={styles.checkText}>{svc}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Nenhum serviço listado.
                </p>
              )}
            </div>

            {/* Avaliações */}
            <div style={styles.contentBlock}>
              <div style={{ ...styles.blockTitleRow, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={20} color="var(--text-secondary)" />
                  <h2 style={styles.blockTitle}>Avaliações dos Moradores</h2>
                </div>
                <span style={styles.timeLabel}>Últimas avaliações</span>
              </div>

              <div style={styles.reviewsList}>
                {provider.recent_reviews.length === 0 ? (
                  <p style={styles.noReviews}>Nenhuma avaliação registrada.</p>
                ) : (
                  provider.recent_reviews.map((rev: ReviewDetail) => (
                    <div key={rev.id} style={styles.reviewCard}>
                      <div style={styles.reviewHeader}>
                        <div style={styles.reviewAuthorBox}>
                          <span style={styles.reviewAuthor}>{rev.resident_full_name}</span>
                          <div style={styles.starsRow}>
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
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span style={styles.reviewDate}>
                            {new Date(rev.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </span>
                          {rev.verified_hire && (
                            <span style={styles.verifiedBadge}>
                              <Check size={10} />
                              Contratação verificada
                            </span>
                          )}
                        </div>
                      </div>
                      {rev.comment && <p style={styles.reviewText}>{rev.comment}</p>}

                      {/* Resposta do prestador */}
                      {rev.provider_response && (
                        <div style={styles.providerResponseBlock}>
                          <p style={styles.providerResponseLabel}>Resposta do prestador</p>
                          <p style={styles.providerResponseText}>{rev.provider_response}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Formulário de avaliação */}
              {isMorador && (
                <div style={styles.newReviewSection}>
                  <h3 style={styles.newReviewTitle}>Deixe sua Avaliação</h3>
                  {reviewSuccess ? (
                    <div style={styles.reviewSuccessAlert}>
                      <Check size={16} />
                      <span>Avaliação enviada com sucesso!</span>
                    </div>
                  ) : (
                    <form onSubmit={handleReviewSubmit} style={styles.reviewForm}>
                      <div style={styles.ratingSelectRow}>
                        <span style={styles.ratingSelectLabel}>Nota:</span>
                        <div style={styles.ratingStarsSelect}>
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setRating(num)}
                              style={styles.starSelectBtn}
                            >
                              <Star
                                size={22}
                                fill={num <= rating ? 'var(--warning)' : 'none'}
                                color={num <= rating ? 'var(--warning)' : 'var(--text-muted)'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="form-group">
                        <textarea
                          placeholder="Escreva um comentário..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          style={styles.reviewTextarea}
                          rows={4}
                        />
                      </div>
                      {reviewError && <p style={styles.reviewError}>{reviewError}</p>}
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="btn btn-primary"
                        style={styles.submitReviewBtn}
                      >
                        <Send size={14} />
                        <span>{submittingReview ? 'Enviando...' : 'Publicar Avaliação'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita */}
          <div style={styles.rightCol}>
            {/* Contato */}
            <div style={styles.contactBlock}>
              <h2 style={styles.contactTitle}>Contato Direto</h2>
              <p style={styles.contactDesc}>
                Entre em contato para orçamentos ou agendamentos.
              </p>
              <div style={styles.contactsList}>
                {provider.contact_whatsapp && (
                  <a
                    href={`https://wa.me/${provider.contact_whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.contactItem}
                    onClick={handleWhatsAppClick}
                  >
                    <div style={styles.contactIconBgGreen}>
                      <MessageSquare size={18} color="#10B981" />
                    </div>
                    <div style={styles.contactTextContainer}>
                      <span style={styles.contactLabel}>WHATSAPP</span>
                      <span style={styles.contactValue}>{provider.contact_whatsapp}</span>
                    </div>
                  </a>
                )}
                {provider.phone && (
                  <a href={`tel:${provider.phone}`} style={styles.contactItem}>
                    <div style={styles.contactIconBgBlue}>
                      <Phone size={18} color="#0046C0" />
                    </div>
                    <div style={styles.contactTextContainer}>
                      <span style={styles.contactLabel}>TELEFONE</span>
                      <span style={styles.contactValue}>{provider.phone}</span>
                    </div>
                  </a>
                )}
                {provider.email && (
                  <a href={`mailto:${provider.email}`} style={styles.contactItem}>
                    <div style={styles.contactIconBgGray}>
                      <Mail size={18} color="#475569" />
                    </div>
                    <div style={styles.contactTextContainer}>
                      <span style={styles.contactLabel}>E-MAIL</span>
                      <span style={styles.contactValue}>{provider.email}</span>
                    </div>
                  </a>
                )}
                {!provider.contact_whatsapp && !provider.phone && !provider.email && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                    Profissional ainda não adicionou dados de contato.
                  </p>
                )}
              </div>
              <div style={styles.lgpdInfoBox}>
                <Info size={20} color="#0046C0" style={{ flexShrink: 0 }} />
                <span style={styles.lgpdInfoText}>
                  Mencione que você encontrou o contato através do <strong>CondoServ</strong>.
                </span>
              </div>
            </div>

            {/* Registrar Contratação (apenas moradores) */}
            {isMorador && (
              <div style={styles.hireBlock}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Briefcase size={18} color="var(--primary)" />
                  <h3 style={styles.hireBlockTitle}>Registrar Contratação</h3>
                </div>
                <p style={styles.hireBlockDesc}>
                  Contratou este profissional? Registre para acompanhar no histórico.
                </p>

                {hireSuccess ? (
                  <div style={styles.hireSuccess}>
                    <Check size={14} />
                    <span>Contratação registrada!</span>
                  </div>
                ) : showHireForm ? (
                  <form onSubmit={handleHireSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                      <DollarSign
                        size={14}
                        color="var(--text-muted)"
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Valor estimado (opcional)"
                        value={estimatedValue}
                        onChange={(e) => setEstimatedValue(e.target.value)}
                        style={{ paddingLeft: '32px', fontSize: '14px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="submit"
                        disabled={submittingHire}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '9px', fontSize: '13px' }}
                      >
                        {submittingHire ? 'Registrando...' : 'Confirmar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setShowHireForm(false)}
                        style={{ padding: '9px 14px', fontSize: '13px' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowHireForm(true)}
                    style={{ width: '100%', padding: '9px', fontSize: '13px' }}
                  >
                    <Briefcase size={14} />
                    <span>Registrar Contratação</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '30px 0 80px 0' },
  loadingContainer: { display: 'flex', justifyContent: 'center', padding: '150px 0' },
  errorContainer: { textAlign: 'center', padding: '100px 0' },
  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500',
    marginBottom: '16px', cursor: 'pointer', textDecoration: 'none',
  },
  coverageWarning: {
    display: 'flex', alignItems: 'center', gap: '12px',
    backgroundColor: '#FFFBEB', border: '1px solid #FCD34D',
    borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
  },
  coverageWarningText: { fontSize: '13.5px', color: '#92400E', lineHeight: '1.4', fontWeight: '500' },
  profileHeader: {
    backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)',
    padding: '32px', display: 'flex', gap: '32px', alignItems: 'center',
    flexWrap: 'wrap', marginBottom: '28px',
  },
  profileAvatar: { width: '120px', height: '120px', borderRadius: '16px', objectFit: 'cover', border: '1px solid var(--border)' },
  profileMeta: { flex: '1', minWidth: '280px' },
  badgeRow: { display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' },
  verifyBadge: {
    fontSize: '10px', fontWeight: '600', padding: '4px 10px', borderRadius: '6px',
    display: 'flex', alignItems: 'center', gap: '4px',
    backgroundColor: '#EFFDF5', color: '#10B981',
  },
  featuredBadge: {
    fontSize: '10px', fontWeight: '600', padding: '4px 10px', borderRadius: '6px',
    display: 'flex', alignItems: 'center', gap: '4px',
    backgroundColor: '#E6EEFF', color: '#0046C0',
  },
  outOfAreaBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '10px', fontWeight: '600', padding: '4px 10px', borderRadius: '6px',
    backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FCD34D',
  },
  profileName: { fontSize: '28px', fontWeight: '700', color: '#0F172A', lineHeight: '1.2', marginBottom: '4px' },
  profileCategory: { fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '20px' },
  metricsGrid: {
    display: 'flex', alignItems: 'center', gap: '24px',
    borderTop: '1px solid var(--border)', paddingTop: '16px', flexWrap: 'wrap',
  },
  metricItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  metricValueRow: { display: 'flex', alignItems: 'center', gap: '4px' },
  metricValue: { fontSize: '18px', fontWeight: '700', color: '#0F172A' },
  metricLabel: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' },
  metricItemDivider: { width: '1px', height: '32px', backgroundColor: 'var(--border)' },
  bodyGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px', alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '28px' },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '88px' },
  contentBlock: { backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)', padding: '28px' },
  blockTitleRow: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '18px', paddingBottom: '10px', borderBottom: '1px solid var(--border)',
  },
  blockTitle: { fontSize: '17px', fontWeight: '700', color: '#0F172A' },
  blockDesc: { fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' },
  checklist: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  checkItem: { display: 'flex', alignItems: 'center', gap: '10px' },
  checkIcon: {
    width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#EFFDF5',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkText: { fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' },
  timeLabel: { fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' },
  reviewsList: { display: 'flex', flexDirection: 'column', gap: '20px' },
  noReviews: { fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' },
  reviewCard: { borderBottom: '1px solid var(--border)', paddingBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  reviewAuthorBox: { display: 'flex', flexDirection: 'column', gap: '4px' },
  reviewAuthor: { fontSize: '14px', fontWeight: '600', color: '#0F172A' },
  starsRow: { display: 'flex', gap: '2px' },
  reviewDate: { fontSize: '12px', color: 'var(--text-muted)' },
  verifiedBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '10px', fontWeight: '600', color: 'var(--success)',
    backgroundColor: 'var(--success-bg)', padding: '2px 7px', borderRadius: '20px',
  },
  reviewText: { fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' },
  providerResponseBlock: {
    backgroundColor: 'var(--gray-50)', borderLeft: '3px solid var(--primary)',
    borderRadius: '0 8px 8px 0', padding: '10px 14px',
  },
  providerResponseLabel: { fontSize: '10px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' },
  providerResponseText: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', fontStyle: 'italic' },
  newReviewSection: { marginTop: '28px', paddingTop: '22px', borderTop: '2px dashed var(--border)' },
  newReviewTitle: { fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' },
  reviewSuccessAlert: {
    display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: 'var(--success-bg)', color: 'var(--success)',
    padding: '12px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '500',
  },
  reviewForm: { display: 'flex', flexDirection: 'column', gap: '14px' },
  ratingSelectRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  ratingSelectLabel: { fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' },
  ratingStarsSelect: { display: 'flex', gap: '4px' },
  starSelectBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '2px' },
  reviewTextarea: {
    width: '100%', padding: '12px', border: '1px solid var(--border)',
    borderRadius: '8px', fontSize: '13.5px', outline: 'none', resize: 'vertical',
    boxSizing: 'border-box',
  },
  submitReviewBtn: { alignSelf: 'flex-start', borderRadius: '6px', fontSize: '13px', fontWeight: '600' },
  reviewError: { color: 'var(--danger)', fontSize: '13px' },
  contactBlock: { backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)', padding: '28px' },
  contactTitle: { fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' },
  contactDesc: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' },
  contactsList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  contactItem: {
    display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px',
    borderRadius: '10px', border: '1px solid var(--border)', textDecoration: 'none',
    transition: 'var(--transition-smooth)',
  },
  contactIconBgGreen: { width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#EFFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contactIconBgBlue: { width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#E6EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contactIconBgGray: { width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contactTextContainer: { display: 'flex', flexDirection: 'column', gap: '2px' },
  contactLabel: { fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', letterSpacing: '0.5px' },
  contactValue: { fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' },
  lgpdInfoBox: {
    display: 'flex', gap: '12px', backgroundColor: '#EFF6FF',
    padding: '12px', borderRadius: '8px', border: '1px solid #DBEAFE', alignItems: 'center',
  },
  lgpdInfoText: { fontSize: '12px', color: '#0046C0', lineHeight: '1.4' },
  hireBlock: {
    backgroundColor: 'white', borderRadius: '16px',
    border: '1px solid var(--border)', padding: '22px',
  },
  hireBlockTitle: { fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' },
  hireBlockDesc: { fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' },
  hireSuccess: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '13px', fontWeight: '600', color: 'var(--success)',
    backgroundColor: 'var(--success-bg)', padding: '10px 14px', borderRadius: '8px',
  },
};
