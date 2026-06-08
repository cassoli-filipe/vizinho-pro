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

/* ── Ícones customizados por categoria ──────────────────── */
const CATEGORY_ICON_CONFIG: Record<string, { svg: string; color: string; bg: string }> = {
  eletricista: {
    color: '#F59E0B',
    bg: '#FFFBEB',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#F59E0B" width="16" height="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  },
  jardineiro: {
    color: '#10B981',
    bg: '#ECFDF5',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10B981" width="16" height="16"><path d="M12 2C8 2 5 5 5 9c0 2.5 1.2 4.7 3 6.1V17h8v-1.9c1.8-1.4 3-3.6 3-6.1 0-4-3-7-7-7zm0 2c2.8 0 5 2.2 5 5s-2.2 5-5 5-5-2.2-5-5 2.2-5 5-5z"/><rect x="10" y="17" width="4" height="5" rx="1"/></svg>`,
  },
  encanador: {
    color: '#3B82F6',
    bg: '#EFF6FF',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3B82F6" width="16" height="16"><path d="M12 2C9.2 2 7 4.2 7 7c0 2.1 1.2 3.9 3 4.7V22h4V11.7c1.8-.8 3-2.6 3-4.7 0-2.8-2.2-5-5-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/></svg>`,
  },
  pintor: {
    color: '#8B5CF6',
    bg: '#F5F3FF',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#8B5CF6" width="16" height="16"><path d="M7 14c0 1.1-.9 2-2 2s-2-.9-2-2c0-.7.4-1.4 1-1.7V7h2v5.3c.6.3 1 1 1 1.7zM20 5h-9.2C10.4 3.8 9.3 3 8 3H4C2.9 3 2 3.9 2 5v2h4V6h8v6h2V8h4V5z"/></svg>`,
  },
  piscineiro: {
    color: '#06B6D4',
    bg: '#ECFEFF',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#06B6D4" width="16" height="16"><path d="M2 17.5c1.7 0 2.8-.6 3.8-1.2.9-.5 1.7-1 3.2-1s2.3.5 3.2 1c1 .6 2.1 1.2 3.8 1.2s2.8-.6 3.8-1.2c.9-.5 1.7-1 3.2-1v-2c-1.5 0-2.3.5-3.2 1-1 .6-2.1 1.2-3.8 1.2s-2.8-.6-3.8-1.2C11.3 13.5 10.2 13 8.5 13c-1.7 0-2.8.6-3.8 1.2-.9.5-1.7 1-3.2 1v2.3zM2 13c1.7 0 2.8-.6 3.8-1.2.9-.5 1.7-1 3.2-1s2.3.5 3.2 1c1 .6 2.1 1.2 3.8 1.2s2.8-.6 3.8-1.2C16.8 11.2 17.8 11 19 11V9c-1.7 0-2.8.6-3.8 1.2-.9.5-1.7 1-3.2 1s-2.3-.5-3.2-1C7.8 9.6 6.7 9 5 9c-1.7 0-2.8.6-3.8 1.2C.2 10.7 0 11 0 11v2z"/><circle cx="16" cy="5" r="2"/></svg>`,
  },
};

const DEFAULT_ICON_CONFIG = { color: '#0046C0', bg: '#EFF6FF', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0046C0" width="16" height="16"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>` };

function createCategoryIcon(category: string): L.DivIcon {
  const cfg = CATEGORY_ICON_CONFIG[category] ?? DEFAULT_ICON_CONFIG;
  return L.divIcon({
    className: '',
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -50],
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 48px;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25));
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" width="40" height="48">
          <defs>
            <linearGradient id="pinGrad-${category}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${cfg.color};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${cfg.color};stop-opacity:0.75" />
            </linearGradient>
          </defs>
          <!-- corpo do pin arredondado -->
          <path d="M20 2C11.16 2 4 9.16 4 18c0 11 16 28 16 28s16-17 16-28C36 9.16 28.84 2 20 2z"
                fill="url(#pinGrad-${category})" />
          <!-- círculo branco interno -->
          <circle cx="20" cy="18" r="11" fill="white" opacity="0.95"/>
        </svg>
        <!-- ícone da categoria centralizado -->
        <div style="
          position: absolute;
          top: 10px;
          left: 12px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">${cfg.svg}</div>
      </div>
    `,
  });
}

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
  if (km <= 3) return '#00C48C'; // Neon-ish green
  if (km <= 10) return '#FF9900'; // Vibrant orange
  return '#FF2D55'; // Vibrant pink/red
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

          <form onSubmit={handleSearch} style={styles.searchCard} className="glass">
            {/* Localização atual */}
            <div style={styles.locationRow}>
              <MapPin size={18} color="var(--primary)" />
              <span style={styles.locationLabel}>{locationLabel}</span>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className="btn btn-sm"
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--brand-100)', color: 'var(--brand-700)', border: 'none' }}
              >
                {locating
                  ? <><div className="spinner spinner-sm" style={{borderColor: 'var(--brand-200)', borderTopColor: 'var(--brand-700)'}}/><span>Obtendo...</span></>
                  : <><Navigation size={14} /><span>Usar GPS</span></>
                }
              </button>
            </div>

            {/* Slider de raio */}
            <div style={styles.sliderRow}>
              <span style={styles.sliderLabel}>
                Raio de busca: <strong style={{ color: 'var(--primary)', fontSize: '15px' }}>{radius} km</strong>
              </span>
              <input
                type="range" min="1" max="50" value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={styles.searchBtn}>
              <Search size={18} />
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
                  attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  subdomains="abcd"
                  maxZoom={20}
                />
                {/* Círculo da área de busca */}
                <Circle
                  center={[lat, lng]}
                  radius={radius * 1000}
                  pathOptions={{ color: '#0046C0', fillColor: '#0046C0', fillOpacity: 0.06, weight: 2, dashArray: '6 4' }}
                />
                {sorted.map((p) => {
                  const catObj = CATEGORIES.find(c => c.value === p.category);
                  const catCfg = CATEGORY_ICON_CONFIG[p.category] ?? DEFAULT_ICON_CONFIG;
                  return (
                    <Marker key={p.id} position={[p.center_lat, p.center_lng]} icon={createCategoryIcon(p.category)}>
                      <Popup>
                        <div style={{ minWidth: '180px', fontFamily: 'Inter, system-ui, sans-serif' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: catCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                              dangerouslySetInnerHTML={{ __html: catCfg.svg }}
                            />
                            <div>
                              <strong style={{ fontSize: '13px', color: '#0F172A', display: 'block', lineHeight: 1.2 }}>{p.business_name}</strong>
                              <span style={{ fontSize: '11px', color: catCfg.color, fontWeight: 600 }}>{catObj?.label ?? p.category}</span>
                            </div>
                          </div>
                          {p.avg_rating ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                              <span style={{ color: '#F59E0B', fontSize: '13px' }}>★</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{p.avg_rating.toFixed(1)}</span>
                              <span style={{ fontSize: '11px', color: '#94A3B8' }}>({p.review_count} avaliações)</span>
                            </div>
                          ) : null}
                          <div style={{ fontSize: '11px', color: distanceColor(p.distance_km ?? 0), fontWeight: 600, marginBottom: '10px' }}>
                            📍 {(p.distance_km ?? 0).toFixed(1)} km de distância
                          </div>
                          <button
                            onClick={() => navigate(`/providers/${p.id}`)}
                            style={{ fontSize: '12px', padding: '7px 12px', background: 'linear-gradient(135deg, #0046C0, #0066FF)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: 600, letterSpacing: '0.3px' }}
                          >
                            Ver perfil →
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
                    className="provider-card glass"
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
                          <span className="badge badge-brand">
                            <Shield size={10} />
                            Verificado
                          </span>
                          {isCarlos && (
                            <span className="badge" style={{ background: 'var(--neon-cyan)', color: '#004040' }}>
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
                        <Star size={16} fill="#FF9900" color="#FF9900" />
                        <span style={styles.ratingText}>
                          {p.avg_rating ? p.avg_rating.toFixed(1) : '—'}
                        </span>
                        {p.review_count > 0 && (
                          <span style={styles.reviewCount}>({p.review_count} avaliações)</span>
                        )}
                      </div>
                      <div style={{ ...styles.distanceBox, backgroundColor: dColor + '15', border: `1px solid ${dColor}30` }}>
                        <MapPin size={14} color={dColor} />
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
    background: 'var(--gradient-hero)',
    padding: '80px 0 100px',
    position: 'relative',
    overflow: 'hidden',
  },
  heroContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
    position: 'relative',
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 'clamp(32px, 5vw, 48px)',
    fontWeight: '800',
    color: 'var(--brand-900)',
    textAlign: 'center',
    letterSpacing: '-1px',
    lineHeight: '1.1',
    maxWidth: '800px',
    textShadow: '0 4px 20px rgba(43, 91, 255, 0.1)',
  },
  heroSub: {
    fontSize: '18px',
    color: 'var(--brand-700)',
    textAlign: 'center',
    maxWidth: '600px',
    lineHeight: '1.6',
    fontWeight: '500',
  },
  searchCard: {
    width: '100%',
    maxWidth: '800px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '32px',
    borderRadius: 'var(--radius-xl)',
  },
  locationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)',
  },
  locationLabel: {
    fontSize: '15px',
    fontWeight: '600',
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
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '24px',
  },
  cardHeader: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: 'var(--radius-lg)',
    objectFit: 'cover',
    border: '3px solid white',
    boxShadow: 'var(--shadow-sm)',
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
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: '1.2',
  },
  categoryName: {
    fontSize: '13px',
    color: 'var(--brand-600)',
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
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
