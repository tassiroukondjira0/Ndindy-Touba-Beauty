const STORAGE_KEYS = {
  ADMIN_NOTIFS: 'touba_ndindy_admin_notifications',
  CLIENT_NOTIFS: 'touba_ndindy_client_notifications',
  MY_REFS: 'touba_ndindy_my_refs',
  SEEN_CLIENT_NOTIFS: 'touba_ndindy_seen_client_notifs'
};

const initialAdminNotifs = [
  {
    id: 'notif-101',
    type: 'reservation',
    title: 'Nouvelle Réservation de Tresses',
    message: 'Awa Diallo a réservé un "Flat Twists Bun" pour le 2026-09-16 à 10:00 AM.',
    referenceId: 'TN-940218',
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'notif-102',
    type: 'order',
    title: 'Nouvelle Commande de Produits',
    message: 'Fatou Sow a passé une commande de 95.00$ (Mousuf + Oud Mood).',
    referenceId: 'CMD-10492',
    read: false,
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
];

const initialClientNotifs = [
  {
    id: 'cnotif-1',
    referenceId: 'TN-940218',
    recipientPhone: '443-555-0192',
    recipientEmail: 'awa.diallo@gmail.com',
    type: 'reservation_validated',
    title: 'Réservation Confirmée !',
    message: 'Votre rendez-vous pour "Flat Twists Bun" le 2026-09-16 à 10:00 AM a été validé avec succès par le salon TOUBA NDINDY !',
    createdAt: new Date().toISOString()
  }
];

export const initNotifications = () => {
  if (!localStorage.getItem(STORAGE_KEYS.ADMIN_NOTIFS)) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_NOTIFS, JSON.stringify(initialAdminNotifs));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CLIENT_NOTIFS)) {
    localStorage.setItem(STORAGE_KEYS.CLIENT_NOTIFS, JSON.stringify(initialClientNotifs));
  }
};

// --- ADMIN NOTIFICATIONS ---
export const getAdminNotifications = () => {
  initNotifications();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_NOTIFS) || '[]');
};

export const getUnreadAdminNotifCount = () => {
  const notifs = getAdminNotifications();
  return notifs.filter(n => !n.read).length;
};

export const addAdminNotification = ({ type, title, message, referenceId }) => {
  initNotifications();
  const notifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_NOTIFS) || '[]');
  const newNotif = {
    id: 'notif-' + Date.now(),
    type,
    title,
    message,
    referenceId,
    read: false,
    createdAt: new Date().toISOString()
  };
  notifs.unshift(newNotif);
  localStorage.setItem(STORAGE_KEYS.ADMIN_NOTIFS, JSON.stringify(notifs));
  window.dispatchEvent(new Event('storage'));
  return newNotif;
};

export const markAdminNotifsAsRead = () => {
  initNotifications();
  const notifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_NOTIFS) || '[]');
  const updated = notifs.map(n => ({ ...n, read: true }));
  localStorage.setItem(STORAGE_KEYS.ADMIN_NOTIFS, JSON.stringify(updated));
  window.dispatchEvent(new Event('storage'));
  return updated;
};

// --- CLIENT NOTIFICATIONS ---
export const getClientNotifications = (searchQuery) => {
  initNotifications();
  const notifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_NOTIFS) || '[]');
  if (!searchQuery) return notifs;
  
  const query = searchQuery.trim().toLowerCase();
  return notifs.filter(n => 
    (n.referenceId && n.referenceId.toLowerCase().includes(query)) ||
    (n.recipientPhone && n.recipientPhone.toLowerCase().includes(query)) ||
    (n.recipientEmail && n.recipientEmail.toLowerCase().includes(query))
  );
};

export const addClientNotification = ({ referenceId, recipientPhone, recipientEmail, type, title, message }) => {
  initNotifications();
  const notifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_NOTIFS) || '[]');
  const newNotif = {
    id: 'cnotif-' + Date.now(),
    referenceId,
    recipientPhone,
    recipientEmail,
    type,
    title,
    message,
    createdAt: new Date().toISOString()
  };
  notifs.unshift(newNotif);
  localStorage.setItem(STORAGE_KEYS.CLIENT_NOTIFS, JSON.stringify(notifs));
  window.dispatchEvent(new Event('storage'));
  return newNotif;
};

// Exact-match lookup used by the client-side watcher (avoids "TN-1" matching "TN-10")
export const getClientNotificationsForReferences = (referenceIds = []) => {
  initNotifications();
  if (!referenceIds || referenceIds.length === 0) return [];
  const notifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_NOTIFS) || '[]');
  return notifs.filter(n => referenceIds.includes(n.referenceId));
};

// --- BROWSER PUSH-STYLE NOTIFICATIONS (Web Notification API) ---
export const isBrowserNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = () => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
};

export const requestNotificationPermission = async () => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    return 'denied';
  }
};

export const showBrowserNotification = (title, options = {}) => {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') return null;
  try {
    return new Notification(title, {
      icon: '/assets/touba-ndindy-card.jpg',
      badge: '/assets/touba-ndindy-card.jpg',
      ...options
    });
  } catch (err) {
    return null;
  }
};

// Small non-intrusive audio cue (no external asset needed)
export const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1180, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    // Silently ignore (autoplay restrictions, unsupported browsers, etc.)
  }
};

// --- "MY REFERENCES" TRACKING (lets a client be auto-notified on this device) ---
// After booking a reservation or placing an order, we remember the reference here
// so the app can watch for a status update and alert the client automatically,
// without requiring them to come back and search manually.
export const trackMyReference = ({ referenceId, type, label }) => {
  if (!referenceId) return;
  const refs = JSON.parse(localStorage.getItem(STORAGE_KEYS.MY_REFS) || '[]');
  if (refs.some(r => r.referenceId === referenceId)) return;
  refs.unshift({ referenceId, type, label, trackedAt: new Date().toISOString() });
  // Keep the list small
  localStorage.setItem(STORAGE_KEYS.MY_REFS, JSON.stringify(refs.slice(0, 20)));
};

export const getMyTrackedReferences = () => {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.MY_REFS) || '[]');
};

const getSeenClientNotifIds = () => {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.SEEN_CLIENT_NOTIFS) || '[]');
};

const markClientNotifsSeen = (ids) => {
  const seen = getSeenClientNotifIds();
  const merged = Array.from(new Set([...seen, ...ids]));
  localStorage.setItem(STORAGE_KEYS.SEEN_CLIENT_NOTIFS, JSON.stringify(merged.slice(-100)));
};

// Returns any notifications for references tracked on this device that the
// client hasn't been alerted about yet, and marks them as seen.
export const consumeNewNotificationsForMyReferences = () => {
  const myRefs = getMyTrackedReferences();
  if (myRefs.length === 0) return [];
  const referenceIds = myRefs.map(r => r.referenceId);
  const matches = getClientNotificationsForReferences(referenceIds);
  const seenIds = getSeenClientNotifIds();
  const unseen = matches.filter(n => !seenIds.includes(n.id));
  if (unseen.length > 0) {
    markClientNotifsSeen(unseen.map(n => n.id));
  }
  return unseen;
};
