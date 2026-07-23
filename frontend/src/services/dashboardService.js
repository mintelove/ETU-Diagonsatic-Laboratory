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
  try {
    // Dashboard aggregation can be slow — use a longer timeout
    const { data } = await api.get('/dashboard', { params, timeout: 45000 });
    return data;
  } catch (err) {
    console.error('Dashboard API Error', {
      endpoint: '/api/dashboard',
      status: err.status || 'N/A',
      message: err.message,
      isTimeout: err.isTimeout || false,
      isNetworkError: err.isNetworkError || false,
    });
    throw err;
  }
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
