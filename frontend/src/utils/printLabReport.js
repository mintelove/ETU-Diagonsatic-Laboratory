import { api } from '../api/client.js';
import { getToken, getUser } from './storage.js';
import { calculateFlag } from './flagHelper.jsx';
import { MAIN_CATEGORY_ORDER, normalizeCategoryName } from './categoryHelper.js';

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

export function reportHtml(report, user, logoBase64, referralHospitalAddress, showFooterOverride) {
  const isPathology = report?.testType || report?.docType === 'PathologyCase' || Boolean(report?.structuredReport?.grossDescription || report?.structuredReport?.cytologicalFindings || report?.structuredReport?.rbcMorphology);
  const isRadiology = report?.examinationType || report?.docType === 'RadiologyCase' || Boolean(report?.structuredReport?.liver || report?.structuredReport?.findings);

  const patient = report.patient || {};
  const showFooter = showFooterOverride !== undefined ? showFooterOverride : (report.showFooter !== undefined ? report.showFooter : true);

  const logoHeader = (showFooter && logoBase64)
    ? `<img src="${logoBase64}" alt="ETU Diagnostic Laboratory Logo" style="max-height: 90px; width: auto; max-width: 100%; display: block; margin: 0 auto 10px; object-fit: contain;" />`
    : (showFooter ? `<div class="logo">ETU</div>` : '');

  const refHtml = patient.referralHospital ? `<div><b>Referral Hospital Name</b>${safe(patient.referralHospital)}</div><div><b>Referral Hospital Address</b>${safe(referralHospitalAddress || patient.address || 'Not recorded')}</div>` : '';
  const bpHtml = (patient.systolicBP || patient.diastolicBP) ? `<div><b>Blood Pressure</b>${safe(patient.systolicBP || '—')}/${safe(patient.diastolicBP || '—')} mmHg</div>` : '';
  const sampleTypesStr = (patient.sampleTypes || []).map(x => x?.name || x).filter(Boolean).join(', ') || (isPathology ? 'Pathology Specimen' : isRadiology ? 'Imaging Scan' : 'Specimen Assigned');
  const collectionDateStr = stamp(patient.collectionDate || patient.registrationDate || patient.createdDate || report.createdDate);
  const reportDateStr = stamp(report.approvedAt || report.approvedDate || report.approvalDate || report.updatedDate || new Date());

  let mainBodyHtml = '';
  let subTitle = 'Official Laboratory Test Report';
  let preparedByName = safe(report.technician?.fullName || report.submittedBy?.fullName || user?.fullName || 'Clinical Specialist');
  let approvedByName = safe(report.approvedBy?.fullName || (report.status === 'Approved' ? user?.fullName : 'Pending Specialist Approval'));
  let approverRoleTitle = report.approverRole || (isPathology ? 'Pathologist' : isRadiology ? 'Radiologist' : 'Approver / Laboratory Technologist');

  // ── 1. PATHOLOGY REPORT RENDERING ─────────────────────────────────────────
  if (isPathology) {
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
    <footer class="footer">
      <span>Prepared / Authorized by<br><b>${preparedByName}</b></span>
      <span>Approved by<br><b>Dr. ${approvedByName}</b> (${safe(approverRoleTitle)})</span>
      <span>ETU Diagnostic Laboratory</span>
    </footer>
  ` : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>ETU Diagnostic Laboratory Report</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eaf1f5; color: #203640; font: 13.5px Arial, sans-serif; }
    .toolbar { padding: 10px; text-align: center; background: #063d5b; }
    .toolbar button { padding: 7px 14px; border: 0; border-radius: 5px; margin: 0 4px; font-weight: bold; cursor: pointer; }
    .toolbar .primary { background: #17a2b8; color: white; }
    .page { width: 210mm; min-height: 297mm; margin: 12px auto; padding: 14mm; background: white; box-shadow: 0 2px 14px rgba(0,0,0,0.15); page-break-after: always; }
    .header { display: flex; flex-direction: column; align-items: center; text-align: center; border-bottom: 3px solid #087ca8; padding-bottom: 12px; }
    .logo { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 15px; background: linear-gradient(135deg, #075c91, #10a4c7); color: #fff; font-size: 22px; font-weight: 800; margin-bottom: 8px; }
    .header h1 { margin: 6px 0 0; color: #075c91; font-size: 24px; text-transform: uppercase; letter-spacing: 0.5px; }
    .header p.sub { margin: 4px 0 0 0; font-size: 13px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; }
    .section { margin-top: 18px; }
    .section h2 { margin: 0 0 10px; padding: 7px 11px; background: #e8f5fa; color: #075c91; border-left: 4px solid #0b95b7; font-size: 12.5px; text-transform: uppercase; letter-spacing: .5px; }
    .patient { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; font-size: 12.5px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #cbd5e1; }
    .patient div { display: flex; gap: 8px; }
    .patient b { min-width: 115px; color: #475569; }
    .result-cat-block { margin-bottom: 16px; }
    .result-cat-header { margin: 0 0 6px 0; padding: 6px 12px; background: #075c91; color: #ffffff; border-radius: 5px; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #075c91; color: white; text-align: left; padding: 8px 10px; font-size: 12px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #d6e2e7; font-size: 12.5px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    td small { display: block; color: #657d87; margin-top: 4px; font-size: 11px; }
    .rich-report-body img { max-width: 100%; height: auto; display: block; margin: 10px auto; border-radius: 6px; }
    .footer { margin-top: 25px; padding-top: 10px; border-top: 1px solid #c9d9df; display: flex; justify-content: space-between; color: #59727c; font-size: 11px; }
    .footer b { color: #203640; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none; }
      .page { margin: 0; width: auto; min-height: 0; padding: 0; box-shadow: none; }
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

    <section class="section" style="margin-top: 14px;">
      <h2>Patient & Case Information</h2>
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
    </section>

    ${mainBodyHtml}

    <section class="section">
      <h2>Authorization & Sign-off</h2>
      <div class="patient">
        <div><b>Authorized Specialist</b>${preparedByName}</div>
        <div><b>Approved By</b>Dr. ${approvedByName} (${safe(approverRoleTitle)})</div>
        <div><b>Approval Date</b>${safe(reportDateStr)}</div>
      </div>
    </section>

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
