/**
 * repairAndVerify.js
 * 
 * 1. Recreate the 3 missing URINE AND BODY FLUID ANALYSIS parameters
 * 2. Run seedParameterCatalog() to simulate a backend restart
 * 3. Verify ALL parameters survive
 * 4. Verify ALL three tests exist
 * 5. Print comprehensive evidence
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LabTestParameter from '../models/LabTestParameter.js';
import { seedParameterCatalog } from '../config/parameterCatalogSeeder.js';

const uri = process.env.MONGODB_URI_FALLBACK?.trim() || process.env.MONGODB_URI?.trim();
const escapeRegex = v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function run() {
  await mongoose.connect(uri, { dbName: 'ETU_Diagonstic_Labratory' });
  console.log('DATABASE:', mongoose.connection.db.databaseName);

  // ============================================================
  // STEP 1: Recreate missing URINE AND BODY FLUID ANALYSIS parameters
  // ============================================================
  console.log('\n========================================');
  console.log('STEP 1: RECREATE MISSING URINE PARAMS');
  console.log('========================================');

  const URINE_PARAMS = [
    { parameterName: 'VOLUME OVER 24 HOUR (V)', subcategory: 'PHYSICAL EXAMINATION', unit: 'liter', referenceValue: '>= 1.5 liter', normalMin: 1.5, normalMax: null, displayOrder: 1, aliases: ['VOLUME OVER 24 HOUR', 'VOLUME OVER 24 HR', '24 HOUR VOLUME', '24 HR VOLUME', 'VOLUME (V)'] },
    { parameterName: 'COLOUR', subcategory: 'PHYSICAL EXAMINATION', unit: '', referenceValue: 'CLEAR', normalMin: null, normalMax: null, displayOrder: 2, aliases: ['COLOR', 'COLOUR', 'Colour', 'Color'] },
    { parameterName: 'VISCOSITY', subcategory: 'PHYSICAL EXAMINATION', unit: '', referenceValue: 'NORMAL', normalMin: null, normalMax: null, displayOrder: 3, aliases: ['VISCOSITY', 'Viscosity'] },
    { parameterName: '24 HR PROTEIN', subcategory: 'BIOCHEMICAL EXAMINATION', unit: 'mg/24 hr', referenceValue: 'AT REST <= 80 mg/24 hours', normalMin: null, normalMax: 80, displayOrder: 4, aliases: ['24 HR PROTEIN', '24 HOUR PROTEIN', '24-HOUR PROTEIN', 'URINE PROTEIN 24 HOUR', '24H PROTEIN', '24-HR PROTEIN'] }
  ];

  for (const p of URINE_PARAMS) {
    const searchNames = [p.parameterName, ...p.aliases];
    const existing = await LabTestParameter.findOne({
      category: 'URINE AND BODY FLUID ANALYSIS',
      $or: searchNames.map(n => ({ parameterName: new RegExp(`^${escapeRegex(n)}$`, 'i') }))
    });

    if (existing) {
      existing.parameterName = p.parameterName;
      existing.subcategory = p.subcategory;
      existing.unit = p.unit;
      existing.referenceValue = p.referenceValue;
      existing.normalMin = p.normalMin;
      existing.normalMax = p.normalMax;
      existing.displayOrder = p.displayOrder;
      existing.status = 'Active';
      await existing.save();
      console.log(`  UPDATED: "${p.parameterName}" [${existing._id}]`);
    } else {
      const doc = await LabTestParameter.create({
        parameterName: p.parameterName,
        category: 'URINE AND BODY FLUID ANALYSIS',
        subcategory: p.subcategory,
        unit: p.unit,
        referenceValue: p.referenceValue,
        normalMin: p.normalMin,
        normalMax: p.normalMax,
        displayOrder: p.displayOrder,
        editable: true,
        status: 'Active'
      });
      console.log(`  CREATED: "${p.parameterName}" [${doc._id}]`);
    }
  }

  // ============================================================
  // STEP 2: Run seedParameterCatalog (simulates backend restart)
  // ============================================================
  console.log('\n========================================');
  console.log('STEP 2: SIMULATE BACKEND RESTART');
  console.log('  Running seedParameterCatalog()...');
  console.log('========================================');
  
  await seedParameterCatalog();
  console.log('  seedParameterCatalog() completed.');

  // ============================================================
  // STEP 3: Verify URINE params survived
  // ============================================================
  console.log('\n========================================');
  console.log('STEP 3: VERIFY URINE PARAMS SURVIVED');
  console.log('========================================');

  const urineParamsAfter = await LabTestParameter.find({ category: 'URINE AND BODY FLUID ANALYSIS' }).sort({ displayOrder: 1 }).lean();
  console.log(`  URINE AND BODY FLUID ANALYSIS parameters: ${urineParamsAfter.length}`);
  urineParamsAfter.forEach(p => console.log(`    [${p.displayOrder}] ${p.parameterName} | subcat: ${p.subcategory} | unit: ${p.unit} | ref: ${p.referenceValue} | status: ${p.status}`));

  if (urineParamsAfter.length !== 4) {
    console.error(`  ❌ EXPECTED 4 parameters, got ${urineParamsAfter.length}! THE BUG IS NOT FIXED.`);
  } else {
    console.log('  ✅ All 4 parameters survived seedParameterCatalog.');
  }

  // ============================================================
  // STEP 4: Run seedParameterCatalog AGAIN (double-restart test)
  // ============================================================
  console.log('\n========================================');
  console.log('STEP 4: SECOND SIMULATED RESTART');
  console.log('========================================');
  
  await seedParameterCatalog();
  
  const urineParamsAfter2 = await LabTestParameter.find({ category: 'URINE AND BODY FLUID ANALYSIS' }).sort({ displayOrder: 1 }).lean();
  console.log(`  URINE AND BODY FLUID ANALYSIS parameters after 2nd restart: ${urineParamsAfter2.length}`);
  if (urineParamsAfter2.length !== 4) {
    console.error(`  ❌ EXPECTED 4 parameters, got ${urineParamsAfter2.length}!`);
  } else {
    console.log('  ✅ All 4 parameters still intact after second restart.');
  }

  // ============================================================
  // STEP 5: Verify ALL three tests
  // ============================================================
  console.log('\n========================================');
  console.log('STEP 5: VERIFY ALL THREE TESTS');
  console.log('========================================');

  // Test 1: Indirect Coombs Test
  const indirectCoombs = await LaboratoryTest.findOne({ name: /indirect.*coombs/i }).populate('category', 'name').lean();
  const indirectCoombsParam = await LabTestParameter.findOne({ category: /serology/i, parameterName: /indirect.*coombs/i }).lean();
  
  console.log('\nINDIRECT COOMBS TEST:');
  if (indirectCoombs) {
    console.log(`  STATUS: FOUND`);
    console.log(`  ID: ${indirectCoombs._id}`);
    console.log(`  NAME: ${indirectCoombs.name}`);
    console.log(`  CATEGORY: ${indirectCoombs.category?.name || 'N/A'}`);
    console.log(`  TEST STATUS: ${indirectCoombs.status}`);
  } else {
    console.log('  STATUS: ❌ NOT FOUND');
  }
  if (indirectCoombsParam) {
    console.log(`  PARAMETER: ${indirectCoombsParam.parameterName} [${indirectCoombsParam._id}]`);
    console.log(`  PARAM REFERENCE: ${indirectCoombsParam.referenceValue}`);
    console.log(`  PARAM STATUS: ${indirectCoombsParam.status}`);
  } else {
    console.log('  PARAMETER: ❌ NOT FOUND');
  }

  // Test 2: ANA Screen
  const anaTest = await LaboratoryTest.findOne({ name: /antinuclear.*antibody|ana.*screen/i }).populate('category', 'name').lean();
  const anaParam = await LabTestParameter.findOne({ category: /serology/i, parameterName: /ana.*screen.*ifa|ana screen/i }).lean();
  
  console.log('\nANTINUCLEAR ANTIBODY (ANA) SCREEN TEST:');
  if (anaTest) {
    console.log(`  STATUS: FOUND`);
    console.log(`  ID: ${anaTest._id}`);
    console.log(`  NAME: ${anaTest.name}`);
    console.log(`  CATEGORY: ${anaTest.category?.name || 'N/A'}`);
    console.log(`  TEST STATUS: ${anaTest.status}`);
  } else {
    console.log('  STATUS: ❌ NOT FOUND');
  }
  if (anaParam) {
    console.log(`  PARAMETER: ${anaParam.parameterName} [${anaParam._id}]`);
    console.log(`  PARAM REFERENCE: ${anaParam.referenceValue}`);
    console.log(`  PARAM STATUS: ${anaParam.status}`);
  } else {
    console.log('  PARAMETER: ❌ NOT FOUND');
  }

  // Test 3: 24 Hour Urine Protein Test
  const urineTest = await LaboratoryTest.findOne({ name: /24.*urine.*protein|24.*hour.*urine/i }).populate('category', 'name').lean();
  
  console.log('\n24 HOUR URINE PROTEIN TEST:');
  if (urineTest) {
    console.log(`  STATUS: FOUND`);
    console.log(`  ID: ${urineTest._id}`);
    console.log(`  NAME: ${urineTest.name}`);
    console.log(`  CATEGORY: ${urineTest.category?.name || 'N/A'}`);
    console.log(`  TEST STATUS: ${urineTest.status}`);
  } else {
    console.log('  STATUS: ❌ NOT FOUND');
  }
  console.log('  PARAMETERS:');
  for (const p of urineParamsAfter2) {
    console.log(`    - ${p.parameterName} | ${p.subcategory} | unit: ${p.unit} | ref: ${p.referenceValue}`);
  }

  // ============================================================
  // STEP 6: Duplicate check
  // ============================================================
  console.log('\n========================================');
  console.log('STEP 6: DUPLICATE CHECK');
  console.log('========================================');

  const coombsDups = await LaboratoryTest.countDocuments({ name: /indirect.*coombs/i });
  const anaDups = await LaboratoryTest.countDocuments({ name: /antinuclear.*antibody.*screen|ana.*screen.*test/i });
  const urineDups = await LaboratoryTest.countDocuments({ name: /24.*hour.*urine.*protein|24.*hr.*urine.*protein/i });

  console.log(`  Indirect Coombs Test records: ${coombsDups} (expected: 1)`);
  console.log(`  ANA Screen Test records: ${anaDups} (expected: 1)`);
  console.log(`  24 Hour Urine Protein records: ${urineDups} (expected: 1)`);

  const coombsParamDups = await LabTestParameter.countDocuments({ category: /serology/i, parameterName: /indirect.*coombs/i });
  const anaParamDups = await LabTestParameter.countDocuments({ category: /serology/i, parameterName: /ana.*screen/i });
  const urineParamDups = await LabTestParameter.countDocuments({ category: /urine.*body.*fluid/i });

  console.log(`  Indirect Coombs parameters: ${coombsParamDups} (expected: 1)`);
  console.log(`  ANA Screen, IFA parameters: ${anaParamDups} (expected: 1)`);
  console.log(`  URINE AND BODY FLUID parameters: ${urineParamDups} (expected: 4)`);

  // ============================================================
  // STEP 7: Verify SEROLOGY params complete
  // ============================================================
  console.log('\n========================================');
  console.log('STEP 7: SEROLOGY PARAMS COMPLETE LIST');
  console.log('========================================');

  const serologyParams = await LabTestParameter.find({ category: /serology/i }).sort({ displayOrder: 1 }).lean();
  console.log(`  Total: ${serologyParams.length}`);
  serologyParams.forEach(p => console.log(`    [${p.displayOrder}] ${p.parameterName} | status: ${p.status}`));

  // ============================================================
  // STEP 8: Verify categories exist and are Active
  // ============================================================
  console.log('\n========================================');
  console.log('STEP 8: CATEGORY STATUS CHECK');
  console.log('========================================');

  const serologyCat = await LaboratoryTestCategory.findOne({ name: /serology/i }).lean();
  const urineCat = await LaboratoryTestCategory.findOne({ name: /urine.*body.*fluid/i }).lean();

  console.log(`  SEROLOGY AND IMMUNOHEMATOLOGY:`);
  console.log(`    ID: ${serologyCat?._id}`);
  console.log(`    status: ${serologyCat?.status}`);
  console.log(`    hidden: ${serologyCat?.hidden}`);
  
  console.log(`  URINE AND BODY FLUID ANALYSIS:`);
  console.log(`    ID: ${urineCat?._id}`);
  console.log(`    status: ${urineCat?.status}`);
  console.log(`    hidden: ${urineCat?.hidden}`);

  // ============================================================
  // STEP 9: Simulate publicCatalog API query
  // ============================================================
  console.log('\n========================================');
  console.log('STEP 9: SIMULATE publicCatalog API');
  console.log('========================================');

  const activeCats = await LaboratoryTestCategory.find({ status: 'Active', hidden: false }).sort({ displayOrder: 1 }).lean();
  const activeTests = await LaboratoryTest.find({
    status: 'Active',
    category: { $in: activeCats.map(c => c._id) }
  }).populate('category', 'name').sort({ displayOrder: 1 }).lean();

  console.log(`  Active categories: ${activeCats.length}`);
  activeCats.forEach(c => {
    const catTests = activeTests.filter(t => String(t.category?._id) === String(c._id));
    console.log(`\n  📁 ${c.name} (${catTests.length} tests):`);
    catTests.forEach(t => console.log(`      🧪 ${t.name} [${t._id}]`));
  });

  // Check specifically for our three tests
  const allTestNames = activeTests.map(t => t.name);
  console.log('\n  --- Target tests in API response ---');
  console.log(`  Indirect Coombs Test: ${allTestNames.some(n => /indirect.*coombs/i.test(n)) ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
  console.log(`  ANA Screen Test: ${allTestNames.some(n => /antinuclear.*antibody|ana.*screen/i.test(n)) ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
  console.log(`  24 Hour Urine Protein: ${allTestNames.some(n => /24.*urine.*protein/i.test(n)) ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);

  // ============================================================
  // STEP 10: Simulate report-entry/catalog API query
  // ============================================================
  console.log('\n========================================');
  console.log('STEP 10: SIMULATE report-entry/catalog API');
  console.log('========================================');

  const allParams = await LabTestParameter.find({ status: 'Active' }).sort({ category: 1, displayOrder: 1 }).lean();
  
  const grouped = {};
  for (const p of allParams) {
    const cat = p.category || 'OTHER';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  console.log(`  Total active parameters: ${allParams.length}`);
  console.log(`  Categories with parameters: ${Object.keys(grouped).length}`);
  
  // Check our target categories
  const serologyGroup = grouped['SEROLOGY AND IMMUNOHEMATOLOGY'] || [];
  const urineGroup = grouped['URINE AND BODY FLUID ANALYSIS'] || [];
  
  console.log(`\n  SEROLOGY AND IMMUNOHEMATOLOGY params in API: ${serologyGroup.length}`);
  const hasIndirectCoombs = serologyGroup.some(p => /indirect.*coombs/i.test(p.parameterName));
  const hasAnaScreen = serologyGroup.some(p => /ana.*screen/i.test(p.parameterName));
  console.log(`    Indirect Coombs Test: ${hasIndirectCoombs ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
  console.log(`    ANA SCREEN, IFA: ${hasAnaScreen ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
  
  console.log(`\n  URINE AND BODY FLUID ANALYSIS params in API: ${urineGroup.length}`);
  urineGroup.forEach(p => console.log(`    ✅ ${p.parameterName} (${p.subcategory})`));

  console.log('\n========================================');
  console.log('REPAIR AND VERIFICATION COMPLETE');
  console.log('========================================');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
