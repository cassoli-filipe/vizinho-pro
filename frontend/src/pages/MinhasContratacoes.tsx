import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Calendar, DollarSign, Star, ChevronRight, ChevronLeft } from 'lucide-react';
import { apiService } from '../services/api';
import type { HireItem } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  eletricista: 'Eletricista',
  piscineiro: 'Piscineiro',
  jardineiro: 'Jardineiro',
  encanador: 'Encanador',
  pintor: 'Pintor',
};

const CATEGORY_EMOJIS: Record<string, string> = {
  eletricista: '⚡',
  piscineiro: '🏊',
  jardineiro: '🌿',
  encanador: '🔧',
  pintor: '🎨',
};

export const MinhasContratacoes: React.FC = () => {
  const [hires, setHires] = useState<HireItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 12;

  const fetchHires = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await apiService.listHires({ page: p, limit: PAGE_SIZE });
      setHires(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHires(page);
  }, [page, fetchHires]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={styles.page} className="fade-in">
      <div className="container">
        {/* Header */}
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.pageTitle}>Minhas Contratações</h1>
            <p style={styles.pageDesc}>
              Histórico de profissionais que você contratou pelo CondoServ.
            </p>
          </div>
          <Link to="/search" className="btn btn-outline" style={styles.searchBtn}>
            <span>Buscar Profissionais</span>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
          </div>
        ) : hires.length === 0 ? (
          <div style={styles.emptyContainer}>
            <div style={styles.emptyIcon}>📋</div>
            <h3 style={styles.emptyTitle}>Nenhuma contratação registrada</h3>
            <p style={styles.emptyDesc}>
              Quando você contratar um profissional, o histórico aparecerá aqui.
            </p>
            <Link to="/search" className="btn btn-primary" style={{ marginTop: '8px' }}>
              Buscar Profissionais
            </Link>
          </div>
        ) : (
          <>
            <p style={styles.countLabel}>
              {total} contratação{total !== 1 ? 'ões' : ''} registrada{total !== 1 ? 's' : ''}
            </p>
            <div style={styles.grid}>
              {hires.map((hire) => (
                <HireCard key={hire.id} hire={hire} />
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  className="btn btn-outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  style={styles.pageBtn}
                >
                  <ChevronLeft size={16} />
                  <span>Anterior</span>
                </button>
                <span style={styles.pageInfo}>
                  Página {page} de {totalPages}
                </span>
                <button
                  className="btn btn-outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={styles.pageBtn}
                >
                  <span>Próxima</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const HireCard: React.FC<{ hire: HireItem }> = ({ hire }) => {
  const emoji = CATEGORY_EMOJIS[hire.provider_category] ?? '🔧';
  const categoryLabel = CATEGORY_LABELS[hire.provider_category] ?? hire.provider_category;
  const hiredDate = new Date(hire.hired_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div style={styles.card}>
      {/* Top row */}
      <div style={styles.cardTop}>
        <div style={styles.categoryEmoji}>{emoji}</div>
        <div style={styles.cardMeta}>
          <div style={styles.categoryChip}>{categoryLabel}</div>
          {hire.has_review && (
            <div style={styles.reviewedBadge}>
              <Star size={10} fill="var(--warning)" color="var(--warning)" />
              <span>Avaliado</span>
            </div>
          )}
        </div>
      </div>

      {/* Business name */}
      <h3 style={styles.businessName}>{hire.provider_business_name}</h3>

      {/* Details */}
      <div style={styles.detailsList}>
        <div style={styles.detailRow}>
          <Calendar size={13} color="var(--text-muted)" />
          <span style={styles.detailText}>{hiredDate}</span>
        </div>
        {hire.estimated_value != null && (
          <div style={styles.detailRow}>
            <DollarSign size={13} color="var(--text-muted)" />
            <span style={styles.detailText}>
              R$ {Number(hire.estimated_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        <div style={styles.detailRow}>
          <Briefcase size={13} color="var(--text-muted)" />
          <span style={styles.detailText}>
            {hire.source_type === 'REVIEW' ? 'Via avaliação' : 'Registrado manualmente'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <Link
        to={`/providers/${hire.provider_id}`}
        style={styles.profileLink}
      >
        <span>Ver perfil do profissional</span>
        <ChevronRight size={14} />
      </Link>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px 0 80px' },
  pageHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    flexWrap: 'wrap', gap: '16px', marginBottom: '32px',
  },
  pageTitle: { fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' },
  pageDesc: { fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' },
  searchBtn: { fontSize: '13px', padding: '9px 18px', flexShrink: 0 },
  loadingContainer: { display: 'flex', justifyContent: 'center', padding: '100px 0' },
  emptyContainer: {
    textAlign: 'center', padding: '80px 20px',
    backgroundColor: 'white', borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--border)', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: '12px',
  },
  emptyIcon: { fontSize: '48px', lineHeight: 1 },
  emptyTitle: { fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' },
  emptyDesc: { fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '360px', lineHeight: '1.6' },
  countLabel: { fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '16px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '18px',
  },
  card: {
    backgroundColor: 'white', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)', padding: '22px',
    display: 'flex', flexDirection: 'column', gap: '14px',
    boxShadow: 'var(--shadow-xs)',
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: '12px' },
  categoryEmoji: {
    width: '40px', height: '40px', borderRadius: '10px',
    backgroundColor: 'var(--gray-100)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0,
  },
  cardMeta: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' },
  categoryChip: {
    fontSize: '11px', fontWeight: '600', color: 'var(--primary)',
    backgroundColor: 'var(--brand-50)', padding: '3px 10px',
    borderRadius: 'var(--radius-full)', border: '1px solid var(--primary)',
  },
  reviewedBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '10px', fontWeight: '600',
    color: 'var(--warning)', backgroundColor: '#FFFBEB',
    border: '1px solid #FCD34D', padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
  },
  businessName: {
    fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.2',
  },
  detailsList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  detailRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  detailText: { fontSize: '13px', color: 'var(--text-secondary)' },
  profileLink: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: '13px', fontWeight: '600', color: 'var(--primary)',
    paddingTop: '14px', borderTop: '1px solid var(--border)',
    textDecoration: 'none',
  },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '16px', marginTop: '32px',
  },
  pageBtn: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  pageInfo: { fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' },
};
