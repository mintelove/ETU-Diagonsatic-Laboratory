import { api } from '../api/client.js';

export const EXPENSE_CATEGORIES = [
  'Transportation',
  'Printer Paper',
  'Other Expenses'
];

export const ADMIN_EXPENSE_SOURCES = [
  'All',
  'Admin expenses',
  'Receptionist expenses'
];

export function formatCategory(cat) {
  if (!cat) return 'Other Expenses';
  if (cat === 'Paper Purchase' || cat === 'Printer Paper') return 'Printer Paper';
  if (cat === 'Transport' || cat === 'Transportation') return 'Transportation';
  if (cat === 'Stock Expenses' || cat === 'Stock purchased expenses') return 'Stock purchased expenses';
  return cat;
}

export const EXPENSE_PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'Mobile Payment'
];

export async function getExpenses(params = {}, token) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      query.append(k, v);
    }
  });
  const queryString = query.toString();
  return api(`/expenses${queryString ? `?${queryString}` : ''}`, { token });
}

export async function getExpenseSummary(params = {}, token) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      query.append(k, v);
    }
  });
  const queryString = query.toString();
  return api(`/expenses/summary${queryString ? `?${queryString}` : ''}`, { token });
}

export async function getExpenseById(id, token) {
  return api(`/expenses/${id}`, { token });
}

export async function createExpense(data, token) {
  return api('/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
    isWrite: true
  });
}

export async function updateExpense(id, data, token) {
  return api(`/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    token,
    isWrite: true
  });
}

export async function voidExpense(id, voidReason, token) {
  return api(`/expenses/${id}/void`, {
    method: 'PATCH',
    body: JSON.stringify({ voidReason }),
    token,
    isWrite: true
  });
}

export async function deleteExpense(id, token) {
  return api(`/expenses/${id}`, {
    method: 'DELETE',
    token,
    isWrite: true
  });
}
