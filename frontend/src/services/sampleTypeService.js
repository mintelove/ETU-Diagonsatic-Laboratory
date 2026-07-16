/**
 * ETU Diagnostic Laboratory — Sample Type Service
 *
 * Frontend service layer using Axios API client for Sample Type Management.
 */

import api from './api.js';

/**
 * Fetch sample types list with search and filters.
 */
export async function getSampleTypes(filters = {}) {
  const { data } = await api.get('/sample-types', { params: filters });
  return data.sampleTypes;
}

/**
 * Get details of a single sample type.
 */
export async function getSampleType(id) {
  const { data } = await api.get(`/sample-types/${id}`);
  return data.sampleType;
}

/**
 * Create a new sample type.
 */
export async function createSampleType(payload) {
  const { data } = await api.post('/sample-types', payload);
  return data.sampleType;
}

/**
 * Update an existing sample type.
 */
export async function updateSampleType(id, payload) {
  const { data } = await api.put(`/sample-types/${id}`, payload);
  return data.sampleType;
}

/**
 * Update status of an existing sample type (Active/Inactive).
 */
export async function updateSampleTypeStatus(id, status) {
  const { data } = await api.patch(`/sample-types/${id}/status`, { status });
  return data.sampleType;
}

/**
 * Delete a sample type.
 */
export async function deleteSampleType(id) {
  await api.delete(`/sample-types/${id}`);
}
