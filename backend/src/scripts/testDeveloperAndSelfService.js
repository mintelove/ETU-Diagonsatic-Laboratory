import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { signToken } from '../utils/token.js';
import app from '../app.js';
import http from 'http';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING VERIFICATION SUITE FOR DEVELOPER & SELF-SERVICE AUTH');
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
  // 1. DEVELOPER ACCOUNT VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Testing Developer Account Login & Protection ---');

  // Verify Mintex account in database
  const devAccount = await User.findOne({ username: 'mintex' });
  assert(devAccount !== null, 'Mintex user account exists in database');
  assert(devAccount?.isDeveloperAccount === true, 'Mintex is marked with isDeveloperAccount: true');
  assert(devAccount?.role === 'Admin', 'Mintex role is Admin');
  assert(devAccount?.status === 'Active', 'Mintex status is Active');

  // Test Login with Mintex / Mintex@2016
  const devLoginRes = await apiReq('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'Mintex', password: 'Mintex@2016' })
  });
  assert(devLoginRes.status === 200, 'Mintex can authenticate with password Mintex@2016');
  assert(devLoginRes.data.user?.role === 'Admin', 'Mintex authenticated as Admin');
  const devToken = devLoginRes.data.token;

  // Test normal admin user (or create temporary admin for testing)
  let normalAdmin = await User.findOne({ username: 'test_admin_mgmt', isDeveloperAccount: false });
  if (!normalAdmin) {
    normalAdmin = await User.create({
      fullName: 'Normal Admin User',
      username: 'test_admin_mgmt',
      password: 'AdminPassword123',
      phone: '+251911111111',
      role: 'Admin',
      status: 'Active',
      isDeveloperAccount: false
    });
  }
  const adminLoginRes = await apiReq('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'test_admin_mgmt', password: 'AdminPassword123' })
  });
  assert(adminLoginRes.status === 200, 'Normal admin logged in');
  const adminToken = adminLoginRes.data.token;

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. BACKEND LEVEL USER-MANAGEMENT CONCEALMENT & PROTECTION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Backend User Management Exclusion & Protection ---');

  // GET /api/users
  const listUsersRes = await apiReq('/users', { token: adminToken });
  assert(listUsersRes.status === 200, 'GET /api/users succeeded');
  const foundDevInList = listUsersRes.data.users?.some(u => u.username === 'mintex' || u.isDeveloperAccount);
  assert(!foundDevInList, 'Protected developer account is NOT listed in GET /api/users');

  // GET /api/users/:devId
  const getDevRes = await apiReq(`/users/${devAccount._id}`, { token: adminToken });
  assert(getDevRes.status === 404, `GET /api/users/:devId is concealed with 404 (status=${getDevRes.status})`);

  // PATCH /api/users/:devId (Edit)
  const patchDevRes = await apiReq(`/users/${devAccount._id}`, {
    method: 'PATCH',
    token: adminToken,
    body: JSON.stringify({
      fullName: 'Tampered Name',
      username: 'mintex_tampered',
      phone: '+251911111111',
      role: 'Reception',
      branchName: 'Main'
    })
  });
  assert(patchDevRes.status === 403, `PATCH /api/users/:devId is blocked with 403 (status=${patchDevRes.status})`);

  // PATCH /api/users/:devId/status (Suspend)
  const suspendDevRes = await apiReq(`/users/${devAccount._id}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: JSON.stringify({ status: 'Inactive' })
  });
  assert(suspendDevRes.status === 403, `PATCH /api/users/:devId/status is blocked with 403 (status=${suspendDevRes.status})`);

  // PATCH /api/users/:devId/password (Reset password)
  const resetDevRes = await apiReq(`/users/${devAccount._id}/password`, {
    method: 'PATCH',
    token: adminToken,
    body: JSON.stringify({ password: 'NewHackedPassword123' })
  });
  assert(resetDevRes.status === 403, `PATCH /api/users/:devId/password is blocked with 403 (status=${resetDevRes.status})`);

  // DELETE /api/users/:devId (Delete)
  const deleteDevRes = await apiReq(`/users/${devAccount._id}`, {
    method: 'DELETE',
    token: adminToken
  });
  assert(deleteDevRes.status === 403, `DELETE /api/users/:devId is blocked with 403 (status=${deleteDevRes.status})`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SELF-SERVICE FOR ALL ROLES (Admin, Receptionist, Collector, Approver)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing Self-Service Username & Password for All Roles ---');

  const testRoles = [
    { role: 'Admin', prefix: 'self_admin', name: 'Test Self Admin' },
    { role: 'Reception', prefix: 'self_recept', name: 'Test Self Receptionist' },
    { role: 'Sample Collector', prefix: 'self_collector', name: 'Test Self Collector' },
    { role: 'Approver', prefix: 'self_approver', name: 'Test Self Approver' }
  ];

  for (const item of testRoles) {
    console.log(`\n  Testing Role: ${item.role}...`);
    const initialUsername = `${item.prefix}_init`;
    const initialPassword = 'InitialPass123';
    const newUsername = `${item.prefix}_updated`;
    const newPassword = 'NewSecretPass123';

    // Ensure clean state
    await User.deleteMany({ username: { $in: [initialUsername, newUsername] } });

    const createdUser = await User.create({
      fullName: item.name,
      username: initialUsername,
      password: initialPassword,
      phone: '+251911223344',
      role: item.role,
      status: 'Active',
      isDeveloperAccount: false
    });

    // 1. Login with initial credentials
    const loginRes = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: initialUsername, password: initialPassword })
    });
    assert(loginRes.status === 200, `${item.role} logged in with initial credentials`);
    let token = loginRes.data.token;

    // 2. Change username with wrong password -> rejected
    const badUserRes = await apiReq('/auth/change-username', {
      method: 'PUT',
      token,
      body: JSON.stringify({ newUsername, currentPassword: 'WrongPassword999' })
    });
    assert(badUserRes.status === 400, `${item.role} username change rejected on wrong password (status=${badUserRes.status})`);

    // 3. Change username with correct password -> success
    const goodUserRes = await apiReq('/auth/change-username', {
      method: 'PUT',
      token,
      body: JSON.stringify({ newUsername, currentPassword: initialPassword })
    });
    assert(goodUserRes.status === 200, `${item.role} username changed successfully to ${newUsername}`);
    assert(goodUserRes.data.user?.username === newUsername, `${item.role} returned safe object has updated username`);
    if (goodUserRes.data.token) token = goodUserRes.data.token;

    // 4. Duplicate username check (try changing to an existing user's username)
    const dupRes = await apiReq('/auth/change-username', {
      method: 'PUT',
      token,
      body: JSON.stringify({ newUsername: 'mintex', currentPassword: initialPassword })
    });
    assert(dupRes.status === 409, `${item.role} duplicate username 'mintex' rejected with 409`);

    // 5. Change password with wrong current password -> rejected
    const badPassRes = await apiReq('/auth/change-password', {
      method: 'PUT',
      token,
      body: JSON.stringify({ currentPassword: 'WrongPassword999', newPassword, confirmPassword: newPassword })
    });
    assert(badPassRes.status === 400 || badPassRes.status === 401, `${item.role} password change rejected on wrong current password`);

    // 6. Change password with mismatch confirm password -> rejected
    const mismatchPassRes = await apiReq('/auth/change-password', {
      method: 'PUT',
      token,
      body: JSON.stringify({ currentPassword: initialPassword, newPassword, confirmPassword: 'DifferentPassword123' })
    });
    assert(mismatchPassRes.status === 400 || mismatchPassRes.status === 422, `${item.role} password change rejected on confirmation mismatch (status=${mismatchPassRes.status})`);

    // 7. Change password with correct credentials -> success
    const goodPassRes = await apiReq('/auth/change-password', {
      method: 'PUT',
      token,
      body: JSON.stringify({ currentPassword: initialPassword, newPassword, confirmPassword: newPassword })
    });
    assert(goodPassRes.status === 200, `${item.role} password changed successfully`);

    // 8. Test logging in with newly updated credentials
    const newLoginRes = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: newUsername, password: newPassword })
    });
    assert(newLoginRes.status === 200, `${item.role} logged in successfully with NEW username & NEW password`);

    // Cleanup
    await User.deleteMany({ username: { $in: [initialUsername, newUsername] } });
  }

  // Cleanup normal admin test
  await User.deleteOne({ username: 'test_admin_mgmt' });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. PRINT PREVIEW SIGNATURE CHECK
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Checking Printing Preview Signature Area ---');
  const previewPath = path.resolve('../frontend/src/components/ReportPreview.jsx');
  const printPath = path.resolve('../frontend/src/utils/printLabReport.js');
  const previewJsx = fs.readFileSync(previewPath, 'utf-8');
  const printJs = fs.readFileSync(printPath, 'utf-8');

  assert(!previewJsx.includes('✍️ Verified Practitioner'), 'ReportPreview.jsx does NOT contain "✍️ Verified Practitioner"');
  assert(!printJs.includes('✍️ Verified Practitioner'), 'printLabReport.js does NOT contain "✍️ Verified Practitioner"');
  assert(previewJsx.includes('borderBottom'), 'ReportPreview.jsx contains blank manual signature line');
  assert(printJs.includes('border-bottom'), 'printLabReport.js contains blank manual signature line');

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  server.close();
  await disconnectDatabase();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
