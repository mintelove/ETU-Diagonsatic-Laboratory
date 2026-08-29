/**
 * ETU Diagnostic Laboratory — Radiologist Workspace
 *
 * Professional Medical LIS Card-Based Interface for Radiologists to review assigned examinations
 * (CT Scan, X-Ray, Ultrasound Abdominal / MSS / Doppler / Echo / Other),
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
        showToast('Please enter or paste the radiology report content before approving.', 'error');
        setApproving(false);
        return;
      }
      if (reportType === 'Option B') {
        const hasField = Object.values(structured).some(v => v && String(v).trim());
        if (!hasField) {
          showToast('Please fill in the structured findings before approving.', 'error');
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

      showToast(`Radiology report approved! Ready for original sending Receptionist.`);
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
          <div className="clinical-header-icon-box">🩻</div>
          <div className="clinical-header-text">
            <p className="clinical-header-sub">ETU DIAGNOSTIC LABORATORY</p>
            <h1>RADIOLOGY &amp; IMAGING WORKSPACE</h1>
          </div>
        </div>
        <div className="clinical-specialist-card-badge">
          <div className="clinical-specialist-doctor">
            <span>👨‍⚕️</span> Dr. {user?.fullName || 'Specialist'}
          </div>
          <div className="clinical-specialist-meta">
            Authenticated Radiologist · <strong>Global (Main &amp; Otona)</strong>
          </div>
        </div>
      </header>

      {/* ── 2. FOUR SUMMARY KPI CARDS ───────────────────────────────────── */}
      <div className="clinical-kpi-grid">
        <article className="clinical-kpi-card blue">
          <div className="clinical-kpi-header">
            <h3 className="clinical-kpi-title">TOTAL EXAMINATIONS</h3>
            <div className="clinical-kpi-icon-pill">📊</div>
          </div>
          <div className="clinical-kpi-number">{stats.total}</div>
          <p className="clinical-kpi-desc">All cross-branch examinations</p>
        </article>

        <article className="clinical-kpi-card orange">
          <div className="clinical-kpi-header">
            <h3 className="clinical-kpi-title">WAITING EXAMINATION</h3>
            <div className="clinical-kpi-icon-pill">⏳</div>
          </div>
          <div className="clinical-kpi-number">{stats.queued}</div>
          <p className="clinical-kpi-desc">Awaiting radiology scan/review</p>
        </article>

        <article className="clinical-kpi-card purple">
          <div className="clinical-kpi-header">
            <h3 className="clinical-kpi-title">IN PROGRESS</h3>
            <div className="clinical-kpi-icon-pill">🩻</div>
          </div>
          <div className="clinical-kpi-number">{stats.inProgress}</div>
          <p className="clinical-kpi-desc">Image analysis &amp; drafting</p>
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
            <span>📋</span> RADIOLOGY WORKLIST (CROSS-BRANCH)
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
            <strong style={{ color: '#0F172A' }}>Loading radiology worklist…</strong>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="clinical-empty-card">
            <div className="clinical-empty-icon">🩻</div>
            <h3 className="clinical-empty-title">No Radiology Examinations Found</h3>
            <p className="clinical-empty-text">
              {search || statusFilter !== 'all'
                ? 'No examinations match your search query or selected filter.'
                : 'When Reception registers and bills CT Scan, X-Ray, or Ultrasound from Main or Otona branches, examinations appear in this worklist automatically.'}
            </p>
          </div>
        ) : (
          <div className="clinical-patient-cards-list">
            {filteredCases.map(c => {
              const isApproved = ['Approved', 'Ready for Printing'].includes(c.status);
              const examName = c.customExaminationName || (c.ultrasoundSubtype ? `Ultrasound — ${c.ultrasoundSubtype}` : c.examinationType);
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
                    <span className="clinical-exam-badge">
                      {examName}
                    </span>
                    <span className="clinical-exam-fee">{formatETB(c.price)}</span>
                  </div>

                  {/* Date */}
                  <div className="clinical-col-date">
                    <span className="clinical-exam-label">Registration Date</span>
                    <span className="clinical-date-text">
                      {c.patient?.registrationDate ? new Date(c.patient.registrationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                    <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>
                      {c.patient?.registrationDate ? new Date(c.patient.registrationDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
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
                  <span>🩻</span> RADIOLOGY REPORT — {selectedCase?.customExaminationName || selectedCase?.examinationType}
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
                    <small>Modality / Examination</small>
                    <strong style={{ color: '#0284C7' }}>
                      {selectedCase?.customExaminationName || (selectedCase?.ultrasoundSubtype ? `Ultrasound — ${selectedCase.ultrasoundSubtype}` : selectedCase?.examinationType)}
                    </strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Registration Date</small>
                    <strong>{selectedCase?.patient?.registrationDate ? new Date(selectedCase.patient.registrationDate).toLocaleString() : '—'}</strong>
                  </div>
                  <div className="clinical-patient-field">
                    <small>Examination Fee</small>
                    <strong style={{ color: '#16A34A' }}>{formatETB(selectedCase?.price)}</strong>
                  </div>
                </div>
              </section>

              {/* ── ETU REPORT HEADER BRANDING PREVIEW ── */}
              <div className={`clinical-etu-header-preview ${showFooter ? '' : 'hidden-branding'}`}>
                {showFooter ? (
                  <>
                    <img src={labLogo} alt="ETU Diagnostic Laboratory" className="clinical-etu-logo-img" />
                    <div className="clinical-etu-header-text">ETU DIAGNOSTIC LABORATORY · OFFICIAL RADIOLOGY &amp; IMAGING REPORT</div>
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
                    💡 <strong>Option A Specialist Editor:</strong> Type, paste from Microsoft Word (preserves font styling, tables, headings, and images), paste ultrasound/CT images from clipboard (Ctrl+V), or import a <code>.docx</code> file directly.
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
                    <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>
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

              {/* ── SPECIALIST AUTHENTICATED SIGNOFF BANNER ── */}
              <div className="clinical-signoff-banner">
                <div>
                  <span className="clinical-signoff-title">Approved By:</span> Dr. {user?.fullName || 'Radiologist'} · <em>Radiologist (Logged-in Specialist)</em>
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
