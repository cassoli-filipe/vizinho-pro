import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Hammer, Check, DollarSign, MapPin, ArrowRight } from 'lucide-react';

export const RegisterChoice: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.pageContainer} className="fade-in">
      <div className="container" style={styles.contentContainer}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Escolha seu perfil para começar</h1>
          <p style={styles.subtitle}>
            Junte-se à rede que conecta condomínios aos melhores profissionais com segurança e eficiência.
          </p>
        </div>

        <div style={styles.cardsGrid}>
          {/* Card Morador */}
          <div style={styles.card}>
            <div style={styles.cardInner}>
              <div style={styles.iconContainerMorador}>
                <UserCheck size={28} color="var(--primary)" />
              </div>
              <h2 style={styles.cardTitle}>Sou Morador</h2>
              <p style={styles.cardText}>
                Encontre prestadores de serviços avaliados por seus vizinhos. Solicite orçamentos, acompanhe serviços e mantenha a segurança do seu condomínio.
              </p>

              <div style={styles.checklist}>
                <div style={styles.checkItem}>
                  <div style={styles.checkIcon}>
                    <Check size={14} color="var(--primary)" />
                  </div>
                  <span style={styles.checkText}>Acesso a profissionais verificados</span>
                </div>
                <div style={styles.checkItem}>
                  <div style={styles.checkIcon}>
                    <Check size={14} color="var(--primary)" />
                  </div>
                  <span style={styles.checkText}>Leia e deixe avaliações reais</span>
                </div>
              </div>

              <button 
                onClick={() => navigate('/register/morador')} 
                style={styles.btnMorador}
                className="btn"
              >
                <span>Continuar como Morador</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Card Prestador */}
          <div style={styles.card}>
            <div style={styles.cardInner}>
              <div style={styles.iconContainerPrestador}>
                <Hammer size={28} color="white" />
              </div>
              <h2 style={styles.cardTitle}>Sou Prestador</h2>
              <p style={styles.cardText}>
                Cadastre seus serviços, expanda seu alcance para condomínios da sua região e construa uma reputação sólida baseada em avaliações.
              </p>

              <div style={styles.badgesContainer}>
                <div style={styles.badgeItemBlue}>
                  <DollarSign size={14} color="var(--primary)" />
                  <span style={styles.badgeTextBlue}>Mensalidade de apenas R$20,00</span>
                </div>
                <div style={styles.badgeItemGray}>
                  <MapPin size={14} color="var(--gray-500)" />
                  <span style={styles.badgeTextGray}>Defina sua área de atuação</span>
                </div>
              </div>

              <button 
                onClick={() => navigate('/register/prestador')} 
                style={styles.btnPrestador}
                className="btn"
              >
                <span>Criar conta de Prestador</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    padding: '80px 0 100px 0',
    backgroundColor: 'var(--bg)',
    backgroundImage: 'radial-gradient(ellipse at 50% -20%, var(--brand-100) 0%, transparent 70%)',
    flex: '1',
    display: 'flex',
    alignItems: 'center',
  },
  contentContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  titleSection: {
    textAlign: 'center',
    maxWidth: '650px',
    marginBottom: '60px',
  },
  title: {
    fontSize: '36px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    marginBottom: '16px',
    letterSpacing: '-1px',
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '30px',
    width: '100%',
    maxWidth: '960px',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'var(--ease)',
  },
  cardInner: {
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
  },
  iconContainerMorador: {
    width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
  },
  iconContainerPrestador: {
    width: '56px', height: '56px', borderRadius: '16px', background: 'var(--gradient-neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: 'var(--shadow-neon-cyan)'
  },
  cardTitle: { fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' },
  cardText: { fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px', minHeight: '68px' },
  checklist: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', flex: '1' },
  checkItem: { display: 'flex', alignItems: 'center', gap: '10px' },
  checkIcon: { width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--brand-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' },
  badgesContainer: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px', flex: '1' },
  badgeItemBlue: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--brand-50)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--brand-100)' },
  badgeTextBlue: { fontSize: '12px', fontWeight: '600', color: 'var(--primary)' },
  badgeItemGray: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--gray-50)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' },
  badgeTextGray: { fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)' },
  btnMorador: { width: '100%', padding: '14px 20px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--gray-100)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px', justifyContent: 'center', gap: '8px' },
  btnPrestador: { width: '100%', padding: '14px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--gradient-brand)', color: 'white', fontWeight: '700', fontSize: '14px', justifyContent: 'center', gap: '8px', boxShadow: 'var(--shadow-brand)' },
};
