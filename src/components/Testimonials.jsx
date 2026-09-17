import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Star, Quote, Sparkles } from 'lucide-react';

export const Testimonials = () => {
  const { language, t } = useLanguage();

  const reviews = [
    {
      id: 1,
      name: "Fatou K.",
      role: language === 'fr' ? "Cliente fidèle depuis 3 ans" : "Loyal customer for 3 years",
      rating: 5,
      comment: language === 'fr'
        ? "Je me tresse chez Touba Ndindy depuis des années. Les tresses sont magnifiques, ultra propres et surtout SANS DOULEUR ! Mon cuir chevelu revit."
        : "I've been getting my hair braided at Touba Ndindy for years. The braids are gorgeous, extremely neat, and totally PAINLESS! My scalp feels wonderful.",
      style: "Knotless Braids"
    },
    {
      id: 2,
      name: "Ashley M.",
      role: language === 'fr' ? "Cliente Baltimore, MD" : "Baltimore MD Client",
      rating: 5,
      comment: language === 'fr'
        ? "Le meilleur salon de tresses africaines à Baltimore sans hésiter ! Rapide, soigné, professionnel, et la sélection de parfums à l'intérieur est incroyable (j'ai pris Mousuf et Oud Mood)."
        : "The best African hair braiding salon in Baltimore hands down! Fast, clean, professional, and the perfume store inside is incredible (I bought Mousuf & Oud Mood).",
      style: "Flat Twist Updo"
    },
    {
      id: 3,
      name: "Aminata S.",
      role: language === 'fr' ? "Cliente régulière" : "Regular Client",
      rating: 5,
      comment: language === 'fr'
        ? "Accueil chaleureux, salon très propre sur Eutaw Street. J'ai acheté l'huile au Chébé et mes tresses ont tenu plus de 2 mois sans s'abîmer !"
        : "Warm welcome, spotless salon on Eutaw Street. I bought the Chebe oil and my braids lasted more than 2 months flawlessly!",
      style: "Fulani Braids"
    }
  ];

  return (
    <section style={{ padding: '80px 0', backgroundColor: 'rgba(212, 175, 55, 0.015)' }}>
      <div className="section-container">
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div className="tag-badge" style={{ marginBottom: '12px' }}>
            <Sparkles size={14} />
            <span>{t('review_tag')}</span>
          </div>
          <h2 className="font-serif text-gold" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            {t('review_title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '8px' }}>
            {t('review_subtitle')}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '30px'
          }}
        >
          {reviews.map(review => (
            <div
              key={review.id}
              className="glass-card"
              style={{
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              <Quote size={36} color="rgba(212, 175, 55, 0.2)" style={{ position: 'absolute', top: '20px', right: '20px' }} />
              
              <div style={{ display: 'flex', color: '#FFD700', marginBottom: '16px' }}>
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} size={16} fill="#FFD700" />
                ))}
              </div>

              <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontStyle: 'italic', marginBottom: '24px', lineHeight: 1.6, flex: 1 }}>
                "{review.comment}"
              </p>

              <div style={{ borderTop: '1px solid rgba(212, 175, 55, 0.15)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{review.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{review.role}</div>
                </div>
                <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(212, 175, 55, 0.1)', color: 'var(--gold-primary)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                  {review.style}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
