import React from 'react';
import { FlagBadge } from '../utils/flagHelper.jsx';

export function getReportTestTypes(report) {
  const patient = report?.patient || {};
  let rawTests = [];

  if (Array.isArray(report?.laboratoryTests) && report.laboratoryTests.length > 0) {
    rawTests = report.laboratoryTests;
  } else if (Array.isArray(patient?.laboratoryTests) && patient.laboratoryTests.length > 0) {
    rawTests = patient.laboratoryTests;
  }

  const categoriesMap = new Map();
  const testNamesList = [];

  rawTests.forEach(t => {
    if (!t) return;
    let name = '';
    let category = 'GENERAL LABORATORY';

    if (typeof t === 'string') {
      if (!t.match(/^[a-f0-9]{24}$/i)) name = t;
    } else if (typeof t === 'object') {
      name = t.name || '';
      if (t.category) {
        category = typeof t.category === 'object' ? (t.category.name || 'GENERAL LABORATORY') : String(t.category);
      }
    }

    if (!name) return;

    testNamesList.push(name);
    if (!categoriesMap.has(category)) categoriesMap.set(category, []);
    if (!categoriesMap.get(category).includes(name)) {
      categoriesMap.get(category).push(name);
    }
  });

  return {
    categoriesMap,
    testNames: testNamesList,
    formattedNames: testNamesList.join(', ') || '—'
  };
}

export function ReportPreview({ report }) {
  if (!report) return null;
  const p = report.patient || {};
  const { categoriesMap, testNames, formattedNames } = getReportTestTypes(report);
  const sampleTypesStr = (p.sampleTypes || []).map(x => x?.name || x).filter(Boolean).join(', ') || 'Specimen Assigned';

  return (
    <section className="table-card" style={{ margin: 0 }}>
      <p className="eyebrow">Laboratory Report Review</p>
      <h2 style={{ margin: '2px 0 12px', color: 'var(--color-primary, #075c91)' }}>ETU Diagnostic Laboratory</h2>

      {/* Patient & Report Metadata Grid */}
      <div className="form-grid" style={{ gap: '10px 20px', marginBottom: '14px' }}>
        <p style={{ margin: 0 }}><strong>Patient Name:</strong> {p.name || '—'}</p>
        <p style={{ margin: 0 }}><strong>Patient ID:</strong> {p.patientId || '—'}</p>
        <p style={{ margin: 0 }}><strong>Barcode:</strong> {p.barcode || p.patientId || '—'}</p>
        <p style={{ margin: 0 }}><strong>Age / Sex:</strong> {p.age || '—'} / {p.sex || '—'}</p>
        <p style={{ margin: 0 }}><strong>Sample Type(s):</strong> {sampleTypesStr}</p>
        <p style={{ margin: 0 }}><strong>Collector:</strong> {report.technician?.fullName || report.submittedBy?.fullName || '—'}</p>
        <p style={{ margin: 0 }}><strong>Date / Time:</strong> {new Date(report.submittedDate || report.submittedAt || report.updatedDate || report.createdDate).toLocaleString()}</p>
        <p style={{ margin: 0 }}><strong>Report Status:</strong> <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{report.status === 'Submitted' ? 'Pending Approval' : report.status}</span></p>
        {p.referralHospital && (
          <>
            <p style={{ margin: 0 }}><strong>Referring Hospital:</strong> {p.referralHospital}</p>
            <p style={{ margin: 0 }}><strong>Hospital Address:</strong> {p.address || '—'}</p>
          </>
        )}
      </div>

      {/* Requested Laboratory Test Types Section */}
      <div style={{ background: 'var(--color-surface-container, #f0f7fa)', border: '1px solid var(--color-outline-variant, #cfe1e9)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary, #075c91)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🧪 REQUESTED LABORATORY TEST TYPES ({testNames.length})
        </h4>
        {categoriesMap.size > 0 ? (
          Array.from(categoriesMap.entries()).map(([catName, tests]) => (
            <div key={catName} style={{ marginBottom: '8px' }}>
              <strong style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-on-surface-variant, #516a75)', textTransform: 'uppercase', marginBottom: '2px' }}>
                {catName}
              </strong>
              <ul style={{ margin: '0 0 4px 18px', padding: 0, fontSize: '0.88rem' }}>
                {tests.map(tn => (
                  <li key={tn} style={{ fontWeight: 600, color: 'var(--color-on-surface, #1e293b)' }}>
                    {tn}
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-on-surface, #1e293b)' }}>{formattedNames}</p>
        )}
      </div>

      {/* Equipment Used */}
      <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem' }}>
        <strong>Equipment Used:</strong> {report.equipment?.join(', ') || 'Standard Analyzer'}
      </p>

      {/* Test Parameters & Results Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Result</th>
            <th>SI Unit</th>
            <th>Reference Range</th>
            <th style={{ textAlign: 'center' }}>Flag</th>
          </tr>
        </thead>
        <tbody>
          {report.results && report.results.length > 0 ? (
            report.results.map((row, i) => (
              <tr key={`${row.sampleName}-${i}`}>
                <td>
                  <strong>{row.sampleName}</strong>
                  {row.remarks && <small style={{ display: 'block', color: 'var(--color-on-surface-variant)', fontSize: '0.78rem' }}>{row.remarks}</small>}
                </td>
                <td><strong>{row.result}</strong></td>
                <td>{row.unit || '—'}</td>
                <td>{row.referenceValue || '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  <FlagBadge flag={row.flag} result={row.result} referenceValue={row.referenceValue} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ fontStyle: 'italic', textAlign: 'center' }}>No test results recorded for this report.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Remarks / Comments */}
      {report.comments && (
        <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem' }}>
          <strong>Collector Comments:</strong> {report.comments}
        </p>
      )}
    </section>
  );
}

export default ReportPreview;
