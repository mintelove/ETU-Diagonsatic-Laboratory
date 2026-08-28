/**
 * ETU Diagnostic Laboratory — Centralized Currency Utility
 * 
 * Standardizes currency formatting across the entire application to ETB (Ethiopian Birr).
 * Examples: 150 ETB, 800 ETB, 1,250.00 ETB
 */

export const CURRENCY_CODE = 'ETB';
export const CURRENCY_NAME = 'Ethiopian Birr';

/**
 * Formats a numeric amount with ETB currency code suffix.
 * @param {number|string} amount - The numeric value to format
 * @param {Object} options - Formatting options
 * @param {number} [options.decimals=2] - Number of decimal places (default 2)
 * @param {boolean} [options.showCode=true] - Whether to append 'ETB'
 * @param {string} [options.locale='en-US'] - Formatting locale
 * @returns {string} Formatted string, e.g. "1,250.00 ETB" or "150 ETB"
 */
export function formatCurrency(amount, { decimals = 2, showCode = true, locale = 'en-US' } = {}) {
  const num = Number(amount || 0);
  if (isNaN(num)) return showCode ? `0.00 ${CURRENCY_CODE}` : '0.00';

  const formattedNum = num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return showCode ? `${formattedNum} ${CURRENCY_CODE}` : formattedNum;
}

/**
 * Shortcut for standard two-decimal ETB currency formatting: "1,250.00 ETB"
 */
export function formatETB(amount, decimals = 2) {
  return formatCurrency(amount, { decimals, showCode: true });
}

/**
 * Shortcut for whole-number integer ETB currency formatting: "1,250 ETB"
 */
export function formatETBInt(amount) {
  const num = Number(amount || 0);
  return `${num.toLocaleString('en-US')} ${CURRENCY_CODE}`;
}

export default formatCurrency;
