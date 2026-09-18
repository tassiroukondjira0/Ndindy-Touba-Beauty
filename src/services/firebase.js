import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc,
  updateDoc, 
  setDoc, 
  deleteDoc,
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

export const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey.trim() !== "" && 
    firebaseConfig.projectId && 
    firebaseConfig.projectId.trim() !== ""
  );
};

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("🔥 Firebase Cloud Database & Auth Initialized Successfully!");
  } catch (err) {
    console.warn("⚠️ Firebase Initialization Warning:", err.message);
  }
}

export { db, auth };

// --- CLOUD FIRESTORE HELPERS: RESERVATIONS ---

export const cloudAddReservation = async (reservationData) => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docId = reservationData.id || ('TN-' + Math.floor(100000 + Math.random() * 900000));
    const docRef = doc(db, 'reservations', docId);
    const dataToSave = {
      ...reservationData,
      id: docId,
      cloudCreatedAt: serverTimestamp()
    };
    await setDoc(docRef, dataToSave, { merge: true });
    return dataToSave;
  } catch (err) {
    console.error("Cloud reservation error:", err);
    return null;
  }
};

export const cloudUpdateReservationStatus = async (id, status) => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, 'reservations', id);
    await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
    return true;
  } catch (err) {
    console.error("Cloud status update error:", err);
    return false;
  }
};

// --- CLOUD FIRESTORE HELPERS: ORDERS ---

export const cloudAddOrder = async (orderData) => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docId = orderData.id || ('CMD-' + Math.floor(10000 + Math.random() * 90000));
    const docRef = doc(db, 'orders', docId);
    const dataToSave = {
      ...orderData,
      id: docId,
      cloudCreatedAt: serverTimestamp()
    };
    await setDoc(docRef, dataToSave, { merge: true });
    return dataToSave;
  } catch (err) {
    console.error("Cloud order error:", err);
    return null;
  }
};

export const cloudDeleteReservation = async (id) => {
  if (!isFirebaseConfigured() || !db) return false;
  try {
    await deleteDoc(doc(db, 'reservations', id));
    return true;
  } catch (err) {
    console.error(`Error deleting reservation ${id} from cloud:`, err);
    return false;
  }
};

export const cloudDeleteOrder = async (id) => {
  if (!isFirebaseConfigured() || !db) return false;
  try {
    await deleteDoc(doc(db, 'orders', id));
    return true;
  } catch (err) {
    console.error(`Error deleting order ${id} from cloud:`, err);
    return false;
  }
};

export const cloudDeleteNotification = async (id) => {
  if (!isFirebaseConfigured() || !db) return false;
  try {
    await deleteDoc(doc(db, 'notifications', id));
    return true;
  } catch (err) {
    console.error(`Error deleting notification ${id} from cloud:`, err);
    return false;
  }
};

export const cloudUpdateOrderStatus = async (id, status) => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, 'orders', id);
    await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
    return true;
  } catch (err) {
    console.error("Cloud order status update error:", err);
    return false;
  }
};

// --- CLOUD FIRESTORE HELPERS: PRODUCTS & PERFUMES ---

/**
 * Automatically seeds initial products and perfumes to Firestore if collections are empty.
 */
export const cloudSeedProductsIfEmpty = async (initialProducts, initialPerfumes) => {
  if (!isFirebaseConfigured() || !db) return;
  try {
    const prodSnap = await getDocs(collection(db, 'products'));
    if (prodSnap.empty && initialProducts && initialProducts.length > 0) {
      console.log("🌱 Auto-seeding initial Products into Firestore...");
      for (const prod of initialProducts) {
        await setDoc(doc(db, 'products', prod.id), {
          ...prod,
          cloudCreatedAt: serverTimestamp()
        }, { merge: true });
      }
    }

    const perfSnap = await getDocs(collection(db, 'perfumes'));
    if (perfSnap.empty && initialPerfumes && initialPerfumes.length > 0) {
      console.log("🌱 Auto-seeding initial Perfumes into Firestore...");
      for (const perf of initialPerfumes) {
        await setDoc(doc(db, 'perfumes', perf.id), {
          ...perf,
          cloudCreatedAt: serverTimestamp()
        }, { merge: true });
      }
    }
  } catch (err) {
    console.warn("⚠️ Cloud products auto-seeding warning:", err.message);
  }
};

export const cloudSaveProduct = async (product) => {
  if (!isFirebaseConfigured() || !db) return null;
  const colName = product.type === 'perfume' ? 'perfumes' : 'products';
  try {
    const docRef = doc(db, colName, product.id);
    const dataToSave = {
      ...product,
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, dataToSave, { merge: true });
    return dataToSave;
  } catch (err) {
    console.error(`Error saving product ${product.id} to cloud:`, err);
    return null;
  }
};

export const cloudDeleteProduct = async (id, type) => {
  if (!isFirebaseConfigured() || !db) return false;
  const colName = type === 'perfume' ? 'perfumes' : 'products';
  try {
    const docRef = doc(db, colName, id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting product ${id} from cloud:`, err);
    return false;
  }
};

export const cloudUpdateStock = async (id, newStock, type) => {
  if (!isFirebaseConfigured() || !db) return false;
  const colName = type === 'perfume' ? 'perfumes' : 'products';
  try {
    const docRef = doc(db, colName, id);
    await updateDoc(docRef, { 
      stock: Math.max(0, newStock), 
      updatedAt: serverTimestamp() 
    });
    return true;
  } catch (err) {
    console.error(`Error updating stock for ${id} in cloud:`, err);
    return false;
  }
};

export const cloudDeductStockForOrder = async (cartItems) => {
  if (!isFirebaseConfigured() || !db) return;
  try {
    for (const item of cartItems) {
      const colName = item.type === 'perfume' ? 'perfumes' : 'products';
      const docRef = doc(db, colName, item.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentStock = snap.data().stock || 0;
        const newStock = Math.max(0, currentStock - (item.quantity || 1));
        await updateDoc(docRef, { stock: newStock, updatedAt: serverTimestamp() });
      }
    }
  } catch (err) {
    console.warn("Error deducting cloud stock:", err);
  }
};

// Real-time live listeners for Products & Perfumes
export const subscribeToCloudProducts = (onUpdate, onError) => {
  if (!isFirebaseConfigured() || !db) return () => {};
  try {
    const q = collection(db, 'products');
    return onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach(d => {
        items.push({ ...d.data(), id: d.id });
      });
      onUpdate(items);
    }, (err) => {
      console.warn("Firestore products subscription warning:", err);
      if (onError) onError(err);
    });
  } catch (err) {
    console.warn("Error establishing products subscription:", err);
    return () => {};
  }
};

export const subscribeToCloudPerfumes = (onUpdate, onError) => {
  if (!isFirebaseConfigured() || !db) return () => {};
  try {
    const q = collection(db, 'perfumes');
    return onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach(d => {
        items.push({ ...d.data(), id: d.id });
      });
      onUpdate(items);
    }, (err) => {
      console.warn("Firestore perfumes subscription warning:", err);
      if (onError) onError(err);
    });
  } catch (err) {
    console.warn("Error establishing perfumes subscription:", err);
    return () => {};
  }
};

// Real-time live listeners for Reservations & Orders
export const subscribeToCloudReservations = (onUpdate, onError) => {
  if (!isFirebaseConfigured() || !db) return () => {};
  try {
    const q = collection(db, 'reservations');
    return onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach(d => {
        items.push({ ...d.data(), id: d.id });
      });
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      onUpdate(items);
    }, (err) => {
      console.warn("Firestore reservations subscription warning:", err);
      if (onError) onError(err);
    });
  } catch (err) {
    console.warn("Error establishing reservations subscription:", err);
    return () => {};
  }
};

export const subscribeToCloudOrders = (onUpdate, onError) => {
  if (!isFirebaseConfigured() || !db) return () => {};
  try {
    const q = collection(db, 'orders');
    return onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach(d => {
        items.push({ ...d.data(), id: d.id });
      });
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      onUpdate(items);
    }, (err) => {
      console.warn("Firestore orders subscription warning:", err);
      if (onError) onError(err);
    });
  } catch (err) {
    console.warn("Error establishing orders subscription:", err);
    return () => {};
  }
};

// --- CLOUD FIRESTORE & AUTH: ADMIN ACCOUNT ---

const ADMIN_DOC_ID = 'salon_owner';

export const cloudGetAdminAccount = async () => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, 'admins', ADMIN_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn("Error getting cloud admin account:", err);
    return null;
  }
};

export const cloudSaveAdminAccount = async (accountData) => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, 'admins', ADMIN_DOC_ID);
    const dataToSave = {
      ...accountData,
      role: 'admin',
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, dataToSave, { merge: true });
    return dataToSave;
  } catch (err) {
    console.error("Error saving cloud admin account:", err);
    return null;
  }
};

export const cloudRegisterAdmin = async (accountData) => {
  let firebaseUser = null;
  
  // 1. Try Firebase Authentication first if enabled
  if (isFirebaseConfigured() && auth) {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, accountData.email, accountData.password);
      firebaseUser = userCred.user;
    } catch (authErr) {
      console.warn("Firebase Auth registration fallback:", authErr.message);
      // If email already in use, try to sign in
      if (authErr.code === 'auth/email-already-in-use') {
        try {
          const userCred = await signInWithEmailAndPassword(auth, accountData.email, accountData.password);
          firebaseUser = userCred.user;
        } catch (loginErr) {
          console.warn("Auth sign-in fallback:", loginErr.message);
        }
      }
    }
  }

  // 2. Save Admin profile document in Firestore collection 'admins' and 'users'
  const adminDoc = {
    firstName: accountData.firstName,
    lastName: accountData.lastName,
    email: accountData.email,
    phone: accountData.phone,
    passwordHash: btoa(accountData.password),
    uid: firebaseUser ? firebaseUser.uid : 'admin_' + Date.now(),
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  if (isFirebaseConfigured() && db) {
    try {
      await cloudSaveAdminAccount(adminDoc);
      if (firebaseUser) {
        await setDoc(doc(db, 'users', firebaseUser.uid), adminDoc, { merge: true });
      }
    } catch (e) {
      console.warn("Error storing admin profile in Firestore:", e);
    }
  }

  return adminDoc;
};

export const cloudLoginAdmin = async (email, password) => {
  let authSuccess = false;

  // 1. Try Firebase Auth sign in
  if (isFirebaseConfigured() && auth) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      authSuccess = true;
    } catch (authErr) {
      console.warn("Firebase Auth direct login error / check fallback:", authErr.message);
    }
  }

  // 2. Check Firestore admin doc
  const cloudAdmin = await cloudGetAdminAccount();
  if (cloudAdmin) {
    const emailMatch = (cloudAdmin.email || '').toLowerCase() === (email || '').trim().toLowerCase();
    const pwdMatch = cloudAdmin.passwordHash === btoa(password || '');
    if (emailMatch && (pwdMatch || authSuccess)) {
      return cloudAdmin;
    }
  }

  if (authSuccess) {
    return {
      email,
      firstName: 'Administrateur',
      lastName: 'Touba Ndindy',
      role: 'admin'
    };
  }

  return null;
};

export const subscribeToCloudAdmin = (onUpdate) => {
  if (!isFirebaseConfigured() || !db) return () => {};
  try {
    const docRef = doc(db, 'admins', ADMIN_DOC_ID);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data());
      } else {
        onUpdate(null);
      }
    }, (err) => {
      console.warn("Firestore admin subscription warning:", err);
    });
  } catch (err) {
    console.warn("Error subscribing to admin account:", err);
    return () => {};
  }
};

// Client Search in Cloud Firestore (for tracking reservations & orders across devices)
export const cloudSearchReservationsAndOrders = async (queryTerm = '') => {
  if (!isFirebaseConfigured() || !db) {
    return { reservations: [], orders: [] };
  }

  const cleanQuery = (queryTerm || '').trim().toLowerCase();
  const digitsOnly = cleanQuery.replace(/\D/g, '');

  try {
    const resSnap = await getDocs(collection(db, 'reservations'));
    const allRes = [];
    resSnap.forEach(docSnap => {
      allRes.push({ ...docSnap.data(), id: docSnap.id });
    });

    const ordSnap = await getDocs(collection(db, 'orders'));
    const allOrd = [];
    ordSnap.forEach(docSnap => {
      allOrd.push({ ...docSnap.data(), id: docSnap.id });
    });

    if (!cleanQuery) {
      return { reservations: allRes, orders: allOrd };
    }

    const matchesReservation = (r) => {
      const idMatch = (r.id || '').toLowerCase().includes(cleanQuery);
      const nameMatch = (r.clientName || '').toLowerCase().includes(cleanQuery);
      const emailMatch = (r.clientEmail || '').toLowerCase().includes(cleanQuery);
      const phoneClean = (r.clientPhone || '').replace(/\D/g, '');
      const phoneMatch = (r.clientPhone || '').toLowerCase().includes(cleanQuery) || 
        (digitsOnly && phoneClean.includes(digitsOnly));
      const braidMatch = (r.braidTitle || '').toLowerCase().includes(cleanQuery);
      return idMatch || nameMatch || emailMatch || phoneMatch || braidMatch;
    };

    const matchesOrder = (o) => {
      const idMatch = (o.id || '').toLowerCase().includes(cleanQuery);
      const nameMatch = (o.clientName || '').toLowerCase().includes(cleanQuery);
      const emailMatch = (o.clientEmail || '').toLowerCase().includes(cleanQuery);
      const phoneClean = (o.clientPhone || '').replace(/\D/g, '');
      const phoneMatch = (o.clientPhone || '').toLowerCase().includes(cleanQuery) || 
        (digitsOnly && phoneClean.includes(digitsOnly));
      const itemMatch = (o.items || []).some(item => (item.name || '').toLowerCase().includes(cleanQuery));
      return idMatch || nameMatch || emailMatch || phoneMatch || itemMatch;
    };

    const matchingReservations = allRes.filter(matchesReservation);
    const matchingOrders = allOrd.filter(matchesOrder);

    return {
      reservations: matchingReservations,
      orders: matchingOrders
    };
  } catch (err) {
    console.warn("Cloud client search error:", err);
    return { reservations: [], orders: [] };
  }
};

// --- CLOUD FIRESTORE & AUTH: CLIENT PROFILES ---
// Client accounts are kept fully separate from the salon owner admin account
// (which lives in the 'admins'/'users' collections with role 'admin').

export const cloudCreateClientProfile = async (uid, profileData) => {
  if (!isFirebaseConfigured() || !db || !uid) return null;
  try {
    const docRef = doc(db, 'clientProfiles', uid);
    const data = {
      ...profileData,
      uid,
      role: 'client',
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, data, { merge: true });
    return data;
  } catch (err) {
    console.warn("Client profile cloud error:", err);
    return null;
  }
};

export const cloudGetClientProfile = async (uid) => {
  if (!isFirebaseConfigured() || !db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, 'clientProfiles', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn("Client profile get error:", err);
    return null;
  }
};

// --- CLOUD FIRESTORE HELPERS: CLIENT NOTIFICATIONS ---
// Client notifications are persisted to Firestore so reminders and status
// updates generated on one device (admin, another client) can reach every
// device that tracks the same reference — fully automatically.
export const cloudAddNotification = async (notif) => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docId = notif.id || ('cnotif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
    const docRef = doc(db, 'notifications', docId);
    await setDoc(docRef, { ...notif, id: docId, cloudCreatedAt: serverTimestamp() }, { merge: true });
    return docId;
  } catch (err) {
    console.warn("Cloud notification error:", err);
    return null;
  }
};

export const subscribeToCloudNotifications = (onUpdate, onError) => {
  if (!isFirebaseConfigured() || !db) return () => {};
  try {
    const q = collection(db, 'notifications');
    return onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach(d => {
        items.push({ ...d.data(), id: d.id });
      });
      onUpdate(items);
    }, (err) => {
      console.warn("Firestore notifications subscription warning:", err);
      if (onError) onError(err);
    });
  } catch (err) {
    console.warn("Error establishing notifications subscription:", err);
    return () => {};
  }
};
