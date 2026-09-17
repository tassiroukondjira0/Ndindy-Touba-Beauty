import React, { useState, useEffect, useRef } from 'react';
import {
  consumeNewNotificationsForMyReferences,
  requestNotificationPermission,
  showBrowserNotification,
  playNotificationChime,
  getMyTrackedReferences
} from '../services/notifications';
import { CheckCircle2, XCircle, Bell, X } from 'lucide-react';

// Mounted once at the app root. Silently watches (via storage events + a short
// poll) for status updates on any reservation/order the visitor placed on this
// device, and alerts them automatically — both with a real browser push
// notification (if permission was granted) and an in-app toast, so they don't
// have to come back and search for their reference manually.
export const ClientNotificationWatcher = () => {
  const [toasts, setToasts] = useState([]);
  const hasAskedPermissionRef = useRef(false);

  const checkForUpdates = () => {
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

    // Same-tab safety net: some updates (e.g. another browser tab on a
    // different device syncing via localStorage) may not always fire a
    // 'storage' event immediately, so we also poll gently.
    const interval = setInterval(checkForUpdates, 8000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
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
        maxWidth: '380px',
        width: 'calc(100% - 48px)'
      }}
    >
      {toasts.map(toast => {
        const isRefused = toast.type === 'order_refused';
        return (
          <div
            key={toast._toastId}
            className="glass-card animate-toast-in"
            style={{
              padding: '18px',
              border: `1px solid ${isRefused ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`,
              boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
              position: 'relative'
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
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  backgroundColor: isRefused ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: isRefused ? '#ef4444' : '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isRefused ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
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
