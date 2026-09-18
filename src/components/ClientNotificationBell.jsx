import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  getClientNotificationsForReferences,
  getMyTrackedReferences,
  getUnreadMyClientNotifCount,
  markMyClientNotifsAsRead,
  getNotifText
} from '../services/notifications';
import { Bell, X, ArrowRight } from 'lucide-react';

// Bell button in the navbar. Opens a small panel listing every notification for
// the reservations/orders the visitor placed on this device, so a client can
// read their updates without going to the tracking page. Unread count is shown
// as a badge and clears when the panel is opened.
export const ClientNotificationBell = ({ navigateTo }) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const outerRef = useRef(null);

  const refresh = () => {
    const refIds = getMyTrackedReferences().map(r => r.referenceId);
    setNotifs(getClientNotificationsForReferences(refIds));
    setUnread(getUnreadMyClientNotifCount());
  };

  useEffect(() => {
    refresh();
    const handleStorage = () => refresh();
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(refresh, 8000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      markMyClientNotifsAsRead();
      refresh();
    }
  }, [isOpen, language]);

  // Close the panel when clicking outside of it.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (outerRef.current && !outerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={outerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        title={t('notif_bell_btn')}
        style={{
          position: 'relative',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: isOpen ? 'var(--gold-primary)' : '#ef4444',
              color: '#000',
              fontSize: '0.7rem',
              fontWeight: 800,
              minWidth: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px'
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="glass-card animate-toast-in"
          style={{
            position: 'absolute',
            top: '48px',
            right: '0',
            width: '360px',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: '480px',
            overflowY: 'auto',
            padding: '16px',
            zIndex: 210,
            border: '1px solid rgba(212, 175, 55, 0.4)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.7)',
            backgroundColor: 'rgba(18, 16, 26, 0.98)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="font-serif text-gold" style={{ fontWeight: 800, fontSize: '1.05rem' }}>
              {t('notif_bell_title')}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {notifs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '18px 8px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              <Bell size={28} style={{ opacity: 0.5, margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                {t('notif_bell_empty')}
              </div>
              <div style={{ lineHeight: 1.5 }}>{t('notif_bell_empty_hint')}</div>
              {navigateTo && (
                <button
                  onClick={() => { setIsOpen(false); navigateTo('/tracking'); }}
                  style={{
                    marginTop: '14px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    background: 'none',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    color: 'var(--gold-light)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowRight size={15} />
                  {t('notif_bell_track_btn')}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifs.map(notif => (
                <div
                  key={notif.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderLeft: '4px solid var(--gold-primary)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                      {getNotifText(notif, 'title', language)}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gold-light)', whiteSpace: 'nowrap' }}>
                      {new Date(notif.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '6px' }}>
                    {getNotifText(notif, 'message', language)}
                  </div>
                  {notif.referenceId && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--gold-primary)', fontWeight: 600 }}>
                      {t('notif_widget_ref_linked')} {notif.referenceId}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};