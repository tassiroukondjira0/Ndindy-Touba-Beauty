import React, { useState, useEffect, useRef } from 'react';
import {
  consumeNewNotificationsForMyReferences,
  requestNotificationPermission,
  showBrowserNotification,
  playNotificationChime,
  getMyTrackedReferences,
  checkAndSendAutomatedReminders,
  mergeCloudNotifications
} from '../services/notifications';
import { isFirebaseConfigured, subscribeToCloudNotifications } from '../services/firebase';
import { CheckCircle2, XCircle, Bell, X, Clock, ShoppingBag, Calendar } from 'lucide-react';

// Mounted once at the app root. Silently watches (via storage events + a short
// poll) for status updates and 24h/48h reminders on any reservation/order the visitor
// placed on this device, and alerts them automatically — both with a real browser push
// notification (if permission was granted) and an in-app toast.
export const ClientNotificationWatcher = () => {
  const [toasts, setToasts] = useState([]);
  const hasAskedPermissionRef = useRef(false);

  const checkForUpdates = () => {
    // Run automated reminders check (24h booking reminder & 48h order pickup reminder)
    checkAndSendAutomatedReminders();

    const myRefs = getMyTrackedReferences();
    if (myRefs.length === 0) return;

    // Ask for permission once we know this visitor actually has something to track,
    // so the browser prompt appears in a relevant context (right after booking).
    if (!hasAskedPermissionRef.current) {
      hasAskedPermissionRef.current = true;
      requestNotificationPermission();
    }

    const fresh = consumeNewNotificationsForMyReferences();
    if (fresh.length === 0) return;

    playNotificationChime();
    fresh.forEach(n => {
      showBrowserNotification(n.title, { body: n.message, tag: n.id });
    });
    setToasts(prev => [...fresh.map(n => ({ ...n, _toastId: n.id })), ...prev].slice(0, 4));
  };

  useEffect(() => {
    // Check once on mount (covers the case where a status changed while the
    // visitor was away) and then keep listening for live updates.
    checkForUpdates();

    const handleStorage = () => checkForUpdates();
    window.addEventListener('storage', handleStorage);

    // Same-tab safety net: check periodically for reminders & status updates
    const interval = setInterval(checkForUpdates, 8000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Live-sync reminders/status updates generated on OTHER devices (e.g. the
  // salon owner's dashboard) so this device receives them without any manual
  // action. Only references tracked on this device are kept for privacy.
  useEffect(() => {
    if (!isFirebaseConfigured()) return () => {};
    const unsub = subscribeToCloudNotifications((cloudNotifs) => {
      const myRefIds = new Set(getMyTrackedReferences().map(r => r.referenceId));
      if (myRefIds.size === 0) return;
      const relevant = cloudNotifs.filter(n => n && n.referenceId && myRefIds.has(n.referenceId));
      if (mergeCloudNotifications(relevant) > 0) {
        checkForUpdates();
      }
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const dismissToast = (toastId) => {
    setToasts(prev => prev.filter(t => t._toastId !== toastId));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '390px',
        width: 'calc(100% - 48px)'
      }}
    >
      {toasts.map(toast => {
        const isRefused = toast.type === 'order_refused';
        const isResReminder = toast.type === 'reservation_reminder_24h';
        const isOrderReminder = toast.type === 'order_pickup_reminder_48h';

        let themeColor = '#22c55e';
        let themeBg = 'rgba(34, 197, 94, 0.15)';
        let themeBorder = 'rgba(34, 197, 94, 0.4)';
        let IconComponent = CheckCircle2;

        if (isRefused) {
          themeColor = '#ef4444';
          themeBg = 'rgba(239, 68, 68, 0.15)';
          themeBorder = 'rgba(239, 68, 68, 0.4)';
          IconComponent = XCircle;
        } else if (isResReminder) {
          themeColor = '#facc15';
          themeBg = 'rgba(250, 204, 21, 0.18)';
          themeBorder = 'rgba(250, 204, 21, 0.5)';
          IconComponent = Clock;
        } else if (isOrderReminder) {
          themeColor = '#fb923c';
          themeBg = 'rgba(251, 146, 60, 0.18)';
          themeBorder = 'rgba(251, 146, 60, 0.5)';
          IconComponent = ShoppingBag;
        }

        return (
          <div
            key={toast._toastId}
            className="glass-card animate-toast-in"
            style={{
              padding: '18px',
              border: `1px solid ${themeBorder}`,
              boxShadow: '0 15px 35px rgba(0,0,0,0.7)',
              position: 'relative',
              backgroundColor: 'rgba(18, 16, 26, 0.95)'
            }}
          >
            <button
              onClick={() => dismissToast(toast._toastId)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  backgroundColor: themeBg,
                  color: themeColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${themeBorder}`
                }}
              >
                <IconComponent size={20} />
              </div>
              <div style={{ paddingRight: '14px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: '4px' }}>
                  {toast.title}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {toast.message}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
