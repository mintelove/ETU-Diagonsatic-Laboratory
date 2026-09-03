import { connectDatabase } from '../config/database.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LabTestParameter from '../models/LabTestParameter.js';
import LaboratorySettings from '../models/LaboratorySettings.js';
import { calculateSubtotalWithCbcGroup } from '../utils/cbcPricing.js';
import assert from 'assert';

async function run() {
  await connectDatabase();
  console.log('=== VERIFYING CATEGORY SCOPING, DATABASE INTEGRITY & PRICING ===\n');

  // 1. Database check
  const urineCat = await LaboratoryTestCategory.findOne({ name: /^URIN/i });
  const hemCat = await LaboratoryTestCategory.findOne({ name: /^HEMATO/i });
  assert(urineCat, 'Urinalysis category exists');
  assert(hemCat, 'Hematology category exists');

  const urineMicroBundle = await LaboratoryTest.findOne({ category: urineCat._id, name: 'Urine Microscopy', isBundle: true });
  assert(urineMicroBundle, 'Urine Microscopy parent bundle exists');
  console.log(`[PASS] Parent bundle: ${urineMicroBundle.name} (price: ${urineMicroBundle.price} ETB)`);
  assert.strictEqual(urineMicroBundle.price, 300, 'Urine Microscopy bundle price is 300 ETB');

  const urineWbc = await LaboratoryTest.findOne({ category: urineCat._id, name: 'WBC' });
  const urineRbc = await LaboratoryTest.findOne({ category: urineCat._id, name: 'RBC' });
  assert(urineWbc, 'Urinalysis WBC exists');
  assert(urineRbc, 'Urinalysis RBC exists');
  console.log(`[PASS] Urinalysis WBC: price=${urineWbc.price}, parentBundle=${urineWbc.parentBundle}, subcategory=${urineWbc.subcategory}`);
  console.log(`[PASS] Urinalysis RBC: price=${urineRbc.price}, parentBundle=${urineRbc.parentBundle}, subcategory=${urineRbc.subcategory}`);
  assert.strictEqual(urineWbc.price, 0, 'Urinalysis WBC price is 0 ETB');
  assert.strictEqual(urineRbc.price, 0, 'Urinalysis RBC price is 0 ETB');
  assert.strictEqual(urineWbc.parentBundle, 'Urine Microscopy');
  assert.strictEqual(urineRbc.parentBundle, 'Urine Microscopy');

  // Check LabTestParameter for ranges
  const urineWbcParam = await LabTestParameter.findOne({ category: 'URINALYSIS', parameterName: 'WBC' });
  const urineRbcParam = await LabTestParameter.findOne({ category: 'URINALYSIS', parameterName: 'RBC' });
  assert(urineWbcParam, 'LabTestParameter Urinalysis WBC exists');
  assert(urineRbcParam, 'LabTestParameter Urinalysis RBC exists');
  console.log(`[PASS] LabTestParameter Urinalysis WBC: unit=${urineWbcParam.unit}, ref=${urineWbcParam.referenceValue}`);
  console.log(`[PASS] LabTestParameter Urinalysis RBC: unit=${urineRbcParam.unit}, ref=${urineRbcParam.referenceValue}`);
  assert.strictEqual(urineWbcParam.referenceValue, '0–5 /HPF');
  assert.strictEqual(urineRbcParam.referenceValue, '0–2 /HPF');

  // Check Hematology
  const hemRbc = await LaboratoryTest.findOne({ category: hemCat._id, name: 'RED BLOOD CELL COUNT (RBC)' });
  assert(hemRbc, 'Hematology RBC exists');
  console.log(`[PASS] Hematology RBC: price=${hemRbc.price}, subcategory=${hemRbc.subcategory}`);
  assert.strictEqual(hemRbc.price, 500, 'Hematology RBC price is 500 ETB');

  // Check for duplicates
  const urineWbcCount = await LaboratoryTest.countDocuments({ category: urineCat._id, name: 'WBC' });
  const urineRbcCount = await LaboratoryTest.countDocuments({ category: urineCat._id, name: 'RBC' });
  assert.strictEqual(urineWbcCount, 1, 'Exactly 1 WBC under Urinalysis');
  assert.strictEqual(urineRbcCount, 1, 'Exactly 1 RBC under Urinalysis');
  console.log('[PASS] No duplicate WBC or RBC records under Urinalysis');

  // 2. Pricing Scenarios
  const settings = await LaboratorySettings.findOne({ key: 'default' });

  // SCENARIO A: Only Urine Microscopy bundle selected
  const subtotalA = calculateSubtotalWithCbcGroup([urineMicroBundle], settings);
  console.log(`[SCENARIO A] Urine Microscopy bundle only: subtotal = ${subtotalA} ETB (expected: 300 ETB)`);
  assert.strictEqual(subtotalA, 300, 'Scenario A subtotal must be 300 ETB');

  // SCENARIO B: Urine Microscopy WBC and RBC selected (directly or with bundle)
  const subtotalB = calculateSubtotalWithCbcGroup([urineMicroBundle, urineWbc, urineRbc], settings);
  console.log(`[SCENARIO B] Urine Microscopy + WBC + RBC: subtotal = ${subtotalB} ETB (expected: 300 ETB)`);
  assert.strictEqual(subtotalB, 300, 'Scenario B subtotal must be 300 ETB');

  // SCENARIO C: Only Urine Microscopy WBC and RBC selected without bundle object
  const subtotalC = calculateSubtotalWithCbcGroup([urineWbc, urineRbc], settings);
  console.log(`[SCENARIO C] Urine WBC + RBC alone: subtotal = ${subtotalC} ETB (expected: 300 ETB)`);
  assert.strictEqual(subtotalC, 300, 'Scenario C subtotal must be 300 ETB');

  // SCENARIO D: Only Hematology RBC selected
  const subtotalD = calculateSubtotalWithCbcGroup([hemRbc], settings);
  console.log(`[SCENARIO D] Hematology RBC only: subtotal = ${subtotalD} ETB (expected: 500 ETB)`);
  assert.strictEqual(subtotalD, 500, 'Scenario D subtotal must be 500 ETB (CBC price)');

  // SCENARIO E: BOTH Hematology RBC AND Urine Microscopy (WBC, RBC) selected
  const subtotalE = calculateSubtotalWithCbcGroup([hemRbc, urineMicroBundle, urineWbc, urineRbc], settings);
  console.log(`[SCENARIO E] Hematology RBC + Urine Microscopy bundle + child tests: subtotal = ${subtotalE} ETB (expected: 800 ETB)`);
  assert.strictEqual(subtotalE, 800, 'Scenario E subtotal must be 800 ETB (500 CBC + 300 Urine Micro)');

  console.log('\n>>> ALL CATEGORY SCOPING AND PRICING CHECKS PASSED PERFECTLY! <<<');
  process.exit(0);
}

run().catch(e => {
  console.error('[FAIL]', e);
  process.exit(1);
});
