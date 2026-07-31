import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LabTestParameter from '../models/LabTestParameter.js';
import { seedParameterCatalog } from '../config/parameterCatalogSeeder.js';

dotenv.config();

const HORMONE_CRP_TARGETS = [
  { parameterName: 'CRP, QUANT', unit: 'mg/dL', referenceValue: '0.0–0.50', normalMin: 0.0, normalMax: 0.50, displayOrder: 6, aliases: ['CRP, QUANT', 'CRP', 'CRP QUANT', 'CRP (C-REACTIVE PROTEIN)'] },
  { parameterName: 'C-REACTIVE PROTEIN QUANTITATIVE', unit: 'mg/L', referenceValue: '0–10', normalMin: 0, normalMax: 10, displayOrder: 7, aliases: ['C-REACTIVE PROTEIN QUANTITATIVE', 'C-REACTIVE PROTEIN', 'C-Reactive Protein'] },
  { parameterName: 'Hs-CRP', unit: 'mg/L', referenceValue: '0–1', normalMin: 0, normalMax: 1, displayOrder: 8, aliases: ['Hs-CRP', 'HS-CRP', 'HIGH SENSITIVITY CRP', 'HIGH-SENSITIVITY CRP', 'High-Sensitivity CRP (hs-CRP)', 'hs-CRP'] }
];

async function runHormoneCRPMigration() {
  const uri = process.env.MONGODB_URI_FALLBACK?.trim() || process.env.MONGODB_URI?.trim();
  console.log('Connecting to database...');
  await mongoose.connect(uri, { dbName: 'ETU_Diagonstic_Labratory' });
  console.log('Database connected successfully.');

  console.log('\n--- 1. Updating/Inserting HORMONE CRP Parameters ---');
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const item of HORMONE_CRP_TARGETS) {
    const searchNames = [item.parameterName, ...item.aliases];
    const searchFilters = searchNames.map(n => ({
      parameterName: new RegExp(`^${escapeRegex(n)}$`, 'i')
    }));

    const matches = await LabTestParameter.find({
      category: 'HORMONE',
      $or: searchFilters
    }).sort({ createdAt: 1 });

    if (matches.length > 0) {
      const canonical = matches[0];
      console.log(`Updating existing parameter ID ${canonical._id} (${canonical.parameterName}) -> ${item.parameterName}`);
      canonical.parameterName = item.parameterName;
      canonical.category = 'HORMONE';
      canonical.unit = item.unit;
      canonical.referenceValue = item.referenceValue;
      canonical.normalMin = item.normalMin;
      canonical.normalMax = item.normalMax;
      canonical.displayOrder = item.displayOrder;
      canonical.editable = true;
      canonical.status = 'Active';
      await canonical.save();

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
        category: 'HORMONE',
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

  console.log('\n--- 2. Re-seeding Master Parameter Catalog ---');
  await seedParameterCatalog();

  console.log('\n--- 3. Verification Results ---');
  const crpParams = await LabTestParameter.find({
    category: 'HORMONE',
    parameterName: { $in: ['CRP, QUANT', 'C-REACTIVE PROTEIN QUANTITATIVE', 'Hs-CRP'] }
  }).lean();

  console.log('HORMONE CRP Parameters Count:', crpParams.length);
  const breakdown = {};
  crpParams.forEach(p => {
    breakdown[p.parameterName] = (breakdown[p.parameterName] || 0) + 1;
  });
  console.log('CRP Parameter Breakdown:', breakdown);

  const allHormoneParams = await LabTestParameter.find({ category: 'HORMONE' }).sort({ displayOrder: 1 }).lean();
  console.log('Total HORMONE Category Parameter Count:', allHormoneParams.length);

  console.log('\n--- Migration Completed Successfully! ---');
}

runHormoneCRPMigration()
  .catch(err => {
    console.error('Hormone CRP migration failed:', err.stack || err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
