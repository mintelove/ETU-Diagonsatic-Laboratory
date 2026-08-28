/**
 * ETU Diagnostic Laboratory — Pathologist Workspace
 *
 * Dedicated clinical interface for Pathologists to review assigned cases,
 * track 20-day (Biopsy) and 24-hour (FNAC / Peripheral Morphology) countdown deadlines,
 * enter reports via Option A (Copy/Paste default) or Option B (Structured Clinical Entry),
 * and directly confirm / approve reports.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api, { isSilentNetworkError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { formatETB } from '../utils/currencyHelper.js';
import ModalPortal from '../components/ModalPortal.jsx';

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
  const [reportType, setReportType] = useState('Option A'); // Option A (Copy/Paste default) or Option B (Structured)
  const [reportContent, setReportContent] = useState('');
  const [showFooter, setShowFooter] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

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
  };

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
      
      // Basic check
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
    <section className="page pathology-page">
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
          <p className="eyebrow">Clinical Pathology Department</p>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🔬</span> Pathology Work Queue
          </h1>
          <p className="intro">
            Welcome, <strong>Dr. {user?.fullName}</strong> · 📍 Branch: <strong>{user?.branchName || 'Main'}</strong>
          </p>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <article className="stat-card blue">
          <small>Total Cases</small>
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
        {stats.overdue > 0 && (
          <article className="stat-card red" style={{ borderColor: '#ef4444', background: '#fef2f2' }}>
            <small style={{ color: '#b91c1c', fontWeight: 700 }}>⚠️ Deadline Overdue</small>
            <strong style={{ color: '#b91c1c' }}>{stats.overdue}</strong>
          </article>
        )}
      </div>

      {/* Toolbar */}
      <div className="users-toolbar" style={{ marginBottom: '1.2rem', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: '1 1 260px' }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search case #, patient ID, name, or phone…"
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

      {/* Cases Queue Table */}
      <section className="table-card" style={{ background: 'var(--color-surface,#fff)', borderRadius: '12px', border: '1px solid var(--color-border,#e2ecef)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏳</div>
            Loading pathology cases…
          </div>
        ) : filteredCases.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔬</div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#1e293b' }}>No Pathology Cases Found</h3>
            <p style={{ margin: 0, fontSize: '0.88rem' }}>
              When Reception completes payment for Biopsy, FNAC, or Peripheral Morphology, cases appear here automatically.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--color-background,#f8fafc)', borderBottom: '2px solid var(--color-border,#e2ecef)', color: 'var(--color-primary,#075c91)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Case / Patient</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Examination</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Turnaround & Countdown</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Registration Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Payment</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c, i) => {
                  const countdown = getCountdown(c.reportingDeadline);
                  const isBiopsy = c.testType === 'Biopsy';
                  const isApproved = ['Approved', 'Ready for Printing'].includes(c.status);

                  return (
                    <tr key={c._id} style={{ borderBottom: '1px solid var(--color-border,#edf2f7)' }}>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary,#075c91)' }}>{c.patient?.name || '—'}</div>
                        <small style={{ color: '#64748b' }}>{c.patient?.patientId} · {c.patient?.age} yrs / {c.patient?.sex} · 📍 {c.branchName}</small>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', background: isBiopsy ? '#fef3c7' : '#e0e7ff', color: isBiopsy ? '#92400e' : '#3730a3', fontWeight: 700 }}>
                          {c.testType}
                        </span>
                        <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                          {formatETB(c.price)}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 600, color: isApproved ? '#166534' : countdown.isOverdue ? '#b91c1c' : '#0369a1' }}>
                          {isApproved ? '✅ Completed' : (
                            <>
                              <span>⏱️ {isBiopsy ? '20-Day Target' : '24-Hour Target'}</span>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: countdown.isOverdue ? '#b91c1c' : '#475569', marginTop: '2px' }}>
                                {countdown.text}
                              </div>
                            </>
                          )}
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
                <span>🔬</span> Pathology Report — {selectedCase?.testType} ({selectedCase?.caseNumber})
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
                  <strong>💡 Tip for Option A:</strong> You can directly paste reports from Microsoft Word or documents. Full text formatting, multiple paragraphs, tables, and full-resolution images are preserved cleanly for multi-page A4 printing.
                </div>

                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: reportContent }}
                  onInput={() => {
                    if (editorRef.current) setReportContent(editorRef.current.innerHTML);
                  }}
                  style={{
                    minHeight: '280px',
                    maxHeight: '460px',
                    overflowY: 'auto',
                    border: '1.5px solid var(--color-border, #cbd5e1)',
                    borderRadius: '8px',
                    padding: '16px',
                    background: '#fff',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#1e293b',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* ── OPTION B: STRUCTURED REPORT ENTRY ───────────────────────── */}
            {reportType === 'Option B' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Clinical History / Indications</label>
                    <textarea
                      className="global-input"
                      rows={2}
                      value={structured.clinicalHistory}
                      onChange={e => setStructured({ ...structured, clinicalHistory: e.target.value })}
                      placeholder="Clinical presentation & relevant history…"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Specimen / Anatomical Site</label>
                    <input
                      type="text"
                      className="global-input"
                      value={structured.specimen}
                      onChange={e => setStructured({ ...structured, specimen: e.target.value })}
                      placeholder="e.g. Left Breast Mass, Cervical Lymph Node"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {selectedCase?.testType === 'Biopsy' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Gross Description</label>
                      <textarea
                        className="global-input"
                        rows={2}
                        value={structured.grossDescription}
                        onChange={e => setStructured({ ...structured, grossDescription: e.target.value })}
                        placeholder="Macroscopic appearance, dimensions, color, consistency…"
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Microscopic Description</label>
                      <textarea
                        className="global-input"
                        rows={3}
                        value={structured.microscopicDescription}
                        onChange={e => setStructured({ ...structured, microscopicDescription: e.target.value })}
                        placeholder="Histopathological cellular architecture, nuclear features, stroma…"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </>
                )}

                {selectedCase?.testType === 'FNAC' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Cytological Findings</label>
                    <textarea
                      className="global-input"
                      rows={3}
                      value={structured.cytologicalFindings}
                      onChange={e => setStructured({ ...structured, cytologicalFindings: e.target.value })}
                      placeholder="Smear adequacy, cell clusters, background, nuclear atypia…"
                      style={{ width: '100%' }}
                    />
                  </div>
                )}

                {selectedCase?.testType === 'Peripheral Morphology' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>RBC Morphology</label>
                      <textarea
                        className="global-input"
                        rows={2}
                        value={structured.rbcMorphology}
                        onChange={e => setStructured({ ...structured, rbcMorphology: e.target.value })}
                        placeholder="Normochromic, microcytic…"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>WBC Morphology</label>
                      <textarea
                        className="global-input"
                        rows={2}
                        value={structured.wbcMorphology}
                        onChange={e => setStructured({ ...structured, wbcMorphology: e.target.value })}
                        placeholder="Count, differential, toxic granules…"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Platelet Morphology</label>
                      <textarea
                        className="global-input"
                        rows={2}
                        value={structured.plateletMorphology}
                        onChange={e => setStructured({ ...structured, plateletMorphology: e.target.value })}
                        placeholder="Adequate, clumps, giant forms…"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px', color: 'var(--color-primary, #075c91)' }}>
                    Pathological Diagnosis / Impression *
                  </label>
                  <textarea
                    className="global-input"
                    rows={2}
                    value={structured.diagnosis}
                    onChange={e => setStructured({ ...structured, diagnosis: e.target.value })}
                    placeholder="Definitive pathological diagnosis…"
                    style={{ width: '100%', fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Comments / Remarks</label>
                    <textarea
                      className="global-input"
                      rows={2}
                      value={structured.comments}
                      onChange={e => setStructured({ ...structured, comments: e.target.value })}
                      placeholder="Additional pathological notes"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Recommendations</label>
                    <textarea
                      className="global-input"
                      rows={2}
                      value={structured.recommendation}
                      onChange={e => setStructured({ ...structured, recommendation: e.target.value })}
                      placeholder="e.g. Immunohistochemistry, close follow-up"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Approval Info Banner */}
            <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', background: '#e0f2fe', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <div>
                <strong>Approved By:</strong> Dr. {user?.fullName || 'Pathologist'} · <em>Pathologist</em>
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
