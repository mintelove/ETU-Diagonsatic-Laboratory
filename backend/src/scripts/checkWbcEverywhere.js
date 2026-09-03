import { connectDatabase } from '../config/database.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LabTestParameter from '../models/LabTestParameter.js';

async function check() {
  await connectDatabase();
  console.log('--- Searching for White Blood or WBC in LaboratoryTest ---');
  const tests = await LaboratoryTest.find({
    name: { $regex: /white|wbc/i }
  }).populate('category', 'name');
  tests.forEach(t => {
    console.log(`- ID: ${t._id} | Name: "${t.name}" | Cat: "${t.category?.name || t.category}" | Subcat: "${t.subcategory}" | Price: ${t.price}`);
  });

  console.log('\n--- Searching for White Blood or WBC in LabTestParameter ---');
  const params = await LabTestParameter.find({
    parameterName: { $regex: /white|wbc/i }
  });
  params.forEach(p => {
    console.log(`- ID: ${p._id} | Name: "${p.parameterName}" | Cat: "${p.category}" | Subcat: "${p.subcategory}" | Unit: "${p.unit}" | RefValue: "${p.referenceValue}"`);
  });
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
