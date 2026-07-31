/**
 * migrateNewTests.js
 *
 * Idempotent migration for:
 *   1. Indirect Coombs Test       → already exists; verify only
 *   2. ANTINUCLEAR ANTIBODY (ANA) SCREEN TEST → normalize name; add ANA SCREEN, IFA parameter
 *   3. 24 HOUR URINE PROTEIN TEST → create if missing; add 4 parameters
 *
 * Run with:
 *   node --experimental-vm-modules backend/src/scripts/migrateNewTests.js
 *   OR: node -r dotenv/config backend/src/scripts/migrateNewTests.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load backend/.env (scripts/ is 2 levels below backend/)
dotenv.config({ path: resolve(__dirname, '../../.env') });

// ── Import models ──────────────────────────────────────────────────────────────
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LabTestParameter from '../models/LabTestParameter.js';

const MONGO_URI = process.env.MONGODB_URI_FALLBACK?.trim() || process.env.MONGODB_URI?.trim() || 'mongodb://localhost:27017/etu_diagnostic';

// ── Normalisation helper ───────────────────────────────────────────────────────
const escapeRegex = v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Find a parameter by any of the supplied name variants inside a given category.
 * Search is case-insensitive and trims whitespace.
 */
async function findParam(category, names) {
  return LabTestParameter.findOne({
    category,
    $or: names.map(n => ({ parameterName: new RegExp(`^${escapeRegex(n.trim())}$`, 'i') }))
  });
}

/**
 * Upsert a single LabTestParameter.
 * If found → update display fields but keep _id.
 * If missing → create fresh.
 */
async function upsertParam(category, subcategory, p) {
  const existing = await findParam(category, [p.parameterName, ...(p.aliases || [])]);
  if (existing) {
    let changed = false;
    if (existing.parameterName !== p.parameterName) { existing.parameterName = p.parameterName; changed = true; }
    if (existing.subcategory !== subcategory) { existing.subcategory = subcategory; changed = true; }
    if (p.unit !== undefined && existing.unit !== p.unit) { existing.unit = p.unit; changed = true; }
    if (p.referenceValue !== undefined && existing.referenceValue !== p.referenceValue) { existing.referenceValue = p.referenceValue; changed = true; }
    if (p.normalMin !== undefined) { existing.normalMin = p.normalMin; changed = true; }
    if (p.normalMax !== undefined) { existing.normalMax = p.normalMax; changed = true; }
    if (p.displayOrder !== undefined) { existing.displayOrder = p.displayOrder; changed = true; }
    if (changed) await existing.save();
    return { action: 'updated', id: existing._id, name: p.parameterName };
  }
  const doc = await LabTestParameter.create({
    parameterName: p.parameterName,
    category,
    subcategory: subcategory || '',
    unit: p.unit || '',
    referenceValue: p.referenceValue || '',
    normalMin: p.normalMin ?? null,
    normalMax: p.normalMax ?? null,
    displayOrder: p.displayOrder || 1,
    editable: true,
    status: 'Active'
  });
  return { action: 'created', id: doc._id, name: p.parameterName };
}

async function run() {
  await mongoose.connect(MONGO_URI, { dbName: 'ETU_Diagonstic_Labratory' });
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  // ============================================================
  // 1. INDIRECT COOMBS TEST — verify only
  // ============================================================
  console.log('\n─── 1. INDIRECT COOMBS TEST ───');

  const serologyCat = await LaboratoryTestCategory.findOne({ name: /serology.*immuno|immuno.*serology/i });
  if (!serologyCat) {
    console.warn('  ⚠  SEROLOGY AND IMMUNOHEMATOLOGY category not found. Skipping.');
  } else {
    const indirectTest = await LaboratoryTest.findOne({
      category: serologyCat._id,
      name: /indirect.*coomb|indirect.*antiglobulin|\biat\b/i
    });
    if (indirectTest) {
      console.log(`  ✓ Found: "${indirectTest.name}" [${indirectTest._id}]`);
    } else {
      // Create if truly missing
      const created = await LaboratoryTest.create({
        name: 'Indirect Coombs Test',
        category: serologyCat._id,
        requiredSampleTypes: [],
        displayOrder: 11,
        price: 600,
        status: 'Active',
        description: 'Indirect antiglobulin / Coombs Test'
      });
      console.log(`  ➕ Created: "Indirect Coombs Test" [${created._id}]`);
    }

    // Verify / create the LabTestParameter
    const paramResult = await upsertParam('SEROLOGY AND IMMUNOHEMATOLOGY', '', {
      parameterName: 'Indirect Coombs Test',
      aliases: ['Indirect Coombs', 'INDIRECT COOMBS TEST', 'INDIRECT ANTIGLOBULIN TEST', 'IAT', 'INDIRECT ANTIGLOBULIN / COOMBS TEST'],
      unit: '',
      referenceValue: 'Negative',
      normalMin: null,
      normalMax: null,
      displayOrder: 11
    });
    console.log(`  Parameter: ${paramResult.action} "${paramResult.name}" [${paramResult.id}]`);
  }

  // ============================================================
  // 2. ANA SCREEN — normalize test name; add ANA SCREEN, IFA parameter
  // ============================================================
  console.log('\n─── 2. ANTINUCLEAR ANTIBODY (ANA) SCREEN TEST ───');

  const CANONICAL_ANA = 'ANTINUCLEAR ANTIBODY (ANA) SCREEN TEST';

  if (!serologyCat) {
    console.warn('  ⚠  SEROLOGY AND IMMUNOHEMATOLOGY category not found. Skipping ANA.');
  } else {
    // Find any existing ANA-like test
    const anaMatches = await LaboratoryTest.find({
      category: serologyCat._id,
      name: /\bana\b|antinuclear.*antibody/i
    });

    if (anaMatches.length > 0) {
      const primary = anaMatches[0];
      const oldName = primary.name;
      primary.name = CANONICAL_ANA;
      await primary.save();
      console.log(`  ✓ Normalized test: "${oldName}" → "${CANONICAL_ANA}" [${primary._id}]`);

      // Delete duplicates
      for (let k = 1; k < anaMatches.length; k++) {
        await LaboratoryTest.findByIdAndDelete(anaMatches[k]._id);
        console.log(`  🗑  Deleted duplicate ANA test: "${anaMatches[k].name}" [${anaMatches[k]._id}]`);
      }
    } else {
      // Create new ANA test
      const created = await LaboratoryTest.create({
        name: CANONICAL_ANA,
        category: serologyCat._id,
        requiredSampleTypes: [],
        displayOrder: 17,
        price: 600,
        status: 'Active',
        description: 'Antinuclear Antibody (ANA) Screen Test by Indirect Fluorescent Antibody'
      });
      console.log(`  ➕ Created: "${CANONICAL_ANA}" [${created._id}]`);
    }

    // Verify / create ANA SCREEN, IFA parameter
    const anaParamResult = await upsertParam('SEROLOGY AND IMMUNOHEMATOLOGY', '', {
      parameterName: 'ANA SCREEN, IFA',
      aliases: ['ANA SCREEN IFA', 'ANA SCREEN', 'ANA IFA', 'ANTINUCLEAR ANTIBODY SCREEN', 'ANA', 'ANA SCREEN TEST'],
      unit: '',
      referenceValue: 'Negative',
      normalMin: null,
      normalMax: null,
      displayOrder: 13
    });
    console.log(`  Parameter: ${anaParamResult.action} "${anaParamResult.name}" [${anaParamResult.id}]`);
  }

  // ============================================================
  // 3. 24 HOUR URINE PROTEIN TEST
  // ============================================================
  console.log('\n─── 3. 24 HOUR URINE PROTEIN TEST ───');

  // Find or create URINE AND BODY FLUID ANALYSIS category
  let urineCat = await LaboratoryTestCategory.findOne({ name: /urine.*body.*fluid|urine.*fluid/i });
  if (!urineCat) urineCat = await LaboratoryTestCategory.findOne({ name: new RegExp('^URINE AND BODY FLUID ANALYSIS$', 'i') });
  if (!urineCat) {
    urineCat = await LaboratoryTestCategory.create({ name: 'URINE AND BODY FLUID ANALYSIS', displayOrder: 2 });
    console.log(`  ➕ Created category: "URINE AND BODY FLUID ANALYSIS" [${urineCat._id}]`);
  } else {
    console.log(`  ✓ Found category: "${urineCat.name}" [${urineCat._id}]`);
  }

  const URINE_PROTEIN_NAMES = [
    '24 HOUR URINE PROTEIN TEST',
    '24 HR URINE PROTEIN TEST',
    '24-HOUR URINE PROTEIN',
    '24 HR PROTEIN TEST',
    'URINE PROTEIN 24 HOUR'
  ];

  const urineProteinMatches = await LaboratoryTest.find({
    name: { $in: URINE_PROTEIN_NAMES.map(n => new RegExp(`^${escapeRegex(n)}$`, 'i')) }
  });

  // Also search by regex
  const urineProteinRegexMatches = await LaboratoryTest.find({
    name: /24.?hour.*urine.*protein|24.?hr.*urine.*protein|urine.*protein.*24/i
  });

  const allUrineProteinMatches = [...new Map(
    [...urineProteinMatches, ...urineProteinRegexMatches].map(t => [String(t._id), t])
  ).values()];

  if (allUrineProteinMatches.length > 0) {
    const primary = allUrineProteinMatches[0];
    const oldName = primary.name;
    primary.name = '24 HOUR URINE PROTEIN TEST';
    primary.category = urineCat._id;
    await primary.save();
    console.log(`  ✓ Normalized test: "${oldName}" → "24 HOUR URINE PROTEIN TEST" [${primary._id}]`);

    for (let k = 1; k < allUrineProteinMatches.length; k++) {
      await LaboratoryTest.findByIdAndDelete(allUrineProteinMatches[k]._id);
      console.log(`  🗑  Deleted duplicate: "${allUrineProteinMatches[k].name}" [${allUrineProteinMatches[k]._id}]`);
    }
  } else {
    const created = await LaboratoryTest.create({
      name: '24 HOUR URINE PROTEIN TEST',
      category: urineCat._id,
      requiredSampleTypes: [],
      displayOrder: 1,
      price: 600,
      status: 'Active',
      description: '24 hour urine protein examination'
    });
    console.log(`  ➕ Created: "24 HOUR URINE PROTEIN TEST" [${created._id}]`);
  }

  // Merge parameters for 24 Hour Urine Protein (ADDITIVE ONLY)
  const URINE_PROTEIN_PARAMS = [
    {
      parameterName: 'VOLUME OVER 24 HOUR (V)',
      aliases: ['VOLUME OVER 24 HOUR', 'VOLUME OVER 24 HR', '24 HOUR VOLUME', '24 HR VOLUME', 'VOLUME (V)'],
      subcategory: 'PHYSICAL EXAMINATION',
      unit: 'liter',
      referenceValue: '>= 1.5 liter',
      normalMin: 1.5,
      normalMax: null,
      displayOrder: 1
    },
    {
      parameterName: 'COLOUR',
      aliases: ['COLOR', 'COLOUR', 'Colour', 'Color'],
      subcategory: 'PHYSICAL EXAMINATION',
      unit: '',
      referenceValue: 'CLEAR',
      normalMin: null,
      normalMax: null,
      displayOrder: 2
    },
    {
      parameterName: 'VISCOSITY',
      aliases: ['VISCOSITY', 'Viscosity'],
      subcategory: 'PHYSICAL EXAMINATION',
      unit: '',
      referenceValue: 'NORMAL',
      normalMin: null,
      normalMax: null,
      displayOrder: 3
    },
    {
      parameterName: '24 HR PROTEIN',
      aliases: ['24 HR PROTEIN', '24 HOUR PROTEIN', '24-HOUR PROTEIN', 'URINE PROTEIN 24 HOUR', '24H PROTEIN', '24-HR PROTEIN'],
      subcategory: 'BIOCHEMICAL EXAMINATION',
      unit: 'mg/24 hr',
      referenceValue: 'AT REST <= 80 mg/24 hours',
      normalMin: null,
      normalMax: 80,
      displayOrder: 4
    }
  ];

  for (const p of URINE_PROTEIN_PARAMS) {
    const result = await upsertParam('URINE AND BODY FLUID ANALYSIS', p.subcategory, p);
    console.log(`  Parameter: ${result.action} "${result.name}" [${result.id}]`);
  }

  // ============================================================
  // VERIFICATION SUMMARY
  // ============================================================
  console.log('\n─── VERIFICATION ───');

  const serologyParams = await LabTestParameter.find({ category: 'SEROLOGY AND IMMUNOHEMATOLOGY' }).sort({ displayOrder: 1 });
  console.log(`\nSEROLOGY AND IMMUNOHEMATOLOGY parameters (${serologyParams.length} total):`);
  serologyParams.forEach(p => console.log(`  [${p.displayOrder}] ${p.parameterName}`));

  const urineParams = await LabTestParameter.find({ category: 'URINE AND BODY FLUID ANALYSIS' }).sort({ displayOrder: 1 });
  console.log(`\nURINE AND BODY FLUID ANALYSIS parameters (${urineParams.length} total):`);
  urineParams.forEach(p => console.log(`  [${p.displayOrder}] ${p.parameterName} (${p.subcategory})`));

  const indirectCoombsCount = await LaboratoryTest.countDocuments({ name: /indirect.*coomb|indirect.*antiglobulin|\biat\b/i });
  const anaCount = await LaboratoryTest.countDocuments({ name: /\bana\b|antinuclear.*antibody/i });
  const urineProteinCount = await LaboratoryTest.countDocuments({ name: /24.*urine.*protein|urine.*protein.*24/i });

  console.log('\n── Test counts ──');
  console.log(`  Indirect Coombs Test equivalents: ${indirectCoombsCount} (should be 1)`);
  console.log(`  ANA test equivalents: ${anaCount} (should be 1)`);
  console.log(`  24 Hour Urine Protein Test equivalents: ${urineProteinCount} (should be 1)`);

  await mongoose.disconnect();
  console.log('\n✅ Migration complete.');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
