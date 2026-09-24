const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const createToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

export const createSession = (profile = {}) => {
  const now = Date.now();
  return {
    ...profile,
    sessionToken: createToken(),
    lastActiveAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_DURATION_MS).toISOString()
  };
};

export const readValidSession = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const expiresAt = new Date(session.expiresAt || 0).getTime();
    if (!session.sessionToken || !expiresAt || expiresAt <= Date.now()) {
      localStorage.removeItem(storageKey);
      return null;
    }

    const refreshed = {
      ...session,
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(refreshed));
    return refreshed;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
};

export const readStoredSession = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
};

export const hasExpiredSession = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;
    const session = JSON.parse(raw);
    return !session.sessionToken || new Date(session.expiresAt || 0).getTime() <= Date.now();
  } catch {
    return true;
  }
};

export const writeSession = (storageKey, profile) => {
  const session = createSession(profile);
  localStorage.setItem(storageKey, JSON.stringify(session));
  return session;
};

export const refreshSession = (storageKey, profile) => {
  const existing = readValidSession(storageKey);
  const now = Date.now();
  const session = {
    ...profile,
    sessionToken: existing?.sessionToken || createToken(),
    lastActiveAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_DURATION_MS).toISOString()
  };
  localStorage.setItem(storageKey, JSON.stringify(session));
  return session;
};

export const getSessionDurationDays = () => 7;
