import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { dbGetProducts } from '../services/db';
import { isFirebaseConfigured, subscribeToCloudProducts } from '../services/firebase';
import { useAdminSession } from '../hooks/useAdminSession';
import { ShoppingBag, Star, Sparkles, Check, AlertCircle } from 'lucide-react';

export const CareProducts = ({ onAddToCart }) => {
  const { language, t } = useLanguage();
  const isAdminLoggedIn = useAdminSession();
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [addedIds, setAddedIds] = useState({});

  useEffect(() => {
    // Initial load from local DB
    setProducts(dbGetProducts());

    // Live sync with Firebase Cloud Firestore if active
    let unsub = () => {};
    if (isFirebaseConfigured()) {
      unsub = subscribeToCloudProducts((cloudProducts) => {
        if (cloudProducts && cloudProducts.length > 0) {
          setProducts(cloudProducts);
        }
      });
    }

    const handleStorage = () => {
      setProducts(dbGetProducts());
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (unsub) unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const categories = [
    { key: 'all', label: t('care_cat_all') },
    { key: 'oil', label: t('care_cat_oil') },
    { key: 'butter', label: t('care_cat_butter') },
    { key: 'body', label: t('care_cat_body') }
  ];

  // Perfumes live in the same unified catalog; keep only care products here.
  const careProducts = products.filter(p => p.type !== 'perfume');

  const filteredProducts = activeCategory === 'all'
    ? careProducts
    : careProducts.filter(p => p.category === activeCategory);

  const handleAdd = (product) => {
    if (product.stock <= 0) return;

    onAddToCart({
      id: product.id,
      name: language === 'fr' ? product.name_fr : product.name_en,
      price: product.price,
      image: product.image,
      type: 'product'
    });

    setAddedIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  return (
    <section id="care" style={{ padding: '90px 0', backgroundColor: 'rgba(212, 175, 55, 0.02)' }}>
      <div className="section-container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="tag-badge" style={{ marginBottom: '12px' }}>
            <Sparkles size={14} />
            <span>{t('care_tag')}</span>
          </div>
          <h2 className="font-serif text-gold" style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 700 }}>
            {t('care_title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '660px', margin: '12px auto 0' }}>
            {t('care_subtitle')}
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '48px' }}>
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
                transition: 'all 0.3s ease'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '32px' }}>
          {filteredProducts.map(product => {
            const name = language === 'fr' ? product.name_fr : product.name_en;
            const desc = language === 'fr' ? product.desc_fr : product.desc_en;
            const ingredients = language === 'fr' ? product.ingredients_fr : product.ingredients_en;
            const isAdded = addedIds[product.id];
            const stock = product.stock !== undefined ? product.stock : 10;

            return (
              <div key={product.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ height: '240px', overflow: 'hidden', position: 'relative' }}>
                  <img src={product.image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  
                  {/* Stock Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      backgroundColor: stock > 4 ? 'rgba(34, 197, 94, 0.9)' : stock > 0 ? 'rgba(234, 179, 8, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                      color: '#000',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}
                  >
                    {stock > 4 ? `${t('common_in_stock')} (${stock})` : stock > 0 ? `${t('common_low_stock')} (${stock})` : t('common_out_of_stock')}
                  </div>

                  <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'rgba(11, 10, 14, 0.85)', padding: '4px 10px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#FFD700', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                    <Star size={13} fill="#FFD700" />
                    <span>{product.rating || 4.9}</span>
                  </div>
                </div>

                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>{name}</h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '14px', flex: 1, lineHeight: 1.5 }}>{desc}</p>
                  
                  {ingredients && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--gold-light)', backgroundColor: 'rgba(212, 175, 55, 0.08)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '18px', border: '1px dashed rgba(212, 175, 55, 0.2)' }}>
                      <strong>🌿 {t('care_ingredients')}:</strong> {ingredients}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(212, 175, 55, 0.12)', paddingTop: '16px', marginTop: 'auto' }}>
                    <span className="font-serif text-gold" style={{ fontSize: '1.5rem', fontWeight: 800 }}>${product.price.toFixed(2)}</span>

                    {!isAdminLoggedIn && (
                      <button
                        onClick={() => handleAdd(product)}
                        disabled={stock <= 0}
                        className={isAdded ? "" : stock > 0 ? "bg-gold-gradient" : ""}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '30px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
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
                    )}
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
