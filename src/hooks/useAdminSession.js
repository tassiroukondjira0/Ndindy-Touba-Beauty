import { useEffect, useState } from 'react';
import { getCurrentAdminSession, ADMIN_SESSION_EVENT } from '../services/auth';

export const useAdminSession = () => {
  const [session, setSession] = useState(() => getCurrentAdminSession());

  useEffect(() => {
    const refresh = () => setSession(getCurrentAdminSession());
    refresh();
    window.addEventListener(ADMIN_SESSION_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ADMIN_SESSION_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return Boolean(session);
};