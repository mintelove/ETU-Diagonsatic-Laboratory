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
    // 1. Authenticate Roles
    console.log('--- 1. Authenticating Roles ---');
    const recepLogin = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'tsega', password: 'password@123' })
    });
    const recepToken = recepLogin.data?.token;
    assert(recepToken, 'Receptionist logged in');

    const collectorLogin = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'bereket', password: 'password@123' })
    });
    const collectorToken = collectorLogin.data?.token;
    assert(collectorToken, 'Sample Collector logged in');

    const approverLogin = await apiReq('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'womdachew tesfaye', password: 'password@123' })
    });
    const approverToken = approverLogin.data?.token;
    assert(approverToken, 'Approver logged in');

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

    // Collector Starts General Lab collection
    console.log('\n--- 2B. Collector Workflow for General Lab ---');
    const startGenRes = await apiReq(`/collection/patients/${genPatient._id}/start`, { method: 'POST' }, collectorToken);
    assert(startGenRes.status === 200, 'Collector started General Lab collection');

    const genDraft = await LabReport.findOne({ patient: genPatient._id });
    assert(genDraft !== null, 'Draft LabReport created');
    assert(genDraft.isInternalMedicineForm === false, 'Draft LabReport has isInternalMedicineForm: false');

    // Collector Saves General Lab results
    const saveGenRes = await apiReq(`/collection/patients/${genPatient._id}/report`, {
      method: 'PUT',
      body: JSON.stringify({
        results: [
          { sampleName: 'RBC Count', result: '4.8', unit: 'x10^12/L', referenceValue: '4.5 - 5.5', category: 'HEMATOLOGY', subcategory: 'CBC' },
          { sampleName: 'Blood Group & Rh Type', result: 'O Positive', unit: '', referenceValue: '', category: 'BLOOD GROUP', subcategory: 'GENERAL' }
        ]
      })
    }, collectorToken);
    assert(saveGenRes.status === 200, 'Collector saved General Lab results');

    // Collector Submits General Lab report
    const submitGenRes = await apiReq(`/collection/patients/${genPatient._id}/report/submit`, { method: 'POST' }, collectorToken);
    assert(submitGenRes.status === 200, 'Collector submitted General Lab report for approval');

    // Approver Approves General Lab report
    const approveGenRes = await apiReq(`/report-approvals/${genDraft._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Approved' })
    }, approverToken);
    assert(approveGenRes.status === 200, 'Approver approved General Lab report');

    const approvedGenReport = await LabReport.findById(genDraft._id).populate('patient technician approvedBy');
    assert(approvedGenReport.status === 'Approved', 'General Lab report is Approved');
    assert(approvedGenReport.isInternalMedicineForm === false, 'Approved General Lab report isInternalMedicineForm: false');
    assert(approvedGenReport.results.length === 2, 'General Lab report contains 2 test results');
    assert(approvedGenReport.results[0].sampleName === 'RBC Count', 'Result 1 is RBC Count');
    assert(approvedGenReport.results[1].sampleName === 'Blood Group & Rh Type', 'Result 2 is Blood Group & Rh Type');

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

    // Collector Starts IM collection
    console.log('\n--- 3B. Collector Workflow for Internal Medicine ---');
    const startImedRes = await apiReq(`/collection/patients/${imedPatient._id}/start`, { method: 'POST' }, collectorToken);
    assert(startImedRes.status === 200, 'Collector started Internal Medicine collection');

    const imedDraft = await LabReport.findOne({ patient: imedPatient._id });
    assert(imedDraft !== null, 'Draft LabReport created for IM');
    assert(imedDraft.isInternalMedicineForm === true, 'Draft LabReport has isInternalMedicineForm: true');

    // Collector Saves IM report
    const saveImedRes = await apiReq(`/collection/patients/${imedPatient._id}/report`, {
      method: 'PUT',
      body: JSON.stringify({
        isInternalMedicineForm: true,
        internalMedicineReport: {
          examinationResult: 'Fit for Employment',
          clinicalExamination: { generalAppearance: 'Normal', respiratorySystem: 'Clear' },
          labInvestigations: { cbc: 'Normal', fbs: '85 mg/dL', hiv12: 'Negative' },
          vitalSigns: { systolicBP: 110, diastolicBP: 75, pulse: '72' },
          declaration: { doctorName: 'Dr. Specialist', declarationText: 'Confirmed fit.' }
        }
      })
    }, collectorToken);
    assert(saveImedRes.status === 200, 'Collector saved Internal Medicine report');

    // Collector Submits IM report
    const submitImedRes = await apiReq(`/collection/patients/${imedPatient._id}/report/submit`, { method: 'POST' }, collectorToken);
    assert(submitImedRes.status === 200, 'Collector submitted Internal Medicine report for approval');

    // Approver Approves IM report
    const approveImedRes = await apiReq(`/report-approvals/${imedDraft._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Approved' })
    }, approverToken);
    assert(approveImedRes.status === 200, 'Approver approved Internal Medicine report');
    assert(approveImedRes.status === 200, 'Approver approved Internal Medicine report');

    const approvedImedReport = await LabReport.findById(imedDraft._id).populate('patient technician approvedBy');
    assert(approvedImedReport.status === 'Approved', 'Internal Medicine report is Approved');
    assert(approvedImedReport.isInternalMedicineForm === true, 'Approved Internal Medicine report isInternalMedicineForm: true');
    assert(approvedImedReport.internalMedicineReport?.examinationResult === 'Fit for Employment', 'IM examinationResult is Fit for Employment');
    assert(approvedImedReport.internalMedicineReport?.labInvestigations?.fbs === '85 mg/dL', 'IM labInvestigations FBS is 85 mg/dL');

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
