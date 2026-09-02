import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

import app from '../app.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import LabReport from '../models/LabReport.js';
import { connectDatabase } from '../config/database.js';

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

async function runTest() {
  console.log('================================================================');
  console.log('🧪 VERIFYING APPROVED GENERAL LAB REPORT PUBLIC SHARE LINK');
  console.log('================================================================\n');

  await connectDatabase();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  async function apiReq(endpoint, options = {}, token = null) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${endpoint}`, { ...options, headers });
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, data, ok: res.ok };
  }

  try {
    // 1. Authenticate Roles
    console.log('--- 1. Authenticating Roles ---');
    const recRes = await apiReq('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'tsega', password: 'password@123' }) });
    assert(recRes.status === 200, 'Receptionist logged in');
    const recToken = recRes.data?.token;

    const colRes = await apiReq('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'bereket', password: 'password@123' }) });
    assert(colRes.status === 200, 'Sample Collector logged in');
    const colToken = colRes.data?.token;

    const appRes = await apiReq('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'womdachew tesfaye', password: 'password@123' }) });
    assert(appRes.status === 200, 'Approver logged in');
    const appToken = appRes.data?.token;

    // 2. Register General Lab Patient
    console.log('\n--- 2. Registering General Lab Patient ---');
    const rbcDoc = await LaboratoryTest.findOne({ name: /red blood cell count/i, subcategory: 'CBC' });
    const bgDoc = await LaboratoryTest.findOne({ name: /blood group & rh type/i });
    const testIds = [rbcDoc?._id, bgDoc?._id].filter(Boolean);

    const suffix = Date.now().toString().slice(-4);
    const patPayload = {
      name: `Public Link Patient ${suffix}`,
      age: 28,
      sex: 'Female',
      phone: `+251922${suffix}11`,
      registrationType: 'Self',
      laboratoryTests: testIds,
      paymentMethod: 'Cash',
      paidAmount: 700,
      branchName: 'Main'
    };

    const regRes = await apiReq('/reception/patients', { method: 'POST', body: JSON.stringify(patPayload) }, recToken);
    assert(regRes.status === 201, `Patient registered (${regRes.data.patient?.name})`);
    const patient = regRes.data.patient;
    const patientDbId = patient._id || patient.id;

    // 3. Collector Workflow
    console.log('\n--- 3. Collector Workflow ---');
    const startRes = await apiReq(`/collection/patients/${patientDbId}/start`, { method: 'POST' }, colToken);
    assert(startRes.status === 200, 'Collector started collection');

    const resultsPayload = {
      results: [
        { sampleName: 'RBC Count', result: '4.8', unit: '×10¹²/L', referenceValue: '4.0–5.2', flag: 'N', remarks: '', category: 'HEMATOLOGY', subcategory: 'CBC' },
        { sampleName: 'Blood Group & Rh Type', result: 'A Positive', unit: '', referenceValue: '', flag: 'N', remarks: '', category: 'CLINICAL CHEMISTRY', subcategory: '' }
      ],
      comments: 'Follow-up diagnostic checkup normal.'
    };

    const saveRes = await apiReq(`/collection/patients/${patientDbId}/report`, { method: 'PUT', body: JSON.stringify(resultsPayload) }, colToken);
    assert(saveRes.status === 200, 'Collector saved results');

    const submitRes = await apiReq(`/collection/patients/${patientDbId}/report/submit`, { method: 'POST', body: JSON.stringify(resultsPayload) }, colToken);
    assert(submitRes.status === 200, 'Collector submitted report for approval');
    const submittedReport = submitRes.data.report;

    // 4. Approver Workflow
    console.log('\n--- 4. Approver Workflow & Public Token Generation ---');
    const approveRes = await apiReq(`/report-approvals/${submittedReport._id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Approved', comments: 'Quality check passed' }) }, appToken);
    assert(approveRes.status === 200, 'Approver approved report');
    const approvedReport = approveRes.data.report;
    assert(approvedReport.status === 'Approved', 'Report status is Approved');

    // 5. Query Public Link API
    console.log('\n--- 5. Verifying Public Share Link Token ---');
    const linkRes = await apiReq(`/final-reports/${approvedReport._id}/public-link`, { method: 'GET' }, appToken);
    assert(linkRes.status === 200, 'Public link endpoint returns 200');
    assert(Boolean(linkRes.data.token), `Public token generated: ${linkRes.data.token}`);
    assert(linkRes.data.hasPublicLink === true, 'hasPublicLink is true');
    const publicToken = linkRes.data.token;

    // 6. Unauthenticated Public Report Viewing
    console.log('\n--- 6. Unauthenticated Public Report Viewing ---');
    const pubRes = await apiReq(`/reports/public/${publicToken}`, { method: 'GET' });
    assert(pubRes.status === 200, 'Public view endpoint accessible without authentication (200 OK)');
    const pubReport = pubRes.data.report;
    assert(pubReport.patientName === patPayload.name, 'Public report matches patient name');
    assert(pubReport.patientId === patient.patientId, 'Public report matches patient ID');
    assert(pubReport.age === 28, 'Public report matches age');
    assert(pubReport.sex === 'Female', 'Public report matches sex');
    assert(Array.isArray(pubReport.results) && pubReport.results.length === 2, 'Public report contains all test results');
    assert(pubReport.results[0].sampleName === 'RBC Count', 'Result 1 is RBC Count');
    assert(pubReport.results[0].result === '4.8', 'RBC result is 4.8');
    assert(pubReport.results[0].flag === 'N', 'RBC flag is N (Normal)');
    assert(pubReport.results[0].subcategory === 'CBC', 'RBC subcategory is CBC');
    assert(pubReport.results[1].sampleName === 'Blood Group & Rh Type', 'Result 2 is Blood Group & Rh Type');
    assert(pubReport.results[1].result === 'A Positive', 'Blood Group result is A Positive');
    assert(pubReport.comments === 'Follow-up diagnostic checkup normal.', 'General comments preserved');

    // 7. Privacy check
    assert(pubReport.password === undefined, 'No passwords exposed');
    assert(pubReport.hashedPassword === undefined, 'No hashed passwords exposed');
    console.log('  ✅ PASS: Privacy verified — No sensitive credentials leaked');

    // 8. Test unauthenticated PDF download
    console.log('\n--- 7. Unauthenticated Public PDF Download ---');
    const pdfRes = await fetch(`${baseUrl}/reports/public/${publicToken}/pdf`);
    assert(pdfRes.status === 200, 'Public PDF endpoint returns 200 OK');
    const pdfBuf = await pdfRes.arrayBuffer();
    assert(pdfBuf.byteLength > 500, `PDF generated successfully (${pdfBuf.byteLength} bytes)`);

    console.log(`\n================================================================`);
    console.log(`🏁 PUBLIC LINK VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
    console.log(`================================================================\n`);

  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTest().catch(err => {
  console.error('\n❌ TEST RUNNER ERROR:', err);
  process.exit(1);
});
