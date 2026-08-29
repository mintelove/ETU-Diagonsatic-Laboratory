/**
 * ETU Diagnostic Laboratory — Radiologist Workspace
 *
 * Professional Medical LIS Interface for Radiologists to review assigned examinations
 * (CT Scan, X-Ray, Ultrasound Abdominal / MSS / Doppler / Echo / Other),
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
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

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
    setPreviewModalOpen(false);
  };

  // Construct synthetic live report object for preview & print
  const liveReport = useMemo(() => {
    if (!selectedCase) return null;
    return {
      ...selectedCase,
      examinationType: selectedCase.examinationType,
      ultrasoundSubtype: selectedCase.ultrasoundSubtype,
      customExaminationName: selectedCase.customExaminationName,
      patient: selectedCase.patient,
      reportType,
      reportContent: reportType === 'Option A' && editorRef.current ? editorRef.current.innerHTML : reportContent,
      structuredReport: structured,
      showFooter,
      status: selectedCase.status || 'In Progress',
      radiologist: user,
      approvedBy: selectedCase.approvedBy || user,
      approvedDate: selectedCase.approvedAt || new Date()
    };
  }, [selectedCase, reportType, reportContent, structured, showFooter, user]);

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
      
      // Validation check
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
    <section className="clinical-workspace-page radiology-page">
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

      {/* ── 1. DEPARTMENT HEADER BANNER ─────────────────────────────────── */}
      <header className="clinical-dept-banner">
        <div className="clinical-dept-title">
          <span className="clinical-dept-icon">🩻</span>
          <div>
            <p className="clinical-dept-subtitle" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              ETU Diagnostic Laboratory
            </p>
            <h1>RADIOLOGY &amp; IMAGING RESULT ENTRY &amp; WORKSPACE</h1>
          </div>
        </div>
        <div className="clinical-specialist-badge">
          <span>👨‍⚕️</span>
          <span>Authenticated Specialist: <strong>Dr. {user?.fullName}</strong></span>
          <span>· 📍 {user?.branchName || 'Main Branch'}</span>
        </div>
      </header>

      {/* ── 2. SUMMARY STATISTICS ────────────────────────────────────────── */}
      <div className="clinical-stats-grid">
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

      {/* ── 3. SEARCH & FILTER TOOLBAR ───────────────────────────────────── */}
      <div className="users-toolbar">
        <div className="search-box">
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

      {/* ── 4. EXAMINATIONS QUEUE TABLE ──────────────────────────────────── */}
      <section className="table-card">
        {loading ? (
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>⏳</div>
            Loading radiology examinations…
          </div>
        ) : filteredCases.length === 0 ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🩻</div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: 'var(--color-on-surface, #1e293b)' }}>No Radiology Cases Found</h3>
            <p style={{ margin: 0, fontSize: '0.84rem' }}>
              When Reception completes payment for CT Scan, X-Ray, or Ultrasound, examinations appear here automatically.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-container, #f8fafc)', borderBottom: '2px solid var(--color-outline-variant, #cbd5e1)', color: 'var(--color-primary, #075c91)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Case / Patient</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Modality &amp; Examination</th>
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
                    <tr key={c._id} style={{ borderBottom: '1px solid var(--color-outline-variant, #e2e8f0)' }}>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary, #075c91)' }}>{c.patient?.name || '—'}</div>
                        <small style={{ color: 'var(--text-secondary, #64748b)' }}>{c.patient?.patientId} · {c.patient?.age} yrs / {c.patient?.sex} · 📍 {c.branchName}</small>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                          {examName}
                        </span>
                        <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                          {formatETB(c.price)}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-on-surface, #475569)', fontSize: '12px' }}>
                        {c.patient?.registrationDate ? new Date(c.patient.registrationDate).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: '#dcfce7', color: '#166534', fontWeight: 600 }}>
                          ✓ Paid
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: isApproved ? '#dcfce7' : c.status === 'In Progress' ? '#fef3c7' : 'var(--color-surface-container, #f1f5f9)', color: isApproved ? '#166534' : c.status === 'In Progress' ? '#92400e' : 'var(--text-secondary, #475569)', fontWeight: 600 }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          className="primary-button"
                          style={{ padding: '5px 12px', fontSize: '11.5px', fontWeight: 700 }}
                          onClick={() => openCaseModal(c)}
                        >
                          {isApproved ? '👁️ View / Edit' : '📝 Enter Result'}
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
                  <span>🩻</span> RADIOLOGY RESULT ENTRY — {selectedCase?.customExaminationName || selectedCase?.examinationType}
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
                    <small>Modality / Examination</small>
                    <strong style={{ color: 'var(--color-primary, #075c91)' }}>
                      {selectedCase?.customExaminationName || (selectedCase?.ultrasoundSubtype ? `Ultrasound — ${selectedCase.ultrasoundSubtype}` : selectedCase?.examinationType)}
                    </strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Registration Date</small>
                    <strong>{selectedCase?.patient?.registrationDate ? new Date(selectedCase.patient.registrationDate).toLocaleString() : '—'}</strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Examination Fee</small>
                    <strong style={{ color: '#16a34a' }}>{formatETB(selectedCase?.price)}</strong>
                  </div>
                </div>
              </section>

              {/* ── CARD 2: ETU REPORT HEADER BRANDING PREVIEW ── */}
              <div className={`clinical-etu-header-preview ${showFooter ? '' : 'hidden-branding'}`}>
                {showFooter ? (
                  <>
                    <img src={labLogo} alt="ETU Diagnostic Laboratory" className="clinical-etu-logo-img" />
                    <div className="clinical-etu-header-text">ETU DIAGNOSTIC LABORATORY · OFFICIAL RADIOLOGY &amp; IMAGING REPORT</div>
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
                    <strong>💡 Option A Specialist Editor:</strong> Type, paste from Microsoft Word (preserves font styling, tables, headings, and images), paste ultrasound/CT images from clipboard (Ctrl+V), or import a <code>.docx</code> file directly.
                  </div>

                  <RichReportEditor
                    value={reportContent}
                    onChange={setReportContent}
                    placeholder="Enter comprehensive radiology findings, paste from Microsoft Word, or upload .docx report…"
                  />
                </div>
              )}

              {/* ── OPTION B: STRUCTURED CLINICAL FIELDS ── */}
              {reportType === 'Option B' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                    <div className="clinical-form-group">
                      <label>Examination Title</label>
                      <input
                        type="text"
                        className="clinical-input"
                        value={structured.examination}
                        onChange={e => setStructured({ ...structured, examination: e.target.value })}
                        placeholder="e.g. Abdominal Ultrasound, Chest X-Ray"
                      />
                    </div>

                    <div className="clinical-form-group">
                      <label>Clinical Indications / History</label>
                      <textarea
                        className="clinical-textarea"
                        rows={1}
                        value={structured.clinicalInformation}
                        onChange={e => setStructured({ ...structured, clinicalInformation: e.target.value })}
                        placeholder="Clinical presentation & symptoms…"
                      />
                    </div>
                  </div>

                  <div className="clinical-form-group">
                    <label>Technique / Modality Protocol</label>
                    <input
                      type="text"
                      className="clinical-input"
                      value={structured.technique}
                      onChange={e => setStructured({ ...structured, technique: e.target.value })}
                      placeholder="Scanning parameters or radiography views…"
                    />
                  </div>

                  {/* Ultrasound Abdominal Specific Organs */}
                  {selectedCase?.examinationType === 'Ultrasound' && selectedCase?.ultrasoundSubtype === 'Abdominal' && (
                    <div style={{ background: 'var(--color-surface-container, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-outline-variant, #e2e8f0)' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--color-primary, #075c91)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Organ-Specific Sonographic Findings
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                        <div className="clinical-form-group">
                          <label>Liver</label>
                          <input type="text" className="clinical-input" value={structured.liver} onChange={e => setStructured({ ...structured, liver: e.target.value })} placeholder="Size, parenchymal echogenicity, focal lesions…" />
                        </div>
                        <div className="clinical-form-group">
                          <label>Gallbladder &amp; Biliary Tree</label>
                          <input type="text" className="clinical-input" value={structured.gallbladder} onChange={e => setStructured({ ...structured, gallbladder: e.target.value })} placeholder="Wall thickness, calculi, CBD diameter…" />
                        </div>
                        <div className="clinical-form-group">
                          <label>Pancreas</label>
                          <input type="text" className="clinical-input" value={structured.pancreas} onChange={e => setStructured({ ...structured, pancreas: e.target.value })} placeholder="Head, body, tail visualization…" />
                        </div>
                        <div className="clinical-form-group">
                          <label>Spleen</label>
                          <input type="text" className="clinical-input" value={structured.spleen} onChange={e => setStructured({ ...structured, spleen: e.target.value })} placeholder="Dimensions, echotexture, splenomegaly…" />
                        </div>
                        <div className="clinical-form-group">
                          <label>Kidneys</label>
                          <input type="text" className="clinical-input" value={structured.kidneys} onChange={e => setStructured({ ...structured, kidneys: e.target.value })} placeholder="Cortical thickness, hydronephrosis…" />
                        </div>
                        <div className="clinical-form-group">
                          <label>Urinary Bladder</label>
                          <input type="text" className="clinical-input" value={structured.urinaryBladder} onChange={e => setStructured({ ...structured, urinaryBladder: e.target.value })} placeholder="Distension, wall regularity, post-void residual…" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="clinical-form-group">
                    <label>General Imaging Findings</label>
                    <textarea
                      className="clinical-textarea"
                      rows={4}
                      value={structured.findings}
                      onChange={e => setStructured({ ...structured, findings: e.target.value })}
                      placeholder="Comprehensive radiological observations & findings…"
                    />
                  </div>

                  <div className="clinical-form-group">
                    <label>
                      Impression / Conclusion <span className="required">*</span>
                    </label>
                    <textarea
                      className="clinical-textarea"
                      rows={2}
                      value={structured.impression}
                      onChange={e => setStructured({ ...structured, impression: e.target.value })}
                      placeholder="Diagnostic impression and radiological conclusion…"
                      style={{ fontWeight: 700 }}
                    />
                  </div>

                  <div className="clinical-form-group">
                    <label>Recommendations</label>
                    <textarea
                      className="clinical-textarea"
                      rows={2}
                      value={structured.recommendation}
                      onChange={e => setStructured({ ...structured, recommendation: e.target.value })}
                      placeholder="e.g. Correlate clinically, repeat scan in 3 months"
                    />
                  </div>
                </div>
              )}

              {/* ── CARD 4: SPECIALIST AUTHENTICATED SIGNOFF BANNER ── */}
              <div className="clinical-signoff-banner">
                <div>
                  <span className="clinical-signoff-title">Approved By:</span> Dr. {user?.fullName || 'Radiologist'} · <em>Radiologist (Logged-in Specialist)</em>
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
                  <span>📄</span> Radiology A4 Report Preview
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
