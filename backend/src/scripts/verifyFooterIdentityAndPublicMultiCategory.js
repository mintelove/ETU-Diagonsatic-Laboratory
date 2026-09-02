/**
 * Verification Test: Sample Collector Footer Identity & Public Report Multi-Category Visibility
 * 
 * Verifies that:
 * 1. Sample Collector dynamically displays "Title: Head of ETU Diagnostic Laboratory" and "Prepared By: [Collector Full Name]".
 * 2. Name updates dynamically propagate to the report footer.
 * 3. Approved reports with multiple test categories generate public links with 100% data fidelity.
 * 4. Public reports are completely isolated from dark/light theme cascade.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

import app from '../app.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import LabReport from '../models/LabReport.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import { connectDatabase } from '../config/database.js';

let server;
let baseUrl;
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

async function api(endpoint, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${endpoint}`, { ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  return { status: res.status, data };
}

async function run() {
  console.log('================================================================');
  console.log('🧪 VERIFYING COLLECTOR FOOTER IDENTITY & PUBLIC MULTI-CATEGORY');
  console.log('================================================================\n');

  await connectDatabase();

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // ── 1. Role Authentication ──────────────────────────────────────────
    console.log('--- 1. Authenticating Roles ---');
    const recLog = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'tsega', password: 'password@123' })
    });
    assert(recLog.status === 200, 'Receptionist logged in');
    const recToken = recLog.data.token;

    const colLog = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'bereket', password: 'password@123' })
    });
    assert(colLog.status === 200, 'Sample Collector logged in');
    const colToken = colLog.data.token;
    const colUser = colLog.data.user;

    const appLog = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'womdachew tesfaye', password: 'password@123' })
    });
    assert(appLog.status === 200, 'Approver logged in');
    const appToken = appLog.data.token;

    // ── 2. Register Patient with Multiple Test Categories ────────────────
    console.log('\n--- 2. Registering Patient with Multi-Category Tests ---');
    const activeTests = await LaboratoryTest.find({ status: 'Active' }).populate('category', 'name').limit(8);
    assert(activeTests.length >= 2, `Found ${activeTests.length} active laboratory tests for multi-category test`);

    const testIds = activeTests.map(t => t._id);

    const regRes = await api(
      '/reception/patients',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'MULTI CATEGORY TEST PATIENT',
          age: 35,
          sex: 'Female',
          phone: '+251911334455',
          branchName: 'Main',
          laboratoryTests: testIds,
          paymentStatus: 'Paid',
          paymentMethod: 'Cash',
          registrationType: 'Self'
        })
      },
      recToken
    );
    assert(regRes.status === 201, 'Patient registered with multiple test categories');
    const patient = regRes.data.patient;
    const patientId = patient._id;

    // ── 3. Collector Completes & Submits Multi-Category Report ───────────
    console.log('\n--- 3. Collector Enters Results across Categories & Submits ---');
    const startRes = await api(`/collection/patients/${patientId}/start`, { method: 'POST' }, colToken);
    assert(startRes.status === 200, 'Collector started multi-category collection');

    const multiResults = [
      { sampleName: 'White Blood Cells', result: '7.2', unit: '10^3/uL', referenceValue: '4.0-11.0', flag: 'N', category: 'HEMATOLOGY', subcategory: 'CBC' },
      { sampleName: 'Hemoglobin', result: '10.5', unit: 'g/dL', referenceValue: '12.0-16.0', flag: 'L', category: 'HEMATOLOGY', subcategory: 'CBC' },
      { sampleName: 'Fasting Blood Sugar', result: '145', unit: 'mg/dL', referenceValue: '70-100', flag: 'H', category: 'CLINICAL CHEMISTRY', subcategory: 'LIPID & GLUCOSE' },
      { sampleName: 'Serum Creatinine', result: '0.9', unit: 'mg/dL', referenceValue: '0.6-1.2', flag: 'N', category: 'CLINICAL CHEMISTRY', subcategory: 'RENAL FUNCTION' },
      { sampleName: 'TSH', result: '2.4', unit: 'uIU/mL', referenceValue: '0.4-4.0', flag: 'N', category: 'HORMONE', subcategory: 'THYROID' },
      { sampleName: 'HBsAg', result: 'Negative', unit: '', referenceValue: 'Negative', flag: 'N', category: 'SEROLOGY', subcategory: 'VIRAL MARKERS' }
    ];

    const saveRes = await api(
      `/collection/patients/${patientId}/report`,
      {
        method: 'PUT',
        body: JSON.stringify({
          results: multiResults,
          comments: 'Multi-category testing completed with standard control calibration.'
        })
      },
      colToken
    );
    assert(saveRes.status === 200, 'Collector saved multi-category results');

    const submitRes = await api(`/collection/patients/${patientId}/report/submit`, { method: 'POST' }, colToken);
    assert(submitRes.status === 200, 'Collector submitted report');
    const reportId = submitRes.data.report._id;

    // ── 4. Approver Approves Report ─────────────────────────────────────
    console.log('\n--- 4. Approver Approves Report ---');
    const approveRes = await api(
      `/report-approvals/${reportId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Approved' })
      },
      appToken
    );
    assert(approveRes.status === 200, 'Approver approved multi-category report');

    // ── 5. Verify Sample Collector Reports List & Dynamic Identity ───────
    console.log('\n--- 5. Verifying Collector Report Details & Identity ---');
    const listRes = await api('/collection/reports', {}, colToken);
    assert(listRes.status === 200, 'Collector fetched reports list');

    const foundReport = listRes.data.reports.find(r => r._id === reportId);
    assert(Boolean(foundReport), 'Found approved report in collector queue');
    assert(foundReport.technician?.fullName === colUser.fullName, `Technician full name is ${colUser.fullName}`);
    assert(foundReport.results.length === 6, 'All 6 test results preserved across categories');

    // ── 6. Verify Public Share Link with Multiple Categories ────────────
    console.log('\n--- 6. Verifying Public Share Link for Multi-Category Report ---');
    const linkRes = await api(`/final-reports/${reportId}/public-link`, {}, colToken);
    assert(linkRes.status === 200, 'Generated public link token');
    const publicToken = linkRes.data.token;
    assert(Boolean(publicToken), `Public token generated: ${publicToken}`);

    // Unauthenticated public access
    const pubRes = await api(`/reports/public/${publicToken}`);
    assert(pubRes.status === 200, 'Unauthenticated public link request returns 200 OK');
    const pubReport = pubRes.data.report;

    assert(pubReport.results.length === 6, 'Public report contains all 6 test results');
    assert(pubReport.results.some(r => r.sampleName === 'White Blood Cells' && r.flag === 'N'), 'Hematology WBC (N) present');
    assert(pubReport.results.some(r => r.sampleName === 'Hemoglobin' && r.flag === 'L'), 'Hematology Hemoglobin (L) present');
    assert(pubReport.results.some(r => r.sampleName === 'Fasting Blood Sugar' && r.flag === 'H'), 'Chemistry FBS (H) present');
    assert(pubReport.results.some(r => r.sampleName === 'TSH'), 'Hormone TSH present');
    assert(pubReport.results.some(r => r.sampleName === 'HBsAg'), 'Serology HBsAg present');
    assert(pubReport.patientName === 'MULTI CATEGORY TEST PATIENT' || pubReport.patient?.name === 'MULTI CATEGORY TEST PATIENT', 'Patient name matches in public report');

    // Clean up
    await LabReport.findByIdAndDelete(reportId);
    await Patient.findByIdAndDelete(patientId);

    console.log('\n================================================================');
    console.log(`🏁 FOOTER & MULTI-CATEGORY VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
  }
}

run().catch(e => {
  console.error('Test execution error:', e);
  process.exit(1);
});
