import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
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
  sendManualReservationReminder,
  sendManualOrderPickupReminder,
  isReservationWithin24h,
  isOrderUncollectedOver48h,
  hasReminderBeenSent
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
  CheckCheck
} from 'lucide-react';

export const AdminPage = () => {
  const { language, t } = useLanguage();
  
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
    setReservations(dbGetReservations());
    setOrders(dbGetOrders());
    setProducts(dbGetProducts());
    setPerfumes(dbGetPerfumes());

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
          showBrowserNotification(n.title, { body: n.message, tag: n.id });
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
      setRegError("Les mots de passe ne correspondent pas.");
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
    setReservations(dbUpdateReservationStatus(id, newStatus));
  };

  const handleOrderStatusChange = (id, newStatus) => {
    setOrders(dbUpdateOrderStatus(id, newStatus));
  };

  const handleSendReservationReminder = (res) => {
    sendManualReservationReminder(res);
    loadDashboardData();
  };

  const handleSendOrderReminder = (ord) => {
    sendManualOrderPickupReminder(ord);
    loadDashboardData();
  };

  const handleMarkOrderCollected = (id) => {
    setOrders(dbUpdateOrderStatus(id, 'récupérée'));
    loadDashboardData();
  };

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      showBrowserNotification('🔔 Notifications Activées', {
        body: 'Vous recevrez désormais une alerte instantanée pour chaque nouvelle réservation ou commande.'
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
    if (window.confirm('Voulez-vous vraiment supprimer ce produit ?')) {
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

  const pwdValidation = validatePassword(regPassword, {
    firstName: regFirstName,
    lastName: regLastName,
    email: regEmail
  });

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
              Création Unique du Compte Propriétaire
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Configurez les accès administrateur du salon TOUBA NDINDY. <strong>Cette inscription ne pourra être effectuée qu'une seule fois.</strong>
            </p>
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Prénom</label>
                <input type="text" value={regFirstName} onChange={e => setRegFirstName(e.target.value)} required placeholder="Ex: Fatou" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Nom de famille</label>
                <input type="text" value={regLastName} onChange={e => setRegLastName(e.target.value)} required placeholder="Ex: Diallo" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Adresse E-mail Administrateur</label>
              <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required placeholder="Ex: proprietaire@toubandindy.com" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Numéro de Téléphone</label>
              <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} required placeholder="Ex: 443-858-1400" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Mot de passe sécurisé</label>
                <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required placeholder="Min. 8 caractères" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Confirmation</label>
                <input type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} required placeholder="Confirmation" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
              </div>
            </div>

            {regPassword.length > 0 && (
              <div style={{ backgroundColor: 'rgba(212,175,55,0.06)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div style={{ fontWeight: 700, color: 'var(--gold-light)', marginBottom: '6px' }}>Critères de Sécurité Obligatoires :</div>
                <div style={{ color: regPassword.length >= 8 ? '#22c55e' : '#ef4444' }}>{regPassword.length >= 8 ? '✓' : '✗'} 8 caractères minimum</div>
                <div style={{ color: !hasConsecutiveSequentialChars(regPassword) ? '#22c55e' : '#ef4444' }}>{!hasConsecutiveSequentialChars(regPassword) ? '✓' : '✗'} Aucune suite consécutive (ex: 123, abc, 321)</div>
                <div style={{ color: pwdValidation.isValid ? '#22c55e' : '#ef4444' }}>{pwdValidation.isValid ? '✓' : '✗'} Exclut votre prénom, nom ou e-mail</div>
                <div style={{ color: (regPassword === regConfirm && regConfirm.length > 0) ? '#22c55e' : '#ef4444' }}>{(regPassword === regConfirm && regConfirm.length > 0) ? '✓' : '✗'} Mots de passe identiques</div>
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
              {isAuthLoading ? "Enregistrement sécurisé en cours..." : "Valider et Verrouiller l'Inscription Unique →"}
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
            Accès Réservé à l'Administrateur
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Veuillez vous connecter avec vos identifiants administrateur.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Adresse E-mail</label>
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
                placeholder="Ex: proprietaire@toubandindy.com"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Mot de Passe</label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                placeholder="Votre mot de passe"
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
              {isAuthLoading ? "Connexion en cours..." : "Se Connecter à la Gestion du Salon"}
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
              <span>Espace Administrateur Certifié</span>
            </div>
            <h1 className="font-serif text-gold" style={{ fontSize: '2.4rem', fontWeight: 700 }}>
              Bienvenue, {adminAccount ? adminAccount.firstName : ''} {adminAccount ? adminAccount.lastName : ''}
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
                <span>Activer les alertes navigateur</span>
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
                    width: '360px',
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
                      Notifications en Temps Réel
                    </h4>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkNotifsRead}
                        style={{ background: 'none', border: 'none', color: 'var(--gold-light)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                      >
                        <CheckCheck size={14} />
                        <span>Tout marquer lu</span>
                      </button>
                    )}
                  </div>

                  {adminNotifs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px 0' }}>
                      Aucune notification pour le moment.
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
                          <div style={{ fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{n.title}</div>
                          <div style={{ color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '6px' }}>{n.message}</div>
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
              <span>{language === 'fr' ? 'Se Déconnecter' : 'Log Out'}</span>
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
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{language === 'fr' ? 'Réservations de Tresses' : 'Braiding Bookings'}</div>
              <div className="font-serif text-gold" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{totalReservationsCount}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{language === 'fr' ? "Ventes & Chiffre d'Affaires" : "Sales & Revenue"}</div>
              <div className="font-serif text-gold" style={{ fontSize: '1.6rem', fontWeight: 700 }}>${totalRevenue.toFixed(2)}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{language === 'fr' ? 'Stock Faible (< 5)' : 'Low Stock (< 5)'}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ef4444' }}>{lowStockItems.length} {language === 'fr' ? 'articles' : 'items'}</div>
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
            📋 {language === 'fr' ? 'Réservations' : 'Bookings'} ({reservations.length})
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
            📦 {language === 'fr' ? 'Produits & Stock' : 'Products & Stock'} ({allProductsList.length})
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
            🛒 {language === 'fr' ? 'Commandes' : 'Orders'} ({orders.length})
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
            👤 {language === 'fr' ? 'Mon Profil Admin' : 'My Admin Profile'}
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
                        {res.status.toUpperCase()}
                      </span>
                      {within24h && (
                        <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', backgroundColor: 'rgba(250, 204, 21, 0.15)', color: '#facc15', fontWeight: 700 }}>
                          {t('admin_reminder_24h_badge')}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '4px' }}>{res.braidTitle} (${res.price})</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      📅 Date: <strong>{res.date} à {res.time}</strong> | Client: <strong>{res.clientName}</strong> ({res.clientPhone}) | Paiement: <strong>{res.paymentMethod.toUpperCase()}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    {!isCancelled && (
                      reminderSent ? (
                        <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 700 }}>{t('admin_reminder_sent_badge')}</span>
                      ) : (
                        <button onClick={() => handleSendReservationReminder(res)} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(212, 175, 55, 0.15)', color: 'var(--gold-light)', border: '1px solid rgba(212, 175, 55, 0.4)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Bell size={15} />
                          <span>{t('admin_reminder_24h_btn')}</span>
                        </button>
                      )
                    )}

                    {res.status === 'en_attente' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleStatusChange(res.id, 'confirmée')} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={15} />
                          <span>Confirmer</span>
                        </button>
                        <button onClick={() => handleStatusChange(res.id, 'annulée')} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <XCircle size={15} />
                          <span>Annuler</span>
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
              <h3 className="font-serif text-gold" style={{ fontSize: '1.5rem' }}>Stock & Inventaire du Salon</h3>
              <button onClick={() => setIsAddModalOpen(true)} className="bg-gold-gradient" style={{ padding: '10px 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <Plus size={16} />
                <span>Ajouter un Produit</span>
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
                        {item.stock > 0 ? `Stock: ${item.stock}` : 'Rupture'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', color: '#fff' }}>{name}</h4>
                    <div className="font-serif text-gold" style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '14px' }}>${item.price}</div>

                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(212,175,55,0.15)', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock :</span>
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

        {/* TAB 3: ORDERS */}
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
                        {ord.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {uncollected48h && (
                        <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', backgroundColor: 'rgba(251, 146, 60, 0.15)', color: '#fb923c', fontWeight: 700 }}>
                          {t('admin_order_48h_badge')}
                        </span>
                      )}
                    </div>
                    <span style={{ color: 'var(--gold-light)', fontWeight: 700 }}>Total: ${ord.total.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Client: <strong>{ord.clientName}</strong> ({ord.clientPhone})
                  </div>
                  <div style={{ fontSize: '0.85rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', marginBottom: '14px' }}>
                    <strong>Articles achetés:</strong>
                    {ord.items.map((i, idx) => (
                      <div key={idx} style={{ marginTop: '4px' }}>• {i.name} (x{i.quantity}) - ${i.price}</div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {ord.status === 'en_attente' && (
                      <>
                        <button onClick={() => handleOrderStatusChange(ord.id, 'validée')} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={15} />
                          <span>Valider la commande</span>
                        </button>
                        <button onClick={() => handleOrderStatusChange(ord.id, 'refusée')} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <XCircle size={15} />
                          <span>Refuser</span>
                        </button>
                      </>
                    )}

                    {ord.status === 'validée' && (
                      <>
                        {reminderSent ? (
                          <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 700 }}>{t('admin_reminder_sent_badge')}</span>
                        ) : (
                          <button onClick={() => handleSendOrderReminder(ord)} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(251, 146, 60, 0.15)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.4)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Bell size={15} />
                            <span>{t('admin_reminder_48h_btn')}</span>
                          </button>
                        )}
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
            <h3 className="font-serif text-gold" style={{ fontSize: '1.6rem', marginBottom: '20px' }}>Fiche Administrateur du Salon</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.95rem' }}>
              <div style={{ borderBottom: '1px solid rgba(212,175,55,0.15)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Nom & Prénom Propriétaire</span>
                <strong>{adminAccount.firstName} {adminAccount.lastName}</strong>
              </div>

              <div style={{ borderBottom: '1px solid rgba(212,175,55,0.15)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Adresse E-mail</span>
                <strong>{adminAccount.email}</strong>
              </div>

              <div style={{ borderBottom: '1px solid rgba(212,175,55,0.15)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Numéro de Téléphone</span>
                <strong>{adminAccount.phone}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Add Product Modal */}
        {isAddModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '28px' }}>
              <h3 className="font-serif text-gold" style={{ fontSize: '1.6rem', marginBottom: '20px' }}>Ajouter un Produit ou Parfum</h3>
              <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nom du produit</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="Ex: Huile de Chébé" style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Catégorie</label>
                    <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#141219', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }}>
                      <option value="care">Soins Cheveux & Corps</option>
                      <option value="perfume">Parfumerie</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Prix ($)</label>
                    <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} required placeholder="25.00" style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Stock initial</label>
                    <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>URL de l'image</label>
                    <input type="text" value={newImage} onChange={e => setNewImage(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Description</label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}>Annuler</button>
                  <button type="submit" className="bg-gold-gradient" style={{ flex: 1, padding: '10px', borderRadius: '20px' }}>Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
