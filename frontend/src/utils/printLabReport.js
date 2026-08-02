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
  if (f === 'H' || f === 'HIGH') return 'H';
  if (f === 'L' || f === 'LOW') return 'L';
  if (f === 'N' || f === 'NORMAL') return 'N';
  return '—';
}

function reportHtml(report, user, logoBase64, referralHospitalAddress) {
  const patient = report.patient || {};
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
    const match = testInterpretations.find(t =>
      normalizeCategoryName(t.testName) === norm
    );
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

  const testsMap = new Map();
  (patient.laboratoryTests || []).forEach(t => {
    const rawCat = t?.category?.name || '';
    const testName = t?.name || (typeof t === 'string' && !t.match(/^[a-f0-9]{24}$/i) ? t : '');
    if (!testName) return;
    const catName = normalizeCategoryName(rawCat, testName);
    if (!testsMap.has(catName)) testsMap.set(catName, []);
    testsMap.get(catName).push(testName);
  });

  const sortedTestMapEntries = Array.from(testsMap.entries()).sort(([catA], [catB]) => {
    const idxA = MAIN_CATEGORY_ORDER.indexOf(catA);
    const idxB = MAIN_CATEGORY_ORDER.indexOf(catB);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return catA.localeCompare(catB);
  });

  let labTestsHtml = '';
  if (sortedTestMapEntries.length > 0) {
    sortedTestMapEntries.forEach(([catName, testNames]) => {
      labTestsHtml += `<div class="cat-block"><strong class="cat-title">${safe(catName)}</strong><ul class="test-list">${testNames.map(n => `<li>${safe(n)}</li>`).join('')}</ul></div>`;
    });
  } else {
    labTestsHtml = '<p>No laboratory test types recorded.</p>';
  }

  const logoHeader = logoBase64
    ? `<img src="${logoBase64}" alt="ETU Diagnostic Laboratory Logo" style="max-height: 95px; width: auto; max-width: 100%; display: block; margin: 0 auto 10px; object-fit: contain;" />`
    : `<div class="logo">ETU</div>`;

  const refHtml = patient.referralHospital ? `<div><b>Referral Hospital Name</b>${safe(patient.referralHospital)}</div><div><b>Referral Hospital Address</b>${safe(referralHospitalAddress || patient.address || 'Not recorded')}</div>` : '';
  const bpHtml = (patient.systolicBP || patient.diastolicBP) ? `<div><b>Blood Pressure</b>${safe(patient.systolicBP || '—')}/${safe(patient.diastolicBP || '—')} mmHg</div>` : '';
  const sampleTypesStr = (patient.sampleTypes || []).map(x => x?.name || x).filter(Boolean).join(', ') || 'Specimen Assigned';
  const collectionDateStr = stamp(patient.collectionDate || patient.createdDate || report.createdDate);
  const reportDateStr = stamp(report.approvedDate || report.approvalDate || report.updatedDate || new Date());

  return `<!doctype html><html><head><meta charset="utf-8"><title>ETU Laboratory Test Report</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#eaf1f5;color:#203640;font:13px Arial,sans-serif}.toolbar{padding:10px;text-align:center;background:#063d5b}.toolbar button{padding:7px 12px;border:0;border-radius:5px;margin:0 3px;font-weight:bold}.toolbar .primary{background:#17a2b8;color:white}.page{width:210mm;min-height:297mm;margin:12px auto;padding:14mm;background:white;box-shadow:0 2px 14px #0003}.header{display:flex;flex-direction:column;align-items:center;text-align:center;border-bottom:3px solid #087ca8;padding-bottom:14px}.logo{display:grid;place-items:center;width:64px;height:64px;border-radius:15px;background:linear-gradient(135deg,#075c91,#10a4c7);color:#fff;font-size:22px;font-weight:800;margin-bottom:8px}.header h1{margin:6px 0 0;color:#075c91;font-size:26px;text-transform:uppercase;letter-spacing:0.5px}.header p.sub{margin:4px 0 0 0;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:1px}.section{margin-top:19px}.section h2{margin:0 0 10px;padding:8px 11px;background:#e8f5fa;color:#075c91;border-left:4px solid #0b95b7;font-size:13px;text-transform:uppercase;letter-spacing:.5px}.patient{display:grid;grid-template-columns:repeat(2,1fr);gap:9px 24px;font-size:13px;background:#f8fafc;padding:12px 16px;border-radius:8px;border:1px solid #cbd5e1}.patient div{display:flex;gap:8px}.patient b{min-width:115px;color:#475569}.cat-block{margin-bottom:10px}.cat-title{display:block;color:#075c91;font-size:12px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}.test-list{margin:0 0 8px 0;padding-left:20px;list-style-type:disc;font-size:13px}.test-list li{margin-bottom:3px;font-weight:600}.result-cat-block{margin-bottom:16px}.result-cat-header{margin:0 0 6px 0;padding:6px 12px;background:#075c91;color:#ffffff;border-radius:5px;font-size:12px;text-transform:uppercase;letter-spacing:.5px}table{width:100%;border-collapse:collapse}th{background:#075c91;color:white;text-align:left;padding:9px;font-size:12.5px;text-transform:uppercase}td{padding:9px;border-bottom:1px solid #d6e2e7;font-size:13px}tbody tr:nth-child(even){background:#f8fafc}td small{display:block;color:#657d87;margin-top:4px;font-size:11px}.footer{margin-top:25px;padding-top:10px;border-top:1px solid #c9d9df;display:flex;justify-content:space-between;color:#59727c;font-size:11px}.footer b{color:#203640}@media print{body{background:#fff}.toolbar{display:none}.page{margin:0;width:auto;min-height:0;padding:0;box-shadow:none}}</style></head><body><nav class="toolbar"><button onclick="window.close()">Close</button><button class="primary" onclick="window.print()">Print / Export PDF</button></nav><main class="page"><header class="header">${logoHeader}<div><h1>ETU Diagnostic Laboratory</h1><p class="sub">Laboratory Test Report</p></div></header><section class="section"><h2>Patient Information</h2><div class="patient"><div><b>Patient Name</b>${safe(patient.name)}</div><div><b>Patient ID</b>${safe(patient.patientId)}</div><div><b>Age / Sex</b>${safe(patient.age)} / ${safe(patient.sex)}</div><div><b>Phone</b>${safe(patient.phone)}</div><div><b>Sample Type</b>${safe(sampleTypesStr)}</div><div><b>Collection Date</b>${safe(collectionDateStr)}</div><div><b>Report Date</b>${safe(reportDateStr)}</div>${bpHtml}${refHtml}</div></section><section class="section"><h2>Laboratory Results</h2>${resultsHtml}${report.comments ? `<p style="margin-top: 10px;"><b>General remarks:</b> ${safe(report.comments)}</p>` : ''}</section><section class="section"><h2>Authorization</h2><div class="patient"><div><b>Prepared By</b>${safe(report.technician?.fullName || report.submittedBy?.fullName || 'Technician')}</div><div><b>Approved By</b>${safe(report.approvedBy?.fullName || 'Pending Approval')}</div><div><b>Approval Date</b>${safe(stamp(report.approvedDate || report.approvalDate))}</div></div></section><footer class="footer"><span>Prepared by<br><b>${safe(report.technician?.fullName || report.submittedBy?.fullName || 'Technician')}</b></span><span>Approved by<br><b>${safe(report.approvedBy?.fullName || 'Pending Approval')}</b></span><span>ETU Diagnostic Laboratory</span></footer></main></body></html>`;
}

export async function printLabReport(reportOrId, token, user) {
  if (typeof token !== 'string') { user = token || user || getUser(); token = getToken(); }
  user ||= getUser(); const id = typeof reportOrId === 'string' ? reportOrId : reportOrId?._id;
  if (!id) throw new Error('The requested document could not be loaded.');
  const popup = window.open('', '_blank', 'width=980,height=900');
  if (!popup) throw new Error('Print preview was blocked. Please allow pop-ups and try again.');
  try {
    const data = await api(`/final-reports/${id}`, { token });
    popup.document.write(reportHtml(data.report, user, data.logoBase64, data.referralHospitalAddress));
    popup.document.close();
  } catch (error) {
    popup.close();
    throw new Error(error.message || 'The requested document could not be loaded.');
  }
}
