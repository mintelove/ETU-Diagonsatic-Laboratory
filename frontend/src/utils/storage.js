/**
 * ETU Diagnostic Laboratory — Token/Session Storage Utilities
 * Centralized localStorage key management for auth state.
 */

const SESSION_KEY = 'etu_session';
const REMEMBER_KEY = 'etu_remember';

/**
 * Determine the correct storage backend based on "remember me" preference.
 */
function getStorage() {
  return localStorage.getItem(REMEMBER_KEY) === 'false' ? sessionStorage : localStorage;
}

/**
 * Save the full session (token + user) to storage.
 * @param {{ token: string, user: object }} session
 * @param {boolean} remember — true for persistent (localStorage), false for session-only
 */
export function setSession(session, remember = true) {
  localStorage.setItem(REMEMBER_KEY, String(remember));
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(session));

  // Clear the other storage to avoid stale data
  const other = remember ? sessionStorage : localStorage;
  other.removeItem(SESSION_KEY);
}

/**
 * Retrieve the current session from storage.
 * @returns {{ token: string, user: object } | null}
 */
export function getSession() {
  const fromLocal = localStorage.getItem(SESSION_KEY);
  if (fromLocal) {
    try { return JSON.parse(fromLocal); } catch { /* corrupted */ }
  }

  const fromSession = sessionStorage.getItem(SESSION_KEY);
  if (fromSession) {
    try { return JSON.parse(fromSession); } catch { /* corrupted */ }
  }

  return null;
}

/**
 * Remove session data from all storage backends.
 */
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

/**
 * Shortcut: get just the JWT token string.
 * @returns {string | null}
 */
export function getToken() {
  return getSession()?.token ?? null;
}

/**
 * Shortcut: get just the user object.
 * @returns {object | null}
 */
export function getUser() {
  return getSession()?.user ?? null;
}

/**
 * Update only the user object within the stored session (keeps the token).
 * @param {object} user
 */
export function updateStoredUser(user) {
  const session = getSession();
  if (!session) return;
  const remember = localStorage.getItem(REMEMBER_KEY) !== 'false';
  setSession({ ...session, user }, remember);
}
