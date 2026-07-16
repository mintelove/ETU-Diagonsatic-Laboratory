/**
 * ETU Diagnostic Laboratory — Auth Service
 *
 * Clean abstraction over authentication API endpoints.
 * Uses the centralized Axios instance.
 */

import api from './api.js';

/**
 * Authenticate a user with username and password.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
export async function login(username, password) {
  const { data } = await api.post('/auth/login', { username, password });
  return data; // { token, user }
}

/**
 * Fetch the currently authenticated user profile.
 * Requires a valid JWT in storage.
 * @returns {Promise<{ user: object }>}
 */
export async function getCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data; // { user }
}
