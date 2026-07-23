import { api } from '../api/client.js';
import { getToken, getUser } from './storage.js';

const safe = value => String(value ?? '—').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const stamp = value => value ? new Date(value).toLocaleString() : '—';
const flag = row => ({ H: 'High', L: 'Low', N: 'Normal' }[row.flag] || '—');

function reportHtml(report, user, logoBase64, referralHospitalAddress) {
  const patient = report.patient || {};
  const rows = (report.results || []).map(row => `<tr><td><b>${safe(row.sampleName)}</b>${row.remarks ? `<small>${safe(row.remarks)}</small>` : ''}</td><td>${safe(row.result)}</td><td>${safe(row.unit)}</td><td>${safe(row.referenceValue)}</td><td><span class="flag ${safe(row.flag || '')}">${safe(row.flag || '—')}</span></td></tr>`).join('') || '<tr><td colspan="5">No laboratory results recorded.</td></tr>';

  const testsMap = new Map();
  (patient.laboratoryTests || []).forEach(t => {
    const catName = t?.category?.name || 'GENERAL LABORATORY';
    const testName = t?.name || (typeof t === 'string' && !t.match(/^[a-f0-9]{24}$/i) ? t : '');
    if (!testName) return;
    if (!testsMap.has(catName)) testsMap.set(catName, []);
    testsMap.get(catName).push(testName);
  });

  let labTestsHtml = '';
  if (testsMap.size > 0) {
    testsMap.forEach((testNames, catName) => {
      labTestsHtml += `<div class="cat-block"><strong class="cat-title">${safe(catName.toUpperCase())}</strong><ul class="test-list">${testNames.map(n => `<li>${safe(n)}</li>`).join('')}</ul></div>`;
    });
  } else {
    labTestsHtml = '<p>No laboratory test types recorded.</p>';
  }

  const logoHeader = logoBase64
    ? `<img src="${logoBase64}" alt="ETU Diagnostic Laboratory Logo" style="max-height: 200px; width: auto; max-width: 550px; display: block; margin: 0 auto 18px; object-fit: contain;" />`
    : `<div class="logo">ETU</div>`;

  const refHtml = patient.referralHospital ? `<div><b>Referral Hospital Name</b>${safe(patient.referralHospital)}</div><div><b>Referral Hospital Address</b>${safe(referralHospitalAddress || patient.address || 'Not recorded')}</div>` : '';

  return `<!doctype html><html><head><meta charset="utf-8"><title>ETU Laboratory Report</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#eaf1f5;color:#203640;font:13px Arial,sans-serif}.toolbar{padding:10px;text-align:center;background:#063d5b}.toolbar button{padding:7px 12px;border:0;border-radius:5px;margin:0 3px;font-weight:bold}.toolbar .primary{background:#17a2b8;color:white}.page{width:210mm;min-height:297mm;margin:12px auto;padding:14mm;background:white;box-shadow:0 2px 14px #0003}.header{display:flex;flex-direction:column;align-items:center;text-align:center;border-bottom:3px solid #087ca8;padding-bottom:14px}.logo{display:grid;place-items:center;width:64px;height:64px;border-radius:15px;background:linear-gradient(135deg,#075c91,#10a4c7);color:#fff;font-size:22px;font-weight:800;margin-bottom:8px}.header h1{margin:6px 0 0;color:#075c91;font-size:28px}.section{margin-top:19px}.section h2{margin:0 0 10px;padding:8px 11px;background:#e8f5fa;color:#075c91;border-left:4px solid #0b95b7;font-size:14px;text-transform:uppercase;letter-spacing:.5px}.patient{display:grid;grid-template-columns:repeat(2,1fr);gap:9px 24px;font-size:13px}.patient div{display:flex;gap:8px}.patient b{min-width:95px;color:#516a75}.cat-block{margin-bottom:10px}.cat-title{display:block;color:#075c91;font-size:12px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}.test-list{margin:0 0 8px 0;padding-left:20px;list-style-type:disc;font-size:13px}.test-list li{margin-bottom:3px;font-weight:600}table{width:100%;border-collapse:collapse}th{background:#075c91;color:white;text-align:left;padding:10px;font-size:13px}td{padding:10px;border-bottom:1px solid #d6e2e7;font-size:13px}tbody tr:nth-child(even){background:#f5fafc}td small{display:block;color:#657d87;margin-top:4px;font-size:11px}.flag{display:inline-flex;justify-content:center;align-items:center;min-width:28px;border-radius:99px;padding:4px 10px;font-weight:bold;font-size:13px}.flag.H{background:#ffe3e3;color:#be2525}.flag.L{background:#fff5c8;color:#8c6900}.flag.N{background:#ddf6e7;color:#14733e}.footer{margin-top:25px;padding-top:10px;border-top:1px solid #c9d9df;display:flex;justify-content:space-between;color:#59727c;font-size:11px}.footer b{color:#203640}@media print{body{background:#fff}.toolbar{display:none}.page{margin:0;width:auto;min-height:0;padding:0;box-shadow:none}}</style></head><body><nav class="toolbar"><button onclick="window.close()">Close</button><button class="primary" onclick="window.print()">Print / Export PDF</button></nav><main class="page"><header class="header">${logoHeader}<div><h1>ETU Diagnostic Laboratory</h1></div></header><section class="section"><h2>Patient Information</h2><div class="patient"><div><b>Patient ID</b>${safe(patient.patientId)}</div><div><b>Patient Name</b>${safe(patient.name)}</div><div><b>Age / Sex</b>${safe(patient.age)} / ${safe(patient.sex)}</div><div><b>Phone</b>${safe(patient.phone)}</div>${refHtml}</div></section><section class="section"><h2>REQUESTED LABORATORY TEST TYPES</h2>${labTestsHtml}</section><section class="section"><h2>Laboratory Results</h2><p><b>Equipment Used:</b> ${safe((report.equipment || []).join(', '))}</p><table><thead><tr><th>Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody>${rows}</tbody></table><p><b>General remarks:</b> ${safe(report.comments)}</p></section><section class="section"><h2>Authorization</h2><div class="patient"><div><b>Collected By</b>${safe(report.technician?.fullName || report.submittedBy?.fullName)}</div><div><b>Approved By</b>${safe(report.approvedBy?.fullName || 'Pending approval')}</div><div><b>Report Status</b>${safe(report.status)}</div><div><b>Approval Date</b>${safe(stamp(report.approvedDate || report.approvalDate))}</div></div></section><footer class="footer"><span>Printed by<br><b>${safe(user?.fullName)}</b></span><span>Printed<br><b>${safe(stamp(new Date()))}</b></span><span>ETU Diagnostic Laboratory</span></footer></main></body></html>`;
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
