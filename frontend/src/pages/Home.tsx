import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Navigation, Star, Shield, Award, SlidersHorizontal, MapPin, List, Map } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { apiService } from '../services/api';
import type { ProviderSearchItem } from '../types';
import carlosSilvaImg from '../assets/carlos_silva.png';
import { useToast } from '../context/ToastContext';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths broken by Vite bundling — Leaflet typings are incomplete here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ── Categorias ─────────────────────────────────────── */
const CATEGORIES = [
  { value: '',            label: 'Todos',           emoji: '🔍' },
  { value: 'eletricista', label: 'Eletricistas',     emoji: '⚡' },
  { value: 'piscineiro',  label: 'Piscineiros',      emoji: '🏊' },
  { value: 'jardineiro',  label: 'Jardineiros',      emoji: '🌿' },
  { value: 'encanador',   label: 'Encanadores',      emoji: '🔧' },
  { value: 'pintor',      label: 'Pintores',         emoji: '🎨' },
];

type SortMode = 'rating' | 'distance';
type ViewMode = 'list' | 'map';

function distanceColor(km: number): string {
  if (km <= 3) return '#10B981';
  if (km <= 10) return '#F59E0B';
  return '#EF4444';
}

/* ── Skeleton card ──────────────────────────────────── */
const SkeletonCard: React.FC = () => (
  <div style={styles.providerCard}>
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <div className="skeleton skeleton-avatar" style={{ width: '64px', height: '64px', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
        <div className="skeleton skeleton-title" style={{ width: '80%' }} />
        <div className="skeleton skeleton-text" style={{ width: '40%' }} />
      </div>
    </div>
    <div className="skeleton skeleton-text" style={{ marginTop: '12px' }} />
    <div className="skeleton skeleton-text" style={{ width: '70%', marginTop: '6px' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
      <div className="skeleton skeleton-text" style={{ width: '80px' }} />
      <div className="skeleton skeleton-text" style={{ width: '60px' }} />
    </div>
  </div>
);

/* ── Componente principal ───────────────────────────── */
export const Home: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [providers, setProviders] = useState<ProviderSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const [lat, setLat] = useState<number>(-23.5505);
  const [lng, setLng] = useState<number>(-46.6333);
  const [radius, setRadius] = useState<number>(10);
  const [category, setCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortMode>('rating');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [locationLabel, setLocationLabel] = useState('São Paulo, SP (padrão)');

  const fetchProviders = useCallback(async (customLat?: number, customLng?: number, signal?: AbortSignal) => {
    setLoading(true);
    const searchLat = customLat ?? lat;
    const searchLng = customLng ?? lng;
    localStorage.setItem('condoserv:search_lat', String(searchLat));
    localStorage.setItem('condoserv:search_lng', String(searchLng));
    try {
      const data = await apiService.searchProviders({
        lat: searchLat,
        lng: searchLng,
        radius_km: radius,
        category: category || undefined,
      }, signal);
      setProviders(data.items);
    } catch (e: unknown) {
      if (axios.isCancel(e)) return; // request aborted by cleanup — ignore silently
      toast.error('Erro na busca', 'Não foi possível carregar os profissionais.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radius, category, toast]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProviders(undefined, undefined, controller.signal);
    return () => controller.abort();
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('GPS indisponível', 'Seu navegador não suporta geolocalização.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = Number(pos.coords.latitude.toFixed(6));
        const newLng = Number(pos.coords.longitude.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        setLocationLabel('Sua localização atual');
        toast.success('Localização obtida!', 'Buscando profissionais próximos a você.');
        fetchProviders(newLat, newLng);
        setLocating(false);
      },
      () => {
        toast.info('Usando localização padrão', 'Não foi possível obter o GPS — usando São Paulo.');
        setLocating(false);
      }
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProviders();
  };

  /* Ordenação local */
  const sorted = [...providers].sort((a, b) => {
    if (sortBy === 'rating') return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
    return (a.distance_km ?? 0) - (b.distance_km ?? 0);
  });

  return (
    <div style={styles.page} className="fade-in">

      {/* ── Hero / Busca ── */}
      <section style={styles.hero}>
        <div className="container" style={styles.heroContainer}>
          <h1 style={styles.heroTitle}>Encontre os melhores serviços perto de você</h1>
          <p style={styles.heroSub}>
            Profissionais avaliados e recomendados pelos seus vizinhos de condomínio.
          </p>

          <form onSubmit={handleSearch} style={styles.searchCard}>
            {/* Localização atual */}
            <div style={styles.locationRow}>
              <MapPin size={16} color="var(--primary)" />
              <span style={styles.locationLabel}>{locationLabel}</span>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className="btn btn-sm btn-outline"
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                {locating
                  ? <><div className="spinner spinner-sm" /><span>Obtendo...</span></>
                  : <><Navigation size={13} /><span>Usar GPS</span></>
                }
              </button>
            </div>

            {/* Slider de raio */}
            <div style={styles.sliderRow}>
              <span style={styles.sliderLabel}>
                Raio de busca: <strong style={{ color: 'var(--primary)' }}>{radius} km</strong>
              </span>
              <input
                type="range" min="1" max="50" value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={styles.searchBtn}>
              <Search size={17} />
              <span>Buscar Profissionais</span>
            </button>
          </form>

          {/* Chips de categoria */}
          <div style={styles.chipsRow}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`chip${category === cat.value ? ' chip-active' : ''}`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Resultados ── */}
      <section style={styles.resultsSection}>
        <div className="container">

          {/* Cabeçalho dos resultados */}
          <div style={styles.resultsHeader}>
            <h2 style={styles.resultsTitle}>
              {loading
                ? 'Carregando...'
                : `${providers.length} profissional${providers.length !== 1 ? 'is' : ''} encontrado${providers.length !== 1 ? 's' : ''}`
              }
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Toggle Lista/Mapa */}
              <div style={styles.viewToggle}>
                <button
                  onClick={() => setViewMode('list')}
                  style={{ ...styles.viewToggleBtn, ...(viewMode === 'list' ? styles.viewToggleBtnActive : {}) }}
                >
                  <List size={14} />
                  <span>Lista</span>
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  style={{ ...styles.viewToggleBtn, ...(viewMode === 'map' ? styles.viewToggleBtnActive : {}) }}
                >
                  <Map size={14} />
                  <span>Mapa</span>
                </button>
              </div>

              {/* Ordenação (só na lista) */}
              {!loading && providers.length > 0 && viewMode === 'list' && (
                <div style={styles.sortRow}>
                  <SlidersHorizontal size={14} color="var(--text-muted)" />
                  <span style={styles.sortLabel}>Ordenar:</span>
                  {(['rating', 'distance'] as SortMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSortBy(mode)}
                      style={{
                        ...styles.sortBtn,
                        ...(sortBy === mode ? styles.sortBtnActive : {}),
                      }}
                    >
                      {mode === 'rating' ? '⭐ Melhor avaliado' : '📍 Mais próximo'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conteúdo */}
          {loading ? (
            <div style={styles.providersGrid}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : providers.length === 0 ? (
            <div style={styles.emptyContainer}>
              <div style={styles.emptyIcon}>🔍</div>
              <h3 style={styles.emptyTitle}>Nenhum profissional encontrado</h3>
              <p style={styles.emptyText}>
                Tente aumentar o raio de busca ou escolher outra categoria.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={() => setRadius(30)} className="btn btn-primary">
                  Ampliar para 30 km
                </button>
                <button onClick={() => setCategory('')} className="btn btn-outline">
                  Ver todas as categorias
                </button>
              </div>
            </div>
          ) : viewMode === 'map' ? (
            <div style={styles.mapContainer}>
              <MapContainer
                center={[lat, lng]}
                zoom={12}
                style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-lg)' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Círculo da área de busca */}
                <Circle
                  center={[lat, lng]}
                  radius={radius * 1000}
                  pathOptions={{ color: 'var(--primary)', fillOpacity: 0.05, weight: 1.5 }}
                />
                {sorted.map((p) => {
                  const catObj = CATEGORIES.find(c => c.value === p.category);
                  return (
                    <Marker key={p.id} position={[p.center_lat, p.center_lng]}>
                      <Popup>
                        <div style={{ minWidth: '160px' }}>
                          <strong style={{ fontSize: '14px' }}>{p.business_name}</strong>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 6px' }}>
                            {catObj?.emoji} {catObj?.label ?? p.category}
                          </p>
                          {p.avg_rating && (
                            <p style={{ fontSize: '12px', margin: '0 0 6px' }}>⭐ {p.avg_rating.toFixed(1)} ({p.review_count})</p>
                          )}
                          <p style={{ fontSize: '11px', margin: '0 0 8px', color: distanceColor(p.distance_km ?? 0), fontWeight: 600 }}>
                            📍 {(p.distance_km ?? 0).toFixed(1)} km
                          </p>
                          <button
                            onClick={() => navigate(`/providers/${p.id}`)}
                            style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#0046C0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%' }}
                          >
                            Ver perfil
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          ) : (
            <div style={styles.providersGrid}>
              {sorted.map((p) => {
                const isCarlos = p.id === '00000000-0000-0000-0000-000000000004';
                const catObj = CATEGORIES.find(c => c.value === p.category);
                const distKm = p.distance_km ?? 0;
                const dColor = distanceColor(distKm);
                return (
                  <div
                    key={p.id}
                    style={styles.providerCard}
                    className="provider-card"
                    onClick={() => navigate(`/providers/${p.id}`)}
                  >
                    <div style={styles.cardHeader}>
                      <div style={styles.avatarWrapper}>
                        <img
                          src={isCarlos
                            ? carlosSilvaImg
                            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&h=200&fit=crop'
                          }
                          alt={p.full_name}
                          style={styles.avatar}
                        />
                        {catObj && (
                          <span style={styles.categoryEmoji}>{catObj.emoji}</span>
                        )}
                      </div>

                      <div style={styles.providerInfo}>
                        <div style={styles.badgesRow}>
                          <span className="badge badge-success">
                            <Shield size={10} />
                            Verificado
                          </span>
                          {isCarlos && (
                            <span className="badge badge-warning">
                              <Award size={10} />
                              Destaque
                            </span>
                          )}
                        </div>
                        <h3 style={styles.businessName}>{p.business_name}</h3>
                        <p style={styles.categoryName}>
                          {catObj?.label ?? p.category.charAt(0).toUpperCase() + p.category.slice(1)}
                        </p>
                      </div>
                    </div>

                    <p className="truncate-3" style={styles.cardDesc}>
                      {p.description || 'Nenhuma descrição fornecida pelo profissional.'}
                    </p>

                    <div style={styles.cardFooter}>
                      <div style={styles.ratingBox}>
                        <Star size={15} fill="var(--warning)" color="var(--warning)" />
                        <span style={styles.ratingText}>
                          {p.avg_rating ? p.avg_rating.toFixed(1) : '—'}
                        </span>
                        {p.review_count > 0 && (
                          <span style={styles.reviewCount}>({p.review_count})</span>
                        )}
                      </div>
                      <div style={{ ...styles.distanceBox, backgroundColor: dColor + '18', border: `1px solid ${dColor}40` }}>
                        <MapPin size={12} color={dColor} />
                        <span style={{ ...styles.distanceText, color: dColor }}>
                          {distKm.toFixed(1)} km
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    paddingBottom: '80px',
    flex: 1,
  },
  /* Hero */
  hero: {
    background: 'var(--gradient-brand)',
    padding: '60px 0 80px',
    position: 'relative',
    overflow: 'hidden',
  },
  heroContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    position: 'relative',
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 'clamp(26px, 4vw, 38px)',
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    letterSpacing: '-0.8px',
    lineHeight: '1.15',
    maxWidth: '700px',
  },
  heroSub: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    maxWidth: '520px',
    lineHeight: '1.6',
  },
  searchCard: {
    backgroundColor: 'white',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    width: '100%',
    maxWidth: '760px',
    boxShadow: 'var(--shadow-xl)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  locationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--gray-50)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
  },
  locationLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    flex: 1,
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  sliderLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    minWidth: '160px',
  },
  searchBtn: {
    width: '100%',
    padding: '13px',
    fontSize: '15px',
    borderRadius: 'var(--radius-sm)',
    fontWeight: '700',
  },
  chipsRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  /* Results */
  resultsSection: {
    padding: '48px 0',
  },
  resultsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border)',
  },
  resultsTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    flex: 1,
  },
  sortRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sortLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  sortBtn: {
    padding: '5px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: '12px',
    fontWeight: '500',
    border: '1.5px solid var(--border)',
    backgroundColor: 'white',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'var(--ease-fast)',
  },
  sortBtnActive: {
    backgroundColor: 'var(--brand-50)',
    borderColor: 'var(--primary)',
    color: 'var(--primary)',
    fontWeight: '600',
  },
  providersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '20px',
  },
  /* Provider Card */
  providerCard: {
    backgroundColor: 'white',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    padding: '22px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    transition: 'var(--ease)',
  },
  cardHeader: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
  },
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: 'var(--radius-md)',
    objectFit: 'cover',
    border: '2px solid var(--border)',
  },
  categoryEmoji: {
    position: 'absolute',
    bottom: '-6px',
    right: '-6px',
    fontSize: '16px',
    lineHeight: 1,
    backgroundColor: 'white',
    borderRadius: '50%',
    padding: '2px',
    boxShadow: 'var(--shadow-sm)',
  },
  providerInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  badgesRow: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap',
    marginBottom: '2px',
  },
  businessName: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: '1.2',
  },
  categoryName: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  cardDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    flex: 1,
  },
  cardFooter: {
    borderTop: '1px solid var(--border)',
    paddingTop: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  ratingText: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  reviewCount: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  distanceBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: 'var(--brand-50)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
  },
  distanceText: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--primary)',
  },
  /* View toggle */
  viewToggle: {
    display: 'flex',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)',
    overflow: 'hidden',
  },
  viewToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: '500',
    border: 'none',
    backgroundColor: 'white',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'var(--ease-fast)',
  },
  viewToggleBtnActive: {
    backgroundColor: 'var(--primary)',
    color: 'white',
  },
  /* Map */
  mapContainer: {
    height: '520px',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
  },
  /* Empty */
  emptyContainer: {
    textAlign: 'center',
    padding: '80px 20px',
    backgroundColor: 'white',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    boxShadow: 'var(--shadow-sm)',
  },
  emptyIcon: {
    fontSize: '48px',
    lineHeight: 1,
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    maxWidth: '360px',
    lineHeight: '1.6',
  },
};
