import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { dbGetPerfumes } from '../services/db';
import { isFirebaseConfigured, subscribeToCloudPerfumes } from '../services/firebase';
import { ShoppingBag, Sparkles, Check, AlertCircle } from 'lucide-react';

export const PerfumesCatalog = ({ onAddToCart }) => {
  const { language, t } = useLanguage();
  const [perfumes, setPerfumes] = useState([]);
  const [activeGender, setActiveGender] = useState('all');
  const [addedIds, setAddedIds] = useState({});

  useEffect(() => {
    // Initial load from local DB
    setPerfumes(dbGetPerfumes());

    // Live sync with Firebase Cloud Firestore if active
    let unsub = () => {};
    if (isFirebaseConfigured()) {
      unsub = subscribeToCloudPerfumes((cloudPerfumes) => {
        if (cloudPerfumes && cloudPerfumes.length > 0) {
          setPerfumes(cloudPerfumes);
        }
      });
    }

    const handleStorage = () => {
      setPerfumes(dbGetPerfumes());
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (unsub) unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const genderFilters = [
    { key: 'all', label: t('cat_all') },
    { key: 'unisex', label: t('perfume_gender_unisex') },
    { key: 'women', label: t('perfume_gender_women') },
    { key: 'men', label: t('perfume_gender_men') }
  ];

  const filteredPerfumes = activeGender === 'all'
    ? perfumes
    : perfumes.filter(p => p.gender === activeGender);

  const handleAdd = (perfume) => {
    if (perfume.stock <= 0) return;

    onAddToCart({
      id: perfume.id,
      name: perfume.name,
      price: perfume.price,
      image: perfume.image,
      type: 'perfume'
    });

    setAddedIds(prev => ({ ...prev, [perfume.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [perfume.id]: false }));
    }, 1800);
  };

  return (
    <section id="perfumes" style={{ padding: '90px 0' }}>
      <div className="section-container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="tag-badge" style={{ marginBottom: '12px' }}>
            <Sparkles size={14} />
            <span>{t('perfume_tag')}</span>
          </div>
          <h2 className="font-serif text-gold" style={{ fontSize: '2.8rem', fontWeight: 700 }}>
            {t('perfume_title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '660px', margin: '12px auto 0' }}>
            {t('perfume_subtitle')}
          </p>
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '48px' }}>
          {genderFilters.map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveGender(filter.key)}
              style={{
                padding: '10px 22px',
                borderRadius: '30px',
                fontSize: '0.9rem',
                fontWeight: 600,
                backgroundColor: activeGender === filter.key ? 'var(--gold-primary)' : 'rgba(255, 255, 255, 0.04)',
                color: activeGender === filter.key ? '#0b0a0e' : 'var(--text-main)',
                border: activeGender === filter.key ? 'none' : '1px solid rgba(212, 175, 55, 0.2)',
                transition: 'all 0.3s ease'
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Perfumes Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '36px' }}>
          {filteredPerfumes.map(perfume => {
            const desc = language === 'fr' ? perfume.desc_fr : perfume.desc_en;
            const notes = language === 'fr' ? perfume.notes_fr : perfume.notes_en;
            const isAdded = addedIds[perfume.id];
            const stock = perfume.stock !== undefined ? perfume.stock : 8;

            return (
              <div key={perfume.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                <div style={{ height: '320px', overflow: 'hidden', position: 'relative', backgroundColor: '#09080c' }}>
                  <img src={perfume.image} alt={perfume.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                  {/* Stock Level Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '14px',
                      left: '14px',
                      backgroundColor: stock > 4 ? 'rgba(34, 197, 94, 0.9)' : stock > 0 ? 'rgba(234, 179, 8, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                      color: '#000',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '16px'
                    }}
                  >
                    {stock > 4 ? `${t('common_in_stock')} (${stock})` : stock > 0 ? `${t('common_low_stock')} (${stock})` : t('common_sold_out')}
                  </div>

                  <div style={{ position: 'absolute', top: '14px', right: '14px', backgroundColor: 'rgba(11, 10, 14, 0.8)', backdropFilter: 'blur(8px)', color: 'var(--gold-light)', fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                    {perfume.volume}
                  </div>
                </div>

                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                    {perfume.brand}
                  </div>

                  <h3 className="font-serif" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '4px 0 10px', color: 'var(--text-main)' }}>
                    {perfume.name}
                  </h3>

                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px', flex: 1, lineHeight: 1.6 }}>
                    {desc}
                  </p>

                  <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.06)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.15)', fontSize: '0.82rem', color: 'var(--gold-light)', marginBottom: '20px' }}>
                    <strong>✨ {t('perfume_notes')}:</strong> {notes}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(212, 175, 55, 0.12)', paddingTop: '16px', marginTop: 'auto' }}>
                    <span className="font-serif text-gold" style={{ fontSize: '1.6rem', fontWeight: 800 }}>${perfume.price.toFixed(2)}</span>

                    <button
                      onClick={() => handleAdd(perfume)}
                      disabled={stock <= 0}
                      className={isAdded ? "" : stock > 0 ? "bg-gold-gradient" : ""}
                      style={{
                        padding: '12px 22px',
                        borderRadius: '30px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: isAdded ? '#22c55e' : stock <= 0 ? 'rgba(255,255,255,0.08)' : undefined,
                        color: stock <= 0 ? 'var(--text-muted)' : isAdded ? '#fff' : undefined,
                        cursor: stock <= 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {stock <= 0 ? (
                        <>
                          <AlertCircle size={15} />
                          <span>{t('common_sold_out')}</span>
                        </>
                      ) : isAdded ? (
                        <>
                          <Check size={16} />
                          <span>{t('common_added')}</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={16} />
                          <span>{t('care_add_cart')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
