import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useClientAuth } from '../context/ClientAuthContext';
import { isValidEmail, validateClientPhone } from '../utils/validation';
import {
  X, User, Mail, Phone, Lock, LogIn, UserPlus, ShieldCheck,
  KeyRound, Send, CheckCircle2, ArrowLeft, Eye, EyeOff, MailCheck, BadgeCheck
} from 'lucide-react';

export const ClientAuthModal = () => {
  const { t } = useLanguage();
  const {
    authOpen,
    authMode,
    setAuthMode,
    closeAuth,
    openAuth,
    signIn,
    signUp,
    requestPasswordReset,
    applyNewPassword,
    authLoading,
    clientUser,
    sendVerificationEmail
  } = useClientAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetMaskedEmail, setResetMaskedEmail] = useState('');
  const [resetDone, setResetDone] = useState(false);
  // Whether the typed password is shown in clear. Reset on every mode change so
  // a password never stays visible when the form is left behind.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  // Kept locally because the client is signed out on registration, so there is
  // no clientUser to read the address from.
  const [registerEmail, setRegisterEmail] = useState('');
  // Sign-in was refused for an unconfirmed address: keep the resend button on
  // the login step itself.
  const [verifyBlocked, setVerifyBlocked] = useState(false);

  if (!authOpen) return null;

  // Firebase flags the address as verified on the Auth record; the profile copy
  // in Firestore may lag behind, so the Auth value is the one to trust.
  const needsEmailVerification = Boolean(clientUser && clientUser.email && clientUser.emailVerified === false);
  const emailAlreadyVerified = Boolean(clientUser && clientUser.emailVerified === true);

  const handleSendVerification = async (forEmail) => {
    setVerifyError('');
    setVerifyNotice('');
    setVerifySending(true);
    const result = await sendVerificationEmail(null, forEmail);
    setVerifySending(false);
    if (result && result.error) {
      setVerifyError(t(result.error));
      return;
    }
    setVerifyNotice(t(result.alreadyVerified ? 'client_verify_already_ok' : 'client_verify_sent'));
  };

  const isRecovery = authMode === 'forgot' || authMode === 'new-password';
  const isRegisterDone = authMode === 'register-done';
  // These steps replace the whole form, so the shared sign in / sign up fields
  // are hidden entirely and the submit handler ignores them.
  const isStandaloneStep = isRecovery || isRegisterDone;

  const switchMode = (mode) => {
    setError('');
    setResetSent(false);
    setResetDone(false);
    setShowPassword(false);
    setShowConfirm(false);
    setVerifyBlocked(false);
    setVerifyNotice('');
    setAuthMode(mode);
  };

  const handleClose = () => {
    setError('');
    setPassword('');
    setConfirm('');
    setShowPassword(false);
    setShowConfirm(false);
    closeAuth();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // The confirmation step has no form of its own; pressing Enter must not
    // fall through to the sign-in branch.
    if (isStandaloneStep && authMode !== 'forgot' && authMode !== 'new-password') return;

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
    } else if (authMode === 'forgot') {
      const identifier = resetIdentifier.trim();
      if (!identifier) {
        setError(t('client_reset_error_identifier_required'));
        return;
      }
      if (identifier.includes('@') && !isValidEmail(identifier)) {
        setError(t('client_error_email_invalid'));
        return;
      }
      if (!identifier.includes('@') && !validateClientPhone(identifier).isValid) {
        setError(t('client_reset_error_phone_invalid'));
        return;
      }

      setSubmitting(true);
      const result = await requestPasswordReset(identifier);
      setSubmitting(false);

      if (result && result.error) {
        setError(t(result.error));
        return;
      }
      setResetMaskedEmail(result.maskedEmail || '');
      setResetSent(true);
      return;
    } else if (authMode === 'new-password') {
      if (!password || password.length < 8) {
        setError(t('client_error_password_short'));
        return;
      }
      if (password !== confirm) {
        setError(t('client_error_password_mismatch'));
        return;
      }

      setSubmitting(true);
      const result = await applyNewPassword(password);
      setSubmitting(false);

      if (result && result.error) {
        setError(t(result.error));
        return;
      }
      setPassword('');
      setConfirm('');
      setResetDone(true);
      return;
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
      // Signing in is refused until the address is confirmed. The banner above the
      // form carries that message, so it is not repeated in the error slot; a
      // fresh link has just been emailed, hence the resend button.
      if (result.error === 'client_verify_required') {
        setError('');
        setPassword('');
        setVerifyNotice(t('client_verify_required_resent'));
        setVerifyBlocked(true);
        return;
      }
      setError(t(result.error));
      return;
    }

    setPassword('');
    setConfirm('');

    // Signing up does NOT open a session: the client must confirm their address
    // first. The modal reopens on a dedicated step that tells them to, and to
    // come back and sign in afterwards.
    if (authMode === 'register') {
      setRegisterEmail(email.trim().toLowerCase());
      setVerifyBlocked(false);
      setVerifyNotice('');
      setVerifyError('');
      openAuth('register-done');
    }
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

  // Password inputs carry an extra right padding to leave room for the
  // show/hide button, which sits on top of the field.
  const passwordInputStyle = { ...inputStyle, paddingRight: '44px' };

  const revealButtonStyle = {
    position: 'absolute',
    right: '6px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px'
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
            {isRecovery ? <KeyRound size={28} /> : isRegisterDone ? <BadgeCheck size={28} /> : <ShieldCheck size={28} />}
          </div>
          <h2 className="font-serif text-gold" style={{ fontSize: '1.7rem', fontWeight: 700, marginBottom: '6px' }}>
            {isRecovery ? t('client_reset_title') : isRegisterDone ? t('client_register_done_title') : t('client_auth_title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            {isRecovery ? t('client_reset_subtitle') : isRegisterDone ? t('client_register_done_subtitle') : t('client_auth_subtitle')}
          </p>
        </div>

        {/* Tabs, hidden during password recovery so the recovery steps read as
            a separate journey from sign in / sign up. */}
        {!isStandaloneStep && (
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
        )}

        {/* Address verification. Shown above the tabs so it stays visible
            whichever step is open: either to a signed-in client with an
            unconfirmed address, or on the login step after a sign-in attempt
            was refused for that same reason. The registration step shows its
            own copy instead. */}
        {!isRegisterDone && (needsEmailVerification || verifyBlocked || verifyNotice || verifyError) && (
          <div
            style={{
              padding: '13px 15px',
              borderRadius: '12px',
              backgroundColor: verifyError ? 'rgba(239, 68, 68, 0.12)' : 'rgba(212, 175, 55, 0.12)',
              border: `1px solid ${verifyError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(212, 175, 55, 0.4)'}`,
              marginBottom: '20px',
              fontSize: '0.83rem',
              lineHeight: 1.55
            }}
          >
            <div
              style={{
                color: verifyError ? '#fca5a5' : 'var(--gold-light)',
                fontWeight: 700,
                marginBottom: verifyNotice || verifyError ? '8px' : 0,
                display: 'flex',
                alignItems: 'center',
                gap: '7px'
              }}
            >
              {emailAlreadyVerified
                ? <BadgeCheck size={15} />
                : <MailCheck size={15} />}
              {emailAlreadyVerified ? t('client_verify_done_title') : t('client_verify_title')}
            </div>

            {(needsEmailVerification || verifyBlocked) && !verifyNotice && !verifyError && (
              <p style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>
                {verifyBlocked ? t('client_verify_required_desc') : t('client_verify_desc')}
              </p>
            )}

            {verifyNotice && (
              <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>{verifyNotice}</p>
            )}
            {verifyError && (
              <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>{verifyError}</p>
            )}

            {/* Stays available after a refused sign-in, because the whole point
                is that the client may never have received the first link. For a
                signed-in client it disappears once a link is sent, to avoid
                sending several in a row. */}
            {((needsEmailVerification || verifyBlocked) && (!verifyNotice || verifyBlocked)) && (
              <button
                type="button"
                onClick={() => handleSendVerification(verifyBlocked ? email : undefined)}
                disabled={verifySending || (verifyBlocked && !email)}
                style={{
                  marginTop: '10px',
                  background: 'var(--gold-primary)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: verifySending ? 'default' : 'pointer',
                  opacity: verifySending ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Send size={14} />
                {verifySending ? '...' : t('client_verify_btn_send')}
              </button>
            )}
          </div>
        )}

        {authLoading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid rgba(212,175,55,0.3)', borderTopColor: 'var(--gold-primary)', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 12px' }} />
            <span>...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isRegisterDone && (
              <>
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                    border: '1px solid rgba(74, 222, 128, 0.35)',
                    color: '#86efac',
                    fontSize: '0.86rem',
                    lineHeight: 1.6
                  }}
                >
                  {t('client_register_done_body')}
                </div>

                {registerEmail && (
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    {t('client_register_done_sent_to')}{' '}
                    <strong style={{ color: 'var(--gold-light)' }}>{registerEmail}</strong>
                  </div>
                )}

                {verifyNotice && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(74, 222, 128, 0.1)',
                      border: '1px solid rgba(74, 222, 128, 0.35)',
                      color: '#86efac',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      textAlign: 'center'
                    }}
                  >
                    {verifyNotice}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleSendVerification(registerEmail)}
                  disabled={verifySending || !registerEmail}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '30px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: verifySending ? 'default' : 'pointer',
                    opacity: verifySending ? 0.6 : 1,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(212,175,55,0.35)',
                    color: 'var(--gold-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Send size={15} />
                  {verifySending ? '...' : t('client_register_done_resend')}
                </button>

                {verifyError && (
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
                    {verifyError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="bg-gold-gradient"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '30px',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <LogIn size={16} />
                  {t('client_register_done_continue')}
                </button>
              </>
            )}

            {authMode === 'forgot' && !resetSent && (
              <>
                <div>
                  <label style={labelStyle}>✉️ {t('client_reset_field_identifier')}</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={resetIdentifier}
                      onChange={e => setResetIdentifier(e.target.value)}
                      placeholder="client@gmail.com / 443-858-1400"
                      style={inputStyle}
                      autoComplete="username"
                      required
                    />
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                    {t('client_reset_field_hint')}
                  </div>
                </div>
              </>
            )}

            {authMode === 'forgot' && resetSent && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(74, 222, 128, 0.15)',
                    border: '1px solid rgba(74, 222, 128, 0.4)',
                    color: '#4ade80',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px'
                  }}
                >
                  <CheckCircle2 size={26} />
                </div>
                <p style={{ color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '6px' }}>
                  {t('client_reset_sent')}
                </p>
                {resetMaskedEmail && (
                  <p style={{ color: 'var(--gold-light)', fontSize: '0.88rem', fontWeight: 700, marginBottom: '10px' }}>
                    {resetMaskedEmail}
                  </p>
                )}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                  {t('client_reset_sent_hint')}
                </p>
              </div>
            )}

            {authMode === 'new-password' && !resetDone && (
              <>
                <div>
                  <label style={labelStyle}>🔒 {t('client_reset_field_new_password')}</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={passwordInputStyle}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={revealButtonStyle}
                      title={showPassword ? t('client_hide_password') : t('client_show_password')}
                      aria-label={showPassword ? t('client_hide_password') : t('client_show_password')}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>🔒 {t('client_field_confirm')}</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      style={passwordInputStyle}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      style={revealButtonStyle}
                      title={showConfirm ? t('client_hide_password') : t('client_show_password')}
                      aria-label={showConfirm ? t('client_hide_password') : t('client_show_password')}
                    >
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {authMode === 'new-password' && resetDone && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(74, 222, 128, 0.15)',
                    border: '1px solid rgba(74, 222, 128, 0.4)',
                    color: '#4ade80',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px'
                  }}
                >
                  <CheckCircle2 size={26} />
                </div>
                <p style={{ color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  {t('client_reset_done')}
                </p>
              </div>
            )}

            {!isStandaloneStep && authMode === 'register' && (
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

            {!isStandaloneStep && (
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
            )}

            {!isStandaloneStep && authMode === 'register' && (
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

            {!isStandaloneStep && (
              <div>
                <label style={labelStyle}>🔒 {t('client_field_password')}</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={passwordInputStyle}
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={revealButtonStyle}
                    title={showPassword ? t('client_hide_password') : t('client_show_password')}
                    aria-label={showPassword ? t('client_hide_password') : t('client_show_password')}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            )}

            {!isStandaloneStep && authMode === 'register' && (
              <div>
                <label style={labelStyle}>🔒 {t('client_field_confirm')}</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    style={passwordInputStyle}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    style={revealButtonStyle}
                    title={showConfirm ? t('client_hide_password') : t('client_show_password')}
                    aria-label={showConfirm ? t('client_hide_password') : t('client_show_password')}
                  >
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
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

            {!(authMode === 'forgot' && resetSent) && !(authMode === 'new-password' && resetDone) && !isRegisterDone && (
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
                {submitting
                  ? '...'
                  : authMode === 'forgot'
                    ? <><Send size={16} />{t('client_reset_btn_send')}</>
                    : authMode === 'new-password'
                      ? <><KeyRound size={16} />{t('client_reset_btn_save')}</>
                      : authMode === 'login'
                        ? t('client_btn_login')
                        : t('client_btn_register')}
              </button>
            )}

            {/* Recovery screens always offer a way back to sign in. */}
            {isRecovery && (
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gold-light)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '0.87rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ArrowLeft size={15} />
                  {t('client_reset_back_to_login')}
                </button>
              </div>
            )}

            {authMode === 'forgot' && resetSent && (
              <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => { setResetSent(false); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--gold-light)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}
                >
                  {t('client_reset_resend')}
                </button>
              </div>
            )}

            {authMode === 'new-password' && resetDone && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="bg-gold-gradient"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '30px',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {t('client_btn_login')}
              </button>
            )}

            {!isStandaloneStep && (
              <div style={{ textAlign: 'center', fontSize: '0.87rem', color: 'var(--text-muted)' }}>
                {authMode === 'login' ? (
                  <>
                    {t('client_no_account')}{' '}
                    <button type="button" onClick={() => switchMode('register')} style={{ background: 'none', border: 'none', color: 'var(--gold-light)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                      {t('client_tab_register')}
                    </button>
                    <div style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        style={{ background: 'none', border: 'none', color: 'var(--gold-light)', cursor: 'pointer', fontSize: '0.83rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <KeyRound size={14} />
                        {t('client_forgot_link')}
                      </button>
                    </div>
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
            )}
          </form>
        )}
      </div>
    </div>
  );
};