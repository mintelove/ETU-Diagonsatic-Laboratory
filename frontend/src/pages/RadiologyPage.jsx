/**
 * ETU Diagnostic Laboratory — Radiologist Workspace
 *
 * Dedicated clinical interface for Radiologists to review assigned examinations
 * (CT Scan, X-Ray, Ultrasound Abdominal/MSS/Doppler/Echo/Other),
 * enter reports via Option A (Copy/Paste default) or Option B (Structured Clinical Entry),
 * and directly confirm / approve reports.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api, isSilentNetworkError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { formatETB } from '../utils/currencyHelper.js';
import ModalPortal from '../components/ModalPortal.jsx';
import RichReportEditor from '../components/RichReportEditor.jsx';

export default function RadiologyPage() {
  const { user, token } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState(null);

  // Active Examination Editor Modal
  const [selectedCase, setSelectedCase] = useState(null);
  const [reportType, setReportType] = useState('Option A'); // Option A (Default) or Option B (Structured)
  const [reportContent, setReportContent] = useState('');
  const [showFooter, setShowFooter] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  // Structured fields for Option B
  const [structured, setStructured] = useState({
    examination: '',
    clinicalInformation: '',
    technique: '',
    liver: '',
    gallbladder: '',
    biliarySystem: '',
    pancreas: '',
    spleen: '',
    kidneys: '',
    urinaryBladder: '',
    otherFindings: '',
    findings: '',
    impression: '',
    recommendation: '',
    radiologistNotes: ''
  });

  const editorRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api('/radiology/queue', { token });
      setCases(data.cases || []);
    } catch (e) {
      if (!isSilentNetworkError(e)) {
        showToast(e.message || 'Failed to load radiology queue.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadQueue();
    const handleUpdate = () => loadQueue();
    subscribe('radiology:change', handleUpdate);
    subscribe('reception:change', handleUpdate);
    return () => {
      unsubscribe('radiology:change', handleUpdate);
      unsubscribe('reception:change', handleUpdate);
    };
  }, [loadQueue, subscribe, unsubscribe]);

  const openCaseModal = (c) => {
    setSelectedCase(c);
    setReportType(c.reportType || 'Option A');
    setReportContent(c.reportContent || '');
    setShowFooter(c.showFooter !== undefined ? c.showFooter : true);

    const examTitle = c.customExaminationName || (c.ultrasoundSubtype ? `Ultrasound - ${c.ultrasoundSubtype}` : c.examinationType);
    setStructured({
      examination: c.structuredReport?.examination || examTitle,
      clinicalInformation: c.structuredReport?.clinicalInformation || '',
      technique: c.structuredReport?.technique || (c.examinationType === 'CT Scan' ? 'Helical CT with multiplanar reconstructions' : c.examinationType === 'X-Ray' ? 'Digital Radiography (AP & Lateral views)' : 'Real-time B-mode and Color Doppler Ultrasound'),
      liver: c.structuredReport?.liver || '',
      gallbladder: c.structuredReport?.gallbladder || '',
      biliarySystem: c.structuredReport?.biliarySystem || '',
      pancreas: c.structuredReport?.pancreas || '',
      spleen: c.structuredReport?.spleen || '',
      kidneys: c.structuredReport?.kidneys || '',
      urinaryBladder: c.structuredReport?.urinaryBladder || '',
      otherFindings: c.structuredReport?.otherFindings || '',
      findings: c.structuredReport?.findings || '',
      impression: c.structuredReport?.impression || '',
      recommendation: c.structuredReport?.recommendation || '',
      radiologistNotes: c.structuredReport?.radiologistNotes || ''
    });
  };

  const closeCaseModal = () => {
    setSelectedCase(null);
  };

  const handleSaveDraft = async () => {
    if (!selectedCase) return;
    try {
      setSaving(true);
      const htmlContent = reportType === 'Option A' && editorRef.current ? editorRef.current.innerHTML : reportContent;
      await api(`/radiology/cases/${selectedCase._id}/draft`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          reportType,
          reportContent: htmlContent,
          structuredReport: structured,
          showFooter
        })
      });
      showToast('Radiology draft saved successfully.');
      loadQueue();
    } catch (e) {
      showToast(e.message || 'Failed to save draft.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveReport = async () => {
    if (!selectedCase) return;
    try {
      setApproving(true);
      const htmlContent = reportType === 'Option A' && editorRef.current ? editorRef.current.innerHTML : reportContent;
      
      // Basic check
      if (reportType === 'Option A' && (!htmlContent || !htmlContent.trim() || htmlContent === '<br>')) {
        showToast('Please paste or write the radiology report content before confirming approval.', 'error');
        setApproving(false);
        return;
      }
      if (reportType === 'Option B') {
        const hasField = Object.values(structured).some(v => v && String(v).trim());
        if (!hasField) {
          showToast('Please fill in the structured findings before confirming approval.', 'error');
          setApproving(false);
          return;
        }
      }

      await api(`/radiology/cases/${selectedCase._id}/approve`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          reportType,
          reportContent: htmlContent,
          structuredReport: structured,
          showFooter
        })
      });

      showToast(`Radiology report approved! Ready for Reception to print.`);
      closeCaseModal();
      loadQueue();
    } catch (e) {
      showToast(e.message || 'Failed to approve report.', 'error');
    } finally {
      setApproving(false);
    }
  };

  // Filtered queue
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!search) return true;
      const lower = search.toLowerCase();
      return (
        c.caseNumber?.toLowerCase().includes(lower) ||
        c.examinationType?.toLowerCase().includes(lower) ||
        c.ultrasoundSubtype?.toLowerCase().includes(lower) ||
        c.customExaminationName?.toLowerCase().includes(lower) ||
        c.patient?.patientId?.toLowerCase().includes(lower) ||
        c.patient?.name?.toLowerCase().includes(lower) ||
        c.patient?.phone?.toLowerCase().includes(lower)
      );
    });
  }, [cases, statusFilter, search]);

  const stats = useMemo(() => {
    const total = cases.length;
    const queued = cases.filter(c => c.status === 'Queued').length;
    const inProgress = cases.filter(c => c.status === 'In Progress').length;
    const approved = cases.filter(c => ['Approved', 'Ready for Printing'].includes(c.status)).length;
    return { total, queued, inProgress, approved };
  }, [cases]);

  return (
    <section className="page radiology-page">
      {/* Toast */}
      {toast && (
        <div
          className={`toast-message ${toast.type === 'error' ? 'error' : 'success'}`}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '12px 24px',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            zIndex: 2500,
            background: toast.type === 'error' ? 'var(--color-error, #b71c1c)' : 'var(--color-success, #2e7d32)',
            boxShadow: 'var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.2))',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}
        >
          <span>{toast.type === 'error' ? '❌' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="dash-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <p className="eyebrow">Diagnostic Imaging & Radiology Department</p>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🩻</span> Radiology Work Queue
          </h1>
          <p className="intro">
            Welcome, <strong>Dr. {user?.fullName}</strong> · 📍 Branch: <strong>{user?.branchName || 'Main'}</strong>
          </p>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <article className="stat-card blue">
          <small>Total Examinations</small>
          <strong>{stats.total}</strong>
        </article>
        <article className="stat-card orange">
          <small>Waiting Examination</small>
          <strong>{stats.queued}</strong>
        </article>
        <article className="stat-card purple">
          <small>In Progress</small>
          <strong>{stats.inProgress}</strong>
        </article>
        <article className="stat-card green">
          <small>Approved Reports</small>
          <strong>{stats.approved}</strong>
        </article>
      </div>

      {/* Toolbar */}
      <div className="users-toolbar" style={{ marginBottom: '1.2rem', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: '1 1 260px' }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search exam #, patient ID, name, or modality…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {['all', 'Queued', 'In Progress', 'Approved'].map(st => (
            <button
              key={st}
              className={`filter-chip ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'all' ? 'All Examinations' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Examinations Queue Table */}
      <section className="table-card" style={{ background: 'var(--color-surface,#fff)', borderRadius: '12px', border: '1px solid var(--color-border,#e2ecef)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏳</div>
            Loading radiology examinations…
          </div>
        ) : filteredCases.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🩻</div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#1e293b' }}>No Radiology Cases Found</h3>
            <p style={{ margin: 0, fontSize: '0.88rem' }}>
              When Reception completes payment for CT Scan, X-Ray, or Ultrasound, examinations appear here automatically.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--color-background,#f8fafc)', borderBottom: '2px solid var(--color-border,#e2ecef)', color: 'var(--color-primary,#075c91)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Case / Patient</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Modality & Examination</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Registration Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Payment</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c, i) => {
                  const isApproved = ['Approved', 'Ready for Printing'].includes(c.status);
                  const examName = c.customExaminationName || (c.ultrasoundSubtype ? `Ultrasound (${c.ultrasoundSubtype})` : c.examinationType);

                  return (
                    <tr key={c._id} style={{ borderBottom: '1px solid var(--color-border,#edf2f7)' }}>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary,#075c91)' }}>{c.patient?.name || '—'}</div>
                        <small style={{ color: '#64748b' }}>{c.patient?.patientId} · {c.patient?.age} yrs / {c.patient?.sex} · 📍 {c.branchName}</small>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                          {examName}
                        </span>
                        <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                          {formatETB(c.price)}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569', fontSize: '12px' }}>
                        {c.patient?.registrationDate ? new Date(c.patient.registrationDate).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: '#dcfce7', color: '#166534', fontWeight: 600 }}>
                          ✓ Paid
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: isApproved ? '#dcfce7' : c.status === 'In Progress' ? '#fef3c7' : '#f1f5f9', color: isApproved ? '#166534' : c.status === 'In Progress' ? '#92400e' : '#475569', fontWeight: 600 }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          className="primary-button"
                          style={{ padding: '4px 10px', fontSize: '11.5px', fontWeight: 600 }}
                          onClick={() => openCaseModal(c)}
                        >
                          {isApproved ? '👁️ View Report' : '📝 Enter / Review Report'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Report Entry & Approval Modal */}
      <ModalPortal isOpen={!!selectedCase} onClose={closeCaseModal}>
        <div className="modal-content" style={{ maxWidth: '880px', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
          <header className="modal-header" style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderBottom: '1px solid #e2ecef', paddingBottom: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary, #075c91)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🩻</span> Radiology Report — {selectedCase?.customExaminationName || selectedCase?.examinationType} ({selectedCase?.caseNumber})
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Patient: <strong>{selectedCase?.patient?.name}</strong> ({selectedCase?.patient?.patientId}) · {selectedCase?.patient?.age} yrs / {selectedCase?.patient?.sex} · 📍 {selectedCase?.branchName}
              </p>
            </div>
            <button className="close-button" onClick={closeCaseModal}>&times;</button>
          </header>

          <div style={{ marginTop: '12px' }}>
            {/* Editor Option Tabs: Option A (Default) vs Option B */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2ecef', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setReportType('Option A')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderBottom: reportType === 'Option A' ? '3px solid var(--color-primary, #075c91)' : '3px solid transparent',
                    background: reportType === 'Option A' ? '#e0f2fe' : 'transparent',
                    color: reportType === 'Option A' ? 'var(--color-primary, #075c91)' : '#64748b',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '6px 6px 0 0'
                  }}
                >
                  📄 Option A — Copy / Paste Report (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('Option B')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderBottom: reportType === 'Option B' ? '3px solid var(--color-primary, #075c91)' : '3px solid transparent',
                    background: reportType === 'Option B' ? '#e0f2fe' : 'transparent',
                    color: reportType === 'Option B' ? 'var(--color-primary, #075c91)' : '#64748b',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '6px 6px 0 0'
                  }}
                >
                  📑 Option B — Professional Structured Report
                </button>
              </div>

              {/* Show / Hide Footer Toggle */}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showFooter}
                  onChange={e => setShowFooter(e.target.checked)}
                />
                Show ETU Logo & Footer on A4
              </label>
            </div>

            {/* ── OPTION A: RICH COPY/PASTE EDITOR ────────────────────────── */}
            {reportType === 'Option A' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.84rem', color: '#475569' }}>
                  <strong>💡 Option A Rich Document Editor:</strong> Type, paste from Microsoft Word (preserves font styles, headings, tables, and images), paste images from clipboard, or import a <code>.docx</code> file directly.
                </div>

                <RichReportEditor
                  value={reportContent}
                  onChange={setReportContent}
                  placeholder="Enter radiology imaging report, paste from Microsoft Word, or upload .docx report…"
                />
              </div>
            )}

            {/* ── OPTION B: STRUCTURED REPORT ENTRY ───────────────────────── */}
            {reportType === 'Option B' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Examination Title</label>
                    <input
                      type="text"
                      className="global-input"
                      value={structured.examination}
                      onChange={e => setStructured({ ...structured, examination: e.target.value })}
                      placeholder="e.g. Abdominal Ultrasound, Chest X-Ray"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Clinical Indications / History</label>
                    <textarea
                      className="global-input"
                      rows={1}
                      value={structured.clinicalInformation}
                      onChange={e => setStructured({ ...structured, clinicalInformation: e.target.value })}
                      placeholder="Clinical presentation & symptoms…"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Technique / Modality Protocol</label>
                  <input
                    type="text"
                    className="global-input"
                    value={structured.technique}
                    onChange={e => setStructured({ ...structured, technique: e.target.value })}
                    placeholder="Scanning parameters or radiography views…"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Ultrasound Abdominal Specific Organs */}
                {selectedCase?.examinationType === 'Ultrasound' && selectedCase?.ultrasoundSubtype === 'Abdominal' && (
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--color-primary, #075c91)', textTransform: 'uppercase' }}>
                      Organ-Specific Sonographic Findings
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '2px' }}>Liver</label>
                        <input type="text" className="global-input" value={structured.liver} onChange={e => setStructured({ ...structured, liver: e.target.value })} placeholder="Size, parenchymal echogenicity, focal lesions…" style={{ width: '100%', fontSize: '12.5px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '2px' }}>Gallbladder & Biliary Tree</label>
                        <input type="text" className="global-input" value={structured.gallbladder} onChange={e => setStructured({ ...structured, gallbladder: e.target.value })} placeholder="Wall thickness, calculi, CBD diameter…" style={{ width: '100%', fontSize: '12.5px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '2px' }}>Pancreas</label>
                        <input type="text" className="global-input" value={structured.pancreas} onChange={e => setStructured({ ...structured, pancreas: e.target.value })} placeholder="Head, body, tail visualization…" style={{ width: '100%', fontSize: '12.5px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '2px' }}>Spleen</label>
                        <input type="text" className="global-input" value={structured.spleen} onChange={e => setStructured({ ...structured, spleen: e.target.value })} placeholder="Dimensions, echotexture, splenomegaly…" style={{ width: '100%', fontSize: '12.5px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '2px' }}>Kidneys</label>
                        <input type="text" className="global-input" value={structured.kidneys} onChange={e => setStructured({ ...structured, kidneys: e.target.value })} placeholder="Cortical thickness, corticomedullary differentiation, hydronephrosis…" style={{ width: '100%', fontSize: '12.5px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '2px' }}>Urinary Bladder</label>
                        <input type="text" className="global-input" value={structured.urinaryBladder} onChange={e => setStructured({ ...structured, urinaryBladder: e.target.value })} placeholder="Distension, wall regularity, post-void residual…" style={{ width: '100%', fontSize: '12.5px' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>General Imaging Findings</label>
                  <textarea
                    className="global-input"
                    rows={4}
                    value={structured.findings}
                    onChange={e => setStructured({ ...structured, findings: e.target.value })}
                    placeholder="Comprehensive radiological observations & findings…"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px', color: 'var(--color-primary, #075c91)' }}>
                    Impression / Conclusion *
                  </label>
                  <textarea
                    className="global-input"
                    rows={2}
                    value={structured.impression}
                    onChange={e => setStructured({ ...structured, impression: e.target.value })}
                    placeholder="Diagnostic impression and radiological conclusion…"
                    style={{ width: '100%', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Recommendations</label>
                  <textarea
                    className="global-input"
                    rows={2}
                    value={structured.recommendation}
                    onChange={e => setStructured({ ...structured, recommendation: e.target.value })}
                    placeholder="e.g. Correlate clinically, repeat scan in 3 months"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* Approval Info Banner */}
            <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', background: '#e0f2fe', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <div>
                <strong>Approved By:</strong> Dr. {user?.fullName || 'Radiologist'} · <em>Radiologist</em>
              </div>
              <div style={{ color: '#0369a1', fontWeight: 600 }}>
                {selectedCase?.approvedAt ? `Approved on ${new Date(selectedCase.approvedAt).toLocaleString()}` : 'Ready for Sign-off'}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="button" className="secondary-button" onClick={closeCaseModal}>
                Close
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleSaveDraft}
                disabled={saving || approving}
                style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}
              >
                {saving ? 'Saving Draft…' : '💾 Save Draft'}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleApproveReport}
                disabled={saving || approving}
                style={{ background: '#16a34a', borderColor: '#15803d' }}
              >
                {approving ? 'Approving…' : '✅ Confirm / Approve Report'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </section>
  );
}
