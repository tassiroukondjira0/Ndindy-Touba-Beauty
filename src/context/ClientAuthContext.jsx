import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  isFirebaseConfigured,
  auth,
  cloudGetClientProfile,
  cloudCreateClientProfile,
  cloudGetAdminAccount,
  cloudUpdateClientSession,
  cloudSendEmailPasswordReset,
  cloudSendPhonePasswordReset,
  cloudVerifyPasswordResetCode,
  cloudConfirmPasswordReset,
  cloudSendEmailVerification,
  cloudRequestEmailVerification,
  cloudCheckEmailAction,
  cloudApplyEmailAction,
  authPersistenceReady
} from '../services/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { readStoredSession, refreshSession, writeSession } from '../services/session';
import { isValidEmail, validateClientPhone } from '../utils/validation';

const ClientAuthContext = createContext();

const CLIENT_SESSION_KEY = 'touba_ndindy_client_session';

const getCachedSession = () => {
  return readStoredSession(CLIENT_SESSION_KEY);
};

const persistSession = (profile) => {
  if (!profile) {
    localStorage.removeItem(CLIENT_SESSION_KEY);
    return;
  }
  const session = refreshSession(CLIENT_SESSION_KEY, profile);
  if (isFirebaseConfigured() && profile.uid) {
    cloudUpdateClientSession(profile.uid, session);
  }
  return session;
};

// Maps Firebase Auth errors to i18n keys.
const mapAuthError = (err) => {
  const code = err && err.code;
  switch (code) {
    case 'auth/email-already-in-use':
      return 'client_error_email_in_use';
    case 'auth/invalid-email':
      return 'client_error_email_invalid';
    case 'auth/weak-password':
      return 'client_error_password_short';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'client_error_wrong_credentials';
    case 'auth/network-request-failed':
      return 'client_error_network';
    default:
      return 'client_error_generic';
  }
};

// Maps password-reset failures to i18n keys. The reset link is generated and
// validated by Firebase Auth, so most of these describe the state of the link
// the user clicked rather than something they did wrong.
const mapResetError = (code) => {
  switch (code) {
    case 'auth/expired-action-code':
    case 'auth/invalid-verification-code':
      return 'client_reset_error_link_expired';
    case 'auth/weak-password':
      return 'client_error_password_short';
    case 'auth/missing-password':
      return 'client_reset_error_generic';
    case 'auth/network-request-failed':
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return 'client_error_network';
    case 'auth/too-many-requests':
    case 'functions/resource-exhausted':
      return 'client_reset_error_too_many_requests';
    case 'functions/not-found':
    case 'functions/function-not-found':
      // The phone lookup lives in a Cloud Function that may not be deployed yet.
      return 'client_reset_error_service_unavailable';
    default:
      return 'client_reset_error_generic';
  }
};

// Maps address-verification failures to i18n keys.
const mapVerificationError = (code) => {
  switch (code) {
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return 'client_verify_error_link_expired';
    case 'auth/requires-recent-login':
      return 'client_verify_error_recent_login';
    case 'auth/too-many-requests':
      return 'client_verify_error_too_many_requests';
    case 'auth/not-signed-in':
    case 'auth/user-not-found':
      return 'client_verify_error_not_signed_in';
    case 'auth/network-request-failed':
      return 'client_error_network';
    default:
      return 'client_verify_error_generic';
  }
};

// Normalises a phone number to digits so it can be matched against the stored
// 'phoneDigits' field regardless of the format the client typed it in.
const phoneToDigits = (value) => (value || '').replace(/\D/g, '');

/**
 * Reads the one-time code out of the link Firebase emailed. Depending on the
 * hosting setup it arrives either as a query parameter or inside the hash.
 */
export const readResetCodeFromUrl = () => {
  if (typeof window === 'undefined') return '';
  const search = new URLSearchParams(window.location.search);
  const fromQuery = search.get('oobCode') || '';
  if (fromQuery) return fromQuery;
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) return '';
  return new URLSearchParams(hash).get('oobCode') || '';
};

// Same as above, but also reports which kind of email action the link carries,
// so a verification link can be told apart from a password reset.
export const readEmailActionFromUrl = () => {
  if (typeof window === 'undefined') return { oobCode: '', mode: '' };
  const fromQuery = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const fromHash = hash ? new URLSearchParams(hash) : new URLSearchParams();
  return {
    oobCode: fromQuery.get('oobCode') || fromHash.get('oobCode') || '',
    mode: fromQuery.get('mode') || fromHash.get('mode') || ''
  };
};

// Drops the spent one-time code from the address bar, so a later reload does
// not reopen a reset form for a link that has already been used.
const clearResetCodeFromUrl = () => {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('oobCode');
    url.searchParams.delete('mode');
    if (url.hash.includes('oobCode')) url.hash = '';
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  } catch (e) {
    console.warn("Reset link cleanup warning:", e);
  }
};

export const ClientAuthProvider = ({ children }) => {
  // Always rehydrate the session cached in this browser, so a client who signed
  // in once is recognised again as soon as the site is reopened.
  const [clientUser, setClientUser] = useState(() => getCachedSession());
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured());
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  // One-time code carried by the emailed reset link, kept here so the modal can
  // show the "choose a new password" step as soon as the link is opened.
  const [pendingResetCode, setPendingResetCode] = useState('');
  const pendingResumeRef = useRef(null);

  // Keeps the client session cached in this browser alive: the same token is
  // reused and its expiry pushed back, so a client who signed in once is
  // recognised again on every visit until he explicitly signs out.
  const restoreCachedClient = (cached, firebaseUser) => {
    if (!cached || cached.role !== 'client') return null;
    if (firebaseUser && cached.uid && cached.uid !== firebaseUser.uid) return null;
    const renewed = firebaseUser ? { ...cached, uid: cached.uid || firebaseUser.uid } : cached;
    persistSession(renewed);
    return renewed;
  };

  const resolveUserFromAuth = useCallback(async (firebaseUser) => {
    const cached = getCachedSession();

    if (!firebaseUser) {
      // Firebase can emit a transient null state while restoring its persisted
      // browser session after a page reload. Keep the verified client cache
      // until an explicit sign-out clears it.
      return restoreCachedClient(cached, null);
    }

    // A client is identified exclusively by a profile in 'clientProfiles'.
    const profile = await cloudGetClientProfile(firebaseUser.uid);
    if (profile && profile.role !== 'admin') {
      // Firebase Auth is the source of truth for the confirmed-address flag, so
      // it always wins over the copy stored on the profile.
      const p = {
        ...profile,
        uid: firebaseUser.uid,
        email: profile.email || firebaseUser.email || '',
        emailVerified: Boolean(firebaseUser.emailVerified)
      };
      persistSession(p);
      return p;
    }

    // Owner's Firebase Auth account: it belongs to the salon owner (kept in the
    // 'admins' collection), so it must never be treated as a client session.
    const adminAccount = await cloudGetAdminAccount();
    if (adminAccount && adminAccount.uid && adminAccount.uid === firebaseUser.uid) {
      persistSession(null);
      return null;
    }

    // Restore a previously verified client session on this device. This also
    // covers a temporary Firestore/network failure — the profile lookups above
    // then return null — so an offline client is never signed out by mistake.
    const restored = restoreCachedClient(cached, firebaseUser);
    if (restored) return restored;

    // Fallback: authenticated but without a Firestore profile yet (e.g. a fresh
    // sign-up from another device whose profile write was blocked).
    const fallback = {
      uid: firebaseUser.uid,
      fullName: firebaseUser.displayName || (cached && cached.fullName) || '',
      email: firebaseUser.email || '',
      phone: (cached && cached.phone) || '',
      role: 'client'
    };
    persistSession(fallback);
    return fallback;
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      setAuthLoading(false);
      return () => {};
    }
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;
      const profile = await resolveUserFromAuth(firebaseUser);
      if (!active) return;
      setClientUser(profile);
      setAuthLoading(false);
    }, () => {
      if (!active) return;
      setAuthLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [resolveUserFromAuth]);

  const completeAuth = (profile, resume) => {
    persistSession(profile);
    setClientUser(profile);
    setAuthOpen(false);
    setAuthMode('login');
    const cb = pendingResumeRef.current;
    pendingResumeRef.current = null;
    if (cb && resume) cb(profile);
  };

  const signIn = async (email, password) => {
    if (!isFirebaseConfigured() || !auth) return { error: 'client_error_offline' };
    try {
      await authPersistenceReady;
      const userCred = await signInWithEmailAndPassword(auth, (email || '').trim().toLowerCase(), password);
      const firebaseUser = userCred.user;

      // A new account stays locked until the address is confirmed. The session
      // opened by signInWithEmailAndPassword is dropped again so the client
      // cannot reach any feature while their address is unproven.
      if (firebaseUser && firebaseUser.emailVerified === false) {
        // Read the flag directly instead of going through resolveUserFromAuth,
        // which would persist the session that is about to be rejected.
        const stored = await cloudGetClientProfile(firebaseUser.uid);
        if (stored && stored.verificationRequired) {
          // Re-send the link: the first one may have been lost or mistyped, and
          // without it the client has no way to finish signing up.
          try {
            await cloudSendEmailVerification(firebaseUser);
          } catch (e) {
            console.warn("Unverified re-send warning:", e);
          }
          // Cached session is cleared before the sign-out, otherwise the auth
          // state listener would restore the session it just observed.
          persistSession(null);
          try {
            await signOut(auth);
          } catch (e) {
            console.warn("Unverified sign-out warning:", e);
          }
          setClientUser(null);
          return { error: 'client_verify_required' };
        }
      }

      const profile = await resolveUserFromAuth(firebaseUser);
      completeAuth(profile, true);
      return { success: true, profile };
    } catch (err) {
      console.warn("Client sign-in warning:", err);
      return { error: mapAuthError(err) };
    }
  };

  const signUp = async ({ fullName, email, phone, password }) => {
    if (!isFirebaseConfigured() || !auth) return { error: 'client_error_offline' };
    try {
      await authPersistenceReady;
      const userCred = await createUserWithEmailAndPassword(auth, (email || '').trim().toLowerCase(), password);
      const firebaseUser = userCred.user;
      if (firebaseUser) {
        try {
          await updateProfile(firebaseUser, { displayName: fullName });
        } catch (e) {
          console.warn("Profile display name update warning:", e);
        }
      }
      const phoneCheck = validateClientPhone(phone);
      const formattedPhone = phoneCheck.isValid ? phoneCheck.formatted : (phone || '').trim();
      const profile = {
        uid: firebaseUser.uid,
        fullName,
        firstName: (fullName || '').trim().split(/\s+/)[0] || '',
        lastName: (fullName || '').trim().split(/\s+/).slice(1).join(' '),
        email: (email || '').trim().toLowerCase(),
        // Mirrors the Firebase Auth flag so the UI can prompt for confirmation
        // from the profile alone, before the Auth record is re-read.
        emailVerified: Boolean(firebaseUser.emailVerified),
        // Marks the account as one that must confirm its address before it can
        // sign in. Only set on new sign-ups, so accounts created before this
        // rule existed are never locked out by it.
        verificationRequired: true,
        phone: formattedPhone,
        // Digits-only copy so a later "forgot password" lookup by phone number is
        // a single indexed match instead of a scan over formatted variations.
        phoneDigits: phoneToDigits(formattedPhone),
        role: 'client',
        createdAt: new Date().toISOString()
      };
      await cloudCreateClientProfile(firebaseUser.uid, profile);

      // The confirmation email must be sent while the session created by
      // createUserWithEmailAndPassword is still open, since Firebase only allows
      // it for a signed-in user. It is therefore sent before signing out below.
      let verificationEmailSent = false;
      try {
        const sent = await cloudSendEmailVerification(firebaseUser);
        verificationEmailSent = Boolean(sent && sent.ok && !sent.alreadyVerified);
      } catch (e) {
        console.warn("Sign-up verification email warning:", e);
      }

      // Sign out straight away: the account must not be usable until the address
      // has been confirmed. The cached session is cleared first, otherwise the
      // auth state listener would restore the session it just observed.
      persistSession(null);
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("Sign-up sign-out warning:", e);
      }
      setClientUser(null);

      return { success: true, profile, verificationEmailSent };
    } catch (err) {
      console.warn("Client sign-up warning:", err);
      return { error: mapAuthError(err) };
    }
  };

  /**
   * Opens the "forgot password" step. A client only has to give the email
   * address or the phone number on their account: whichever is entered, the
   * reset link is delivered by email to the address registered on the account.
   *
   * The same neutral answer is returned whether the account exists or not, so
   * this can never be used to discover who is a customer of the salon.
   */
  const requestPasswordReset = async (identifier) => {
    if (!isFirebaseConfigured()) return { error: 'client_error_offline' };

    const value = (identifier || '').trim();
    if (!value) return { error: 'client_reset_error_identifier_required' };

    const looksLikeEmail = value.includes('@');
    let result;

    if (looksLikeEmail) {
      if (!isValidEmail(value)) return { error: 'client_error_email_invalid' };
      result = await cloudSendEmailPasswordReset(value);
      // No masked address is known for the email path: the user typed it.
      if (result.ok) return { success: true, maskedEmail: '' };
    } else {
      const phoneCheck = validateClientPhone(value);
      if (!phoneCheck.isValid) return { error: 'client_reset_error_phone_invalid' };
      result = await cloudSendPhonePasswordReset(phoneCheck.formatted);
      if (result.ok) return { success: true, maskedEmail: result.maskedEmail || '' };
    }

    return { error: mapResetError(result.error) };
  };

  /**
   * Handles the link the user just clicked: checks the one-time code is still
   * usable and, if so, opens the modal on the "choose a new password" step.
   */
  const openPasswordResetLink = async (oobCode) => {
    if (!oobCode) return { error: 'client_reset_error_link_invalid' };
    if (!isFirebaseConfigured()) return { error: 'client_error_offline' };

    setAuthLoading(true);
    const check = await cloudVerifyPasswordResetCode(oobCode);
    setAuthLoading(false);

    if (!check.ok) return { error: mapResetError(check.error) };

    // Open the modal first so the visitor immediately sees the new-password
    // form instead of a blank page while the link is being checked.
    setPendingResetCode(oobCode);
    setAuthMode('new-password');
    setAuthOpen(true);
    return { success: true, email: check.email };
  };

  /** Consumes the one-time code and stores the new password. */
  const applyNewPassword = async (newPassword) => {
    if (!pendingResetCode) return { error: 'client_reset_error_link_invalid' };
    const result = await cloudConfirmPasswordReset(pendingResetCode, newPassword);
    if (!result.ok) {
      const error = mapResetError(result.error);
      // The code is single-use: a failure means the link is spent, so the form
      // must not stay open pretending another attempt could succeed.
      if (error === 'client_reset_error_link_expired') {
        setPendingResetCode('');
        clearResetCodeFromUrl();
      }
      return { error };
    }
    setPendingResetCode('');
    clearResetCodeFromUrl();
    return { success: true };
  };

  /**
   * Emails the "confirm your address" message. A signed-in client goes through
   * the Firebase SDK; a client who just signed up has no session (they are
   * signed out on purpose), so the request goes to a Cloud Function instead.
   */
  const sendVerificationEmail = async (targetUser, fallbackEmail) => {
    if (!isFirebaseConfigured()) return { error: 'client_error_offline' };

    if (targetUser) {
      const result = await cloudSendEmailVerification(targetUser);
      if (!result.ok) return { error: mapVerificationError(result.error) };
      return { success: true, alreadyVerified: result.alreadyVerified };
    }

    const email = (fallbackEmail || (clientUser && clientUser.email) || '').trim();
    if (!email) return { error: 'client_error_offline' };
    const result = await cloudRequestEmailVerification(email);
    if (!result.ok) return { error: mapVerificationError(result.error) };
    return { success: true };
  };

  /**
   * Handles the link the user just clicked when it is an address verification
   * link. Firebase marks the address as confirmed; the user stays signed in.
   */
  const openVerificationLink = async (oobCode) => {
    if (!oobCode) return { error: 'client_verify_error_link_invalid' };
    if (!isFirebaseConfigured()) return { error: 'client_error_offline' };

    const check = await cloudCheckEmailAction(oobCode);
    if (!check.ok) {
      clearResetCodeFromUrl();
      return { error: mapVerificationError(check.error) };
    }

    if (check.mode !== 'verifyEmail') {
      // Not a verification link: hand it to the password reset flow instead.
      clearResetCodeFromUrl();
      return { error: 'client_verify_error_wrong_link' };
    }

    const applied = await cloudApplyEmailAction(oobCode);
    clearResetCodeFromUrl();

    if (!applied.ok) return { error: mapVerificationError(applied.error) };

    // Refresh the cached profile so the UI immediately shows the address as
    // confirmed without waiting for a full page reload.
    if (auth?.currentUser) {
      try {
        await auth.currentUser.reload();
        const refreshed = await resolveUserFromAuth(auth.currentUser);
        if (refreshed) setClientUser(refreshed);
      } catch (e) {
        console.warn("Verification profile refresh warning:", e);
      }
    }

    return { success: true, email: check.email };
  };

  const signOutClient = async () => {
    if (isFirebaseConfigured() && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("Client sign-out warning:", e);
      }
    }
    persistSession(null);
    setClientUser(null);
  };

  const openAuth = (initialMode = 'login') => {
    setAuthMode(initialMode);
    setAuthOpen(true);
  };

  const closeAuth = () => {
    setAuthOpen(false);
    pendingResumeRef.current = null;
  };

  /**
   * Gate helper: if a client is logged in (or auth is unavailable) the callback
   * runs immediately; otherwise it is deferred until the client signs in or
   * creates an account inside the auth modal, and receives the fresh profile.
   */
  const requestAuth = useCallback((callback) => {
    const canProceed = () => !isFirebaseConfigured() || Boolean(clientUser);
    if (canProceed()) {
      callback(clientUser);
      return true;
    }
    pendingResumeRef.current = callback;
    setAuthMode('login');
    setAuthOpen(true);
    return false;
  }, [clientUser]);

  return (
    <ClientAuthContext.Provider
      value={{
        clientUser,
        authLoading,
        authOpen,
        authMode,
        authEnabled: isFirebaseConfigured(),
        signIn,
        signUp,
        signOutClient,
        requestPasswordReset,
        openPasswordResetLink,
        applyNewPassword,
        pendingResetCode,
        sendVerificationEmail,
        openVerificationLink,
        openAuth,
        closeAuth,
        requestAuth,
        setAuthMode
      }}
    >
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
};