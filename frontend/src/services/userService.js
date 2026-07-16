/**
 * ETU Diagnostic Laboratory — User Management Service
 *
 * Clean API abstraction for all user management endpoints.
 * Uses the centralized Axios instance from services/api.js.
 */

import api from './api.js';

/**
 * Fetch all users.
 * @returns {Promise<{ users: object[] }>}
 */
export async function getUsers() {
  const { data } = await api.get('/users');
  return data;
}

/**
 * Fetch a single user by ID.
 * @param {string} id
 * @returns {Promise<{ user: object }>}
 */
export async function getUser(id) {
  const { data } = await api.get(`/users/${id}`);
  return data;
}

/**
 * Create a new user account.
 * @param {object} userData
 * @returns {Promise<{ user: object }>}
 */
export async function createUser(userData) {
  const { data } = await api.post('/users', userData);
  return data;
}

/**
 * Update an existing user's profile details.
 * @param {string} id
 * @param {object} userData
 * @returns {Promise<{ user: object }>}
 */
export async function updateUser(id, userData) {
  const { data } = await api.patch(`/users/${id}`, userData);
  return data;
}

/**
 * Toggle user account status (Active / Inactive).
 * @param {string} id
 * @param {string} status — 'Active' or 'Inactive'
 * @returns {Promise<{ user: object }>}
 */
export async function updateUserStatus(id, status) {
  const { data } = await api.patch(`/users/${id}/status`, { status });
  return data;
}

/**
 * Reset a user's password.
 * @param {string} id
 * @param {string} password
 * @returns {Promise<{ message: string }>}
 */
export async function resetUserPassword(id, password) {
  const { data } = await api.patch(`/users/${id}/password`, { password });
  return data;
}

/**
 * Delete a user account permanently.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteUser(id) {
  await api.delete(`/users/${id}`);
}

/**
 * Upload a profile photo for a user.
 * @param {string} id
 * @param {File} file
 * @returns {Promise<{ user: object }>}
 */
export async function uploadUserPhoto(id, file) {
  const formData = new FormData();
  formData.append('photo', file);
  const { data } = await api.post(`/users/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Remove a user's profile photo.
 * @param {string} id
 * @returns {Promise<{ user: object }>}
 */
export async function removeUserPhoto(id) {
  const { data } = await api.delete(`/users/${id}/photo`);
  return data;
}
