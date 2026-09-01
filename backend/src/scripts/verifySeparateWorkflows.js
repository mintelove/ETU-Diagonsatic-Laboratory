import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

import app from '../app.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
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

async function runWorkflowVerification() {
  console.log('================================================================');
  console.log('🧪 VERIFYING GENERAL LAB VS INTERNAL MEDICINE COMPLETE SEPARATION');
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
    // 1. Authenticate Receptionist
    console.log('--- 1. Authenticating Roles ---');
    const recepLogin = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'tsega', password: 'password@123' })
    });
    const recepToken = recepLogin.data?.token;
    assert(recepToken, 'Receptionist logged in');

    // 2. Test General Laboratory Registration
    console.log('\n--- 2. Testing General Laboratory Registration (No IM fields) ---');
    const cbcDoc = await LaboratoryTest.findOne({ name: /red blood cell count/i, subcategory: 'CBC' });
    const bgDoc = await LaboratoryTest.findOne({ name: /blood group & rh type/i });

    const genLabPayload = {
      name: 'ABEBE BIKILA',
      age: 28,
      sex: 'Male',
      phone: '+251911333444',
      address: 'Addis Ababa, Bole',
      nationality: '',
      dateOfBirth: null,
      passportNumber: '',
      passportIssueDate: null,
      maritalStatus: '',
      jobTitle: '',
      patientPhoto: '',
      examinationFormType: '',
      registrationType: 'Self',
      referralHospital: '',
      laboratoryTests: [cbcDoc._id, bgDoc._id],
      patientCategory: 'Regular Patient',
      paymentMethod: 'Cash',
      serviceType: 'Laboratory Test',
      systolicBP: 120,
      diastolicBP: 80
    };

    const genLabRes = await apiReq('/reception/patients', {
      method: 'POST',
      body: JSON.stringify(genLabPayload)
    }, recepToken);

    assert(genLabRes.status === 201, 'General Lab patient registered successfully');
    const genPatient = genLabRes.data?.patient;
    assert(genPatient?.name === 'ABEBE BIKILA', 'Patient name is correct');
    assert(genPatient?.examinationFormType === '' || !genPatient?.examinationFormType, 'General Lab patient has NO examinationFormType');
    assert(genPatient?.passportNumber === '' || !genPatient?.passportNumber, 'General Lab patient has NO passportNumber');
    assert(genPatient?.dateOfBirth === null || !genPatient?.dateOfBirth, 'General Lab patient has NO dateOfBirth');
    assert(genPatient?.nationality === '' || !genPatient?.nationality, 'General Lab patient has NO nationality');
    assert(genPatient?.jobTitle === '' || !genPatient?.jobTitle, 'General Lab patient has NO jobTitle');
    assert(genPatient?.maritalStatus === '' || !genPatient?.maritalStatus, 'General Lab patient has NO maritalStatus');
    assert(genPatient?.grandTotal === 700, `General Lab total is 700 ETB (CBC 500 + Blood Group 200) - got ${genPatient?.grandTotal}`);

    // 3. Test Internal Medicine Speciality Form Registration
    console.log('\n--- 3. Testing Internal Medicine Speciality Form Registration ---');
    const imedTest = await LaboratoryTest.findOne({ name: /internal medicine speciality examination form/i });
    assert(imedTest !== null, 'Internal Medicine test exists in database');
    assert(imedTest?.price === 1500, `Internal Medicine test price is ${imedTest?.price} ETB (expected 1500 ETB)`);

    const imedPayload = {
      name: 'MEDHANIT YISHAK KALITO',
      age: 24,
      sex: 'Female',
      phone: '+251911555666',
      address: 'Addis Ababa',
      nationality: 'ETHIOPIA',
      dateOfBirth: '2002-05-14',
      passportNumber: 'EQ2677316',
      passportIssueDate: '2024-01-10',
      maritalStatus: 'Single',
      jobTitle: 'Housekeeper',
      patientPhoto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      examinationFormType: 'Internal Medicine Speciality Examination Form',
      registrationType: 'Self',
      referralHospital: '',
      laboratoryTests: [imedTest._id],
      patientCategory: 'Regular Patient',
      paymentMethod: 'Cash',
      serviceType: 'Laboratory Test',
      systolicBP: 110,
      diastolicBP: 75
    };

    const imedRes = await apiReq('/reception/patients', {
      method: 'POST',
      body: JSON.stringify(imedPayload)
    }, recepToken);

    assert(imedRes.status === 201, 'Internal Medicine patient registered successfully');
    const imedPatient = imedRes.data?.patient;
    assert(imedPatient?.name === 'MEDHANIT YISHAK KALITO', 'Internal Medicine patient name is correct');
    assert(imedPatient?.examinationFormType === 'Internal Medicine Speciality Examination Form', 'examinationFormType is Internal Medicine Speciality Examination Form');
    assert(imedPatient?.passportNumber === 'EQ2677316', 'passportNumber is EQ2677316');
    assert(imedPatient?.nationality === 'ETHIOPIA', 'nationality is ETHIOPIA');
    assert(imedPatient?.jobTitle === 'Housekeeper', 'jobTitle is Housekeeper');
    assert(imedPatient?.maritalStatus === 'Single', 'maritalStatus is Single');
    assert(imedPatient?.grandTotal === 1500, `Internal Medicine total is 1,500 ETB - got ${imedPatient?.grandTotal}`);

    // 4. Verify Both Patients Exist Independently in MongoDB
    console.log('\n--- 4. Verifying Independent Database Documents ---');
    const dbGen = await Patient.findById(genPatient._id);
    const dbImed = await Patient.findById(imedPatient._id);

    assert(dbGen && dbImed, 'Both patient documents exist in database');
    assert(dbGen.examinationFormType !== dbImed.examinationFormType, 'examinationFormType is strictly different between the two records');

    console.log('\n================================================================');
    console.log(`🏁 SEPARATION VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

  } catch (err) {
    console.error('Fatal error during workflow verification:', err);
    failed++;
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runWorkflowVerification();
