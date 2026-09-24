import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAdminSession } from '../hooks/useAdminSession';
import { Calendar, ArrowRight, Star, ShieldCheck, Award, Sparkles } from 'lucide-react';

export const Hero = ({ onOpenBooking, navigateTo }) => {
  const { language, t } = useLanguage();
  const isAdminLoggedIn = useAdminSession();

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        paddingTop: '160px',
        paddingBottom: '100px',
        overflow: 'hidden'
      }}
    >
      {/* Background Glowing Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '5%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '5%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224, 122, 95, 0.1) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />

      <div className="section-container" style={{ position: 'relative', zIndex: 2 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '48px',
            alignItems: 'center'
          }}
        >
          {/* Text Content */}
          <div>
            <div className="tag-badge" style={{ marginBottom: '24px' }}>
              <Sparkles size={14} />
              <span>{t('hero_badge')}</span>
            </div>

            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
                fontWeight: 700,
                lineHeight: 1.1,
                marginBottom: '24px',
                color: 'var(--text-main)'
              }}
            >
              {t('hero_title_1')}{' '}
              <span className="text-gold" style={{ display: 'block' }}>
                {t('hero_title_2')}
              </span>
            </h1>

            <p
              style={{
                fontSize: '1.1rem',
                color: 'var(--text-muted)',
                marginBottom: '36px',
                maxWidth: '560px',
                lineHeight: 1.7
              }}
            >
              {t('hero_subtitle')}
            </p>

            {/* CTA Buttons (hidden on the owner's dashboard) */}
            {!isAdminLoggedIn && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '48px' }}>
                <button
                  onClick={onOpenBooking}
                  className="bg-gold-gradient"
                  style={{
                    padding: '16px 36px',
                    borderRadius: '40px',
                    fontSize: '1rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <Calendar size={18} />
                  <span>{t('hero_cta_book')}</span>
                </button>

                <button
                  onClick={() => navigateTo && navigateTo('/products')}
                  style={{
                    padding: '16px 32px',
                    borderRadius: '40px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    color: 'var(--text-main)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.3s'
                  }}
                >
                  <span>{t('hero_cta_shop')}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* Key Stats Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                paddingTop: '24px',
                borderTop: '1px solid rgba(212, 175, 55, 0.15)'
              }}
            >
              <div>
                <div className="font-serif text-gold" style={{ fontSize: '1.8rem', fontWeight: 700 }}>1500+</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('stat_clients')}</div>
              </div>
              <div>
                <div className="font-serif text-gold" style={{ fontSize: '1.8rem', fontWeight: 700 }}>{t('hero_stat_exp_val')}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('stat_experience')}</div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="font-serif text-gold" style={{ fontSize: '1.8rem', fontWeight: 700 }}>4.9</span>
                  <div style={{ display: 'flex', color: '#FFD700' }}>
                    <Star size={14} fill="#FFD700" />
                    <Star size={14} fill="#FFD700" />
                    <Star size={14} fill="#FFD700" />
                    <Star size={14} fill="#FFD700" />
                    <Star size={14} fill="#FFD700" />
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('stat_rating')}</div>
              </div>
            </div>
          </div>

          {/* Featured Visual Card */}
          <div style={{ position: 'relative' }}>
            <div
              className="glass-card animate-float"
              style={{
                padding: '16px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '420px',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <img
                  src="/assets/flat-twist-braids.jpg"
                  alt="Touba Ndindy African Hair Braiding Plus L.L.C Hairstyle"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(11,10,14,0.95) 0%, transparent 60%)'
                  }}
                />
                
                {/* Floating Badge on Image */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    right: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end'
                  }}
                >
                  <div>
                    <span
                      style={{
                        backgroundColor: 'var(--gold-primary)',
                        color: '#000',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '12px',
                        textTransform: 'uppercase'
                      }}
                    >
                      {t('hero_signature_badge')}
                    </span>
                    <h3 className="font-serif" style={{ fontSize: '1.4rem', color: '#fff', marginTop: '6px' }}>
                      Flat Twist Updo & Bun
                    </h3>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(212, 175, 55, 0.2)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      padding: '8px 14px',
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: 'var(--gold-light)'
                    }}
                  >
                    $130
                  </div>
                </div>
              </div>
            </div>

            {/* Badge overlay 2 */}
            <div
              className="glass-card"
              style={{
                position: 'absolute',
                top: '-20px',
                left: '-20px',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                zIndex: 10
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(212, 175, 55, 0.2)',
                  color: 'var(--gold-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{t('hero_shield_title')}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('hero_shield_sub')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
