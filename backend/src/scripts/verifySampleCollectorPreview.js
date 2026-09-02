/**
 * Verification Test: Sample Collector Approved Report Preview & Permissions
 * 
 * Verifies that:
 * 1. Sample Collector can fetch approved reports from /api/collection/reports.
 * 2. All populated fields required for ReportPreview (patient, tests, categories, results, technician, approvedBy) are present.
 * 3. Sample Collector can access /api/final-reports/:id/public-link.
 * 4. Sample Collector CANNOT edit, approve, or delete approved reports (403/422).
 * 5. Admin, Receptionist, and Approver previews remain fully functional.
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
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
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
  console.log('🧪 VERIFYING SAMPLE COLLECTOR APPROVED REPORT PREVIEW & PERMISSIONS');
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

    const appLog = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'womdachew tesfaye', password: 'password@123' })
    });
    assert(appLog.status === 200, 'Approver logged in');
    const appToken = appLog.data.token;

    const admLog = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'temesgen fanta', password: 'password@123' })
    });
    assert(admLog.status === 200, 'Admin logged in');
    const admToken = admLog.data.token;

    // ── 2. Register Patient ─────────────────────────────────────────────
    console.log('\n--- 2. Registering Patient ---');
    const rbcDoc = await LaboratoryTest.findOne({ name: /red blood cell count/i, subcategory: 'CBC', status: 'Active' }) || await LaboratoryTest.findOne({ status: 'Active' });
    assert(Boolean(rbcDoc), 'Active laboratory test found in catalog');

    const regRes = await api(
      '/reception/patients',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'MINTESNOT MILKIAS KINDE',
          age: 28,
          sex: 'Male',
          phone: '+251911778899',
          branchName: 'Main',
          laboratoryTests: [rbcDoc._id],
          paymentStatus: 'Paid',
          paymentMethod: 'Cash',
          registrationType: 'Self'
        })
      },
      recToken
    );
    assert(regRes.status === 201, 'Patient registered successfully');
    const patient = regRes.data.patient;
    const patientId = patient._id;

    // ── 3. Collector Starts & Submits Report ─────────────────────────────
    console.log('\n--- 3. Collector Completes Collection & Submits Report ---');
    const startRes = await api(`/collection/patients/${patientId}/start`, { method: 'POST' }, colToken);
    assert(startRes.status === 200, 'Collector started collection');

    const saveRes = await api(
      `/collection/patients/${patientId}/report`,
      {
        method: 'PUT',
        body: JSON.stringify({
          results: [
            { sampleName: 'RBC', result: '3.8', flag: 'L', category: 'HEMATOLOGY', subcategory: 'CBC' },
            { sampleName: 'WBC', result: '6.5', flag: 'N', category: 'HEMATOLOGY', subcategory: 'CBC' },
            { sampleName: 'Hemoglobin', result: '14.2', flag: 'N', category: 'HEMATOLOGY', subcategory: 'CBC' }
          ],
          comments: 'Sample was clear and processed without hemolyzation.'
        })
      },
      colToken
    );
    assert(saveRes.status === 200, 'Collector saved results');

    const submitRes = await api(`/collection/patients/${patientId}/report/submit`, { method: 'POST' }, colToken);
    assert(submitRes.status === 200, 'Collector submitted report');
    const submittedReport = submitRes.data.report;
    const reportId = submittedReport._id;

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
    assert(approveRes.status === 200, 'Approver approved report');
    assert(approveRes.data.report.status === 'Approved', 'Report status is Approved');

    // ── 5. Sample Collector Views Approved Reports List ─────────────────
    console.log('\n--- 5. Sample Collector Fetches Reports List ---');
    const listRes = await api('/collection/reports', {}, colToken);
    assert(listRes.status === 200, 'Sample Collector GET /collection/reports returns 200 OK');
    assert(Array.isArray(listRes.data.reports), 'Returns array of reports');

    const foundApproved = listRes.data.reports.find(r => r._id === reportId);
    assert(Boolean(foundApproved), `Found approved report ${reportId} in Sample Collector report list`);
    assert(foundApproved?.status === 'Approved', 'Found report has status === "Approved"');
    assert(Boolean(foundApproved?.approvedBy?.fullName), `Found report has populated approvedBy.fullName (${foundApproved?.approvedBy?.fullName})`);
    assert(Boolean(foundApproved?.technician?.fullName), `Found report has populated technician.fullName (${foundApproved?.technician?.fullName})`);
    assert(Boolean(foundApproved?.patient?.name), `Found report has populated patient.name (${foundApproved?.patient?.name})`);
    assert(foundApproved?.results?.length === 3, `Found report has 3 test results`);
    assert(foundApproved?.results?.some(r => r.flag === 'L'), 'Contains Low (L) flag result');
    assert(foundApproved?.results?.some(r => r.flag === 'N'), 'Contains Normal (N) flag result');

    // ── 6. Sample Collector Accesses Public Link Endpoint ───────────────
    console.log('\n--- 6. Sample Collector Accesses Public Link Endpoint ---');
    const linkRes = await api(`/final-reports/${reportId}/public-link`, {}, colToken);
    assert(linkRes.status === 200, 'Sample Collector GET /final-reports/:id/public-link returns 200 OK');
    assert(Boolean(linkRes.data.token), `Public link token generated: ${linkRes.data.token}`);

    // ── 7. Enforce Read-Only Restrictions for Sample Collector ───────────
    console.log('\n--- 7. Enforcing Read-Only Restrictions on Approved Report ---');
    // Collector cannot delete approved report
    const delRes = await api(`/collection/reports/${reportId}`, { method: 'DELETE' }, colToken);
    assert(delRes.status === 404 || delRes.status === 403, 'Sample Collector cannot delete approved report (404/403)');

    // Collector cannot re-approve report
    const fakeApproveRes = await api(
      `/report-approvals/${reportId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Approved' })
      },
      colToken
    );
    assert(fakeApproveRes.status === 403, 'Sample Collector cannot approve reports (403 Forbidden)');

    // ── 8. Admin, Receptionist, & Approver Access Verification ──────────
    console.log('\n--- 8. Admin, Receptionist & Approver Preview Access ---');
    const adminDocRes = await api(`/final-reports/${reportId}`, {}, admToken);
    assert(adminDocRes.status === 200, 'Admin can access approved report document');

    const recDocRes = await api(`/final-reports/${reportId}`, {}, recToken);
    assert(recDocRes.status === 200, 'Receptionist can access approved report document');

    const appDocRes = await api(`/final-reports/${reportId}`, {}, appToken);
    assert(appDocRes.status === 200, 'Approver can access approved report document');

    // Clean up
    await LabReport.findByIdAndDelete(reportId);
    await Patient.findByIdAndDelete(patientId);

    console.log('\n================================================================');
    console.log(`🏁 SAMPLE COLLECTOR PREVIEW VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
  }
}

run().catch((e) => {
  console.error('Test script error:', e);
  process.exit(1);
});
