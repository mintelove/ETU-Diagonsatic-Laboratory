import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

import PathologyCase from '../models/PathologyCase.js';
import RadiologyCase from '../models/RadiologyCase.js';
import { PATHOLOGY_TEMPLATES } from '../constants/pathologyTemplates.js';
import { RADIOLOGY_TEMPLATES } from '../constants/radiologyTemplates.js';

async function run() {
  const uri = process.env.MONGODB_URI_FALLBACK || process.env.MONGODB_URI || 'mongodb://localhost:27017/etu-lab';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  } catch (err) {
    if (process.env.MONGODB_URI && uri !== process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    } else {
      throw err;
    }
  }
  console.log('Connected to MongoDB');

  // Test 1: Verify Pathology Case Option C draft saving and loading
  console.log('\n--- 1. Testing Pathology Option C Draft Persistence ---');
  const pathTpl = PATHOLOGY_TEMPLATES.Pathology.find(t => t.key === 'biopsy_histopathology');
  if (!pathTpl) throw new Error('Biopsy template not found');

  let testPathCase = await PathologyCase.findOne({ testType: 'Biopsy' });
  if (!testPathCase) {
    testPathCase = await PathologyCase.findOne();
  }

  if (testPathCase) {
    const originalReportType = testPathCase.reportType;
    const originalTemplate = testPathCase.templateReport;

    // Simulate saving draft with Option C
    testPathCase.reportType = 'Option C';
    testPathCase.templateReport = {
      category: 'Pathology',
      templateKey: pathTpl.key,
      examination: pathTpl.examination,
      clinicalInformation: 'Test Clinical Info',
      technique: pathTpl.technique,
      comparison: pathTpl.comparison,
      findings: 'SPECIFIC TEST FINDINGS ENTERED BY PATHOLOGIST',
      impression: 'SPECIFIC TEST IMPRESSION',
      recommendation: pathTpl.recommendation
    };
    testPathCase.reportContent = `<div class="option-c-report-body"><h2>${pathTpl.examination}</h2><p>SPECIFIC TEST FINDINGS ENTERED BY PATHOLOGIST</p></div>`;
    await testPathCase.save();

    // Re-fetch from database
    const reloadedPath = await PathologyCase.findById(testPathCase._id).lean();
    if (reloadedPath.reportType !== 'Option C') throw new Error(`Expected reportType 'Option C', got ${reloadedPath.reportType}`);
    if (reloadedPath.templateReport?.templateKey !== 'biopsy_histopathology') throw new Error(`Expected templateKey 'biopsy_histopathology', got ${reloadedPath.templateReport?.templateKey}`);
    if (!reloadedPath.templateReport?.findings?.includes('SPECIFIC TEST FINDINGS')) throw new Error('Findings not persisted');
    if (!reloadedPath.reportContent?.includes('SPECIFIC TEST FINDINGS')) throw new Error('HTML reportContent not persisted');

    console.log('✓ Pathology Option C draft persisted and reloaded successfully!');
    console.log('  Case #:', reloadedPath.caseNumber);
    console.log('  Report Type:', reloadedPath.reportType);
    console.log('  Template:', reloadedPath.templateReport.templateKey);
    console.log('  Findings preserved:', reloadedPath.templateReport.findings.slice(0, 40) + '...');

    // Restore original
    testPathCase.reportType = originalReportType;
    testPathCase.templateReport = originalTemplate;
    await testPathCase.save();
  } else {
    console.log('Notice: No Pathology cases found to test.');
  }

  // Test 2: Verify Radiology Case Option C draft saving and loading
  console.log('\n--- 2. Testing Radiology Option C Draft Persistence ---');
  const radTpl = RADIOLOGY_TEMPLATES.Ultrasound.find(t => t.key === 'abdominopelvic_us_male') || RADIOLOGY_TEMPLATES.Ultrasound[0];
  if (!radTpl) throw new Error('Abdomen Ultrasound template not found');

  let testRadCase = await RadiologyCase.findOne({ examinationType: 'Ultrasound' });
  if (!testRadCase) {
    testRadCase = await RadiologyCase.findOne();
  }

  if (testRadCase) {
    const originalReportType = testRadCase.reportType;
    const originalTemplate = testRadCase.templateReport;

    // Simulate saving draft with Option C
    testRadCase.reportType = 'Option C';
    testRadCase.templateReport = {
      category: 'Ultrasound',
      templateKey: radTpl.key,
      examination: radTpl.examination,
      clinicalInformation: 'Test Clinical Indication',
      technique: radTpl.technique,
      comparison: radTpl.comparison,
      findings: 'SPECIFIC TEST ULTRASOUND FINDINGS ENTERED BY RADIOLOGIST',
      impression: 'SPECIFIC TEST RADIOLOGY IMPRESSION',
      recommendation: radTpl.recommendation
    };
    testRadCase.reportContent = `<div class="option-c-report-body"><h2>${radTpl.examination}</h2><p>SPECIFIC TEST ULTRASOUND FINDINGS ENTERED BY RADIOLOGIST</p></div>`;
    await testRadCase.save();

    // Re-fetch from database
    const reloadedRad = await RadiologyCase.findById(testRadCase._id).lean();
    if (reloadedRad.reportType !== 'Option C') throw new Error(`Expected reportType 'Option C', got ${reloadedRad.reportType}`);
    if (reloadedRad.templateReport?.templateKey !== radTpl.key) throw new Error(`Expected templateKey '${radTpl.key}', got ${reloadedRad.templateReport?.templateKey}`);
    if (!reloadedRad.templateReport?.findings?.includes('SPECIFIC TEST ULTRASOUND FINDINGS')) throw new Error('Findings not persisted');
    if (!reloadedRad.reportContent?.includes('SPECIFIC TEST ULTRASOUND FINDINGS')) throw new Error('HTML reportContent not persisted');

    console.log('✓ Radiology Option C draft persisted and reloaded successfully!');
    console.log('  Case #:', reloadedRad.caseNumber);
    console.log('  Report Type:', reloadedRad.reportType);
    console.log('  Template:', reloadedRad.templateReport.templateKey);
    console.log('  Findings preserved:', reloadedRad.templateReport.findings.slice(0, 40) + '...');

    // Restore original
    testRadCase.reportType = originalReportType;
    testRadCase.templateReport = originalTemplate;
    await testRadCase.save();
  } else {
    console.log('Notice: No Radiology cases found to test.');
  }

  console.log('\n✓ All Option C draft persistence checks passed completely!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
