import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

dotenv.config();

const { default: app } = await import('../app.js');
const { connectDatabase } = await import('../config/database.js');
const { default: User } = await import('../models/User.js');
const { ROLES } = await import('../constants/roles.js');

async function run() {
  console.log('🚀 Starting Verification of Pathology & Radiology Access, Reports & Transactions...');

  await connectDatabase();

  // Find or create test users for roles
  async function getOrCreateUser(role, email, fullName) {
    let user = await User.findOne({ role, status: 'Active' });
    if (!user) {
      user = await User.create({
        email,
        password: 'Password123!',
        fullName,
        role,
        status: 'Active',
        branchName: 'Main'
      });
    }
    return user;
  }

  const adminUser = await getOrCreateUser(ROLES.ADMIN, 'test_admin@etu.com', 'Test Admin');
  const pathUser = await getOrCreateUser(ROLES.PATHOLOGIST, 'test_path@etu.com', 'Test Pathologist');
  const radUser = await getOrCreateUser(ROLES.RADIOLOGIST, 'test_rad@etu.com', 'Test Radiologist');
  const scUser = await getOrCreateUser(ROLES.SAMPLE_COLLECTOR, 'test_sc@etu.com', 'Test Collector');
  const recUser = await getOrCreateUser(ROLES.RECEPTION, 'test_rec@etu.com', 'Test Reception');

  function makeToken(user) {
    return jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  }

  const adminToken = makeToken(adminUser);
  const pathToken = makeToken(pathUser);
  const radToken = makeToken(radUser);
  const scToken = makeToken(scUser);
  const recToken = makeToken(recUser);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const results = [];

  async function checkEndpoint(name, url, token, expectedStatus) {
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const passed = res.status === expectedStatus;
      let body = null;
      try { body = await res.json(); } catch (e) {}
      results.push({ name, status: res.status, expected: expectedStatus, passed, body });
      console.log(`${passed ? '✅' : '❌'} [${name}] HTTP ${res.status} (expected ${expectedStatus})`);
      return { passed, status: res.status, body };
    } catch (err) {
      console.error(`💥 Error testing ${name}:`, err);
      results.push({ name, status: 'ERROR', expected: expectedStatus, passed: false, error: err.message });
      return { passed: false };
    }
  }

  // 1. Queue Visibility Security Tests
  console.log('\n--- 1. Testing Queue Access Control ---');
  await checkEndpoint('Sample Collector -> Pathology Queue', `${baseUrl}/pathology/queue`, scToken, 403);
  await checkEndpoint('Receptionist -> Pathology Queue', `${baseUrl}/pathology/queue`, recToken, 403);
  await checkEndpoint('Pathologist -> Pathology Queue', `${baseUrl}/pathology/queue`, pathToken, 200);
  await checkEndpoint('Admin -> Pathology Queue', `${baseUrl}/pathology/queue`, adminToken, 200);

  await checkEndpoint('Sample Collector -> Radiology Queue', `${baseUrl}/radiology/queue`, scToken, 403);
  await checkEndpoint('Receptionist -> Radiology Queue', `${baseUrl}/radiology/queue`, recToken, 403);
  await checkEndpoint('Radiologist -> Radiology Queue', `${baseUrl}/radiology/queue`, radToken, 200);
  await checkEndpoint('Admin -> Radiology Queue', `${baseUrl}/radiology/queue`, adminToken, 200);

  // 2. Transaction Dashboard Access Control & Date Filter Tests
  console.log('\n--- 2. Testing Transaction Endpoints & Date Filters ---');
  await checkEndpoint('Sample Collector -> Pathology Transactions', `${baseUrl}/pathology/transactions`, scToken, 403);
  await checkEndpoint('Receptionist -> Pathology Transactions', `${baseUrl}/pathology/transactions`, recToken, 403);
  
  // Test all Pathology date filter modes
  const pAll = await checkEndpoint('Admin -> Pathology Tx (all)', `${baseUrl}/pathology/transactions?dateFilter=all`, adminToken, 200);
  const pToday = await checkEndpoint('Admin -> Pathology Tx (today)', `${baseUrl}/pathology/transactions?dateFilter=today`, adminToken, 200);
  const pYest = await checkEndpoint('Admin -> Pathology Tx (yesterday)', `${baseUrl}/pathology/transactions?dateFilter=yesterday`, adminToken, 200);
  const pWeek = await checkEndpoint('Admin -> Pathology Tx (this_week)', `${baseUrl}/pathology/transactions?dateFilter=this_week`, adminToken, 200);
  const pLastWeek = await checkEndpoint('Admin -> Pathology Tx (last_week)', `${baseUrl}/pathology/transactions?dateFilter=last_week`, adminToken, 200);
  const pSingle = await checkEndpoint('Admin -> Pathology Tx (single)', `${baseUrl}/pathology/transactions?dateFilter=single&singleDate=2026-09-18`, adminToken, 200);
  const pRange = await checkEndpoint('Admin -> Pathology Tx (range)', `${baseUrl}/pathology/transactions?dateFilter=range&startDate=2026-09-01&endDate=2026-09-18`, adminToken, 200);

  if (pAll.passed && pAll.body) {
    console.log('  Pathology Summary verified: Total Income =', pAll.body.summary?.totalIncome, 'ETB, Transactions =', pAll.body.summary?.transactionCount);
    if (pAll.body.summary?.breakdown) {
      console.log('  Pathology Breakdowns:', pAll.body.summary.breakdown);
    }
  }

  await checkEndpoint('Sample Collector -> Radiology Transactions', `${baseUrl}/radiology/transactions`, scToken, 403);
  await checkEndpoint('Receptionist -> Radiology Transactions', `${baseUrl}/radiology/transactions`, recToken, 403);

  // Test all Radiology date filter modes
  const rAll = await checkEndpoint('Admin -> Radiology Tx (all)', `${baseUrl}/radiology/transactions?dateFilter=all`, adminToken, 200);
  const rToday = await checkEndpoint('Admin -> Radiology Tx (today)', `${baseUrl}/radiology/transactions?dateFilter=today`, adminToken, 200);
  const rYest = await checkEndpoint('Admin -> Radiology Tx (yesterday)', `${baseUrl}/radiology/transactions?dateFilter=yesterday`, adminToken, 200);
  const rWeek = await checkEndpoint('Admin -> Radiology Tx (this_week)', `${baseUrl}/radiology/transactions?dateFilter=this_week`, adminToken, 200);
  const rLastWeek = await checkEndpoint('Admin -> Radiology Tx (last_week)', `${baseUrl}/radiology/transactions?dateFilter=last_week`, adminToken, 200);
  const rSingle = await checkEndpoint('Admin -> Radiology Tx (single)', `${baseUrl}/radiology/transactions?dateFilter=single&singleDate=2026-09-18`, adminToken, 200);
  const rRange = await checkEndpoint('Admin -> Radiology Tx (range)', `${baseUrl}/radiology/transactions?dateFilter=range&startDate=2026-09-01&endDate=2026-09-18`, adminToken, 200);

  if (rAll.passed && rAll.body) {
    console.log('  Radiology Summary verified: Total Income =', rAll.body.summary?.totalIncome, 'ETB, Transactions =', rAll.body.summary?.transactionCount);
    if (rAll.body.summary?.breakdown) {
      console.log('  Radiology Breakdowns:', rAll.body.summary.breakdown);
    }
  }

  // 3. Approved Reports Downstream Access Tests
  console.log('\n--- 3. Testing Approved Reports Downstream Access ---');
  await checkEndpoint('Sample Collector -> Reception Reports', `${baseUrl}/reception/reports?status=Approved`, scToken, 200);
  await checkEndpoint('Receptionist -> Reception Reports', `${baseUrl}/reception/reports?status=Approved`, recToken, 200);
  await checkEndpoint('Sample Collector -> Collection Reports', `${baseUrl}/collection/reports?status=Approved`, scToken, 200);

  // 4. Collection Queue Filter (Excludes Pure Pathology/Radiology Orders)
  console.log('\n--- 4. Testing Sample Collection Queue ---');
  await checkEndpoint('Sample Collector -> Collection Queue', `${baseUrl}/collection/queue`, scToken, 200);

  server.close();
  await mongoose.disconnect();

  const allPassed = results.every(r => r.passed);
  console.log(`\n========================================`);
  console.log(`Test Result: ${allPassed ? 'ALL TESTS PASSED ✨' : 'SOME TESTS FAILED ❌'}`);
  console.log(`Total: ${results.length} | Passed: ${results.filter(r => r.passed).length} | Failed: ${results.filter(r => !r.passed).length}`);
  console.log(`========================================\n`);

  process.exit(allPassed ? 0 : 1);
}

run().catch(err => {
  console.error('Fatal error in test script:', err);
  process.exit(1);
});
