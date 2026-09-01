import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

import app from '../app.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LabTestParameter from '../models/LabTestParameter.js';
import LaboratorySettings from '../models/LaboratorySettings.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import LabReport from '../models/LabReport.js';
import { connectDatabase } from '../config/database.js';
import { seedLaboratoryTests } from '../controllers/laboratoryTestController.js';
import { seedParameterCatalog } from '../config/parameterCatalogSeeder.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 VERIFYING COMPLETE ETU PRICE LIST, CATEGORIES & PERMISSIONS');
  console.log('================================================================\n');

  await connectDatabase();
  await seedParameterCatalog(true);
  await seedLaboratoryTests(true);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  async function apiReq(endpoint, options = {}, token = null) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${endpoint}`, { ...options, headers });
    const data = res.status !== 204 ? await res.json().catch(() => ({})) : {};
    return { status: res.status, data };
  }

  try {
    // ── 1. Authenticate Users ──────────────────────────────────────────────
    console.log('--- 1. Authenticating Admin, Sub-Admin & Receptionist ---');
    const adminLogin = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'temesgen fanta', password: 'password@123' })
    });
    const adminToken = adminLogin.data?.token;
    assert(adminToken, 'Admin user logged in successfully');

    // Create/reset a Sub-Admin user for testing
    await User.deleteMany({ username: 'test_subadmin' });
    const subAdminDoc = new User({
      username: 'test_subadmin',
      fullName: 'Test Sub Admin',
      phone: '+251911223344',
      password: 'password@123',
      role: 'Sub Admin',
      roles: ['Sub Admin'],
      branchName: 'Main',
      status: 'Active'
    });
    await subAdminDoc.save();

    const subAdminLogin = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'test_subadmin', password: 'password@123' })
    });
    const subAdminToken = subAdminLogin.data?.token;
    assert(subAdminToken, `Sub-Admin user logged in successfully (status ${subAdminLogin.status})`);

    const recepLogin = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'tsega', password: 'password@123' })
    });
    const recepToken = recepLogin.data?.token;
    assert(recepToken, `Receptionist user logged in successfully (status ${recepLogin.status})`);

    // ── 2. Verify Official ETU Price List Tests & Categories ──────────────
    console.log('\n--- 2. Verifying Official ETU Price List Tests in MongoDB ---');
    
    const requiredPriceChecks = [
      // Hormone / Related Immunoassay Tests
      { query: /^fsh$/i, expectedPrice: 1500, label: 'FSH' },
      { query: /^tsh$/i, expectedPrice: 1500, label: 'TSH' },
      { query: /^t3$/i, expectedPrice: 1300, label: 'T3' },
      { query: /^t4$/i, expectedPrice: 1300, label: 'T4' },
      { query: /ft3/i, expectedPrice: 1300, label: 'FT3' },
      { query: /ft4/i, expectedPrice: 1300, label: 'FT4' },
      { query: /^troponin$/i, expectedPrice: 1300, label: 'Troponin' },
      { query: /^ck-mb$/i, expectedPrice: 1300, label: 'CK-MB' },
      { query: /^hba1c$/i, expectedPrice: 1300, label: 'HgbA1C' },
      { query: /^psa$/i, expectedPrice: 1300, label: 'PSA' },
      { query: /^cea$/i, expectedPrice: 1300, label: 'CEA' },
      { query: /^afp$/i, expectedPrice: 1500, label: 'AFP' },
      { query: /^crp, quant$/i, expectedPrice: 1300, label: 'CRP' },
      { query: /^β-hcg$/i, expectedPrice: 1500, label: 'β-HCG' },
      { query: /^vit-d$/i, expectedPrice: 1500, label: 'VIT-D' },
      { query: /^ana screen, ifa$|^ana screen$|^ana$/i, expectedPrice: 1400, label: 'ANA' },
      { query: /^direct coombs test$/i, expectedPrice: 1300, label: 'Direct Coombs' },
      { query: /^indirect coombs test$/i, expectedPrice: 1500, label: 'Indirect Coombs' },

      // Clinical Chemistry
      { query: /^triglycerides$/i, expectedPrice: 500, label: 'Triglyceride' },
      { query: /^total cholesterol$/i, expectedPrice: 500, label: 'Total Cholesterol' },
      { query: /^hdl cholesterol$/i, expectedPrice: 500, label: 'HDL' },
      { query: /^ldl cholesterol$/i, expectedPrice: 500, label: 'LDL' },
      { query: /lactate dehydrogenase \(ldh\)/i, expectedPrice: 700, label: 'LDH' },
      { query: /phosphate|phosphorus/i, categoryName: 'CLINICAL CHEMISTRY', expectedPrice: 700, label: 'Phosphorus / Phosphate' },
      { query: /^albumin$/i, expectedPrice: 400, label: 'Albumin' },
      { query: /^total protein$/i, expectedPrice: 400, label: 'Total Protein' },
      { query: /^uric acid$/i, expectedPrice: 400, label: 'Uric Acid' },
      { query: /^total bilirubin$/i, expectedPrice: 500, label: 'β-Total / Total Bilirubin' },
      { query: /^direct bilirubin$/i, expectedPrice: 500, label: 'β-Direct / Direct Bilirubin' },
      { query: /^creatinine, serum$/i, expectedPrice: 300, label: 'Creatinine' },
      { query: /^urea$/i, expectedPrice: 200, label: 'BUN / Urea' },
      { query: /^ast \(sgot\)$/i, expectedPrice: 350, label: 'SGOT' },
      { query: /^alt \(sgpt\)$/i, expectedPrice: 350, label: 'SGPT' },
      { query: /^alkaline phosphatase \(alp\)$/i, expectedPrice: 350, label: 'ALP' },

      // Hematology
      { query: /^red blood cell count \(rbc\)$/i, expectedPrice: 500, label: 'CBC' },

      // Coagulation
      { query: /^pt \/ ptt \/ inr$/i, expectedPrice: 1200, label: 'PT / PTT / INR' },

      // Serum Electrolyte
      { query: /^serum electrolyte \(k-lyte 8\)$/i, expectedPrice: 1000, label: 'Electrolyte' },

      // Urine / Body Fluid
      { query: /^24 hr protein$/i, expectedPrice: 1400, label: '24hr Urine Protein' },
      { query: /^urinalysis \(routine\)$/i, expectedPrice: 300, label: 'Urinalysis' },
      { query: /^body fluid analysis \(bf\)$/i, expectedPrice: 300, label: 'BF / Body Fluid' },

      // Bacteriology / Parasitology / Stool / Serology
      { query: /^h\. pylori ag \(stool\)$/i, expectedPrice: 300, label: 'H. pylori Ag stool' },
      { query: /^h\. pylori antibody$/i, expectedPrice: 300, label: 'H. pylori Ab, serum' },
      { query: /^widal test \(typhoid\)$/i, expectedPrice: 250, label: 'Widal / H/O' },
      { query: /^weil-felix test \(ox19\)$/i, expectedPrice: 250, label: 'Weil-Felix 0x19' },
      { query: /^aso titer \(tonsillitis\)$/i, expectedPrice: 300, label: 'ASO Test' },
      { query: /^hiv test$/i, expectedPrice: 300, label: 'HIV Test' },
      { query: /^rpr \/ vdrl \(syphilis\)$/i, expectedPrice: 300, label: 'RPR / VDRL' },
      { query: /^hbsag$/i, expectedPrice: 350, label: 'HBs' },
      { query: /^hcv$/i, expectedPrice: 350, label: 'HCV' },
      { query: /^rheumatoid factor \(rf\)$/i, expectedPrice: 300, label: 'RF' },

      // Blood Group Category
      { query: /^blood group & rh type$/i, expectedPrice: 200, label: 'Blood Group / B/GROUP' },

      // Pathology
      { query: /^biopsy$/i, categoryName: 'PATHOLOGY', expectedPrice: 2000, label: 'Biopsy (Pathology)' },
      { query: /^fnac$/i, categoryName: 'PATHOLOGY', expectedPrice: 1000, label: 'FNAC (Pathology)' },
      { query: /^peripheral morphology$/i, categoryName: 'PATHOLOGY', expectedPrice: 800, label: 'Peripheral Morphology (Pathology)' },

      // Radiology
      { query: /^ct scan$/i, categoryName: 'RADIOLOGY', expectedPrice: 800, label: 'CT Scan (Radiology)' },
      { query: /^x-ray$/i, categoryName: 'RADIOLOGY', expectedPrice: 250, label: 'X-Ray (Radiology)' },
      { query: /^ultrasound - abdominal$/i, categoryName: 'RADIOLOGY', expectedPrice: 800, label: 'Ultrasound - Abdominal (Radiology)' },
      { query: /^ultrasound - mss$/i, categoryName: 'RADIOLOGY', expectedPrice: 800, label: 'Ultrasound - MSS (Radiology)' },
      { query: /^ultrasound - doppler$/i, categoryName: 'RADIOLOGY', expectedPrice: 800, label: 'Ultrasound - Doppler (Radiology)' },
      { query: /^ultrasound - echo$/i, categoryName: 'RADIOLOGY', expectedPrice: 800, label: 'Ultrasound - Echo (Radiology)' },
      { query: /^ultrasound - other$/i, categoryName: 'RADIOLOGY', expectedPrice: 800, label: 'Ultrasound - Other (Radiology)' },

      // Internal Medicine
      { query: /internal medicine speciality examination form/i, expectedPrice: 1500, label: 'Internal Medicine Form' }
    ];

    for (const check of requiredPriceChecks) {
      let searchFilter = { name: check.query };
      if (check.categoryName) {
        const cat = await LaboratoryTestCategory.findOne({ name: new RegExp(check.categoryName, 'i') });
        if (cat) searchFilter.category = cat._id;
      }
      const doc = await LaboratoryTest.findOne(searchFilter);
      assert(doc !== null, `${check.label} exists in LaboratoryTest catalog`);
      if (doc) {
        assert(doc.price === check.expectedPrice, `${check.label} price is ${doc.price} ETB (expected ${check.expectedPrice} ETB)`);
        assert(doc.status === 'Active', `${check.label} is Active`);
      }
    }

    // ── 3. Check BLOOD GROUP Category ──────────────────────────────────────
    console.log('\n--- 3. Verifying BLOOD GROUP Category ---');
    const bloodGroupCat = await LaboratoryTestCategory.findOne({ name: /^BLOOD GROUP$/i });
    assert(bloodGroupCat !== null, 'BLOOD GROUP category exists in database');
    assert(bloodGroupCat?.status === 'Active', 'BLOOD GROUP category is Active');

    const bloodGroupTests = await LaboratoryTest.find({ category: bloodGroupCat?._id });
    assert(bloodGroupTests.length >= 1, `BLOOD GROUP category contains ${bloodGroupTests.length} tests`);
    const bgTest = bloodGroupTests.find(t => /blood group/i.test(t.name));
    assert(bgTest && bgTest.price === 200, 'Blood Group test in BLOOD GROUP category has price 200 ETB');

    // ── 4. Verify CBC Group Price Setting ───────────────────────────────────
    console.log('\n--- 4. Verifying CBC Group Pricing Setting ---');
    const labSettings = await LaboratorySettings.findOne({ key: 'default' });
    assert(labSettings?.cbcGroupPrice === 500, `CBC Group Price is configured to ${labSettings?.cbcGroupPrice} ETB (expected 500 ETB)`);

    // ── 5. Receptionist Catalog API ─────────────────────────────────────────
    console.log('\n--- 5. Verifying Receptionist Catalog API ---');
    const catalogRes = await apiReq('/laboratory-tests/catalog', {}, recepToken);
    assert(catalogRes.status === 200, 'Receptionist can load test catalog');
    const catList = catalogRes.data?.categories || [];
    const catNames = catList.map(c => c.name);
    assert(catNames.includes('BLOOD GROUP'), 'Receptionist catalog includes BLOOD GROUP category');
    assert(catNames.includes('HORMONE'), 'Receptionist catalog includes HORMONE category');
    assert(catNames.includes('CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS'), 'Receptionist catalog includes CLINICAL CHEMISTRY category');
    assert(catNames.includes('HEMATOLOGY'), 'Receptionist catalog includes HEMATOLOGY category');
    assert(catNames.includes('PATHOLOGY'), 'Receptionist catalog includes PATHOLOGY category');
    assert(catNames.includes('RADIOLOGY'), 'Receptionist catalog includes RADIOLOGY category');

    // ── 6. Admin vs Sub-Admin Permissions ───────────────────────────────────
    console.log('\n--- 6. Verifying Admin vs Sub-Admin Permissions ---');
    // Sub-Admin can view catalog
    const subAdminCatalog = await apiReq('/laboratory-tests/admin', {}, subAdminToken);
    assert(subAdminCatalog.status === 200, 'Sub-Admin can view Admin Laboratory Tests catalog');

    // Sub-Admin CANNOT create category
    const subAdminCatCreate = await apiReq('/laboratory-tests/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Illegal Sub-Admin Cat' })
    }, subAdminToken);
    assert(subAdminCatCreate.status === 403, 'Sub-Admin CANNOT create categories (HTTP 403)');

    // Sub-Admin CANNOT create test
    const subAdminTestCreate = await apiReq('/laboratory-tests/tests', {
      method: 'POST',
      body: JSON.stringify({ name: 'Illegal Sub-Admin Test', category: bloodGroupCat._id, price: 999 })
    }, subAdminToken);
    assert(subAdminTestCreate.status === 403, 'Sub-Admin CANNOT create tests (HTTP 403)');

    // Sub-Admin CANNOT update test price
    const sampleTest = await LaboratoryTest.findOne({ name: /^TSH$/i });
    const subAdminTestUpdate = await apiReq(`/laboratory-tests/tests/${sampleTest._id}`, {
      method: 'PUT',
      body: JSON.stringify({ price: 9999 })
    }, subAdminToken);
    assert(subAdminTestUpdate.status === 403, 'Sub-Admin CANNOT edit test price (HTTP 403)');

    // Sub-Admin CANNOT delete test
    const subAdminTestDelete = await apiReq(`/laboratory-tests/tests/${sampleTest._id}`, {
      method: 'DELETE'
    }, subAdminToken);
    assert(subAdminTestDelete.status === 403, 'Sub-Admin CANNOT delete tests (HTTP 403)');

    // Admin CAN update test price
    const adminTestUpdate = await apiReq(`/laboratory-tests/tests/${sampleTest._id}`, {
      method: 'PUT',
      body: JSON.stringify({ price: 1500 })
    }, adminToken);
    assert(adminTestUpdate.status === 200, 'Admin CAN update test price');

    // ── 7. Receptionist Patient Registration with New Prices ────────────────
    console.log('\n--- 7. Verifying Patient Registration with Updated Prices ---');
    const fshDoc = await LaboratoryTest.findOne({ name: /^fsh$/i });
    const bgDoc = await LaboratoryTest.findOne({ name: /blood group & rh type/i });
    const creatDoc = await LaboratoryTest.findOne({ name: /creatinine/i });
    const cbcDoc = await LaboratoryTest.findOne({ name: /red blood cell count/i, subcategory: 'CBC' });

    // FSH (1500) + Blood Group (200) + Creatinine (300) + CBC (500) = 2500 ETB
    const regPayload = {
      name: 'ETU Price Test Patient',
      age: 32,
      sex: 'Male',
      phone: '+251911888999',
      address: 'Addis Ababa',
      registrationType: 'Self',
      patientCategory: 'Regular Patient',
      paymentMethod: 'Cash',
      laboratoryTests: [fshDoc._id, bgDoc._id, creatDoc._id, cbcDoc._id]
    };

    const regRes = await apiReq('/reception/patients', {
      method: 'POST',
      body: JSON.stringify(regPayload)
    }, recepToken);

    assert(regRes.status === 201, 'Patient registered successfully');
    const registeredPatient = regRes.data?.patient;
    const expectedSubtotal = 1500 + 200 + 300 + 500; // 2500 ETB
    assert(registeredPatient?.subtotal === expectedSubtotal, `Patient subtotal is ${registeredPatient?.subtotal} ETB (expected ${expectedSubtotal} ETB)`);
    assert(registeredPatient?.grandTotal === expectedSubtotal, `Patient grandTotal is ${registeredPatient?.grandTotal} ETB (expected ${expectedSubtotal} ETB)`);
    assert(registeredPatient?.paymentStatus === 'Paid', 'Payment status is Paid');

    console.log('\n================================================================');
    console.log(`🏁 VERIFICATION SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

  } catch (err) {
    console.error('Fatal error during verification suite:', err);
    failed++;
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runVerification();
