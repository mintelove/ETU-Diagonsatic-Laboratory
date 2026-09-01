import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import app from '../app.js';
import http from 'http';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 VERIFYING OTONA + MAIN BRANCHES, USER ACCOUNTS & SECURITY');
  console.log('================================================================\n');

  await connectDatabase();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  async function apiReq(endpoint, options = {}) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
      },
      ...options
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

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. BRANCHES VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Testing Branches in Database ---');
  const mainBranch = await Branch.findOne({ $or: [{ name: 'Main Branch' }, { shortName: 'Main' }, { code: 'MAIN' }] });
  const otonaBranch = await Branch.findOne({ $or: [{ name: 'Otona Branch' }, { shortName: 'Otona' }, { code: 'OTONA' }] });

  assert(Boolean(mainBranch), 'Main Branch exists in database');
  assert(Boolean(otonaBranch), 'Otona Branch exists in database');
  assert(mainBranch?.code === 'MAIN', 'Main Branch has code MAIN');
  assert(otonaBranch?.code === 'OTONA', 'Otona Branch has code OTONA');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CEO ACCOUNT VERIFICATION (ONE CROSS-BRANCH ACCOUNT)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Single Cross-Branch CEO Account ---');
  const ceoAccounts = await User.find({
    $or: [
      { username: 'temesgen fanta' },
      { fullName: 'Dr Temesgen Fanta CEO' },
      { isCEO: true }
    ]
  });
  assert(ceoAccounts.length === 1, `Exactly ONE CEO account exists (count = ${ceoAccounts.length})`);
  const ceo = ceoAccounts[0];
  assert(ceo.username === 'temesgen fanta', 'CEO username is "temesgen fanta"');
  assert(ceo.fullName === 'Dr Temesgen Fanta CEO', 'CEO full name is "Dr Temesgen Fanta CEO"');
  assert(ceo.role === 'Admin', 'CEO role is Admin');
  assert(ceo.isCEO === true, 'CEO account is marked with isCEO: true');
  assert(ceo.allowedBranches?.includes('Main') && ceo.allowedBranches?.includes('Otona'), 'CEO has cross-branch access (Main + Otona)');

  // Test CEO Login with password@123
  const ceoLogin = await apiReq('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'Temesgen Fanta', password: 'password@123' })
  });
  assert(ceoLogin.status === 200, 'CEO can authenticate with username "Temesgen Fanta" and "password@123"');
  assert(ceoLogin.data.user?.fullName === 'Dr Temesgen Fanta CEO', 'CEO login returns "Dr Temesgen Fanta CEO"');
  assert(ceoLogin.data.user?.role === 'Admin', 'CEO login returns role Admin');
  assert(ceoLogin.data.user?.allowedBranches?.includes('Main') && ceoLogin.data.user?.allowedBranches?.includes('Otona'), 'CEO login returns cross-branch access');
  const ceoToken = ceoLogin.data.token;

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. OTONA USERS VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing Otona Branch Users ---');
  const otonaUsersToTest = [
    { username: 'wondachew tesfaye', fullName: 'Wondachew Tesfaye', role: 'Admin' },
    { username: 'tensai ololo', fullName: 'Tensai ololo', role: 'Admin' },
    { username: 'kalkidan', fullName: 'Kalkidan', role: 'Reception' },
    { username: 'bereket', fullName: 'Bereket', role: 'Sample Collector' },
    { username: 'banchiayew', fullName: 'Banchiayew', role: 'Sample Collector' },
    { username: 'womdachew tesfaye', fullName: 'Womdachew Tesfaye', role: 'Approver' }
  ];

  for (const u of otonaUsersToTest) {
    const userDoc = await User.findOne({ username: u.username });
    assert(Boolean(userDoc), `Otona user @${u.username} exists in database`);
    assert(userDoc?.fullName === u.fullName, `Otona user @${u.username} full name is "${u.fullName}"`);
    assert(userDoc?.role === u.role, `Otona user @${u.username} role is "${u.role}"`);
    assert(userDoc?.branchName === 'Otona' || userDoc?.allowedBranches?.includes('Otona'), `Otona user @${u.username} is assigned to Otona branch`);

    // Test Login
    const loginRes = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: u.username, password: 'password@123' })
    });
    assert(loginRes.status === 200, `Otona user @${u.username} logged in with "password@123"`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. MAIN USERS VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing Main Branch Users ---');
  const mainUsersToTest = [
    { username: 'tsega', fullName: 'Tsega', role: 'Reception' },
    { username: 'receptions 2', fullName: 'Receptions 2', role: 'Reception' },
    { username: 'tarekegn tesfaye', fullName: 'Tarekegn Tesfaye', role: 'Sample Collector' },
    { username: 'tamrat desta', fullName: 'Tamrat Desta', role: 'Sample Collector' },
    { username: 'tensai', fullName: 'Tensai', role: 'Sample Collector' },
    { username: 'part time', fullName: 'part time', role: 'Sample Collector' },
    { username: 'tensai olol', fullName: 'Tensai olol', role: 'Approver' }
  ];

  for (const u of mainUsersToTest) {
    const userDoc = await User.findOne({ username: u.username });
    assert(Boolean(userDoc), `Main user @${u.username} exists in database`);
    assert(userDoc?.fullName === u.fullName, `Main user @${u.username} full name is "${u.fullName}"`);
    assert(userDoc?.role === u.role, `Main user @${u.username} role is "${u.role}"`);
    assert(userDoc?.branchName === 'Main' || userDoc?.allowedBranches?.includes('Main'), `Main user @${u.username} is assigned to Main branch`);

    // Test Login
    const loginRes = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: u.username, password: 'password@123' })
    });
    assert(loginRes.status === 200, `Main user @${u.username} logged in with "password@123"`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. BRANCH ISOLATION & CEO CROSS-BRANCH PERMISSIONS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing Branch Isolation & Cross-Branch Access ---');

  // CEO can query pending approvals across branches
  const ceoPending = await apiReq('/report-approvals/pending?branchName=All', { token: ceoToken });
  assert(ceoPending.status === 200, 'CEO can access report approvals across all branches');

  // Developer account protection check
  const devAccount = await User.findOne({ username: 'mintex' });
  assert(Boolean(devAccount), 'Mintex protected developer account exists');
  assert(devAccount?.isDeveloperAccount === true, 'Mintex account is marked isDeveloperAccount: true');

  // Dev login
  const devLogin = await apiReq('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'Mintex', password: 'Mintex@2016' })
  });
  assert(devLogin.status === 200, 'Mintex developer account can authenticate with Mintex@2016');

  // Dev account hidden in user list
  const listUsers = await apiReq('/users', { token: ceoToken });
  const hasDevInList = listUsers.data.users?.some(u => u.username === 'mintex' || u.isDeveloperAccount);
  assert(!hasDevInList, 'Protected developer account is not exposed in Admin user list');

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. DARK THEME CONTRAST & COMPONENT STYLING VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Checking AccountSettingsModal Component Styles ---');
  const modalPath = path.resolve('../frontend/src/components/AccountSettingsModal.jsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  assert(modalContent.includes('account-settings-modal-wrap'), 'Modal has dedicated root CSS class');
  assert(modalContent.includes('account-settings-input'), 'Modal has dedicated input styling class');
  assert(modalContent.includes('--input-bg'), 'Modal uses --input-bg design token');
  assert(modalContent.includes('--input-color'), 'Modal uses --input-color design token');
  assert(modalContent.includes('--input-border'), 'Modal uses --input-border design token');
  assert(modalContent.includes('--text-primary'), 'Modal uses --text-primary for high contrast');
  assert(modalContent.includes('--text-secondary'), 'Modal uses --text-secondary for label readability');

  console.log('\n================================================================');
  console.log(`🏁 VERIFICATION SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  server.close();
  await disconnectDatabase();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
