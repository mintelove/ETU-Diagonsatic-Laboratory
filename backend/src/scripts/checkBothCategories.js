import { connectDatabase } from '../config/database.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LabTestParameter from '../models/LabTestParameter.js';

async function check() {
  await connectDatabase();
  console.log('=== 1. LaboratoryTest Records for RBC & WBC ===');
  const allTests = await LaboratoryTest.find({
    $or: [
      { name: { $regex: /^rbc$|^wbc$|red blood|white blood/i } },
      { subcategory: /microscop|cbc/i }
    ]
  }).populate('category', 'name').sort({ category: 1, name: 1 });

  allTests.forEach(t => {
    console.log(`[LabTest] ID: ${t._id} | Name: "${t.name}" | Cat: "${t.category?.name || t.category}" | Subcat: "${t.subcategory}" | Price: ${t.price} ETB | isBundle: ${t.isBundle} | billable: ${t.billableIndividually} | incInBundle: ${t.includedInBundle} | parentBundle: "${t.parentBundle}" | status: ${t.status}`);
  });

  console.log('\n=== 2. LabTestParameter Records for RBC & WBC ===');
  const allParams = await LabTestParameter.find({
    parameterName: { $regex: /^rbc$|^wbc$|red blood|white blood/i }
  }).sort({ category: 1, parameterName: 1 });

  allParams.forEach(p => {
    console.log(`[LabParam] ID: ${p._id} | ParamName: "${p.parameterName}" | Cat: "${p.category}" | Subcat: "${p.subcategory}" | Unit: "${p.unit}" | RefValue: "${p.referenceValue}" | status: ${p.status}`);
  });

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
