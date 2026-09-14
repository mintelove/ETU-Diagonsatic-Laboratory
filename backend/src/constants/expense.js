export const ACTIVE_EXPENSE_CATEGORIES = Object.freeze([
  'Transportation',
  'Printer Paper',
  'Other Expenses'
]);

export const EXPENSE_CATEGORIES = Object.freeze([
  'Transportation',
  'Printer Paper',
  'Other Expenses',
  'Stock purchased expenses',
  // Preserved for legacy & historical records compatibility
  'Paper Purchase',
  'Transport',
  'Stock Expenses',
  'Cleaning',
  'Utilities',
  'Office Supplies',
  'Maintenance',
  'Food & Beverages',
  'Communications',
  'Medical Supplies',
  'Miscellaneous'
]);

export const EXPENSE_TYPES = Object.freeze([
  'MANUAL',
  'STOCK_PURCHASE'
]);

export const EXPENSE_PAYMENT_METHODS = Object.freeze([
  'Cash',
  'Bank Transfer',
  'Mobile Payment'
]);

export const EXPENSE_STATUSES = Object.freeze([
  'Active',
  'Voided'
]);
