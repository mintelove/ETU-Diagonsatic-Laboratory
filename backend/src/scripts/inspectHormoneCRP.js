import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LabTestParameter from '../models/LabTestParameter.js';

dotenv.config();

async function inspectHormoneCRP() {
  const uri = process.env.MONGODB_URI_FALLBACK?.trim() || process.env.MONGODB_URI?.trim();
  console.log('Connecting to database...');
  await mongoose.connect(uri, { dbName: 'ETU_Diagonstic_Labratory' });

  console.log('=== CATEGORIES matching hormone, crp, immunoassay ===');
  const cats = await LaboratoryTestCategory.find({ name: /hormon|crp|assay|chem/i }).lean();
  console.log(cats);

  console.log('\n=== TESTS matching hormone, crp ===');
  const tests = await LaboratoryTest.find({ name: /hormon|crp|c-reactive/i }).populate('category', 'name').lean();
  console.log(tests);

  console.log('\n=== PARAMETERS matching hormone, crp, c-reactive ===');
  const params = await LabTestParameter.find({
    $or: [
      { category: /hormon|crp/i },
      { parameterName: /crp|c-reactive|protein/i }
    ]
  }).lean();
  console.log(params);
}

inspectHormoneCRP()
  .catch(err => console.error(err))
  .finally(() => mongoose.disconnect());
