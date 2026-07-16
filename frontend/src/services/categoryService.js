/**
 * ETU Diagnostic Laboratory — Category API Service
 *
 * Provides central fetch methods for Category Management.
 * Communicates with backend endpoints using the authenticated Axios instance.
 */

import api from './api.js';

/**
 * Fetch all categories.
 * @returns {Promise<{ categories: object[] }>}
 */
export async function getCategories() {
  const { data } = await api.get('/categories');
  return data;
}

/**
 * Fetch a single category by ID.
 * @param {string} id
 * @returns {Promise<{ category: object }>}
 */
export async function getCategory(id) {
  const { data } = await api.get(`/categories/${id}`);
  return data;
}

/**
 * Create a new category.
 * @param {object} categoryData
 * @returns {Promise<{ category: object }>}
 */
export async function createCategory(categoryData) {
  const { data } = await api.post('/categories', categoryData);
  return data;
}

/**
 * Update an existing category by ID.
 * @param {string} id
 * @param {object} categoryData
 * @returns {Promise<{ category: object }>}
 */
export async function updateCategory(id, categoryData) {
  const { data } = await api.put(`/categories/${id}`, categoryData);
  return data;
}

/**
 * Toggle category status (Active / Inactive).
 * @param {string} id
 * @param {string} status
 * @returns {Promise<{ category: object }>}
 */
export async function updateCategoryStatus(id, status) {
  const { data } = await api.patch(`/categories/${id}/status`, { status });
  return data;
}

/**
 * Delete a category.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteCategory(id) {
  await api.delete(`/categories/${id}`);
}
