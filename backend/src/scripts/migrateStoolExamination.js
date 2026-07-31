import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LabTestParameter from '../models/LabTestParameter.js';
import { seedParameterCatalog } from '../config/parameterCatalogSeeder.js';

dotenv.config();

async function runStoolMigration() {
  const uri = process.env.MONGODB_URI_FALLBACK?.trim() || process.env.MONGODB_URI?.trim();
  console.log('Connecting to database...');
  await mongoose.connect(uri, { dbName: 'ETU_Diagonstic_Labratory' });
  console.log('Database connected successfully.');

  console.log('\n--- 1. Ensuring Category "STOOL EXAMINATION" ---');
  let stoolCat = await LaboratoryTestCategory.findOne({ name: /^STOOL EXAMINATION$/i });
  if (!stoolCat) {
    stoolCat = await LaboratoryTestCategory.create({ name: 'STOOL EXAMINATION', displayOrder: 8 });
    console.log(`Created category "STOOL EXAMINATION" with ID ${stoolCat._id}`);
  } else {
    stoolCat.name = 'STOOL EXAMINATION';
    await stoolCat.save();
    console.log(`Found existing category "STOOL EXAMINATION" with ID ${stoolCat._id}`);
  }

  console.log('\n--- 2. Ensuring Test "OVA & PARASITE EXAM" ---');
  const testMatches = await LaboratoryTest.find({
    $or: [
      { name: /^OVA & PARASITE EXAM$/i },
      { name: /^OVA \$ PARASITE EXAM$/i },
      { name: /^OVA AND PARASITE EXAM$/i }
    ]
  });

  let primaryTest;
  if (testMatches.length > 0) {
    primaryTest = testMatches[0];
    primaryTest.name = 'OVA & PARASITE EXAM';
    primaryTest.category = stoolCat._id;
    await primaryTest.save();
    console.log(`Updated existing test ID ${primaryTest._id} -> "OVA & PARASITE EXAM" under category ${stoolCat._id}`);

    if (testMatches.length > 1) {
      for (let i = 1; i < testMatches.length; i++) {
        console.log(`Removing duplicate test ID ${testMatches[i]._id}`);
        await LaboratoryTest.findByIdAndDelete(testMatches[i]._id);
      }
    }
  } else {
    primaryTest = await LaboratoryTest.create({
      name: 'OVA & PARASITE EXAM',
      category: stoolCat._id,
      price: 600,
      status: 'Active',
      description: 'Stool examination for ova and parasites'
    });
    console.log(`Created test "OVA & PARASITE EXAM" with ID ${primaryTest._id}`);
  }

  console.log('\n--- 3. Seeding Master Parameters for STOOL EXAMINATION ---');
  await seedParameterCatalog();

  console.log('\n--- 4. Verification Results ---');
  const finalCat = await LaboratoryTestCategory.find({ name: /^STOOL EXAMINATION$/i }).lean();
  console.log('STOOL EXAMINATION Category Count:', finalCat.length);

  const finalTests = await LaboratoryTest.find({ category: stoolCat._id }).lean();
  console.log('OVA & PARASITE EXAM Test Count:', finalTests.length, finalTests.map(t => t.name));

  const finalParams = await LabTestParameter.find({ category: 'STOOL EXAMINATION' }).lean();
  console.log('STOOL EXAMINATION Parameter Count:', finalParams.length);
  const paramBreakdown = {};
  finalParams.forEach(p => {
    paramBreakdown[p.parameterName] = (paramBreakdown[p.parameterName] || 0) + 1;
  });
  console.log('Parameter Breakdown:', paramBreakdown);

  console.log('\n--- Migration Completed Successfully! ---');
}

runStoolMigration()
  .catch(err => {
    console.error('Stool migration failed:', err.stack || err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
