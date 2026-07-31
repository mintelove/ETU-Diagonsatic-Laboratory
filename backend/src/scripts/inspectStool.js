import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LabTestParameter from '../models/LabTestParameter.js';

dotenv.config();

async function inspectStool() {
  const uri = process.env.MONGODB_URI_FALLBACK?.trim() || process.env.MONGODB_URI?.trim();
  console.log('Connecting to database...');
  await mongoose.connect(uri, { dbName: 'ETU_Diagonstic_Labratory' });

  console.log('=== CATEGORIES matching stool, parasite, ova ===');
  const cats = await LaboratoryTestCategory.find({ name: /stool|parasit|ova/i }).lean();
  console.log(cats);

  console.log('\n=== TESTS matching stool, parasite, ova ===');
  const tests = await LaboratoryTest.find({ name: /stool|parasit|ova/i }).populate('category', 'name').lean();
  console.log(tests);

  console.log('\n=== PARAMETERS matching stool, parasite, ova, consistency ===');
  const params = await LabTestParameter.find({
    $or: [
      { category: /stool|parasit|ova/i },
      { parameterName: /stool|parasit|ova|consistency/i }
    ]
  }).lean();
  console.log(params);
}

inspectStool()
  .catch(err => console.error(err))
  .finally(() => mongoose.disconnect());
