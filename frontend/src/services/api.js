/**
 * ETU Diagnostic Laboratory — Axios API Service
 *
 * Centralized Axios instance with:
 * - JWT Authorization header injection
 * - Automatic 401 handling (session expiry → redirect to login)
 * - Silent network error handling (never exposed to UI)
 * - Configurable base URL from environment
 * - Future-ready for token refresh
 */

import axios from 'axios';
import { getToken, clearSession } from '../utils/storage.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function isSilentNetworkError(err) {
  if (!err) return false;
  if (err.isNetworkError || err.isTimeout) return true;
  const msg = String(err.message || '').toLowerCase();
  const name = String(err.name || '').toLowerCase();
  return (
    name === 'aborterror' ||
    name === 'timeouterror' ||
    (name === 'typeerror' && (msg.includes('fetch') || msg.includes('network'))) ||
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('networkrequest') ||
    msg.includes('connection failed') ||
    msg.includes('unable to connect') ||
    msg.includes('econnrefused') ||
    msg.includes('err_network') ||
    msg.includes('server unavailable') ||
    msg.includes('load failed') ||
    msg.includes('timeout')
  );
}

/* ── Request Interceptor: Attach JWT ──────────────────── */
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response Interceptor: Handle errors ──────────────── */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || 'unknown';
    const method = (error.config?.method || 'GET').toUpperCase();

    // Genuine network error or timeout — no HTTP response received from server
    if (!error.response) {
      console.warn(`API Network Error (handled silently) — ${method} ${url}`, error.message);
      const networkError = new Error('Network request failed');
      networkError.isNetworkError = true;
      networkError.isTimeout = error.code === 'ECONNABORTED';
      return Promise.reject(networkError);
    }

    // Server responded with an HTTP status code (400, 401, 403, 404, 422, 500, etc.)
    const { status, data } = error.response;

    console.error(`API Response Error — ${method} ${url} — Status: ${status}`, {
      url,
      method,
      status,
      responseBody: data,
    });

    // 401 Unauthorized — token expired or invalid
    if (status === 401) {
      clearSession();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      const authError = new Error(data?.message || 'Session expired. Please log in again.');
      authError.status = 401;
      authError.data = data;
      authError.isNetworkError = false;
      return Promise.reject(authError);
    }

    // Extract the real server error message without converting to generic network errors
    const message =
      data?.message ||
      data?.error ||
      (typeof data === 'string' && data.length < 200 ? data : null) ||
      (status === 403
        ? 'You do not have permission to access this resource.'
        : status === 404
          ? 'The requested resource was not found.'
          : status === 429
            ? 'Too many requests. Please wait a moment and try again.'
            : status >= 500
              ? 'A temporary server error occurred. Please try again.'
              : `Request failed with status ${status}.`);

    const apiError = new Error(message);
    apiError.status = status;
    apiError.data = data;
    apiError.isNetworkError = false;
    return Promise.reject(apiError);
  }
);

export default api;
