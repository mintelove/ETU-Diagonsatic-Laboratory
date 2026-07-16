/**
 * ETU Diagnostic Laboratory — Real-Time Sync Context
 *
 * Opens a single Server-Sent Events (SSE) connection per authenticated session.
 * Pages subscribe to named events (e.g. 'stock:change') and receive a callback
 * when the server broadcasts a change.
 *
 * Usage in any page:
 *   import { useRealtime } from '../context/RealtimeContext.jsx';
 *   const { subscribe, unsubscribe } = useRealtime();
 *
 *   useEffect(() => {
 *     const cb = () => loadData();
 *     subscribe('stock:change', cb);
 *     return () => unsubscribe('stock:change', cb);
 *   }, []);
 */

import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';

const RealtimeContext = createContext(null);

// Base URL: same origin as the backend API
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function RealtimeProvider({ children }) {
  const { token, isAuthenticated } = useAuth();

  // Registry: Map<eventName, Set<callback>>
  const registry = useRef(new Map());
  const esRef    = useRef(null);
  const retryRef = useRef(null);
  const retryDelay = useRef(1000);

  /** Call all callbacks registered for a given event name */
  const dispatch = useCallback((eventName) => {
    const cbs = registry.current.get(eventName);
    if (cbs) cbs.forEach((cb) => { try { cb(); } catch (e) { console.error('[SSE] callback error', e); } });
  }, []);

  /** Open the SSE connection */
  const connect = useCallback(() => {
    if (!token || !isAuthenticated) return;
    if (esRef.current) esRef.current.close();

    const url = `${API_BASE}/events`;
    const es = new EventSource(url, { withCredentials: false });

    // We need to send the token. EventSource doesn't support headers, so we use
    // a cookie-based approach or a query param. Since the backend uses Bearer,
    // we attach the token as a query parameter.
    // Rebuild with token:
    es.close();
    const esWithToken = new EventSource(`${url}?token=${encodeURIComponent(token)}`, {
      withCredentials: false,
    });
    esRef.current = esWithToken;

    esWithToken.addEventListener('connected', () => {
      console.info('[SSE] Connected to real-time sync stream');
      retryDelay.current = 1000; // reset backoff on success
    });

    // Listen to every named event we care about
    const eventNames = [
      'stock:change',
      'categories:change',
      'sampleTypes:change',
      'reception:change',
      'collection:change',
      'reports:change',
      'users:change',
      'notifications:change',
      'extraRequests:change',
      'patients:change',
      'counselling:change',
      'system:change',
    ];

    eventNames.forEach((name) => {
      esWithToken.addEventListener(name, () => dispatch(name));
    });

    esWithToken.onerror = () => {
      console.warn(`[SSE] Connection lost. Reconnecting in ${retryDelay.current}ms…`);
      esWithToken.close();
      esRef.current = null;

      retryRef.current = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30_000); // cap at 30 s
        connect();
      }, retryDelay.current);
    };
  }, [token, isAuthenticated, dispatch]);

  /** Open connection when user is authenticated; close on logout */
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    } else {
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    }
    return () => {
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    };
  }, [isAuthenticated, token, connect]);

  /**
   * Subscribe a callback to a named SSE event.
   * @param {string} eventName
   * @param {() => void} cb
   */
  const subscribe = useCallback((eventName, cb) => {
    if (!registry.current.has(eventName)) {
      registry.current.set(eventName, new Set());
    }
    registry.current.get(eventName).add(cb);
  }, []);

  /**
   * Unsubscribe a callback from a named SSE event.
   * @param {string} eventName
   * @param {() => void} cb
   */
  const unsubscribe = useCallback((eventName, cb) => {
    registry.current.get(eventName)?.delete(cb);
  }, []);

  return (
    <RealtimeContext.Provider value={{ subscribe, unsubscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

/** Hook to consume the real-time context */
export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used inside RealtimeProvider');
  return ctx;
}
