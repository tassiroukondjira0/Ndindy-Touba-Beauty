import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MapPin, Phone, Clock, Sparkles } from 'lucide-react';

export const Footer = ({ navigateTo }) => {
  const { t } = useLanguage();

  return (
    <footer
      id="contact"
      style={{
        backgroundColor: '#070609',
        borderTop: '1px solid rgba(212, 175, 55, 0.2)',
        paddingTop: '70px',
        paddingBottom: '30px',
        color: 'var(--text-muted)'
      }}
    >
      <div className="section-container" style={{ paddingBottom: '40px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '40px'
          }}
        >
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d4af37 0%, #aa8620 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Sparkles size={18} color="#000" />
              </div>
              <span className="font-serif text-gold" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                TOUBA NDINDY
              </span>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
              {t('footer_desc')}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--gold-light)' }}>
                💳 {t('info_payments_val')}
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-gold" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>
              {t('footer_nav_title')}
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <li><button onClick={() => navigateTo && navigateTo('/')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>{t('nav_home')}</button></li>
              <li><button onClick={() => navigateTo && navigateTo('/about')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>{t('nav_about')}</button></li>
              <li><button onClick={() => navigateTo && navigateTo('/braids')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>{t('nav_braids')}</button></li>
              <li><button onClick={() => navigateTo && navigateTo('/care')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>{t('nav_care')}</button></li>
              <li><button onClick={() => navigateTo && navigateTo('/perfumes')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>{t('nav_perfumes')}</button></li>
              <li><button onClick={() => navigateTo && navigateTo('/tracking')} style={{ background: 'none', border: 'none', color: 'var(--gold-light)', cursor: 'pointer', fontWeight: 600 }}>🔍 {t('nav_tracking')}</button></li>
            </ul>
          </div>

          {/* Contact & Address */}
          <div>
            <h4 className="font-serif text-gold" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>
              {t('footer_contact_title')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <MapPin size={18} color="var(--gold-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>306 North Eutaw Street, Baltimore Maryland 21201</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={18} color="var(--gold-primary)" style={{ flexShrink: 0 }} />
                <a href="tel:4438581400" style={{ color: 'var(--gold-light)', fontWeight: 700 }}>443-858-1400</a>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div>
            <h4 className="font-serif text-gold" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>
              {t('footer_hours_title')}
            </h4>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem', lineHeight: 1.6 }}>
              <Clock size={18} color="var(--gold-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div><strong>{t('footer_mon_sat')}</strong> 8:00 AM - 8:00 PM</div>
                <div><strong>{t('footer_sunday')}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar with discrete owner login trigger */}
        <div
          style={{
            marginTop: '50px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center',
            fontSize: '0.85rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div>
            © {new Date().getFullYear()} TOUBA NDINDY PROFESSIONAL AFRICAN HAIR BRAIDING.{' '}
            {/* Subtle owner access point */}
            <button
              onClick={() => navigateTo && navigateTo('/admin')}
              title={t('nav_owner_access')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                opacity: 0.6,
                padding: 0,
                fontSize: '0.85rem'
              }}
            >
              🔒
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gold-light)' }}>
            <span>{t('footer_made_with')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
