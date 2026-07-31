/**
 * migrateUpdateSemenAnalysis.js
 * 
 * Idempotent migration to:
 * 1. Find existing SEMEN ANALYSIS test and parameters.
 * 2. Preserve all existing parameters (keeping original _ids).
 * 3. Add all missing parameters.
 * 4. Organize all parameters into 4 subcategories:
 *    - Physical Examination
 *    - BIOCHEMICAL Examination
 *    - Microscopic Examination
 *    - Other findings
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
  console.log('✅ Connected to MongoDB:', mongoose.connection.db.databaseName);

  // ============================================================
  // 1. INSPECT EXISTING SEMEN ANALYSIS TEST & PARAMETERS
  // ============================================================
  console.log('\n─── 1. Inspect Existing Semen Analysis ───');

  const existingSemenTest = await LaboratoryTest.findOne({ name: /semen.*analysis|semen/i });
  if (existingSemenTest) {
    console.log(`  ✓ Found Semen Analysis test: "${existingSemenTest.name}" [ID: ${existingSemenTest._id}]`);
  } else {
    console.log('  ⚠ Semen Analysis test document missing, searching categories...');
  }

  const existingParams = await LabTestParameter.find({ category: /^SEMEN ANALYSIS$/i });
  console.log(`  Existing parameter docs count: ${existingParams.length}`);
  existingParams.forEach(p => console.log(`    - "${p.parameterName}" [ID: ${p._id}] subcat: "${p.subcategory}"`));

  // ============================================================
  // 2. DEFINE COMBINED PARAMETER SET WITH 4 SUBCATEGORIES
  // ============================================================
  const FULL_SEMEN_PARAMS = [
    // Physical Examination
    {
      parameterName: 'TIME OF COLLECTION',
      subcategory: 'Physical Examination',
      unit: '',
      referenceValue: 'Morning collection time if applicable',
      normalMin: null,
      normalMax: null,
      displayOrder: 1,
      aliases: ['TIME OF COLLECTION', 'Time of Collection', 'Collection Time']
    },
    {
      parameterName: 'ABSTINENCE TIME (DAY)',
      subcategory: 'Physical Examination',
      unit: 'days',
      referenceValue: '2 – 7 days',
      normalMin: 2,
      normalMax: 7,
      displayOrder: 2,
      aliases: ['ABSTINENCE TIME (DAY)', 'ABSTINENCE TIME', 'Abstinence Time (Day)', 'Abstinence Time', 'Abstinence']
    },
    {
      parameterName: 'Volume',
      subcategory: 'Physical Examination',
      unit: 'mL',
      referenceValue: '≥ 1.5',
      normalMin: 1.5,
      normalMax: null,
      displayOrder: 3,
      aliases: ['Volume', 'VOLUME', 'Semen Volume']
    },
    {
      parameterName: 'COLOUR',
      subcategory: 'Physical Examination',
      unit: '',
      referenceValue: 'Homogenous grey opalescent',
      normalMin: null,
      normalMax: null,
      displayOrder: 4,
      aliases: ['COLOUR', 'COLOR', 'Colour', 'Color']
    },
    {
      parameterName: 'Viscosity',
      subcategory: 'Physical Examination',
      unit: '',
      referenceValue: 'Normal (< 2 cm thread)',
      normalMin: null,
      normalMax: null,
      displayOrder: 5,
      aliases: ['Viscosity', 'VISCOSITY']
    },
    {
      parameterName: 'LIQUEFACTION',
      subcategory: 'Physical Examination',
      unit: 'minutes',
      referenceValue: '<= 60 MINUTES',
      normalMin: null,
      normalMax: 60,
      displayOrder: 6,
      aliases: ['LIQUEFACTION', 'Liquefaction', 'Liquefaction Time']
    },

    // BIOCHEMICAL Examination
    {
      parameterName: 'REACTION / PH',
      subcategory: 'BIOCHEMICAL Examination',
      unit: 'pH',
      referenceValue: '7.2 – 8.2',
      normalMin: 7.2,
      normalMax: 8.2,
      displayOrder: 7,
      aliases: ['REACTION / PH', 'REACTION/PH', 'Reaction / pH', 'pH', 'PH']
    },
    {
      parameterName: 'SEMEN PROTEIN',
      subcategory: 'BIOCHEMICAL Examination',
      unit: '',
      referenceValue: 'PRESENT',
      normalMin: null,
      normalMax: null,
      displayOrder: 8,
      aliases: ['SEMEN PROTEIN', 'Semen Protein']
    },

    // Microscopic Examination
    {
      parameterName: 'Sperm Count',
      subcategory: 'Microscopic Examination',
      unit: 'M/mL',
      referenceValue: '≥ 15',
      normalMin: 15,
      normalMax: null,
      displayOrder: 9,
      aliases: ['Sperm Count', 'SPERM CONCENTRATION', 'Sperm Concentration', 'SPERM COUNT']
    },
    {
      parameterName: 'AGGLUTINATION',
      subcategory: 'Microscopic Examination',
      unit: '',
      referenceValue: 'ABSENT',
      normalMin: null,
      normalMax: null,
      displayOrder: 10,
      aliases: ['AGGLUTINATION', 'Agglutination']
    },
    {
      parameterName: 'Motility',
      subcategory: 'Microscopic Examination',
      unit: '%',
      referenceValue: '≥ 40',
      normalMin: 40,
      normalMax: null,
      displayOrder: 11,
      aliases: ['Motility', 'MOTILITY', 'Sperm Motility']
    },
    {
      parameterName: 'PROGRESSIVE MOTILITY',
      subcategory: 'Microscopic Examination',
      unit: '%',
      referenceValue: '>=32%',
      normalMin: 32,
      normalMax: null,
      displayOrder: 12,
      aliases: ['PROGRESSIVE MOTILITY', 'Progressive Motility']
    },
    {
      parameterName: 'NON-PROGRESSIVE MOTILITY',
      subcategory: 'Microscopic Examination',
      unit: '%',
      referenceValue: '>=40%',
      normalMin: 40,
      normalMax: null,
      displayOrder: 13,
      aliases: ['NON-PROGRESSIVE MOTILITY', 'Non-Progressive Motility']
    },
    {
      parameterName: 'TOTAL MOTILITY (P + NP)',
      subcategory: 'Microscopic Examination',
      unit: '%',
      referenceValue: '>40%',
      normalMin: 40,
      normalMax: null,
      displayOrder: 14,
      aliases: ['TOTAL MOTILITY (P + NP)', 'TOTAL MOTILITY', 'Total Motility (P + NP)', 'Total Motility']
    },
    {
      parameterName: 'NON-MOTILITY',
      subcategory: 'Microscopic Examination',
      unit: '%',
      referenceValue: '<40%',
      normalMin: null,
      normalMax: 40,
      displayOrder: 15,
      aliases: ['NON-MOTILITY', 'Non-Motility', 'Immotile', 'IMMOTILE']
    },
    {
      parameterName: 'Morphology',
      subcategory: 'Microscopic Examination',
      unit: '% Normal',
      referenceValue: '≥ 4',
      normalMin: 4,
      normalMax: null,
      displayOrder: 16,
      aliases: ['Morphology', 'MORPHOLOGY']
    },
    {
      parameterName: 'NORMAL FORMS',
      subcategory: 'Microscopic Examination',
      unit: '%',
      referenceValue: '>=4%',
      normalMin: 4,
      normalMax: null,
      displayOrder: 17,
      aliases: ['NORMAL FORMS', 'Normal Forms']
    },
    {
      parameterName: 'ABNORMAL FORMS',
      subcategory: 'Microscopic Examination',
      unit: '%',
      referenceValue: '',
      normalMin: null,
      normalMax: null,
      displayOrder: 18,
      aliases: ['ABNORMAL FORMS', 'Abnormal Forms']
    },
    {
      parameterName: 'SPERM VITALITY',
      subcategory: 'Microscopic Examination',
      unit: '%',
      referenceValue: '>=58%',
      normalMin: 58,
      normalMax: null,
      displayOrder: 19,
      aliases: ['SPERM VITALITY', 'Sperm Vitality', 'Vitality']
    },

    // Other findings
    {
      parameterName: 'PUS CELLS',
      subcategory: 'Other findings',
      unit: '',
      referenceValue: '1 – 2',
      normalMin: 1,
      normalMax: 2,
      displayOrder: 20,
      aliases: ['PUS CELLS', 'Pus Cells', 'Pus Cell']
    },
    {
      parameterName: 'EPITHELIAL CELLS',
      subcategory: 'Other findings',
      unit: '/HPF',
      referenceValue: '1 – 2 /HPF',
      normalMin: 1,
      normalMax: 2,
      displayOrder: 21,
      aliases: ['EPITHELIAL CELLS', 'Epithelial Cells']
    },
    {
      parameterName: 'RBC',
      subcategory: 'Other findings',
      unit: '',
      referenceValue: '0 - 2',
      normalMin: 0,
      normalMax: 2,
      displayOrder: 22,
      aliases: ['RBC', 'Red Blood Cells']
    }
  ];

  // ============================================================
  // 3. UPSERT PARAMETERS SAFELY (KEEP EXISTING OBJECT_IDs)
  // ============================================================
  console.log('\n─── 2. Upserting Parameters into SEMEN ANALYSIS ───');

  for (const pDef of FULL_SEMEN_PARAMS) {
    const searchNames = [pDef.parameterName, ...(pDef.aliases || [])];
    const existing = await LabTestParameter.findOne({
      category: 'SEMEN ANALYSIS',
      $or: searchNames.map(n => ({ parameterName: new RegExp(`^${escapeRegex(n.trim())}$`, 'i') }))
    });

    if (existing) {
      let changed = false;
      if (existing.subcategory !== pDef.subcategory) {
        existing.subcategory = pDef.subcategory;
        changed = true;
      }
      if (pDef.unit && (!existing.unit || existing.unit === '')) {
        existing.unit = pDef.unit;
        changed = true;
      }
      if (pDef.referenceValue && (!existing.referenceValue || existing.referenceValue === '—')) {
        existing.referenceValue = pDef.referenceValue;
        changed = true;
      }
      if (pDef.displayOrder !== undefined && existing.displayOrder !== pDef.displayOrder) {
        existing.displayOrder = pDef.displayOrder;
        changed = true;
      }
      existing.status = 'Active';
      if (changed) await existing.save();
      console.log(`  ✓ Updated existing parameter: "${existing.parameterName}" → subcat: "${existing.subcategory}" [ID: ${existing._id}]`);
    } else {
      const created = await LabTestParameter.create({
        parameterName: pDef.parameterName,
        category: 'SEMEN ANALYSIS',
        subcategory: pDef.subcategory,
        unit: pDef.unit,
        referenceValue: pDef.referenceValue,
        normalMin: pDef.normalMin,
        normalMax: pDef.normalMax,
        displayOrder: pDef.displayOrder,
        editable: true,
        status: 'Active'
      });
      console.log(`  ➕ Created missing parameter: "${created.parameterName}" → subcat: "${created.subcategory}" [ID: ${created._id}]`);
    }
  }

  // ============================================================
  // 4. SYNC WITH PARAMETER SEEDER AND CHECK IDEMPOTENCY
  // ============================================================
  console.log('\n─── 3. Seeder Sync & Idempotency Check ───');
  await seedParameterCatalog();

  // ============================================================
  // 5. VERIFICATION REPORT
  // ============================================================
  console.log('\n========================================');
  console.log('FINAL VERIFICATION REPORT');
  console.log('========================================');

  const finalParams = await LabTestParameter.find({ category: 'SEMEN ANALYSIS' }).sort({ displayOrder: 1 }).lean();
  console.log(`SEMEN ANALYSIS Total Parameters: ${finalParams.length}`);

  const grouped = {};
  for (const p of finalParams) {
    const sc = p.subcategory || 'Uncategorized';
    if (!grouped[sc]) grouped[sc] = [];
    grouped[sc].push(p);
  }

  for (const [scName, pList] of Object.entries(grouped)) {
    console.log(`\n  📂 ${scName} (${pList.length} parameters):`);
    pList.forEach(p => console.log(`    - ${p.parameterName} | Unit: ${p.unit || '—'} | Ref: ${p.referenceValue || '—'}`));
  }

  await mongoose.disconnect();
  console.log('\n✅ Migration complete.');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
