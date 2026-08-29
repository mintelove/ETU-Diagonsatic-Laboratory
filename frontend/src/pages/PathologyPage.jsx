/**
 * ETU Diagnostic Laboratory — Pathologist Workspace
 *
 * Professional Medical LIS Interface for Pathologists to review assigned cases,
 * track 20-day (Biopsy) and 24-hour (FNAC / Peripheral Morphology) countdown deadlines,
 * enter reports via Option A (Specialist Rich Document / Word Import) or Option B (Structured Clinical Findings),
 * preview live A4 reports, toggle ETU branding, and approve reports.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api, isSilentNetworkError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { formatETB } from '../utils/currencyHelper.js';
import ModalPortal from '../components/ModalPortal.jsx';
import RichReportEditor from '../components/RichReportEditor.jsx';
import { ReportPreview } from '../components/ReportPreview.jsx';
import { printLabReport } from '../utils/printLabReport.js';
import labLogo from '../assets/etu.jpg';

// Live countdown calculator
function getCountdown(deadlineStr) {
  if (!deadlineStr) return { text: '—', isOverdue: false };
  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffMs = deadline - now;

  if (diffMs <= 0) {
    const overdueMs = Math.abs(diffMs);
    const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
    const overdueDays = Math.floor(overdueHours / 24);
    if (overdueDays > 0) return { text: `Overdue by ${overdueDays}d ${overdueHours % 24}h`, isOverdue: true };
    return { text: `Overdue by ${overdueHours}h ${Math.floor((overdueMs / 60000) % 60)}m`, isOverdue: true };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return { text: `${days}d ${hours}h ${minutes}m remaining`, isOverdue: false };
  }
  return { text: `${hours}h ${minutes}m remaining`, isOverdue: false };
}

export default function PathologyPage() {
  const { user, token } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState(null);

  // Active Case Editor Modal
  const [selectedCase, setSelectedCase] = useState(null);
  const [reportType, setReportType] = useState('Option A'); // Option A (Default) or Option B (Structured)
  const [reportContent, setReportContent] = useState('');
  const [showFooter, setShowFooter] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Structured fields for Option B
  const [structured, setStructured] = useState({
    clinicalHistory: '',
    specimen: '',
    procedure: '',
    grossDescription: '',
    microscopicDescription: '',
    cytologicalFindings: '',
    rbcMorphology: '',
    wbcMorphology: '',
    plateletMorphology: '',
    peripheralBloodFindings: '',
    impression: '',
    diagnosis: '',
    comments: '',
    recommendation: '',
    pathologistNotes: ''
  });

  const editorRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api('/pathology/queue', { token });
      setCases(data.cases || []);
    } catch (e) {
      if (!isSilentNetworkError(e)) {
        showToast(e.message || 'Failed to load pathology queue.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadQueue();
    const handleUpdate = () => loadQueue();
    subscribe('pathology:change', handleUpdate);
    subscribe('reception:change', handleUpdate);
    return () => {
      unsubscribe('pathology:change', handleUpdate);
      unsubscribe('reception:change', handleUpdate);
    };
  }, [loadQueue, subscribe, unsubscribe]);

  // Tick countdowns every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const openCaseModal = (c) => {
    setSelectedCase(c);
    setReportType(c.reportType || 'Option A');
    setReportContent(c.reportContent || '');
    setShowFooter(c.showFooter !== undefined ? c.showFooter : true);
    setStructured({
      clinicalHistory: c.structuredReport?.clinicalHistory || '',
      specimen: c.structuredReport?.specimen || (c.testType === 'Biopsy' ? 'Biopsy Tissue' : c.testType === 'FNAC' ? 'Aspiration Cytology' : 'Peripheral Blood Film'),
      procedure: c.structuredReport?.procedure || '',
      grossDescription: c.structuredReport?.grossDescription || '',
      microscopicDescription: c.structuredReport?.microscopicDescription || '',
      cytologicalFindings: c.structuredReport?.cytologicalFindings || '',
      rbcMorphology: c.structuredReport?.rbcMorphology || '',
      wbcMorphology: c.structuredReport?.wbcMorphology || '',
      plateletMorphology: c.structuredReport?.plateletMorphology || '',
      peripheralBloodFindings: c.structuredReport?.peripheralBloodFindings || '',
      impression: c.structuredReport?.impression || '',
      diagnosis: c.structuredReport?.diagnosis || '',
      comments: c.structuredReport?.comments || '',
      recommendation: c.structuredReport?.recommendation || '',
      pathologistNotes: c.structuredReport?.pathologistNotes || ''
    });
  };

  const closeCaseModal = () => {
    setSelectedCase(null);
    setPreviewModalOpen(false);
  };

  // Construct synthetic live report object for preview & print
  const liveReport = useMemo(() => {
    if (!selectedCase) return null;
    return {
      ...selectedCase,
      testType: selectedCase.testType,
      patient: selectedCase.patient,
      reportType,
      reportContent: reportType === 'Option A' && editorRef.current ? editorRef.current.innerHTML : reportContent,
      structuredReport: structured,
      showFooter,
      status: selectedCase.status || 'In Progress',
      pathologist: user,
      approvedBy: selectedCase.approvedBy || user,
      approvedDate: selectedCase.approvedAt || new Date()
    };
  }, [selectedCase, reportType, reportContent, structured, showFooter, user]);

  const handleSaveDraft = async () => {
    if (!selectedCase) return;
    try {
      setSaving(true);
      const htmlContent = reportType === 'Option A' && editorRef.current ? editorRef.current.innerHTML : reportContent;
      await api(`/pathology/cases/${selectedCase._id}/draft`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          reportType,
          reportContent: htmlContent,
          structuredReport: structured,
          showFooter
        })
      });
      showToast('Pathology draft saved successfully.');
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
      
      // Validation check
      if (reportType === 'Option A' && (!htmlContent || !htmlContent.trim() || htmlContent === '<br>')) {
        showToast('Please paste or write the pathology report content before confirming approval.', 'error');
        setApproving(false);
        return;
      }
      if (reportType === 'Option B') {
        const hasField = Object.values(structured).some(v => v && String(v).trim());
        if (!hasField) {
          showToast('Please fill in the structured report fields before confirming approval.', 'error');
          setApproving(false);
          return;
        }
      }

      await api(`/pathology/cases/${selectedCase._id}/approve`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          reportType,
          reportContent: htmlContent,
          structuredReport: structured,
          showFooter
        })
      });

      showToast(`Pathology report approved! Ready for Reception to print.`);
      closeCaseModal();
      loadQueue();
    } catch (e) {
      showToast(e.message || 'Failed to approve report.', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleDirectPrint = () => {
    if (!liveReport) return;
    printLabReport(liveReport, token, user, showFooter);
  };

  // Filtered queue
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!search) return true;
      const lower = search.toLowerCase();
      return (
        c.caseNumber?.toLowerCase().includes(lower) ||
        c.testType?.toLowerCase().includes(lower) ||
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
    const overdue = cases.filter(c => ['Queued', 'In Progress'].includes(c.status) && new Date(c.reportingDeadline) < new Date()).length;
    return { total, queued, inProgress, approved, overdue };
  }, [cases]);

  return (
    <section className="clinical-workspace-page pathology-page">
      {/* Toast Notification */}
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
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}
        >
          <span>{toast.type === 'error' ? '❌' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. COMPACT SPECIALIST WORKSPACE HEADER ───────────────────────── */}
      <header className="clinical-dept-banner">
        <div className="clinical-dept-title">
          <span className="clinical-dept-icon">🔬</span>
          <div>
            <p className="clinical-dept-subtitle">ETU DIAGNOSTIC LABORATORY</p>
            <h1>PATHOLOGY RESULT ENTRY &amp; WORKSPACE</h1>
          </div>
        </div>
        <div className="clinical-specialist-badge">
          <span>👨‍⚕️</span>
          <span>Authenticated Specialist: <strong>Dr. {user?.fullName}</strong></span>
          <span>· 📍 {user?.branchName || 'Main'}</span>
        </div>
      </header>

      {/* ── 2. MEDICAL KPI SUMMARY CARDS ─────────────────────────────────── */}
      <div className="clinical-stats-grid">
        <article className="stat-card blue">
          <div className="stat-card-header">
            <small>TOTAL CASES</small>
            <span>📊</span>
          </div>
          <strong>{stats.total}</strong>
          <span className="stat-desc">All assigned cases</span>
        </article>
        <article className="stat-card orange">
          <div className="stat-card-header">
            <small>WAITING EXAMINATION</small>
            <span>⏳</span>
          </div>
          <strong>{stats.queued}</strong>
          <span className="stat-desc">Awaiting pathology review</span>
        </article>
        <article className="stat-card purple">
          <div className="stat-card-header">
            <small>IN PROGRESS</small>
            <span>🔬</span>
          </div>
          <strong>{stats.inProgress}</strong>
          <span className="stat-desc">Under laboratory evaluation</span>
        </article>
        <article className="stat-card green">
          <div className="stat-card-header">
            <small>APPROVED REPORTS</small>
            <span>✅</span>
          </div>
          <strong>{stats.approved}</strong>
          <span className="stat-desc">Ready for printing / released</span>
        </article>
        {stats.overdue > 0 && (
          <article className="stat-card red" style={{ borderColor: '#ef4444' }}>
            <div className="stat-card-header">
              <small style={{ color: '#b91c1c' }}>⚠️ OVERDUE DEADLINE</small>
            </div>
            <strong style={{ color: '#b91c1c' }}>{stats.overdue}</strong>
            <span className="stat-desc" style={{ color: '#b91c1c' }}>Target TAT exceeded</span>
          </article>
        )}
      </div>

      {/* ── 3. WORKLIST TITLE & FILTER TOOLBAR ────────────────────────────── */}
      <div className="clinical-worklist-header">
        <div className="clinical-worklist-title">
          <span>📋</span> PATHOLOGY PATIENT WORKLIST
        </div>
      </div>

      <div className="users-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search patient ID, case number, patient name, or examination…"
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
              {st === 'all' ? 'All Cases' : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. CASES QUEUE TABLE ─────────────────────────────────────────── */}
      <section className="table-card">
        {loading ? (
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>⏳</div>
            Loading pathology cases…
          </div>
        ) : filteredCases.length === 0 ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🔬</div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: 'var(--color-on-surface, #1e293b)' }}>No Pathology Cases Waiting</h3>
            <p style={{ margin: 0, fontSize: '0.84rem' }}>
              When Reception completes payment for Biopsy, FNAC, or Peripheral Morphology, cases appear in this worklist automatically.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '40px' }}>#</th>
                  <th style={{ textAlign: 'left' }}>Patient / Case</th>
                  <th style={{ textAlign: 'left' }}>Examination &amp; Fee</th>
                  <th style={{ textAlign: 'left' }}>Turnaround &amp; Countdown</th>
                  <th style={{ textAlign: 'left' }}>Registration Date</th>
                  <th style={{ textAlign: 'center' }}>Payment</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c, i) => {
                  const countdown = getCountdown(c.reportingDeadline);
                  const isBiopsy = c.testType === 'Biopsy';
                  const isApproved = ['Approved', 'Ready for Printing'].includes(c.status);

                  return (
                    <tr key={c._id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>{i + 1}</td>
                      <td>
                        <div className="patient-cell-name">{c.patient?.name || '—'}</div>
                        <div className="patient-cell-meta">{c.patient?.patientId} · {c.patient?.age} yrs / {c.patient?.sex} · 📍 {c.branchName}</div>
                      </td>
                      <td>
                        <span className={`badge-modality ${isBiopsy ? 'badge-biopsy' : ''}`}>
                          {c.testType}
                        </span>
                        <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 700, marginTop: '2px' }}>
                          {formatETB(c.price)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '11.5px', fontWeight: 600, color: isApproved ? '#166534' : countdown.isOverdue ? '#b91c1c' : '#0369a1' }}>
                          {isApproved ? '✅ Completed' : (
                            <>
                              <span>⏱️ {isBiopsy ? '20-Day Target' : '24-Hour Target'}</span>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: countdown.isOverdue ? '#b91c1c' : 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
                                {countdown.text}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-on-surface, #475569)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {c.patient?.registrationDate ? new Date(c.patient.registrationDate).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge-status-paid">✓ Paid</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={isApproved ? 'badge-status-approved' : c.status === 'In Progress' ? 'badge-status-progress' : 'badge-status-queued'}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-open-case"
                          onClick={() => openCaseModal(c)}
                        >
                          <span>{isApproved ? '👁️' : '📝'}</span>
                          <span>{isApproved ? 'View / Edit →' : 'Open Case →'}</span>
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

      {/* ── 5. PROFESSIONAL RESULT ENTRY MODAL ────────────────────────────── */}
      {selectedCase && (
        <ModalPortal isOpen={!!selectedCase} onClose={closeCaseModal}>
          <div className="modal-content clinical-modal-dialog" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <header className="clinical-modal-header">
              <div>
                <h2>
                  <span>🔬</span> PATHOLOGY RESULT ENTRY — {selectedCase?.testType}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
                  Case Ref: <strong>{selectedCase?.caseNumber}</strong> · Branch: <strong>{selectedCase?.branchName}</strong>
                </div>
              </div>
              <button className="close-button" onClick={closeCaseModal}>&times;</button>
            </header>

            <div style={{ padding: '1.25rem' }}>
              {/* ── CARD 1: PATIENT & CASE INFORMATION ── */}
              <section className="clinical-card">
                <div className="clinical-card-header">
                  <span>🧑‍⚕️</span> Patient &amp; Case Information
                </div>
                <div className="clinical-patient-grid">
                  <div className="clinical-patient-field">
                    <small>Patient Name</small>
                    <strong>{selectedCase?.patient?.name || '—'}</strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Patient ID</small>
                    <strong>{selectedCase?.patient?.patientId || '—'}</strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Age / Sex</small>
                    <strong>{selectedCase?.patient?.age} yrs / {selectedCase?.patient?.sex}</strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Phone</small>
                    <strong>{selectedCase?.patient?.phone || '—'}</strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Patient Type</small>
                    <strong>{selectedCase?.patient?.patientType || 'Self'}</strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Examination Type</small>
                    <strong style={{ color: 'var(--color-primary, #075c91)' }}>{selectedCase?.testType}</strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Registration Date</small>
                    <strong>{selectedCase?.patient?.registrationDate ? new Date(selectedCase.patient.registrationDate).toLocaleString() : '—'}</strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Turnaround Target</small>
                    <strong>{selectedCase?.testType === 'Biopsy' ? '20-Day Standard' : '24-Hour Target'}</strong>
                  </div>
                </div>
              </section>

              {/* ── CARD 2: ETU REPORT HEADER BRANDING PREVIEW ── */}
              <div className={`clinical-etu-header-preview ${showFooter ? '' : 'hidden-branding'}`}>
                {showFooter ? (
                  <>
                    <img src={labLogo} alt="ETU Diagnostic Laboratory" className="clinical-etu-logo-img" />
                    <div className="clinical-etu-header-text">ETU DIAGNOSTIC LABORATORY · OFFICIAL PATHOLOGY REPORT</div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.85rem', fontStyle: 'italic', padding: '8px 0' }}>
                    ETU Header & Footer Branding is currently <strong>Hidden</strong> for plain paper printing.
                  </div>
                )}
              </div>

              {/* ── CARD 3: OPTION A / OPTION B SWITCHER & BRANDING TOGGLE ── */}
              <div className="clinical-tabs-bar">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`clinical-tab-btn ${reportType === 'Option A' ? 'active' : ''}`}
                    onClick={() => setReportType('Option A')}
                  >
                    <span>📄</span> OPTION A — SPECIALIST REPORT (Copy / Paste / Word Docx)
                  </button>
                  <button
                    type="button"
                    className={`clinical-tab-btn ${reportType === 'Option B' ? 'active' : ''}`}
                    onClick={() => setReportType('Option B')}
                  >
                    <span>📑</span> OPTION B — STRUCTURED RESULT ENTRY
                  </button>
                </div>

                {/* Show/Hide Branding Toggle Switch */}
                <label className="clinical-branding-toggle">
                  <input
                    type="checkbox"
                    checked={showFooter}
                    onChange={e => setShowFooter(e.target.checked)}
                  />
                  <span>Show ETU Header &amp; Footer</span>
                </label>
              </div>

              {/* ── OPTION A: RICH COPY/PASTE DOCUMENT EDITOR ── */}
              {reportType === 'Option A' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ background: 'var(--color-surface-container, #f8fafc)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-outline-variant, #e2e8f0)', fontSize: '0.84rem', color: 'var(--color-on-surface, #475569)' }}>
                    <strong>💡 Option A Specialist Editor:</strong> Type, paste from Microsoft Word (preserves font styling, tables, headings, and images), paste images from clipboard (Ctrl+V), or import a <code>.docx</code> file directly.
                  </div>

                  <RichReportEditor
                    value={reportContent}
                    onChange={setReportContent}
                    placeholder="Enter comprehensive pathology findings, paste from Microsoft Word, or upload .docx report…"
                  />
                </div>
              )}

              {/* ── OPTION B: STRUCTURED CLINICAL FIELDS ── */}
              {reportType === 'Option B' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                    <div className="clinical-form-group">
                      <label>Clinical History / Indications</label>
                      <textarea
                        className="clinical-textarea"
                        rows={2}
                        value={structured.clinicalHistory}
                        onChange={e => setStructured({ ...structured, clinicalHistory: e.target.value })}
                        placeholder="Clinical presentation & relevant history…"
                      />
                    </div>

                    <div className="clinical-form-group">
                      <label>Specimen / Anatomical Site</label>
                      <input
                        type="text"
                        className="clinical-input"
                        value={structured.specimen}
                        onChange={e => setStructured({ ...structured, specimen: e.target.value })}
                        placeholder="e.g. Left Breast Mass, Cervical Lymph Node"
                      />
                    </div>
                  </div>

                  {selectedCase?.testType === 'Biopsy' && (
                    <>
                      <div className="clinical-form-group">
                        <label>Gross Description</label>
                        <textarea
                          className="clinical-textarea"
                          rows={2}
                          value={structured.grossDescription}
                          onChange={e => setStructured({ ...structured, grossDescription: e.target.value })}
                          placeholder="Macroscopic appearance, dimensions, color, consistency…"
                        />
                      </div>

                      <div className="clinical-form-group">
                        <label>Microscopic Description</label>
                        <textarea
                          className="clinical-textarea"
                          rows={3}
                          value={structured.microscopicDescription}
                          onChange={e => setStructured({ ...structured, microscopicDescription: e.target.value })}
                          placeholder="Histopathological cellular architecture, nuclear features, stroma…"
                        />
                      </div>
                    </>
                  )}

                  {selectedCase?.testType === 'FNAC' && (
                    <div className="clinical-form-group">
                      <label>Cytological Findings</label>
                      <textarea
                        className="clinical-textarea"
                        rows={3}
                        value={structured.cytologicalFindings}
                        onChange={e => setStructured({ ...structured, cytologicalFindings: e.target.value })}
                        placeholder="Smear adequacy, cell clusters, background, nuclear atypia…"
                      />
                    </div>
                  )}

                  {selectedCase?.testType === 'Peripheral Morphology' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div className="clinical-form-group">
                        <label>RBC Morphology</label>
                        <textarea
                          className="clinical-textarea"
                          rows={2}
                          value={structured.rbcMorphology}
                          onChange={e => setStructured({ ...structured, rbcMorphology: e.target.value })}
                          placeholder="Normochromic, microcytic…"
                        />
                      </div>
                      <div className="clinical-form-group">
                        <label>WBC Morphology</label>
                        <textarea
                          className="clinical-textarea"
                          rows={2}
                          value={structured.wbcMorphology}
                          onChange={e => setStructured({ ...structured, wbcMorphology: e.target.value })}
                          placeholder="Count, differential, toxic granules…"
                        />
                      </div>
                      <div className="clinical-form-group">
                        <label>Platelet Morphology</label>
                        <textarea
                          className="clinical-textarea"
                          rows={2}
                          value={structured.plateletMorphology}
                          onChange={e => setStructured({ ...structured, plateletMorphology: e.target.value })}
                          placeholder="Adequate, clumps, giant forms…"
                        />
                      </div>
                    </div>
                  )}

                  <div className="clinical-form-group">
                    <label>
                      Pathological Diagnosis / Impression <span className="required">*</span>
                    </label>
                    <textarea
                      className="clinical-textarea"
                      rows={2}
                      value={structured.diagnosis}
                      onChange={e => setStructured({ ...structured, diagnosis: e.target.value })}
                      placeholder="Definitive pathological diagnosis…"
                      style={{ fontWeight: 700 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="clinical-form-group">
                      <label>Comments / Remarks</label>
                      <textarea
                        className="clinical-textarea"
                        rows={2}
                        value={structured.comments}
                        onChange={e => setStructured({ ...structured, comments: e.target.value })}
                        placeholder="Additional pathological notes"
                      />
                    </div>

                    <div className="clinical-form-group">
                      <label>Recommendations</label>
                      <textarea
                        className="clinical-textarea"
                        rows={2}
                        value={structured.recommendation}
                        onChange={e => setStructured({ ...structured, recommendation: e.target.value })}
                        placeholder="e.g. Immunohistochemistry, close follow-up"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── CARD 4: SPECIALIST AUTHENTICATED SIGNOFF BANNER ── */}
              <div className="clinical-signoff-banner">
                <div>
                  <span className="clinical-signoff-title">Approved By:</span> Dr. {user?.fullName || 'Pathologist'} · <em>Pathologist (Logged-in Specialist)</em>
                </div>
                <div style={{ fontWeight: 700 }}>
                  {selectedCase?.approvedAt ? `Approved on ${new Date(selectedCase.approvedAt).toLocaleString()}` : 'Ready for Direct Sign-off'}
                </div>
              </div>

              {/* ── CARD 5: ACTIONS TOOLBAR ── */}
              <div className="clinical-actions-toolbar">
                <button type="button" className="btn-clinical-draft" onClick={closeCaseModal}>
                  Close
                </button>

                <div className="clinical-btn-group">
                  <button
                    type="button"
                    className="btn-clinical-draft"
                    onClick={handleSaveDraft}
                    disabled={saving || approving}
                  >
                    <span>💾</span> {saving ? 'Saving Draft…' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    className="btn-clinical-preview"
                    onClick={() => setPreviewModalOpen(true)}
                  >
                    <span>👁️</span> Preview A4 Report
                  </button>
                  <button
                    type="button"
                    className="btn-clinical-print"
                    onClick={handleDirectPrint}
                  >
                    <span>🖨️</span> Print A4 Report
                  </button>
                  <button
                    type="button"
                    className="btn-clinical-approve"
                    onClick={handleApproveReport}
                    disabled={saving || approving}
                  >
                    <span>✅</span> {approving ? 'Approving…' : 'Confirm & Approve Report'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ── 6. DEDICATED A4 REPORT PREVIEW MODAL ──────────────────────────── */}
      {previewModalOpen && liveReport && (
        <ModalPortal isOpen={previewModalOpen} onClose={() => setPreviewModalOpen(false)}>
          <div
            className="modal-content"
            style={{
              maxWidth: '880px',
              maxHeight: '94vh',
              overflowY: 'auto',
              padding: '0',
              background: '#cbd5e1',
              borderRadius: '12px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <header
              style={{
                position: 'sticky',
                top: 0,
                background: 'var(--color-surface, #ffffff)',
                zIndex: 30,
                padding: '12px 20px',
                borderBottom: '1px solid var(--color-outline-variant, #cbd5e1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '1.15rem', color: 'var(--color-primary, #075c91)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📄</span> Pathology A4 Report Preview
                </h2>
                <label className="clinical-branding-toggle">
                  <input
                    type="checkbox"
                    checked={showFooter}
                    onChange={e => setShowFooter(e.target.checked)}
                  />
                  <span>Show ETU Header &amp; Footer</span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-clinical-print"
                  onClick={handleDirectPrint}
                >
                  <span>🖨️</span> Print A4 Report
                </button>
                <button className="close-button" onClick={() => setPreviewModalOpen(false)}>&times;</button>
              </div>
            </header>

            {/* A4 Document Canvas */}
            <div style={{ padding: '24px 16px', display: 'flex', justifyContent: 'center', background: '#cbd5e1' }}>
              <ReportPreview report={liveReport} showFooter={showFooter} />
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  );
}
