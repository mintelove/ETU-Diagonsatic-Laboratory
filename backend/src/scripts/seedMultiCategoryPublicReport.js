import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

import User from '../models/User.js';
import Patient from '../models/Patient.js';
import LabReport from '../models/LabReport.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import { connectDatabase } from '../config/database.js';

async function seed() {
  await connectDatabase();

  const receptionist = await User.findOne({ role: 'Reception' });
  const collector = await User.findOne({ role: 'Sample Collector' });
  const approver = await User.findOne({ role: 'Approver' });
  const activeTests = await LaboratoryTest.find({ status: 'Active' }).populate('category', 'name').limit(12);

  const testIds = activeTests.map(t => t._id);

  let patient = await Patient.findOne({ name: 'MULTI CATEGORY PUBLIC TEST PATIENT' });
  if (!patient) {
    patient = await Patient.create({
      name: 'MULTI CATEGORY PUBLIC TEST PATIENT',
      patientId: 'ETU-PUB-999',
      barcode: 'ETU-BAR-999',
      registeredBy: receptionist?._id || collector?._id,
      age: 42,
      sex: 'Male',
      phone: '+251911998877',
      branchName: 'Main',
      laboratoryTests: testIds,
      paymentStatus: 'Paid',
      paymentMethod: 'Cash',
      registrationType: 'Self'
    });
  }

  let report = await LabReport.findOne({ patient: patient._id });
  const multiResults = [
    { sampleName: 'White Blood Cells (WBC)', result: '6.8', unit: '10^3/uL', referenceValue: '4.0 - 11.0', flag: 'N', category: 'HEMATOLOGY', subcategory: 'CBC' },
    { sampleName: 'Hemoglobin (Hgb)', result: '11.2', unit: 'g/dL', referenceValue: '13.5 - 17.5', flag: 'L', category: 'HEMATOLOGY', subcategory: 'CBC' },
    { sampleName: 'Platelet Count', result: '480', unit: '10^3/uL', referenceValue: '150 - 450', flag: 'H', category: 'HEMATOLOGY', subcategory: 'CBC' },
    { sampleName: 'Fasting Blood Sugar (FBS)', result: '165', unit: 'mg/dL', referenceValue: '70 - 100', flag: 'H', category: 'CLINICAL CHEMISTRY', subcategory: 'GLUCOSE' },
    { sampleName: 'Serum Creatinine', result: '0.8', unit: 'mg/dL', referenceValue: '0.6 - 1.2', flag: 'N', category: 'CLINICAL CHEMISTRY', subcategory: 'RENAL FUNCTION' },
    { sampleName: 'ALT (SGPT)', result: '28', unit: 'U/L', referenceValue: '< 41', flag: 'N', category: 'CLINICAL CHEMISTRY', subcategory: 'LIVER FUNCTION' },
    { sampleName: 'Thyroid Stimulating Hormone (TSH)', result: '0.15', unit: 'uIU/mL', referenceValue: '0.4 - 4.0', flag: 'L', category: 'HORMONE', subcategory: 'THYROID PROFILE' },
    { sampleName: 'Hepatitis B Surface Antigen (HBsAg)', result: 'Non-Reactive', unit: '', referenceValue: 'Non-Reactive', flag: 'N', category: 'SEROLOGY', subcategory: 'VIRAL MARKERS' },
    { sampleName: 'VDRL / RPR', result: 'Non-Reactive', unit: '', referenceValue: 'Non-Reactive', flag: 'N', category: 'SEROLOGY', subcategory: 'INFECTIOUS' }
  ];

  if (!report) {
    report = await LabReport.create({
      patient: patient._id,
      technician: collector?._id,
      approvedBy: approver?._id,
      status: 'Approved',
      branchName: 'Main',
      laboratoryTests: testIds,
      results: multiResults,
      comments: 'Routine health checkup panel. Multiple panels completed.',
      approvedDate: new Date(),
      approvalDate: new Date(),
      publicReport: {
        token: 'MULTI-CATEGORY-DEMO-TOKEN-999',
        enabled: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        viewCount: 0
      }
    });
  } else {
    report.status = 'Approved';
    report.results = multiResults;
    report.publicReport = {
      token: 'MULTI-CATEGORY-DEMO-TOKEN-999',
      enabled: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      viewCount: 0
    };
    await report.save();
  }

  console.log('SEED_SUCCESS');
  console.log('PUBLIC_TOKEN=MULTI-CATEGORY-DEMO-TOKEN-999');
  console.log('PUBLIC_URL=http://localhost:5173/report/public/MULTI-CATEGORY-DEMO-TOKEN-999');
  await mongoose.connection.close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
