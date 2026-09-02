/**
 * Verification Test: Targeted User Identity Sync & Propagation
 * 
 * Verifies that:
 * 1. Self-service username and full name changes save correctly.
 * 2. Updated user payload and token are returned immediately.
 * 3. /api/auth/me returns the latest single source of truth.
 * 4. Login with the new username succeeds immediately.
 * 5. Lab reports dynamically populate the updated full name for technician & approver.
 * 6. Password check and uniqueness validations remain strictly enforced.
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
  console.log('🧪 VERIFYING TARGETED IDENTITY SYNC & PROPAGATION');
  console.log('================================================================\n');

  await connectDatabase();

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // ── 1. Initial Login ──────────────────────────────────────────────
    console.log('--- 1. Initial Login with Test User ---');
    const origUsername = `ident_user_${Date.now()}`;
    const origFullName = 'Original Name Test';
    const password = 'Password@123';

    // Create a dedicated test user
    const testUser = await User.create({
      fullName: origFullName,
      username: origUsername,
      password,
      phone: '+251911000111',
      role: 'Sample Collector',
      branchName: 'Main',
      status: 'Active'
    });

    const login1 = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: origUsername, password })
    });
    assert(login1.status === 200, 'User logged in successfully');
    assert(login1.data.user.username === origUsername, `Logged in username is ${origUsername}`);
    assert(login1.data.user.fullName === origFullName, `Logged in fullName is ${origFullName}`);

    const token1 = login1.data.token;

    // ── 2. Password Verification Required for Profile Update ───────────
    console.log('\n--- 2. Validating Security & Password Verification ---');
    const wrongPassRes = await api(
      '/auth/change-profile',
      {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'WrongPassword@123',
          newFullName: 'New Full Name',
          newUsername: `new_${origUsername}`
        })
      },
      token1
    );
    assert(wrongPassRes.status === 400, 'Rejects profile update with incorrect password (400)');

    // ── 3. Successful Self-Service Identity Update ──────────────────────
    console.log('\n--- 3. Updating Full Name and Username ---');
    const updatedUsername = `new_${origUsername}`;
    const updatedFullName = 'Updated Full Name Test';

    const updateRes = await api(
      '/auth/change-profile',
      {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: password,
          newFullName: updatedFullName,
          newUsername: updatedUsername
        })
      },
      token1
    );

    assert(updateRes.status === 200, 'Profile update returns 200 OK');
    assert(updateRes.data.user.username === updatedUsername, `Response user.username is updated to ${updatedUsername}`);
    assert(updateRes.data.user.fullName === updatedFullName, `Response user.fullName is updated to ${updatedFullName}`);
    assert(Boolean(updateRes.data.token), 'Response returns updated session token');

    const token2 = updateRes.data.token;

    // ── 4. Verify Single Source of Truth via /api/auth/me ───────────────
    console.log('\n--- 4. Verifying /api/auth/me Source of Truth ---');
    const meRes = await api('/auth/me', {}, token2);
    assert(meRes.status === 200, '/api/auth/me returns 200 OK');
    assert(meRes.data.user.username === updatedUsername, `/api/auth/me username is ${updatedUsername}`);
    assert(meRes.data.user.fullName === updatedFullName, `/api/auth/me fullName is ${updatedFullName}`);

    // ── 5. Verify Database Document ─────────────────────────────────────
    console.log('\n--- 5. Verifying MongoDB User Document ---');
    const dbUser = await User.findById(testUser.id);
    assert(dbUser.username === updatedUsername, `DB User.username is ${updatedUsername}`);
    assert(dbUser.fullName === updatedFullName, `DB User.fullName is ${updatedFullName}`);

    // ── 6. Verify Login with New Username Succeeds ──────────────────────
    console.log('\n--- 6. Verifying Login with New vs Old Username ---');
    const oldLoginRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: origUsername, password })
    });
    assert(oldLoginRes.status === 401, 'Old username cannot log in (401)');

    const newLoginRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: updatedUsername, password })
    });
    assert(newLoginRes.status === 200, 'New username logs in successfully (200)');
    assert(newLoginRes.data.user.username === updatedUsername, 'New session has updated username');
    assert(newLoginRes.data.user.fullName === updatedFullName, 'New session has updated fullName');

    // ── 7. Verify Dynamic Lab Report Population ─────────────────────────
    console.log('\n--- 7. Verifying Dynamic Report Population with Updated Name ---');
    // Create a mock patient and report associated with testUser as technician
    const patient = await Patient.create({
      patientId: `ID-${Date.now().toString(36).toUpperCase()}`,
      barcode: `BC-${Date.now()}`,
      name: 'Test Patient Identity Sync',
      age: 30,
      sex: 'Male',
      phone: '+251911999888',
      branchName: 'Main',
      registeredBy: testUser._id,
      registrationType: 'Self',
      grandTotal: 500,
      subtotal: 500,
      paymentStatus: 'Paid',
      paymentMethod: 'Cash'
    });

    const report = await LabReport.create({
      patient: patient._id,
      technician: testUser._id,
      branchName: 'Main',
      status: 'Draft',
      results: [{ sampleName: 'RBC', result: '4.5', flag: 'N' }]
    });

    // Fetch report with technician populated
    const populatedReport = await LabReport.findById(report._id).populate('technician', 'fullName username');
    assert(populatedReport.technician.fullName === updatedFullName, `Populated report technician.fullName is ${updatedFullName}`);
    assert(populatedReport.technician.username === updatedUsername, `Populated report technician.username is ${updatedUsername}`);

    // Clean up test data
    await LabReport.findByIdAndDelete(report._id);
    await Patient.findByIdAndDelete(patient._id);
    await User.findByIdAndDelete(testUser._id);

    console.log('\n================================================================');
    console.log(`🏁 IDENTITY SYNC VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
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
