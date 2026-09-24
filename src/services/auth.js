import { 
  isFirebaseConfigured, 
  cloudGetAdminAccount, 
  cloudRegisterAdmin, 
  cloudLoginAdmin,
  cloudChangeAdminPassword,
  cloudUpdateAdminSession,
  auth
} from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { hasExpiredSession, readValidSession, writeSession } from './session';

const AUTH_STORAGE_KEY = 'touba_ndindy_admin_account';
const SESSION_STORAGE_KEY = 'touba_ndindy_admin_session';

export const ADMIN_SESSION_EVENT = 'touba_ndindy_admin_session_changed';

const notifyAdminSessionChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EVENT));
};

/**
 * Checks if an owner admin account already exists locally
 */
export const hasAdminAccount = () => {
  return localStorage.getItem(AUTH_STORAGE_KEY) !== null;
  // A temporary Firestore/network failure must not log out an admin whose
  // Firebase Auth session and local session are still valid.
  if (!cloudAdmin) return localSession;

};

/**
 * Asynchronously checks if admin account exists either in localStorage or in Firebase Cloud Firestore
 */
export const hasAdminAccountAsync = async () => {
  if (hasAdminAccount()) return true;
  if (isFirebaseConfigured()) {
    const cloudAccount = await cloudGetAdminAccount();
    if (cloudAccount) {
      // Sync to local cache
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(cloudAccount));
      return true;
    }
  }
  return false;
};

/**
 * Checks if a string contains 3 or more consecutive sequential characters
 * e.g. 123, 234, 789, abc, bcd, xyz, 321, cba, etc.
 */
export const hasConsecutiveSequentialChars = (str) => {
  const s = str.toLowerCase();
  if (s.length < 3) return false;

  for (let i = 0; i < s.length - 2; i++) {
    const code1 = s.charCodeAt(i);
    const code2 = s.charCodeAt(i + 1);
    const code3 = s.charCodeAt(i + 2);

    if (code2 === code1 + 1 && code3 === code2 + 1) {
      return true;
    }
    if (code2 === code1 - 1 && code3 === code2 - 1) {
      return true;
    }
  }
  return false;
};

/**
 * Validates the admin password according to strict security rules
 */
export const validatePassword = (password, ownerInfo = {}) => {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push("Le mot de passe doit contenir au moins 8 caractères.");
  }

  if (hasConsecutiveSequentialChars(password)) {
    errors.push("Le mot de passe ne doit pas contenir de suites consécutives (ex: 123, 234, abc, bcd, 321, cba).");
  }

  const pwdLower = (password || '').toLowerCase();
  const firstNameLower = (ownerInfo.firstName || '').trim().toLowerCase();
  const lastNameLower = (ownerInfo.lastName || '').trim().toLowerCase();
  const emailLower = (ownerInfo.email || '').trim().toLowerCase();
  const emailPrefix = emailLower.split('@')[0];

  if (firstNameLower && firstNameLower.length >= 2 && pwdLower.includes(firstNameLower)) {
    errors.push("Le mot de passe ne doit pas contenir votre prénom.");
  }

  if (lastNameLower && lastNameLower.length >= 2 && pwdLower.includes(lastNameLower)) {
    errors.push("Le mot de passe ne doit pas contenir votre nom de famille.");
  }

  if (emailPrefix && emailPrefix.length >= 3 && pwdLower.includes(emailPrefix)) {
    errors.push("Le mot de passe ne doit pas contenir votre identifiant email.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get saved admin account details
 */
export const getAdminAccount = () => {
  const data = localStorage.getItem(AUTH_STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const getAdminAccountAsync = async () => {
  let local = getAdminAccount();
  if (local) return local;

  if (isFirebaseConfigured()) {
    const cloudAccount = await cloudGetAdminAccount();
    if (cloudAccount) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(cloudAccount));
      return cloudAccount;
    }
  }
  return null;
};

/**
 * Register owner admin account (Synchronous fallback)
 */
export const registerAdminAccount = (accountData) => {
  if (hasAdminAccount()) {
    throw new Error("Un compte administrateur a déjà été créé. L'inscription unique est clôturée.");
  }

  const { firstName, lastName, email, phone, password } = accountData;

  const validation = validatePassword(password, { firstName, lastName, email });
  if (!validation.isValid) {
    throw new Error(validation.errors.join(' '));
  }

  const account = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    passwordHash: btoa(password),
    createdAt: new Date().toISOString()
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(account));
  
  // Auto login upon initial registration
  const session = {
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    loggedInAt: new Date().toISOString()
  };
  const savedSession = writeSession(SESSION_STORAGE_KEY, session);
  if (isFirebaseConfigured()) cloudUpdateAdminSession(savedSession);
  notifyAdminSessionChanged();

  if (isFirebaseConfigured()) {
    cloudRegisterAdmin(accountData).catch(err => console.warn("Background cloud admin registration:", err));
  }

  return account;
};

/**
 * Register owner admin account with async Cloud Firestore & Firebase Auth
 */
export const registerAdminAccountAsync = async (accountData) => {
  const alreadyExists = await hasAdminAccountAsync();
  if (alreadyExists) {
    throw new Error("Un compte administrateur a déjà été créé. L'inscription unique est clôturée.");
  }

  const { firstName, lastName, email, phone, password } = accountData;

  const validation = validatePassword(password, { firstName, lastName, email });
  if (!validation.isValid) {
    throw new Error(validation.errors.join(' '));
  }

  let account = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    passwordHash: btoa(password),
    createdAt: new Date().toISOString()
  };

  if (isFirebaseConfigured()) {
    try {
      const cloudResult = await cloudRegisterAdmin({
        ...accountData,
        email: email.trim().toLowerCase()
      });
      if (cloudResult) {
        account = { ...account, ...cloudResult };
      }
    } catch (e) {
      if (e.message === 'Un compte administrateur existe déjà.') {
        throw e;
      }
      console.warn("Cloud registration error:", e);
    }
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(account));
  
  const session = {
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    loggedInAt: new Date().toISOString()
  };
  const savedSession = writeSession(SESSION_STORAGE_KEY, session);
  if (isFirebaseConfigured()) cloudUpdateAdminSession(savedSession);
  notifyAdminSessionChanged();

  return account;
};

/**
 * Authenticate owner with email and password (supports Cloud Firestore & Firebase Auth)
 */
export const loginAdminAccount = (email, password) => {
  const account = getAdminAccount();
  if (!account) {
    throw new Error("Aucun compte administrateur n'a été configuré.");
  }

  const emailMatch = account.email.toLowerCase() === (email || '').trim().toLowerCase();
  const passwordMatch = account.passwordHash === btoa(password || '');

  if (!emailMatch || !passwordMatch) {
    throw new Error("Adresse email ou mot de passe incorrect.");
  }

  const session = {
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    loggedInAt: new Date().toISOString()
  };

  writeSession(SESSION_STORAGE_KEY, session);
  notifyAdminSessionChanged();
  return session;
};

export const loginAdminAccountAsync = async (email, password) => {
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. Check Cloud Firestore / Firebase Auth first if configured
  if (isFirebaseConfigured()) {
    try {
      const cloudAdmin = await cloudLoginAdmin(cleanEmail, password);
      if (cloudAdmin) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(cloudAdmin));
        const session = {
          email: cloudAdmin.email,
          firstName: cloudAdmin.firstName,
          lastName: cloudAdmin.lastName,
          loggedInAt: new Date().toISOString()
        };
        const savedSession = writeSession(SESSION_STORAGE_KEY, session);
        await cloudUpdateAdminSession(savedSession);
        notifyAdminSessionChanged();
        return session;
      }
    } catch (e) {
      console.warn("Cloud login warning:", e);
    }

    // Do not authenticate against a stale local admin record when the cloud
    // admin profile has been deleted.
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    notifyAdminSessionChanged();
    throw new Error("Ce compte administrateur n'existe pas.");
  }

  // 2. Fallback to local account check
  return loginAdminAccount(cleanEmail, password);
};

export const changeAdminPassword = async (currentPassword, newPassword) => {
  const account = await getAdminAccountAsync();
  if (!account) throw new Error("Aucun compte administrateur n'existe.");

  const validation = validatePassword(newPassword, account);
  if (!validation.isValid) throw new Error(validation.errors.join(' '));

  if (isFirebaseConfigured()) {
    const verifiedAdmin = await cloudLoginAdmin(account.email, currentPassword);
    if (!verifiedAdmin) throw new Error('Mot de passe actuel incorrect.');
    await cloudChangeAdminPassword(newPassword);
    const updatedAccount = { ...account, ...verifiedAdmin, passwordHash: btoa(newPassword) };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedAccount));
    return updatedAccount;
  }

  if (account.passwordHash !== btoa(currentPassword || '')) {
    throw new Error('Mot de passe actuel incorrect.');
  }

  const updatedAccount = { ...account, passwordHash: btoa(newPassword) };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedAccount));
  return updatedAccount;
};

/**
 * Get active session
 */
export const getCurrentAdminSession = () => {
  return readValidSession(SESSION_STORAGE_KEY);
};

export const restoreAdminSession = async () => {
  const expiredLocalSession = hasExpiredSession(SESSION_STORAGE_KEY);
  const localSession = getCurrentAdminSession();
  if (!isFirebaseConfigured() || !auth) return localSession;

  let firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    firebaseUser = await new Promise(resolve => {
      let unsubscribe = () => {};
      unsubscribe = onAuthStateChanged(auth, user => {
        unsubscribe();
        resolve(user);
      }, () => {
        unsubscribe();
        resolve(null);
      });
    });
  }

  if (!firebaseUser) return localSession;
  if (expiredLocalSession) {
    await signOut(auth).catch(() => {});
    notifyAdminSessionChanged();
    return null;
  }

  const cloudAdmin = await cloudGetAdminAccount();
  const sameAdmin = cloudAdmin &&
    (cloudAdmin.uid ? cloudAdmin.uid === firebaseUser.uid : true) &&
    (cloudAdmin.email || '').toLowerCase() === (firebaseUser.email || '').toLowerCase();

  if (!sameAdmin) return localSession;
  if (cloudAdmin.sessionToken && localSession?.sessionToken !== cloudAdmin.sessionToken) {
    await signOut(auth).catch(() => {});
    localStorage.removeItem(SESSION_STORAGE_KEY);
    notifyAdminSessionChanged();
    return null;
  }

  const session = {
    email: cloudAdmin.email,
    firstName: cloudAdmin.firstName || '',
    lastName: cloudAdmin.lastName || '',
    loggedInAt: localSession?.loggedInAt || new Date().toISOString()
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(cloudAdmin));
  const refreshedSession = writeSession(SESSION_STORAGE_KEY, session);
  await cloudUpdateAdminSession(refreshedSession);
  notifyAdminSessionChanged();
  return refreshedSession;
};

/**
 * Logout admin
 */
export const logoutAdminAccount = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  notifyAdminSessionChanged();
  if (isFirebaseConfigured() && auth) {
    try {
      signOut(auth).catch(() => {});
    } catch (e) {}
  }
};
