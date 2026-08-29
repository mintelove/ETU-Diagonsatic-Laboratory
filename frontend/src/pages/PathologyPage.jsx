/**
 * ETU Diagnostic Laboratory — Pathologist Workspace
 *
 * Professional Medical LIS Card-Based Interface for Pathologists to review assigned cases,
 * track 20-day (Biopsy) and 24-hour (FNAC / Peripheral Morphology) countdown deadlines,
 * across both Main and Otona branches (Global queue).
 * Supports editing existing reports via Option A or Option B, preserving existing content,
 * previewing live A4 reports, toggling ETU branding, and returning reports to the original sending receptionist.
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
    return { text: `${days}d ${hours}h remaining`, isOverdue: false };
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
        showToast('Please enter or paste the pathology report content before approving.', 'error');
        setApproving(false);
        return;
      }
      if (reportType === 'Option B') {
        const hasField = Object.values(structured).some(v => v && String(v).trim());
        if (!hasField) {
          showToast('Please fill in the structured report fields before approving.', 'error');
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

      showToast(`Pathology report approved! Ready for original sending Receptionist.`);
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
        c.patient?.phone?.toLowerCase().includes(lower) ||
        c.branchName?.toLowerCase().includes(lower) ||
        c.registeredBy?.fullName?.toLowerCase().includes(lower)
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
            fontWeight: 700,
            zIndex: 2500,
            background: toast.type === 'error' ? '#DC2626' : '#16A34A',
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

      {/* ── 1. PAGE HEADER CARD ─────────────────────────────────────────── */}
      <header className="clinical-page-header">
        <div className="clinical-header-info">
          <div className="clinical-header-icon-box">🔬</div>
          <div className="clinical-header-text">
            <p className="clinical-header-sub">ETU DIAGNOSTIC LABORATORY</p>
            <h1>PATHOLOGY WORKSPACE</h1>
          </div>
        </div>
        <div className="clinical-specialist-card-badge">
          <div className="clinical-specialist-doctor">
            <span>👨‍⚕️</span> Dr. {user?.fullName || 'Specialist'}
          </div>
          <div className="clinical-specialist-meta">
            Authenticated Pathologist · <strong>Global (Main &amp; Otona)</strong>
          </div>
        </div>
      </header>

      {/* ── 2. FOUR SUMMARY KPI CARDS ───────────────────────────────────── */}
      <div className="clinical-kpi-grid">
        <article className="clinical-kpi-card blue">
          <div className="clinical-kpi-header">
            <h3 className="clinical-kpi-title">TOTAL CASES</h3>
            <div className="clinical-kpi-icon-pill">📊</div>
          </div>
          <div className="clinical-kpi-number">{stats.total}</div>
          <p className="clinical-kpi-desc">All cross-branch cases</p>
        </article>

        <article className="clinical-kpi-card orange">
          <div className="clinical-kpi-header">
            <h3 className="clinical-kpi-title">WAITING EXAMINATION</h3>
            <div className="clinical-kpi-icon-pill">⏳</div>
          </div>
          <div className="clinical-kpi-number">{stats.queued}</div>
          <p className="clinical-kpi-desc">Awaiting pathology review</p>
        </article>

        <article className="clinical-kpi-card purple">
          <div className="clinical-kpi-header">
            <h3 className="clinical-kpi-title">IN PROGRESS</h3>
            <div className="clinical-kpi-icon-pill">🔬</div>
          </div>
          <div className="clinical-kpi-number">{stats.inProgress}</div>
          <p className="clinical-kpi-desc">Laboratory analysis active</p>
        </article>

        <article className="clinical-kpi-card green">
          <div className="clinical-kpi-header">
            <h3 className="clinical-kpi-title">APPROVED REPORTS</h3>
            <div className="clinical-kpi-icon-pill">✅</div>
          </div>
          <div className="clinical-kpi-number">{stats.approved}</div>
          <p className="clinical-kpi-desc">Ready for printing / released</p>
        </article>
      </div>

      {/* ── 3. WORKLIST CARD & CONTROLS ─────────────────────────────────── */}
      <div className="clinical-worklist-card">
        <div className="clinical-worklist-top-bar">
          <h2 className="clinical-worklist-heading">
            <span>📋</span> PATHOLOGY WORKLIST (CROSS-BRANCH)
          </h2>

          <div className="clinical-search-input-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search patient ID, name, branch, case number, examination…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="clinical-segmented-filters">
            {[
              { id: 'all', label: 'All' },
              { id: 'Queued', label: 'Queued' },
              { id: 'In Progress', label: 'In Progress' },
              { id: 'Approved', label: 'Approved' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                className={`clinical-filter-button ${statusFilter === f.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 4. PATIENT WORKLIST CARDS ─────────────────────────────────── */}
        {loading ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>⏳</div>
            <strong style={{ color: '#0F172A' }}>Loading pathology worklist…</strong>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="clinical-empty-card">
            <div className="clinical-empty-icon">🔬</div>
            <h3 className="clinical-empty-title">No Pathology Cases Found</h3>
            <p className="clinical-empty-text">
              {search || statusFilter !== 'all'
                ? 'No cases match your search query or selected filter.'
                : 'When Reception registers and bills Biopsy, FNAC, or Peripheral Morphology from Main or Otona branches, cases appear in this worklist automatically.'}
            </p>
          </div>
        ) : (
          <div className="clinical-patient-cards-list">
            {filteredCases.map(c => {
              const countdown = getCountdown(c.reportingDeadline);
              const isBiopsy = c.testType === 'Biopsy';
              const isApproved = ['Approved', 'Ready for Printing'].includes(c.status);
              const statusClass = isApproved ? 'ready' : c.status === 'In Progress' ? 'in-progress' : 'queued';
              const senderName = c.registeredBy?.fullName || c.patient?.registeredBy?.fullName || 'Reception';

              return (
                <div key={c._id} className="clinical-patient-case-card">
                  {/* Patient Info */}
                  <div className="clinical-col-patient">
                    <div className="clinical-patient-name">{c.patient?.name || 'Unknown Patient'}</div>
                    <div className="clinical-patient-subtext">
                      <span className="clinical-patient-id-badge">{c.patient?.patientId}</span>
                      <span>· {c.patient?.age} yrs / {c.patient?.sex}</span>
                      <span style={{ color: '#0369A1', fontWeight: 700 }}>· 📍 {c.branchName} Branch</span>
                      <span>· 👨‍💼 Sent by: <strong>{senderName}</strong></span>
                    </div>
                  </div>

                  {/* Examination */}
                  <div className="clinical-col-exam">
                    <span className="clinical-exam-label">Examination</span>
                    <span className={`clinical-exam-badge ${isBiopsy ? 'biopsy' : ''}`}>
                      {c.testType}
                    </span>
                    <span className="clinical-exam-fee">{formatETB(c.price)}</span>
                  </div>

                  {/* Date & Turnaround */}
                  <div className="clinical-col-date">
                    <span className="clinical-exam-label">Date &amp; Turnaround</span>
                    <span className="clinical-date-text">
                      {c.patient?.registrationDate ? new Date(c.patient.registrationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                    <span className={`clinical-countdown-text ${countdown.isOverdue ? 'overdue' : ''}`}>
                      {isApproved ? '✅ Completed' : `⏱️ ${countdown.text}`}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="clinical-col-status">
                    <span className="clinical-exam-label">Status</span>
                    <span className={`clinical-status-pill ${statusClass}`}>
                      {isApproved ? 'Ready for Printing' : c.status}
                    </span>
                  </div>

                  {/* Action */}
                  <div>
                    <button
                      type="button"
                      className="btn-clinical-open-case"
                      onClick={() => openCaseModal(c)}
                    >
                      <span>{isApproved ? '👁️' : '📝'}</span>
                      <span>{isApproved ? 'VIEW / EDIT' : 'OPEN CASE'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 5. PROFESSIONAL RESULT ENTRY & EDITING MODAL ──────────────────── */}
      {selectedCase && (
        <ModalPortal isOpen={!!selectedCase} onClose={closeCaseModal}>
          <div className="modal-content clinical-modal-dialog" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <header className="clinical-modal-header">
              <div>
                <h2>
                  <span>🔬</span> PATHOLOGY REPORT — {selectedCase?.testType}
                  {['Approved', 'Ready for Printing'].includes(selectedCase?.status) && (
                    <span className="clinical-status-pill ready" style={{ marginLeft: '10px', fontSize: '0.75rem' }}>
                      ✓ Approved (Edit Mode)
                    </span>
                  )}
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px', fontWeight: 600 }}>
                  Case Ref: <strong>{selectedCase?.caseNumber}</strong> · Branch: <strong>{selectedCase?.branchName}</strong> · Sent by: <strong>{selectedCase?.registeredBy?.fullName || selectedCase?.patient?.registeredBy?.fullName || 'Reception'}</strong>
                </div>
              </div>
              <button className="close-button" onClick={closeCaseModal}>&times;</button>
            </header>

            <div style={{ padding: '1.5rem' }}>
              {/* ── PATIENT & CASE INFORMATION CARD ── */}
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
                    <small>Originating Branch</small>
                    <strong style={{ color: '#0369A1' }}>📍 {selectedCase?.branchName} Branch</strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Original Sender</small>
                    <strong>{selectedCase?.registeredBy?.fullName || selectedCase?.patient?.registeredBy?.fullName || 'Receptionist'}</strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Examination Type</small>
                    <strong style={{ color: '#0284C7' }}>{selectedCase?.testType}</strong>
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

              {/* ── ETU REPORT HEADER BRANDING PREVIEW ── */}
              <div className={`clinical-etu-header-preview ${showFooter ? '' : 'hidden-branding'}`}>
                {showFooter ? (
                  <>
                    <img src={labLogo} alt="ETU Diagnostic Laboratory" className="clinical-etu-logo-img" />
                    <div className="clinical-etu-header-text">ETU DIAGNOSTIC LABORATORY · OFFICIAL PATHOLOGY REPORT</div>
                  </>
                ) : (
                  <div style={{ color: '#64748B', fontSize: '0.85rem', fontStyle: 'italic', padding: '8px 0', fontWeight: 600 }}>
                    ETU Header & Footer Branding is currently <strong>Hidden</strong> for plain paper printing.
                  </div>
                )}
              </div>

              {/* ── OPTION A / OPTION B SWITCHER & BRANDING TOGGLE ── */}
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
                  <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.84rem', color: '#475569', fontWeight: 600 }}>
                    💡 <strong>Option A Specialist Editor:</strong> Type, paste from Microsoft Word (preserves font styling, tables, headings, and images), paste images from clipboard (Ctrl+V), or import a <code>.docx</code> file directly.
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

              {/* ── SPECIALIST AUTHENTICATED SIGNOFF BANNER ── */}
              <div className="clinical-signoff-banner">
                <div>
                  <span className="clinical-signoff-title">Approved By:</span> Dr. {user?.fullName || 'Pathologist'} · <em>Pathologist (Logged-in Specialist)</em>
                </div>
                <div style={{ fontWeight: 700 }}>
                  {selectedCase?.approvedAt ? `Approved on ${new Date(selectedCase.approvedAt).toLocaleString()}` : 'Ready for Direct Sign-off'}
                </div>
              </div>

              {/* ── ACTIONS TOOLBAR ── */}
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
                    <span>✅</span> {approving ? 'Approving…' : ['Approved', 'Ready for Printing'].includes(selectedCase?.status) ? 'Update & Re-Approve Report' : 'Confirm & Approve Report'}
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
                background: '#ffffff',
                zIndex: 30,
                padding: '12px 20px',
                borderBottom: '1px solid #cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '1.15rem', color: '#0369A1', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
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
