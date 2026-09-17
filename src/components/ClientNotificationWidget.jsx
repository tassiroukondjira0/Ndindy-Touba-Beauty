import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getClientNotifications } from '../services/notifications';
import { Bell, Search } from 'lucide-react';

export const ClientNotificationWidget = () => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const results = getClientNotifications(searchQuery);
    setSearchResults(results);
    setHasSearched(true);
  };

  return (
    <section style={{ padding: '60px 0', backgroundColor: 'rgba(212, 175, 55, 0.02)', borderTop: '1px solid rgba(212, 175, 55, 0.15)' }}>
      <div className="section-container" style={{ maxWidth: '800px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="tag-badge" style={{ marginBottom: '10px' }}>
            <Bell size={14} />
            <span>{t('notif_widget_tag')}</span>
          </div>
          <h2 className="font-serif text-gold" style={{ fontSize: '2.2rem', fontWeight: 700 }}>
            {t('notif_widget_title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
            {t('notif_widget_subtitle')}
          </p>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('notif_widget_placeholder')}
            required
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '30px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
          <button
            type="submit"
            className="bg-gold-gradient"
            style={{ padding: '14px 28px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
          >
            <Search size={18} />
            <span>{t('common_search')}</span>
          </button>
        </form>

        {hasSearched && (
          <div>
            {searchResults.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                {t('notif_widget_not_found')} "<strong>{searchQuery}</strong>". {t('notif_widget_verify')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {searchResults.map(notif => (
                  <div
                    key={notif.id}
                    className="glass-card"
                    style={{
                      padding: '20px',
                      borderLeft: '4px solid var(--gold-primary)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>{notif.title}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--gold-light)' }}>
                        {new Date(notif.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')} à {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '10px' }}>
                      {notif.message}
                    </p>

                    <div style={{ fontSize: '0.8rem', color: 'var(--gold-primary)', fontWeight: 600 }}>
                      {t('notif_widget_ref_linked')} {notif.referenceId}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
