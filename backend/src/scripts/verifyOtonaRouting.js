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
import Payment from '../models/Payment.js';
import Receipt from '../models/Receipt.js';
import PathologyCase from '../models/PathologyCase.js';
import RadiologyCase from '../models/RadiologyCase.js';
import Notification from '../models/Notification.js';
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

async function runVerification() {
  console.log('================================================================');
  console.log('🔬 ETU DIAGNOSTIC LABORATORY — CROSS-BRANCH SPECIALIST ROUTING SUITE');
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

  const createdPatientIds = [];

  try {
    // 1. Authenticate Roles
    console.log('--- 1. Authenticating Required Roles ---');
    const otonaRecepLogin = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'kalkidan', password: 'password@123' })
    });
    const otonaToken = otonaRecepLogin.data?.token;
    assert(otonaToken, 'Otona Receptionist (@kalkidan) logged in successfully');

    const mainRecepLogin = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'tsega', password: 'password@123' })
    });
    const mainToken = mainRecepLogin.data?.token;
    assert(mainToken, 'Main Receptionist (@tsega) logged in successfully');

    const pathologistLogin = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'dr.kidus', password: 'Password@123' })
    });
    const pathToken = pathologistLogin.data?.token;
    assert(pathToken, 'Pathologist (@dr.kidus) logged in successfully');

    const radiologistLogin = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'dr.bethel', password: 'Password@123' })
    });
    const radToken = radiologistLogin.data?.token;
    assert(radToken, 'Radiologist (@dr.bethel) logged in successfully');

    // Fetch tests
    const biopsyTest = await LaboratoryTest.findOne({ name: 'Biopsy' });
    const fnacTest = await LaboratoryTest.findOne({ name: 'FNAC' });
    const ctScanTest = await LaboratoryTest.findOne({ name: 'CT Scan' });
    const ultrasoundTest = await LaboratoryTest.findOne({ name: 'Ultrasound - Abdominal' });
    const bloodGroupTest = await LaboratoryTest.findOne({ name: /blood group/i });

    assert(biopsyTest && fnacTest && ctScanTest && ultrasoundTest, 'All required tests loaded from catalog');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 1: Main Reception → Pathology → Pathologist
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. TEST 1: Main Reception → Pathology → Pathologist ---');
    const t1Res = await apiReq('/reception/patients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'TEST-PATIENT-T1-MAIN-PATH',
        age: 30,
        sex: 'Male',
        phone: '+251911333001',
        address: 'Addis Ababa, Main',
        registrationType: 'Self',
        laboratoryTests: [biopsyTest._id],
        patientCategory: 'Regular Patient',
        paymentMethod: 'Cash',
        serviceType: 'Laboratory Test'
      })
    }, mainToken);
    assert(t1Res.status === 201, 'Test 1 patient registered');
    const p1 = t1Res.data?.patient;
    if (p1?._id) createdPatientIds.push(p1._id);

    const pathQ1 = await apiReq('/pathology/queue', {}, pathToken);
    assert(pathQ1.status === 200, 'Pathologist queue loads without errors');
    const c1 = pathQ1.data?.cases?.find(c => String(c.patient?._id) === String(p1._id));
    assert(Boolean(c1), 'Pathologist (@dr.kidus) received Main Pathology request');
    assert(c1?.branchName === 'Main', 'Branch metadata "Main" strictly preserved');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 2: Otona Reception → Pathology → Pathologist
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. TEST 2: Otona Reception → Pathology → Pathologist ---');
    const t2Res = await apiReq('/reception/patients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'TEST-PATIENT-T2-OTONA-PATH',
        age: 40,
        sex: 'Female',
        phone: '+251911333002',
        address: 'Wolaita Sodo, Otona',
        registrationType: 'Self',
        laboratoryTests: [fnacTest._id],
        patientCategory: 'Regular Patient',
        paymentMethod: 'Cash',
        serviceType: 'Laboratory Test'
      })
    }, otonaToken);
    assert(t2Res.status === 201, 'Test 2 patient registered');
    const p2 = t2Res.data?.patient;
    if (p2?._id) createdPatientIds.push(p2._id);

    const pathQ2 = await apiReq('/pathology/queue', {}, pathToken);
    const c2 = pathQ2.data?.cases?.find(c => String(c.patient?._id) === String(p2._id));
    assert(Boolean(c2), 'Pathologist (@dr.kidus) received Otona Pathology request (Cross-Branch)');
    assert(c2?.branchName === 'Otona', 'Branch metadata "Otona" strictly preserved');

    const radQ2 = await apiReq('/radiology/queue', {}, radToken);
    const inRadQ2 = radQ2.data?.cases?.some(c => String(c.patient?._id) === String(p2._id));
    assert(!inRadQ2, 'Pathology request does not leak into Radiologist queue');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 3: Main Reception → Radiology → Radiologist
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. TEST 3: Main Reception → Radiology → Radiologist ---');
    const t3Res = await apiReq('/reception/patients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'TEST-PATIENT-T3-MAIN-RAD',
        age: 50,
        sex: 'Male',
        phone: '+251911333003',
        address: 'Addis Ababa, Main',
        registrationType: 'Self',
        laboratoryTests: [ctScanTest._id],
        patientCategory: 'Regular Patient',
        paymentMethod: 'Cash',
        serviceType: 'Laboratory Test'
      })
    }, mainToken);
    assert(t3Res.status === 201, 'Test 3 patient registered');
    const p3 = t3Res.data?.patient;
    if (p3?._id) createdPatientIds.push(p3._id);

    const radQ3 = await apiReq('/radiology/queue', {}, radToken);
    assert(radQ3.status === 200, 'Radiologist queue loads without errors');
    const c3 = radQ3.data?.cases?.find(c => String(c.patient?._id) === String(p3._id));
    assert(Boolean(c3), 'Radiologist (@dr.bethel) received Main Radiology request (Cross-Branch)');
    assert(c3?.branchName === 'Main', 'Branch metadata "Main" strictly preserved');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 4: Otona Reception → Radiology → Radiologist
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. TEST 4: Otona Reception → Radiology → Radiologist ---');
    const t4Res = await apiReq('/reception/patients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'TEST-PATIENT-T4-OTONA-RAD',
        age: 25,
        sex: 'Female',
        phone: '+251911333004',
        address: 'Wolaita Sodo, Otona',
        registrationType: 'Self',
        laboratoryTests: [ultrasoundTest._id],
        patientCategory: 'Regular Patient',
        paymentMethod: 'Cash',
        serviceType: 'Laboratory Test'
      })
    }, otonaToken);
    assert(t4Res.status === 201, 'Test 4 patient registered');
    const p4 = t4Res.data?.patient;
    if (p4?._id) createdPatientIds.push(p4._id);

    const radQ4 = await apiReq('/radiology/queue', {}, radToken);
    const c4 = radQ4.data?.cases?.find(c => String(c.patient?._id) === String(p4._id));
    assert(Boolean(c4), 'Radiologist (@dr.bethel) received Otona Radiology request');
    assert(c4?.branchName === 'Otona', 'Branch metadata "Otona" strictly preserved');

    const pathQ4 = await apiReq('/pathology/queue', {}, pathToken);
    const inPathQ4 = pathQ4.data?.cases?.some(c => String(c.patient?._id) === String(p4._id));
    assert(!inPathQ4, 'Radiology request does not leak into Pathologist queue');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 5: Main → Pathology + Radiology
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. TEST 5: Main → Pathology + Radiology ---');
    const t5Res = await apiReq('/reception/patients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'TEST-PATIENT-T5-MAIN-BOTH',
        age: 60,
        sex: 'Male',
        phone: '+251911333005',
        address: 'Addis Ababa, Main',
        registrationType: 'Self',
        laboratoryTests: [biopsyTest._id, ctScanTest._id],
        patientCategory: 'Regular Patient',
        paymentMethod: 'Cash',
        serviceType: 'Laboratory Test'
      })
    }, mainToken);
    assert(t5Res.status === 201, 'Test 5 patient registered');
    const p5 = t5Res.data?.patient;
    if (p5?._id) createdPatientIds.push(p5._id);

    const pathQ5 = await apiReq('/pathology/queue', {}, pathToken);
    const inPathQ5 = pathQ5.data?.cases?.find(c => String(c.patient?._id) === String(p5._id));
    assert(Boolean(inPathQ5), 'Pathologist queue receives the Pathology case for Patient 5');
    assert(inPathQ5?.branchName === 'Main', 'Branch metadata "Main" preserved in Pathology');

    const radQ5 = await apiReq('/radiology/queue', {}, radToken);
    const inRadQ5 = radQ5.data?.cases?.find(c => String(c.patient?._id) === String(p5._id));
    assert(Boolean(inRadQ5), 'Radiologist queue receives the Radiology case for Patient 5');
    assert(inRadQ5?.branchName === 'Main', 'Branch metadata "Main" preserved in Radiology');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 6: Otona → Pathology + Radiology
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- 7. TEST 6: Otona → Pathology + Radiology ---');
    const t6Res = await apiReq('/reception/patients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'TEST-PATIENT-T6-OTONA-BOTH',
        age: 33,
        sex: 'Female',
        phone: '+251911333006',
        address: 'Wolaita Sodo, Otona',
        registrationType: 'Self',
        laboratoryTests: [fnacTest._id, ultrasoundTest._id],
        patientCategory: 'Regular Patient',
        paymentMethod: 'Cash',
        serviceType: 'Laboratory Test'
      })
    }, otonaToken);
    assert(t6Res.status === 201, 'Test 6 patient registered');
    const p6 = t6Res.data?.patient;
    if (p6?._id) createdPatientIds.push(p6._id);

    const pathQ6 = await apiReq('/pathology/queue', {}, pathToken);
    const inPathQ6 = pathQ6.data?.cases?.find(c => String(c.patient?._id) === String(p6._id));
    assert(Boolean(inPathQ6), 'Pathologist queue receives the Pathology case for Patient 6');
    assert(inPathQ6?.branchName === 'Otona', 'Branch metadata "Otona" preserved in Pathology');

    const radQ6 = await apiReq('/radiology/queue', {}, radToken);
    const inRadQ6 = radQ6.data?.cases?.find(c => String(c.patient?._id) === String(p6._id));
    assert(Boolean(inRadQ6), 'Radiologist queue receives the Radiology case for Patient 6');
    assert(inRadQ6?.branchName === 'Otona', 'Branch metadata "Otona" preserved in Radiology');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 7: Simultaneous Registrations from Both Branches (with mixed general lab)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- 8. TEST 7: Simultaneous Multiple Patients (CBC + Path + Rad) ---');
    const [simMain, simOtona] = await Promise.all([
      apiReq('/reception/patients', {
        method: 'POST',
        body: JSON.stringify({
          name: 'TEST-PATIENT-T7-SIM-MAIN',
          age: 44,
          sex: 'Male',
          phone: '+251911333007',
          address: 'Addis Ababa, Main',
          registrationType: 'Self',
          laboratoryTests: [bloodGroupTest._id, biopsyTest._id],
          patientCategory: 'Regular Patient',
          paymentMethod: 'Cash',
          serviceType: 'Laboratory Test'
        })
      }, mainToken),
      apiReq('/reception/patients', {
        method: 'POST',
        body: JSON.stringify({
          name: 'TEST-PATIENT-T7-SIM-OTONA',
          age: 48,
          sex: 'Female',
          phone: '+251911333008',
          address: 'Wolaita Sodo, Otona',
          registrationType: 'Self',
          laboratoryTests: [bloodGroupTest._id, ctScanTest._id],
          patientCategory: 'Regular Patient',
          paymentMethod: 'Cash',
          serviceType: 'Laboratory Test'
        })
      }, otonaToken)
    ]);

    assert(simMain.status === 201 && simOtona.status === 201, 'Both simultaneous patients registered');
    const pSimMain = simMain.data?.patient;
    const pSimOtona = simOtona.data?.patient;
    if (pSimMain?._id) createdPatientIds.push(pSimMain._id);
    if (pSimOtona?._id) createdPatientIds.push(pSimOtona._id);

    // Verify Pathologist sees Sim Main, NOT Sim Otona
    const pathQ7 = await apiReq('/pathology/queue', {}, pathToken);
    const hasSimMainInPath = pathQ7.data?.cases?.some(c => String(c.patient?._id) === String(pSimMain._id));
    const hasSimOtonaInPath = pathQ7.data?.cases?.some(c => String(c.patient?._id) === String(pSimOtona._id));
    assert(hasSimMainInPath, 'Pathologist sees Main patient Pathology test');
    assert(!hasSimOtonaInPath, 'Pathologist does NOT see Otona patient who only ordered Radiology');

    // Verify Radiologist sees Sim Otona, NOT Sim Main
    const radQ7 = await apiReq('/radiology/queue', {}, radToken);
    const hasSimOtonaInRad = radQ7.data?.cases?.some(c => String(c.patient?._id) === String(pSimOtona._id));
    const hasSimMainInRad = radQ7.data?.cases?.some(c => String(c.patient?._id) === String(pSimMain._id));
    assert(hasSimOtonaInRad, 'Radiologist sees Otona patient Radiology test');
    assert(!hasSimMainInRad, 'Radiologist does NOT see Main patient who only ordered Pathology');

    // Verify NO duplicates in Pathology and Radiology
    const pathDuplicates = await PathologyCase.aggregate([
      { $match: { patient: { $in: createdPatientIds } } },
      { $group: { _id: { patient: '$patient', testType: '$testType' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    assert(pathDuplicates.length === 0, 'Zero duplicate Pathology cases created');

    const radDuplicates = await RadiologyCase.aggregate([
      { $match: { patient: { $in: createdPatientIds } } },
      { $group: { _id: { patient: '$patient', examinationType: '$examinationType' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    assert(radDuplicates.length === 0, 'Zero duplicate Radiology cases created');

    console.log('\n================================================================');
    console.log(`🏁 COMPLETE SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Fatal error during routing verification:', err);
    failed++;
  } finally {
    if (createdPatientIds.length > 0) {
      console.log(`Cleaning up ${createdPatientIds.length} test patient records...`);
      await Patient.deleteMany({ _id: { $in: createdPatientIds } });
      await Payment.deleteMany({ patient: { $in: createdPatientIds } });
      await Receipt.deleteMany({ patient: { $in: createdPatientIds } });
      await PathologyCase.deleteMany({ patient: { $in: createdPatientIds } });
      await RadiologyCase.deleteMany({ patient: { $in: createdPatientIds } });
      await Notification.deleteMany({ entity: { $in: createdPatientIds } });
      console.log('Test records cleanup completed.');
    }

    server.close();
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runVerification();
