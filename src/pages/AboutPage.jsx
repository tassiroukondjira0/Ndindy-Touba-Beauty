import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SalonInfo } from '../components/SalonInfo';
import { ClientNotificationWidget } from '../components/ClientNotificationWidget';
import { Testimonials } from '../components/Testimonials';
import { Award } from 'lucide-react';

const CERT_CERTIFICATE = '/assets/WhatsApp%20Image%202026-09-14%20at%2002.41.47%20(2).jpeg';
const CERT_BADGE = '/assets/WhatsApp%20Image%202026-09-14%20at%2002.41.48%20(1).jpeg';

export const AboutPage = () => {
  const { t } = useLanguage();

  return (
    <div style={{ paddingTop: '100px' }}>
      <SalonInfo />

      {/* Certifications Section */}
      <section className="section-container" style={{ padding: '90px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="tag-badge" style={{ marginBottom: '12px' }}>
            <Award size={14} />
            <span>{t('cert_tag')}</span>
          </div>
          <h2 className="font-serif text-gold" style={{ fontSize: '2.6rem', fontWeight: 700 }}>
            {t('cert_title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '680px', margin: '12px auto 0', lineHeight: 1.6 }}>
            {t('cert_subtitle')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <img
              src={CERT_CERTIFICATE}
              alt={t('cert_letter_caption')}
              style={{ width: '100%', borderRadius: '8px', display: 'block' }}
            />
            <div style={{ marginTop: '14px', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {t('cert_letter_caption')}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <img
              src={CERT_BADGE}
              alt={t('cert_badge_caption')}
              style={{ width: '100%', borderRadius: '8px', display: 'block' }}
            />
            <div style={{ marginTop: '14px', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {t('cert_badge_caption')}
            </div>
          </div>
        </div>
      </section>

      <ClientNotificationWidget />
      <Testimonials />
    </div>
  );
};