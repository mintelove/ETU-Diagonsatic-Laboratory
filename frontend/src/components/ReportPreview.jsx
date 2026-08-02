import React, { useState, useEffect } from 'react';
import { FlagBadge } from '../utils/flagHelper.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { buildPublicReportUrl } from '../utils/publicUrlHelper.js';
import { MAIN_CATEGORY_ORDER, normalizeCategoryName } from '../utils/categoryHelper.js';

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

    const normCat = normalizeCategoryName(category);
    testNamesList.push(name);
    if (!categoriesMap.has(normCat)) categoriesMap.set(normCat, []);
    if (!categoriesMap.get(normCat).includes(name)) {
      categoriesMap.get(normCat).push(name);
    }
  });

  const sortedCategoriesMap = new Map(
    Array.from(categoriesMap.entries()).sort(([catA], [catB]) => {
      const idxA = MAIN_CATEGORY_ORDER.indexOf(catA);
      const idxB = MAIN_CATEGORY_ORDER.indexOf(catB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return catA.localeCompare(catB);
    })
  );

  return {
    categoriesMap: sortedCategoriesMap,
    testNames: testNamesList,
    formattedNames: testNamesList.join(', ') || '—'
  };
}

export function ReportPreview({ report }) {
  if (!report) return null;
  const { token: authToken } = useAuth();
  const p = report.patient || {};
  const { categoriesMap, testNames, formattedNames } = getReportTestTypes(report);
  const sampleTypesStr = (p.sampleTypes || []).map(x => x?.name || x).filter(Boolean).join(', ') || 'Specimen Assigned';
  const isApproved = ['Approved', 'Ready for Printing'].includes(report.status);

  const [fetchedToken, setFetchedToken] = useState(report.publicReport?.token || null);
  const currentToken = report.publicReport?.token || fetchedToken;

  useEffect(() => {
    if (report.publicReport?.token) {
      setFetchedToken(report.publicReport.token);
    } else if (isApproved && report._id) {
      // Auto-fetch/generate token for existing approved report if missing
      api(`/final-reports/${report._id}/public-link`, { token: authToken })
        .then(res => {
          if (res?.token) setFetchedToken(res.token);
        })
        .catch(() => {});
    }
  }, [report._id, report.status, report.publicReport?.token, isApproved, authToken]);

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
        {(p.systolicBP || p.diastolicBP) && (
          <p style={{ margin: 0 }}><strong>Blood Pressure:</strong> {p.systolicBP || '—'}/{p.diastolicBP || '—'} mmHg</p>
        )}
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

      {/* Test Parameters & Results Table — grouped by main category */}
      {(() => {
        const results = report.results || [];
        if (!results.length) {
          return (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
              <thead><tr><th>Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th style={{ textAlign: 'center' }}>Flag</th></tr></thead>
              <tbody><tr><td colSpan="5" style={{ fontStyle: 'italic', textAlign: 'center' }}>No test results recorded for this report.</td></tr></tbody>
            </table>
          );
        }

        // Build parameter → category & subcategory map
        const paramCatMap = {};
        const paramSubcatMap = {};
        const rawTests = Array.isArray(report?.laboratoryTests) ? report.laboratoryTests : (Array.isArray(p?.laboratoryTests) ? p.laboratoryTests : []);
        rawTests.forEach(t => {
          if (!t || typeof t !== 'object') return;
          const catName = t.category ? (typeof t.category === 'object' ? (t.category.name || 'GENERAL LABORATORY') : String(t.category)) : 'GENERAL LABORATORY';
          const normCat = normalizeCategoryName(catName);
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

        // Group results by category, then subcategory
        const groups = new Map();
        results.forEach(row => {
          const catName = normalizeCategoryName(row.category || paramCatMap[row.sampleName]);
          const subcatName = (row.subcategory || paramSubcatMap[row.sampleName] || '').toUpperCase();
          if (!groups.has(catName)) groups.set(catName, new Map());
          const subMap = groups.get(catName);
          const subKey = subcatName || 'GENERAL';
          if (!subMap.has(subKey)) subMap.set(subKey, []);
          subMap.get(subKey).push(row);
        });

        // Sort groups to match MAIN_CATEGORY_ORDER
        const sortedGroups = Array.from(groups.entries()).sort(([catA], [catB]) => {
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

        return sortedGroups.map(([catName, subMap]) => {
          const testInterps = findTestInterps(catName);

          return (
            <div key={catName} style={{ marginBottom: '22px' }}>
              <h4 style={{
                margin: '0 0 10px 0',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--color-primary, #075c91) 0%, #0ea5e9 100%)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {catName}
              </h4>

              {Array.from(subMap.entries()).map(([subKey, rows]) => {
                return (
                  <div key={subKey} style={{ marginBottom: '14px' }}>
                    {subKey !== 'GENERAL' && (
                      <h5 style={{
                        margin: '0 0 6px 0',
                        padding: '4px 10px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        display: 'inline-block'
                      }}>
                        {subKey}
                      </h5>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
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
                        {rows.map((row, i) => (
                          <tr key={`${row.sampleName}-${i}`}>
                            <td>
                              <strong>{row.sampleName}</strong>
                              {row.remarks && <small style={{ display: 'block', color: 'var(--color-on-surface-variant)', fontSize: '0.78rem' }}>{row.remarks}</small>}
                            </td>
                            <td><strong>{row.result}</strong></td>
                            <td>{row.unit || '—'}</td>
                            <td>{row.referenceValue || '—'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <FlagBadge flag={row.flag} result={row.result} referenceValue={row.referenceValue} sex={p.sex} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {/* Render Clinical Interpretation for this Laboratory Test */}
              {testInterps.length > 0 && (
                <div style={{ marginTop: '10px', padding: '12px 16px', background: 'var(--color-surface-container, #f8fafc)', borderLeft: '4px solid var(--color-primary, #075c91)', borderRadius: '8px', border: '1px solid var(--color-outline-variant, #e2e8f0)' }}>
                  <strong style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary, #075c91)', marginBottom: '8px', letterSpacing: '0.04em' }}>
                    🩺 Clinical Interpretation
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {testInterps.map((item, idx) => (
                      <div key={idx} style={{ padding: '8px 12px', background: 'var(--card-bg, #ffffff)', borderRadius: '6px', border: '1px solid var(--card-border, #e2e8f0)' }}>
                        <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-on-surface, #1e293b)', marginBottom: '2px' }}>{item.title}</strong>
                        <span style={{ fontSize: '0.82rem', color: 'var(--color-on-surface-variant, #516a75)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{item.interpretation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        });
      })()}

      {/* Public Sharing Banner */}
      {isApproved ? (
        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--color-surface-container-high, #e0f2fe)', border: '1px solid var(--color-outline-variant, #bae6fd)', borderRadius: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div>
            <strong style={{ fontSize: '0.85rem', color: '#0369a1', display: 'block' }}>🌐 Public Report Sharing Link</strong>
            <span style={{ fontSize: '0.78rem', color: '#334155', wordBreak: 'break-all' }}>
              {currentToken
                ? buildPublicReportUrl(currentToken)
                : 'Generating public share link…'}
            </span>
          </div>
          {currentToken && (
            <button
              type="button"
              className="secondary"
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              onClick={() => {
                const shareUrl = buildPublicReportUrl(currentToken);
                navigator.clipboard.writeText(shareUrl);
                alert('Public report sharing URL copied to clipboard!\n\n' + shareUrl);
              }}
            >
              📋 Copy Public Report Link
            </button>
          )}
        </div>
      ) : (
        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--color-surface-container, #f8fafc)', border: '1px solid var(--color-outline-variant, #e2e8f0)', borderRadius: '10px' }}>
          <strong style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant, #64748b)', display: 'block' }}>🌐 Public Report Sharing</strong>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant, #64748b)' }}>
            Public sharing will become available after final approval.
          </span>
        </div>
      )}

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
