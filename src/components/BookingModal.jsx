import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useClientAuth } from '../context/ClientAuthContext';
import { braidsData } from '../data/braidsData';
import { dbAddReservation } from '../services/db';
import { trackMyReference } from '../services/notifications';
import { X, CheckCircle2, Sparkles, Printer } from 'lucide-react';

export const BookingModal = ({ isOpen, onClose, preselectedBraid, navigateTo }) => {
  const { language, t } = useLanguage();
  const { clientUser, authLoading, authEnabled, requestAuth } = useClientAuth();

  const [step, setStep] = useState(1);
  const [selectedBraid, setSelectedBraid] = useState(braidsData[0]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00 AM');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [bookingRef, setBookingRef] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (preselectedBraid) {
      setSelectedBraid(preselectedBraid);
    }
  }, [preselectedBraid]);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setDate(dateStr);
  }, []);

  // Prefill booking info from the connected client account.
  useEffect(() => {
    if (!clientUser) return;
    setName(prev => prev || clientUser.fullName || clientUser.firstName || '');
    setPhone(prev => prev || clientUser.phone || '');
    setEmail(prev => prev || clientUser.email || '');
  }, [clientUser]);

  if (!isOpen) return null;

  const timeSlots = [
    '08:30 AM', '10:00 AM', '11:30 AM', '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();

    const performReservation = (profile) => {
      const saved = dbAddReservation({
        braidId: selectedBraid.id,
        braidTitle: language === 'fr' ? selectedBraid.title_fr : selectedBraid.title_en,
        price: selectedBraid.price,
        date,
        time,
        clientName: name,
        clientPhone: phone,
        clientEmail: email,
        clientUid: profile ? profile.uid : (clientUser ? clientUser.uid : undefined),
        notes,
        paymentMethod
      });

      setBookingRef(saved.id);
      setIsSuccess(true);

      // Remember this reservation on this device so we can alert the client
      // automatically (browser notification + toast) once the salon validates it.
      trackMyReference({
        referenceId: saved.id,
        type: 'reservation',
        label: language === 'fr' ? selectedBraid.title_fr : selectedBraid.title_en
      });
    };

    // Require a client account before confirming (distinct from the owner account).
    if (authEnabled && !authLoading && !clientUser) {
      requestAuth(performReservation);
    } else {
      performReservation(clientUser);
    }
  };

  const resetAndClose = () => {
    setIsSuccess(false);
    setStep(1);
    onClose();
  };

  const selectedTitle = language === 'fr' ? selectedBraid.title_fr : selectedBraid.title_en;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '32px',
          position: 'relative',
          border: '1px solid rgba(212, 175, 55, 0.4)'
        }}
      >
        <button
          onClick={resetAndClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: 'var(--text-main)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        {!isSuccess ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div className="tag-badge" style={{ marginBottom: '8px' }}>
                <Sparkles size={13} />
                <span>TOUBA NDINDY Salon</span>
              </div>
              <h2 className="font-serif text-gold" style={{ fontSize: '2rem', fontWeight: 700 }}>
                {t('booking_title')}
              </h2>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '32px',
                borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
                paddingBottom: '16px',
                fontSize: '0.82rem',
                fontWeight: 600
              }}
            >
              <span style={{ color: step >= 1 ? 'var(--gold-primary)' : 'var(--text-muted)' }}>{t('booking_step_1')}</span>
              <span style={{ color: step >= 2 ? 'var(--gold-primary)' : 'var(--text-muted)' }}>{t('booking_step_2')}</span>
              <span style={{ color: step >= 3 ? 'var(--gold-primary)' : 'var(--text-muted)' }}>{t('booking_step_3')}</span>
              <span style={{ color: step >= 4 ? 'var(--gold-primary)' : 'var(--text-muted)' }}>{t('booking_step_4')}</span>
            </div>

            <form onSubmit={handleSubmit}>
              {step === 1 && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-main)' }}>
                    {t('booking_select_service')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', paddingRight: '6px' }}>
                    {braidsData.map(braid => {
                      const title = language === 'fr' ? braid.title_fr : braid.title_en;
                      const isSelected = selectedBraid.id === braid.id;

                      return (
                        <div
                          key={braid.id}
                          onClick={() => setSelectedBraid(braid)}
                          style={{
                            padding: '14px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: isSelected ? '1px solid var(--gold-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          <img src={braid.image} alt={title} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>⏱ {braid.duration}</div>
                          </div>
                          <div className="font-serif text-gold" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                            ${braid.price}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="bg-gold-gradient"
                    style={{ width: '100%', padding: '14px', borderRadius: '30px', marginTop: '24px', fontSize: '0.95rem' }}
                  >
                    {t('booking_next_datetime')}
                  </button>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-muted)' }}>
                      📅 {t('booking_date_label')}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(212, 175, 55, 0.3)', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '10px', color: 'var(--text-muted)' }}>
                      ⏰ {t('booking_time_label')}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                      {timeSlots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setTime(slot)}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            backgroundColor: time === slot ? 'var(--gold-primary)' : 'rgba(255, 255, 255, 0.04)',
                            color: time === slot ? '#000' : 'var(--text-main)',
                            border: time === slot ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', borderRadius: '30px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>{t('common_back')}</button>
                    <button type="button" onClick={() => setStep(3)} className="bg-gold-gradient" style={{ flex: 2, padding: '12px', borderRadius: '30px' }}>{t('booking_next_info')}</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>👤 {t('booking_name_label')}</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Awa Diallo" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>📞 {t('booking_phone_label')}</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="Ex: 443-858-1400" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>✉️ {t('booking_email_label')}</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Ex: client@gmail.com" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>📝 {t('booking_notes_label')}</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setStep(2)} style={{ flex: 1, padding: '12px', borderRadius: '30px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>{t('common_back')}</button>
                    <button type="button" onClick={() => setStep(4)} className="bg-gold-gradient" disabled={!name || !phone || !email} style={{ flex: 2, padding: '12px', borderRadius: '30px', opacity: (!name || !phone || !email) ? 0.5 : 1 }}>{t('booking_next_payment')}</button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-main)' }}>{t('booking_payment_title')}</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                    <div onClick={() => setPaymentMethod('cash')} style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: paymentMethod === 'cash' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.03)', border: paymentMethod === 'cash' ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '1.5rem' }}>💵</span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{t('booking_pay_cash')}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('booking_pay_cash_desc')}</div>
                      </div>
                    </div>

                    <div onClick={() => setPaymentMethod('cashapp')} style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: paymentMethod === 'cashapp' ? 'rgba(0, 214, 50, 0.15)' : 'rgba(255,255,255,0.03)', border: paymentMethod === 'cashapp' ? '1px solid #00D632' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '1.5rem' }}>📲</span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#4ade80' }}>{t('booking_pay_cashapp')}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('booking_pay_cashapp_desc')}</div>
                      </div>
                    </div>

                    <div onClick={() => setPaymentMethod('zelle')} style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: paymentMethod === 'zelle' ? 'rgba(116, 20, 220, 0.18)' : 'rgba(255,255,255,0.03)', border: paymentMethod === 'zelle' ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '1.5rem' }}>⚡</span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#a78bfa' }}>{t('booking_pay_zelle')}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('booking_pay_zelle_desc')}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(212, 175, 55, 0.08)', border: '1px dashed rgba(212, 175, 55, 0.3)', marginBottom: '24px', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>{t('booking_summary_service')} <strong>{selectedTitle}</strong></span>
                      <span className="font-serif text-gold" style={{ fontWeight: 700 }}>${selectedBraid.price}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {t('booking_summary_date')} {date} | {t('booking_summary_time')} {time} | {t('booking_summary_client')} {name} ({phone})
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => setStep(3)} style={{ flex: 1, padding: '14px', borderRadius: '30px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>{t('common_back')}</button>
                    <button type="submit" className="bg-gold-gradient" style={{ flex: 2, padding: '14px', borderRadius: '30px', fontSize: '0.95rem' }}>{t('booking_confirm_btn')}</button>
                  </div>

                  {authEnabled && !authLoading && !clientUser && (
                    <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '10px', backgroundColor: 'rgba(212, 175, 55, 0.08)', border: '1px dashed rgba(212, 175, 55, 0.35)', fontSize: '0.82rem', color: 'var(--gold-light)', textAlign: 'center' }}>
                      🔐 {t('client_auth_required_note')}
                    </div>
                  )}
                  </div>
                )}
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid #22c55e' }}>
              <CheckCircle2 size={40} />
            </div>

            <h2 className="font-serif text-gold" style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '12px' }}>{t('booking_success_title')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>{t('booking_success_msg')}</p>

            <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: 'var(--radius-sm)', padding: '20px', textAlign: 'left', marginBottom: '28px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '10px', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('booking_ref')}</span>
                <span className="font-serif text-gold" style={{ fontWeight: 800, fontSize: '1.1rem' }}>{bookingRef}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                <div><strong>{t('booking_summary_service')}</strong> {selectedTitle}</div>
                <div><strong>{t('booking_summary_amount')}</strong> ${selectedBraid.price}</div>
                <div><strong>{t('booking_summary_date')}</strong> {date}</div>
                <div><strong>{t('booking_summary_time')}</strong> {time}</div>
                <div><strong>{t('booking_summary_client')}</strong> {name}</div>
                <div><strong>{t('booking_summary_payment')}</strong> {paymentMethod.toUpperCase()}</div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gold-light)', marginTop: '8px', borderTop: '1px dashed rgba(212,175,55,0.2)', paddingTop: '8px' }}>
                📍 TOUBA NDINDY - 306 North Eutaw Street, Baltimore MD 21201 | 📞 443-858-1400
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gold-light)', marginTop: '10px' }}>
                {t('booking_notif_alert')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => window.print()} style={{ padding: '12px 24px', borderRadius: '30px', backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-main)', border: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <Printer size={16} />
                <span>{t('common_print_receipt')}</span>
              </button>
              {navigateTo && (
                <button
                  onClick={() => {
                    const ref = bookingRef;
                    resetAndClose();
                    navigateTo('/tracking', ref);
                  }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '30px',
                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid var(--gold-primary)',
                    color: 'var(--gold-light)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t('booking_consult_tracking')}
                </button>
              )}
              <button onClick={resetAndClose} className="bg-gold-gradient" style={{ padding: '12px 30px', borderRadius: '30px', cursor: 'pointer', fontWeight: 700 }}>
                {t('common_close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
