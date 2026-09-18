import { braidsData } from '../data/braidsData';
import { productsData } from '../data/productsData';
import { perfumesData } from '../data/perfumesData';
import { addAdminNotification, addClientNotification, getMyTrackedReferences, biText } from './notifications';
import { 
  isFirebaseConfigured, 
  cloudAddReservation, 
  cloudUpdateReservationStatus, 
  cloudAddOrder, 
  cloudUpdateOrderStatus,
  cloudSearchReservationsAndOrders,
  cloudSeedProductsIfEmpty,
  cloudSaveProduct,
  cloudDeleteProduct,
  cloudUpdateStock,
  cloudDeductStockForOrder
} from './firebase';

const STORAGE_KEYS = {
  PRODUCTS: 'touba_ndindy_products',
  PERFUMES: 'touba_ndindy_perfumes',
  BRAIDS: 'touba_ndindy_braids',
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

const initialReservations = [
  {
    id: 'TN-940218',
    braidId: 'flat-twist-updo',
    braidTitle: 'Flat Twists Bun & Chignon Protecteur',
    price: 130,
    date: '2026-09-16',
    time: '10:00 AM',
    clientName: 'Awa Diallo',
    clientPhone: '443-555-0192',
    clientEmail: 'awa.diallo@gmail.com',
    paymentMethod: 'cash',
    status: 'confirmée',
    createdAt: new Date().toISOString()
  },
  {
    id: 'TN-582910',
    braidId: 'knotless-braids-medium',
    braidTitle: 'Knotless Braids (Moyennes & Longues)',
    price: 180,
    date: '2026-09-17',
    time: '01:00 PM',
    clientName: 'Jessica Taylor',
    clientPhone: '443-888-2910',
    clientEmail: 'jtaylor@yahoo.com',
    paymentMethod: 'cashapp',
    status: 'en_attente',
    createdAt: new Date().toISOString()
  }
];

const initialOrders = [
  {
    id: 'CMD-10492',
    clientName: 'Fatou Sow',
    clientPhone: '443-777-3829',
    total: 95.00,
    items: [
      { id: 'mousuf-eau-de-parfum', name: 'MOUSUF Eau de Parfum', price: 45.00, quantity: 1 },
      { id: 'oud-mood-lattafa', name: 'OUD MOOD Eau de Parfum', price: 50.00, quantity: 1 }
    ],
    status: 'validée',
    createdAt: new Date().toISOString()
  }
];

export const initDB = () => {
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PERFUMES)) {
    localStorage.setItem(STORAGE_KEYS.PERFUMES, JSON.stringify(initialPerfumes));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BRAIDS)) {
    localStorage.setItem(STORAGE_KEYS.BRAIDS, JSON.stringify(braidsData));
  }
  if (!localStorage.getItem(STORAGE_KEYS.RESERVATIONS)) {
    localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(initialReservations));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(initialOrders));
  }

  // Auto seed products & perfumes in Firebase Firestore if configured
  if (isFirebaseConfigured()) {
    cloudSeedProductsIfEmpty(initialProducts, initialPerfumes);
  }
};

export const dbGetProducts = () => {
  initDB();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
};

export const dbGetPerfumes = () => {
  initDB();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PERFUMES) || '[]');
};

export const dbSaveProduct = (product) => {
  initDB();
  const key = product.type === 'perfume' ? STORAGE_KEYS.PERFUMES : STORAGE_KEYS.PRODUCTS;
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  
  const existingIdx = items.findIndex(i => i.id === product.id);
  if (existingIdx >= 0) {
    items[existingIdx] = { ...items[existingIdx], ...product };
  } else {
    items.unshift(product);
  }
  
  localStorage.setItem(key, JSON.stringify(items));

  // Sync to Cloud Firestore
  if (isFirebaseConfigured()) {
    cloudSaveProduct(product);
  }

  return items;
};

export const dbDeleteProduct = (id, type) => {
  initDB();
  const key = type === 'perfume' ? STORAGE_KEYS.PERFUMES : STORAGE_KEYS.PRODUCTS;
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  const filtered = items.filter(i => i.id !== id);
  localStorage.setItem(key, JSON.stringify(filtered));

  // Sync delete to Cloud Firestore
  if (isFirebaseConfigured()) {
    cloudDeleteProduct(id, type);
  }

  return filtered;
};

export const dbUpdateStock = (id, newStock, type) => {
  initDB();
  const key = type === 'perfume' ? STORAGE_KEYS.PERFUMES : STORAGE_KEYS.PRODUCTS;
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  const updated = items.map(i => i.id === id ? { ...i, stock: Math.max(0, newStock) } : i);
  localStorage.setItem(key, JSON.stringify(updated));

  // Sync stock update to Cloud Firestore
  if (isFirebaseConfigured()) {
    cloudUpdateStock(id, newStock, type);
  }

  return updated;
};

export const dbDeductStockForOrder = (cartItems) => {
  initDB();
  const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
  const perfumes = JSON.parse(localStorage.getItem(STORAGE_KEYS.PERFUMES) || '[]');

  cartItems.forEach(cartItem => {
    let targetList = products.some(p => p.id === cartItem.id) ? products : perfumes;
    const targetItem = targetList.find(i => i.id === cartItem.id);
    if (targetItem) {
      targetItem.stock = Math.max(0, (targetItem.stock || 0) - cartItem.quantity);
    }
  });

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  localStorage.setItem(STORAGE_KEYS.PERFUMES, JSON.stringify(perfumes));

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

export const dbUpdateReservationStatus = (id, status) => {
  initDB();
  const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESERVATIONS) || '[]');
  let targetRes = null;

  const updated = list.map(r => {
    if (r.id === id) {
      targetRes = { ...r, status };
      return targetRes;
    }
    return r;
  });

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

    // Sync to Cloud Firebase in background if configured
    if (isFirebaseConfigured()) {
      cloudUpdateReservationStatus(id, status);
    }
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

export const dbUpdateOrderStatus = (id, status) => {
  initDB();
  const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
  let targetOrder = null;

  const updated = orders.map(o => {
    if (o.id === id) {
      targetOrder = { ...o, status };
      return targetOrder;
    }
    return o;
  });

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

    if (isFirebaseConfigured()) {
      cloudUpdateOrderStatus(id, status);
    }
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
