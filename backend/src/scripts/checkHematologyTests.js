import { connectDatabase } from '../config/database.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';

async function check() {
  await connectDatabase();
  const hemCat = await LaboratoryTestCategory.findOne({ name: /^HEMATOLOGY/i });
  console.log('Hematology Category:', hemCat.name, hemCat._id);
  const tests = await LaboratoryTest.find({ category: hemCat._id }).sort({ displayOrder: 1, name: 1 });
  console.log('--- ALL TESTS UNDER HEMATOLOGY ---');
  tests.forEach(t => {
    console.log(`- ID: ${t._id} | Name: "${t.name}" | Subcat: "${t.subcategory}" | Price: ${t.price} | isBundle: ${t.isBundle} | billable: ${t.billableIndividually} | included: ${t.includedInBundle} | parent: "${t.parentBundle}"`);
  });
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
