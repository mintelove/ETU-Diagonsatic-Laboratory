/**
 * ETU Diagnostic Laboratory — Authentication Context Provider
 *
 * Manages the global authentication state, handles automatic token verification
 * on mount, and coordinates with Axios service and storage utilities.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSession, setSession, clearSession } from '../utils/storage.js';
import { getCurrentUser } from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());
  const [loading, setLoading] = useState(Boolean(session));

  // Verify the stored session with the backend on mount
  useEffect(() => {
    async function verifySession() {
      if (!session || !session.token) {
        setLoading(false);
        return;
      }

      try {
        const { user } = await getCurrentUser();
        // Update user state if profile changed
        setSessionState((current) => {
          if (!current) return null;
          const updated = { ...current, user };
          setSession(updated, localStorage.getItem('etu_remember') !== 'false');
          return updated;
        });
      } catch (error) {
        console.error('Session verification failed. Clearing storage:', error.message);
        clearSession();
        setSessionState(null);
      } finally {
        setLoading(false);
      }
    }

    verifySession();
  }, []);

  /**
   * Log in the user by storing their session credentials and updating state.
   * @param {object} data — { token, user } returned from the backend login API
   * @param {boolean} remember — whether to persist across browser sessions
   */
  const loginHandler = useCallback((data, remember = true) => {
    setSession(data, remember);
    setSessionState(data);
  }, []);

  /**
   * Log out the user by clearing credentials and resetting state.
   */
  const logoutHandler = useCallback(() => {
    clearSession();
    setSessionState(null);
  }, []);

  const contextValue = {
    user: session?.user ?? null,
    token: session?.token ?? null,
    loading,
    login: loginHandler,
    logout: logoutHandler,
    isAuthenticated: Boolean(session?.token),
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to consume the auth context.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
