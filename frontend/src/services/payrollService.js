/**
 * ETU Diagnostic Laboratory — Payroll API Service
 *
 * Connected to centralized Axios instance in services/api.js.
 * Automatically injects JWT Authorization Bearer token from stored session.
 * Handles token expiration, network errors, and base URL automatically.
 */

import api from './api.js';
import { getToken } from '../utils/storage.js';

export const JOB_TYPES = [
  'Reception',
  'Sample Collector',
  'Approver',
  'Cleaner',
  'Security',
  'Supervisor',
  'Other'
];

export const BRANCH_OPTIONS = [
  'Main',
  'Otona'
];

export const ADVANCE_PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'Telebirr',
  'CBE Birr',
  'Other'
];

export const MONTHS = [
  { value: 1, name: 'January' },
  { value: 2, name: 'February' },
  { value: 3, name: 'March' },
  { value: 4, name: 'April' },
  { value: 5, name: 'May' },
  { value: 6, name: 'June' },
  { value: 7, name: 'July' },
  { value: 8, name: 'August' },
  { value: 9, name: 'September' },
  { value: 10, name: 'October' },
  { value: 11, name: 'November' },
  { value: 12, name: 'December' }
];

/**
 * Fetch payroll dashboard metrics & summary
 */
export async function getPayrollDashboard(params = {}) {
  const { data } = await api.get('/payroll/dashboard', { params });
  return data;
}

/**
 * Fetch employee list with optional filters
 */
export async function getEmployees(params = {}) {
  const { data } = await api.get('/payroll/employees', { params });
  return data;
}

/**
 * Fetch detailed employee profile with advances and payroll history
 */
export async function getEmployeeById(id) {
  const { data } = await api.get(`/payroll/employees/${id}`);
  return data;
}

/**
 * Create a new employee
 */
export async function createEmployee(payload) {
  const { data } = await api.post('/payroll/employees', payload);
  return data;
}

/**
 * Update an existing employee (records salary adjustments in history)
 */
export async function updateEmployee(id, payload) {
  const { data } = await api.put(`/payroll/employees/${id}`, payload);
  return data;
}

/**
 * Delete / safe-deactivate an employee
 */
export async function deleteEmployee(id) {
  const { data } = await api.delete(`/payroll/employees/${id}`);
  return data;
}

/**
 * Sync system user accounts into payroll employees (idempotent, safe)
 */
export async function syncUserAccounts() {
  const { data } = await api.post('/payroll/sync-users');
  return data;
}

/**
 * Fetch salary advances
 */
export async function getAdvances(params = {}) {
  const { data } = await api.get('/payroll/advances', { params });
  return data;
}

/**
 * Record a pre-salary advance
 */
export async function createAdvance(payload) {
  const { data } = await api.post('/payroll/advances', payload);
  return data;
}

/**
 * Update an advance
 */
export async function updateAdvance(id, payload) {
  const { data } = await api.put(`/payroll/advances/${id}`, payload);
  return data;
}

/**
 * Cancel an advance
 */
export async function cancelAdvance(id) {
  const { data } = await api.delete(`/payroll/advances/${id}`);
  return data;
}

/**
 * Fetch payroll processing preview (calculates advances, identifies already-paid)
 */
export async function getPayrollPreview(params = {}) {
  const { data } = await api.get('/payroll/preview', { params });
  return data;
}

/**
 * Fetch annual payroll matrix (Jan-Dec payment status grid)
 */
export async function getAnnualPayrollMatrix(params = {}) {
  const { data } = await api.get('/payroll/annual-matrix', { params });
  return data;
}

/**
 * Fetch finalized payroll records
 */
export async function getPayrollRecords(params = {}) {
  const { data } = await api.get('/payroll/records', { params });
  return data;
}

/**
 * Process payroll for a period and freeze calculations
 */
export async function processPayroll(payload) {
  const { data } = await api.post('/payroll/process', payload);
  return data;
}

/**
 * Update payroll status (Paid / Cancelled)
 */
export async function updatePayrollStatus(id, payload) {
  const { data } = await api.patch(`/payroll/records/${id}/status`, payload);
  return data;
}

/**
 * Fetch payroll & calendar configuration settings
 */
export async function getPayrollSettings() {
  const { data } = await api.get('/payroll/settings');
  return data;
}

/**
 * Update payroll & calendar configuration settings
 */
export async function updatePayrollSettings(payload) {
  const { data } = await api.put('/payroll/settings', payload);
  return data;
}

/**
 * Fetch employee salary payment slip data
 */
export async function getSalarySlip(id) {
  const { data } = await api.get(`/payroll/salary-slip/${id}`);
  return data;
}

/**
 * Get authorized URL for PDF export
 */
export function getExportPdfUrl(params = {}) {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = getToken();
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, v);
  });
  if (token) query.append('token', token);
  return `${base}/payroll/export/pdf?${query.toString()}`;
}

/**
 * Get authorized URL for CSV export
 */
export function getExportCsvUrl(params = {}) {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = getToken();
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, v);
  });
  if (token) query.append('token', token);
  return `${base}/payroll/export/csv?${query.toString()}`;
}
