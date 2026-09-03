/**
 * ETU Diagnostic Laboratory — Laboratory Test Subtotal & Pricing Utility
 *
 * Implements standard laboratory test pricing rules:
 * 1. CBC Group (HEMATOLOGY › CBC): Admin fixed group price (default 150 ETB) charged ONCE for CBC group.
 * 2. Chemical Analysis (URINALYSIS › Chemical Analysis): Admin fixed bundle price (default 300 ETB).
 * 3. Urine Microscopy (URINALYSIS › Urine Microscopy): Admin fixed bundle price (default 300 ETB).
 * 4. Pregnancy Test [HCG]: 200 ETB standalone (never bundled).
 * 5. All child parameters marked as includedInBundle or billableIndividually === false contribute 0 ETB.
 * 6. All other individually billable tests: Contribute their configured test price to the total.
 */

/**
 * Calculate subtotal applying CBC and Urine bundle pricing.
 *
 * @param {Array} tests - Populated LaboratoryTest documents (must have category populated with name)
 * @param {number|Object|null|undefined} cbcGroupPriceOrSettings - Admin-configured CBC price or full LaboratorySettings object
 * @param {number|null|undefined} [urineChemPrice] - Admin-configured Chemical Analysis bundle price
 * @param {number|null|undefined} [urineMicroPrice] - Admin-configured Urine Microscopy bundle price
 * @returns {number} subtotal
 */
export function calculateSubtotalWithCbcGroup(tests, cbcGroupPriceOrSettings, urineChemPrice, urineMicroPrice) {
  let fixedCbcPrice = 150;
  let fixedChemPrice = 300;
  let fixedMicroPrice = 300;

  if (cbcGroupPriceOrSettings && typeof cbcGroupPriceOrSettings === 'object') {
    if (cbcGroupPriceOrSettings.cbcGroupPrice !== undefined && Number(cbcGroupPriceOrSettings.cbcGroupPrice) >= 0) {
      fixedCbcPrice = Number(cbcGroupPriceOrSettings.cbcGroupPrice);
    }
    if (cbcGroupPriceOrSettings.urineChemicalPrice !== undefined && Number(cbcGroupPriceOrSettings.urineChemicalPrice) >= 0) {
      fixedChemPrice = Number(cbcGroupPriceOrSettings.urineChemicalPrice);
    }
    if (cbcGroupPriceOrSettings.urineMicroscopyPrice !== undefined && Number(cbcGroupPriceOrSettings.urineMicroscopyPrice) >= 0) {
      fixedMicroPrice = Number(cbcGroupPriceOrSettings.urineMicroscopyPrice);
    }
  } else {
    if (cbcGroupPriceOrSettings !== undefined && Number(cbcGroupPriceOrSettings) >= 0) {
      fixedCbcPrice = Number(cbcGroupPriceOrSettings);
    }
    if (urineChemPrice !== undefined && Number(urineChemPrice) >= 0) {
      fixedChemPrice = Number(urineChemPrice);
    }
    if (urineMicroPrice !== undefined && Number(urineMicroPrice) >= 0) {
      fixedMicroPrice = Number(urineMicroPrice);
    }
  }

  const cbcTests = [];
  const chemTests = [];
  const microTests = [];
  const hcgTests = [];
  const otherTests = [];

  const URINE_MICRO_PARAMS = [
    'WBC', 'RBC', 'EPITHELIAL CELLS', 'WBC CASTS', 'RBC CASTS', 'GRANULAR CASTS',
    'AMORPHOUS PHOSPHATE CRYSTAL', 'AMORPHOUS URATE CRYSTAL', 'CALCIUM OXALATE CRYSTAL',
    'TRIPLE PHOSPHATE CRYSTAL', 'BACTERIA', 'OTHERS'
  ];
  const URINE_CHEM_PARAMS = [
    'SPECIFIC GRAVITY', 'LEUKOCYTE ESTERASE', 'PH', 'NITRITE', 'GLUCOSE', 'PROTEIN',
    'BLOOD', 'KETONE', 'BILIRUBIN', 'UROBILINOGEN', 'URINALYSIS (ROUTINE)', 'ROUTINE URINALYSIS'
  ];

  for (const t of (tests || [])) {
    if (!t) continue;
    const catName = (typeof t.category === 'object' ? (t.category?.name || '') : String(t.category || '')).trim().toUpperCase();
    const subcat = (t.subcategory || '').trim().toUpperCase();
    const name = (t.name || '').trim().toUpperCase();
    const isUrinalysisCat = catName === 'URINALYSIS' || /^URIN/i.test(catName) || t.parentBundle === 'Urine Microscopy' || t.parentBundle === 'Chemical Analysis';

    // CBC Check (Complete Blood Count in HEMATOLOGY)
    if (!isUrinalysisCat && t.parentBundle !== 'Urine Microscopy' && t.parentBundle !== 'Chemical Analysis' && (catName === 'HEMATOLOGY' || /^HEMATO/i.test(catName) || subcat === 'CBC') && (subcat === 'CBC' || /CBC/i.test(name) || t.parentBundle === 'CBC')) {
      cbcTests.push(t);
    }
    // HCG / Pregnancy Test (standalone, always separate)
    else if ((isUrinalysisCat || /PREGNANCY/i.test(subcat) || /HCG/i.test(subcat)) && (/HCG/i.test(name) || /PREGNANCY/i.test(name))) {
      hcgTests.push(t);
    }
    // Urine Microscopy Bundle (parent or child parameter)
    else if (
      t.parentBundle === 'Urine Microscopy' ||
      subcat === 'URINE MICROSCOPY' ||
      /MICROSCOP/i.test(subcat) ||
      name === 'URINE MICROSCOPY' ||
      (isUrinalysisCat && URINE_MICRO_PARAMS.includes(name))
    ) {
      microTests.push(t);
    }
    // Chemical Analysis Bundle (parent or child parameter)
    else if (
      t.parentBundle === 'Chemical Analysis' ||
      subcat === 'CHEMICAL ANALYSIS' ||
      subcat === 'CHEMICAL' ||
      /^CHEMICAL/i.test(subcat) ||
      name === 'CHEMICAL ANALYSIS' ||
      (isUrinalysisCat && URINE_CHEM_PARAMS.includes(name))
    ) {
      chemTests.push(t);
    }
    else {
      // If marked as non-billable child parameter, do not bill individually
      if (t.billableIndividually !== false && !t.includedInBundle) {
        otherTests.push(t);
      }
    }
  }

  let subtotal = otherTests.reduce((sum, t) => {
    const p = Number(t.price ?? 0);
    return sum + (isNaN(p) ? 0 : p);
  }, 0);

  // CBC: single fixed group price
  if (cbcTests.length > 0) subtotal += fixedCbcPrice;

  // Chemical Analysis: flat bundle price
  if (chemTests.length > 0) subtotal += fixedChemPrice;

  // Urine Microscopy: flat bundle price
  if (microTests.length > 0) subtotal += fixedMicroPrice;

  // HCG: 200 ETB each (standalone)
  hcgTests.forEach(t => {
    const p = Number(t.price ?? 200);
    subtotal += (isNaN(p) ? 200 : p);
  });

  return subtotal;
}

