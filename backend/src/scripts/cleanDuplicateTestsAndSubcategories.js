import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LabTestParameter from '../models/LabTestParameter.js';
import Patient from '../models/Patient.js';
import LabReport from '../models/LabReport.js';
import { MASTER_LAB_CATEGORIES, seedParameterCatalog } from '../config/parameterCatalogSeeder.js';

dotenv.config();

async function runCleanup() {
  const uri = process.env.MONGODB_URI_FALLBACK?.trim() || process.env.MONGODB_URI?.trim();
  console.log('Connecting to database...');
  await mongoose.connect(uri, {
    dbName: 'ETU_Diagonstic_Labratory',
    serverSelectionTimeoutMS: 20000
  });

  console.log('Database connected successfully.');

  // 1. Force update LabTestParameter subcategories based on MASTER_LAB_CATEGORIES
  console.log('\n--- 1. Updating LabTestParameter Subcategories ---');
  let updatedParamSubcatCount = 0;
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const catGroup of MASTER_LAB_CATEGORIES) {
    if (!catGroup.subcategory) continue;
    const names = catGroup.parameters.flatMap(p => [p.parameterName, ...(p.aliases || [])]);
    const nameRegexes = names.map(n => new RegExp(`^${escapeRegex(n)}$`, 'i'));

    const res = await LabTestParameter.updateMany(
      {
        category: catGroup.category,
        $or: nameRegexes.map(r => ({ parameterName: r }))
      },
      { $set: { subcategory: catGroup.subcategory } }
    );
    updatedParamSubcatCount += res.modifiedCount;
  }
  console.log(`Updated subcategories for ${updatedParamSubcatCount} LabTestParameter record(s).`);

  // 2. Re-run seedParameterCatalog to ensure standard catalog parameters & subcategories
  console.log('\n--- 2. Re-seeding Parameter Catalog ---');
  await seedParameterCatalog();

  // 3. Deduplicate LabTestParameter records by category + parameterName
  console.log('\n--- 3. Deduplicating LabTestParameter Collection ---');
  const allParams = await LabTestParameter.find({}).sort({ createdAt: 1 });
  const paramGroupMap = new Map();

  allParams.forEach(param => {
    const key = `${(param.category || '').toUpperCase().trim()}::${(param.parameterName || '').toLowerCase().trim()}`;
    if (!paramGroupMap.has(key)) paramGroupMap.set(key, []);
    paramGroupMap.get(key).push(param);
  });

  let deletedDuplicateParams = 0;
  for (const [key, group] of paramGroupMap.entries()) {
    if (group.length > 1) {
      const canonical = group[0];
      const duplicates = group.slice(1);
      console.log(`Found ${duplicates.length} duplicate(s) for parameter "${canonical.parameterName}" (${canonical.category})`);
      for (const dup of duplicates) {
        await LabTestParameter.findByIdAndDelete(dup._id);
        deletedDuplicateParams++;
      }
    }
  }
  console.log(`Deleted ${deletedDuplicateParams} duplicate LabTestParameter record(s).`);

  // 4. Deduplicate LaboratoryTest records by category + name
  console.log('\n--- 4. Deduplicating LaboratoryTest Collection ---');
  const allTests = await LaboratoryTest.find({}).sort({ createdAt: 1 });
  const testGroupMap = new Map();

  allTests.forEach(test => {
    const catId = String(test.category || '');
    const key = `${catId}::${(test.name || '').toLowerCase().trim()}`;
    if (!testGroupMap.has(key)) testGroupMap.set(key, []);
    testGroupMap.get(key).push(test);
  });

  let deletedDuplicateTests = 0;
  let remappedPatientRefs = 0;
  let remappedReportRefs = 0;

  for (const [key, group] of testGroupMap.entries()) {
    if (group.length > 1) {
      const canonical = group[0];
      const duplicates = group.slice(1);
      console.log(`Found ${duplicates.length} duplicate(s) for test "${canonical.name}"`);

      for (const dup of duplicates) {
        // Remap references in Patient documents
        const patientUpdate = await Patient.updateMany(
          { laboratoryTests: dup._id },
          { $set: { 'laboratoryTests.$': canonical._id } }
        );
        remappedPatientRefs += patientUpdate.modifiedCount;

        // Remap references in LabReport documents
        const reportUpdate = await LabReport.updateMany(
          { laboratoryTests: dup._id },
          { $set: { 'laboratoryTests.$': canonical._id } }
        );
        remappedReportRefs += reportUpdate.modifiedCount;

        // Delete duplicate LaboratoryTest document
        await LaboratoryTest.findByIdAndDelete(dup._id);
        deletedDuplicateTests++;
      }
    }
  }
  console.log(`Deleted ${deletedDuplicateTests} duplicate LaboratoryTest record(s).`);
  console.log(`Remapped ${remappedPatientRefs} patient test reference(s) and ${remappedReportRefs} report test reference(s).`);

  // 5. Verify final counts
  console.log('\n--- 5. Verification ---');
  const finalTestsCount = await LaboratoryTest.countDocuments();
  const finalParamsCount = await LabTestParameter.countDocuments();
  const chemParams = await LabTestParameter.find({ category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS' });
  const subcatCounts = {};
  chemParams.forEach(p => {
    const sc = p.subcategory || 'EMPTY';
    subcatCounts[sc] = (subcatCounts[sc] || 0) + 1;
  });

  console.log(`Total LaboratoryTest records: ${finalTestsCount}`);
  console.log(`Total LabTestParameter records: ${finalParamsCount}`);
  console.log('Clinical Chemistry Subcategory Breakdown:', subcatCounts);

  console.log('\n--- Cleanup and Migration Completed Successfully! ---');
}

runCleanup()
  .catch(err => {
    console.error('Migration failed:', err.stack || err.message);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
