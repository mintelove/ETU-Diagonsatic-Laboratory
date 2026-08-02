import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FlagBadge } from '../utils/flagHelper.jsx';
import { MAIN_CATEGORY_ORDER, normalizeCategoryName } from '../utils/categoryHelper.js';

export function PublicReportViewer() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useLayoutEffect(() => {
    const origBg = document.body.style.backgroundColor;
    const origTheme = document.documentElement.getAttribute('data-theme');
    const origClass = document.body.className;

    document.body.style.backgroundColor = '#f1f3f5';
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');

    return () => {
      document.body.style.backgroundColor = origBg;
      if (origTheme) {
        document.documentElement.setAttribute('data-theme', origTheme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      document.body.className = origClass;
    };
  }, []);

  useEffect(() => {
    async function fetchPublicReport() {
      if (!token) {
        setError('Report not found.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');

        const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

        let res = await fetch(`${apiBase}/reports/public/${token}`);
        if (res.status === 404) {
          const res2 = await fetch(`${apiBase}/public/reports/${token}`);
          if (res2.ok) res = res2;
        }

        const data = await res.json();
        if (!res.ok) {
          if (res.status === 404) throw new Error('Report not found.');
          if (res.status === 403) throw new Error(data.message || 'This report is not available for public viewing.');
          throw new Error(data.message || 'Unable to load report. Please try again.');
        }

        setReport(data.report);
      } catch (err) {
        setError(err.message || 'Unable to load report. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchPublicReport();
  }, [token]);

  const copyUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadPdf = () => {
    const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
    window.open(`${apiBase}/reports/public/${token}/pdf`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f3f5', color: '#0f172a', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '16px', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', margin: '0 auto 16px', border: '4px solid #e2e8f0', borderTopColor: '#075c91', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h2 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, margin: '0 0 4px 0' }}>Processing...</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Loading official diagnostic report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ minHeight: '100vh', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f3f5', color: '#0f172a', padding: '20px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: '#ffffff', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: error.includes('not available') ? '#fef3c7' : '#fef2f2', color: error.includes('not available') ? '#d97706' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>
            {error.includes('not available') ? '🔒' : '⚠️'}
          </div>
          <h2 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '8px', fontWeight: 700 }}>
            {error || 'Unable to load report. Please try again.'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>
            {error.includes('not available')
              ? 'This report has not completed final administrative approval or sharing is disabled.'
              : error.includes('not found')
              ? 'The requested report token is invalid or has been removed.'
              : 'Please check your connection or contact ETU Diagnostic Laboratory support.'}
          </p>
          <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.8rem', color: '#475569' }}>
            🔒 ETU Diagnostic Laboratory — Official Results Portal
          </div>
        </div>
      </div>
    );
  }

  const p = report.patient || {};
  const patientName = report.patientName || p.name || '—';
  const patientId = report.patientId || p.patientId || '—';
  const age = report.age || p.age || '—';
  const sex = report.sex || p.sex || '—';
  const phone = p.phone || '—';
  const sampleTypesStr = (p.sampleTypes || []).map(x => x?.name || x).filter(Boolean).join(', ') || 'Specimen Assigned';
  const collectionDateStr = p.collectionDate || p.createdDate || report.createdDate ? new Date(p.collectionDate || p.createdDate || report.createdDate).toLocaleString() : '—';
  const reportDateStr = report.approvedDate || report.approvalDate || report.reportDate ? new Date(report.approvedDate || report.approvalDate || report.reportDate).toLocaleString() : new Date().toLocaleString();

  const resultsList = report.results || [];
  const rawTests = Array.isArray(report?.laboratoryTests) ? report.laboratoryTests : (Array.isArray(p?.laboratoryTests) ? p.laboratoryTests : (report.tests || []));

  const paramCatMap = {};
  const paramSubcatMap = {};
  rawTests.forEach(t => {
    if (!t || typeof t !== 'object') return;
    const catName = t.category ? (typeof t.category === 'object' ? (t.category.name || '') : String(t.category)) : (t.categoryName || '');
    const firstParamName = Array.isArray(t.parameters) && t.parameters.length > 0 ? (typeof t.parameters[0] === 'string' ? t.parameters[0] : (t.parameters[0]?.name || t.parameters[0]?.sampleName)) : (t.testName || t.name);
    const normCat = normalizeCategoryName(catName, firstParamName || t.testName || t.name);
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
    const mainTestName = t.testName || t.name || '';
    if (mainTestName) {
      paramCatMap[mainTestName] = normCat;
      if (subcatName) paramSubcatMap[mainTestName] = subcatName.toUpperCase();
    }
  });

  const categoryGroups = new Map();
  resultsList.forEach(row => {
    const pName = row.parameter || row.sampleName || row.name || '';
    const catName = normalizeCategoryName(row.category || paramCatMap[pName], pName);
    const subcatName = (row.subcategory || paramSubcatMap[pName] || '').toUpperCase();

    if (!categoryGroups.has(catName)) categoryGroups.set(catName, new Map());
    const subMap = categoryGroups.get(catName);
    const subKey = subcatName || 'GENERAL';
    if (!subMap.has(subKey)) subMap.set(subKey, []);
    subMap.get(subKey).push(row);
  });

  const sortedGroups = Array.from(categoryGroups.entries()).sort(([catA], [catB]) => {
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

  return (
    <div className="public-report-page" style={{ minHeight: '100vh', height: 'auto', width: '100%', background: '#f1f3f5', color: '#0f172a', padding: '24px 16px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', overflowX: 'hidden', overflowY: 'visible', WebkitOverflowScrolling: 'touch' }}>
      <style>{`
        :root, html, body {
          color-scheme: light !important;
          background-color: #f1f3f5 !important;
          color: #0f172a !important;
        }
        .public-report-page,
        .public-report-page *,
        .public-report-page *::before,
        .public-report-page *::after {
          color-scheme: light !important;
          box-sizing: border-box !important;
        }
        .public-report-page {
          background-color: #f1f3f5 !important;
          color: #0f172a !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .public-report-page input,
        .public-report-page select,
        .public-report-page textarea,
        .public-report-page button,
        .public-report-page table,
        .public-report-page th,
        .public-report-page td,
        .public-report-page div,
        .public-report-page span,
        .public-report-page p,
        .public-report-page h1,
        .public-report-page h2,
        .public-report-page h3,
        .public-report-page h4,
        .public-report-page h5 {
          color-scheme: light !important;
        }
        .public-report-main {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
        }
        .public-report-page table {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }
        .public-report-page table th {
          background-color: #075c91 !important;
          color: #ffffff !important;
        }
        .public-report-page table td {
          color: #0f172a !important;
          border-bottom-color: #d6e2e7 !important;
        }
        .public-report-page table tr:nth-child(even) td {
          background-color: #f8fafc !important;
        }
        .public-report-page table tr:nth-child(odd) td {
          background-color: #ffffff !important;
        }
        @media print {
          .public-report-actions { display: none !important; }
          .public-report-page { background: #ffffff !important; padding: 0 !important; }
          .public-report-main { box-shadow: none !important; border: none !important; padding: 0 !important; }
        }
      `}</style>
      <div style={{ maxWidth: '850px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* Top Action Bar */}
        <header className="public-report-actions" style={{ background: '#ffffff', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', boxSizing: 'border-box' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
              ✓ VERIFIED DIAGNOSTIC REPORT
            </div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', color: '#075c91', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ETU DIAGNOSTIC LABORATORY</h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Laboratory Test Report</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={copyUrl}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: copied ? '#10b981' : '#f1f5f9', color: copied ? '#fff' : '#334155', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {copied ? '✓ Link Copied!' : '🔗 Copy Share Link'}
            </button>
            {report.allowPdfDownload !== false && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', background: '#075c91', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(7,92,145,0.2)' }}
              >
                📥 Download PDF
              </button>
            )}
          </div>
        </header>

        {/* Main A4 Document Preview */}
        <main className="public-report-main" style={{ background: '#ffffff', borderRadius: '16px', padding: '24px 20px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1', boxSizing: 'border-box', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '3px solid #087ca8', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#075c91', fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800 }}>ETU Diagnostic Laboratory</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '1px' }}>Laboratory Test Report</p>
          </div>

          {/* Patient Information Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 10px 0', padding: '8px 12px', background: '#e8f5fa', color: '#075c91', borderLeft: '4px solid #0b95b7', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Patient Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px 20px', fontSize: '0.88rem', background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
              <div><strong style={{ color: '#475569', minWidth: '100px', display: 'inline-block' }}>Patient Name:</strong> <span style={{ color: '#0f172a' }}>{patientName}</span></div>
              <div><strong style={{ color: '#475569', minWidth: '100px', display: 'inline-block' }}>Patient ID:</strong> <span style={{ color: '#0f172a' }}>{patientId}</span></div>
              <div><strong style={{ color: '#475569', minWidth: '100px', display: 'inline-block' }}>Age / Sex:</strong> <span style={{ color: '#0f172a' }}>{age} / {sex}</span></div>
              <div><strong style={{ color: '#475569', minWidth: '100px', display: 'inline-block' }}>Phone:</strong> <span style={{ color: '#0f172a' }}>{phone}</span></div>
              <div><strong style={{ color: '#475569', minWidth: '100px', display: 'inline-block' }}>Sample Type:</strong> <span style={{ color: '#0f172a' }}>{sampleTypesStr}</span></div>
              <div><strong style={{ color: '#475569', minWidth: '100px', display: 'inline-block' }}>Collection Date:</strong> <span style={{ color: '#0f172a' }}>{collectionDateStr}</span></div>
              <div><strong style={{ color: '#475569', minWidth: '100px', display: 'inline-block' }}>Report Date:</strong> <span style={{ color: '#0f172a' }}>{reportDateStr}</span></div>
              {(p.systolicBP || p.diastolicBP) && (
                <div><strong style={{ color: '#475569', minWidth: '100px', display: 'inline-block' }}>Blood Pressure:</strong> <span style={{ color: '#0f172a' }}>{p.systolicBP || '—'}/{p.diastolicBP || '—'} mmHg</span></div>
              )}
              {p.referralHospital && (
                <div><strong style={{ color: '#475569', minWidth: '100px', display: 'inline-block' }}>Referral Hospital:</strong> <span style={{ color: '#0f172a' }}>{p.referralHospital}</span></div>
              )}
            </div>
          </div>

          {/* Laboratory Results Table Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', padding: '8px 12px', background: '#e8f5fa', color: '#075c91', borderLeft: '4px solid #0b95b7', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Laboratory Results
            </h3>
            
            {sortedGroups.length > 0 ? (
              sortedGroups.map(([catName, subMap]) => {
                const testInterps = findTestInterps(catName);
                return (
                  <div key={catName} style={{ marginBottom: '22px' }}>
                    <h4 style={{ margin: '0 0 8px 0', padding: '7px 12px', background: '#075c91', color: '#ffffff', borderRadius: '5px', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                      {catName}
                    </h4>

                    {Array.from(subMap.entries()).map(([subKey, rows]) => (
                      <div key={subKey} style={{ marginBottom: '10px' }}>
                        {subKey !== 'GENERAL' && (
                          <h5 style={{ margin: '4px 0 6px 0', fontSize: '0.75rem', textTransform: 'uppercase', color: '#075c91', background: '#e8f5fa', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                            {subKey}
                          </h5>
                        )}
                        <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '6px' }}>
                          <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', background: '#ffffff' }}>
                            <thead>
                              <tr>
                                <th style={{ background: '#075c91', color: '#ffffff', textAlign: 'left', padding: '9px', fontSize: '0.8rem', textTransform: 'uppercase' }}>Test / Parameter</th>
                                <th style={{ background: '#075c91', color: '#ffffff', textAlign: 'left', padding: '9px', fontSize: '0.8rem', textTransform: 'uppercase' }}>Result</th>
                                <th style={{ background: '#075c91', color: '#ffffff', textAlign: 'left', padding: '9px', fontSize: '0.8rem', textTransform: 'uppercase' }}>SI Unit</th>
                                <th style={{ background: '#075c91', color: '#ffffff', textAlign: 'left', padding: '9px', fontSize: '0.8rem', textTransform: 'uppercase' }}>Reference Range</th>
                                <th style={{ background: '#075c91', color: '#ffffff', textAlign: 'center', padding: '9px', fontSize: '0.8rem', textTransform: 'uppercase' }}>Flag</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, idx) => {
                                const pName = row.parameter || row.sampleName || row.name || '';
                                return (
                                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #d6e2e7' }}>
                                    <td style={{ padding: '9px', fontSize: '0.88rem', color: '#0f172a' }}>
                                      <strong style={{ color: '#0f172a' }}>{pName}</strong>
                                      {row.remarks && <small style={{ display: 'block', color: '#657d87', marginTop: '2px', fontSize: '0.75rem' }}>{row.remarks}</small>}
                                    </td>
                                    <td style={{ padding: '9px', fontSize: '0.88rem', fontWeight: 700, color: '#075c91' }}>{row.result}</td>
                                    <td style={{ padding: '9px', fontSize: '0.88rem', color: '#475569' }}>{row.unit || '—'}</td>
                                    <td style={{ padding: '9px', fontSize: '0.88rem', color: '#475569' }}>{row.referenceValue || '—'}</td>
                                    <td style={{ padding: '9px', textAlign: 'center' }}>
                                      <FlagBadge flag={row.flag} result={row.result} referenceValue={row.referenceValue} sex={sex} />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}

                    {testInterps.length > 0 && (
                      <div style={{ margin: '6px 0 14px 0', padding: '8px 12px', background: '#f0f7fa', borderLeft: '4px solid #075c91', borderRadius: '4px' }}>
                        <b style={{ color: '#075c91', fontSize: '0.78rem', textTransform: 'uppercase' }}>Clinical Interpretation:</b>
                        {testInterps.map((item, idx) => (
                          <div key={idx} style={{ marginTop: '4px', fontSize: '0.82rem', color: '#203640' }}>
                            <strong style={{ color: '#0f172a' }}>{item.title}:</strong> {item.interpretation}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', background: '#ffffff' }}>
                  <thead>
                    <tr>
                      <th style={{ background: '#075c91', color: '#ffffff', textAlign: 'left', padding: '9px', fontSize: '0.8rem' }}>Test / Parameter</th>
                      <th style={{ background: '#075c91', color: '#ffffff', textAlign: 'left', padding: '9px', fontSize: '0.8rem' }}>Result</th>
                      <th style={{ background: '#075c91', color: '#ffffff', textAlign: 'left', padding: '9px', fontSize: '0.8rem' }}>SI Unit</th>
                      <th style={{ background: '#075c91', color: '#ffffff', textAlign: 'left', padding: '9px', fontSize: '0.8rem' }}>Reference Range</th>
                      <th style={{ background: '#075c91', color: '#ffffff', textAlign: 'center', padding: '9px', fontSize: '0.8rem' }}>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan="5" style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>No laboratory results recorded.</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* General Remarks */}
          {report.comments && (
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
              <strong style={{ color: '#075c91', fontSize: '0.85rem' }}>General Remarks:</strong>
              <p style={{ margin: '4px 0 0', color: '#334155', fontSize: '0.88rem' }}>{report.comments}</p>
            </div>
          )}

          {/* Authorization Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', padding: '8px 12px', background: '#e8f5fa', color: '#075c91', borderLeft: '4px solid #0b95b7', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Authorization
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px 20px', fontSize: '0.88rem', background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
              <div><strong style={{ color: '#475569', minWidth: '100px', display: 'inline-block' }}>Prepared By:</strong> <span style={{ color: '#0f172a' }}>{report.technician?.fullName || report.submittedBy?.fullName || report.collectorName || 'Technician'}</span></div>
              <div><strong style={{ color: '#475569', minWidth: '100px', display: 'inline-block' }}>Approved By:</strong> <span style={{ color: '#0f172a' }}>{report.approvedBy?.fullName || (typeof report.approvedBy === 'string' ? report.approvedBy : 'Approved')}</span></div>
              <div><strong style={{ color: '#475569', minWidth: '100px', display: 'inline-block' }}>Approval Date:</strong> <span style={{ color: '#0f172a' }}>{reportDateStr}</span></div>
            </div>
          </div>

          {/* Footer Sign-off */}
          <footer style={{ borderTop: '1px solid #c9d9df', paddingTop: '14px', marginTop: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', fontSize: '0.78rem', color: '#59727c', gap: '12px' }}>
            <div>Prepared by<br/><strong style={{ color: '#203640' }}>{report.technician?.fullName || report.submittedBy?.fullName || report.collectorName || 'Technician'}</strong></div>
            <div>Approved by<br/><strong style={{ color: '#203640' }}>{report.approvedBy?.fullName || (typeof report.approvedBy === 'string' ? report.approvedBy : 'Approved')}</strong></div>
            <div><br/><strong style={{ color: '#203640' }}>ETU Diagnostic Laboratory</strong></div>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default PublicReportViewer;
