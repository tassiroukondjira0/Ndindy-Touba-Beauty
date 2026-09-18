import { cloudAddNotification } from './firebase';

const STORAGE_KEYS = {
  ADMIN_NOTIFS: 'touba_ndindy_admin_notifications',
  CLIENT_NOTIFS: 'touba_ndindy_client_notifications',
  MY_REFS: 'touba_ndindy_my_refs',
  SEEN_CLIENT_NOTIFS: 'touba_ndindy_seen_client_notifs',
  SENT_REMINDERS: 'touba_ndindy_sent_reminders'
};

// Returns the active UI language (kept in sync by LanguageContext).
export const getAppLanguage = () => {
  try {
    return localStorage.getItem('touba_ndindy_lang') || 'fr';
  } catch (e) {
    return 'fr';
  }
};

// Small bilingual text helper for notifications generated outside React.
export const biText = (fr, en) => (getAppLanguage() === 'en' ? en : fr);

// Returns the notification text (title or message) in the active UI language
// when a bilingual version was stored, otherwise falls back to the plain text.
export const getNotifText = (notif, field, lang) => {
  if (!notif) return '';
  const i18n = notif[`${field}_i18n`];
  if (i18n && i18n[lang]) return i18n[lang];
  return notif[field] || '';
};

const LEGACY_DEMO_PURGED_FLAG = 'touba_ndindy_legacy_demo_purged';

// IDs of the demo notifications that were seeded in older versions of the app.
// Removed permanently so every notification comes from a real site interaction.
const LEGACY_DEMO_NOTIF_IDS = ['notif-101', 'notif-102', 'cnotif-1'];

export const initNotifications = () => {
  if (!localStorage.getItem(STORAGE_KEYS.ADMIN_NOTIFS)) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_NOTIFS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CLIENT_NOTIFS)) {
    localStorage.setItem(STORAGE_KEYS.CLIENT_NOTIFS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SENT_REMINDERS)) {
    localStorage.setItem(STORAGE_KEYS.SENT_REMINDERS, JSON.stringify({}));
  }

  // One-time cleanup: strip legacy demo notifications from browsers that still
  // have them in localStorage (so the site starts clean everywhere).
  try {
    if (localStorage.getItem(LEGACY_DEMO_PURGED_FLAG)) return;

    const adminNotifs = (JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_NOTIFS) || '[]'))
      .filter(n => !LEGACY_DEMO_NOTIF_IDS.includes(n.id));
    localStorage.setItem(STORAGE_KEYS.ADMIN_NOTIFS, JSON.stringify(adminNotifs));

    const clientNotifs = (JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_NOTIFS) || '[]'))
      .filter(n => !LEGACY_DEMO_NOTIF_IDS.includes(n.id));
    localStorage.setItem(STORAGE_KEYS.CLIENT_NOTIFS, JSON.stringify(clientNotifs));

    localStorage.setItem(LEGACY_DEMO_PURGED_FLAG, 'true');
  } catch {
    // Best-effort cleanup; never break startup because of it.
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

export const addAdminNotification = ({ type, title, message, titleI18n, messageI18n, referenceId }) => {
  initNotifications();
  const notifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_NOTIFS) || '[]');
  const lang = getAppLanguage();
  const newNotif = {
    id: 'notif-' + Date.now(),
    type,
    title: (titleI18n && titleI18n[lang]) || title || '',
    message: (messageI18n && messageI18n[lang]) || message || '',
    ...(titleI18n ? { title_i18n: titleI18n } : {}),
    ...(messageI18n ? { message_i18n: messageI18n } : {}),
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

export const addClientNotification = ({ id, referenceId, recipientPhone, recipientEmail, type, title, message, titleI18n, messageI18n }) => {
  initNotifications();
  const notifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_NOTIFS) || '[]');
  if (id && notifs.some(n => n.id === id)) return notifs.find(n => n.id === id);
  const lang = getAppLanguage();
  const newNotif = {
    id: id || 'cnotif-' + Date.now(),
    referenceId,
    recipientPhone,
    recipientEmail,
    type,
    title: (titleI18n && titleI18n[lang]) || title || '',
    message: (messageI18n && messageI18n[lang]) || message || '',
    ...(titleI18n ? { title_i18n: titleI18n } : {}),
    ...(messageI18n ? { message_i18n: messageI18n } : {}),
    createdAt: new Date().toISOString()
  };
  notifs.unshift(newNotif);
  localStorage.setItem(STORAGE_KEYS.CLIENT_NOTIFS, JSON.stringify(notifs));
  window.dispatchEvent(new Event('storage'));

  // Persist to Firestore so the reminder/update reaches every device that
  // tracks this reference — no owner action required.
  if (typeof window !== 'undefined') {
    cloudAddNotification(newNotif);
  }

  return newNotif;
};

// Merges cloud-synced notifications into the local store (dedup by id) so
// reminders generated on another device surface here automatically.
export const mergeCloudNotifications = (cloudNotifs = []) => {
  if (!Array.isArray(cloudNotifs) || cloudNotifs.length === 0) return 0;
  initNotifications();
  const local = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_NOTIFS) || '[]');
  const byId = new Map(local.map(n => [n.id, n]));
  let added = 0;
  cloudNotifs.forEach(n => {
    if (!n || !n.id || byId.has(n.id)) return;
    byId.set(n.id, n);
    added += 1;
  });
  if (added > 0) {
    const merged = Array.from(byId.values())
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    localStorage.setItem(STORAGE_KEYS.CLIENT_NOTIFS, JSON.stringify(merged));
    window.dispatchEvent(new Event('storage'));
  }
  return added;
};

// Exact-match lookup used by the client-side watcher (avoids "TN-1" matching "TN-10")
export const getClientNotificationsForReferences = (referenceIds = []) => {
  initNotifications();
  if (!referenceIds || referenceIds.length === 0) return [];
  const notifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_NOTIFS) || '[]');
  return notifs.filter(n => referenceIds.includes(n.referenceId));
};

// All stored client notifications (used to backfill Firestore once).
export const getAllClientNotifications = () => {
  initNotifications();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_NOTIFS) || '[]');
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
  // Check for any automated 24h/48h reminders before consuming
  checkAndSendAutomatedReminders();

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

// --- AUTOMATED & MANUAL REMINDERS (24H RESERVATION & 48H ORDER PICKUP) ---

export const parseReservationDateTime = (dateStr, timeStr) => {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!year || !month || !day) return null;

    let hours = 10;
    let minutes = 0;

    if (timeStr) {
      const cleanTime = timeStr.trim().toUpperCase();
      const match = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const meridiem = match[3];

        if (meridiem === 'PM' && h < 12) h += 12;
        if (meridiem === 'AM' && h === 12) h = 0;

        hours = h;
        minutes = m;
      }
    }

    const dt = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  } catch (e) {
    return null;
  }
};

export const isReservationWithin24h = (res) => {
  if (!res || res.status === 'annulée') return false;
  const appointmentDate = parseReservationDateTime(res.date, res.time);
  if (!appointmentDate) return false;

  const now = Date.now();
  const appointmentTime = appointmentDate.getTime();
  const diffHours = (appointmentTime - now) / (1000 * 60 * 60);

  // Within 24 hours before appointment and not expired > 4h ago
  return diffHours <= 24 && diffHours >= -4;
};

export const isOrderUncollectedOver48h = (ord) => {
  if (!ord) return false;
  // If order was collected, terminated or declined, it is not pending pickup
  if (['récupérée', 'terminée', 'refusée', 'annulée'].includes(ord.status)) return false;

  const createdDate = ord.createdAt ? new Date(ord.createdAt) : null;
  if (!createdDate || isNaN(createdDate.getTime())) return false;

  const elapsedHours = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
  return elapsedHours >= 48;
};

export const getSentReminders = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SENT_REMINDERS) || '{}');
  } catch (e) {
    return {};
  }
};

export const markReminderSent = (key) => {
  const sent = getSentReminders();
  sent[key] = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.SENT_REMINDERS, JSON.stringify(sent));
};

export const hasReminderBeenSent = (key) => {
  const sent = getSentReminders();
  return Boolean(sent[key]);
};

export const checkAndSendAutomatedReminders = () => {
  if (typeof window === 'undefined') return { sentReservations: [], sentOrders: [] };

  const reservations = JSON.parse(localStorage.getItem('touba_ndindy_reservations') || '[]');
  const orders = JSON.parse(localStorage.getItem('touba_ndindy_orders') || '[]');

  const sentReservations = [];
  const sentOrders = [];

  // 1. Check Reservations 24h reminder
  reservations.forEach(res => {
    if (isReservationWithin24h(res)) {
      const key = `res_24h_${res.id}`;
      if (!hasReminderBeenSent(key)) {
        markReminderSent(key);
        // Client Notification
        addClientNotification({
          id: 'rem-24h-' + res.id,
          referenceId: res.id,
          recipientPhone: res.clientPhone,
          recipientEmail: res.clientEmail || '',
          type: 'reservation_reminder_24h',
          title: biText('⏰ Rappel : Rendez-vous dans 24h !', '⏰ Reminder: Appointment within 24h!'),
          titleI18n: { fr: '⏰ Rappel : Rendez-vous dans 24h !', en: '⏰ Reminder: Appointment within 24h!' },
          message: biText(
            `Bonjour ${res.clientName}, nous vous rappelons votre rendez-vous pour "${res.braidTitle}" prévu le ${res.date} à ${res.time} au salon TOUBA NDINDY (306 North Eutaw Street, Baltimore MD). À très bientôt !`,
            `Hello ${res.clientName}, this is a reminder of your appointment for "${res.braidTitle}" on ${res.date} at ${res.time} at TOUBA NDINDY salon (306 North Eutaw Street, Baltimore MD). See you soon!`
          ),
          messageI18n: {
            fr: `Bonjour ${res.clientName}, nous vous rappelons votre rendez-vous pour "${res.braidTitle}" prévu le ${res.date} à ${res.time} au salon TOUBA NDINDY (306 North Eutaw Street, Baltimore MD). À très bientôt !`,
            en: `Hello ${res.clientName}, this is a reminder of your appointment for "${res.braidTitle}" on ${res.date} at ${res.time} at TOUBA NDINDY salon (306 North Eutaw Street, Baltimore MD). See you soon!`
          }
        });
        // Admin Notification
        addAdminNotification({
          type: 'reservation_reminder_24h',
          title: biText('⏰ Rappel 24h Envoyé au Client', '⏰ 24h Reminder Sent to Client'),
          titleI18n: { fr: '⏰ Rappel 24h Envoyé au Client', en: '⏰ 24h Reminder Sent to Client' },
          message: biText(
            `Rappel automatique 24h envoyé à ${res.clientName} (${res.clientPhone}) pour "${res.braidTitle}" le ${res.date} à ${res.time}.`,
            `Automated 24h reminder sent to ${res.clientName} (${res.clientPhone}) for "${res.braidTitle}" on ${res.date} at ${res.time}.`
          ),
          messageI18n: {
            fr: `Rappel automatique 24h envoyé à ${res.clientName} (${res.clientPhone}) pour "${res.braidTitle}" le ${res.date} à ${res.time}.`,
            en: `Automated 24h reminder sent to ${res.clientName} (${res.clientPhone}) for "${res.braidTitle}" on ${res.date} at ${res.time}.`
          },
          referenceId: res.id
        });
        sentReservations.push(res.id);
      }
    }
  });

  // 2. Check Orders 48h uncollected pickup reminder
  orders.forEach(ord => {
    if (isOrderUncollectedOver48h(ord)) {
      const key = `order_48h_${ord.id}`;
      if (!hasReminderBeenSent(key)) {
        markReminderSent(key);
        // Client Notification
        addClientNotification({
          id: 'rem-48h-' + ord.id,
          referenceId: ord.id,
          recipientPhone: ord.clientPhone,
          recipientEmail: ord.clientEmail || '',
          type: 'order_pickup_reminder_48h',
          title: biText('🛍️ Rappel : Votre Commande vous attend (+48h)', '🛍️ Reminder: Your order is waiting (+48h)'),
          titleI18n: { fr: '🛍️ Rappel : Votre Commande vous attend (+48h)', en: '🛍️ Reminder: Your order is waiting (+48h)' },
          message: biText(
            `Bonjour ${ord.clientName}, votre commande (${ord.id}) d'un montant de ${Number(ord.total || 0).toFixed(2)}$ est prête et vous attend au salon TOUBA NDINDY depuis plus de 48h. Merci de passer la récupérer au 306 North Eutaw Street, Baltimore MD (Tél: 443-858-1400).`,
            `Hello ${ord.clientName}, your order (${ord.id}) of $${Number(ord.total || 0).toFixed(2)} has been ready and waiting at TOUBA NDINDY salon for over 48h. Please come pick it up at 306 North Eutaw Street, Baltimore MD (Tel: 443-858-1400).`
          ),
          messageI18n: {
            fr: `Bonjour ${ord.clientName}, votre commande (${ord.id}) d'un montant de ${Number(ord.total || 0).toFixed(2)}$ est prête et vous attend au salon TOUBA NDINDY depuis plus de 48h. Merci de passer la récupérer au 306 North Eutaw Street, Baltimore MD (Tél: 443-858-1400).`,
            en: `Hello ${ord.clientName}, your order (${ord.id}) of $${Number(ord.total || 0).toFixed(2)} has been ready and waiting at TOUBA NDINDY salon for over 48h. Please come pick it up at 306 North Eutaw Street, Baltimore MD (Tel: 443-858-1400).`
          }
        });
        // Admin Notification
        addAdminNotification({
          type: 'order_pickup_reminder_48h',
          title: biText('🛍️ Rappel Récupération 48h Envoyé', '🛍️ 48h Pickup Reminder Sent'),
          titleI18n: { fr: '🛍️ Rappel Récupération 48h Envoyé', en: '🛍️ 48h Pickup Reminder Sent' },
          message: biText(
            `Rappel de récupération (+48h) envoyé à ${ord.clientName} (${ord.clientPhone}) pour la commande ${ord.id}.`,
            `Pickup reminder (+48h) sent to ${ord.clientName} (${ord.clientPhone}) for order ${ord.id}.`
          ),
          messageI18n: {
            fr: `Rappel de récupération (+48h) envoyé à ${ord.clientName} (${ord.clientPhone}) pour la commande ${ord.id}.`,
            en: `Pickup reminder (+48h) sent to ${ord.clientName} (${ord.clientPhone}) for order ${ord.id}.`
          },
          referenceId: ord.id
        });
        sentOrders.push(ord.id);
      }
    }
  });

  return { sentReservations, sentOrders };
};

export const sendManualReservationReminder = (resOrId) => {
  const reservations = JSON.parse(localStorage.getItem('touba_ndindy_reservations') || '[]');
  const res = typeof resOrId === 'object' ? resOrId : reservations.find(r => r.id === resOrId);
  if (!res) return null;

  const key = `res_24h_${res.id}`;
  markReminderSent(key);

  const notif = addClientNotification({
    id: 'rem-24h-' + res.id,
    referenceId: res.id,
    recipientPhone: res.clientPhone,
    recipientEmail: res.clientEmail || '',
    type: 'reservation_reminder_24h',
    title: biText('⏰ Rappel : Rendez-vous dans 24h !', '⏰ Reminder: Appointment within 24h!'),
    titleI18n: { fr: '⏰ Rappel : Rendez-vous dans 24h !', en: '⏰ Reminder: Appointment within 24h!' },
    message: biText(
      `Bonjour ${res.clientName}, rappel de votre rendez-vous pour "${res.braidTitle}" prévu le ${res.date} à ${res.time} au salon TOUBA NDINDY (306 North Eutaw Street, Baltimore MD). Contact : 443-858-1400.`,
      `Hello ${res.clientName}, this is a reminder of your appointment for "${res.braidTitle}" on ${res.date} at ${res.time} at TOUBA NDINDY salon (306 North Eutaw Street, Baltimore MD). Contact: 443-858-1400.`
    ),
    messageI18n: {
      fr: `Bonjour ${res.clientName}, rappel de votre rendez-vous pour "${res.braidTitle}" prévu le ${res.date} à ${res.time} au salon TOUBA NDINDY (306 North Eutaw Street, Baltimore MD). Contact : 443-858-1400.`,
      en: `Hello ${res.clientName}, this is a reminder of your appointment for "${res.braidTitle}" on ${res.date} at ${res.time} at TOUBA NDINDY salon (306 North Eutaw Street, Baltimore MD). Contact: 443-858-1400.`
    }
  });

  addAdminNotification({
    type: 'reservation_reminder_24h',
    title: biText('⏰ Rappel 24h Manuel Envoyé', '⏰ Manual 24h Reminder Sent'),
    titleI18n: { fr: '⏰ Rappel 24h Manuel Envoyé', en: '⏰ Manual 24h Reminder Sent' },
    message: biText(
      `Rappel 24h déclenché manuellement pour ${res.clientName} (${res.clientPhone}) - ${res.braidTitle} le ${res.date} à ${res.time}.`,
      `Manual 24h reminder triggered for ${res.clientName} (${res.clientPhone}) - ${res.braidTitle} on ${res.date} at ${res.time}.`
    ),
    messageI18n: {
      fr: `Rappel 24h déclenché manuellement pour ${res.clientName} (${res.clientPhone}) - ${res.braidTitle} le ${res.date} à ${res.time}.`,
      en: `Manual 24h reminder triggered for ${res.clientName} (${res.clientPhone}) - ${res.braidTitle} on ${res.date} at ${res.time}.`
    },
    referenceId: res.id
  });

  return notif;
};

export const sendManualOrderPickupReminder = (orderOrId) => {
  const orders = JSON.parse(localStorage.getItem('touba_ndindy_orders') || '[]');
  const ord = typeof orderOrId === 'object' ? orderOrId : orders.find(o => o.id === orderOrId);
  if (!ord) return null;

  const key = `order_48h_${ord.id}`;
  markReminderSent(key);

  const notif = addClientNotification({
    id: 'rem-48h-' + ord.id,
    referenceId: ord.id,
    recipientPhone: ord.clientPhone,
    recipientEmail: ord.clientEmail || '',
    type: 'order_pickup_reminder_48h',
    title: biText('🛍️ Rappel : Récupération de votre Commande (+48h)', '🛍️ Reminder: Pick up your order (+48h)'),
    titleI18n: { fr: '🛍️ Rappel : Récupération de votre Commande (+48h)', en: '🛍️ Reminder: Pick up your order (+48h)' },
    message: biText(
      `Bonjour ${ord.clientName}, votre commande (${ord.id}) d'un montant de ${Number(ord.total || 0).toFixed(2)}$ est prête au salon TOUBA NDINDY depuis plus de 48h. N'hésitez pas à venir la récupérer au 306 North Eutaw Street, Baltimore MD (Tél: 443-858-1400).`,
      `Hello ${ord.clientName}, your order (${ord.id}) of $${Number(ord.total || 0).toFixed(2)} has been ready at TOUBA NDINDY salon for over 48h. Feel free to come pick it up at 306 North Eutaw Street, Baltimore MD (Tel: 443-858-1400).`
    ),
    messageI18n: {
      fr: `Bonjour ${ord.clientName}, votre commande (${ord.id}) d'un montant de ${Number(ord.total || 0).toFixed(2)}$ est prête au salon TOUBA NDINDY depuis plus de 48h. N'hésitez pas à venir la récupérer au 306 North Eutaw Street, Baltimore MD (Tél: 443-858-1400).`,
      en: `Hello ${ord.clientName}, your order (${ord.id}) of $${Number(ord.total || 0).toFixed(2)} has been ready at TOUBA NDINDY salon for over 48h. Feel free to come pick it up at 306 North Eutaw Street, Baltimore MD (Tel: 443-858-1400).`
    }
  });

  addAdminNotification({
    type: 'order_pickup_reminder_48h',
    title: biText('🛍️ Rappel Récupération 48h Manuel Envoyé', '🛍️ Manual 48h Pickup Reminder Sent'),
    titleI18n: { fr: '🛍️ Rappel Récupération 48h Manuel Envoyé', en: '🛍️ Manual 48h Pickup Reminder Sent' },
    message: biText(
      `Rappel de récupération (+48h) déclenché manuellement pour ${ord.clientName} (${ord.clientPhone}) - Commande ${ord.id}.`,
      `Manual pickup reminder (+48h) triggered for ${ord.clientName} (${ord.clientPhone}) - Order ${ord.id}.`
    ),
    messageI18n: {
      fr: `Rappel de récupération (+48h) déclenché manuellement pour ${ord.clientName} (${ord.clientPhone}) - Commande ${ord.id}.`,
      en: `Manual pickup reminder (+48h) triggered for ${ord.clientName} (${ord.clientPhone}) - Order ${ord.id}.`
    },
    referenceId: ord.id
  });

  return notif;
};
