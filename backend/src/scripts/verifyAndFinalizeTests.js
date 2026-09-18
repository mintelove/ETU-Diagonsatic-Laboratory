import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LabTestParameter from '../models/LabTestParameter.js';
import SampleType from '../models/SampleType.js';

dotenv.config();

async function run() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    console.log('Database connected.');

    const elecCat = await LaboratoryTestCategory.findOne({ name: /^SERUM ELECTROLYTE/i });
    const chemCat = await LaboratoryTestCategory.findOne({ name: /^CLINICAL CHEMISTRY/i });
    const serumSample = await SampleType.findOne({ name: /^Serum/i });

    console.log(`Electrolyte category ID: ${elecCat._id}`);
    console.log(`Chemistry category ID: ${chemCat._id}`);

    // 1. SERUM ELECTROLYTE
    // Serum Electrolyte parent
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
        }
      },
      { upsert: true }
    );

    // Bundle child parameters (non-billable)
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

    // Magnesium independent
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

    // Phosphorus independent
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

    // 2. CLINICAL CHEMISTRY
    for (const pName of ['Magnesium', 'Phosphorus', 'Phosphate']) {
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

    // 3. LabTestParameter entries
    await LabTestParameter.updateMany(
      { category: 'SERUM ELECTROLYTE', parameterName: /^magnesium$/i },
      { $set: { defaultPrice: 1000, billableIndividually: true, includedInBundle: false, parentBundle: '', status: 'Active' } }
    );
    await LabTestParameter.updateMany(
      { category: 'SERUM ELECTROLYTE', parameterName: /^phosphorus$/i },
      { $set: { defaultPrice: 1000, billableIndividually: true, includedInBundle: false, parentBundle: '', status: 'Active' } }
    );
    await LabTestParameter.updateMany(
      { category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS', parameterName: /^(magnesium|phosphorus|phosphate)$/i },
      { $set: { defaultPrice: 1000, billableIndividually: true, includedInBundle: false, parentBundle: '', status: 'Active' } }
    );

    console.log('\n--- VERIFICATION REPORT ---');
    const elecTests = await LaboratoryTest.find({ category: elecCat._id }).sort({ name: 1 });
    console.log(`\nSERUM ELECTROLYTE Tests (${elecTests.length}):`);
    for (const t of elecTests) {
      console.log(`  - ${t.name.padEnd(30)} Price: ${String(t.price).padEnd(5)} Billable: ${String(t.billableIndividually).padEnd(5)} Bundle: ${String(t.isBundle).padEnd(5)} Parent: ${t.parentBundle || 'None'}`);
    }

    const chemTargetTests = await LaboratoryTest.find({
      category: chemCat._id,
      name: { $in: ['Magnesium', 'Phosphorus', 'Phosphate'] }
    }).sort({ name: 1 });
    console.log(`\nCLINICAL CHEMISTRY Target Tests (${chemTargetTests.length}):`);
    for (const t of chemTargetTests) {
      console.log(`  - ${t.name.padEnd(30)} Subcat: ${String(t.subcategory).padEnd(25)} Price: ${String(t.price).padEnd(5)} Billable: ${t.billableIndividually}`);
    }

    console.log('\nFinalization completed successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
