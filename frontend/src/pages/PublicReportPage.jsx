import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FlagBadge } from '../utils/flagHelper.jsx';
import '../styles/pages/investigation.css';

export function PublicReportViewer() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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

        // Try primary public endpoint: GET /api/reports/public/:token
        let res = await fetch(`${apiBase}/reports/public/${token}`);
        if (res.status === 404) {
          // Fallback check secondary endpoint
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

  // 1. Loading State - "Processing..." with circular animation
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface, #f8fafc)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="lims-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 16px', border: '4px solid #e2e8f0', borderTopColor: '#075c91', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h2 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, margin: '0 0 4px 0' }}>Processing...</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Loading official diagnostic report…</p>
        </div>
      </div>
    );
  }

  // 2. Error State Handling
  if (error || !report) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: '#ffffff', borderRadius: '16px', padding: '32px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #e2e8f0' }}>
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

  // 3. Render Approved Report
  const patientName = report.patientName || report.patient?.name || '—';
  const patientId = report.patientId || report.patient?.patientId || '—';
  const age = report.age || report.patient?.age || '—';
  const sex = report.sex || report.patient?.sex || '—';
  const reportDate = report.reportDate || report.approvedDate || '—';
  const resultsList = report.results || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface, #f8fafc)', padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        
        {/* Top Branding Banner */}
        <header style={{ background: '#ffffff', borderRadius: '16px', padding: '24px 28px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px' }}>
              ✓ VERIFIED DIAGNOSTIC REPORT
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#075c91', fontWeight: 800, letterSpacing: '-0.02em' }}>{report.laboratoryName || 'ETU DIAGNOSTIC LABORATORY'}</h1>
            <h2 style={{ margin: '4px 0 0', color: '#0f172a', fontSize: '1rem', fontWeight: 700 }}>{report.headerTitle || report.status || 'FINAL APPROVED REPORT'}</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>Branch: {report.branchName || 'Main'} | Ref: <strong>{report.reportNumber || token.substring(0, 10).toUpperCase()}</strong></p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={copyUrl}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', background: copied ? '#10b981' : '#f1f5f9', color: copied ? '#fff' : '#334155', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {copied ? '✓ Link Copied!' : '🔗 Copy Share Link'}
            </button>
            {report.allowPdfDownload !== false && (
              <button
                onClick={handleDownloadPdf}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', background: '#075c91', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(7,92,145,0.2)' }}
              >
                📥 Download PDF
              </button>
            )}
          </div>
        </header>

        {/* Main Document Body */}
        <main style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
          
          {/* Patient Information Section */}
          <h3 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            👤 Patient Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', padding: '16px 20px', background: '#f8fafc', borderRadius: '12px', marginBottom: '24px', border: '1px solid #f1f5f9' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Patient Name</span>
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{patientName}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Patient ID</span>
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{patientId}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Age / Sex</span>
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{age} / {sex}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Report Date</span>
              <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{reportDate ? new Date(reportDate).toLocaleDateString() : '—'}</strong>
            </div>
            {report.referralHospital && (
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Referring Institution</span>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{report.referralHospital}</strong>
              </div>
            )}
          </div>

          {/* Laboratory Tests Summary Section */}
          <h3 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🧪 Laboratory Tests Performed
          </h3>
          {report.tests && report.tests.length > 0 ? (
            <div style={{ marginBottom: '24px', padding: '14px 18px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
              {report.tests.map((item, idx) => (
                <div key={idx} style={{ marginBottom: idx < report.tests.length - 1 ? '8px' : 0 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>{item.categoryName || 'GENERAL'}: </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>{item.testName || 'Diagnostic Examination'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginBottom: '24px', padding: '12px 16px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>Laboratory Diagnostic Investigation</span>
            </div>
          )}

          {/* Results Table Section — grouped by category */}
          <h3 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 Test Results & Observations
          </h3>
          
          <div style={{ marginBottom: '24px' }}>
            {(() => {
              if (!resultsList || resultsList.length === 0) {
                return (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    No test parameters recorded.
                  </div>
                );
              }

              // Build parameter category map from report.tests
              const paramCatMap = {};
              (report.tests || []).forEach(t => {
                if (!t) return;
                const cName = (t.categoryName || 'GENERAL').toUpperCase();
                const pName = t.testName || t.name || '';
                if (pName) paramCatMap[pName] = cName;
              });

              const categoryGroups = new Map();
              resultsList.forEach(row => {
                const name = row.parameter || row.sampleName || row.name || '';
                const catName = paramCatMap[name] || 'DIAGNOSTIC EXAMINATION';
                if (!categoryGroups.has(catName)) categoryGroups.set(catName, []);
                categoryGroups.get(catName).push(row);
              });

              return Array.from(categoryGroups.entries()).map(([catName, rows]) => (
                <div key={catName} style={{ marginBottom: '20px' }}>
                  <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #075c91 0%, #0ea5e9 100%)', color: '#ffffff', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    {catName}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                          <th style={{ padding: '10px 12px', color: '#334155', fontWeight: 700 }}>Parameter</th>
                          <th style={{ padding: '10px 12px', color: '#334155', fontWeight: 700 }}>Result</th>
                          <th style={{ padding: '10px 12px', color: '#334155', fontWeight: 700 }}>SI Unit</th>
                          <th style={{ padding: '10px 12px', color: '#334155', fontWeight: 700 }}>Reference Range</th>
                          <th style={{ padding: '10px 12px', color: '#334155', fontWeight: 700, textAlign: 'center' }}>Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <strong style={{ color: '#0f172a' }}>{row.parameter || row.sampleName || row.name}</strong>
                              {row.remarks && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{row.remarks}</div>}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#075c91' }}>{row.result}</td>
                            <td style={{ padding: '10px 12px', color: '#475569' }}>{row.unit || '—'}</td>
                            <td style={{ padding: '10px 12px', color: '#475569' }}>{row.referenceValue || '—'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <FlagBadge flag={row.flag} result={row.result} referenceValue={row.referenceValue} sex={sex} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Pathologist Comments */}
          {report.comments && (
            <div style={{ padding: '14px 18px', background: '#fffbebfb', borderRadius: '10px', border: '1px solid #fef3c7', marginBottom: '20px' }}>
              <strong style={{ color: '#b45309', fontSize: '0.85rem' }}>Pathologist / Technologist Comments:</strong>
              <p style={{ margin: '4px 0 0', color: '#78350f', fontSize: '0.9rem' }}>{report.comments}</p>
            </div>
          )}

          {/* Footer Sign-off */}
          <footer style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
            <div>
              <span>Approved by: <strong>{report.approvedBy || 'Lab Director'}</strong></span>
              {report.collectorName && <span style={{ marginLeft: '16px' }}>Collected by: <strong>{report.collectorName}</strong></span>}
            </div>
            <div>
              <span>Official ETU Laboratory Document • {new Date().getFullYear()}</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default PublicReportViewer;
