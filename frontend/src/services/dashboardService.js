/**
 * ETU Diagnostic Laboratory — Dashboard API Service
 *
 * Provides fetch methods for the Admin Dashboard analytics endpoint.
 * Supports optional date range filtering via query parameters.
 */

import api from './api.js';

/**
 * Fetch comprehensive dashboard analytics.
 * @param {object} [filters] — Optional date filter { dateFrom, dateTo }
 * @returns {Promise<object>}
 */
export async function getDashboardData(filters = {}) {
  const params = {};
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  const { data } = await api.get('/dashboard', { params });
  return data;
}

/**
 * Global search across stock, users, patients, categories.
 * @param {string} q — Search query
 * @returns {Promise<{ results: object[] }>}
 */
export async function globalSearch(q) {
  const { data } = await api.get('/dashboard/search', { params: { q } });
  return data;
}
