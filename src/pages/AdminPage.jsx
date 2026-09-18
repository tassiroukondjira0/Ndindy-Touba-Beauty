import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ImagePicker } from '../components/ImagePicker';
import { 
  hasAdminAccount,
  hasAdminAccountAsync,
  getAdminAccount, 
  getAdminAccountAsync,
  registerAdminAccount, 
  registerAdminAccountAsync,
  loginAdminAccount, 
  loginAdminAccountAsync,
  getCurrentAdminSession, 
  logoutAdminAccount,
  validatePassword,
  hasConsecutiveSequentialChars
} from '../services/auth';
import { 
  dbGetProducts, 
  dbGetPerfumes, 
  dbSaveProduct, 
  dbDeleteProduct, 
  dbUpdateStock, 
  dbUpdatePrice,
  dbGetBraids, 
  dbSaveBraid, 
  dbDeleteBraid,
  dbGetReservations, 
  dbUpdateReservationStatus, 
  dbGetOrders, 
  dbUpdateOrderStatus 
} from '../services/db';
import {
  isFirebaseConfigured,
  subscribeToCloudReservations,
  subscribeToCloudOrders,
  subscribeToCloudProducts,
  subscribeToCloudPerfumes,
  subscribeToCloudAdmin
} from '../services/firebase';
import { 
  getAdminNotifications, 
  getUnreadAdminNotifCount, 
  markAdminNotifsAsRead,
  requestNotificationPermission,
  getNotificationPermission,
  showBrowserNotification,
  playNotificationChime,
  checkAndSendAutomatedReminders,
  isReservationWithin24h,
  isOrderUncollectedOver48h,
  hasReminderBeenSent,
  getNotifText
} from '../services/notifications';
import {
  Lock,
  User,
  Mail,
  Phone,
  Key,
  ShieldCheck,
  Calendar,
  ShoppingBag,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  DollarSign,
  AlertTriangle,
  LogOut,
  Bell,
  Check,
  CheckCheck,
  Pencil,
  Edit
} from 'lucide-react';

// Merge two id-keyed lists, keeping every record and giving latest-in-browser
// entries precedence. Used to combine the cloud-fed live view with the local
// store without blanking the dashboard on every refresh.
const mergeById = (prev, fresh) => {
  const map = new Map();
  (prev || []).forEach(x => map.set(x.id, x));
  (fresh || []).forEach(x => map.set(x.id, x));
  return Array.from(map.values());
};

// Inline price editor used in the admin dashboard for products, perfumes and braids.
const PriceEditor = ({ price, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(price));

  useEffect(() => { setVal(String(price)); }, [price]);

  const commit = () => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) { setVal(String(price)); setEditing(false); return; }
    onSave(num);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontWeight: 800, color: 'var(--gold-primary)' }}>$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
          style={{
            width: '74px', padding: '4px 8px', borderRadius: '6px',
            backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid var(--gold-primary)',
            color: '#fff', fontSize: '0.95rem'
          }}
        />
        <button onClick={commit} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer' }} title="OK">
          <Check size={16} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span className="font-serif text-gold" style={{ fontSize: '1.2rem', fontWeight: 800 }}>${Number(price || 0).toFixed(2)}</span>
      <button
        onClick={() => setEditing(true)}
        title="Modifier le prix"
        style={{ background: 'none', border: 'none', color: 'var(--gold-light)', cursor: 'pointer' }}
      >
        <Pencil size={14} />
      </button>
    </div>
  );
};

export const AdminPage = () => {
  const { t, language } = useLanguage();
  
  // Auth state
  const [accountExists, setAccountExists] = useState(false);
  const [adminAccount, setAdminAccount] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);

  // Registration state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState('reservations');
  const [reservations, setReservations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [perfumes, setPerfumes] = useState([]);
  const [braids, setBraids] = useState([]);

  // Notifications State
  const [adminNotifs, setAdminNotifs] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState('default');
  const knownNotifIdsRef = React.useRef(new Set());
  const isFirstNotifLoadRef = React.useRef(true);

  // Product Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('care');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('10');
  const [newImage, setNewImage] = useState('/assets/mousuf-perfume.jpg');
  const [newDesc, setNewDesc] = useState('');

  // Braid Management State
  const [isBraidModalOpen, setIsBraidModalOpen] = useState(false);
  const [editingBraidId, setEditingBraidId] = useState(null);
  const [braidForm, setBraidForm] = useState({
    title_fr: '', title_en: '', category: 'knotless', price: '', duration: '',
    image: '/assets/', description_fr: '', description_en: '', featured: false
  });

  const setBraidField = (field, value) => {
    setBraidForm(prev => ({ ...prev, [field]: value }));
  };

  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const checkAuthStatus = async () => {
    const exists = await hasAdminAccountAsync();
    setAccountExists(exists);
    const acc = await getAdminAccountAsync();
    setAdminAccount(acc);
    const sess = getCurrentAdminSession();
    setCurrentSession(sess);

    if (acc && !loginEmail) {
      setLoginEmail(acc.email);
    }
  };

  useEffect(() => {
    checkAuthStatus();

    // Listen for cloud admin account changes
    let unsubAdmin = () => {};
    if (isFirebaseConfigured()) {
      unsubAdmin = subscribeToCloudAdmin((cloudAcc) => {
        if (cloudAcc) {
          setAccountExists(true);
          setAdminAccount(cloudAcc);
          if (!loginEmail) {
            setLoginEmail(cloudAcc.email);
          }
        }
      });
    }

    return () => {
      if (unsubAdmin) unsubAdmin();
    };
  }, []);

  const loadDashboardData = () => {
    // Merge instead of replacing so reservations/orders that only exist in
    // Firestore (booked from the client's device and streamed here via the
    // cloud subscription) are never wiped by a local-only refresh.
    setReservations(prev => mergeById(prev, dbGetReservations()));
    setOrders(prev => mergeById(prev, dbGetOrders()));
    setProducts(dbGetProducts());
    setPerfumes(dbGetPerfumes());
    setBraids(dbGetBraids());

    const freshNotifs = getAdminNotifications();

    // Detect brand-new notifications (new reservation/order) to trigger a real
    // desktop push notification + sound cue for the admin, even if this tab
    // isn't focused on the notification panel.
    if (isFirstNotifLoadRef.current) {
      knownNotifIdsRef.current = new Set(freshNotifs.map(n => n.id));
      isFirstNotifLoadRef.current = false;
    } else {
      const brandNew = freshNotifs.filter(n => !knownNotifIdsRef.current.has(n.id));
      if (brandNew.length > 0) {
        playNotificationChime();
        brandNew.forEach(n => {
          showBrowserNotification(getNotifText(n, 'title', language), { body: getNotifText(n, 'message', language), tag: n.id });
        });
        knownNotifIdsRef.current = new Set(freshNotifs.map(n => n.id));
      }
    }

    setAdminNotifs(freshNotifs);
    setUnreadNotifCount(getUnreadAdminNotifCount());
  };

  useEffect(() => {
    if (currentSession) {
      setNotifPermission(getNotificationPermission());
      requestNotificationPermission().then(setNotifPermission);
      loadDashboardData();
    }
  }, [currentSession]);

  // Fully automatic reminders: scan for 24h reservation reminders and 48h
  // uncollected-order pickup reminders on a schedule — the owner never has to
  // trigger them manually.
  useEffect(() => {
    if (!currentSession) return () => {};
    checkAndSendAutomatedReminders();
    loadDashboardData();
    const interval = setInterval(() => {
      checkAndSendAutomatedReminders();
      loadDashboardData();
    }, 60000);
    return () => clearInterval(interval);
  }, [currentSession]);

  useEffect(() => {
    const handleStorageChange = () => {
      if (currentSession) {
        loadDashboardData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentSession]);

  // Real-time Cloud Sync with Firebase Firestore (across multiple devices)
  useEffect(() => {
    if (!currentSession || !isFirebaseConfigured()) return;

    const unsubRes = subscribeToCloudReservations((cloudReservations) => {
      if (cloudReservations && cloudReservations.length > 0) {
        setReservations(cloudReservations);
      }
    });

    const unsubOrders = subscribeToCloudOrders((cloudOrders) => {
      if (cloudOrders && cloudOrders.length > 0) {
        setOrders(cloudOrders);
      }
    });

    const unsubProducts = subscribeToCloudProducts((cloudProducts) => {
      if (cloudProducts && cloudProducts.length > 0) {
        setProducts(cloudProducts);
      }
    });

    const unsubPerfumes = subscribeToCloudPerfumes((cloudPerfumes) => {
      if (cloudPerfumes && cloudPerfumes.length > 0) {
        setPerfumes(cloudPerfumes);
      }
    });

    return () => {
      if (unsubRes) unsubRes();
      if (unsubOrders) unsubOrders();
      if (unsubProducts) unsubProducts();
      if (unsubPerfumes) unsubPerfumes();
    };
  }, [currentSession]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');

    if (regPassword !== regConfirm) {
      setRegError(t('admin_reg_mismatch'));
      return;
    }

    setIsAuthLoading(true);
    try {
      const newAcc = await registerAdminAccountAsync({
        firstName: regFirstName,
        lastName: regLastName,
        email: regEmail,
        phone: regPhone,
        password: regPassword
      });

      setAdminAccount(newAcc);
      setAccountExists(true);
      setCurrentSession(getCurrentAdminSession());
    } catch (err) {
      setRegError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsAuthLoading(true);

    try {
      const session = await loginAdminAccountAsync(loginEmail, loginPassword);
      setCurrentSession(session);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    logoutAdminAccount();
    setCurrentSession(null);
  };

  const handleStatusChange = (id, newStatus) => {
    const fallback = reservations.find(r => r.id === id);
    setReservations(prev => mergeById(prev, dbUpdateReservationStatus(id, newStatus, fallback)));
  };

  const handleOrderStatusChange = (id, newStatus) => {
    const fallback = orders.find(o => o.id === id);
    setOrders(prev => mergeById(prev, dbUpdateOrderStatus(id, newStatus, fallback)));
  };

  const handleMarkOrderCollected = (id) => {
    const fallback = orders.find(o => o.id === id);
    setOrders(prev => mergeById(prev, dbUpdateOrderStatus(id, 'récupérée', fallback)));
    loadDashboardData();
  };

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      showBrowserNotification(t('admin_notif_enabled_title'), {
        body: t('admin_notif_enabled_body')
      });
    }
  };

  const handleMarkNotifsRead = () => {
    const updated = markAdminNotifsAsRead();
    setAdminNotifs(updated);
    setUnreadNotifCount(0);
  };

  const handleStockChange = (id, currentStock, delta, type) => {
    const nextStock = Math.max(0, currentStock + delta);
    if (type === 'perfume') {
      setPerfumes(dbUpdateStock(id, nextStock, 'perfume'));
    } else {
      setProducts(dbUpdateStock(id, nextStock, 'product'));
    }
  };

  const handleDeleteProduct = (id, type) => {
    if (window.confirm(t('admin_confirm_delete'))) {
      if (type === 'perfume') {
        setPerfumes(dbDeleteProduct(id, 'perfume'));
      } else {
        setProducts(dbDeleteProduct(id, 'product'));
      }
    }
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    const item = {
      id: 'prod-' + Date.now(),
      name_fr: newTitle,
      name_en: newTitle,
      category: newCategory === 'perfume' ? 'unisex' : 'oil',
      price: parseFloat(newPrice) || 0,
      stock: parseInt(newStock) || 0,
      image: newImage,
      desc_fr: newDesc,
      desc_en: newDesc,
      type: newCategory === 'perfume' ? 'perfume' : 'product'
    };

    dbSaveProduct(item);
    loadDashboardData();
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewPrice('');
    setNewDesc('');
  };

  const handlePriceSave = (id, newPrice, type) => {
    if (type === 'perfume') {
      setPerfumes(dbUpdatePrice(id, newPrice, 'perfume'));
    } else {
      setProducts(dbUpdatePrice(id, newPrice, 'product'));
    }
  };

  const handleBraidPriceSave = (id, newPrice) => {
    const braid = braids.find(b => b.id === id);
    if (!braid) return;
    const updated = dbSaveBraid({ ...braid, price: newPrice });
    setBraids(braids.map(b => (b.id === id ? updated : b)));
  };

  const handleAddBraid = (e) => {
    e.preventDefault();
    const braid = {
      id: 'braid-' + Date.now(),
      title_fr: braidForm.title_fr,
      title_en: braidForm.title_fr,
      category: braidForm.category,
      price: parseFloat(braidForm.price) || 0,
      duration: braidForm.duration,
      image: braidForm.image,
      description_fr: braidForm.description_fr,
      description_en: braidForm.description_en,
      featured: braidForm.featured
    };
    const saved = dbSaveBraid(braid);
    setBraids([saved, ...braids]);
    setIsBraidModalOpen(false);
    setBraidForm({
      title_fr: '', title_en: '', category: 'knotless', price: '', duration: '',
      image: '/assets/', description_fr: '', description_en: '', featured: false
    });
  };

  const handleEditBraid = (e) => {
    e.preventDefault();
    if (!editingBraidId) return;
    const updated = dbSaveBraid({ id: editingBraidId, ...braidForm, title_en: braidForm.title_fr, price: parseFloat(braidForm.price) || 0 });
    setBraids(braids.map(b => (b.id === editingBraidId ? updated : b)));
    setIsBraidModalOpen(false);
    setEditingBraidId(null);
  };

  const handleDeleteBraid = (id) => {
    if (window.confirm(t('admin_confirm_delete_braid'))) {
      dbDeleteBraid(id);
      setBraids(braids.filter(b => b.id !== id));
    }
  };

  const pwdValidation = validatePassword(regPassword, {
    firstName: regFirstName,
    lastName: regLastName,
    email: regEmail
  });

  const getResStatusLabel = (status) => {
    if (status === 'confirmée') return t('admin_status_res_confirmed');
    if (status === 'annulée') return t('admin_status_res_cancelled');
    return t('admin_status_res_pending');
  };

  const getOrderStatusLabel = (status) => {
    if (status === 'validée') return t('admin_status_order_validated');
    if (status === 'refusée') return t('admin_status_order_refused');
    if (status === 'récupérée') return t('admin_status_order_collected');
    return t('admin_status_order_pending');
  };

  // SCENARIO A: NO ACCOUNT CREATED YET
  if (!accountExists) {
    return (
      <div style={{ paddingTop: '150px', paddingBottom: '100px', minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-card" style={{ maxWidth: '540px', width: '100%', padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(212, 175, 55, 0.15)', color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ShieldCheck size={32} />
            </div>
            <h2 className="font-serif text-gold" style={{ fontSize: '2.1rem', fontWeight: 700, marginBottom: '6px' }}>
              {t('admin_reg_title')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {t('admin_reg_subtitle')} <strong>{t('admin_reg_subtitle_strong')}</strong>
            </p>
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>{t('admin_reg_firstname')}</label>
                <input type="text" value={regFirstName} onChange={e => setRegFirstName(e.target.value)} required placeholder={t('admin_reg_firstname_ph')} style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>{t('admin_reg_lastname')}</label>
                <input type="text" value={regLastName} onChange={e => setRegLastName(e.target.value)} required placeholder={t('admin_reg_lastname_ph')} style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>{t('admin_reg_email')}</label>
              <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required placeholder={t('admin_reg_email_ph')} style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>{t('admin_reg_phone')}</label>
              <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} required placeholder={t('admin_reg_phone_ph')} style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>{t('admin_reg_password')}</label>
                <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required placeholder={t('admin_reg_password_ph')} style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>{t('admin_reg_confirm')}</label>
                <input type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} required placeholder={t('admin_reg_confirm_ph')} style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
              </div>
            </div>

            {regPassword.length > 0 && (
              <div style={{ backgroundColor: 'rgba(212,175,55,0.06)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div style={{ fontWeight: 700, color: 'var(--gold-light)', marginBottom: '6px' }}>{t('admin_reg_security_title')}</div>
                <div style={{ color: regPassword.length >= 8 ? '#22c55e' : '#ef4444' }}>{regPassword.length >= 8 ? '✓' : '✗'} {t('admin_reg_sec_length')}</div>
                <div style={{ color: !hasConsecutiveSequentialChars(regPassword) ? '#22c55e' : '#ef4444' }}>{!hasConsecutiveSequentialChars(regPassword) ? '✓' : '✗'} {t('admin_reg_sec_sequence')}</div>
                <div style={{ color: pwdValidation.isValid ? '#22c55e' : '#ef4444' }}>{pwdValidation.isValid ? '✓' : '✗'} {t('admin_reg_sec_personal')}</div>
                <div style={{ color: (regPassword === regConfirm && regConfirm.length > 0) ? '#22c55e' : '#ef4444' }}>{(regPassword === regConfirm && regConfirm.length > 0) ? '✓' : '✗'} {t('admin_reg_sec_match')}</div>
              </div>
            )}

            {regError && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', padding: '10px', borderRadius: '6px' }}>⚠️ {regError}</div>
            )}

            <button 
              type="submit" 
              disabled={isAuthLoading} 
              className="bg-gold-gradient" 
              style={{ width: '100%', padding: '14px', borderRadius: '30px', fontWeight: 700, fontSize: '0.95rem', marginTop: '10px', opacity: isAuthLoading ? 0.7 : 1, cursor: isAuthLoading ? 'not-allowed' : 'pointer' }}
            >
              {isAuthLoading ? t('admin_reg_submitting') : t('admin_reg_submit')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // SCENARIO B: ACCOUNT EXISTS BUT USER IS NOT LOGGED IN -> SHOW LOGIN SCREEN ONLY
  if (!currentSession) {
    return (
      <div style={{ paddingTop: '160px', paddingBottom: '100px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-card" style={{ maxWidth: '440px', width: '100%', padding: '36px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(212, 175, 55, 0.15)', color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Lock size={28} />
          </div>
          <h2 className="font-serif text-gold" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '6px' }}>
            {t('admin_login_title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            {t('admin_login_subtitle')}
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>{t('admin_login_email')}</label>
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
                placeholder={t('admin_reg_email_ph')}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>{t('admin_login_password')}</label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                placeholder={t('admin_login_password_ph')}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }}
              />
            </div>

            {loginError && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', padding: '10px', borderRadius: '6px' }}>
                ⚠️ {loginError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isAuthLoading} 
              className="bg-gold-gradient" 
              style={{ width: '100%', padding: '14px', borderRadius: '30px', fontWeight: 700, fontSize: '0.95rem', marginTop: '6px', opacity: isAuthLoading ? 0.7 : 1, cursor: isAuthLoading ? 'not-allowed' : 'pointer' }}
            >
              {isAuthLoading ? t('admin_login_submitting') : t('admin_login_submit')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // SCENARIO C: AUTHENTICATED ADMINISTRATOR -> FULL ACCESS TO DASHBOARD & NOTIFICATION BELL
  const totalRevenue = orders.filter(o => o.status !== 'refusée').reduce((sum, o) => sum + (o.total || 0), 0);
  const totalReservationsCount = reservations.length;
  const allProductsList = [...products.map(p => ({...p, itemType: 'product'})), ...perfumes.map(p => ({...p, itemType: 'perfume'}))];
  const lowStockItems = allProductsList.filter(p => p.stock < 5);

  return (
    <div style={{ paddingTop: '140px', paddingBottom: '100px' }}>
      <div className="section-container">
        {/* Header Bar with Notifications Bell */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '40px', position: 'relative' }}>
          <div>
            <div className="tag-badge" style={{ marginBottom: '8px' }}>
              <span>{t('admin_header_badge')}</span>
            </div>
            <h1 className="font-serif text-gold" style={{ fontSize: '2.4rem', fontWeight: 700 }}>
              {t('admin_welcome')} {adminAccount ? adminAccount.firstName : ''} {adminAccount ? adminAccount.lastName : ''}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Browser Push Notification Toggle */}
            {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
              <button
                onClick={handleEnableNotifications}
                style={{
                  padding: '10px 18px',
                  borderRadius: '30px',
                  backgroundColor: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  color: 'var(--gold-light)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Bell size={15} />
                <span>{t('admin_enable_alerts')}</span>
              </button>
            )}

            {/* Real-time Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsNotifPanelOpen(!isNotifPanelOpen)}
                style={{
                  position: 'relative',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: 'var(--gold-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Bell size={22} />
                {unreadNotifCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #0b0a0e'
                    }}
                  >
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Center Dropdown */}
              {isNotifPanelOpen && (
                <div
                  className="glass-card"
                  style={{
                    position: 'absolute',
                    top: '54px',
                    right: 0,
                    width: 'min(360px, calc(100vw - 40px))',
                    maxHeight: '420px',
                    overflowY: 'auto',
                    zIndex: 150,
                    padding: '20px',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.8)',
                    border: '1px solid rgba(212, 175, 55, 0.4)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '10px' }}>
                    <h4 className="font-serif text-gold" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                      {t('admin_realtime_title')}
                    </h4>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkNotifsRead}
                        style={{ background: 'none', border: 'none', color: 'var(--gold-light)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                      >
                        <CheckCheck size={14} />
                        <span>{t('admin_mark_all_read')}</span>
                      </button>
                    )}
                  </div>

                  {adminNotifs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px 0' }}>
                      {t('admin_notif_none')}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {adminNotifs.map(n => (
                        <div
                          key={n.id}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            backgroundColor: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(212, 175, 55, 0.12)',
                            borderLeft: n.read ? '3px solid transparent' : '3px solid var(--gold-primary)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{getNotifText(n, 'title', language)}</div>
                          <div style={{ color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '6px' }}>{getNotifText(n, 'message', language)}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gold-light)' }}>
                            ⏰ {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              style={{ padding: '10px 22px', borderRadius: '30px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <LogOut size={16} />
              <span>{t('admin_logout')}</span>
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '36px' }}>
          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(212, 175, 55, 0.15)', color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('admin_metric_bookings')}</div>
              <div className="font-serif text-gold" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{totalReservationsCount}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('admin_metric_revenue')}</div>
              <div className="font-serif text-gold" style={{ fontSize: '1.6rem', fontWeight: 700 }}>${totalRevenue.toFixed(2)}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('admin_metric_lowstock')}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ef4444' }}>{lowStockItems.length} {t('admin_metric_items')}</div>
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '14px', overflowX: 'auto' }}>
          <button
            onClick={() => setActiveTab('reservations')}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              fontWeight: 700,
              backgroundColor: activeTab === 'reservations' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)',
              color: activeTab === 'reservations' ? '#000' : 'var(--text-main)',
              border: activeTab === 'reservations' ? 'none' : '1px solid rgba(212,175,55,0.2)'
            }}
          >
            📋 {t('admin_tab_short_reservations')} ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              fontWeight: 700,
              backgroundColor: activeTab === 'products' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)',
              color: activeTab === 'products' ? '#000' : 'var(--text-main)',
              border: activeTab === 'products' ? 'none' : '1px solid rgba(212,175,55,0.2)'
            }}
          >
            📦 {t('admin_tab_short_products')} ({allProductsList.length})
          </button>
          <button
            onClick={() => setActiveTab('braids')}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              fontWeight: 700,
              backgroundColor: activeTab === 'braids' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)',
              color: activeTab === 'braids' ? '#000' : 'var(--text-main)',
              border: activeTab === 'braids' ? 'none' : '1px solid rgba(212,175,55,0.2)'
            }}
          >
            💇 {t('admin_tab_short_braids')} ({braids.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              fontWeight: 700,
              backgroundColor: activeTab === 'orders' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)',
              color: activeTab === 'orders' ? '#000' : 'var(--text-main)',
              border: activeTab === 'orders' ? 'none' : '1px solid rgba(212,175,55,0.2)'
            }}
          >
            🛒 {t('admin_tab_short_orders')} ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              fontWeight: 700,
              backgroundColor: activeTab === 'profile' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)',
              color: activeTab === 'profile' ? '#000' : 'var(--text-main)',
              border: activeTab === 'profile' ? 'none' : '1px solid rgba(212,175,55,0.2)'
            }}
          >
            👤 {t('admin_tab_short_profile')}
          </button>
        </div>

        {/* TAB 1: RESERVATIONS */}
        {activeTab === 'reservations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reservations.map(res => {
              const within24h = isReservationWithin24h(res);
              const reminderSent = hasReminderBeenSent(`res_24h_${res.id}`);
              const isCancelled = res.status === 'annulée';
              return (
                <div key={res.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span className="font-serif text-gold" style={{ fontWeight: 800 }}>{res.id}</span>
                      <span style={{ fontSize: '0.85rem', padding: '3px 10px', borderRadius: '12px', backgroundColor: res.status === 'confirmée' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)', color: res.status === 'confirmée' ? '#22c55e' : '#eab308', fontWeight: 700 }}>
                        {getResStatusLabel(res.status)}
                      </span>
                      {within24h && (
                        <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', backgroundColor: 'rgba(250, 204, 21, 0.15)', color: '#facc15', fontWeight: 700 }}>
                          {t('admin_reminder_24h_badge')}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '4px' }}>{res.braidTitle} (${res.price})</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      📅 {t('admin_res_date')} <strong>{res.date} {t('admin_res_at')} {res.time}</strong> | {t('admin_res_client')} <strong>{res.clientName}</strong> ({res.clientPhone}) | {t('admin_res_payment')} <strong>{res.paymentMethod.toUpperCase()}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    {!isCancelled && (
                      <span style={{ fontSize: '0.78rem', color: reminderSent ? '#22c55e' : 'var(--gold-light)', fontWeight: 700 }}>
                        {reminderSent ? t('admin_reminder_sent_badge') : t('admin_reminder_auto_note')}
                      </span>
                    )}

                    {res.status === 'en_attente' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleStatusChange(res.id, 'confirmée')} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={15} />
                          <span>{t('admin_btn_confirm')}</span>
                        </button>
                        <button onClick={() => handleStatusChange(res.id, 'annulée')} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <XCircle size={15} />
                          <span>{t('admin_btn_cancel')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: PRODUCTS & STOCKS */}
        {activeTab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className="font-serif text-gold" style={{ fontSize: '1.5rem' }}>{t('admin_products_title')}</h3>
              <button onClick={() => setIsAddModalOpen(true)} className="bg-gold-gradient" style={{ padding: '10px 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <Plus size={16} />
                <span>{t('admin_add_product')}</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {allProductsList.map(item => {
                const name = item.name_fr || item.name;
                return (
                  <div key={item.id} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: '160px', borderRadius: '8px', overflow: 'hidden', marginBottom: '14px', position: 'relative' }}>
                      <img src={item.image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: item.stock > 4 ? '#22c55e' : item.stock > 0 ? '#eab308' : '#ef4444', color: '#000', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                        {item.stock > 0 ? `${t('admin_stock_badge')}: ${item.stock}` : t('admin_stock_out')}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', color: '#fff' }}>{name}</h4>
                    <PriceEditor
                      price={Number(item.price)}
                      onSave={(p) => handlePriceSave(item.id, p, item.itemType)}
                    />
                    <div style={{ marginTop: '4px', marginBottom: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('admin_edit_price')}</div>

                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(212,175,55,0.15)', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('admin_stock_label')}</span>
                        <button onClick={() => handleStockChange(item.id, item.stock, -1, item.itemType)} style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }}>-</button>
                        <span style={{ fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>{item.stock}</span>
                        <button onClick={() => handleStockChange(item.id, item.stock, 1, item.itemType)} style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }}>+</button>
                      </div>

                      <button onClick={() => handleDeleteProduct(item.id, item.itemType)} style={{ color: '#ef4444', backgroundColor: 'transparent' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: BRAIDS */}
        {activeTab === 'braids' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className="font-serif text-gold" style={{ fontSize: '1.5rem' }}>{t('admin_braids_title')}</h3>
              <button
                onClick={() => { setEditingBraidId(null); setBraidForm({ title_fr: '', title_en: '', category: 'knotless', price: '', duration: '', image: '/assets/', description_fr: '', description_en: '', featured: false }); setIsBraidModalOpen(true); }}
                className="bg-gold-gradient"
                style={{ padding: '10px 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
              >
                <Plus size={16} />
                <span>{t('admin_add_braid')}</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {braids.map(b => {
                const name = language === 'en' ? b.title_en : b.title_fr;
                return (
                  <div key={b.id} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: '160px', borderRadius: '8px', overflow: 'hidden', marginBottom: '14px', position: 'relative' }}>
                      <img src={b.image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {b.featured && (
                        <span style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'var(--gold-primary)', color: '#000', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                          ★ {t('admin_modal_featured')}
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px', color: '#fff' }}>{name}</h4>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      {b.category} · ⏱ {b.duration}
                    </div>

                    <PriceEditor
                      price={Number(b.price)}
                      onSave={(p) => handleBraidPriceSave(b.id, p)}
                    />
                    <div style={{ marginTop: '4px', marginBottom: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('admin_edit_price')}</div>

                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(212,175,55,0.15)', paddingTop: '12px' }}>
                      <button
                        onClick={() => { setEditingBraidId(b.id); setBraidForm({ title_fr: b.title_fr || '', title_en: b.title_en || '', category: b.category || 'knotless', price: String(b.price ?? ''), duration: b.duration || '', image: b.image || '/assets/', description_fr: b.description_fr || '', description_en: b.description_en || '', featured: !!b.featured }); setIsBraidModalOpen(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gold-light)', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        <Edit size={15} />
                        <span>{t('admin_edit_braid')}</span>
                      </button>
                      <button onClick={() => handleDeleteBraid(b.id)} style={{ color: '#ef4444', backgroundColor: 'transparent' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {braids.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>{t('admin_braids_empty')}</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ORDERS */}
        {activeTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {orders.map(ord => {
              const statusColor = ord.status === 'validée' ? '#22c55e' : ord.status === 'refusée' ? '#ef4444' : ord.status === 'récupérée' ? '#38bdf8' : '#eab308';
              const statusBg = ord.status === 'validée' ? 'rgba(34, 197, 94, 0.15)' : ord.status === 'refusée' ? 'rgba(239, 68, 68, 0.15)' : ord.status === 'récupérée' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(234, 179, 8, 0.15)';
              const uncollected48h = isOrderUncollectedOver48h(ord);
              const reminderSent = hasReminderBeenSent(`order_48h_${ord.id}`);
              return (
                <div key={ord.id} className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span className="font-serif text-gold" style={{ fontWeight: 800 }}>{ord.id}</span>
                      <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px', backgroundColor: statusBg, color: statusColor, fontWeight: 700 }}>
                        {getOrderStatusLabel(ord.status)}
                      </span>
                      {uncollected48h && (
                        <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', backgroundColor: 'rgba(251, 146, 60, 0.15)', color: '#fb923c', fontWeight: 700 }}>
                          {t('admin_order_48h_badge')}
                        </span>
                      )}
                    </div>
                    <span style={{ color: 'var(--gold-light)', fontWeight: 700 }}>{t('admin_orders_total')} ${ord.total.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    {t('admin_res_client')} <strong>{ord.clientName}</strong> ({ord.clientPhone})
                  </div>
                  <div style={{ fontSize: '0.85rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', marginBottom: '14px' }}>
                    <strong>{t('admin_orders_items_label')}</strong>
                    {ord.items.map((i, idx) => (
                      <div key={idx} style={{ marginTop: '4px' }}>• {i.name} (x{i.quantity}) - ${i.price}</div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {ord.status === 'en_attente' && (
                      <>
                        <button onClick={() => handleOrderStatusChange(ord.id, 'validée')} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={15} />
                          <span>{t('admin_btn_validate_order')}</span>
                        </button>
                        <button onClick={() => handleOrderStatusChange(ord.id, 'refusée')} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <XCircle size={15} />
                          <span>{t('admin_btn_refuse')}</span>
                        </button>
                      </>
                    )}

                    {ord.status === 'validée' && (
                      <>
                        <span style={{ fontSize: '0.78rem', color: reminderSent ? '#22c55e' : '#fb923c', fontWeight: 700 }}>
                          {reminderSent ? t('admin_reminder_sent_badge') : t('admin_reminder_auto_note')}
                        </span>
                        <button onClick={() => handleMarkOrderCollected(ord.id)} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.35)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Package size={15} />
                          <span>{t('admin_status_collected')}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: OWNER ADMIN PROFILE */}
        {activeTab === 'profile' && adminAccount && (
          <div className="glass-card" style={{ maxWidth: '600px', padding: '30px' }}>
            <h3 className="font-serif text-gold" style={{ fontSize: '1.6rem', marginBottom: '20px' }}>{t('admin_profile_title')}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.95rem' }}>
              <div style={{ borderBottom: '1px solid rgba(212,175,55,0.15)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>{t('admin_profile_owner')}</span>
                <strong>{adminAccount.firstName} {adminAccount.lastName}</strong>
              </div>

              <div style={{ borderBottom: '1px solid rgba(212,175,55,0.15)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>{t('admin_profile_email')}</span>
                <strong>{adminAccount.email}</strong>
              </div>

              <div style={{ borderBottom: '1px solid rgba(212,175,55,0.15)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>{t('admin_profile_phone')}</span>
                <strong>{adminAccount.phone}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Add Product Modal */}
        {isAddModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
            <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '28px' }}>
              <h3 className="font-serif text-gold" style={{ fontSize: '1.6rem', marginBottom: '20px' }}>{t('admin_modal_title')}</h3>
              <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin_modal_name')}</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder={t('admin_modal_name_ph')} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin_modal_category')}</label>
                    <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#141219', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }}>
                      <option value="care">{t('admin_modal_cat_care')}</option>
                      <option value="perfume">{t('admin_modal_cat_perfume')}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin_modal_price')}</label>
                    <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} required placeholder="25.00" style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin_modal_stock')}</label>
                  <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                </div>

                <div>
                  <ImagePicker label={t('admin_modal_image')} value={newImage} onChange={setNewImage} />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin_modal_desc')}</label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}>{t('admin_modal_cancel')}</button>
                  <button type="submit" className="bg-gold-gradient" style={{ flex: 1, padding: '10px', borderRadius: '20px' }}>{t('admin_modal_save')}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      {isBraidModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
            <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '28px' }}>
              <h3 className="font-serif text-gold" style={{ fontSize: '1.6rem', marginBottom: '20px' }}>
                {editingBraidId ? t('admin_modal_edit_title_braid') : t('admin_modal_title_braid')}
              </h3>
              <form onSubmit={editingBraidId ? handleEditBraid : handleAddBraid} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin_modal_name_braid')}</label>
                  <input type="text" value={braidForm.title_fr} onChange={e => setBraidField('title_fr', e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin_modal_cat')}</label>
                    <select value={braidForm.category} onChange={e => setBraidField('category', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#141219', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }}>
                      <option value="knotless">Knotless</option>
                      <option value="box">Box Braids</option>
                      <option value="twists">Twists</option>
                      <option value="cornrows">Cornrows</option>
                      <option value="locs">Locs</option>
                      <option value="classic">Classic</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin_modal_price')}</label>
                      <input type="number" step="0.01" min="0" value={braidForm.price} onChange={e => setBraidField('price', e.target.value)} required placeholder="250.00" style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin_modal_duration')}</label>
                      <input type="text" value={braidForm.duration} onChange={e => setBraidField('duration', e.target.value)} placeholder="3h 30min" style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                    </div>
                  </div>
                </div>

                <div>
                  <ImagePicker label={t('admin_modal_image')} value={braidForm.image} onChange={(v) => setBraidField('image', v)} />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin_modal_desc_fr')}</label>
                  <textarea value={braidForm.description_fr} onChange={e => setBraidField('description_fr', e.target.value)} rows={2} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin_modal_desc_en')}</label>
                  <textarea value={braidForm.description_en} onChange={e => setBraidField('description_en', e.target.value)} rows={2} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!braidForm.featured} onChange={e => setBraidField('featured', e.target.checked)} style={{ accentColor: 'var(--gold-primary)' }} />
                  {t('admin_modal_featured')}
                </label>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => { setIsBraidModalOpen(false); setEditingBraidId(null); }} style={{ flex: 1, padding: '10px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}>{t('admin_modal_cancel')}</button>
                  <button type="submit" className="bg-gold-gradient" style={{ flex: 1, padding: '10px', borderRadius: '20px' }}>{t('admin_modal_save')}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
