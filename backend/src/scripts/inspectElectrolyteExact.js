import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LabTestParameter from '../models/LabTestParameter.js';

dotenv.config();

async function inspectExact() {
  const uri = process.env.MONGODB_URI_FALLBACK?.trim() || process.env.MONGODB_URI?.trim();
  await mongoose.connect(uri, { dbName: 'ETU_Diagonstic_Labratory' });

  console.log('=== CATEGORIES ===');
  const cats = await LaboratoryTestCategory.find({}).sort({ displayOrder: 1 }).lean();
  console.log(cats.map(c => ({ id: c._id, name: c.name, displayOrder: c.displayOrder })));

  console.log('\n=== TESTS UNDER ELECTROLYTE/SERUM ELECTROLYTE ===');
  const tests = await LaboratoryTest.find({
    $or: [{ name: /electrol|serum/i }, { category: { $in: cats.filter(c => /electrol|serum/i.test(c.name)).map(c => c._id) } }]
  }).populate('category', 'name').lean();
  console.log(tests.map(t => ({ id: t._id, name: t.name, category: t.category?.name, subcategory: t.subcategory })));

  console.log('\n=== PARAMETERS UNDER CATEGORY "SERUM ELECTROLYTE" or "ELECTROLYTE" ===');
  const params = await LabTestParameter.find({ category: /electrol|serum/i }).sort({ displayOrder: 1 }).lean();
  console.log(params);
}

inspectExact()
  .catch(err => console.error(err))
  .finally(() => mongoose.disconnect());
