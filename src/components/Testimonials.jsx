import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useClientAuth } from '../context/ClientAuthContext';
import { getClientDisplayName } from '../utils/clientName';
import { dbGetReviews, dbAddReview } from '../services/db';
import { isFirebaseConfigured, subscribeToCloudReviews } from '../services/firebase';
import { Star, Quote, Sparkles, PenLine, User } from 'lucide-react';

const StarPicker = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);

  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {[1, 2, 3, 4, 5].map(n => {
        const active = n <= (hover || value);
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n}`}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: active ? '#FFD700' : 'rgba(255, 255, 255, 0.15)'
            }}
          >
            <Star size={26} fill={active ? '#FFD700' : 'transparent'} />
          </button>
        );
      })}
    </div>
  );
};

export const Testimonials = () => {
  const { language, t } = useLanguage();
  const { clientUser, authEnabled, authLoading, openAuth } = useClientAuth();

  const [reviews, setReviews] = useState(() => dbGetReviews());
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const refresh = () => setReviews(dbGetReviews());
    window.addEventListener('storage', refresh);

    let unsub = () => {};
    if (isFirebaseConfigured()) {
      unsub = subscribeToCloudReviews((cloudReviews) => {
        setReviews(cloudReviews || []);
      });
    }

    return () => {
      if (unsub) unsub();
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const myReview = clientUser ? reviews.find(r => r.clientUid === clientUser.uid) : null;
  const isClientLoggedIn = authEnabled && !authLoading && Boolean(clientUser);

  const openReviewForm = () => {
    if (!authEnabled) {
      return;
    }
    if (!clientUser) {
      openAuth('login');
      return;
    }
    setComment(myReview ? myReview.comment : '');
    setRating(myReview ? myReview.rating : 5);
    setSubmitted(false);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = comment.trim();
    if (!clean || !clientUser) return;

    const name = getClientDisplayName(clientUser, t('client_account_menu'));
    dbAddReview({
      clientUid: clientUser.uid,
      name,
      rating,
      comment: clean
    });

    setReviews(dbGetReviews());
    setComment('');
    setShowForm(false);
    setSubmitted(true);
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <section style={{ padding: '80px 0', backgroundColor: 'rgba(212, 175, 55, 0.015)' }}>
      <div className="section-container">
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div className="tag-badge" style={{ marginBottom: '12px' }}>
            <Sparkles size={14} />
            <span>{t('review_tag')}</span>
          </div>
          <h2 className="font-serif text-gold" style={{ fontSize: 'clamp(1.9rem, 5vw, 2.5rem)', fontWeight: 700 }}>
            {t('review_title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '8px' }}>
            {t('review_subtitle')}
          </p>

          {/* Client review action (only when client auth is available) */}
          {authEnabled && (
            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'center' }}>
              {!showForm && (
                <button
                  onClick={openReviewForm}
                  className="bg-gold-gradient"
                  style={{
                    padding: '12px 26px',
                    borderRadius: '30px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <PenLine size={16} />
                  <span>
                    {isClientLoggedIn && myReview
                      ? t('review_form_submit_edit_trigger')
                      : isClientLoggedIn
                        ? t('review_write_btn')
                        : t('review_login_required')}
                  </span>
                </button>
              )}

              {showForm && (
                <form
                  onSubmit={handleSubmit}
                  className="glass-card"
                  style={{
                    width: '100%',
                    maxWidth: '640px',
                    padding: 'clamp(20px, 4vw, 32px)',
                    textAlign: 'left'
                  }}
                >
                  <div className="font-serif text-gold" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>
                    {myReview ? t('review_form_title_edit') : t('review_form_title')}
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={14} color="var(--gold-primary)" />
                    <span>{getClientDisplayName(clientUser)}</span>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                      {t('review_form_rating')}
                    </div>
                    <StarPicker value={rating} onChange={setRating} />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                      {t('review_form_comment')}
                    </label>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      rows={4}
                      required
                      placeholder={t('review_form_comment_ph')}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(212,175,55,0.3)',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="submit"
                      className="bg-gold-gradient"
                      style={{
                        padding: '12px 24px',
                        borderRadius: '30px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {t(myReview ? 'review_form_submit_edit' : 'review_form_submit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '30px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      {t('common_cancel')}
                    </button>
                  </div>
                </form>
              )}

              {submitted && !showForm && (
                <div
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.35)',
                    color: '#6ee7a0',
                    padding: '12px 22px',
                    borderRadius: '30px',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}
                >
                  {t('review_form_success')}
                </div>
              )}
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              padding: '40px 20px',
              border: '1px dashed rgba(212, 175, 55, 0.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.95rem'
            }}
          >
            {t('review_empty')}
          </div>
        ) : (
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
                  {[...Array(Math.min(5, Math.max(1, review.rating || 5)))].map((_, i) => (
                    <Star key={i} size={16} fill="#FFD700" />
                  ))}
                </div>

                <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontStyle: 'italic', marginBottom: '24px', lineHeight: 1.6, flex: 1 }}>
                  "{review.comment}"
                </p>

                <div style={{ borderTop: '1px solid rgba(212, 175, 55, 0.15)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      {review.name || t('client_account_menu')}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span>✓ {t('review_verified')}</span>
                      {review.createdAt && <span>· {formatDate(review.createdAt)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};