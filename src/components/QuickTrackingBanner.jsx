import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Search, Calendar, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';

export const QuickTrackingBanner = ({ navigateTo }) => {
  const { t } = useLanguage();
  const [quickQuery, setQuickQuery] = useState('');

  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (!quickQuery.trim()) {
      if (navigateTo) navigateTo('/tracking');
      return;
    }
    if (navigateTo) {
      navigateTo('/tracking', quickQuery.trim());
    }
  };

  return (
    <section style={{ padding: '70px 0', backgroundColor: 'rgba(212, 175, 55, 0.02)', borderTop: '1px solid rgba(212, 175, 55, 0.15)', borderBottom: '1px solid rgba(212, 175, 55, 0.15)' }}>
      <div className="section-container" style={{ maxWidth: '1000px' }}>
        
        <div 
          className="glass-card"
          style={{
            padding: '36px 32px',
            borderRadius: '20px',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle background glow decoration */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', alignItems: 'center' }}>
            
            {/* Left Column: Information */}
            <div>
              <div className="tag-badge" style={{ marginBottom: '12px' }}>
                <Sparkles size={14} />
                <span>{t('quick_track_tag')}</span>
              </div>
              <h2 className="font-serif text-gold" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', fontWeight: 700, marginBottom: '10px', lineHeight: 1.2 }}>
                {t('quick_track_title')}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '18px' }}>
                {t('quick_track_desc')}
              </p>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--gold-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} color="var(--gold-primary)" />
                  <span>{t('quick_track_braids')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingBag size={15} color="var(--gold-primary)" />
                  <span>{t('quick_track_orders')}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Search Form */}
            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', padding: '24px', borderRadius: '14px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
                {t('quick_track_form_title')}
              </div>

              <form onSubmit={handleQuickSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="var(--gold-primary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={quickQuery}
                    onChange={e => setQuickQuery(e.target.value)}
                    placeholder={t('quick_track_placeholder')}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 38px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="bg-gold-gradient"
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <span>{t('quick_track_btn')}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
