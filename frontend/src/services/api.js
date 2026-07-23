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
    // Diagnostic logging for development
    const url = error.config?.url || 'unknown';
    const method = (error.config?.method || 'GET').toUpperCase();

    // No response from server — timeout or network failure
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

    const { status, data } = error.response;

    console.error(`API Error — ${method} ${url} — Status: ${status}`, data?.message || '');

    // 401 Unauthorized — token expired or invalid
    if (status === 401) {
      clearSession();
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      const authError = new Error('Session expired. Please log in again.');
      authError.status = 401;
      authError.data = data;
      return Promise.reject(authError);
    }

    // Extract the server-provided error message
    const message =
      data?.message ||
      (status === 403
        ? 'You do not have permission to access this resource.'
        : status === 404
          ? 'The requested resource was not found.'
          : status === 429
            ? 'Too many requests. Please wait a moment and try again.'
            : status >= 500
              ? 'Server error. Please try again later.'
              : 'An error occurred. Please try again.');

    const apiError = new Error(message);
    apiError.status = status;
    apiError.data = data;
    return Promise.reject(apiError);
  }
);

export default api;
