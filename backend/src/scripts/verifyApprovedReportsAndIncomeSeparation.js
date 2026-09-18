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
import Payment from '../models/Payment.js';
import LabReport from '../models/LabReport.js';
import PathologyCase from '../models/PathologyCase.js';
import RadiologyCase from '../models/RadiologyCase.js';
import { connectDatabase } from '../config/database.js';
import { getDateRange } from '../utils/dateRange.js';
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
  console.log('🧪 VERIFY APPROVED REPORTS & INCOME SEPARATION TEST SUITE');
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
    // ── 1. TEST DATE RANGE UTILITY ──────────────────────────────────────────
    console.log('--- Test 1: Date Range Utility ---');
    const now = new Date();
    const todayRange = getDateRange('today');
    assert(todayRange && todayRange.$gte && todayRange.$lte, 'getDateRange("today") returns gte and lte bounds');
    assert(todayRange.$gte <= now && todayRange.$lte >= now, 'getDateRange("today") envelops current moment');

    const yesterdayRange = getDateRange('yesterday');
    assert(yesterdayRange && yesterdayRange.$gte < todayRange.$gte, 'yesterday is before today');

    const thisWeekRange = getDateRange('this_week');
    assert(thisWeekRange && thisWeekRange.$gte <= now && thisWeekRange.$lte >= now, 'this_week envelops current moment');

    const lastWeekRange = getDateRange('last_week');
    assert(lastWeekRange && lastWeekRange.$lte < thisWeekRange.$gte, 'last_week precedes this_week');

    const allRange = getDateRange('all');
    assert(allRange === null, 'all returns null range');

    // ── 2. SEED TEST USERS ──────────────────────────────────────────────────
    console.log('\n--- Test 2: User Accounts Setup ---');
    const timestamp = Date.now();

    const recA = await User.findOneAndUpdate(
      { username: `rec_a_${timestamp}` },
      {
        fullName: 'Receptionist A (Main)',
        role: 'Reception',
        branchName: 'Main',
        status: 'Active',
        passwordHash: 'dummy'
      },
      { upsert: true, new: true }
    );
    const tokenA = makeToken(recA);

    const recB = await User.findOneAndUpdate(
      { username: `rec_b_${timestamp}` },
      {
        fullName: 'Receptionist B (Main)',
        role: 'Reception',
        branchName: 'Main',
        status: 'Active',
        passwordHash: 'dummy'
      },
      { upsert: true, new: true }
    );
    const tokenB = makeToken(recB);

    const recC = await User.findOneAndUpdate(
      { username: `rec_c_${timestamp}` },
      {
        fullName: 'Receptionist C (Otona)',
        role: 'Reception',
        branchName: 'Otona',
        status: 'Active',
        passwordHash: 'dummy'
      },
      { upsert: true, new: true }
    );
    const tokenC = makeToken(recC);

    const admin = await User.findOneAndUpdate(
      { username: `admin_${timestamp}` },
      {
        fullName: 'Admin User',
        role: 'Admin',
        branchName: 'Main',
        status: 'Active',
        passwordHash: 'dummy'
      },
      { upsert: true, new: true }
    );
    const tokenAdmin = makeToken(admin);

    assert(recA && recB && recC && admin, 'Created Receptionist A (Main), B (Main), C (Otona) and Admin');

    // ── 3. SEED PATIENTS, PAYMENTS & APPROVED REPORTS ───────────────────────
    console.log('\n--- Test 3: Patients, Payments & Approved Reports Setup ---');

    // Patient 1: Main branch, Registered by Rec A, 5000 ETB, Approved TODAY
    const pat1 = await Patient.create({
      patientId: `TESTP1-${timestamp}`,
      barcode: `TESTP1-${timestamp}`,
      name: 'Patient One (Main - Today)',
      age: 28,
      sex: 'Male',
      phone: '0911111111',
      registrationType: 'Self',
      branchName: 'Main',
      registeredBy: recA._id,
      collectedBy: recA._id,
      paymentStatus: 'Paid',
      paymentMethod: 'Cash',
      grandTotal: 5000,
      registrationDate: new Date(),
      paymentDate: new Date()
    });
    await Payment.create({
      patient: pat1._id,
      receiptNumber: `RC-${pat1.patientId}`,
      amount: 5000,
      method: 'Cash',
      receivedBy: recA._id,
      branchName: 'Main',
      paidAt: new Date()
    });
    const rep1 = await LabReport.create({
      patient: pat1._id,
      reportNumber: `REP1-${timestamp}`,
      branchName: 'Main',
      status: 'Approved',
      approvedDate: new Date(),
      createdDate: new Date()
    });

    // Patient 2: Main branch, Registered by Rec A, 2000 ETB, Approved YESTERDAY
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    yesterdayDate.setHours(12, 0, 0, 0);

    const pat2 = await Patient.create({
      patientId: `TESTP2-${timestamp}`,
      barcode: `TESTP2-${timestamp}`,
      name: 'Patient Two (Main - Yesterday)',
      age: 35,
      sex: 'Female',
      phone: '0922222222',
      registrationType: 'Self',
      branchName: 'Main',
      registeredBy: recA._id,
      collectedBy: recA._id,
      paymentStatus: 'Paid',
      paymentMethod: 'Cash',
      grandTotal: 2000,
      registrationDate: yesterdayDate,
      paymentDate: yesterdayDate
    });
    await Payment.create({
      patient: pat2._id,
      receiptNumber: `RC-${pat2.patientId}`,
      amount: 2000,
      method: 'Cash',
      receivedBy: recA._id,
      branchName: 'Main',
      paidAt: yesterdayDate
    });
    const rep2 = await LabReport.create({
      patient: pat2._id,
      reportNumber: `REP2-${timestamp}`,
      branchName: 'Main',
      status: 'Approved',
      approvedDate: yesterdayDate,
      createdDate: yesterdayDate
    });

    // Patient 3: Otona branch, Registered by Rec C, 3500 ETB, Approved TODAY
    const pat3 = await Patient.create({
      patientId: `TESTP3-${timestamp}`,
      barcode: `TESTP3-${timestamp}`,
      name: 'Patient Three (Otona - Today)',
      age: 42,
      sex: 'Male',
      phone: '0933333333',
      registrationType: 'Self',
      branchName: 'Otona',
      registeredBy: recC._id,
      collectedBy: recC._id,
      paymentStatus: 'Paid',
      paymentMethod: 'Cash',
      grandTotal: 3500,
      registrationDate: new Date(),
      paymentDate: new Date()
    });
    await Payment.create({
      patient: pat3._id,
      receiptNumber: `RC-${pat3.patientId}`,
      amount: 3500,
      method: 'Cash',
      receivedBy: recC._id,
      branchName: 'Otona',
      paidAt: new Date()
    });
    const rep3 = await LabReport.create({
      patient: pat3._id,
      reportNumber: `REP3-${timestamp}`,
      branchName: 'Otona',
      status: 'Approved',
      approvedDate: new Date(),
      createdDate: new Date()
    });

    // Patient 4: Main branch, Historical (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const pat4 = await Patient.create({
      patientId: `TESTP4-${timestamp}`,
      barcode: `TESTP4-${timestamp}`,
      name: 'Historical Patient Four (Main - 30 days ago)',
      age: 50,
      sex: 'Male',
      phone: '0944444444',
      registrationType: 'Self',
      branchName: 'Main',
      registeredBy: recA._id,
      collectedBy: recA._id,
      paymentStatus: 'Paid',
      paymentMethod: 'Cash',
      grandTotal: 1200,
      registrationDate: thirtyDaysAgo,
      paymentDate: thirtyDaysAgo
    });
    await Payment.create({
      patient: pat4._id,
      receiptNumber: `RC-${pat4.patientId}`,
      amount: 1200,
      method: 'Cash',
      receivedBy: recA._id,
      branchName: 'Main',
      paidAt: thirtyDaysAgo
    });
    const rep4 = await LabReport.create({
      patient: pat4._id,
      reportNumber: `REP4-${timestamp}`,
      branchName: 'Main',
      status: 'Approved',
      approvedDate: thirtyDaysAgo,
      createdDate: thirtyDaysAgo
    });

    // Patient 5: Main branch, Historical (90 days ago)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const pat5 = await Patient.create({
      patientId: `TESTP5-${timestamp}`,
      barcode: `TESTP5-${timestamp}`,
      name: 'Historical Patient Five (Main - 90 days ago)',
      age: 60,
      sex: 'Female',
      phone: '0955555555',
      registrationType: 'Self',
      branchName: 'Main',
      registeredBy: recA._id,
      collectedBy: recA._id,
      paymentStatus: 'Paid',
      paymentMethod: 'Cash',
      grandTotal: 1800,
      registrationDate: ninetyDaysAgo,
      paymentDate: ninetyDaysAgo
    });
    await Payment.create({
      patient: pat5._id,
      receiptNumber: `RC-${pat5.patientId}`,
      amount: 1800,
      method: 'Cash',
      receivedBy: recA._id,
      branchName: 'Main',
      paidAt: ninetyDaysAgo
    });
    const rep5 = await LabReport.create({
      patient: pat5._id,
      reportNumber: `REP5-${timestamp}`,
      branchName: 'Main',
      status: 'Approved',
      approvedDate: ninetyDaysAgo,
      createdDate: ninetyDaysAgo
    });

    // Patient 6: Otona branch, Historical (60 days ago)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const pat6 = await Patient.create({
      patientId: `TESTP6-${timestamp}`,
      barcode: `TESTP6-${timestamp}`,
      name: 'Historical Patient Six (Otona - 60 days ago)',
      age: 28,
      sex: 'Female',
      phone: '0966666666',
      registrationType: 'Self',
      branchName: 'Otona',
      registeredBy: recC._id,
      collectedBy: recC._id,
      paymentStatus: 'Paid',
      paymentMethod: 'Cash',
      grandTotal: 2500,
      registrationDate: sixtyDaysAgo,
      paymentDate: sixtyDaysAgo
    });
    await Payment.create({
      patient: pat6._id,
      receiptNumber: `RC-${pat6.patientId}`,
      amount: 2500,
      method: 'Cash',
      receivedBy: recC._id,
      branchName: 'Otona',
      paidAt: sixtyDaysAgo
    });
    const rep6 = await LabReport.create({
      patient: pat6._id,
      reportNumber: `REP6-${timestamp}`,
      branchName: 'Otona',
      status: 'Approved',
      approvedDate: sixtyDaysAgo,
      createdDate: sixtyDaysAgo
    });

    assert(rep1 && rep2 && rep3 && rep4 && rep5 && rep6, 'Created Patient 1 (Main - today), 2 (Main - yesterday), 3 (Otona - today), 4 (Main - 30d), 5 (Main - 90d), 6 (Otona - 60d)');

    // ── 4. VERIFY RECEPTIONIST FINANCIAL SEPARATION ──────────────────────────
    console.log('\n--- Test 4: Receptionist Financial Separation (Strict Account Scoping) ---');
    const dashA = await apiReq('/reception/dashboard', { method: 'GET' }, tokenA);
    assert(dashA.status === 200, 'Receptionist A dashboard loaded');
    assert(dashA.data.summary.todayIncome === 5000, `Receptionist A todayIncome is 5000 ETB (expected 5000, got ${dashA.data.summary.todayIncome})`);
    assert(dashA.data.summary.yesterdayIncome === 2000, `Receptionist A yesterdayIncome is 2000 ETB (expected 2000, got ${dashA.data.summary.yesterdayIncome})`);
    assert(dashA.data.summary.weeklyIncome === undefined, 'Receptionist A weeklyIncome is undefined/removed');

    const dashB = await apiReq('/reception/dashboard', { method: 'GET' }, tokenB);
    assert(dashB.status === 200, 'Receptionist B dashboard loaded');
    assert(dashB.data.summary.todayIncome === 0, `Receptionist B todayIncome is 0 ETB (A's collection is NOT mixed into B's income!) (got ${dashB.data.summary.todayIncome})`);
    assert(dashB.data.summary.yesterdayIncome === 0, `Receptionist B yesterdayIncome is 0 ETB (A's yesterday collection is NOT mixed into B's income) (got ${dashB.data.summary.yesterdayIncome})`);
    assert(dashB.data.summary.weeklyIncome === undefined, 'Receptionist B weeklyIncome is undefined/removed');

    const dashC = await apiReq('/reception/dashboard', { method: 'GET' }, tokenC);
    assert(dashC.status === 200, 'Receptionist C dashboard loaded');
    assert(dashC.data.summary.todayIncome === 3500, `Receptionist C todayIncome is 3500 ETB (only C's own collection) (got ${dashC.data.summary.todayIncome})`);
    assert(dashC.data.summary.yesterdayIncome === 0, `Receptionist C yesterdayIncome is 0 ETB (got ${dashC.data.summary.yesterdayIncome})`);
    assert(dashC.data.summary.weeklyIncome === undefined, 'Receptionist C weeklyIncome is undefined/removed');

    const dashAdmin = await apiReq('/reception/dashboard', { method: 'GET' }, tokenAdmin);
    assert(dashAdmin.status === 200, 'Admin dashboard loaded');
    assert(dashAdmin.data.summary.weeklyIncome !== undefined, 'Admin retains weeklyIncome in dashboard');

    // ── 5. VERIFY SAME-BRANCH APPROVED REPORT VISIBILITY & PRINTING ──────────
    console.log('\n--- Test 5: Same-Branch Approved Reports Sharing ---');
    // Receptionist B (Main branch) queries all approved reports
    const repBRes = await apiReq('/reception/reports?dateFilter=all', { method: 'GET' }, tokenB);
    assert(repBRes.status === 200, 'Receptionist B fetched /reception/reports');
    const repBIds = (repBRes.data.reports || []).map(r => String(r._id));

    assert(repBIds.includes(String(rep1._id)), 'Receptionist B CAN see Patient 1 approved report (registered by Rec A in same branch)');
    assert(repBIds.includes(String(rep2._id)), 'Receptionist B CAN see Patient 2 approved report (registered by Rec A in same branch)');
    assert(!repBIds.includes(String(rep3._id)), 'Receptionist B CANNOT see Patient 3 approved report (from Otona branch)');

    // Receptionist B prints Patient 1's report
    const printBRes = await apiReq(`/reception/reports/${rep1._id}/print`, { method: 'PATCH' }, tokenB);
    assert(printBRes.status === 200, 'Receptionist B CAN print Patient 1 approved report from same branch');

    // ── 6. VERIFY CROSS-BRANCH RESTRICTION & BACKEND SECURITY ────────────────
    console.log('\n--- Test 6: Cross-Branch Security & Boundary Enforcement ---');
    // Receptionist C (Otona) queries approved reports
    const repCRes = await apiReq('/reception/reports?dateFilter=all', { method: 'GET' }, tokenC);
    assert(repCRes.status === 200, 'Receptionist C fetched /reception/reports');
    const repCIds = (repCRes.data.reports || []).map(r => String(r._id));

    assert(repCIds.includes(String(rep3._id)), 'Receptionist C CAN see Patient 3 approved report (Otona branch)');
    assert(!repCIds.includes(String(rep1._id)), 'Receptionist C CANNOT see Patient 1 approved report (Main branch)');
    assert(!repCIds.includes(String(rep2._id)), 'Receptionist C CANNOT see Patient 2 approved report (Main branch)');

    // Receptionist C tries to override branch via query param (?branchName=Main)
    const spoofRes = await apiReq('/reception/reports?dateFilter=all&branchName=Main', { method: 'GET' }, tokenC);
    const spoofIds = (spoofRes.data.reports || []).map(r => String(r._id));
    assert(!spoofIds.includes(String(rep1._id)), 'Receptionist C CANNOT bypass branch filter by specifying ?branchName=Main');

    // Receptionist C tries to print Patient 1's report (Main branch)
    const printCRes = await apiReq(`/reception/reports/${rep1._id}/print`, { method: 'PATCH' }, tokenC);
    assert(printCRes.status === 403, `Receptionist C print of Main report is REJECTED with 403 Forbidden (got ${printCRes.status})`);

    // ── 7. VERIFY DATE FILTERS ON RECEPTION APPROVED REPORTS ────────────────
    console.log('\n--- Test 7: Receptionist Approved Reports Date Filtering ---');
    // Date filter: Today
    const todayRes = await apiReq('/reception/reports?dateFilter=today', { method: 'GET' }, tokenB);
    const todayIds = (todayRes.data.reports || []).map(r => String(r._id));
    assert(todayIds.includes(String(rep1._id)), 'dateFilter=today includes Patient 1 (approved today)');
    assert(!todayIds.includes(String(rep2._id)), 'dateFilter=today excludes Patient 2 (approved yesterday)');

    // Date filter: Yesterday
    const yestRes = await apiReq('/reception/reports?dateFilter=yesterday', { method: 'GET' }, tokenB);
    const yestIds = (yestRes.data.reports || []).map(r => String(r._id));
    assert(!yestIds.includes(String(rep1._id)), 'dateFilter=yesterday excludes Patient 1 (approved today)');
    assert(yestIds.includes(String(rep2._id)), 'dateFilter=yesterday includes Patient 2 (approved yesterday)');

    // Date filter: This Week
    const weekRes = await apiReq('/reception/reports?dateFilter=this_week', { method: 'GET' }, tokenB);
    const weekIds = (weekRes.data.reports || []).map(r => String(r._id));
    assert(weekIds.includes(String(rep1._id)), 'dateFilter=this_week includes Patient 1');

    // Date filter: Last Week
    const lastWeekRes = await apiReq('/reception/reports?dateFilter=last_week', { method: 'GET' }, tokenB);
    const lastWeekIds = (lastWeekRes.data.reports || []).map(r => String(r._id));
    assert(!lastWeekIds.includes(String(rep1._id)), 'dateFilter=last_week excludes Patient 1');

    // Date filter: All
    const allRes = await apiReq('/reception/reports?dateFilter=all', { method: 'GET' }, tokenB);
    const allIds = (allRes.data.reports || []).map(r => String(r._id));
    assert(allIds.includes(String(rep1._id)) && allIds.includes(String(rep2._id)), 'dateFilter=all includes both Patient 1 and Patient 2');
    assert(allIds.includes(String(rep4._id)), 'dateFilter=all includes Patient 4 (approved 30 days ago)');
    assert(allIds.includes(String(rep5._id)), 'dateFilter=all includes Patient 5 (approved 90 days ago)');
    assert(!allIds.includes(String(rep3._id)), 'dateFilter=all strictly excludes Patient 3 (Otona today)');
    assert(!allIds.includes(String(rep6._id)), 'dateFilter=all strictly excludes Patient 6 (Otona 60 days ago)');

    // ── 8. VERIFY ADMIN CROSS-BRANCH ACCESS & DATE FILTERING ────────────────
    console.log('\n--- Test 8: Admin Approved Reports Access & Date Filtering ---');
    // Admin with no branch filter sees across branches and all historical records
    const adminAllRes = await apiReq('/reception/reports?dateFilter=all', { method: 'GET' }, tokenAdmin);
    assert(adminAllRes.status === 200, 'Admin fetched reports');
    const adminAllIds = (adminAllRes.data.reports || []).map(r => String(r._id));
    assert(adminAllIds.includes(String(rep1._id)), 'Admin sees Patient 1 (Main today)');
    assert(adminAllIds.includes(String(rep2._id)), 'Admin sees Patient 2 (Main yesterday)');
    assert(adminAllIds.includes(String(rep3._id)), 'Admin sees Patient 3 (Otona today)');
    assert(adminAllIds.includes(String(rep4._id)), 'Admin sees Patient 4 (Main 30 days ago)');
    assert(adminAllIds.includes(String(rep5._id)), 'Admin sees Patient 5 (Main 90 days ago)');
    assert(adminAllIds.includes(String(rep6._id)), 'Admin sees Patient 6 (Otona 60 days ago)');

    // Admin with dateFilter=today
    const adminTodayRes = await apiReq('/reception/reports?dateFilter=today', { method: 'GET' }, tokenAdmin);
    const adminTodayIds = (adminTodayRes.data.reports || []).map(r => String(r._id));
    assert(adminTodayIds.includes(String(rep1._id)), 'Admin today includes Patient 1 (Main)');
    assert(adminTodayIds.includes(String(rep3._id)), 'Admin today includes Patient 3 (Otona)');
    assert(!adminTodayIds.includes(String(rep2._id)), 'Admin today excludes Patient 2 (Yesterday)');

    // ── 9. VERIFY DEFAULT DATE FILTER IS "TODAY" ────────────────────────────
    console.log('\n--- Test 9: Default Date Filter is "Today" ---');
    // When no dateFilter query parameter is passed, it must default to today
    const defaultRes = await apiReq('/reception/reports', { method: 'GET' }, tokenB);
    assert(defaultRes.status === 200, 'Receptionist B fetched /reception/reports without dateFilter param');
    const defaultIds = (defaultRes.data.reports || []).map(r => String(r._id));
    assert(defaultIds.includes(String(rep1._id)), 'Default query includes Patient 1 (approved today)');
    assert(!defaultIds.includes(String(rep2._id)), 'Default query EXCLUDES Patient 2 (approved yesterday)');
    assert(!defaultIds.includes(String(rep3._id)), 'Default query EXCLUDES Patient 3 (Otona branch)');

    // ── 10. VERIFY PATIENT-NAME SEARCH ON APPROVED REPORTS ──────────────────
    console.log('\n--- Test 10: Patient-Name Search on Approved Reports ---');
    // Search by exact name "Patient One"
    const searchExactRes = await apiReq('/reception/reports?dateFilter=all&q=Patient One', { method: 'GET' }, tokenB);
    const searchExactIds = (searchExactRes.data.reports || []).map(r => String(r._id));
    assert(searchExactIds.includes(String(rep1._id)), 'Search "Patient One" finds Patient 1 approved report');
    assert(!searchExactIds.includes(String(rep2._id)), 'Search "Patient One" does NOT return Patient 2');

    // Search by lowercase "patient one" (case-insensitivity)
    const searchLowerRes = await apiReq('/reception/reports?dateFilter=all&q=patient one', { method: 'GET' }, tokenB);
    const searchLowerIds = (searchLowerRes.data.reports || []).map(r => String(r._id));
    assert(searchLowerIds.includes(String(rep1._id)), 'Search "patient one" (lowercase) matches case-insensitively');

    // Search by partial name "Two"
    const searchPartRes = await apiReq('/reception/reports?dateFilter=all&q=Two', { method: 'GET' }, tokenB);
    const searchPartIds = (searchPartRes.data.reports || []).map(r => String(r._id));
    assert(searchPartIds.includes(String(rep2._id)), 'Search partial "Two" finds Patient 2');
    assert(!searchPartIds.includes(String(rep1._id)), 'Search partial "Two" does not return Patient 1');

    // Search non-existent name "ZzzNonExistentPatient"
    const searchNoneRes = await apiReq('/reception/reports?dateFilter=all&q=ZzzNonExistentPatient', { method: 'GET' }, tokenB);
    assert((searchNoneRes.data.reports || []).length === 0, 'Search non-existent name returns empty array');

    // ── 11. VERIFY SEARCH + DATE FILTER CONJUNCTION & CLEAR SEARCH ──────────
    console.log('\n--- Test 11: Search + Date Filter Conjunction & Clear Search ---');
    // Search "Patient" + Date "today" -> Patient 1 only
    const searchTodayRes = await apiReq('/reception/reports?dateFilter=today&q=Patient', { method: 'GET' }, tokenB);
    const searchTodayIds = (searchTodayRes.data.reports || []).map(r => String(r._id));
    assert(searchTodayIds.includes(String(rep1._id)), 'Search "Patient" + Date "today" returns Patient 1');
    assert(!searchTodayIds.includes(String(rep2._id)), 'Search "Patient" + Date "today" excludes Patient 2 (yesterday)');

    // Search "Patient" + Date "yesterday" -> Patient 2 only
    const searchYestRes = await apiReq('/reception/reports?dateFilter=yesterday&q=Patient', { method: 'GET' }, tokenB);
    const searchYestIds = (searchYestRes.data.reports || []).map(r => String(r._id));
    assert(!searchYestIds.includes(String(rep1._id)), 'Search "Patient" + Date "yesterday" excludes Patient 1 (today)');
    assert(searchYestIds.includes(String(rep2._id)), 'Search "Patient" + Date "yesterday" returns Patient 2 (yesterday)');

    // Search "Patient One" + Date "last_week" -> 0 matches because Patient One was approved today
    const searchLastWkRes = await apiReq('/reception/reports?dateFilter=last_week&q=Patient One', { method: 'GET' }, tokenB);
    const searchLastWkIds = (searchLastWkRes.data.reports || []).map(r => String(r._id));
    assert(!searchLastWkIds.includes(String(rep1._id)), 'Search "Patient One" + Date "last_week" excludes Patient 1 (approved today)');
    assert(searchLastWkIds.length === 0, 'Search "Patient One" + Date "last_week" returns 0 matches');

    // Clear search (empty q) with dateFilter=yesterday -> restores all yesterday reports
    const clearSearchRes = await apiReq('/reception/reports?dateFilter=yesterday&q=', { method: 'GET' }, tokenB);
    const clearSearchIds = (clearSearchRes.data.reports || []).map(r => String(r._id));
    assert(clearSearchIds.includes(String(rep2._id)), 'Cleared search with dateFilter=yesterday restores Patient 2');
    assert(!clearSearchIds.includes(String(rep1._id)), 'Cleared search preserves date filter boundaries (excludes Patient 1)');

    // Search "Historical" with dateFilter=all -> returns Patient 4 and Patient 5 (Main), excludes Patient 6 (Otona)
    const searchHistRes = await apiReq('/reception/reports?dateFilter=all&q=Historical', { method: 'GET' }, tokenB);
    const searchHistIds = (searchHistRes.data.reports || []).map(r => String(r._id));
    assert(searchHistIds.includes(String(rep4._id)) && searchHistIds.includes(String(rep5._id)), 'Search "Historical" with dateFilter=all returns 30-day and 90-day Main reports');
    assert(!searchHistIds.includes(String(rep6._id)), 'Search "Historical" does not return Otona report for Main receptionist');

    // Clear search with dateFilter=all -> restores all 4 Main reports (Patient 1, 2, 4, 5)
    const clearSearchAllRes = await apiReq('/reception/reports?dateFilter=all&q=', { method: 'GET' }, tokenB);
    const clearSearchAllIds = (clearSearchAllRes.data.reports || []).map(r => String(r._id));
    assert(clearSearchAllIds.includes(String(rep1._id)) && clearSearchAllIds.includes(String(rep2._id)) && clearSearchAllIds.includes(String(rep4._id)) && clearSearchAllIds.includes(String(rep5._id)), 'Cleared search with dateFilter=all restores all 4 Main reports (today, yesterday, 30d, 90d)');
    assert(!clearSearchAllIds.includes(String(rep3._id)) && !clearSearchAllIds.includes(String(rep6._id)), 'Cleared search with dateFilter=all strictly excludes Otona reports');

    // ── 12. VERIFY SEARCH RESPECTS BRANCH BOUNDARY ──────────────────────────
    console.log('\n--- Test 12: Search Respects Branch Boundary ---');
    // Receptionist B (Main) searches for Patient 3 (Otona patient)
    const crossSearchRes = await apiReq('/reception/reports?dateFilter=all&q=Patient Three', { method: 'GET' }, tokenB);
    const crossSearchIds = (crossSearchRes.data.reports || []).map(r => String(r._id));
    assert(!crossSearchIds.includes(String(rep3._id)), 'Main Receptionist searching "Patient Three" CANNOT find Otona report');
    assert(crossSearchIds.length === 0, 'Main Receptionist search returns 0 results for Otona patient');

    // Receptionist C (Otona) searches for Patient 1 (Main patient)
    const crossSearchCRes = await apiReq('/reception/reports?dateFilter=all&q=Patient One', { method: 'GET' }, tokenC);
    const crossSearchCIds = (crossSearchCRes.data.reports || []).map(r => String(r._id));
    assert(!crossSearchCIds.includes(String(rep1._id)), 'Otona Receptionist searching "Patient One" CANNOT find Main report');
    assert(crossSearchCIds.length === 0, 'Otona Receptionist search returns 0 results for Main patient');

    // Admin searches for Patient Three -> returns Patient 3
    const adminSearchRes = await apiReq('/reception/reports?dateFilter=all&q=Patient Three', { method: 'GET' }, tokenAdmin);
    const adminSearchIds = (adminSearchRes.data.reports || []).map(r => String(r._id));
    assert(adminSearchIds.includes(String(rep3._id)), 'Admin searching "Patient Three" CAN find Otona report');

    // ── 13. VERIFY RECEPTIONIST 2-DAY INCOME RESTRICTION & BACKEND SECURITY ──
    console.log('\n--- Test 13: Receptionist 2-Day Income Restriction & Endpoint Security ---');
    // 13.1 Rec A queries today's income transactions
    const txTodayA = await apiReq('/reception/transactions?date=today', { method: 'GET' }, tokenA);
    assert(txTodayA.status === 200, 'Receptionist A fetched /reception/transactions?date=today');
    assert(txTodayA.data.date === 'today', 'Response reports date="today"');
    assert(txTodayA.data.count === 1, `Rec A has 1 transaction today (got ${txTodayA.data.count})`);
    assert(txTodayA.data.totalRevenue === 5000, `Rec A today revenue is 5000 ETB (got ${txTodayA.data.totalRevenue})`);
    assert(txTodayA.data.transactions?.[0]?.receiptNumber === `RC-${pat1.patientId}`, 'Transaction belongs to Patient 1');

    // 13.2 Rec B queries today's income transactions (strict account scoping: Rec B did not register Pat 1)
    const txTodayB = await apiReq('/reception/transactions?date=today', { method: 'GET' }, tokenB);
    assert(txTodayB.status === 200, 'Receptionist B fetched /reception/transactions?date=today');
    assert(txTodayB.data.count === 0, `Rec B has 0 transactions today (got ${txTodayB.data.count})`);
    assert(txTodayB.data.totalRevenue === 0, 'Rec B today revenue is 0 ETB');

    // 13.3 Rec A queries yesterday's income transactions
    const txYestA = await apiReq('/reception/transactions?date=yesterday', { method: 'GET' }, tokenA);
    assert(txYestA.status === 200, 'Receptionist A fetched /reception/transactions?date=yesterday');
    assert(txYestA.data.date === 'yesterday', 'Response reports date="yesterday"');
    assert(txYestA.data.count === 1, `Rec A has 1 transaction yesterday (got ${txYestA.data.count})`);
    assert(txYestA.data.totalRevenue === 2000, `Rec A yesterday revenue is 2000 ETB (got ${txYestA.data.totalRevenue})`);
    assert(txYestA.data.transactions?.[0]?.receiptNumber === `RC-${pat2.patientId}`, 'Transaction belongs to Patient 2');

    // 13.4 Rec B queries yesterday's income transactions
    const txYestB = await apiReq('/reception/transactions?date=yesterday', { method: 'GET' }, tokenB);
    assert(txYestB.status === 200, 'Receptionist B fetched /reception/transactions?date=yesterday');
    assert(txYestB.data.count === 0, `Rec B has 0 transactions yesterday (got ${txYestB.data.count})`);

    // 13.5 Receptionist bypass attempts: querying 'all', 'last_week', or arbitrary dates
    // Must strictly fallback to today, never exposing 30-day or 90-day transactions!
    const txBypassAll = await apiReq('/reception/transactions?date=all', { method: 'GET' }, tokenA);
    assert(txBypassAll.status === 200, 'Query with ?date=all returned 200');
    assert(txBypassAll.data.date === 'today', '?date=all strictly defaults/clamps to "today"');
    const bypassAllIds = (txBypassAll.data.transactions || []).map(t => String(t._id));
    assert(!bypassAllIds.includes(String(pat4._id)), 'Query with ?date=all NEVER exposes 30-day historical transaction (Patient 4)');
    assert(!bypassAllIds.includes(String(pat5._id)), 'Query with ?date=all NEVER exposes 90-day historical transaction (Patient 5)');

    const txBypassPast = await apiReq('/reception/transactions?date=last_week', { method: 'GET' }, tokenA);
    assert(txBypassPast.data.date === 'today', '?date=last_week strictly clamps to "today"');

    // 13.6 Cross-branch isolation on transactions
    const txTodayC = await apiReq('/reception/transactions?date=today', { method: 'GET' }, tokenC);
    assert(txTodayC.data.count === 1 && txTodayC.data.totalRevenue === 3500, 'Rec C (Otona) has 1 transaction (3500 ETB)');
    assert(txTodayC.data.transactions?.[0]?.receiptNumber === `RC-${pat3.patientId}`, 'Rec C transaction belongs to Patient 3');
    const txSpoofC = await apiReq('/reception/transactions?date=today&branchName=Main', { method: 'GET' }, tokenC);
    assert(txSpoofC.data.count === 1 && txSpoofC.data.transactions?.[0]?.receiptNumber === `RC-${pat3.patientId}`, 'Rec C spoofing ?branchName=Main cannot view Rec A transactions');

    // 13.7 Backend security clamp on /reports/transactions for Receptionists
    const repTxClamped = await apiReq('/reports/transactions?startDate=2020-01-01&endDate=2026-12-31', { method: 'GET' }, tokenA);
    assert(repTxClamped.status === 200, 'Receptionist accessed /reports/transactions');
    const repTxIds = (repTxClamped.data.transactions || []).map(t => String(t.patientMongoId || t._id));
    assert(!repTxIds.includes(String(pat4._id)), '/reports/transactions clamp excludes 30-day transaction (Patient 4) for Receptionist');
    assert(!repTxIds.includes(String(pat5._id)), '/reports/transactions clamp excludes 90-day transaction (Patient 5) for Receptionist');
    assert(!repTxIds.includes(String(pat3._id)), '/reports/transactions strictly enforces account ownership (excludes Patient 3)');

    // 13.8 Admin retains full unrestricted historical transactions access
    const adminTxRes = await apiReq('/reports/transactions?startDate=2020-01-01&endDate=2026-12-31', { method: 'GET' }, tokenAdmin);
    assert(adminTxRes.status === 200, 'Admin accessed /reports/transactions');
    const adminTxIds = (adminTxRes.data.transactions || []).map(t => String(t.patientMongoId || t._id));
    assert(adminTxIds.includes(String(pat4._id)), 'Admin CAN access 30-day historical transaction (Patient 4)');
    assert(adminTxIds.includes(String(pat5._id)), 'Admin CAN access 90-day historical transaction (Patient 5)');
    assert(adminTxIds.includes(String(pat1._id)) && adminTxIds.includes(String(pat2._id)) && adminTxIds.includes(String(pat3._id)), 'Admin sees all transactions across branches and receptionists');

  } catch (err) {
    console.error('Fatal error during test run:', err);
    failed++;
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`📊 FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
