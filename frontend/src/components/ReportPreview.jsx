import React, { useState, useEffect } from 'react';
import { FlagBadge } from '../utils/flagHelper.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { buildPublicReportUrl } from '../utils/publicUrlHelper.js';
import { MAIN_CATEGORY_ORDER, normalizeCategoryName } from '../utils/categoryHelper.js';

import labLogo from '../assets/etu.jpg';

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

    const normCat = normalizeCategoryName(category, name);
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

export function ReportPreview({ report, showFooter = true }) {
  if (!report) return null;
  const { token: authToken } = useAuth();
  const p = report.patient || {};
  const { categoriesMap, testNames, formattedNames } = getReportTestTypes(report);
  const sampleTypesStr = (p.sampleTypes || []).map(x => x?.name || x).filter(Boolean).join(', ') || 'Specimen Assigned';
  const isApproved = ['Approved', 'Ready for Printing'].includes(report.status);

  const isPathology = report?.testType || report?.docType === 'PathologyCase' || Boolean(report?.structuredReport?.grossDescription || report?.structuredReport?.cytologicalFindings || report?.structuredReport?.rbcMorphology);
  const isRadiology = report?.examinationType || report?.docType === 'RadiologyCase' || Boolean(report?.structuredReport?.liver || report?.structuredReport?.findings);

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

  const reportSubTitle = isPathology
    ? `Pathology Examination Report — ${report.testType || 'Biopsy'}`
    : isRadiology
    ? `Radiology & Imaging Report — ${report.customExaminationName || (report.ultrasoundSubtype ? `Ultrasound — ${report.ultrasoundSubtype}` : report.examinationType || 'Diagnostic Imaging')}`
    : 'Official Laboratory Test Report';

  const preparedByName = report.technician?.fullName || report.submittedBy?.fullName || 'Clinical Specialist';
  const approvedByName = report.approvedBy?.fullName || report.pathologist?.fullName || report.radiologist?.fullName || 'Pending Specialist Approval';
  const approverRoleTitle = report.approverRole || (isPathology ? 'Pathologist' : isRadiology ? 'Radiologist' : 'Approver / Laboratory Technologist');

  return (
    <article className="a4-document-page">
      {/* ── Official ETU Header or Clean Medical Subtitle ────────────────── */}
      {showFooter ? (
        <header className="a4-header">
          <img src={labLogo} alt="ETU Diagnostic Laboratory Logo" className="logo-img" />
          <h1>ETU Diagnostic Laboratory</h1>
          <p className="sub">{reportSubTitle}</p>
        </header>
      ) : (
        <header className="a4-header-clean">
          <h2>{reportSubTitle}</h2>
        </header>
      )}

      {/* ── Patient & Examination Information ─────────────────────────── */}
      <section className="a4-section" style={{ marginTop: '10px' }}>
        <h2>Patient & Case Information</h2>
        <div className="a4-patient-grid">
          <div><b>Patient Name:</b> <span>{p.name || '—'}</span></div>
          <div><b>Patient ID:</b> <span>{p.patientId || '—'}</span></div>
          <div><b>Age / Sex:</b> <span>{p.age || '—'} / {p.sex || '—'}</span></div>
          <div><b>Phone:</b> <span>{p.phone || '—'}</span></div>
          <div><b>Examination Type:</b> <span>{report.testType || report.customExaminationName || report.ultrasoundSubtype || report.examinationType || sampleTypesStr}</span></div>
          <div><b>Registration Date:</b> <span>{new Date(p.registrationDate || p.createdDate || report.createdDate || Date.now()).toLocaleString()}</span></div>
          <div><b>Report Date:</b> <span>{new Date(report.approvedAt || report.approvedDate || report.approvalDate || report.updatedDate || Date.now()).toLocaleString()}</span></div>
          <div><b>Branch:</b> <span>📍 {report.branchName || p.branchName || 'Main'}</span></div>
          {(p.systolicBP || p.diastolicBP) && (
            <div><b>Blood Pressure:</b> <span>{p.systolicBP || '—'}/{p.diastolicBP || '—'} mmHg</span></div>
          )}
          {p.referralHospital && (
            <>
              <div><b>Referral Hospital:</b> <span>{p.referralHospital}</span></div>
              <div><b>Hospital Address:</b> <span>{p.address || '—'}</span></div>
            </>
          )}
        </div>
      </section>

      {/* ── Main Examination & Report Findings ─────────────────────────── */}
      {(() => {
        // 1. Pathology Report
        if (isPathology) {
          if (report.reportType === 'Option A' || (!report.reportType && report.reportContent)) {
            return (
              <section className="a4-section">
                <h2>Pathology Examination Report</h2>
                <div
                  className="a4-rich-body"
                  dangerouslySetInnerHTML={{ __html: report.reportContent || '<p>No content recorded.</p>' }}
                />
              </section>
            );
          }
          const s = report.structuredReport || {};
          return (
            <section className="a4-section">
              <h2>Structured Pathology Findings</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {s.clinicalHistory && <div><b style={{ color: '#075c91' }}>Clinical History:</b> <div>{s.clinicalHistory}</div></div>}
                {s.specimen && <div><b style={{ color: '#075c91' }}>Specimen / Site:</b> <div>{s.specimen}</div></div>}
                {s.grossDescription && <div><b style={{ color: '#075c91' }}>Gross Description:</b> <div>{s.grossDescription}</div></div>}
                {s.microscopicDescription && <div><b style={{ color: '#075c91' }}>Microscopic Findings:</b> <div>{s.microscopicDescription}</div></div>}
                {s.cytologicalFindings && <div><b style={{ color: '#075c91' }}>Cytological Findings:</b> <div>{s.cytologicalFindings}</div></div>}
                {(s.rbcMorphology || s.wbcMorphology || s.plateletMorphology) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div><b style={{ color: '#075c91', fontSize: '11.5px' }}>RBC Morphology:</b> <div style={{ fontSize: '12.5px' }}>{s.rbcMorphology}</div></div>
                    <div><b style={{ color: '#075c91', fontSize: '11.5px' }}>WBC Morphology:</b> <div style={{ fontSize: '12.5px' }}>{s.wbcMorphology}</div></div>
                    <div><b style={{ color: '#075c91', fontSize: '11.5px' }}>Platelet Morphology:</b> <div style={{ fontSize: '12.5px' }}>{s.plateletMorphology}</div></div>
                  </div>
                )}
                {s.diagnosis && (
                  <div style={{ background: '#f0f7fa', padding: '10px 14px', borderLeft: '4px solid #075c91', borderRadius: '4px' }}>
                    <b style={{ color: '#075c91', fontSize: '12.5px', textTransform: 'uppercase' }}>Pathological Diagnosis:</b>
                    <div style={{ fontWeight: 'bold', fontSize: '13.5px', color: '#0f172a', marginTop: '3px' }}>{s.diagnosis}</div>
                  </div>
                )}
                {s.comments && <div><b style={{ color: '#075c91' }}>Comments:</b> <div>{s.comments}</div></div>}
                {s.recommendation && <div><b style={{ color: '#075c91' }}>Recommendations:</b> <div>{s.recommendation}</div></div>}
              </div>
            </section>
          );
        }

        // 2. Radiology Report
        if (isRadiology) {
          const examLabel = report.customExaminationName || (report.ultrasoundSubtype ? `Ultrasound — ${report.ultrasoundSubtype}` : report.examinationType || 'Diagnostic Imaging');
          if (report.reportType === 'Option A' || (!report.reportType && report.reportContent)) {
            return (
              <section className="a4-section">
                <h2>Radiology & Medical Imaging Report</h2>
                <div
                  className="a4-rich-body"
                  dangerouslySetInnerHTML={{ __html: report.reportContent || '<p>No content recorded.</p>' }}
                />
              </section>
            );
          }
          const s = report.structuredReport || {};
          return (
            <section className="a4-section">
              <h2>Structured Imaging Findings</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {s.clinicalInformation && <div><b style={{ color: '#075c91' }}>Clinical Information / Indications:</b> <div>{s.clinicalInformation}</div></div>}
                {s.technique && <div><b style={{ color: '#075c91' }}>Technique / Protocol:</b> <div>{s.technique}</div></div>}
                {(s.liver || s.gallbladder || s.pancreas || s.spleen || s.kidneys || s.urinaryBladder) && (
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <b style={{ color: '#075c91', fontSize: '12px', textTransform: 'uppercase' }}>Sonographic Organ Findings:</b>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px', marginTop: '6px', fontSize: '12.5px' }}>
                      {s.liver && <div><b>Liver:</b> {s.liver}</div>}
                      {s.gallbladder && <div><b>Gallbladder & Biliary:</b> {s.gallbladder}</div>}
                      {s.pancreas && <div><b>Pancreas:</b> {s.pancreas}</div>}
                      {s.spleen && <div><b>Spleen:</b> {s.spleen}</div>}
                      {s.kidneys && <div><b>Kidneys:</b> {s.kidneys}</div>}
                      {s.urinaryBladder && <div><b>Urinary Bladder:</b> {s.urinaryBladder}</div>}
                    </div>
                  </div>
                )}
                {s.findings && <div><b style={{ color: '#075c91' }}>General Findings:</b> <div>{s.findings}</div></div>}
                {s.impression && (
                  <div style={{ background: '#f0f7fa', padding: '10px 14px', borderLeft: '4px solid #075c91', borderRadius: '4px' }}>
                    <b style={{ color: '#075c91', fontSize: '12.5px', textTransform: 'uppercase' }}>Radiological Impression / Conclusion:</b>
                    <div style={{ fontWeight: 'bold', fontSize: '13.5px', color: '#0f172a', marginTop: '3px' }}>{s.impression}</div>
                  </div>
                )}
                {s.recommendation && <div><b style={{ color: '#075c91' }}>Recommendations:</b> <div>{s.recommendation}</div></div>}
              </div>
            </section>
          );
        }

        // 3. Standard Laboratory Results
        const results = report.results || [];
        if (!results.length) {
          return (
            <section className="a4-section">
              <h2>Laboratory Results</h2>
              <table className="a4-table">
                <thead><tr><th>Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th style={{ textAlign: 'center' }}>Flag</th></tr></thead>
                <tbody><tr><td colSpan="5" style={{ fontStyle: 'italic', textAlign: 'center' }}>No test results recorded for this report.</td></tr></tbody>
              </table>
            </section>
          );
        }

        // Build parameter → category & subcategory map
        const paramCatMap = {};
        const paramSubcatMap = {};
        const rawTests = Array.isArray(report?.laboratoryTests) ? report.laboratoryTests : (Array.isArray(p?.laboratoryTests) ? p.laboratoryTests : []);
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

        // Group results by category, then subcategory
        const groups = new Map();
        results.forEach(row => {
          const catName = normalizeCategoryName(row.category || paramCatMap[row.sampleName], row.sampleName);
          const subcatName = (row.subcategory || paramSubcatMap[row.sampleName] || '').toUpperCase();
          if (!groups.has(catName)) groups.set(catName, new Map());
          const subMap = groups.get(catName);
          const subKey = subcatName || 'GENERAL';
          if (!subMap.has(subKey)) subMap.set(subKey, []);
          subMap.get(subKey).push(row);
        });

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
          const match = testInterpretations.find(t => normalizeCategoryName(t.testName) === norm);
          return match?.interpretations || [];
        };

        return (
          <section className="a4-section">
            <h2>Laboratory Results</h2>
            {sortedGroups.map(([catName, subMap]) => {
              const testInterps = findTestInterps(catName);

              return (
                <div key={catName} style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 6px 0', padding: '5px 10px', background: '#075c91', color: '#ffffff', borderRadius: '4px', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {catName}
                  </h3>

                  {Array.from(subMap.entries()).map(([subKey, rows]) => {
                    return (
                      <div key={subKey} style={{ marginBottom: '8px' }}>
                        {subKey !== 'GENERAL' && (
                          <h4 style={{ margin: '4px 0', padding: '2px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase', display: 'inline-block' }}>
                            {subKey}
                          </h4>
                        )}
                        <table className="a4-table">
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
                                  {row.remarks && <small style={{ display: 'block', color: '#64748b', fontSize: '10.5px' }}>{row.remarks}</small>}
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

                  {/* Render Clinical Interpretation */}
                  {testInterps.length > 0 && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f8fafc', borderLeft: '3.5px solid #075c91', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <strong style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#075c91', marginBottom: '4px' }}>
                        🩺 Clinical Interpretation
                      </strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {testInterps.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '11.5px', color: '#1e293b' }}>
                            <strong>{item.title}:</strong> <span>{item.interpretation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })()}

      {/* ── Authorization & Sign-off Section ─────────────────────────── */}
      <section className="a4-section">
        <h2>Authorization & Sign-off</h2>
        <div className="a4-signoff-grid">
          <div>
            <b>Authorized Specialist:</b>
            <strong>{preparedByName}</strong>
          </div>
          <div>
            <b>Approved By:</b>
            <strong>Dr. {approvedByName}</strong>
            <span style={{ fontSize: '10.5px', color: '#64748b' }}>({approverRoleTitle})</span>
          </div>
          <div>
            <b>Approval Date:</b>
            <strong>{new Date(report.approvedAt || report.approvedDate || report.approvalDate || report.updatedDate || Date.now()).toLocaleString()}</strong>
          </div>
        </div>
      </section>

      {/* Remarks */}
      {report.comments && (
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#475569' }}>
          <strong>General Comments:</strong> {report.comments}
        </p>
      )}

      {/* ── Official Footer Branding (Controlled by showFooter) ───────── */}
      {showFooter && (
        <footer className="a4-footer">
          <span>Prepared & Verified Diagnostically</span>
          <span style={{ fontWeight: 800, color: '#075c91', letterSpacing: '0.4px' }}>ETU DIAGNOSTIC LABORATORY</span>
        </footer>
      )}
    </article>
  );
}

export default ReportPreview;
