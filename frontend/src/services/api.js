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
  timeout: 15000,
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
    // Network error (no response from server)
    if (!error.response) {
      const networkError = new Error(
        'Unable to connect to the server. Please check your network connection and try again.'
      );
      networkError.isNetworkError = true;
      return Promise.reject(networkError);
    }

    const { status, data } = error.response;

    // 401 Unauthorized — token expired or invalid
    if (status === 401) {
      clearSession();
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Extract the server-provided error message
    const message =
      data?.message ||
      (status === 403
        ? 'You do not have permission to perform this action.'
        : status === 429
          ? 'Too many requests. Please wait a moment and try again.'
          : status >= 500
            ? 'An unexpected server error occurred. Please try again later.'
            : 'An error occurred. Please try again.');

    const apiError = new Error(message);
    apiError.status = status;
    apiError.data = data;
    return Promise.reject(apiError);
  }
);

export default api;
