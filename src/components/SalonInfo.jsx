import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MapPin, Phone, CreditCard, Clock, CheckCircle2, Award, ExternalLink } from 'lucide-react';

export const SalonInfo = () => {
  const { t } = useLanguage();

  return (
    <section id="about" style={{ padding: '80px 0', backgroundColor: 'rgba(212, 175, 55, 0.02)' }}>
      <div className="section-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div className="tag-badge" style={{ marginBottom: '12px' }}>
            {t('info_tag')}
          </div>
          <h2 className="font-serif text-gold" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            {t('info_title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '650px', margin: '12px auto 0' }}>
            {t('info_subtitle')}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '40px',
            alignItems: 'center'
          }}
        >
          {/* Business Card & Visual Showcase */}
          <div>
            <div
              className="glass-card"
              style={{
                padding: '20px',
                position: 'relative',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
              }}
            >
              <div
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden'
                }}
              >
                <img
                  src="/assets/touba-ndindy-card.jpg"
                  alt="Carte de visite TOUBA NDINDY Professional African Hair Braiding"
                  style={{
                    width: '100%',
                    height: 'auto',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-sm)'
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(212, 175, 55, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(212, 175, 55, 0.2)'
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--gold-light)', fontWeight: 600 }}>
                  {t('info_card_caption')}
                </span>
                <span className="tag-badge" style={{ padding: '2px 10px', fontSize: '0.75rem' }}>
                  {t('info_card_badge')}
                </span>
              </div>
            </div>
          </div>

          {/* Details & Info Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-main)', lineHeight: 1.7 }}>
              {t('info_desc')}
            </p>

            {/* Address Box */}
            <div
              className="glass-card"
              style={{
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  color: 'var(--gold-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <MapPin size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('info_address_label')}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  306 North Eutaw Street, Baltimore Maryland 21201
                </div>
                <a
                  href="https://maps.google.com/?q=306+North+Eutaw+Street+Baltimore+Maryland+21201"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--gold-primary)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginTop: '6px'
                  }}
                >
                  <span>{t('common_view_map')}</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>

            {/* Phone Box */}
            <div
              className="glass-card"
              style={{
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  color: 'var(--gold-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Phone size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('info_phone_label')}
                </div>
                <a
                  href="tel:4438581400"
                  className="font-serif text-gold"
                  style={{ fontSize: '1.5rem', fontWeight: 700, display: 'block', marginTop: '2px' }}
                >
                  443-858-1400
                </a>
              </div>
            </div>

            {/* Payment Methods Box */}
            <div
              className="glass-card"
              style={{
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  color: 'var(--gold-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <CreditCard size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('info_payments_label')}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      color: 'var(--gold-light)',
                      fontSize: '0.85rem',
                      fontWeight: 700
                    }}
                  >
                    💵 Cash
                  </span>
                  <span
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      backgroundColor: 'rgba(0, 214, 50, 0.12)',
                      border: '1px solid rgba(0, 214, 50, 0.3)',
                      color: '#4ade80',
                      fontSize: '0.85rem',
                      fontWeight: 700
                    }}
                  >
                    📲 Cash App
                  </span>
                  <span
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      backgroundColor: 'rgba(116, 20, 220, 0.15)',
                      border: '1px solid rgba(116, 20, 220, 0.3)',
                      color: '#a78bfa',
                      fontSize: '0.85rem',
                      fontWeight: 700
                    }}
                  >
                    ⚡ Zelle
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
