import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LabTestParameter from '../models/LabTestParameter.js';

dotenv.config();

async function inspect() {
  const uri = process.env.MONGODB_URI_FALLBACK?.trim() || process.env.MONGODB_URI?.trim();
  console.log('Connecting to database...');
  await mongoose.connect(uri, { dbName: 'ETU_Diagonstic_Labratory', serverSelectionTimeoutMS: 20000 });

  console.log('--- 1. LaboratoryTestCategory matching electrolyte ---');
  const categories = await LaboratoryTestCategory.find({ name: /electrol/i }).lean();
  console.log(JSON.stringify(categories, null, 2));

  console.log('\n--- 2. LaboratoryTest matching electrolyte ---');
  const tests = await LaboratoryTest.find({
    $or: [{ name: /electrol/i }, { category: { $in: categories.map(c => c._id) } }]
  }).populate('category', 'name').lean();
  console.log(JSON.stringify(tests, null, 2));

  console.log('\n--- 3. LabTestParameter matching electrolyte category or parameters ---');
  const params = await LabTestParameter.find({
    $or: [
      { category: /electrol/i },
      { parameterName: /sodium|potassium|chloride|calcium|magnesium|phosphorus|ph/i }
    ]
  }).lean();
  console.log(JSON.stringify(params, null, 2));
}

inspect()
  .catch(err => console.error(err))
  .finally(() => mongoose.disconnect());
