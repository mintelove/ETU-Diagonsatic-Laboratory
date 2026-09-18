import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LabTestParameter from '../models/LabTestParameter.js';
import SampleType from '../models/SampleType.js';
import { seedParameterCatalog } from '../config/parameterCatalogSeeder.js';

dotenv.config();

async function run() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    console.log('Database connected successfully.');

    console.log('\n--- 1. Reseeding Parameter Catalog ---');
    await seedParameterCatalog(true);

    console.log('\n--- 2. Finding Categories ---');
    const elecCat = await LaboratoryTestCategory.findOne({ name: /^SERUM ELECTROLYTE/i });
    const chemCat = await LaboratoryTestCategory.findOne({ name: /^CLINICAL CHEMISTRY/i });

    if (!elecCat) {
      throw new Error('SERUM ELECTROLYTE category not found');
    }
    if (!chemCat) {
      throw new Error('CLINICAL CHEMISTRY category not found');
    }

    console.log(`Found SERUM ELECTROLYTE category: ${elecCat._id}`);
    console.log(`Found CLINICAL CHEMISTRY category: ${chemCat._id}`);

    const serumSample = await SampleType.findOne({ name: /^Serum/i });

    console.log('\n--- 3. Configuring SERUM ELECTROLYTE Tests ---');
    // 3a. Serum Electrolyte complete bundle parent
    await LaboratoryTest.findOneAndUpdate(
      { category: elecCat._id, name: /Serum Electrolyte/i },
      {
        $set: {
          category: elecCat._id,
          price: 1000,
          isBundle: true,
          billableIndividually: true,
          includedInBundle: false,
          parentBundle: '',
          status: 'Active',
          description: 'Serum Electrolyte complete examination bundle (1,000 ETB fixed price)'
        },
        $setOnInsert: {
          requiredSampleTypes: serumSample ? [serumSample._id] : []
        }
      },
      { upsert: true }
    );

    // 3b. True electrolyte child parameters -> non-billable (price: 0, includedInBundle: true)
    await LaboratoryTest.updateMany(
      {
        category: elecCat._id,
        name: { $not: /Serum Electrolyte|Magnesium|Phosphorus|Phosphate|Mg/i }
      },
      {
        $set: {
          price: 0,
          isBundle: false,
          billableIndividually: false,
          includedInBundle: true,
          parentBundle: 'Serum Electrolyte'
        }
      }
    );

    // 3c. Magnesium in SERUM ELECTROLYTE -> independent (1,000 ETB)
    await LaboratoryTest.findOneAndUpdate(
      { category: elecCat._id, name: /^magnesium$/i },
      {
        $set: {
          name: 'Magnesium',
          category: elecCat._id,
          price: 1000,
          isBundle: false,
          billableIndividually: true,
          includedInBundle: false,
          parentBundle: '',
          status: 'Active',
          description: 'Magnesium independent laboratory test (1,000 ETB)'
        },
        $setOnInsert: {
          requiredSampleTypes: serumSample ? [serumSample._id] : []
        }
      },
      { upsert: true, new: true }
    );

    // 3d. Phosphorus in SERUM ELECTROLYTE -> independent (1,000 ETB)
    await LaboratoryTest.findOneAndUpdate(
      { category: elecCat._id, name: /^phosphorus$/i },
      {
        $set: {
          name: 'Phosphorus',
          category: elecCat._id,
          price: 1000,
          isBundle: false,
          billableIndividually: true,
          includedInBundle: false,
          parentBundle: '',
          status: 'Active',
          description: 'Phosphorus independent laboratory test (1,000 ETB)'
        },
        $setOnInsert: {
          requiredSampleTypes: serumSample ? [serumSample._id] : []
        }
      },
      { upsert: true, new: true }
    );

    console.log('\n--- 4. Configuring CLINICAL CHEMISTRY Tests ---');
    // 4a. Magnesium in CLINICAL CHEMISTRY -> independent (1,000 ETB)
    await LaboratoryTest.findOneAndUpdate(
      { category: chemCat._id, name: /^magnesium$/i },
      {
        $set: {
          name: 'Magnesium',
          category: chemCat._id,
          subcategory: 'OTHER CHEMISTRY TESTS',
          price: 1000,
          isBundle: false,
          billableIndividually: true,
          includedInBundle: false,
          parentBundle: '',
          status: 'Active',
          description: 'Magnesium independent laboratory test (1,000 ETB)'
        },
        $setOnInsert: {
          requiredSampleTypes: serumSample ? [serumSample._id] : []
        }
      },
      { upsert: true, new: true }
    );

    // 4b. Phosphorus & Phosphate in CLINICAL CHEMISTRY -> independent (1,000 ETB)
    for (const pName of ['Phosphorus', 'Phosphate']) {
      await LaboratoryTest.findOneAndUpdate(
        { category: chemCat._id, name: new RegExp(`^${pName}$`, 'i') },
        {
          $set: {
            name: pName,
            category: chemCat._id,
            subcategory: 'OTHER CHEMISTRY TESTS',
            price: 1000,
            isBundle: false,
            billableIndividually: true,
            includedInBundle: false,
            parentBundle: '',
            status: 'Active',
            description: `${pName} independent laboratory test (1,000 ETB)`
          },
          $setOnInsert: {
            requiredSampleTypes: serumSample ? [serumSample._id] : []
          }
        },
        { upsert: true, new: true }
      );
    }

    console.log('\n--- 5. Verification Check in Database ---');
    const elecTests = await LaboratoryTest.find({ category: elecCat._id });
    console.log(`\nSERUM ELECTROLYTE Tests (${elecTests.length}):`);
    for (const t of elecTests) {
      console.log(`- ${t.name.padEnd(30)} Price: ${String(t.price).padEnd(6)} Billable: ${String(t.billableIndividually).padEnd(6)} Bundle: ${String(t.isBundle).padEnd(6)} Parent: ${t.parentBundle || 'None'}`);
    }

    const chemTargetTests = await LaboratoryTest.find({
      category: chemCat._id,
      name: { $in: ['Magnesium', 'Phosphorus', 'Phosphate'] }
    });
    console.log(`\nCLINICAL CHEMISTRY Magnesium & Phosphorus Tests (${chemTargetTests.length}):`);
    for (const t of chemTargetTests) {
      console.log(`- ${t.name.padEnd(30)} Subcat: ${String(t.subcategory).padEnd(25)} Price: ${String(t.price).padEnd(6)} Billable: ${t.billableIndividually}`);
    }

    const elecParams = await LabTestParameter.find({
      category: 'SERUM ELECTROLYTE',
      parameterName: { $in: ['MAGNESIUM', 'Magnesium', 'PHOSPHORUS', 'Phosphorus'] }
    });
    console.log(`\nSERUM ELECTROLYTE Catalog Parameters (${elecParams.length}):`);
    for (const p of elecParams) {
      console.log(`- ${p.parameterName.padEnd(25)} Ref: ${p.referenceValue} Price: ${p.defaultPrice} Billable: ${p.billableIndividually}`);
    }

    const chemParams = await LabTestParameter.find({
      category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
      parameterName: { $in: ['Magnesium', 'MAGNESIUM', 'Phosphorus', 'PHOSPHORUS'] }
    });
    console.log(`\nCLINICAL CHEMISTRY Catalog Parameters (${chemParams.length}):`);
    for (const p of chemParams) {
      console.log(`- ${p.parameterName.padEnd(25)} Subcat: ${p.subcategory} Ref: ${p.referenceValue} Price: ${p.defaultPrice} Billable: ${p.billableIndividually}`);
    }

    console.log('\nMigration complete successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
