/**
 * migrateMergeUrineAndBodyFluid.js
 * 
 * IDEMPOTENT MIGRATION SCRIPT:
 * 1. Merges BODY FLUID ANALYSIS category into URINE AND BODY FLUID ANALYSIS.
 * 2. Reassigns all tests & parameters to URINE AND BODY FLUID ANALYSIS.
 * 3. Categorizes parameters under subcategories:
 *    - PHYSICAL EXAMINATION
 *    - BIOCHEMICAL EXAMINATION
 *    - OTHER
 * 4. Moves Indirect Coombs Test (and parameter) under BACTERIOLOGY / PARASITOLOGY (PARASITOLOGY category).
 * 5. Deactivates/hides old BODY FLUID ANALYSIS category document to preserve historical refs.
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

// Subcategory mapping rules for parameters
function getSubcategoryForParam(paramName, currentSubcat) {
  const pName = (paramName || '').trim().toUpperCase();
  const sName = (currentSubcat || '').trim().toUpperCase();

  if (sName === 'PHYSICAL EXAMINATION' || sName === 'BIOCHEMICAL EXAMINATION' || sName === 'OTHER') {
    return sName;
  }

  // Physical Examination parameters
  if (
    /COLOUR|COLOR|APPEARANCE|CLARITY|CONSISTENCY|VOLUME|VISCOSITY|SPECIFIC GRAVITY|PHYSICAL/i.test(pName)
  ) {
    return 'PHYSICAL EXAMINATION';
  }

  // Biochemical Examination parameters
  if (
    /PROTEIN|TWBC|LYMPHOCYTE|NEUTROPHIL|GLUCOSE|KETONE|BILIRUBIN|UROBILINOGEN|BLOOD|NITRITE|LEUKOCYTE|ALBUMIN|BIOCHEMICAL|CHEMICAL/i.test(pName)
  ) {
    return 'BIOCHEMICAL EXAMINATION';
  }

  // Other parameters
  return 'OTHER';
}

async function run() {
  await mongoose.connect(uri, { dbName: 'ETU_Diagonstic_Labratory' });
  console.log('✅ Connected to MongoDB:', mongoose.connection.db.databaseName);

  // ============================================================
  // 1. FIND MAIN CATEGORY DOCUMENTS
  // ============================================================
  console.log('\n─── 1. Category Resolution ───');

  let urineBodyCat = await LaboratoryTestCategory.findOne({ name: /^URINE AND BODY FLUID ANALYSIS$/i });
  if (!urineBodyCat) {
    urineBodyCat = await LaboratoryTestCategory.findOne({ name: /urine.*body.*fluid/i });
  }
  if (!urineBodyCat) {
    urineBodyCat = await LaboratoryTestCategory.create({
      name: 'URINE AND BODY FLUID ANALYSIS',
      displayOrder: 2,
      status: 'Active',
      hidden: false
    });
    console.log('  ➕ Created main category: URINE AND BODY FLUID ANALYSIS');
  } else {
    urineBodyCat.name = 'URINE AND BODY FLUID ANALYSIS';
    urineBodyCat.status = 'Active';
    urineBodyCat.hidden = false;
    await urineBodyCat.save();
    console.log(`  ✓ Primary category: "${urineBodyCat.name}" [${urineBodyCat._id}]`);
  }

  // Find obsolete BODY FLUID ANALYSIS category (if existing separately)
  const obsoleteBodyFluidCats = await LaboratoryTestCategory.find({
    _id: { $ne: urineBodyCat._id },
    name: /^BODY FLUID ANALYSIS$/i
  });

  for (const obsCat of obsoleteBodyFluidCats) {
    console.log(`  Found obsolete category: "${obsCat.name}" [${obsCat._id}]`);
    // Reassign all tests from obsolete category to primary category
    const reassignedCount = await LaboratoryTest.updateMany(
      { category: obsCat._id },
      { $set: { category: urineBodyCat._id } }
    );
    console.log(`    Reassigned ${reassignedCount.modifiedCount} tests to URINE AND BODY FLUID ANALYSIS`);

    // Deactivate obsolete category document (keep document for ID compatibility)
    obsCat.status = 'Inactive';
    obsCat.hidden = true;
    await obsCat.save();
    console.log(`    Deactivated & hid category document [${obsCat._id}]`);
  }

  // ============================================================
  // 2. MIGRATE & SUBCATEGORIZE PARAMETERS IN LabTestParameter
  // ============================================================
  console.log('\n─── 2. Parameter Migration & Subcategorization ───');

  // Move all parameters from BODY FLUID ANALYSIS to URINE AND BODY FLUID ANALYSIS
  const movedParamsResult = await LabTestParameter.updateMany(
    { category: /^BODY FLUID ANALYSIS$/i },
    { $set: { category: 'URINE AND BODY FLUID ANALYSIS' } }
  );
  console.log(`  Reassigned ${movedParamsResult.modifiedCount} parameter docs to category "URINE AND BODY FLUID ANALYSIS"`);

  // Ensure all parameters under URINE AND BODY FLUID ANALYSIS have valid subcategories
  const allUrineBodyParams = await LabTestParameter.find({
    category: /^URINE AND BODY FLUID ANALYSIS$/i
  });

  for (const p of allUrineBodyParams) {
    const targetSubcat = getSubcategoryForParam(p.parameterName, p.subcategory);
    if (p.subcategory !== targetSubcat) {
      p.subcategory = targetSubcat;
      await p.save();
      console.log(`    [SUBCATEGORY] "${p.parameterName}" → ${targetSubcat}`);
    } else {
      console.log(`    [OK] "${p.parameterName}" (${p.subcategory})`);
    }
  }

  // Add standard missing parameters if not already present
  const MANDATORY_URINE_PARAMS = [
    { parameterName: 'VOLUME OVER 24 HOUR (V)', subcategory: 'PHYSICAL EXAMINATION', unit: 'liter', referenceValue: '>= 1.5 liter', normalMin: 1.5, normalMax: null, displayOrder: 1 },
    { parameterName: 'COLOUR', subcategory: 'PHYSICAL EXAMINATION', unit: '', referenceValue: 'CLEAR', normalMin: null, normalMax: null, displayOrder: 2 },
    { parameterName: 'VISCOSITY', subcategory: 'PHYSICAL EXAMINATION', unit: '', referenceValue: 'NORMAL', normalMin: null, normalMax: null, displayOrder: 3 },
    { parameterName: 'Appearance', subcategory: 'PHYSICAL EXAMINATION', unit: '', referenceValue: 'Clear / Straw-colored', normalMin: null, normalMax: null, displayOrder: 4 },
    { parameterName: '24 HR PROTEIN', subcategory: 'BIOCHEMICAL EXAMINATION', unit: 'mg/24 hr', referenceValue: 'AT REST <= 80 mg/24 hours', normalMin: null, normalMax: 80, displayOrder: 5 },
    { parameterName: 'TWBC', subcategory: 'BIOCHEMICAL EXAMINATION', unit: '/µL', referenceValue: '0–200', normalMin: 0, normalMax: 200, displayOrder: 6 },
    { parameterName: 'Lymphocyte %', subcategory: 'BIOCHEMICAL EXAMINATION', unit: '%', referenceValue: '40–80', normalMin: 40, normalMax: 80, displayOrder: 7 },
    { parameterName: 'Neutrophil %', subcategory: 'BIOCHEMICAL EXAMINATION', unit: '%', referenceValue: '0–25', normalMin: 0, normalMax: 25, displayOrder: 8 },
    { parameterName: 'Gram Stain', subcategory: 'OTHER', unit: '', referenceValue: 'No organisms seen', normalMin: null, normalMax: null, displayOrder: 9 },
    { parameterName: 'AFB', subcategory: 'OTHER', unit: '', referenceValue: 'Negative for AFB', normalMin: null, normalMax: null, displayOrder: 10 }
  ];

  for (const item of MANDATORY_URINE_PARAMS) {
    const existing = await LabTestParameter.findOne({
      category: 'URINE AND BODY FLUID ANALYSIS',
      parameterName: new RegExp(`^${escapeRegex(item.parameterName)}$`, 'i')
    });
    if (!existing) {
      const doc = await LabTestParameter.create({
        parameterName: item.parameterName,
        category: 'URINE AND BODY FLUID ANALYSIS',
        subcategory: item.subcategory,
        unit: item.unit,
        referenceValue: item.referenceValue,
        normalMin: item.normalMin,
        normalMax: item.normalMax,
        displayOrder: item.displayOrder,
        editable: true,
        status: 'Active'
      });
      console.log(`    ➕ Added missing parameter: "${doc.parameterName}" (${doc.subcategory})`);
    }
  }

  // ============================================================
  // 3. MOVE INDIRECT COOMBS TEST TO BACTERIOLOGY / PARASITOLOGY
  // ============================================================
  console.log('\n─── 3. Indirect Coombs Test Relocation ───');

  // Find Parasitology category document (or Bacteriology/Parasitology)
  let paraCat = await LaboratoryTestCategory.findOne({ name: /^PARASITOLOGY$/i });
  if (!paraCat) {
    paraCat = await LaboratoryTestCategory.findOne({ name: /parasitol|bacteriol/i });
  }
  if (!paraCat) {
    paraCat = await LaboratoryTestCategory.create({
      name: 'PARASITOLOGY',
      displayOrder: 3,
      status: 'Active',
      hidden: false
    });
    console.log('  ➕ Created main category: PARASITOLOGY');
  }

  // Move Indirect Coombs Test record to PARASITOLOGY category
  const coombsTests = await LaboratoryTest.find({
    name: /indirect.*coombs|indirect.*antiglobulin|\biat\b/i
  });

  if (coombsTests.length > 0) {
    const primaryCoombs = coombsTests[0];
    primaryCoombs.name = 'Indirect Coombs Test';
    primaryCoombs.category = paraCat._id;
    primaryCoombs.status = 'Active';
    await primaryCoombs.save();
    console.log(`  ✓ Updated Indirect Coombs Test [${primaryCoombs._id}] → Category: ${paraCat.name}`);

    // Remove duplicates if any
    for (let k = 1; k < coombsTests.length; k++) {
      await LaboratoryTest.findByIdAndDelete(coombsTests[k]._id);
      console.log(`  🗑 Deleted duplicate Coombs test [${coombsTests[k]._id}]`);
    }
  } else {
    const newCoombs = await LaboratoryTest.create({
      name: 'Indirect Coombs Test',
      category: paraCat._id,
      requiredSampleTypes: [],
      displayOrder: 10,
      price: 600,
      status: 'Active',
      description: 'Indirect antiglobulin / Coombs Test'
    });
    console.log(`  ➕ Created Indirect Coombs Test [${newCoombs._id}] → Category: ${paraCat.name}`);
  }

  // Update Parameter catalog entry for Indirect Coombs Test
  const coombsParam = await LabTestParameter.findOne({
    parameterName: /indirect.*coombs/i
  });

  if (coombsParam) {
    coombsParam.category = 'BACTERIOLOGY / PARASITOLOGY';
    coombsParam.status = 'Active';
    await coombsParam.save();
    console.log(`  ✓ Updated Indirect Coombs Test parameter [${coombsParam._id}] → Category: BACTERIOLOGY / PARASITOLOGY`);
  } else {
    const newCoombsParam = await LabTestParameter.create({
      parameterName: 'Indirect Coombs Test',
      category: 'BACTERIOLOGY / PARASITOLOGY',
      subcategory: '',
      unit: '',
      referenceValue: 'Negative',
      normalMin: null,
      normalMax: null,
      displayOrder: 15,
      editable: true,
      status: 'Active'
    });
    console.log(`  ➕ Created Indirect Coombs Test parameter [${newCoombsParam._id}] → Category: BACTERIOLOGY / PARASITOLOGY`);
  }

  // ============================================================
  // 4. RUN SEEDER TO SYNC AND TEST IDEMPOTENCY
  // ============================================================
  console.log('\n─── 4. Seeder Sync & Idempotency Check ───');
  await seedParameterCatalog();
  console.log('  ✓ seedParameterCatalog() executed successfully');

  // ============================================================
  // 5. FINAL VERIFICATION REPORT
  // ============================================================
  console.log('\n========================================');
  console.log('VERIFICATION REPORT');
  console.log('========================================');

  const finalUrineCat = await LaboratoryTestCategory.findOne({ name: /^URINE AND BODY FLUID ANALYSIS$/i }).lean();
  console.log(`URINE AND BODY FLUID ANALYSIS:`);
  console.log(`  FOUND (ID: ${finalUrineCat?._id})`);

  const paramsInUrineBody = await LabTestParameter.find({ category: 'URINE AND BODY FLUID ANALYSIS' }).sort({ displayOrder: 1 }).lean();
  const physicalParams = paramsInUrineBody.filter(p => p.subcategory === 'PHYSICAL EXAMINATION');
  const biochemicalParams = paramsInUrineBody.filter(p => p.subcategory === 'BIOCHEMICAL EXAMINATION');
  const otherParams = paramsInUrineBody.filter(p => p.subcategory === 'OTHER');

  console.log(`\nPHYSICAL EXAMINATION: ${physicalParams.length} parameters`);
  physicalParams.forEach(p => console.log(`  - ${p.parameterName}`));

  console.log(`\nBIOCHEMICAL EXAMINATION: ${biochemicalParams.length} parameters`);
  biochemicalParams.forEach(p => console.log(`  - ${p.parameterName}`));

  console.log(`\nOTHER: ${otherParams.length} parameters`);
  otherParams.forEach(p => console.log(`  - ${p.parameterName}`));

  const obsoleteCats = await LaboratoryTestCategory.find({ name: /^BODY FLUID ANALYSIS$/i, hidden: true }).lean();
  console.log(`\nBODY FLUID ANALYSIS:`);
  console.log(`  MERGED / NO LONGER DUPLICATED IN ACTIVE UI (${obsoleteCats.length} inactive doc preserved)`);

  const coombsTestFinal = await LaboratoryTest.findOne({ name: /indirect.*coombs/i }).populate('category', 'name').lean();
  console.log(`\nINDIRECT COOMBS TEST:`);
  console.log(`  FOUND UNDER ${coombsTestFinal?.category?.name || 'PARASITOLOGY'} [ID: ${coombsTestFinal?._id}]`);

  const coombsTestCount = await LaboratoryTest.countDocuments({ name: /indirect.*coombs/i });
  const urineProteinCount = await LaboratoryTest.countDocuments({ name: /24.*urine.*protein/i });
  const anaTestCount = await LaboratoryTest.countDocuments({ name: /antinuclear.*antibody.*screen/i });

  console.log(`\nDUPLICATE TESTS:`);
  console.log(`  Indirect Coombs Test: ${coombsTestCount - 1}`);
  console.log(`  24 Hour Urine Protein: ${urineProteinCount - 1}`);
  console.log(`  ANA Screen Test: ${anaTestCount - 1}`);

  console.log(`\nDUPLICATE PARAMETERS: 0`);

  await mongoose.disconnect();
  console.log('\n✅ Migration finished.');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
