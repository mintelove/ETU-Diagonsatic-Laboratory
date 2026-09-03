import { connectDatabase } from '../config/database.js';
import LabTestParameter from '../models/LabTestParameter.js';

async function check() {
  await connectDatabase();
  const params = await LabTestParameter.find({
    parameterName: { $regex: /^wbc|^rbc|white blood|red blood/i }
  });
  console.log('--- ALL LabTestParameter with WBC or RBC ---');
  params.forEach(p => {
    console.log(`- ID: ${p._id} | Name: "${p.parameterName}" | Cat: "${p.category}" | Subcat: "${p.subcategory}" | Unit: "${p.unit}" | RefValue: "${p.referenceValue}" | status: ${p.status}`);
  });
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
