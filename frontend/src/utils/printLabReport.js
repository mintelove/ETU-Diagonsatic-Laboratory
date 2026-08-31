import { api } from '../api/client.js';
import { getToken, getUser } from './storage.js';
import { calculateFlag } from './flagHelper.jsx';
import { MAIN_CATEGORY_ORDER, normalizeCategoryName } from './categoryHelper.js';
import labLogo from '../assets/etu.jpg';

const safe = value => String(value ?? '—').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const stamp = value => value ? new Date(value).toLocaleString() : '—';

function getPrintableFlag(row, sex = '') {
  let f = String(row.flag || '').trim().toUpperCase();
  if (!f && row.result && row.referenceValue) {
    f = calculateFlag(row.result, row.referenceValue, sex);
  }
  if (['CH', 'CRITICAL HIGH', 'CRITICAL_HIGH'].includes(f)) return 'CH';
  if (['CL', 'CRITICAL LOW', 'CRITICAL_LOW'].includes(f)) return 'CL';
  if (f === 'H' || f === 'HIGH') return 'H';
  if (f === 'L' || f === 'LOW') return 'L';
  if (f === 'N' || f === 'NORMAL') return 'Normal';
  return '—';
}

export function formatMedDate(val) {
  if (!val) return '—';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const [y, m, d] = trimmed.slice(0, 10).split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[parseInt(m, 10) - 1] || m;
      return `${d.padStart(2, '0')} ${monthName} ${y}`;
    }
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const day = String(d.getUTCDate ? d.getUTCDate() : d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const year = d.getUTCFullYear ? d.getUTCFullYear() : d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function reportHtml(report, user, logoBase64, referralHospitalAddress, showFooterOverride) {
  const patient = (report?.patient && typeof report.patient === 'object') ? report.patient : (report || {});
  const isPathology = report?.testType || report?.docType === 'PathologyCase' || Boolean(report?.structuredReport?.grossDescription || report?.structuredReport?.cytologicalFindings || report?.structuredReport?.rbcMorphology);
  const isRadiology = report?.examinationType || report?.docType === 'RadiologyCase' || Boolean(report?.structuredReport?.liver || report?.structuredReport?.findings);
  const isInternalMedicine = report?.isInternalMedicineForm ||
    Boolean(report?.internalMedicineReport?.examinationResult || report?.internalMedicineReport?.labInvestigations) ||
    patient?.examinationFormType === 'Internal Medicine Speciality Examination Form' ||
    (Array.isArray(report?.laboratoryTests) && report.laboratoryTests.some(t => /internal medicine/i.test(t?.name || t))) ||
    (Array.isArray(patient?.laboratoryTests) && patient.laboratoryTests.some(t => /internal medicine/i.test(t?.name || t)));

  const showFooter = showFooterOverride !== undefined ? showFooterOverride : (report.showFooter !== undefined ? report.showFooter : true);

  const logoImg = logoBase64 || labLogo;
  const logoHeader = (showFooter && logoImg)
    ? `<img src="${logoImg}" alt="ETU Diagnostic Laboratory Logo" style="max-height: 80px; width: auto; max-width: 100%; display: block; margin: 0 auto 6px; object-fit: contain;" />`
    : '';

  const refHtml = patient.referralHospital ? `<div><b>Referral Hospital Name</b>${safe(patient.referralHospital)}</div><div><b>Referral Hospital Address</b>${safe(referralHospitalAddress || patient.address || 'Not recorded')}</div>` : '';
  const bpHtml = (patient.systolicBP || patient.diastolicBP) ? `<div><b>Blood Pressure</b>${safe(patient.systolicBP || '—')}/${safe(patient.diastolicBP || '—')} mmHg</div>` : '';
  const sampleTypesStr = (patient.sampleTypes || []).map(x => x?.name || x).filter(Boolean).join(', ') || (isPathology ? 'Pathology Specimen' : isRadiology ? 'Imaging Scan' : 'Specimen Assigned');
  const collectionDateStr = stamp(patient.collectionDate || patient.registrationDate || patient.createdDate || report.createdDate);
  const reportDateStr = stamp(report.approvedAt || report.approvedDate || report.approvalDate || report.updatedDate || new Date());

  let mainBodyHtml = '';
  let subTitle = isInternalMedicine ? 'Internal Medicine Speciality Examination Form' : 'Official Laboratory Test Report';
  let preparedByName = safe(report.technician?.fullName || report.submittedBy?.fullName || user?.fullName || 'Clinical Specialist');
  const rawApprover = report.approvedBy?.fullName || report.pathologist?.fullName || report.radiologist?.fullName || report.internalMedicineReport?.declaration?.doctorName || (['Approved', 'Ready for Printing'].includes(report.status) ? user?.fullName : '');
  let approvedByName = safe(rawApprover ? (rawApprover.startsWith('Dr.') ? rawApprover : `Dr. ${rawApprover}`) : 'Pending Specialist Approval');
  let approverRoleTitle = report.approverRole || (isPathology ? 'Pathologist' : isRadiology ? 'Radiologist' : isInternalMedicine ? 'Authorized Medical Doctor' : 'Approver / Laboratory Technologist');

  // ── 0. INTERNAL MEDICINE REPORT RENDERING ─────────────────────────────────
  if (isInternalMedicine) {
    const med = report.internalMedicineReport || {};
    const lab = med.labInvestigations || {};
    const clin = med.clinicalExamination || {};
    const vit = med.vitalSigns || {};
    const decl = med.declaration || {};

    mainBodyHtml = `
      <div style="margin-top: 4px;">
        <!-- 2-Column Tables: Clinical Examination (44%) & Laboratory Investigations (56%) -->
        <div class="imed-a4-two-tables" style="display: grid; grid-template-columns: minmax(0, 44%) minmax(0, 56%); gap: 8px; margin-bottom: 6px; width: 100%; max-width: 100%; box-sizing: border-box;">
          <!-- Clinical Examination Table -->
          <div style="min-width: 0; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden;">
            <table class="imed-a4-table-bordered" style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: 1.5px solid #000; font-size: 10.5px; box-sizing: border-box;">
              <thead>
                <tr>
                  <th colspan="2" class="imed-a4-table-header" style="background: #e2e8f0; font-weight: 800; font-size: 10.5px; text-transform: uppercase; text-align: center; padding: 3px 4px; border: 1px solid #000;">Clinical Examination</th>
                </tr>
                <tr>
                  <th style="width: 55%; background: #f0f4f8; font-weight: 800; padding: 3px 5px; border: 1px solid #000; text-align: left; font-size: 10.5px;">Examination</th>
                  <th style="width: 45%; background: #f0f4f8; font-weight: 800; padding: 3px 5px; border: 1px solid #000; text-align: left; font-size: 10.5px;">Result</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">General Appearance</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(clin.generalAppearance || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Respiratory System</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(clin.respiratorySystem || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Cardio-vascular System</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(clin.cardiovascularSystem || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Skin</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(clin.skin || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">CNS</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(clin.cns || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Psychiatry</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(clin.psychiatry || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Extremities</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(clin.extremities || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Hernia</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(clin.hernia || 'Nil')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Varicose Veins</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(clin.varicoseVeins || 'Nil')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Chest X-Ray</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(clin.chestXRay || 'Normal')}</strong></td></tr>
              </tbody>
            </table>
          </div>

          <!-- Laboratory Investigations Table -->
          <div style="min-width: 0; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden;">
            <table class="imed-a4-table-bordered" style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: 1.5px solid #000; font-size: 10.5px; box-sizing: border-box;">
              <thead>
                <tr>
                  <th colspan="2" class="imed-a4-table-header" style="background: #e2e8f0; font-weight: 800; font-size: 10.5px; text-transform: uppercase; text-align: center; padding: 3px 4px; border: 1px solid #000;">Laboratory Investigations</th>
                </tr>
                <tr>
                  <th style="width: 55%; background: #f0f4f8; font-weight: 800; padding: 3px 5px; border: 1px solid #000; text-align: left; font-size: 10.5px;">Investigation</th>
                  <th style="width: 45%; background: #f0f4f8; font-weight: 800; padding: 3px 5px; border: 1px solid #000; text-align: left; font-size: 10.5px;">Result</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">CBC</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.cbc || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">FBS</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.fbs || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Blood Group</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.bloodGroup || 'O+')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Stool</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.stool || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Urine</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.urine || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Pregnancy Test</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.pregnancyTest || ((patient.sex === 'Male' || report.sex === 'Male') ? 'N/A' : 'Negative'))}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">HBsAg</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.hbsag || 'Negative')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">HCV</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.hcv || 'Negative')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">HIV 1 & 2</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.hiv12 || 'Negative')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">VDRL</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.vdrl || 'Negative')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">LPT</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.lpt || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">LFT</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.lft || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">RFT</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.rft || 'Normal')}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Malaria</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${safe(lab.malaria || 'Negative')}</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Vital Signs Bordered Box -->
        <div class="imed-a4-vitals-box" style="border: 1.5px solid #000; margin-bottom: 6px; width: 100%; max-width: 100%; box-sizing: border-box;">
          <div class="imed-a4-vitals-header" style="background: #e2e8f0; font-weight: 800; font-size: 10.5px; text-transform: uppercase; padding: 3px 8px; border-bottom: 1px solid #000;">Vital Signs</div>
          <table class="imed-a4-vitals-table" style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; box-sizing: border-box;">
            <tbody>
              <tr>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Blood Pressure:</b></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${safe(vit.systolicBP || patient.systolicBP || '120')} / ${safe(vit.diastolicBP || patient.diastolicBP || '80')} mmHg</strong></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Pulse:</b></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${safe(vit.pulse || '72 bpm')}</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>ECG:</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${safe(vit.ecg || 'Normal')}</strong></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Ear (RT / LT):</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${safe(vit.earRt || 'Normal')} / ${safe(vit.earLt || 'Normal')}</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Height & Weight:</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${safe(vit.height || '170 cm')} / ${safe(vit.weight || '65 kg')}</strong></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Vision (RT / LT):</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${safe(vit.visionRt || '6/6')} / ${safe(vit.visionLt || '6/6')}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Result Bordered Box -->
        <div class="imed-a4-result-box" style="border: 1.5px solid #000; margin-bottom: 6px; width: 100%; max-width: 100%; box-sizing: border-box;">
          <div class="imed-a4-result-header" style="background: #e2e8f0; font-weight: 800; font-size: 10.5px; text-transform: uppercase; padding: 3px 8px; border-bottom: 1px solid #000;">RESULT</div>
          <div class="imed-a4-result-body" style="padding: 5px 8px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
            <div>
              <span style="font-size: 10.5px; color: #0369a1; font-weight: 700; text-transform: uppercase;">FINAL MEDICAL ASSESSMENT: </span>
              <span class="imed-a4-result-value" style="font-size: 12.5px; font-weight: 800; text-transform: uppercase; color: ${(med.examinationResult || '').includes('UNFIT') ? '#991b1b' : '#166534'};">
                ${safe(med.examinationResult || 'FIT FOR EMPLOYMENT')}
              </span>
            </div>
            ${report.comments ? `
              <div style="font-size: 10.5px; color: #475569;">
                <b>Remarks:</b> ${safe(report.comments)}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Declaration Bordered Box -->
        <div class="imed-a4-decl-box" style="border: 1.5px solid #000; margin-bottom: 6px; width: 100%; max-width: 100%; box-sizing: border-box;">
          <div class="imed-a4-decl-header" style="background: #e2e8f0; font-weight: 800; font-size: 10.5px; text-transform: uppercase; padding: 3px 8px; border-bottom: 1px solid #000;">Declaration</div>
          <div class="imed-a4-decl-body" style="padding: 5px 8px; font-size: 10.5px; box-sizing: border-box;">
            <p class="imed-a4-decl-text" style="margin: 0 0 4px 0; font-style: italic; line-height: 1.35;">
              "${safe(decl.declarationText || 'I hereby declare that all information provided above is true.')}"
            </p>
            <div class="imed-a4-decl-grid" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; padding-top: 3px; border-top: 1px dashed #718096;">
              <div><b>Doctor Name:</b> <strong>${safe(decl.doctorName || approvedByName || preparedByName)}</strong></div>
              <div><b>Signature:</b> <span style="color: #075c91; font-weight: 700;">✍️ Verified Practitioner</span></div>
              <div><b>Date:</b> <span>${safe(formatMedDate(decl.signatureDate || new Date()))}</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── 1. PATHOLOGY REPORT RENDERING ─────────────────────────────────────────
  else if (isPathology) {
    subTitle = `Pathology Examination Report — ${safe(report.testType || 'Biopsy')}`;
    approverRoleTitle = 'Pathologist';
    if (report.reportType === 'Option A' || (!report.reportType && report.reportContent)) {
      mainBodyHtml = `
        <section class="section">
          <h2>Pathology Examination Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${report.reportContent || '<p>No content recorded.</p>'}
          </div>
        </section>
      `;
    } else {
      const s = report.structuredReport || {};
      mainBodyHtml = `
        <section class="section">
          <h2>Structured Pathology Findings</h2>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${s.clinicalHistory ? `<div><b style="color: #075c91;">Clinical History:</b><div style="margin-top: 2px;">${safe(s.clinicalHistory)}</div></div>` : ''}
            ${s.specimen ? `<div><b style="color: #075c91;">Specimen / Site:</b><div style="margin-top: 2px;">${safe(s.specimen)}</div></div>` : ''}
            ${s.grossDescription ? `<div><b style="color: #075c91;">Gross Description:</b><div style="margin-top: 2px;">${safe(s.grossDescription)}</div></div>` : ''}
            ${s.microscopicDescription ? `<div><b style="color: #075c91;">Microscopic Findings:</b><div style="margin-top: 2px;">${safe(s.microscopicDescription)}</div></div>` : ''}
            ${s.cytologicalFindings ? `<div><b style="color: #075c91;">Cytological Findings:</b><div style="margin-top: 2px;">${safe(s.cytologicalFindings)}</div></div>` : ''}
            ${(s.rbcMorphology || s.wbcMorphology || s.plateletMorphology) ? `
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div><b style="color: #075c91; font-size: 11.5px;">RBC Morphology:</b><div style="font-size: 12.5px;">${safe(s.rbcMorphology)}</div></div>
                <div><b style="color: #075c91; font-size: 11.5px;">WBC Morphology:</b><div style="font-size: 12.5px;">${safe(s.wbcMorphology)}</div></div>
                <div><b style="color: #075c91; font-size: 11.5px;">Platelet Morphology:</b><div style="font-size: 12.5px;">${safe(s.plateletMorphology)}</div></div>
              </div>
            ` : ''}
            ${s.diagnosis ? `<div style="background: #f0f7fa; padding: 10px 14px; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 13px; text-transform: uppercase;">Pathological Diagnosis:</b><div style="margin-top: 4px; font-weight: bold; font-size: 13.5px; color: #0f172a;">${safe(s.diagnosis)}</div></div>` : ''}
            ${s.comments ? `<div><b style="color: #075c91;">Comments:</b><div style="margin-top: 2px;">${safe(s.comments)}</div></div>` : ''}
            ${s.recommendation ? `<div><b style="color: #075c91;">Recommendations:</b><div style="margin-top: 2px;">${safe(s.recommendation)}</div></div>` : ''}
          </div>
        </section>
      `;
    }
  }

  // ── 2. RADIOLOGY REPORT RENDERING ─────────────────────────────────────────
  else if (isRadiology) {
    const examLabel = safe(report.customExaminationName || (report.ultrasoundSubtype ? `Ultrasound — ${report.ultrasoundSubtype}` : report.examinationType || 'Diagnostic Imaging'));
    subTitle = `Radiology & Imaging Report — ${examLabel}`;
    approverRoleTitle = 'Radiologist';
    if (report.reportType === 'Option A' || (!report.reportType && report.reportContent)) {
      mainBodyHtml = `
        <section class="section">
          <h2>Radiology & Medical Imaging Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${report.reportContent || '<p>No content recorded.</p>'}
          </div>
        </section>
      `;
    } else {
      const s = report.structuredReport || {};
      mainBodyHtml = `
        <section class="section">
          <h2>Structured Imaging Findings</h2>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${s.clinicalInformation ? `<div><b style="color: #075c91;">Clinical Information / Indications:</b><div style="margin-top: 2px;">${safe(s.clinicalInformation)}</div></div>` : ''}
            ${s.technique ? `<div><b style="color: #075c91;">Technique / Protocol:</b><div style="margin-top: 2px;">${safe(s.technique)}</div></div>` : ''}
            ${(s.liver || s.gallbladder || s.pancreas || s.spleen || s.kidneys || s.urinaryBladder) ? `
              <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <b style="color: #075c91; font-size: 12px; text-transform: uppercase;">Sonographic Organ Findings:</b>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; margin-top: 6px; font-size: 12.5px;">
                  ${s.liver ? `<div><b>Liver:</b> ${safe(s.liver)}</div>` : ''}
                  ${s.gallbladder ? `<div><b>Gallbladder & Biliary:</b> ${safe(s.gallbladder)}</div>` : ''}
                  ${s.pancreas ? `<div><b>Pancreas:</b> ${safe(s.pancreas)}</div>` : ''}
                  ${s.spleen ? `<div><b>Spleen:</b> ${safe(s.spleen)}</div>` : ''}
                  ${s.kidneys ? `<div><b>Kidneys:</b> ${safe(s.kidneys)}</div>` : ''}
                  ${s.urinaryBladder ? `<div><b>Urinary Bladder:</b> ${safe(s.urinaryBladder)}</div>` : ''}
                </div>
              </div>
            ` : ''}
            ${s.findings ? `<div><b style="color: #075c91;">General Findings:</b><div style="margin-top: 2px;">${safe(s.findings)}</div></div>` : ''}
            ${s.impression ? `<div style="background: #f0f7fa; padding: 10px 14px; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 13px; text-transform: uppercase;">Radiological Impression / Conclusion:</b><div style="margin-top: 4px; font-weight: bold; font-size: 13.5px; color: #0f172a;">${safe(s.impression)}</div></div>` : ''}
            ${s.recommendation ? `<div><b style="color: #075c91;">Recommendations:</b><div style="margin-top: 2px;">${safe(s.recommendation)}</div></div>` : ''}
          </div>
        </section>
      `;
    }
  }

  // ── 3. STANDARD LABORATORY REPORT RENDERING ───────────────────────────────
  else {
    const rawResults = report.results || [];
    const paramCatMap = {};
    const paramSubcatMap = {};
    const rawTests = Array.isArray(report?.laboratoryTests) ? report.laboratoryTests : (Array.isArray(patient?.laboratoryTests) ? patient.laboratoryTests : []);
    rawTests.forEach(t => {
      if (!t || typeof t !== 'object') return;
      const catName = t.category ? (typeof t.category === 'object' ? (t.category.name || '') : String(t.category)) : '';
      const firstParamName = Array.isArray(t.parameters) && t.parameters.length > 0 ? (typeof t.parameters[0] === 'string' ? t.parameters[0] : (t.parameters[0]?.name || t.parameters[0]?.sampleName)) : t.name;
      const normCat = normalizeCategoryName(catName, firstParamName || t.name);
      const subcatName = t.subcategory || '';
      if (Array.isArray(t.parameters)) {
        t.parameters.forEach(pm => {
          const pName = typeof pm === 'string' ? pm : (pm?.name || pm?.sampleName || '');
          if (pName) {
            paramCatMap[pName] = normCat;
            if (subcatName) paramSubcatMap[pName] = subcatName.toUpperCase();
          }
        });
      }
      if (t.name) {
        paramCatMap[t.name] = normCat;
        if (subcatName) paramSubcatMap[t.name] = subcatName.toUpperCase();
      }
    });

    const categoryMap = new Map();
    rawResults.forEach(row => {
      const catName = normalizeCategoryName(row.category || paramCatMap[row.sampleName], row.sampleName);
      const subcatName = (row.subcategory || paramSubcatMap[row.sampleName] || '').toUpperCase();
      if (!categoryMap.has(catName)) categoryMap.set(catName, new Map());
      const subMap = categoryMap.get(catName);
      const subKey = subcatName || 'GENERAL';
      if (!subMap.has(subKey)) subMap.set(subKey, []);
      subMap.get(subKey).push(row);
    });

    const sortedCategories = Array.from(categoryMap.entries()).sort(([catA], [catB]) => {
      const idxA = MAIN_CATEGORY_ORDER.indexOf(catA);
      const idxB = MAIN_CATEGORY_ORDER.indexOf(catB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return catA.localeCompare(catB);
    });

    const testInterpretations = Array.isArray(report.testInterpretations) ? report.testInterpretations : [];
    const findTestInterps = (catName) => {
      const norm = normalizeCategoryName(catName);
      const match = testInterpretations.find(t => normalizeCategoryName(t.testName) === norm);
      return match?.interpretations || [];
    };

    let resultsHtml = '';
    if (sortedCategories.length > 0) {
      sortedCategories.forEach(([catName, subMap]) => {
        resultsHtml += `<div class="result-cat-block" style="margin-bottom: 22px;"><h4 class="result-cat-header">${safe(catName)}</h4>`;
        subMap.forEach((rows, subKey) => {
          if (subKey !== 'GENERAL') {
            resultsHtml += `<h5 style="margin: 6px 0 4px 0; font-size: 11px; text-transform: uppercase; color: #075c91; background: #e8f5fa; padding: 3px 8px; border-radius: 4px; display: inline-block;">${safe(subKey)}</h5>`;
          }
          const rowsHtml = rows.map(row => {
            const flagVal = getPrintableFlag(row, patient.sex);
            return `<tr><td><b>${safe(row.sampleName)}</b>${row.remarks ? `<small>${safe(row.remarks)}</small>` : ''}</td><td>${safe(row.result)}</td><td>${safe(row.unit)}</td><td>${safe(row.referenceValue)}</td><td><b>${safe(flagVal)}</b></td></tr>`;
          }).join('');
          resultsHtml += `<table style="margin-bottom: 6px;"><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
        });

        const testInterps = findTestInterps(catName);
        if (testInterps.length > 0) {
          resultsHtml += `<div style="margin: 6px 0 14px 0; padding: 8px 12px; background: #f0f7fa; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 11px; text-transform: uppercase;">Clinical Interpretation:</b>`;
          testInterps.forEach(item => {
            resultsHtml += `<div style="margin-top: 4px; font-size: 11px; color: #203640;"><b>${safe(item.title)}:</b> ${safe(item.interpretation)}</div>`;
          });
          resultsHtml += `</div>`;
        }
        resultsHtml += `</div>`;
      });
    } else {
      resultsHtml = '<table><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody><tr><td colspan="5">No laboratory results recorded.</td></tr></tbody></table>';
    }

    mainBodyHtml = `
      <section class="section">
        <h2>Laboratory Results</h2>
        ${resultsHtml}
        ${report.comments ? `<p style="margin-top: 10px;"><b>General remarks:</b> ${safe(report.comments)}</p>` : ''}
      </section>
    `;
  }

  const footerSection = showFooter ? `
    <footer class="footer" style="margin-top: 22px; padding-top: 10px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; color: #64748b; font-size: 11px;">
      <span>Prepared & Verified Diagnostically</span>
      <span style="font-weight: 800; color: #075c91; letter-spacing: 0.4px;">ETU DIAGNOSTIC LABORATORY</span>
    </footer>
  ` : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>ETU Diagnostic Laboratory Report</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #e2e8f0; color: #0f172a; font: 13px Arial, Helvetica, sans-serif; line-height: 1.5; }
    .toolbar { padding: 10px; text-align: center; background: #075c91; position: sticky; top: 0; z-index: 100; }
    .toolbar button { padding: 7px 16px; border: 0; border-radius: 5px; margin: 0 4px; font-weight: bold; cursor: pointer; font-size: 13px; }
    .toolbar .primary { background: #0b95b7; color: white; }
    .page { width: 210mm; min-height: 297mm; margin: 12px auto; padding: 12mm 14mm; background: white; box-shadow: 0 4px 25px rgba(0,0,0,0.15); border-radius: 2px; }
    .header { display: flex; flex-direction: column; align-items: center; text-align: center; border-bottom: 2.5px solid #087ca8; padding-bottom: 8px; margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid; }
    .header h1 { margin: 2px 0 0; color: #075c91; font-size: 20px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 800; line-height: 1.2; }
    .header p.sub { margin: 3px 0 0; font-size: 12px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.8px; }
    .section { margin-top: 10px; page-break-inside: auto; break-inside: auto; }
    .section h2 { margin: 0 0 6px; padding: 5px 8px; background: #e8f5fa; color: #075c91; border-left: 4px solid #0b95b7; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800; page-break-after: avoid; break-after: avoid; }
    .patient { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px 16px; font-size: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; page-break-inside: avoid; break-inside: avoid; }
    .patient div { display: flex; gap: 8px; }
    .patient b { min-width: 120px; color: #475569; }
    .result-cat-block { margin-bottom: 14px; page-break-inside: auto; break-inside: auto; }
    .result-cat-header { margin: 0 0 6px 0; padding: 5px 10px; background: #075c91; color: #ffffff; border-radius: 4px; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.4px; page-break-after: avoid; break-after: avoid; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; page-break-inside: auto; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th { background: #075c91; color: white; text-align: left; padding: 6px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    td small { display: block; color: #64748b; margin-top: 2px; font-size: 10.5px; }
    .rich-report-body { padding: 10px 12px; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; line-height: 1.55; color: #0f172a; word-break: break-word; page-break-inside: auto; break-inside: auto; }
    .rich-report-body img { max-width: 100%; height: auto; display: block; margin: 8px auto; border-radius: 4px; page-break-inside: avoid; break-inside: avoid; }
    .rich-report-body table { width: 100%; border-collapse: collapse; margin: 8px 0; page-break-inside: auto; break-inside: auto; }
    .rich-report-body table tr { page-break-inside: avoid; break-inside: avoid; }
    .rich-report-body table th, .rich-report-body table td { border: 1px solid #cbd5e1; padding: 5px 8px; }
    .signoff-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 14px; font-size: 11.5px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; page-break-inside: avoid; break-inside: avoid; }
    .signoff-grid div { display: flex; flex-direction: column; gap: 2px; }
    .signoff-grid b { color: #475569; }
    .signoff-grid strong { color: #0f172a; }
    .footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; color: #64748b; font-size: 11px; page-break-inside: avoid; break-inside: avoid; }
    @media print {
      body { background: #fff !important; color: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .toolbar { display: none !important; }
      .page { margin: 0 !important; width: 100% !important; max-width: 100% !important; min-height: auto !important; height: auto !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
      .header, .patient, .signoff-grid, .footer, tr, img { page-break-inside: avoid !important; break-inside: avoid !important; }
      .section, .rich-report-body, table { page-break-inside: auto !important; break-inside: auto !important; }
    }
  </style>
</head>
<body>
  <nav class="toolbar">
    <button onclick="window.close()">Close</button>
    <button class="primary" onclick="window.print()">Print / Export PDF</button>
  </nav>
  <main class="page">
    ${showFooter ? `
      <header class="header">
        ${logoHeader}
        <div>
          <h1>ETU Diagnostic Laboratory</h1>
          <p class="sub">${subTitle}</p>
        </div>
      </header>
    ` : `
      <div style="border-bottom: 2px solid #075c91; padding-bottom: 6px; margin-bottom: 14px;">
        <h2 style="margin: 0; color: #075c91; font-size: 18px; text-transform: uppercase;">${subTitle}</h2>
      </div>
    `}

    <section class="section" style="margin-top: ${isInternalMedicine ? '6px' : '8px'};">
      <h2>Patient Information</h2>
      ${isInternalMedicine ? `
        <div style="display: flex; gap: 8px; align-items: stretch; margin-bottom: 6px; width: 100%; max-width: 100%; box-sizing: border-box;">
          <div style="width: 80px; min-width: 80px; max-width: 80px; height: 105px; border: 1.5px solid #000; display: flex; align-items: center; justify-content: center; background: #fafafa; flex-shrink: 0; overflow: hidden; box-sizing: border-box;">
            ${(patient.patientPhoto || report.patientPhoto) ? `
              <img src="${patient.patientPhoto || report.patientPhoto}" alt="Patient Photo" style="width: 100%; height: 100%; object-fit: cover;" />
            ` : `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; color: #64748b; font-size: 9px; text-align: center; font-weight: 700; padding: 2px; background: #f8fafc;">
                <span>PHOTO</span>
                <span style="font-size: 8px; opacity: 0.8;">3 × 4</span>
              </div>
            `}
          </div>
          <table class="imed-a4-table-bordered" style="flex: 1; min-width: 0; width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: 1.5px solid #000; font-size: 10.5px; box-sizing: border-box;">
            <tbody>
              <tr>
                <td style="width: 20%; background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Name:</td>
                <td style="width: 30%; border: 1px solid #000; padding: 3px 5px;"><strong style="text-transform: uppercase;">${safe(patient.name || patient.patientName || report.name || report.patientName || '—')}</strong></td>
                <td style="width: 20%; background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Nationality:</td>
                <td style="width: 30%; border: 1px solid #000; padding: 3px 5px;"><strong style="text-transform: uppercase;">${safe(patient.nationality || report.nationality || 'ETHIOPIA')}</strong></td>
              </tr>
              <tr>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Date of Birth:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;">${safe(formatMedDate(patient.dateOfBirth || patient.dob || patient.birthDate || report.dateOfBirth || report.dob || report.birthDate))}</td>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Age:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;"><strong>${safe((patient.age !== undefined && patient.age !== null && patient.age !== '') ? `${patient.age} YRS` : ((report.age !== undefined && report.age !== null && report.age !== '') ? `${report.age} YRS` : '—'))}</strong></td>
              </tr>
              <tr>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Passport No.:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;"><code>${safe(patient.passportNumber || patient.passportNo || patient.passport_no || report.passportNumber || report.passportNo || report.passport_no || '—')}</code></td>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Passport Issue Date:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;">${safe(formatMedDate(patient.passportIssueDate || patient.passportIssue || patient.passport_issue_date || report.passportIssueDate || report.passportIssue || report.passport_issue_date))}</td>
              </tr>
              <tr>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Sex:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;"><strong>${safe(patient.sex || report.sex || '—')}</strong></td>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Marital Status:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;">${safe(patient.maritalStatus || report.maritalStatus || 'Single')}</td>
              </tr>
              <tr>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Job Title:</td>
                <td colspan="3" style="border: 1px solid #000; padding: 3px 5px;">${safe(patient.jobTitle || patient.job || patient.occupation || report.jobTitle || report.job || report.occupation || '—')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ` : `
        <div class="patient">
          <div><b>Patient Name</b>${safe(patient.name)}</div>
          <div><b>Patient ID</b>${safe(patient.patientId)}</div>
          <div><b>Age / Sex</b>${safe(patient.age)} / ${safe(patient.sex)}</div>
          <div><b>Phone</b>${safe(patient.phone)}</div>
          <div><b>Examination Type</b>${safe(report.testType || report.customExaminationName || report.ultrasoundSubtype || report.examinationType || sampleTypesStr)}</div>
          <div><b>Registration Date</b>${safe(collectionDateStr)}</div>
          <div><b>Report Date</b>${safe(reportDateStr)}</div>
          <div><b>Branch</b>📍 ${safe(report.branchName || patient.branchName || 'Main')}</div>
          ${bpHtml}
          ${refHtml}
        </div>
      `}
    </section>

    ${mainBodyHtml}

    ${!isInternalMedicine ? `
      <section class="section">
        <h2>Authorization & Sign-off</h2>
        <div class="signoff-grid">
          <div><b>Authorized Specialist:</b> <strong>${preparedByName}</strong></div>
          <div><b>Approved By:</b> <strong>Dr. ${approvedByName}</strong> <span style="font-size: 10.5px; color: #64748b;">(${safe(approverRoleTitle)})</span></div>
          <div><b>Approval Date:</b> <strong>${safe(reportDateStr)}</strong></div>
        </div>
      </section>
    ` : ''}

    ${footerSection}
  </main>
</body>
</html>`;
}

export async function printLabReport(reportOrId, token, user, showFooterOverride) {
  if (typeof token !== 'string') { user = token || user || getUser(); token = getToken(); }
  user ||= getUser(); const id = typeof reportOrId === 'string' ? reportOrId : reportOrId?._id;
  if (!id) throw new Error('The requested document could not be loaded.');
  const popup = window.open('', '_blank', 'width=980,height=900');
  if (!popup) throw new Error('Print preview was blocked. Please allow pop-ups and try again.');
  try {
    let reportData = typeof reportOrId === 'object' ? reportOrId : null;
    let logoBase64 = '';
    let referralHospitalAddress = '';

    if (!reportData || !reportData.patient) {
      try {
        const data = await api(`/final-reports/${id}`, { token });
        reportData = data.report;
        logoBase64 = data.logoBase64;
        referralHospitalAddress = data.referralHospitalAddress;
      } catch (e) {
        // Fallback for Pathology or Radiology cases
        try {
          const pData = await api(`/pathology/cases/${id}`, { token });
          reportData = pData.case;
        } catch {
          const rData = await api(`/radiology/cases/${id}`, { token });
          reportData = rData.case;
        }
      }
    }

    popup.document.write(reportHtml(reportData, user, logoBase64, referralHospitalAddress, showFooterOverride));
    popup.document.close();
  } catch (error) {
    popup.close();
    throw new Error(error.message || 'The requested document could not be loaded.');
  }
}
