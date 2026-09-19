import { braidsData } from '../data/braidsData';
import { productsData } from '../data/productsData';
import { perfumesData } from '../data/perfumesData';
import { addAdminNotification, addClientNotification, getMyTrackedReferences, getAllClientNotifications, biText } from './notifications';
import { 
  isFirebaseConfigured, 
  cloudAddReservation, 
  cloudUpdateReservationStatus, 
  cloudAddOrder, 
  cloudUpdateOrderStatus,
  cloudSearchReservationsAndOrders,
  cloudSaveProduct,
  cloudDeleteProduct,
  cloudUpdateStock,
  cloudDeductStockForOrder,
  cloudAddNotification,
  cloudDeleteReservation,
  cloudDeleteOrder,
  cloudDeleteNotification,
  cloudGetAll,
  cloudSetItems,
  cloudSaveBraid,
  cloudDeleteBraid,
  cloudDeleteCollectionDoc,
  cloudSaveReview
} from './firebase';

const STORAGE_KEYS = {
  PRODUCTS: 'touba_ndindy_products',
  BRAIDS: 'touba_ndindy_braids',
  REVIEWS: 'touba_ndindy_reviews',
  RESERVATIONS: 'touba_ndindy_reservations',
  ORDERS: 'touba_ndindy_orders'
};

const initialProducts = productsData.map(p => ({
  ...p,
  stock: p.stock !== undefined ? p.stock : Math.floor(Math.random() * 10) + 8
}));

const initialPerfumes = perfumesData.map(p => ({
  ...p,
  stock: p.stock !== undefined ? p.stock : Math.floor(Math.random() * 8) + 5
}));

// Single unified catalog: care products AND perfumes share one storage key and
// one Firestore collection (`products`). Perfumes are tagged with
// `type: 'perfume'` so the UI can tell them apart from care products.
const initialCatalog = [
  ...initialProducts,
  ...initialPerfumes.map(p => ({ ...p, type: 'perfume' }))
];

// One-time migration flags/keys for the old separate `perfumes` storage.
const LEGACY_PERFUME_KEY = 'touba_ndindy_perfumes';
const LOCAL_PERFUMES_MIGRATED_FLAG = 'touba_ndindy_local_perfumes_migrated';
const CLOUD_PERFUMES_MIGRATED_FLAG = 'touba_ndindy_cloud_perfumes_migrated';

// IDs of demo reservations / orders / notifications seeded in older versions of
// the app. They are purged from localStorage AND from Firestore so the database
// only contains data created by real site interactions.
const LEGACY_DEMO_RESERVATION_IDS = ['TN-940218', 'TN-582910'];
const LEGACY_DEMO_ORDER_IDS = ['CMD-10492'];
const LEGACY_DEMO_NOTIF_IDS = ['notif-101', 'notif-102', 'cnotif-1'];
const CLOUD_DEMO_PURGE_FLAG = 'touba_ndindy_cloud_demo_purged';

export const initDB = () => {
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialCatalog));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BRAIDS)) {
    localStorage.setItem(STORAGE_KEYS.BRAIDS, JSON.stringify(braidsData));
  }
  if (!localStorage.getItem(STORAGE_KEYS.REVIEWS)) {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.RESERVATIONS)) {
    localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
  }

  // One-time cleanup: fold any legacy `perfumes` list into the unified catalog.
  migrateLegacyPerfumeStorage();

  // One-time cleanup: strip legacy demo reservations/orders from browsers
  // that still hold them, then purge the same demo docs from Firestore.
  cleanupLocalDemoData();
  purgeCloudDemoData();
  cloudBackfillExistingData();

  // Cloud-first: when Firebase is available, pull its data into the local cache
  // so the whole site renders from Firestore; localStorage remains the fallback.
  hydrateFromCloud();
};

const CLOUD_CATALOG_SEED_FLAG = 'touba_ndindy_cloud_catalog_seeded';

// Folds the legacy separate perfumes list (old installs) into the unified
// `products` catalog, tagging each entry as `type: 'perfume'`. Runs once.
const migrateLegacyPerfumeStorage = () => {
  try {
    if (localStorage.getItem(LOCAL_PERFUMES_MIGRATED_FLAG)) return;
    const legacy = localStorage.getItem(LEGACY_PERFUME_KEY);
    if (legacy) {
      const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
      const perfumes = JSON.parse(legacy || '[]');
      const map = new Map(products.map(p => [p.id, p]));
      perfumes.forEach(p => map.set(p.id, { ...p, type: 'perfume' }));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(Array.from(map.values())));
      localStorage.removeItem(LEGACY_PERFUME_KEY);
    }
    localStorage.setItem(LOCAL_PERFUMES_MIGRATED_FLAG, 'done');
  } catch {
    // Best-effort migration; never break startup because of it.
  }
};

// Moves the FIRESTORE `perfumes` collection into the single `products`
// collection (`type: 'perfume'`), then deletes the perfume documents so the
// `perfumes` collection is emptied. Idempotent and runs at most once per
// browser. Kept inside hydration so the freshly merged docs are picked up on
// the very same load.
const migrateCloudPerfumesToProducts = async () => {
  try {
    if (localStorage.getItem(CLOUD_PERFUMES_MIGRATED_FLAG) === 'done') return;
    if (!isFirebaseConfigured()) return;

    const cloudPerfumes = await cloudGetAll('perfumes');
    if (cloudPerfumes.length > 0) {
      await Promise.all(cloudPerfumes.map(p => cloudSaveProduct({ ...p, type: 'perfume' })));
      await Promise.all(cloudPerfumes.map(p => cloudDeleteCollectionDoc('perfumes', p.id)));
    }
    localStorage.setItem(CLOUD_PERFUMES_MIGRATED_FLAG, 'done');
  } catch (e) {
    console.warn("Cloud perfumes migration warning (retrying next load):", e);
  }
};

let hydrateStarted = false;

const mergeLocalWithCloud = (localList, cloudList) => {
  const map = new Map();
  localList.forEach(x => map.set(x.id, x));
  cloudList.forEach(x => map.set(x.id, x));
  return Array.from(map.values());
};

// Loads data directly from Firestore when it is configured/reachable and
// mirrors it into the localStorage cache. If Firebase is unavailable, every
// getter keeps falling back to the localStorage mirror (seeded or previously
// synced). Also seeds an empty cloud catalog once from the local mirror so
// Firebase becomes the single source of truth across devices. Run at most once
// per page load: initDB() is invoked from every db getter, and idempotency of
// the merge + storage event keeps repeated HTTP reads unnecessary.
const hydrateFromCloud = async () => {
  if (hydrateStarted) return;
  hydrateStarted = true;
  try {
    if (!isFirebaseConfigured()) return;

    // Merge any legacy Firestore `perfumes` collection into `products` first so
    // the catalog below sees the complete unified list.
    await migrateCloudPerfumesToProducts();

    const changed = [];
    const needsCatalogSeed = localStorage.getItem(CLOUD_CATALOG_SEED_FLAG) !== 'done';
    let seededAny = false;

    // Shared catalog: cloud is authoritative when it has data.
    const catalog = [
      { col: 'products', key: STORAGE_KEYS.PRODUCTS },
      { col: 'braids', key: STORAGE_KEYS.BRAIDS }
    ];

    for (const { col, key } of catalog) {
      const cloudItems = await cloudGetAll(col);
      const localItems = JSON.parse(localStorage.getItem(key) || '[]');
      if (cloudItems.length > 0) {
        localStorage.setItem(key, JSON.stringify(cloudItems));
        changed.push(key);
      } else if (needsCatalogSeed && localItems.length > 0) {
        // Cloud is empty on first run with data: seed it once from local data.
        await cloudSetItems(col, localItems);
        seededAny = true;
      }
    }
    if (seededAny) {
      localStorage.setItem(CLOUD_CATALOG_SEED_FLAG, 'done');
    }

    // Operational records (reservations/orders) and client reviews: cloud wins
    // per id, but entries that only exist locally are preserved so nothing is
    // ever lost.
    const ops = [
      { col: 'reservations', key: STORAGE_KEYS.RESERVATIONS },
      { col: 'orders', key: STORAGE_KEYS.ORDERS },
      { col: 'reviews', key: STORAGE_KEYS.REVIEWS }
    ];
    for (const { col, key } of ops) {
      const cloudItems = await cloudGetAll(col);
      const localItems = JSON.parse(localStorage.getItem(key) || '[]');
      const merged = mergeLocalWithCloud(localItems, cloudItems);
      if (merged.length !== localItems.length) {
        localStorage.setItem(key, JSON.stringify(merged));
        changed.push(key);
      }
    }

    if (changed.length > 0) {
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.warn("Cloud hydration warning (keeping localStorage):", e);
  }
};

// Remove legacy demo interaction records from this browser's localStorage.
const cleanupLocalDemoData = () => {
  try {
    const reservations = (JSON.parse(localStorage.getItem(STORAGE_KEYS.RESERVATIONS) || '[]'))
      .filter(r => !LEGACY_DEMO_RESERVATION_IDS.includes(r.id));
    localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations));

    const orders = (JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]'))
      .filter(o => !LEGACY_DEMO_ORDER_IDS.includes(o.id));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  } catch {
    // Best-effort cleanup; never break startup because of it.
  }
};

// One-time purge of the legacy demo documents from Firestore so the cloud
// database also starts clean (idempotent: deleting a missing doc is a no-op).
const purgeCloudDemoData = () => {
  try {
    if (!isFirebaseConfigured()) return;
    if (localStorage.getItem(CLOUD_DEMO_PURGE_FLAG)) return;

    const run = async () => {
      await Promise.all([
        ...LEGACY_DEMO_RESERVATION_IDS.map(id => cloudDeleteReservation(id)),
        ...LEGACY_DEMO_ORDER_IDS.map(id => cloudDeleteOrder(id)),
        ...LEGACY_DEMO_NOTIF_IDS.map(id => cloudDeleteNotification(id))
      ]);
      localStorage.setItem(CLOUD_DEMO_PURGE_FLAG, 'true');
    };

    run().catch(() => {});
  } catch {
    // Best-effort cleanup; never break startup because of it.
  }
};

const CLOUD_BACKFILL_FLAG = 'touba_ndindy_cloud_backfill_done';

// One-time migration: pushes data already stored locally (created before the
// Firestore security rules were released) up to the cloud, without overwriting
// anything that already exists there (setDoc merge, idempotent).
const cloudBackfillExistingData = () => {
  try {
    if (!isFirebaseConfigured()) return;
    if (localStorage.getItem(CLOUD_BACKFILL_FLAG)) return;

    const run = async () => {
      const reservations = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESERVATIONS) || '[]');
      const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
      const notifications = getAllClientNotifications();

      const jobs = [];
      reservations.forEach(r => jobs.push(cloudAddReservation(r)));
      orders.forEach(o => jobs.push(cloudAddOrder(o)));
      notifications.forEach(n => jobs.push(cloudAddNotification(n)));

      await Promise.all(jobs);
      localStorage.setItem(CLOUD_BACKFILL_FLAG, 'done');
    };

    run().catch(() => {});
  } catch {
    // Backfill is best-effort; never break app startup because of it.
  }
};

export const dbGetProducts = () => {
  initDB();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
};

export const dbGetPerfumes = () => {
  initDB();
  const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
  return list.filter(p => p.type === 'perfume');
};

export const dbSaveProduct = (product) => {
  initDB();
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');

  const existingIdx = items.findIndex(i => i.id === product.id);
  if (existingIdx >= 0) {
    items[existingIdx] = { ...items[existingIdx], ...product };
  } else {
    items.unshift(product);
  }

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(items));
  window.dispatchEvent(new Event('storage'));

  // Sync to Cloud Firestore
  if (isFirebaseConfigured()) {
    cloudSaveProduct(product);
  }

  return items;
};

export const dbDeleteProduct = (id) => {
  initDB();
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
  const filtered = items.filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
  window.dispatchEvent(new Event('storage'));

  // Sync delete to Cloud Firestore
  if (isFirebaseConfigured()) {
    cloudDeleteProduct(id);
  }

  return filtered;
};

export const dbUpdatePrice = (id, newPrice) => {
  initDB();
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
  const price = Math.max(0, parseFloat(newPrice) || 0);
  const updated = items.map(i => i.id === id ? { ...i, price } : i);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
  window.dispatchEvent(new Event('storage'));

  // Sync the new price back to Firestore (merge keeps the rest of the doc)
  if (isFirebaseConfigured()) {
    const target = updated.find(i => i.id === id);
    if (target) cloudSaveProduct(target);
  }

  return updated;
};

export const dbGetBraids = () => {
  initDB();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.BRAIDS) || '[]');
};

export const dbGetReviews = () => {
  initDB();
  const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || '[]');
  return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

// Saves (or updates) a client review. A connected client owns a single review:
// submitting again while one already exists edits it in place.
export const dbAddReview = (review) => {
  initDB();
  const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || '[]');
  const existingIdx = review.clientUid
    ? list.findIndex(r => r.clientUid && r.clientUid === review.clientUid)
    : -1;

  let saved;
  if (existingIdx >= 0) {
    saved = { ...list[existingIdx], ...review, updatedAt: new Date().toISOString() };
    list[existingIdx] = saved;
  } else {
    saved = {
      ...review,
      id: 'REV-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      createdAt: new Date().toISOString()
    };
    list.unshift(saved);
  }

  localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(list));
  window.dispatchEvent(new Event('storage'));

  addAdminNotification({
    type: 'review',
    title: biText('⭐ Nouvel Avis Client', '⭐ New Client Review'),
    message: biText(
      `${saved.name || 'Un client'} a laissé un avis : "${saved.comment || 'Sans commentaire'}".`,
      `${saved.name || 'A client'} left a review: "${saved.comment || 'No comment'}".`
    ),
    referenceId: saved.id
  });

  // Sync to Cloud Firestore so every visitor sees the review across devices.
  if (isFirebaseConfigured()) {
    cloudSaveReview(saved);
  }

  return saved;
};

export const dbSaveBraid = (braid) => {
  initDB();
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.BRAIDS) || '[]');
  const existingIdx = items.findIndex(i => i.id === braid.id);
  if (existingIdx >= 0) {
    items[existingIdx] = { ...items[existingIdx], ...braid };
  } else {
    items.unshift(braid);
  }
  localStorage.setItem(STORAGE_KEYS.BRAIDS, JSON.stringify(items));
  window.dispatchEvent(new Event('storage'));
  if (isFirebaseConfigured()) {
    cloudSaveBraid(items[existingIdx >= 0 ? existingIdx : 0]);
  }
  return items;
};

export const dbDeleteBraid = (id) => {
  initDB();
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.BRAIDS) || '[]');
  const filtered = items.filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.BRAIDS, JSON.stringify(filtered));
  window.dispatchEvent(new Event('storage'));
  if (isFirebaseConfigured()) {
    cloudDeleteBraid(id);
  }
  return filtered;
};

export const dbUpdateStock = (id, newStock) => {
  initDB();
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
  const updated = items.map(i => i.id === id ? { ...i, stock: Math.max(0, newStock) } : i);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
  window.dispatchEvent(new Event('storage'));

  // Sync stock update to Cloud Firestore
  if (isFirebaseConfigured()) {
    cloudUpdateStock(id, newStock);
  }

  return updated;
};

export const dbDeductStockForOrder = (cartItems) => {
  initDB();
  const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');

  cartItems.forEach(cartItem => {
    const targetItem = products.find(i => i.id === cartItem.id);
    if (targetItem) {
      targetItem.stock = Math.max(0, (targetItem.stock || 0) - cartItem.quantity);
    }
  });

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  window.dispatchEvent(new Event('storage'));

  // Sync stock deductions to Cloud Firestore
  if (isFirebaseConfigured()) {
    cloudDeductStockForOrder(cartItems);
  }
};

export const dbGetReservations = () => {
  initDB();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.RESERVATIONS) || '[]');
};

export const dbAddReservation = (reservation) => {
  initDB();
  const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESERVATIONS) || '[]');
  const refId = 'TN-' + Math.floor(100000 + Math.random() * 900000);
  const newRes = {
    ...reservation,
    id: refId,
    status: 'en_attente',
    createdAt: new Date().toISOString()
  };
  list.unshift(newRes);
  localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(list));

  // Trigger Admin Notification
  addAdminNotification({
    type: 'reservation',
    title: biText('📅 Nouvelle Réservation de Tresse', '📅 New Braiding Booking'),
    message: biText(
      `${newRes.clientName} (${newRes.clientPhone}) a réservé "${newRes.braidTitle}" pour le ${newRes.date} à ${newRes.time}.`,
      `${newRes.clientName} (${newRes.clientPhone}) booked "${newRes.braidTitle}" for ${newRes.date} at ${newRes.time}.`
    ),
    referenceId: refId
  });

  // Sync to Cloud Firebase in background if configured
  if (isFirebaseConfigured()) {
    cloudAddReservation(newRes);
  }

  return newRes;
};

export const dbUpdateReservationStatus = (id, status, fallbackRes = null) => {
  initDB();
  const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESERVATIONS) || '[]');
  let targetRes = null;
  let found = false;

  const updated = list.map(r => {
    if (r.id === id) {
      found = true;
      targetRes = { ...r, status };
      return targetRes;
    }
    return r;
  });

  // The reservation may only exist in Firestore (booked from another device and
  // displayed via the cloud subscription). Persist it locally so the status
  // change sticks even before the cloud round-trip comes back.
  if (!found && fallbackRes) {
    targetRes = { ...fallbackRes, status, updatedAt: new Date().toISOString() };
    updated.unshift(targetRes);
  }

  localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(updated));

  if (targetRes) {
    const statusTextFr = status === 'confirmée' ? 'VALIDÉE et CONFIRMÉE' : status === 'annulée' ? 'ANNULÉE' : 'MISE À JOUR';
    const statusTextEn = status === 'confirmée' ? 'VALIDATED and CONFIRMED' : status === 'annulée' ? 'CANCELLED' : 'UPDATED';
    addClientNotification({
      referenceId: targetRes.id,
      recipientPhone: targetRes.clientPhone,
      recipientEmail: targetRes.clientEmail,
      type: 'status_update',
      title: status === 'confirmée'
        ? biText('✅ Votre Réservation a été Confirmée !', '✅ Your Booking has been Confirmed!')
        : biText('⚠️ Statut de Réservation Modifié', '⚠️ Booking Status Updated'),
      message: biText(
        `Bonjour ${targetRes.clientName}, votre réservation (${targetRes.braidTitle} le ${targetRes.date} à ${targetRes.time}) est désormais ${statusTextFr} par le salon TOUBA NDINDY.`,
        `Hello ${targetRes.clientName}, your booking (${targetRes.braidTitle} on ${targetRes.date} at ${targetRes.time}) is now ${statusTextEn} by TOUBA NDINDY salon.`
      )
    });
  }

  // Always push the new status to Firestore, whether or not this browser had the
  // record locally — the reservation was likely booked from the client's device.
  if (isFirebaseConfigured()) {
    cloudUpdateReservationStatus(id, status);
  }

  return updated;
};

export const dbGetOrders = () => {
  initDB();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
};

export const dbAddOrder = (orderData) => {
  initDB();
  dbDeductStockForOrder(orderData.items);

  const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
  const orderId = 'CMD-' + Math.floor(10000 + Math.random() * 90000);
  const newOrder = {
    ...orderData,
    id: orderId,
    status: 'en_attente',
    createdAt: new Date().toISOString()
  };
  orders.unshift(newOrder);
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

  // Notify the ADMIN immediately that a new order needs validation
  addAdminNotification({
    type: 'order',
    title: biText('🛒 Nouvelle Commande à Valider', '🛒 New Order to Validate'),
    message: biText(
      `${newOrder.clientName} (${newOrder.clientPhone}) a passé une commande de ${newOrder.total.toFixed(2)}$ (${newOrder.items.length} article(s)). En attente de validation.`,
      `${newOrder.clientName} (${newOrder.clientPhone}) placed an order of $${newOrder.total.toFixed(2)} (${newOrder.items.length} item(s)). Pending validation.`
    ),
    referenceId: orderId
  });

  // The CLIENT is only notified once the admin validates (or refuses) the order —
  // see dbUpdateOrderStatus below.

  // Sync to Cloud Firebase in background if configured
  if (isFirebaseConfigured()) {
    cloudAddOrder(newOrder);
  }

  return newOrder;
};

export const dbUpdateOrderStatus = (id, status, fallbackOrder = null) => {
  initDB();
  const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
  let targetOrder = null;
  let found = false;

  const updated = orders.map(o => {
    if (o.id === id) {
      found = true;
      targetOrder = { ...o, status };
      return targetOrder;
    }
    return o;
  });

  // The order may only exist in Firestore (placed from another device and shown
  // via the cloud subscription) — persist it locally so the change sticks.
  if (!found && fallbackOrder) {
    targetOrder = { ...fallbackOrder, status, updatedAt: new Date().toISOString() };
    updated.unshift(targetOrder);
  }

  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));

  if (targetOrder) {
    if (status === 'validée') {
      addClientNotification({
        referenceId: targetOrder.id,
        recipientPhone: targetOrder.clientPhone,
        recipientEmail: targetOrder.clientEmail || '',
        type: 'order_validated',
        title: biText('✅ Votre Commande a été Validée !', '✅ Your Order has been Validated!'),
        message: biText(
          `Bonjour ${targetOrder.clientName}, votre commande (${targetOrder.id}) d'un montant de ${targetOrder.total.toFixed(2)}$ a été validée et est en préparation chez TOUBA NDINDY.`,
          `Hello ${targetOrder.clientName}, your order (${targetOrder.id}) of $${targetOrder.total.toFixed(2)} has been validated and is being prepared at TOUBA NDINDY.`
        )
      });
    } else if (status === 'refusée') {
      addClientNotification({
        referenceId: targetOrder.id,
        recipientPhone: targetOrder.clientPhone,
        recipientEmail: targetOrder.clientEmail || '',
        type: 'order_refused',
        title: biText('⚠️ Commande Refusée', '⚠️ Order Declined'),
        message: biText(
          `Bonjour ${targetOrder.clientName}, votre commande (${targetOrder.id}) n'a malheureusement pas pu être validée par le salon TOUBA NDINDY. Contactez-nous au 443-858-1400 pour plus d'informations.`,
          `Hello ${targetOrder.clientName}, your order (${targetOrder.id}) unfortunately could not be validated by TOUBA NDINDY salon. Contact us at 443-858-1400 for more information.`
        )
      });
    } else if (status === 'récupérée') {
      addClientNotification({
        referenceId: targetOrder.id,
        recipientPhone: targetOrder.clientPhone,
        recipientEmail: targetOrder.clientEmail || '',
        type: 'order_collected',
        title: biText('✅ Commande Récupérée — Merci !', '✅ Order Collected — Thank you!'),
        message: biText(
          `Bonjour ${targetOrder.clientName}, nous confirmons la récupération de votre commande (${targetOrder.id}). Merci de votre confiance et à très bientôt chez TOUBA NDINDY !`,
          `Hello ${targetOrder.clientName}, we confirm that your order (${targetOrder.id}) has been collected. Thank you for your trust and see you soon at TOUBA NDINDY!`
        )
      });
    }
  }

  // Always push the new status to Firestore, whether or not this browser had the
  // record locally — the order was likely placed from the client's device.
  if (isFirebaseConfigured()) {
    cloudUpdateOrderStatus(id, status);
  }

  return updated;
};

// --- CLIENT SELF-SERVICE SEARCH & TRACKING ---

export const searchClientReservationsAndOrders = async (queryTerm = '') => {
  initDB();
  const clean = (queryTerm || '').trim().toLowerCase();
  const digits = clean.replace(/\D/g, '');

  const localRes = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESERVATIONS) || '[]');
  const localOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');

  const matchesReservation = (r) => {
    if (!clean) return true;
    const idMatch = (r.id || '').toLowerCase().includes(clean);
    const nameMatch = (r.clientName || '').toLowerCase().includes(clean);
    const emailMatch = (r.clientEmail || '').toLowerCase().includes(clean);
    const phoneDigits = (r.clientPhone || '').replace(/\D/g, '');
    const phoneMatch = (r.clientPhone || '').toLowerCase().includes(clean) || (digits && phoneDigits.includes(digits));
    const braidMatch = (r.braidTitle || '').toLowerCase().includes(clean);
    return idMatch || nameMatch || emailMatch || phoneMatch || braidMatch;
  };

  const matchesOrder = (o) => {
    if (!clean) return true;
    const idMatch = (o.id || '').toLowerCase().includes(clean);
    const nameMatch = (o.clientName || '').toLowerCase().includes(clean);
    const emailMatch = (o.clientEmail || '').toLowerCase().includes(clean);
    const phoneDigits = (o.clientPhone || '').replace(/\D/g, '');
    const phoneMatch = (o.clientPhone || '').toLowerCase().includes(clean) || (digits && phoneDigits.includes(digits));
    const itemMatch = (o.items || []).some(item => (item.name || '').toLowerCase().includes(clean));
    return idMatch || nameMatch || emailMatch || phoneMatch || itemMatch;
  };

  let matchingRes = localRes.filter(matchesReservation);
  let matchingOrders = localOrders.filter(matchesOrder);

  // If Firebase Cloud is configured, search and merge cloud records
  if (isFirebaseConfigured()) {
    try {
      const cloudResult = await cloudSearchReservationsAndOrders(queryTerm);
      
      // Merge reservations, prioritizing cloud if present, without duplicates
      const resMap = new Map();
      matchingRes.forEach(r => resMap.set(r.id, r));
      cloudResult.reservations.forEach(r => resMap.set(r.id, r));
      matchingRes = Array.from(resMap.values());

      // Merge orders
      const ordMap = new Map();
      matchingOrders.forEach(o => ordMap.set(o.id, o));
      cloudResult.orders.forEach(o => ordMap.set(o.id, o));
      matchingOrders = Array.from(ordMap.values());
    } catch (e) {
      console.warn("Error fetching cloud search results:", e);
    }
  }

  // Sort newest first
  matchingRes.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  matchingOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return {
    reservations: matchingRes,
    orders: matchingOrders
  };
};

export const getClientTrackedRecords = async () => {
  initDB();
  const trackedRefs = getMyTrackedReferences(); // [{ referenceId, type, label, trackedAt }, ...]
  if (!trackedRefs || trackedRefs.length === 0) {
    return { reservations: [], orders: [] };
  }

  const refIds = trackedRefs.map(r => r.referenceId);
  const localRes = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESERVATIONS) || '[]');
  const localOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');

  let myReservations = localRes.filter(r => refIds.includes(r.id));
  let myOrders = localOrders.filter(o => refIds.includes(o.id));

  if (isFirebaseConfigured()) {
    try {
      const cloudResult = await cloudSearchReservationsAndOrders('');
      
      const resMap = new Map();
      myReservations.forEach(r => resMap.set(r.id, r));
      cloudResult.reservations.filter(r => refIds.includes(r.id)).forEach(r => resMap.set(r.id, r));
      myReservations = Array.from(resMap.values());

      const ordMap = new Map();
      myOrders.forEach(o => ordMap.set(o.id, o));
      cloudResult.orders.filter(o => refIds.includes(o.id)).forEach(o => ordMap.set(o.id, o));
      myOrders = Array.from(ordMap.values());
    } catch (e) {
      console.warn("Error fetching tracked items from cloud:", e);
    }
  }

  myReservations.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  myOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return {
    reservations: myReservations,
    orders: myOrders
  };
};
