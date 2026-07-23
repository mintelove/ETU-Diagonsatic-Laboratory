import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratoryTest from '../models/LaboratoryTest.js';

dotenv.config();

const referralTests = [
  ['CA-125', 2000.00],
  ['CA-19', 2000.00],
  ['ANTI MULLERIAN HORMONE', 4124.00],
  ['ANA Titer 1100', 2750.00],
  ['Anti dsDNA', 2755.00],
  ['ANTI CYCLIC CITRULLINATATED PEPTIDE 2000', 3100.00],
  ['CA 15-3', 2000.00],
  ['CD4', 4800.00],
  ['Cortisol Serum', 2200.00],
  ['Ferratin or Folate', 1680.00],
  ['HBV Viral Load', 4180.00],
  ['HCV Viral Load', 3880.00],
  ['HCV Genotype', 8100.00],
  ['Hepatitis C Screen', 1430.00],
  ['HIV Viral Load', 3360.00],
  ['HIV 1 RNA Quantitative', 3360.00],
  ['Lipase', 1700.00],
  ['PTH', 2000.00],
  ['Testosterone', 2000.00],
  ['Vitamin B12', 2000.00],
  ['Female Cancer Markers', 4400.00],
  ['Male Cancer Marker', 6000.00],
  ['Vit B12 & Folate', 2900.00],
  ['Hepatitis B Surface Quantitative (10 Days)', 5405.00]
];

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function populateReferralTests() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be configured.');

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'ETU_Diagonstic_Labratory',
    serverSelectionTimeoutMS: 20000
  });

  const category = await LaboratoryTestCategory.findOne({ name: /referral/i });
  if (!category) throw new Error('The existing Referral laboratory test category was not found.');

  const operations = referralTests.map(([name, price], displayOrder) => ({
    updateOne: {
      filter: { category: category._id, name: new RegExp(`^${escapeRegex(name)}$`, 'i') },
      update: {
        $set: { price },
        $setOnInsert: {
          name,
          category: category._id,
          displayOrder,
          status: 'Active',
          description: '',
          requiredSampleTypes: []
        }
      },
      upsert: true
    }
  }));

  const result = await LaboratoryTest.bulkWrite(operations, { ordered: true });
  console.log(`Referral tests populated: ${result.upsertedCount} added, ${result.modifiedCount} price(s) updated.`);
}

try {
  await populateReferralTests();
} finally {
  await mongoose.disconnect();
}
