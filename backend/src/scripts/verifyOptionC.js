import { RADIOLOGY_TEMPLATES } from '../constants/radiologyTemplates.js';
import { PATHOLOGY_TEMPLATES } from '../constants/pathologyTemplates.js';
import RadiologyCase from '../models/RadiologyCase.js';
import PathologyCase from '../models/PathologyCase.js';

console.log('--- Verifying Radiology Templates ---');
console.log(`MRI templates: ${RADIOLOGY_TEMPLATES.MRI?.length || 0}`);
console.log(`CT templates: ${RADIOLOGY_TEMPLATES.CT?.length || 0}`);
console.log(`Ultrasound templates: ${RADIOLOGY_TEMPLATES.Ultrasound?.length || 0}`);

if (RADIOLOGY_TEMPLATES.MRI.length !== 12) throw new Error(`Expected 12 MRI templates, got ${RADIOLOGY_TEMPLATES.MRI.length}`);
if (RADIOLOGY_TEMPLATES.CT.length !== 15) throw new Error(`Expected 15 CT templates, got ${RADIOLOGY_TEMPLATES.CT.length}`);
if (RADIOLOGY_TEMPLATES.Ultrasound.length !== 22) throw new Error(`Expected 22 Ultrasound templates, got ${RADIOLOGY_TEMPLATES.Ultrasound.length}`);

console.log('--- Verifying Pathology Templates ---');
console.log(`Pathology templates: ${PATHOLOGY_TEMPLATES.Pathology?.length || 0}`);
if (PATHOLOGY_TEMPLATES.Pathology.length !== 3) throw new Error(`Expected 3 Pathology templates, got ${PATHOLOGY_TEMPLATES.Pathology.length}`);

console.log('--- Checking for hardcoded personal names ---');
const forbiddenNames = ['Dori', 'Gelebo', 'Dr. Dori', 'Dr. Gelebo'];
for (const [mod, list] of Object.entries(RADIOLOGY_TEMPLATES)) {
  list.forEach(t => {
    const text = JSON.stringify(t);
    forbiddenNames.forEach(fn => {
      if (text.includes(fn)) {
        throw new Error(`Found forbidden name ${fn} in ${mod} template ${t.name}`);
      }
    });
  });
}
PATHOLOGY_TEMPLATES.Pathology.forEach(t => {
  const text = JSON.stringify(t);
  forbiddenNames.forEach(fn => {
    if (text.includes(fn)) {
      throw new Error(`Found forbidden name ${fn} in Pathology template ${t.name}`);
    }
  });
});
console.log('✓ Zero hardcoded personal names found across all 52 templates!');

console.log('--- Verifying Mongoose Schemas ---');
const radReportTypeEnum = RadiologyCase.schema.path('reportType').enumValues;
console.log('RadiologyCase reportType enums:', radReportTypeEnum);
if (!radReportTypeEnum.includes('Option C')) throw new Error('RadiologyCase missing Option C');

const pathReportTypeEnum = PathologyCase.schema.path('reportType').enumValues;
console.log('PathologyCase reportType enums:', pathReportTypeEnum);
if (!pathReportTypeEnum.includes('Option C')) throw new Error('PathologyCase missing Option C');

if (!RadiologyCase.schema.path('templateReport.findings')) throw new Error('RadiologyCase missing templateReport.findings');
if (!PathologyCase.schema.path('templateReport.findings')) throw new Error('PathologyCase missing templateReport.findings');

console.log('✓ All Mongoose schemas and templates successfully verified!');
