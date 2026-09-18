import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useClientAuth } from '../context/ClientAuthContext';
import { isValidEmail, validateClientPhone } from '../utils/validation';
import { X, User, Mail, Phone, Lock, LogIn, UserPlus, ShieldCheck } from 'lucide-react';

export const ClientAuthModal = () => {
  const { t } = useLanguage();
  const {
    authOpen,
    authMode,
    setAuthMode,
    closeAuth,
    signIn,
    signUp,
    authLoading
  } = useClientAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authOpen) return null;

  const switchMode = (mode) => {
    setError('');
    setAuthMode(mode);
  };

  const handleClose = () => {
    setError('');
    setPassword('');
    setConfirm('');
    closeAuth();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (authMode === 'register') {
      if (!name.trim()) {
        setError(t('client_error_name_required'));
        return;
      }
      if (!isValidEmail(email)) {
        setError(t('client_error_email_invalid'));
        return;
      }
      const phoneCheck = validateClientPhone(phone);
      if (!phoneCheck.isValid) {
        setError(
          phoneCheck.code === 'phone_us_invalid'
            ? t('client_error_phone_us')
            : phoneCheck.code === 'phone_country_invalid'
              ? t('client_error_phone_international')
              : phoneCheck.code === 'phone_unknown_country'
                ? t('client_error_phone_unknown')
                : t('client_error_phone_invalid')
        );
        return;
      }
      if (!password || password.length < 8) {
        setError(t('client_error_password_short'));
        return;
      }
      if (password !== confirm) {
        setError(t('client_error_password_mismatch'));
        return;
      }
    } else {
      if (!isValidEmail(email)) {
        setError(t('client_error_email_invalid'));
        return;
      }
      if (!password) {
        setError(t('client_error_generic'));
        return;
      }
    }

    setSubmitting(true);
    const phoneResult = authMode === 'register' ? validateClientPhone(phone) : null;
    const result =
      authMode === 'register'
        ? await signUp({
            fullName: name.trim(),
            email,
            phone: phoneResult ? phoneResult.formatted : phone.trim(),
            password
          })
        : await signIn(email, password);
    setSubmitting(false);

    if (result && result.error) {
      setError(t(result.error));
      return;
    }

    setPassword('');
    setConfirm('');
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px 12px 40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(212,175,55,0.3)',
    color: '#fff',
    fontSize: '0.9rem'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.82rem',
    marginBottom: '6px',
    color: 'var(--text-muted)'
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 350,
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
          maxWidth: '460px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '32px',
          position: 'relative',
          border: '1px solid rgba(212, 175, 55, 0.4)'
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: 'var(--text-main)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              color: 'var(--gold-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px'
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h2 className="font-serif text-gold" style={{ fontSize: '1.7rem', fontWeight: 700, marginBottom: '6px' }}>
            {t('client_auth_title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            {t('client_auth_subtitle')}
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '22px'
          }}
        >
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '9px',
              backgroundColor: authMode === 'login' ? 'var(--gold-primary)' : 'transparent',
              color: authMode === 'login' ? '#000' : 'var(--text-muted)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px'
            }}
          >
            <LogIn size={15} />
            <span>{t('client_tab_login')}</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '9px',
              backgroundColor: authMode === 'register' ? 'var(--gold-primary)' : 'transparent',
              color: authMode === 'register' ? '#000' : 'var(--text-muted)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px'
            }}
          >
            <UserPlus size={15} />
            <span>{t('client_tab_register')}</span>
          </button>
        </div>

        {authLoading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid rgba(212,175,55,0.3)', borderTopColor: 'var(--gold-primary)', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 12px' }} />
            <span>...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {authMode === 'register' && (
              <div>
                <label style={labelStyle}>👤 {t('client_field_name')}</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Amina Ndiaye"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>✉️ {t('client_field_email')}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Ex: client@gmail.com"
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            {authMode === 'register' && (
              <div>
                <label style={labelStyle}>📞 {t('client_field_phone')}</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Ex: 443-858-1400"
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                  {t('client_field_phone_hint')}
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>🔒 {t('client_field_password')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </div>
            </div>

            {authMode === 'register' && (
              <div>
                <label style={labelStyle}>🔒 {t('client_field_confirm')}</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    style={inputStyle}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                  lineHeight: 1.5
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="bg-gold-gradient"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '30px',
                fontSize: '0.95rem',
                cursor: 'pointer',
                opacity: submitting ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {submitting ? '...' : authMode === 'login' ? t('client_btn_login') : t('client_btn_register')}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.87rem', color: 'var(--text-muted)' }}>
              {authMode === 'login' ? (
                <>
                  {t('client_no_account')}{' '}
                  <button type="button" onClick={() => switchMode('register')} style={{ background: 'none', border: 'none', color: 'var(--gold-light)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                    {t('client_tab_register')}
                  </button>
                </>
              ) : (
                <>
                  {t('client_has_account')}{' '}
                  <button type="button" onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', color: 'var(--gold-light)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                    {t('client_tab_login')}
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};