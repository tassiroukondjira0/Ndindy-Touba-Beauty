import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { dbGetBraids } from '../services/db';
import { isFirebaseConfigured, subscribeToCloudBraids } from '../services/firebase';
import { useAdminSession } from '../hooks/useAdminSession';
import { Clock, Calendar, Check, Sparkles, Filter } from 'lucide-react';

export const BraidsCatalog = ({ onSelectBraidForBooking }) => {
  const { language, t } = useLanguage();
  const isAdminLoggedIn = useAdminSession();
  const [braids, setBraids] = useState(() => dbGetBraids());
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const refresh = () => setBraids(dbGetBraids());
    window.addEventListener('storage', refresh);

    let unsub = () => {};
    if (isFirebaseConfigured()) {
      unsub = subscribeToCloudBraids((cloudBraids) => {
        setBraids(cloudBraids || []);
      });
    }

    return () => {
      if (unsub) unsub();
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const categories = [
    { key: 'all', label: t('cat_all') },
    { key: 'knotless', label: t('cat_knotless') },
    { key: 'box', label: t('cat_box') },
    { key: 'twists', label: t('cat_twists') },
    { key: 'cornrows', label: t('cat_cornrows') },
    { key: 'locs', label: t('cat_locs') }
  ];

  const filteredBraids = activeCategory === 'all'
    ? braids
    : braids.filter(b => b.category === activeCategory);

  return (
    <section id="braids" style={{ padding: '90px 0' }}>
      <div className="section-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="tag-badge" style={{ marginBottom: '12px' }}>
            <Sparkles size={14} />
            <span>{t('braids_tag')}</span>
          </div>
          <h2 className="font-serif text-gold" style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 700 }}>
            {t('braids_title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '640px', margin: '12px auto 0' }}>
            {t('braids_subtitle')}
          </p>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '48px'
          }}
        >
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '10px 22px',
                borderRadius: '30px',
                fontSize: '0.9rem',
                fontWeight: 600,
                backgroundColor: activeCategory === cat.key ? 'var(--gold-primary)' : 'rgba(255, 255, 255, 0.04)',
                color: activeCategory === cat.key ? '#0b0a0e' : 'var(--text-main)',
                border: activeCategory === cat.key ? 'none' : '1px solid rgba(212, 175, 55, 0.2)',
                boxShadow: activeCategory === cat.key ? '0 6px 20px rgba(212, 175, 55, 0.3)' : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Braids Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '32px'
          }}
        >
          {filteredBraids.map(item => {
            const title = language === 'fr' ? item.title_fr : item.title_en;
            const desc = language === 'fr' ? item.description_fr : item.description_en;

            return (
              <div
                key={item.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {/* Image */}
                <div style={{ position: 'relative', height: '260px', overflow: 'hidden' }}>
                  <img
                    src={item.image}
                    alt={title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.06)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  />

                  {item.featured && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '14px',
                        left: '14px',
                        backgroundColor: 'var(--gold-primary)',
                        color: '#000',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        textTransform: 'uppercase'
                      }}
                    >
                      {t('braid_featured_badge')}
                    </div>
                  )}

                  <div
                    style={{
                      position: 'absolute',
                      bottom: '14px',
                      right: '14px',
                      backgroundColor: 'rgba(11, 10, 14, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      color: 'var(--gold-light)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '1.1rem',
                      fontWeight: 800
                    }}
                  >
                    ${item.price}
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 className="font-serif" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
                    {title}
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.82rem',
                      color: 'var(--gold-primary)',
                      marginBottom: '14px'
                    }}
                  >
                    <Clock size={14} />
                    <span>{t('braid_duration')}: {item.duration}</span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px', flex: 1, lineHeight: 1.6 }}>
                    {desc}
                  </p>

                  {!isAdminLoggedIn && (
                    <div style={{ borderTop: '1px solid rgba(212, 175, 55, 0.12)', paddingTop: '16px', marginTop: 'auto' }}>
                      <button
                        onClick={() => onSelectBraidForBooking(item)}
                        className="bg-gold-gradient"
                        style={{
                          width: '100%',
                          padding: '12px 18px',
                          borderRadius: '30px',
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        <Calendar size={16} />
                        <span>{t('braid_book_btn')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
