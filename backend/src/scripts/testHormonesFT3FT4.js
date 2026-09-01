import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import app from '../app.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LabTestParameter from '../models/LabTestParameter.js';
import Patient from '../models/Patient.js';
import SampleCollection from '../models/SampleCollection.js';
import LabReport from '../models/LabReport.js';
import User from '../models/User.js';

function calculateFlag(result, referenceValue, sex = '', criticalLow = null, criticalHigh = null) {
  const strVal = String(result ?? '').trim().toUpperCase();
  const strRef = String(referenceValue ?? '').trim().toUpperCase();
  if (!strVal) return '';

  const value = Number(String(result ?? '').replace(',', '.'));
  if (!Number.isFinite(value)) return '';

  let range = String(referenceValue ?? '').replace(/,/g, '.');
  const bounds = range.match(/(-?\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (bounds) {
    const low = Number(bounds[1]), high = Number(bounds[2]);
    return value < low ? 'L' : value > high ? 'H' : 'N';
  }
  return '';
}

import { signToken } from '../utils/token.js';

async function runTest() {
  console.log('================================================================');
  console.log('🧪 TESTING END-TO-END FLOW FOR fT3 & fT4 HORMONE TESTS');
  console.log('================================================================\n');

  await connectDatabase();
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  async function apiReq(endpoint, options = {}) {
    const { token, headers = {}, ...rest } = options;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    };
    const res = await fetch(`${baseUrl}${endpoint}`, {
      headers: reqHeaders,
      ...rest
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

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

  // 1. Authenticate Admin
  console.log('--- 1. Authenticating Admin User ---');
  let adminUser = await User.findOne({ isCEO: true }) || await User.findOne({ username: 'temesgen fanta' }) || await User.findOne({ role: 'Admin' });
  let token = signToken(adminUser._id);
  assert(Boolean(token), 'Admin authentication token generated');

  // 2. Verify HORMONE Category in Database
  console.log('\n--- 2. Checking HORMONE Category in Database ---');
  const hormoneCat = await LaboratoryTestCategory.findOne({ name: /^HORMONE/i });
  assert(Boolean(hormoneCat), 'HORMONE category exists in database');
  assert(hormoneCat?.status === 'Active', 'HORMONE category is Active');

  // 3. Verify fT3 and fT4 in LabTestParameter
  console.log('\n--- 3. Checking fT3 and fT4 in LabTestParameter ---');
  const ft3Param = await LabTestParameter.findOne({
    category: 'HORMONE',
    parameterName: /ft3/i
  });
  const ft4Param = await LabTestParameter.findOne({
    category: 'HORMONE',
    parameterName: /ft4/i
  });

  assert(Boolean(ft3Param), 'fT3 parameter exists under HORMONE category');
  assert(ft3Param?.unit === 'pmol/L', `fT3 unit is "${ft3Param?.unit}" (expected "pmol/L")`);
  assert(ft3Param?.normalMin === 3 && ft3Param?.normalMax === 7, `fT3 range is ${ft3Param?.normalMin}–${ft3Param?.normalMax} (expected 3–7)`);

  assert(Boolean(ft4Param), 'fT4 parameter exists under HORMONE category');
  assert(ft4Param?.unit === 'pmol/L', `fT4 unit is "${ft4Param?.unit}" (expected "pmol/L")`);
  assert(ft4Param?.normalMin === 12 && ft4Param?.normalMax === 22, `fT4 range is ${ft4Param?.normalMin}–${ft4Param?.normalMax} (expected 12–22)`);

  // 4. Verify fT3 and fT4 in LaboratoryTest (Test Types)
  console.log('\n--- 4. Checking fT3 and fT4 in LaboratoryTest (Test Catalog) ---');
  const ft3Test = await LaboratoryTest.findOne({
    category: hormoneCat._id,
    name: /ft3/i
  });
  const ft4Test = await LaboratoryTest.findOne({
    category: hormoneCat._id,
    name: /ft4/i
  });

  assert(Boolean(ft3Test), 'fT3 test type exists under HORMONE category');
  assert(Boolean(ft4Test), 'fT4 test type exists under HORMONE category');
  assert(ft3Test?.status === 'Active', 'fT3 test is Active');
  assert(ft4Test?.status === 'Active', 'fT4 test is Active');

  // 5. Test Receptionist Catalog Endpoint
  console.log('\n--- 5. Checking Receptionist Catalog API ---');
  const catalogRes = await apiReq('/laboratory-tests/catalog', { token });
  assert(catalogRes.status === 200, 'Receptionist catalog loaded');
  const catHormone = catalogRes.data.categories?.find(c => /^HORMONE/i.test(c.name));
  assert(Boolean(catHormone), 'HORMONE category returned in public catalog');
  const foundFt3 = catHormone?.tests?.some(t => /ft3/i.test(t.name));
  const foundFt4 = catHormone?.tests?.some(t => /ft4/i.test(t.name));
  assert(foundFt3, 'fT3 appears in receptionist selection catalog');
  assert(foundFt4, 'fT4 appears in receptionist selection catalog');

  // 6. Test Admin Range Editing Mechanism
  console.log('\n--- 6. Testing Admin Range Editing Mechanism ---');
  const editParamRes = await apiReq(`/report-entry/parameters/${ft3Param._id}`, {
    token,
    method: 'PUT',
    body: JSON.stringify({
      normalMin: 3.2,
      normalMax: 7.5,
      unit: 'pmol/L',
      referenceValue: '3.2–7.5'
    })
  });
  assert(editParamRes.status === 200, 'Admin can update fT3 reference range');
  const updatedParam = await LabTestParameter.findById(ft3Param._id);
  assert(updatedParam?.normalMin === 3.2 && updatedParam?.normalMax === 7.5, 'Updated fT3 range persisted in MongoDB');

  // Restore original verified range (3–7)
  await apiReq(`/report-entry/parameters/${ft3Param._id}`, {
    token,
    method: 'PUT',
    body: JSON.stringify({
      normalMin: 3.0,
      normalMax: 7.0,
      unit: 'pmol/L',
      referenceValue: '3–7'
    })
  });
  console.log('  ℹ️ Restored original fT3 reference range (3–7 pmol/L)');

  // 7. Test Flag Calculation Logic (Low, Normal, High)
  console.log('\n--- 7. Testing High/Low/Normal Classification Calculation ---');
  assert(calculateFlag('2.0', '3–7') === 'L', 'fT3 value 2.0 classified as Low (L)');
  assert(calculateFlag('5.0', '3–7') === 'N', 'fT3 value 5.0 classified as Normal (N)');
  assert(calculateFlag('8.5', '3–7') === 'H', 'fT3 value 8.5 classified as High (H)');

  assert(calculateFlag('9.0', '12–22') === 'L', 'fT4 value 9.0 classified as Low (L)');
  assert(calculateFlag('16.0', '12–22') === 'N', 'fT4 value 16.0 classified as Normal (N)');
  assert(calculateFlag('25.5', '12–22') === 'H', 'fT4 value 25.5 classified as High (H)');

  // 8. Test End-to-End Registration -> Collection -> Result Entry -> Approval Flow
  console.log('\n--- 8. Testing Complete End-to-End Patient Flow ---');
  const receptionUser = await User.findOne({ role: 'Reception' });
  const receptionToken = signToken(receptionUser._id);

  const collectorUser = await User.findOne({ role: 'Sample Collector' });
  const collectorToken = signToken(collectorUser._id);

  const approverUser = await User.findOne({ role: 'Approver' }) || adminUser;
  const approverToken = signToken(approverUser._id);

  // Register Patient with fT3 and fT4
  const regRes = await apiReq('/reception/patients', {
    token: receptionToken,
    method: 'POST',
    body: JSON.stringify({
      name: 'TEST THYROID PATIENT',
      age: 32,
      sex: 'Female',
      phone: '+251911999888',
      address: 'Addis Ababa',
      registrationType: 'Self',
      laboratoryTests: [String(ft3Test._id), String(ft4Test._id)],
      paymentMethod: 'Cash',
      serviceType: 'Laboratory Test'
    })
  });
  assert(regRes.status === 201, 'Patient registered with fT3 and fT4 tests');
  const patient = regRes.data.patient;

  // Begin Sample Collection
  const beginColRes = await apiReq(`/collection/patients/${patient._id}/start`, {
    token: collectorToken,
    method: 'POST',
    body: JSON.stringify({ sampleBarcode: `SMP-${Date.now()}` })
  });
  assert(beginColRes.status === 200, 'Sample collection started');

  // Save Results Draft (fT3 = 8.5 [High], fT4 = 16.0 [Normal])
  const saveDraftRes = await apiReq(`/collection/patients/${patient._id}/report`, {
    token: collectorToken,
    method: 'PUT',
    body: JSON.stringify({
      results: [
        {
          sampleName: ft3Param.parameterName,
          category: 'HORMONE',
          result: '8.5',
          unit: 'pmol/L',
          referenceValue: '3–7',
          flag: 'H'
        },
        {
          sampleName: ft4Param.parameterName,
          category: 'HORMONE',
          result: '16.0',
          unit: 'pmol/L',
          referenceValue: '12–22',
          flag: 'N'
        }
      ]
    })
  });
  assert(saveDraftRes.status === 200, 'Results draft saved successfully');

  // Submit Report
  const submitRes = await apiReq(`/collection/patients/${patient._id}/report/submit`, {
    token: collectorToken,
    method: 'POST',
    body: JSON.stringify({
      results: [
        {
          sampleName: ft3Param.parameterName,
          category: 'HORMONE',
          result: '8.5',
          unit: 'pmol/L',
          referenceValue: '3–7',
          flag: 'H'
        },
        {
          sampleName: ft4Param.parameterName,
          category: 'HORMONE',
          result: '16.0',
          unit: 'pmol/L',
          referenceValue: '12–22',
          flag: 'N'
        }
      ]
    })
  });
  assert(submitRes.status === 200, 'Report submitted for approval');
  const submittedReport = submitRes.data.report;

  // Decide / Approve Report
  const approveRes = await apiReq(`/report-approvals/${submittedReport._id}`, {
    token: approverToken,
    method: 'PATCH',
    body: JSON.stringify({
      status: 'Approved',
      comments: 'Hormone panel verified.'
    })
  });
  assert(approveRes.status === 200, 'Report approved by laboratory specialist');
  const approvedReport = approveRes.data.report;
  assert(approvedReport?.status === 'Approved', 'Report status is Approved');
  assert(approvedReport?.results?.some(r => /ft3/i.test(r.sampleName) && r.unit === 'pmol/L' && r.flag === 'H'), 'Approved report includes fT3 with unit pmol/L and flag H');
  assert(approvedReport?.results?.some(r => /ft4/i.test(r.sampleName) && r.unit === 'pmol/L' && r.flag === 'N'), 'Approved report includes fT4 with unit pmol/L and flag N');

  // Fetch public report view via /reports/public/:token
  const publicRepRes = await apiReq(`/reports/public/${approvedReport.publicReport.token}`);
  assert(publicRepRes.status === 200, 'Public report endpoint accessible');
  const pubReport = publicRepRes.data.report;
  const ft3Result = pubReport?.results?.find(r => /ft3/i.test(r.sampleName));
  const ft4Result = pubReport?.results?.find(r => /ft4/i.test(r.sampleName));
  assert(ft3Result?.result === '8.5' && ft3Result?.unit === 'pmol/L' && ft3Result?.flag === 'H', 'fT3 result verified in final report (8.5 pmol/L, High)');
  assert(ft4Result?.result === '16.0' && ft4Result?.unit === 'pmol/L' && ft4Result?.flag === 'N', 'fT4 result verified in final report (16.0 pmol/L, Normal)');

  // Cleanup test documents
  await LabReport.findByIdAndDelete(submittedReport._id);
  await SampleCollection.deleteMany({ patient: patient._id });
  await Patient.findByIdAndDelete(patient._id);

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  server.close();
  await disconnectDatabase();
  process.exit(failed > 0 ? 1 : 0);
}

runTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
