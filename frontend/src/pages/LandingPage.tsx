import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, Users, Map, ArrowRight, Search,
  Star, Zap, CheckCircle, Building, DollarSign, Clock,
} from 'lucide-react';
import heroImage from '../assets/hero_landing.png';

/* ── Contador animado ─────────────────────────────────── */
const AnimatedNumber: React.FC<{ target: number; suffix?: string; prefix?: string }> = ({
  target, suffix = '', prefix = ''
}) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const step = target / 50;
          const timer = setInterval(() => {
            start += step;
            if (start >= target) { setVal(target); clearInterval(timer); }
            else setVal(Math.floor(start));
          }, 25);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref}>{prefix}{val.toLocaleString('pt-BR')}{suffix}</div>;
};

/* ── Seção como funciona — item ──────────────────────── */
const StepCard: React.FC<{
  step: number; icon: React.ReactNode; title: string; desc: string;
}> = ({ step, icon, title, desc }) => (
  <div style={stepStyles.card}>
    <div style={stepStyles.stepNum}>{step}</div>
    <div style={stepStyles.iconWrap}>{icon}</div>
    <h3 style={stepStyles.title}>{title}</h3>
    <p style={stepStyles.desc}>{desc}</p>
  </div>
);

const stepStyles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '36px 24px',
    backgroundColor: 'white',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    position: 'relative',
    flex: 1,
    minWidth: '220px',
  },
  stepNum: {
    position: 'absolute',
    top: '-14px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--gradient-brand)',
    color: 'white',
    fontSize: '13px',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-brand)',
  },
  iconWrap: {
    width: '56px',
    height: '56px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--brand-50)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  desc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
};

/* ── Benefício item ──────────────────────────────────── */
const BenefitItem: React.FC<{ text: string }> = ({ text }) => (
  <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
    <CheckCircle size={16} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
    <span>{text}</span>
  </li>
);

/* ── Componente principal ───────────────────────────── */
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();

  const goSearch = () => {
    if (isAuthenticated) {
      navigate(profile?.user_type === 'prestador' ? '/dashboard' : '/search');
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: 'var(--bg)' }} className="fade-in">

      {/* ═══════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════ */}
      <section style={styles.hero}>
        {/* Overlay */}
        <div style={styles.heroOverlay} />

        <div className="container" style={styles.heroContainer}>
          {/* Left text */}
          <div style={styles.heroLeft}>
            <div style={styles.heroBadge}>
              <Zap size={13} color="var(--warning)" />
              <span>Avaliações 100% verificadas por vizinhos reais</span>
            </div>

            <h1 style={styles.heroTitle}>
              Manutenção de condomínio,{' '}
              <span style={styles.heroHighlight}>simplificada e segura.</span>
            </h1>

            <p style={styles.heroSub}>
              Conecte-se com eletricistas, piscineiros, pintores e jardineiros
              recomendados e avaliados de verdade pelos seus próprios vizinhos.
            </p>

            <div style={styles.heroBtns}>
              <button onClick={goSearch} className="btn btn-primary btn-lg" style={{ boxShadow: 'var(--shadow-brand-lg)' }}>
                <Search size={17} />
                <span>Encontrar Profissionais</span>
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/register/prestador')}
                className="btn btn-lg"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', color: 'var(--brand-700)', border: '1.5px solid rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)' }}
              >
                Sou Prestador
              </button>
            </div>

            <div style={styles.heroSocialProof}>
              {[4.9, 4.8, 4.7].map((r, i) => (
                <div key={i} style={styles.proofAvatar}>
                  <Star size={10} fill="var(--warning)" color="var(--warning)" />
                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--brand-900)' }}>{r}</span>
                </div>
              ))}
              <span style={styles.proofText}>+2.400 avaliações verificadas</span>
            </div>
          </div>

          {/* Right image */}
          <div style={styles.heroRight}>
            <img src={heroImage} alt="Profissional em condomínio" style={styles.heroImg} />
            <div style={styles.heroImgCard}>
              <ShieldCheck size={20} color="var(--success)" />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Documentação Verificada</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>CPF e antecedentes confirmados</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════ */}
      <section style={styles.statsSection}>
        <div className="container" style={styles.statsGrid}>
          {[
            { icon: <Users size={24} color="var(--primary)" />, val: 2400, suf: '+', label: 'Avaliações verificadas' },
            { icon: <Star size={24} color="var(--warning)" />, val: 4, suf: '.9★', label: 'Nota média dos prestadores' },
            { icon: <Map size={24} color="var(--success)" />, val: 180, suf: '+', label: 'Profissionais cadastrados' },
            { icon: <Clock size={24} color="var(--info)" />, val: 98, suf: '%', label: 'Satisfação dos moradores' },
          ].map((s, i) => (
            <div key={i} style={styles.statItem}>
              <div style={styles.statIcon}>{s.icon}</div>
              <div style={styles.statNum}>
                <AnimatedNumber target={s.val} suffix={s.suf} />
              </div>
              <p style={styles.statLabel}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          COMO FUNCIONA
          ═══════════════════════════════════════════ */}
      <section id="como-funciona" style={styles.howSection}>
        <div className="container">
          <div style={styles.sectionHeader}>
            <span style={styles.sectionBadge}>Como funciona</span>
            <h2 style={styles.sectionTitle}>Em 3 passos simples</h2>
            <p style={styles.sectionSub}>
              Encontrar um profissional de confiança nunca foi tão fácil.
            </p>
          </div>
          <div style={styles.stepsRow}>
            <StepCard step={1} icon={<Search size={26} color="var(--primary)" />}
              title="Busque perto de você"
              desc="Informe sua localização e escolha a categoria do serviço que precisa." />
            <div style={styles.stepArrow}>→</div>
            <StepCard step={2} icon={<ShieldCheck size={26} color="var(--primary)" />}
              title="Veja avaliações reais"
              desc="Leia avaliações verificadas de vizinhos que de fato contrataram o serviço." />
            <div style={styles.stepArrow}>→</div>
            <StepCard step={3} icon={<Star size={26} color="var(--primary)" />}
              title="Contrate com segurança"
              desc="Contate diretamente pelo WhatsApp ou telefone, sem taxas ou intermediários." />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          BENEFÍCIOS
          ═══════════════════════════════════════════ */}
      <section style={styles.benefitsSection}>
        <div className="container">
          <div style={styles.sectionHeader}>
            <span style={styles.sectionBadge}>Feito para todos</span>
            <h2 style={styles.sectionTitle}>Uma plataforma, dois lados</h2>
          </div>

          <div style={styles.benefitsGrid}>
            {/* Moradores */}
            <div style={styles.benefitCard}>
              <div style={{ ...styles.benefitIconWrap, backgroundColor: 'var(--brand-50)' }}>
                <Building size={28} color="var(--primary)" />
              </div>
              <h3 style={styles.benefitCardTitle}>Para Moradores e Síndicos</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <BenefitItem text="Busca por proximidade ao seu condomínio." />
                <BenefitItem text="Histórico de avaliações com selo de contratação comprovada." />
                <BenefitItem text="Segurança de saber quem entra na sua residência." />
                <BenefitItem text="Contato direto sem taxas ou intermediários." />
              </ul>
              <button onClick={goSearch} className="btn btn-primary" style={{ marginTop: '28px', width: '100%' }}>
                Começar Busca Gratuita
              </button>
            </div>

            {/* Prestadores */}
            <div style={{ ...styles.benefitCard, background: 'var(--gradient-brand)', border: 'none' }}>
              <div style={{ ...styles.benefitIconWrap, backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <DollarSign size={28} color="white" />
              </div>
              <h3 style={{ ...styles.benefitCardTitle, color: 'white' }}>Para Profissionais Autônomos</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {['Acesso a centenas de clientes em condomínios da sua região.',
                  'Construção de reputação digital sólida e verificável.',
                  'Mapa interativo para definir seu raio de atendimento.',
                  'Mantenha 100% dos seus ganhos — assinatura de apenas R$ 20/mês.'
                ].map((t, i) => (
                  <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5' }}>
                    <CheckCircle size={16} color="rgba(255,255,255,0.9)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/register/prestador')}
                className="btn btn-lg"
                style={{ marginTop: '28px', width: '100%', backgroundColor: 'white', color: 'var(--primary)', fontWeight: '700' }}
              >
                Divulgar Meus Serviços
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA FINAL
          ═══════════════════════════════════════════ */}
      <section style={styles.ctaSection}>
        <div className="container">
          <div style={styles.ctaBox}>
            <span style={styles.ctaEyebrow}>VizinhoPro</span>
            <h2 style={styles.ctaTitle}>Pronto para encontrar os melhores profissionais?</h2>
            <p style={styles.ctaSub}>
              Junte-se à nossa comunidade e garanta segurança e comodidade para o seu condomínio.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={goSearch} className="btn btn-lg" style={{ backgroundColor: 'white', color: 'var(--primary)', fontWeight: '700' }}>
                <Search size={17} />
                <span>Acessar Plataforma</span>
                <ArrowRight size={16} />
              </button>
              <button onClick={() => navigate('/register')} className="btn btn-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)' }}>
                Criar Conta Grátis
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  /* Hero */
  hero: {
    background: 'var(--gradient-hero)',
    position: 'relative',
    overflow: 'hidden',
    minHeight: '600px',
    display: 'flex',
    alignItems: 'center',
    padding: '80px 0 100px',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'radial-gradient(ellipse at 80% 50%, rgba(41, 102, 245, 0.3) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '60px',
    position: 'relative',
    zIndex: 1,
  },
  heroLeft: {
    flex: '1',
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    backgroundColor: 'rgba(245,158,11,0.15)',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: 'var(--radius-full)',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--warning-text)',
    width: 'fit-content',
  },
  heroTitle: {
    fontSize: 'clamp(30px, 4vw, 48px)',
    fontWeight: '800',
    lineHeight: '1.12',
    color: 'var(--brand-900)',
    letterSpacing: '-1.5px',
    textShadow: '0 4px 20px rgba(43, 91, 255, 0.1)',
  },
  heroHighlight: {
    background: 'linear-gradient(90deg, var(--brand-500), var(--brand-400))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroSub: {
    fontSize: '16px',
    color: 'var(--brand-700)',
    fontWeight: '500',
    lineHeight: '1.65',
    maxWidth: '520px',
  },
  heroBtns: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  heroSocialProof: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  proofAvatar: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: 'rgba(255,255,255,0.6)',
    padding: '4px 8px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid rgba(255,255,255,0.8)',
  },
  proofText: {
    fontSize: '12px',
    color: 'var(--brand-700)',
    fontWeight: '600',
  },
  heroRight: {
    flex: '0 0 420px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImg: {
    width: '100%',
    maxWidth: '420px',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-xl)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  heroImgCard: {
    position: 'absolute',
    bottom: '-16px',
    left: '-16px',
    backgroundColor: 'white',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: 'var(--shadow-lg)',
  },
  /* Stats */
  statsSection: {
    backgroundColor: 'white',
    padding: '56px 0',
    borderBottom: '1px solid var(--border)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '32px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '8px',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--gray-50)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border)',
  },
  statNum: {
    fontSize: '32px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-1px',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  /* How */
  howSection: {
    padding: '96px 0',
    backgroundColor: 'var(--bg)',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '56px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  sectionBadge: {
    display: 'inline-block',
    padding: '4px 14px',
    backgroundColor: 'var(--brand-50)',
    color: 'var(--primary)',
    borderRadius: 'var(--radius-full)',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sectionTitle: {
    fontSize: '32px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  sectionSub: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    maxWidth: '480px',
    margin: '0 auto',
    lineHeight: '1.6',
  },
  stepsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  stepArrow: {
    fontSize: '24px',
    color: 'var(--border)',
    fontWeight: '300',
    flexShrink: 0,
  },
  /* Benefits */
  benefitsSection: {
    padding: '96px 0',
    backgroundColor: 'white',
  },
  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '28px',
    maxWidth: '960px',
    margin: '0 auto',
  },
  benefitCard: {
    backgroundColor: 'white',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--border)',
    padding: '40px',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'var(--ease)',
  },
  benefitIconWrap: {
    width: '56px',
    height: '56px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  benefitCardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '20px',
  },
  /* CTA */
  ctaSection: {
    padding: '0 0 100px',
  },
  ctaBox: {
    background: 'var(--gradient-brand)',
    borderRadius: 'var(--radius-xl)',
    padding: '72px 48px',
    textAlign: 'center',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    boxShadow: 'var(--shadow-brand-lg)',
    position: 'relative',
    overflow: 'hidden',
  },
  ctaEyebrow: {
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'rgba(255,255,255,0.6)',
  },
  ctaTitle: {
    fontSize: '36px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
    maxWidth: '600px',
    lineHeight: '1.2',
  },
  ctaSub: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.75)',
    maxWidth: '480px',
    lineHeight: '1.6',
  },
};
