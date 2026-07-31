/**
 * ETU Diagnostic Laboratory — Axios API Service
 *
 * Centralized Axios instance with:
 * - JWT Authorization header injection
 * - Automatic 401 handling (session expiry → redirect to login)
 * - Network error handling
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
      let message;
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message = 'The server is taking too long to respond. Please try again.';
        console.error(`API Timeout — ${method} ${url} — Request exceeded ${error.config?.timeout || 30000}ms`);
      } else {
        message = 'Unable to connect to the server. Please check your network connection and try again.';
        console.error(`API Network Error — ${method} ${url}`, error.message);
      }
      const networkError = new Error(message);
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
              ? `Server error (${status}). ${data?.error || data?.message || 'Please try again.'}`
              : `Request failed with status ${status}.`);

    const apiError = new Error(message);
    apiError.status = status;
    apiError.data = data;
    apiError.isNetworkError = false;
    return Promise.reject(apiError);
  }
);

export default api;
