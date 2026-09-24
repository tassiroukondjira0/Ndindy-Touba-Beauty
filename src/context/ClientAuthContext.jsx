import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  isFirebaseConfigured,
  auth,
  cloudGetClientProfile,
  cloudCreateClientProfile,
  cloudGetAdminAccount,
  cloudUpdateClientSession,
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

export const ClientAuthProvider = ({ children }) => {
  // Always rehydrate the session cached in this browser, so a client who signed
  // in once is recognised again as soon as the site is reopened.
  const [clientUser, setClientUser] = useState(() => getCachedSession());
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured());
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
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
      const p = { ...profile, uid: firebaseUser.uid };
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
      const profile = await resolveUserFromAuth(userCred.user);
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
      const profile = {
        uid: firebaseUser.uid,
        fullName,
        firstName: (fullName || '').trim().split(/\s+/)[0] || '',
        lastName: (fullName || '').trim().split(/\s+/).slice(1).join(' '),
        email: (email || '').trim().toLowerCase(),
        phone,
        role: 'client',
        createdAt: new Date().toISOString()
      };
      await cloudCreateClientProfile(firebaseUser.uid, profile);
      completeAuth(profile, true);
      return { success: true, profile };
    } catch (err) {
      console.warn("Client sign-up warning:", err);
      return { error: mapAuthError(err) };
    }
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