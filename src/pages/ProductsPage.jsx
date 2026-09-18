import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CareProducts } from '../components/CareProducts';
import { PerfumesCatalog } from '../components/PerfumesCatalog';
import { Sparkles } from 'lucide-react';

export const ProductsPage = ({ onAddToCart }) => {
  const { t } = useLanguage();
  const [view, setView] = useState('all');

  const tabs = [
    { key: 'all', label: t('products_cat_all') },
    { key: 'care', label: t('products_cat_care') },
    { key: 'perfume', label: t('products_cat_perfume') }
  ];

  return (
    <div>
      {/* Page header */}
      <div
        className="section-container"
        style={{
          paddingTop: '110px',
          paddingBottom: '0',
          textAlign: 'center'
        }}
      >
        <div className="tag-badge" style={{ marginBottom: '12px' }}>
          <Sparkles size={14} />
          <span>{t('products_tag')}</span>
        </div>
        <h1 className="font-serif text-gold" style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', fontWeight: 700, marginBottom: '12px' }}>
          {t('products_title')}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
          {t('products_subtitle')}
        </p>

        {/* Page-level filter */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', margin: '28px auto 0', paddingBottom: '28px' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              style={{
                padding: '10px 22px',
                borderRadius: '30px',
                fontSize: '0.9rem',
                fontWeight: 600,
                backgroundColor: view === tab.key ? 'var(--gold-primary)' : 'rgba(255, 255, 255, 0.04)',
                color: view === tab.key ? '#0b0a0e' : 'var(--text-main)',
                border: view === tab.key ? 'none' : '1px solid rgba(212, 175, 55, 0.2)',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {view !== 'perfume' && <CareProducts onAddToCart={onAddToCart} />}
      {view !== 'care' && <PerfumesCatalog onAddToCart={onAddToCart} />}
    </div>
  );
};