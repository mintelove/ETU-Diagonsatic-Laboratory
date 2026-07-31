import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LabTestParameter from '../models/LabTestParameter.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import { seedParameterCatalog } from '../config/parameterCatalogSeeder.js';

dotenv.config();

const TARGET_ELECTROLYTE_PARAMS = [
  { parameterName: 'T. CALCIUM', unit: 'mmol/L', referenceValue: '2.1–2.6', normalMin: 2.1, normalMax: 2.6, displayOrder: 1, aliases: ['T.CALCIUM', 'T. CALCIUM', 'TOTAL CALCIUM', 'TOTAL CALCIUM (T.CALCIUM)', 'Total Calcium'] },
  { parameterName: 'CALCIUM ION++', unit: 'mmol/L', referenceValue: '1.1–1.35', normalMin: 1.1, normalMax: 1.35, displayOrder: 2, aliases: ['CALCIUM ION++', 'CALCIUM ION', 'IONIZED CALCIUM', 'IONIZED CALCIUM++', 'Ionized Calcium'] },
  { parameterName: 'nCALCIUM', unit: 'mmol/L', referenceValue: '1.0–1.28', normalMin: 1.0, normalMax: 1.28, displayOrder: 3, aliases: ['nCALCIUM', 'NCALCIUM', 'N CALCIUM'] },
  { parameterName: 'PHOSPHORUS', unit: 'mg/dL', referenceValue: '2.7–4.5', normalMin: 2.7, normalMax: 4.5, displayOrder: 4, aliases: ['PHOSPHORUS', 'Phosphate', 'Phosphorus'] },
  { parameterName: 'MAGNESIUM', unit: 'mg/dL', referenceValue: '1.7–2.2', normalMin: 1.7, normalMax: 2.2, displayOrder: 5, aliases: ['MAGNESIUM', 'MAGNISUM', 'Mg', 'MAGNESIUM (Mg)', 'Magnesium'] },
  { parameterName: 'CHLORIDE', unit: 'mmol/L', referenceValue: '96–106', normalMin: 96, normalMax: 106, displayOrder: 6, aliases: ['CHLORIDE', 'Cl-', 'Chloride (Cl−)', 'Chloride'] },
  { parameterName: 'POTASSIUM', unit: 'mmol/L', referenceValue: '3.5–5.5', normalMin: 3.5, normalMax: 5.5, displayOrder: 7, aliases: ['POTASSIUM', 'K+', 'Potassium (K+)', 'Potassium'] },
  { parameterName: 'SODIUM', unit: 'mmol/L', referenceValue: '135–145', normalMin: 135, normalMax: 145, displayOrder: 8, aliases: ['SODIUM', 'Na+', 'Sodium (Na+)', 'Sodium'] },
  { parameterName: 'pH', unit: '', referenceValue: '7.35–7.45', normalMin: 7.35, normalMax: 7.45, displayOrder: 9, aliases: ['pH', 'PH'] }
];

async function runElectrolyteMigration() {
  const uri = process.env.MONGODB_URI_FALLBACK?.trim() || process.env.MONGODB_URI?.trim();
  console.log('Connecting to database...');
  await mongoose.connect(uri, { dbName: 'ETU_Diagonstic_Labratory', serverSelectionTimeoutMS: 20000 });
  console.log('Database connected successfully.');

  console.log('\n--- 1. Migrating Electrolyte Categories in Database ---');
  await LabTestParameter.updateMany(
    { category: { $in: ['ELECTROLYTE', 'ELECTROLYTES', 'SERUM ELECTROLYTES'] } },
    { $set: { category: 'SERUM ELECTROLYTE' } }
  );

  console.log('\n--- 2. Updating Canonical Electrolyte Parameters ---');
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const item of TARGET_ELECTROLYTE_PARAMS) {
    const searchNames = [item.parameterName, ...item.aliases];
    const searchFilters = searchNames.map(n => ({
      parameterName: new RegExp(`^${escapeRegex(n)}$`, 'i')
    }));

    const matches = await LabTestParameter.find({
      category: 'SERUM ELECTROLYTE',
      $or: searchFilters
    }).sort({ createdAt: 1 });

    if (matches.length > 0) {
      const canonical = matches[0];
      console.log(`Updating existing parameter ID ${canonical._id} (${canonical.parameterName}) -> ${item.parameterName}`);
      canonical.parameterName = item.parameterName;
      canonical.category = 'SERUM ELECTROLYTE';
      canonical.unit = item.unit || canonical.unit || '';
      canonical.referenceValue = item.referenceValue || canonical.referenceValue || '';
      canonical.normalMin = item.normalMin ?? canonical.normalMin ?? null;
      canonical.normalMax = item.normalMax ?? canonical.normalMax ?? null;
      canonical.displayOrder = item.displayOrder;
      canonical.editable = true;
      canonical.status = 'Active';
      await canonical.save();

      // Delete duplicates if multiple matched
      if (matches.length > 1) {
        for (let i = 1; i < matches.length; i++) {
          console.log(`Removing duplicate parameter ID ${matches[i]._id} (${matches[i].parameterName})`);
          await LabTestParameter.findByIdAndDelete(matches[i]._id);
        }
      }
    } else {
      console.log(`Creating missing parameter: ${item.parameterName}`);
      await LabTestParameter.create({
        parameterName: item.parameterName,
        category: 'SERUM ELECTROLYTE',
        subcategory: '',
        unit: item.unit,
        referenceValue: item.referenceValue,
        normalMin: item.normalMin,
        normalMax: item.normalMax,
        displayOrder: item.displayOrder,
        editable: true,
        status: 'Active'
      });
    }
  }

  // Ensure only valid 9 target parameters remain under SERUM ELECTROLYTE
  const validNames = TARGET_ELECTROLYTE_PARAMS.map(p => p.parameterName);
  const deletedExtra = await LabTestParameter.deleteMany({
    category: 'SERUM ELECTROLYTE',
    parameterName: { $nin: validNames }
  });
  if (deletedExtra.deletedCount > 0) {
    console.log(`Cleaned up ${deletedExtra.deletedCount} non-standard Electrolyte parameter(s).`);
  }

  console.log('\n--- 3. Re-seeding Master Parameter Catalog ---');
  await seedParameterCatalog();

  console.log('\n--- 4. Verification Results ---');
  const params = await LabTestParameter.find({ category: 'SERUM ELECTROLYTE' }).sort({ displayOrder: 1 }).lean();
  console.log('ELECTROLYTE PARAMETER COUNT:', params.length);
  const breakdown = {};
  params.forEach(p => {
    breakdown[p.parameterName] = (breakdown[p.parameterName] || 0) + 1;
  });
  console.log('Parameter Duplicate Breakdown:', breakdown);

  console.log('\n--- Electrolyte Migration Completed Successfully! ---');
}

runElectrolyteMigration()
  .catch(err => {
    console.error('Electrolyte migration failed:', err.stack || err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
