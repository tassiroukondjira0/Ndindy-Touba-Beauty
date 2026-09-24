import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useClientAuth } from '../context/ClientAuthContext';
import { getClientDisplayName } from '../utils/clientName';
import { dbAddOrder } from '../services/db';
import { trackMyReference } from '../services/notifications';
import { X, Trash2, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';

export const CartDrawer = ({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem, onClearCart, navigateTo }) => {
  const { t } = useLanguage();
  const { clientUser, authLoading, authEnabled, requestAuth } = useClientAuth();
  const [isOrdered, setIsOrdered] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [orderRef, setOrderRef] = useState('');

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Prefill contact info from the connected client account.
  useEffect(() => {
    if (!clientUser) return;
    setClientName(prev => prev || getClientDisplayName(clientUser));
    setClientPhone(prev => prev || clientUser.phone || '');
  }, [clientUser]);

  const handleCheckout = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    const performOrder = (profile) => {
      const savedOrder = dbAddOrder({
        clientName: clientName || t('cart_anon'),
        clientPhone: clientPhone || 'N/A',
        clientEmail: profile ? profile.email : (clientUser ? clientUser.email : ''),
        clientUid: profile ? profile.uid : (clientUser ? clientUser.uid : undefined),
        total,
        items: cartItems
      });

      setOrderRef(savedOrder.id);

      // Remember this order on this device so we can alert the client
      // automatically (browser notification + toast) once the salon validates it.
      trackMyReference({
        referenceId: savedOrder.id,
        type: 'order',
        label: `${t('cart_order_of')} ${cartItems.length} ${t('cart_article_s')}`
      });

      setIsOrdered(true);
      onClearCart();
      window.dispatchEvent(new Event('storage'));
    };

    // Require a client account before confirming (distinct from the owner account).
    if (authEnabled && !authLoading && !clientUser) {
      requestAuth(performOrder);
    } else {
      performOrder(clientUser);
    }
  };

  const handleCloseSuccess = () => {
    setIsOrdered(false);
    setClientName('');
    setClientPhone('');
    setOrderRef('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'flex-end'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '450px',
          height: '100%',
          borderRadius: 0,
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderLeft: '1px solid rgba(212, 175, 55, 0.3)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '20px', borderBottom: '1px solid rgba(212, 175, 55, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={22} color="var(--gold-primary)" />
            <h3 className="font-serif text-gold" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {t('cart_title')} ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})
            </h3>
          </div>
          <button onClick={onClose} style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', border: 'none', color: 'var(--text-main)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {!isOrdered ? (
          <>
            {cartItems.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <ShoppingBag size={54} strokeWidth={1.2} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p style={{ fontSize: '1.1rem' }}>{t('cart_empty')}</p>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto', margin: '20px 0', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {cartItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
                      <img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '4px' }}>{item.name}</div>
                        <div className="font-serif text-gold" style={{ fontWeight: 700 }}>${item.price.toFixed(2)}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}>-</button>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}>+</button>
                      </div>

                      <button onClick={() => onRemoveItem(item.id)} style={{ backgroundColor: 'transparent', color: '#ef4444', marginLeft: '6px' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleCheckout} style={{ borderTop: '1px solid rgba(212, 175, 55, 0.2)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder={t('cart_name_placeholder')}
                    required
                    style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff', fontSize: '0.88rem' }}
                  />
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder={t('cart_phone_placeholder')}
                    required
                    style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff', fontSize: '0.88rem' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, margin: '6px 0' }}>
                    <span>{t('cart_total')}</span>
                    <span className="font-serif text-gold">${total.toFixed(2)}</span>
                  </div>

                  <button
                    type="submit"
                    className="bg-gold-gradient"
                    style={{ width: '100%', padding: '14px', borderRadius: '30px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                  >
                    <span>{t('cart_checkout_btn')}</span>
                    <ArrowRight size={18} />
                  </button>

                  {authEnabled && !authLoading && !clientUser && (
                    <div style={{ padding: '11px 14px', borderRadius: '10px', backgroundColor: 'rgba(212, 175, 55, 0.08)', border: '1px dashed rgba(212, 175, 55, 0.35)', fontSize: '0.8rem', color: 'var(--gold-light)', textAlign: 'center' }}>
                      🔐 {t('client_auth_required_note')}
                    </div>
                  )}
                </form>
              </>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '2px solid #22c55e' }}>
              <CheckCircle2 size={36} />
            </div>
            <h3 className="font-serif text-gold" style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '10px' }}>{t('cart_order_placed')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '16px' }}>{t('checkout_success')}</p>
            {orderRef && (
              <div style={{ padding: '14px 20px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(212, 175, 55, 0.08)', border: '1px dashed rgba(212, 175, 55, 0.3)', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('cart_order_ref')}</div>
                <div className="font-serif text-gold" style={{ fontWeight: 800, fontSize: '1.15rem' }}>{orderRef}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gold-light)', marginTop: '8px' }}>
                  {t('cart_order_notif')}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              {navigateTo && (
                <button
                  onClick={() => {
                    const ref = orderRef;
                    handleCloseSuccess();
                    navigateTo('/tracking', ref);
                  }}
                  className="bg-gold-gradient"
                  style={{
                    padding: '12px 20px',
                    borderRadius: '24px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  {t('booking_consult_tracking')}
                </button>
              )}
              <button
                onClick={handleCloseSuccess}
                style={{
                  padding: '10px 20px',
                  borderRadius: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                {t('common_close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
