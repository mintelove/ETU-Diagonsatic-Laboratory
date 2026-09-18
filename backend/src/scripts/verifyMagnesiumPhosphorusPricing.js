import { calculateSubtotalWithCbcGroup } from '../utils/cbcPricing.js';

function calculateTestPricing(tests) {
  return { totalPrice: calculateSubtotalWithCbcGroup(tests) };
}

console.log('=== Running Magnesium & Phosphorus Pricing Verification ===\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

const serumElectrolyteBundle = {
  _id: 'test_elec_bundle',
  name: 'Serum Electrolyte (K-Lyte 8)',
  price: 1000,
  category: { _id: 'cat_elec', name: 'SERUM ELECTROLYTE' },
  isBundle: true,
  billableIndividually: true
};

const sodiumParam = {
  _id: 'test_sodium',
  name: 'SODIUM',
  price: 0,
  category: { _id: 'cat_elec', name: 'SERUM ELECTROLYTE' },
  includedInBundle: true,
  billableIndividually: false,
  parentBundle: 'Serum Electrolyte'
};

const potassiumParam = {
  _id: 'test_potassium',
  name: 'POTASSIUM',
  price: 0,
  category: { _id: 'cat_elec', name: 'SERUM ELECTROLYTE' },
  includedInBundle: true,
  billableIndividually: false,
  parentBundle: 'Serum Electrolyte'
};

const magnesiumElec = {
  _id: 'test_magnesium_elec',
  name: 'Magnesium',
  price: 1000,
  category: { _id: 'cat_elec', name: 'SERUM ELECTROLYTE' },
  isBundle: false,
  billableIndividually: true,
  includedInBundle: false,
  parentBundle: ''
};

const phosphorusElec = {
  _id: 'test_phosphorus_elec',
  name: 'Phosphorus',
  price: 1000,
  category: { _id: 'cat_elec', name: 'SERUM ELECTROLYTE' },
  isBundle: false,
  billableIndividually: true,
  includedInBundle: false,
  parentBundle: ''
};

const magnesiumChem = {
  _id: 'test_magnesium_chem',
  name: 'Magnesium',
  price: 1000,
  category: { _id: 'cat_chem', name: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS' },
  isBundle: false,
  billableIndividually: true,
  includedInBundle: false,
  parentBundle: ''
};

const phosphorusChem = {
  _id: 'test_phosphorus_chem',
  name: 'Phosphorus',
  price: 1000,
  category: { _id: 'cat_chem', name: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS' },
  isBundle: false,
  billableIndividually: true,
  includedInBundle: false,
  parentBundle: ''
};

// Test 1: Magnesium only (1,000 ETB)
{
  const result = calculateTestPricing([magnesiumElec]);
  assert(result.totalPrice === 1000, `Magnesium only: expected 1,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 2: Phosphorus only (1,000 ETB)
{
  const result = calculateTestPricing([phosphorusElec]);
  assert(result.totalPrice === 1000, `Phosphorus only: expected 1,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 3: Magnesium + Phosphorus (2,000 ETB)
{
  const result = calculateTestPricing([magnesiumElec, phosphorusElec]);
  assert(result.totalPrice === 2000, `Magnesium + Phosphorus: expected 2,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 4: Serum Electrolyte only (1,000 ETB)
{
  const result = calculateTestPricing([serumElectrolyteBundle]);
  assert(result.totalPrice === 1000, `Serum Electrolyte only: expected 1,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 5: Serum Electrolyte + Magnesium (2,000 ETB)
{
  const result = calculateTestPricing([serumElectrolyteBundle, magnesiumElec]);
  assert(result.totalPrice === 2000, `Serum Electrolyte + Magnesium: expected 2,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 6: Serum Electrolyte + Phosphorus (2,000 ETB)
{
  const result = calculateTestPricing([serumElectrolyteBundle, phosphorusElec]);
  assert(result.totalPrice === 2000, `Serum Electrolyte + Phosphorus: expected 2,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 7: Serum Electrolyte + Magnesium + Phosphorus (3,000 ETB)
{
  const result = calculateTestPricing([serumElectrolyteBundle, magnesiumElec, phosphorusElec]);
  assert(result.totalPrice === 3000, `Serum Electrolyte + Magnesium + Phosphorus: expected 3,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 8: Serum Electrolyte + child parameters (Sodium, Potassium) + Magnesium + Phosphorus (3,000 ETB)
{
  const result = calculateTestPricing([serumElectrolyteBundle, sodiumParam, potassiumParam, magnesiumElec, phosphorusElec]);
  assert(result.totalPrice === 3000, `Serum Electrolyte + Sodium + Potassium + Magnesium + Phosphorus: expected 3,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 9: Child parameter only without bundle parent (1,000 ETB bundle rate triggers for electrolyte bundle tests)
{
  const result = calculateTestPricing([sodiumParam]);
  assert(result.totalPrice === 1000, `Sodium only triggers electrolyte bundle price: expected 1,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 10: Child parameter (Sodium) + Magnesium (2,000 ETB)
{
  const result = calculateTestPricing([sodiumParam, magnesiumElec]);
  assert(result.totalPrice === 2000, `Sodium + Magnesium: expected 2,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 11: Clinical Chemistry Magnesium (1,000 ETB)
{
  const result = calculateTestPricing([magnesiumChem]);
  assert(result.totalPrice === 1000, `Clinical Chemistry Magnesium: expected 1,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 12: Clinical Chemistry Phosphorus (1,000 ETB)
{
  const result = calculateTestPricing([phosphorusChem]);
  assert(result.totalPrice === 1000, `Clinical Chemistry Phosphorus: expected 1,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 13: Clinical Chemistry Magnesium + Phosphorus (2,000 ETB)
{
  const result = calculateTestPricing([magnesiumChem, phosphorusChem]);
  assert(result.totalPrice === 2000, `Clinical Chemistry Magnesium + Phosphorus: expected 2,000 ETB, got ${result.totalPrice} ETB`);
}

// Test 14: Serum Electrolyte + Clinical Chemistry Magnesium + Clinical Chemistry Phosphorus (3,000 ETB)
{
  const result = calculateTestPricing([serumElectrolyteBundle, magnesiumChem, phosphorusChem]);
  assert(result.totalPrice === 3000, `Serum Electrolyte + Clinical Chem Mg + P: expected 3,000 ETB, got ${result.totalPrice} ETB`);
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
