/**
 * ETU Diagnostic Laboratory — CBC Group Pricing Utility
 *
 * When ALL selected tests from the HEMATOLOGY category have subcategory 'CBC',
 * charge the admin-configured fixed CBC group price ONCE instead of summing
 * individual CBC sub-test prices.
 *
 * Non-CBC tests always use their individual prices.
 */

/**
 * Calculate subtotal applying CBC fixed pricing when CBC tests are present.
 *
 * @param {Array} tests - Populated LaboratoryTest documents (must have category populated with name)
 * @param {number|null|undefined} cbcGroupPrice - Admin-configured CBC fixed price from LaboratorySettings
 * @returns {number} subtotal
 */
export function calculateSubtotalWithCbcGroup(tests, cbcGroupPrice) {
  if (!cbcGroupPrice || cbcGroupPrice <= 0) {
    // No CBC group price configured — fall back to sum of individual prices
    return tests.reduce((sum, t) => sum + (t.price || 0), 0);
  }

  const cbcTests = [];
  const nonCbcTests = [];

  for (const t of tests) {
    const catName = typeof t.category === 'object' ? (t.category?.name || '') : '';
    if (/^HEMATOLOGY$/i.test(catName) && /^CBC$/i.test(t.subcategory || '')) {
      cbcTests.push(t);
    } else {
      nonCbcTests.push(t);
    }
  }

  let subtotal = nonCbcTests.reduce((sum, t) => sum + (t.price || 0), 0);

  if (cbcTests.length > 0) {
    // Charge the fixed CBC group price ONCE regardless of how many CBC sub-tests
    subtotal += cbcGroupPrice;
  }

  return subtotal;
}
