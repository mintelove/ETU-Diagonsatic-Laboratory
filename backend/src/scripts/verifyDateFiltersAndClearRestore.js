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
import PathologyCase from '../models/PathologyCase.js';
import RadiologyCase from '../models/RadiologyCase.js';
import { connectDatabase } from '../config/database.js';
import { getDateRange } from '../controllers/pathologyController.js';
import jwt from 'jsonwebtoken';

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

function makeToken(user) {
  return jwt.sign(
    { sub: user._id, role: user.role, username: user.username, branchName: user.branchName },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
}

async function run() {
  console.log('================================================================');
  console.log('🧪 VERIFY DATE FILTERS & CLEAR/RESTORE QUEUE SUITE');
  console.log('================================================================\n');

  await connectDatabase();

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
    // ── 1. TEST DATE RANGE FUNCTION ─────────────────────────────────────────
    console.log('\n--- 1. Testing getDateRange Helper ---');
    const now = new Date();

    const rangeAll = getDateRange('all');
    assert(rangeAll === null, 'getDateRange("all") returns null');

    const rangeToday = getDateRange('today');
    assert(rangeToday && rangeToday.$gte && rangeToday.$lte, 'getDateRange("today") returns $gte and $lte');
    assert(now >= rangeToday.$gte && now <= rangeToday.$lte, 'Current time falls inside today range');

    const rangeYesterday = getDateRange('yesterday');
    assert(rangeYesterday && rangeYesterday.$gte && rangeYesterday.$lte, 'getDateRange("yesterday") returns valid bounds');
    assert(rangeYesterday.$lte < rangeToday.$gte, 'Yesterday ends before today starts');

    const rangeThisWeek = getDateRange('this_week');
    assert(rangeThisWeek && rangeThisWeek.$gte && rangeThisWeek.$lte, 'getDateRange("this_week") returns valid bounds');
    assert(now >= rangeThisWeek.$gte, 'Current time is >= start of this week');

    const rangeLastWeek = getDateRange('last_week');
    assert(rangeLastWeek && rangeLastWeek.$gte && rangeLastWeek.$lte, 'getDateRange("last_week") returns valid bounds');
    assert(rangeLastWeek.$lte < rangeThisWeek.$gte, 'Last week ends before this week starts');

    // ── 2. PREPARE USERS & TOKENS ────────────────────────────────────────────
    console.log('\n--- 2. Setting Up Test Actors ---');
    let admin = await User.findOne({ role: 'Admin', status: 'Active' });
    if (!admin) {
      admin = await User.create({
        fullName: 'System Admin',
        username: 'test_admin_' + Date.now(),
        password: 'password123',
        role: 'Admin',
        status: 'Active'
      });
    }
    const adminToken = makeToken(admin);

    let pathologist = await User.findOne({ role: 'Pathologist', status: 'Active' });
    if (!pathologist) {
      pathologist = await User.create({
        fullName: 'Dr. Test Pathologist',
        username: 'test_path_' + Date.now(),
        password: 'password123',
        role: 'Pathologist',
        status: 'Active'
      });
    }
    const pathologistToken = makeToken(pathologist);

    let radiologist = await User.findOne({ role: 'Radiologist', status: 'Active' });
    if (!radiologist) {
      radiologist = await User.create({
        fullName: 'Dr. Test Radiologist',
        username: 'test_rad_' + Date.now(),
        password: 'password123',
        role: 'Radiologist',
        status: 'Active'
      });
    }
    const radiologistToken = makeToken(radiologist);

    // ── 3. TEST PATHOLOGY CLEAR & RESTORE LIFECYCLE ─────────────────────────
    console.log('\n--- 3. Testing Pathology Case Clear & Restore Lifecycle ---');

    const testPatient = await Patient.create({
      patientId: 'PT-TEST-' + Date.now().toString().slice(-4),
      barcode: 'BC-' + Date.now(),
      registrationType: 'Self',
      name: 'Test Queue Patient',
      age: 38,
      sex: 'Male',
      phone: '+251911999888',
      branchName: 'Main',
      registeredBy: admin._id,
      registrationDate: new Date(),
      paymentStatus: 'Paid',
      grandTotal: 1500
    });

    const pathCase = await PathologyCase.create({
      caseNumber: 'PATH-TEST-' + Date.now(),
      patient: testPatient._id,
      testType: 'Biopsy',
      price: 1500,
      branchName: 'Main',
      status: 'Queued',
      registeredBy: admin._id,
      reportingDeadline: new Date(Date.now() + 20 * 24 * 3600 * 1000),
      deadlineDays: 20,
      createdDate: new Date(),
      isCleared: false
    });

    // Step 3a: Verify active queue contains it, cleared queue does not
    let activeRes = await apiReq('/pathology/queue', { method: 'GET' }, pathologistToken);
    assert(activeRes.status === 200, 'GET /api/pathology/queue returns 200');
    let foundInActive = activeRes.data.cases.some(c => c._id === String(pathCase._id));
    assert(foundInActive, 'New pathology case appears in Active Queue');
    assert(typeof activeRes.data.activeCount === 'number', 'Response contains activeCount badge number');

    let clearedRes = await apiReq('/pathology/queue?cleared=true', { method: 'GET' }, pathologistToken);
    assert(clearedRes.status === 200, 'GET /api/pathology/queue?cleared=true returns 200');
    let foundInCleared = clearedRes.data.cases.some(c => c._id === String(pathCase._id));
    assert(!foundInCleared, 'New pathology case does NOT appear in Cleared Queue');

    // Step 3b: Clear the case
    const clearRes = await apiReq(`/pathology/cases/${pathCase._id}/clear`, { method: 'POST' }, pathologistToken);
    assert(clearRes.status === 200, 'POST /api/pathology/cases/:id/clear returns 200');
    assert(clearRes.data.success === true, 'Clear response returns success: true');

    const updatedPathDoc = await PathologyCase.findById(pathCase._id);
    assert(updatedPathDoc.isCleared === true, 'PathologyCase document has isCleared === true in DB');
    assert(updatedPathDoc.clearedAt instanceof Date, 'PathologyCase document has clearedAt Date timestamp');
    assert(String(updatedPathDoc.clearedBy) === String(pathologist._id), 'PathologyCase has clearedBy matching requesting user');

    // Zero Data Loss check on patient
    const patientCheck = await Patient.findById(testPatient._id);
    assert(patientCheck && patientCheck.name === 'Test Queue Patient', 'Patient record remains 100% intact after clear (Zero Data Loss)');
    assert(patientCheck.paymentStatus === 'Paid' && patientCheck.grandTotal === 1500, 'Patient payment data untouched');

    // Step 3c: Verify moved from active to cleared queue
    activeRes = await apiReq('/pathology/queue', { method: 'GET' }, pathologistToken);
    foundInActive = activeRes.data.cases.some(c => c._id === String(pathCase._id));
    assert(!foundInActive, 'Cleared case no longer appears in Active Queue');

    clearedRes = await apiReq('/pathology/queue?cleared=true', { method: 'GET' }, pathologistToken);
    foundInCleared = clearedRes.data.cases.some(c => c._id === String(pathCase._id));
    assert(foundInCleared, 'Cleared case now appears in Cleared Queue');

    // Step 3d: Test Date Filters on Cleared Queue
    const clearedTodayRes = await apiReq('/pathology/queue?cleared=true&dateFilter=today', { method: 'GET' }, pathologistToken);
    assert(clearedTodayRes.data.cases.some(c => c._id === String(pathCase._id)), 'Case appears in cleared queue with dateFilter=today');

    const clearedYesterdayRes = await apiReq('/pathology/queue?cleared=true&dateFilter=yesterday', { method: 'GET' }, pathologistToken);
    assert(!clearedYesterdayRes.data.cases.some(c => c._id === String(pathCase._id)), 'Case does NOT appear in cleared queue with dateFilter=yesterday');

    const clearedAllRes = await apiReq('/pathology/queue?cleared=true&dateFilter=all', { method: 'GET' }, pathologistToken);
    assert(clearedAllRes.data.cases.some(c => c._id === String(pathCase._id)), 'Case appears in cleared queue with dateFilter=all');

    // Step 3e: Restore the case
    const restoreRes = await apiReq(`/pathology/cases/${pathCase._id}/restore`, { method: 'POST' }, pathologistToken);
    assert(restoreRes.status === 200, 'POST /api/pathology/cases/:id/restore returns 200');
    assert(restoreRes.data.success === true, 'Restore response returns success: true');

    const restoredPathDoc = await PathologyCase.findById(pathCase._id);
    assert(restoredPathDoc.isCleared === false, 'Restored case has isCleared === false');
    assert(restoredPathDoc.clearedAt === null, 'Restored case has clearedAt reset to null');
    assert(restoredPathDoc.clearedBy === null, 'Restored case has clearedBy reset to null');

    activeRes = await apiReq('/pathology/queue', { method: 'GET' }, pathologistToken);
    foundInActive = activeRes.data.cases.some(c => c._id === String(pathCase._id));
    assert(foundInActive, 'Restored case returns immediately to Active Queue');

    clearedRes = await apiReq('/pathology/queue?cleared=true', { method: 'GET' }, pathologistToken);
    foundInCleared = clearedRes.data.cases.some(c => c._id === String(pathCase._id));
    assert(!foundInCleared, 'Restored case is removed from Cleared Queue');

    const pathCaseCount = await PathologyCase.countDocuments({ patient: testPatient._id });
    assert(pathCaseCount === 1, 'Exactly one case exists in DB (Zero duplicates created)');

    // ── 4. TEST RADIOLOGY CLEAR & RESTORE LIFECYCLE ─────────────────────────
    console.log('\n--- 4. Testing Radiology Case Clear & Restore Lifecycle ---');

    const radCase = await RadiologyCase.create({
      caseNumber: 'RAD-TEST-' + Date.now(),
      patient: testPatient._id,
      examinationType: 'Ultrasound',
      ultrasoundSubtype: 'Abdominal',
      price: 800,
      branchName: 'Otona',
      status: 'Queued',
      registeredBy: admin._id,
      createdDate: new Date(),
      isCleared: false
    });

    // Step 4a: Active vs Cleared initial state
    let radActiveRes = await apiReq('/radiology/queue', { method: 'GET' }, radiologistToken);
    assert(radActiveRes.status === 200, 'GET /api/radiology/queue returns 200');
    let foundRadActive = radActiveRes.data.cases.some(c => c._id === String(radCase._id));
    assert(foundRadActive, 'New radiology examination appears in Active Queue');
    assert(typeof radActiveRes.data.activeCount === 'number', 'Radiology queue returns activeCount badge number');

    let radClearedRes = await apiReq('/radiology/queue?cleared=true', { method: 'GET' }, radiologistToken);
    assert(radClearedRes.status === 200, 'GET /api/radiology/queue?cleared=true returns 200');
    let foundRadCleared = radClearedRes.data.cases.some(c => c._id === String(radCase._id));
    assert(!foundRadCleared, 'New radiology examination does NOT appear in Cleared Queue');

    // Step 4b: Clear radiology case
    const clearRadRes = await apiReq(`/radiology/cases/${radCase._id}/clear`, { method: 'POST' }, radiologistToken);
    assert(clearRadRes.status === 200, 'POST /api/radiology/cases/:id/clear returns 200');
    assert(clearRadRes.data.success === true, 'Radiology clear returns success: true');

    const updatedRadDoc = await RadiologyCase.findById(radCase._id);
    assert(updatedRadDoc.isCleared === true, 'RadiologyCase document has isCleared === true');
    assert(updatedRadDoc.clearedAt instanceof Date, 'RadiologyCase document has clearedAt Date timestamp');
    assert(String(updatedRadDoc.clearedBy) === String(radiologist._id), 'RadiologyCase document has clearedBy matching radiologist');

    // Step 4c: Verify moved to cleared queue
    radActiveRes = await apiReq('/radiology/queue', { method: 'GET' }, radiologistToken);
    foundRadActive = radActiveRes.data.cases.some(c => c._id === String(radCase._id));
    assert(!foundRadActive, 'Cleared examination no longer appears in Active Queue');

    radClearedRes = await apiReq('/radiology/queue?cleared=true', { method: 'GET' }, radiologistToken);
    foundRadCleared = radClearedRes.data.cases.some(c => c._id === String(radCase._id));
    assert(foundRadCleared, 'Cleared examination now appears in Cleared Queue');

    // Step 4d: Test Date Filters on Cleared Radiology Queue
    const radClearedTodayRes = await apiReq('/radiology/queue?cleared=true&dateFilter=today', { method: 'GET' }, radiologistToken);
    assert(radClearedTodayRes.data.cases.some(c => c._id === String(radCase._id)), 'Radiology case appears in cleared queue with dateFilter=today');

    const radClearedYesterdayRes = await apiReq('/radiology/queue?cleared=true&dateFilter=yesterday', { method: 'GET' }, radiologistToken);
    assert(!radClearedYesterdayRes.data.cases.some(c => c._id === String(radCase._id)), 'Radiology case does NOT appear with dateFilter=yesterday');

    // Step 4e: Restore radiology case
    const restoreRadRes = await apiReq(`/radiology/cases/${radCase._id}/restore`, { method: 'POST' }, radiologistToken);
    assert(restoreRadRes.status === 200, 'POST /api/radiology/cases/:id/restore returns 200');
    assert(restoreRadRes.data.success === true, 'Radiology restore returns success: true');

    const restoredRadDoc = await RadiologyCase.findById(radCase._id);
    assert(restoredRadDoc.isCleared === false, 'Restored radiology case has isCleared === false');
    assert(restoredRadDoc.clearedAt === null, 'Restored radiology case has clearedAt reset to null');
    assert(restoredRadDoc.clearedBy === null, 'Restored radiology case has clearedBy reset to null');

    radActiveRes = await apiReq('/radiology/queue', { method: 'GET' }, radiologistToken);
    foundRadActive = radActiveRes.data.cases.some(c => c._id === String(radCase._id));
    assert(foundRadActive, 'Restored examination returns immediately to Active Queue');

    radClearedRes = await apiReq('/radiology/queue?cleared=true', { method: 'GET' }, radiologistToken);
    foundRadCleared = radClearedRes.data.cases.some(c => c._id === String(radCase._id));
    assert(!foundRadCleared, 'Restored examination removed from Cleared Queue');

    const radCaseCount = await RadiologyCase.countDocuments({ patient: testPatient._id });
    assert(radCaseCount === 1, 'Exactly one radiology case in DB (Zero duplicates created)');

    // ── 5. CLEANUP ──────────────────────────────────────────────────────────
    console.log('\n--- 5. Cleanup Test Artifacts ---');
    await PathologyCase.deleteMany({ patient: testPatient._id });
    await RadiologyCase.deleteMany({ patient: testPatient._id });
    await Patient.deleteOne({ _id: testPatient._id });
    console.log('  🧹 Cleaned up test patient and cases');

  } finally {
    server.close();
  }

  // ── SUMMARY ─────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
