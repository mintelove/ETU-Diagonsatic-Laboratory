/**
 * ETU Diagnostic Laboratory — Reception Workspace Page
 *
 * Full patient registration, sample selection, billing, and thermal printing
 * workflow. Connects directly to backend patient registries and sample collector queues.
 */

import { memo, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { api } from '../api/client.js';
import { download } from '../api/download.js';
import { useAuth } from '../context/AuthContext.jsx';
import { printLabReport } from '../utils/printLabReport.js';

const KES_TO_ETB = n => `${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB`;
const formatDate = value => value ? new Date(value).toLocaleDateString() : '—';
const ReceptionClock = memo(function ReceptionClock() { const [now,setNow]=useState(()=>new Date()); useEffect(()=>{const id=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(id)},[]); return <p className="intro">{now.toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {now.toLocaleTimeString('en-KE')}</p>; });

// Toast Notification Local Component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast-message ${type === 'error' ? 'error' : 'success'}`} style={{
      position: 'fixed', bottom: '24px', right: '24px', padding: '12px 24px',
      borderRadius: '8px', color: '#fff', fontWeight: 600, zIndex: 1000,
      background: type === 'error' ? 'var(--color-error)' : 'var(--color-success)',
      boxShadow: 'var(--shadow-lg)', display: 'flex', gap: '8px', alignItems: 'center'
    }}>
      <span>{type === 'error' ? '❌' : '✅'}</span>
      <span>{message}</span>
    </div>
  );
}

// POS 80mm Thermal Receipt Component
function ThermalReceiptModal({ patientData, total, paymentDetails, onClose, token }) {
  const [printing, setPrinting] = useState(false);
  if (!patientData) return null;

  const isReprint = !!patientData._id;
  const pName = isReprint ? patientData.name : patientData.name || 'Walk-in Patient';
  const pId = isReprint ? patientData.patientId : 'TEMP-REG';
  const recNo = isReprint ? patientData.receiptNumber : 'RC-PENDING';
  const dateStr = isReprint ? new Date(patientData.paymentDate).toLocaleDateString() : new Date().toLocaleDateString();
  const timeStr = isReprint ? new Date(patientData.paymentDate).toLocaleTimeString() : new Date().toLocaleTimeString();
  const sampleList = isReprint ? patientData.sampleTypes : patientData.samplesSelected;

  const handlePrint = async () => {
    if (printing) return;
    setPrinting(true);
    if (isReprint) {
      try {
        await api(`/reception/patients/${patientData._id}/receipt-print`, { token, method: 'POST' });
      } catch (e) {
        console.error('Failed to log reprint activity:', e.message);
      } finally {
        setPrinting(false);
      }
    } else {
      setPrinting(false);
    }
    window.print();
  };

  return (
    <div className="thermal-receipt-modal no-print-backdrop">
      <article className="thermal-receipt">
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <button className="secondary-button" onClick={onClose} style={{ padding: '4px 8px', fontSize: '11px' }}>Close</button>
          <button className="primary-button" onClick={handlePrint} disabled={printing} style={{ padding: '4px 8px', fontSize: '11px' }}>{printing ? 'Printing…' : '🖨️ Print (80mm)'}</button>
        </div>

        <div className="receipt-title">ETU Diagnostic Lab</div>
        <div className="receipt-subtitle">Official Payment Receipt</div>
        <hr />
        
        <div style={{ fontSize: '10px' }}>
          <div><strong>Receipt #:</strong> {recNo}</div>
          <div><strong>Patient ID:</strong> {pId}</div>
          <div><strong>Patient:</strong> {pName}</div>
          <div><strong>Date:</strong> {dateStr}</div>
          <div><strong>Time:</strong> {timeStr}</div>
        </div>
        <hr />

        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>SELECTED TESTS</div>
        {sampleList.map((s) => (
          <div key={s._id} className="item-row">
            <span>{s.name}</span>
            <span>{KES_TO_ETB(s.price)}</span>
          </div>
        ))}
        <hr />

        <div className="total-row">
          <span>GRAND TOTAL</span>
          <span>{KES_TO_ETB(total)}</span>
        </div>
        <hr />

        <div style={{ fontSize: '10px' }}>
          <div><strong>Payment Method:</strong> {paymentDetails.method}</div>
          {paymentDetails.received !== undefined && (
            <>
              <div><strong>Amount Received:</strong> {KES_TO_ETB(paymentDetails.received)}</div>
              <div><strong>Change:</strong> {KES_TO_ETB(paymentDetails.balance)}</div>
            </>
          )}
          <div><strong>Cashier:</strong> {paymentDetails.cashier || 'Receptionist'}</div>
        </div>
        <hr />

        <div className="receipt-footer">
          Thank you for choosing ETU.<br />
          Professional laboratory diagnostics.
        </div>
      </article>
    </div>
  );
}

export default function ReceptionPage() {
  const { token, user } = useAuth();

  // Dashboard & global data states
  const [dash, setDash] = useState(null);
  const [samples, setSamples] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [reports, setReports] = useState([]);
  const [counselling, setCounselling] = useState([]);
  const [view, setView] = useState('dashboard');
  const [q, setQ] = useState('');
  const [history, setHistory] = useState(null);

  // Notifications/Toasts
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);
  const dismissToast = useCallback(() => setToast(null), []);

  // Workflow Wizard States
  const [wizardStep, setWizardStep] = useState(1); // 1: Sample Selection, 2: Payment, 3: Patient Registration
  const [selectedSampleIds, setSelectedSampleIds] = useState([]);
  const [counsellingOnly, setCounsellingOnly] = useState(false);
  const [counsellingReason, setCounsellingReason] = useState('');
  const [counsellingReasonError, setCounsellingReasonError] = useState('');
  const [counsellingNotes, setCounsellingNotes] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Patient Registration Form State
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientSex, setPatientSex] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [registrationType, setRegistrationType] = useState('Self');
  const [referralHospital, setReferralHospital] = useState('');
  const [otherHospital, setOtherHospital] = useState('');
  const [patientAddress, setPatientAddress] = useState('');

  // Startup payload excludes reports and counselling; those load only when opened.
  const loadData = useCallback(async (signal) => {
    try {
      const [d, s, h] = await Promise.all([
        api('/reception/dashboard', { token, signal }),
        api('/reception/sample-types', { token, signal }),
        api('/reception/referral-hospitals', { token, signal })
      ]);
      setDash(d);
      setSamples(s.sampleTypes);
      setHospitals(h.hospitals);
    } catch (e) {
      if (e.name === 'AbortError') return;
      setToast({ message: e.message || 'Error loading reception settings.', type: 'error' });
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  // Load counselling history when active
  useEffect(() => {
    if (view === 'counselling') {
      const controller = new AbortController();
      api('/reception/counselling?limit=50', { token, signal: controller.signal })
        .then(x => setCounselling(x.records))
        .catch(error => { if (error.name !== 'AbortError') setToast({ message: 'Unable to load counselling history.', type: 'error' }); });
      return () => controller.abort();
    }
  }, [view, token]);

  useEffect(() => {
    if (view !== 'reports') return;
    const controller = new AbortController();
    api('/reception/reports?limit=30', { token, signal: controller.signal })
      .then(x => setReports(x.reports))
      .catch(error => { if (error.name !== 'AbortError') setToast({ message: 'Unable to load approved reports.', type: 'error' }); });
    return () => controller.abort();
  }, [view, token]);

  // Live patient search
  useEffect(() => {
    if (!['dashboard', 'patients'].includes(view)) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      api(`/reception/patients?q=${encodeURIComponent(q)}&limit=15`, { token, signal: controller.signal })
        .then(x => setPatients(x.patients))
        .catch(error => { if (error.name !== 'AbortError') setToast({ message: 'Unable to search patients. Please try again.', type: 'error' }); });
    }, q ? 300 : 0);
    return () => { clearTimeout(t); controller.abort(); };
  }, [q, token, view]);

  // Bill Calculations
  const selectedSamples = useMemo(() => {
    return samples.filter(s => selectedSampleIds.includes(s._id));
  }, [samples, selectedSampleIds]);

  const billTotal = useMemo(() => {
    return selectedSamples.reduce((sum, s) => sum + s.price, 0);
  }, [selectedSamples]);

  const balanceDue = useMemo(() => {
    if (!amountReceived) return 0;
    return Math.max(0, Number(amountReceived) - billTotal);
  }, [amountReceived, billTotal]);

  // Toggle selection
  const handleToggleSample = (id) => {
    setSelectedSampleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Step 2 -> 3: Move from payment confirmation to receipt print
  const handleConfirmPayment = () => {
    if (counsellingOnly) {
      setWizardStep(3); // Skip payment for counselling
      return;
    }
    if (selectedSampleIds.length === 0) {
      setToast({ message: 'Please select at least one sample type.', type: 'error' });
      return;
    }
    if (Number(amountReceived) < billTotal) {
      setToast({ message: 'Amount received cannot be less than the bill total.', type: 'error' });
      return;
    }

    // Set mock receipt data for print step
    setReceiptData({
      name: patientName,
      samplesSelected: selectedSamples,
      paymentDate: new Date(),
    });
    setPaymentConfirmed(true);
    setToast({ message: 'Payment confirmed. Printing receipt.', type: 'success' });
  };

  // Proceed to Step 3: Patient details after receipt modal closes/proceeds
  const handleProceedToRegistration = () => {
    setReceiptData(null);
    setWizardStep(3);
  };

  // Step 3: Complete Patient Registration and API Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!patientName.trim() || !patientAge || !patientSex || !patientPhone.trim()) {
      setToast({ message: 'Please fill in all required patient details.', type: 'error' });
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    try {
      const finalHospital = referralHospital === 'Other' ? otherHospital : referralHospital;
      const payload = {
        name: patientName.trim(),
        age: Number(patientAge),
        sex: patientSex,
        phone: patientPhone.trim(),
        address: patientAddress.trim(),
        registrationType,
        referralHospital: registrationType === 'Referral' ? finalHospital : '',
        sampleTypes: selectedSampleIds,
        paymentMethod,
        counsellingOnly,
        serviceType: counsellingOnly ? 'Counseling Only' : 'Laboratory Test',
        counsellingReason: counsellingOnly ? counsellingReason : '',
        counsellingNotes: counsellingOnly ? counsellingNotes : '',
      };

      const result = await api('/reception/patients', {
        token,
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setToast({
        message: counsellingOnly
          ? 'Counselling Registered Successfully'
          : 'Patient Registered & Sent to Sample Collector Queue',
        type: 'success'
      });

      // Show receipt popup with final generated patient record
      if (!counsellingOnly) {
        setReceiptData(result.patient);
      }

      // Reset state & load dashboard
      resetForm();
      loadData();
      setView('dashboard');
    } catch (err) {
      setToast({ message: err.message || 'Failed to complete registration.', type: 'error' });
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  const resetForm = () => {
    setWizardStep(1);
    setSelectedSampleIds([]);
    setCounsellingOnly(false);
    setCounsellingReason('');
    setCounsellingReasonError('');
    setCounsellingNotes('');
    setPaymentMethod('Cash');
    setAmountReceived('');
    setPaymentConfirmed(false);
    setPatientName('');
    setPatientAge('');
    setPatientSex('');
    setPatientPhone('');
    setRegistrationType('Self');
    setReferralHospital('');
    setOtherHospital('');
    setPatientAddress('');
  };

  const handlePrintReceiptAgain = (patient) => {
    setReceiptData(patient);
  };

  // History & Reports actions
  const handleShowHistory = async (patient) => {
    try {
      const data = await api(`/reception/patients/${patient._id}/history`, { token });
      setHistory(data);
    } catch (e) {
      setToast({ message: e.message || 'Failed to fetch history.', type: 'error' });
    }
  };

  const handlePrintA4Report = async (id) => {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/reception/reports/${id}/print`, { token, method: 'PATCH' });
      const report = reports.find(item => item._id === id);
      if (!report) throw new Error('The requested document could not be loaded.');
      printLabReport(report, user);
      setToast({ message: 'A4 report preview opened with the latest report data.', type: 'success' });
      loadData();
    } catch (e) {
      setToast({ message: e.message || 'Failed to log report print.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  // Recent transactions table mapping
  const recentTransactions = useMemo(() => {
    return patients.filter(p => p.paymentStatus === 'Paid').slice(0, 15);
  }, [patients]);

  return (
    <section className="page reception-page">
      
      {/* ═══ WORKSPACE HEADER ═══ */}
      <header className="dash-header">
        <div>
          <p className="eyebrow">Reception Workspace</p>
          <h1>Welcome, {user.fullName}</h1>
          <ReceptionClock />
        </div>
        <input
          className="global-input"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="🔍 Search patient ID, barcode, name, or referral hospital..."
        />
      </header>

      {/* ═══ TOAST NOTIFICATIONS ═══ */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={dismissToast} />
      )}

      {/* ═══ RECEPTION NAVIGATION TABS ═══ */}
      <div className="reception-tabs no-print" style={{ marginBottom: 'var(--space-6)' }}>
        {[['dashboard', '🏠 Dashboard'],
          ['register', '＋ Register Patient (POS)'],
          ['patients', '🧑‍⚕️ Patient Search'],
          ['reports', '📝 Approved Reports'],
          ['counselling', '🗂️ Counselling History']].map(([id, label]) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
      </div>

      {/* ═══ VIEW 1: RECEPTION DASHBOARD ═══ */}
      {view === 'dashboard' && (
        <>
          <div className="reception-stats">
            <article className="stat-card blue">
              <small>Today's Patients</small>
              <strong>{dash?.summary.todayPatients ?? 0}</strong>
            </article>
            <article className="stat-card green">
              <small>Today's Income</small>
              <strong>{KES_TO_ETB(dash?.summary.todayIncome)}</strong>
            </article>
            <article className="stat-card teal">
              <small>Weekly Income</small>
              <strong>{KES_TO_ETB(dash?.summary.weeklyIncome)}</strong>
            </article>
            <article className="stat-card orange">
              <small>Pending Collections</small>
              <strong>{dash?.summary.waitingCollection ?? 0}</strong>
            </article>
            <article className="stat-card purple">
              <small>Completed Registrations</small>
              <strong>{dash?.summary.readyReports ?? 0}</strong>
            </article>
            <article className="stat-card indigo">
              <small>Waiting Queue</small>
              <strong>{dash?.summary.waitingCollection ?? 0}</strong>
            </article>
          </div>

          {/* Recent transactions listing (Step 8) */}
          <section className="dash-panel" style={{ marginTop: 'var(--space-6)' }}>
            <h2>Recent Transactions</h2>
            <div className="sample-types-table-wrapper">
              <table className="sample-types-table">
                <thead>
                  <tr>
                    <th>Receipt Number</th>
                    <th>Patient Name</th>
                    <th>Sample Types</th>
                    <th>Total Paid</th>
                    <th>Payment Method</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem' }}>No payment records found for today.</td></tr>
                  ) : recentTransactions.map((tx) => (
                    <tr key={tx._id}>
                      <td><code>{tx.receiptNumber}</code></td>
                      <td><strong>{tx.name}</strong></td>
                      <td>{tx.sampleTypes?.map(s => s.name).join(', ') || 'Counselling'}</td>
                      <td><strong>{KES_TO_ETB(tx.grandTotal)}</strong></td>
                      <td>{tx.paymentMethod}</td>
                      <td>{formatDate(tx.registrationDate)}</td>
                      <td>
                        <button className="secondary-button" onClick={() => handlePrintReceiptAgain(tx)} style={{ padding: '0.2rem 0.5rem', fontSize: 'var(--text-xs)' }}>
                          🖨️ Print Receipt Again
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dash-panel" style={{ marginTop: 'var(--space-6)' }}>
            <h2>Recent Activity Logs</h2>
            {dash?.activities?.length ? dash.activities.map(a => (
              <div className="activity" key={a._id}>
                <i />
                <div>
                  <strong>{a.action}</strong>
                  <span>{new Date(a.createdDate).toLocaleString()}</span>
                  <small>{a.details || a.reason}</small>
                </div>
              </div>
            )) : <p className="empty">No recent activity logged.</p>}
          </section>
        </>
      )}

      {/* ═══ VIEW 2: REDESIGNED WIZARD REGISTRATION WORKFLOW ═══ */}
      {view === 'register' && (
        <div className="registration-wizard">
          <div>
            
            {/* STEP 1: SAMPLE TYPE SELECTION */}
            {wizardStep === 1 && (
              <div className="wizard-step-panel">
                <h2>Step 1 — Sample Type Selection</h2>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="switch" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <input
                      type="checkbox"
                      checked={counsellingOnly}
                      onChange={e => {
                        setCounsellingOnly(e.target.checked);
                        // Clear error and reason when toggling mode
                        setCounsellingReason('');
                        setCounsellingReasonError('');
                      }}
                    />
                    Counselling Only (Skip Billing/Payment & Receipt Printing)
                  </label>
                </div>

                {counsellingOnly ? (
                  <div className="form-grid" style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    <div className="alert success"><strong>Free Counseling Service</strong><br/>Service: Counseling Only &nbsp; | &nbsp; Cost: FREE &nbsp; | &nbsp; Grand Total: 0.00 ETB<br/>No laboratory tests, sample collection, payment, receipt, or laboratory report will be created.</div>
                    <div className="form-group">
                      <label>
                        Counselling Type <span style={{ color: 'var(--color-error)' }}>*</span>
                      </label>
                      <select
                        value={counsellingReason}
                        onChange={e => {
                          setCounsellingReason(e.target.value);
                          if (e.target.value) setCounsellingReasonError('');
                        }}
                        style={counsellingReasonError ? { borderColor: 'var(--color-error)', outline: '2px solid var(--color-error)' } : {}}
                      >
                        <option value="">— Select Counseling Type —</option>
                        {['Unavailable Test', 'Doctor Consultation', 'Future Appointment', 'Medical Advice'].map(x => (
                          <option key={x} value={x}>{x}</option>
                        ))}
                      </select>
                      {counsellingReasonError && (
                        <p style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>
                          ⚠ {counsellingReasonError}
                        </p>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Notes / Advice Details</label>
                      <textarea value={counsellingNotes} onChange={e => setCounsellingNotes(e.target.value)} rows="3" />
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-3)' }}>
                      Select the requested laboratory sample types:
                    </p>
                    <div className="sample-selection-grid">
                      {samples.map((s) => (
                        <div
                          key={s._id}
                          className={`sample-selection-card ${selectedSampleIds.includes(s._id) ? 'selected' : ''}`}
                          onClick={() => handleToggleSample(s._id)}
                        >
                          <div className="card-header">
                            <span style={{ fontSize: '1.2rem' }}>🧪</span>
                            <input
                              type="checkbox"
                              checked={selectedSampleIds.includes(s._id)}
                              onChange={() => {}} // click handled by card container
                            />
                          </div>
                          <span className="sample-name">{s.name}</span>
                          {s.description && <small className="sample-description">{s.description}</small>}
                          <span className="sample-price">{KES_TO_ETB(s.price)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setWizardStep(counsellingOnly ? 3 : 2);
                    }}
                  >
                    {counsellingOnly ? 'Save Counselling Record →' : 'Proceed to Payment →'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: RECEIVE PAYMENT */}
            {wizardStep === 2 && (
              <div className="wizard-step-panel">
                <h2>Step 2 — Receive Payment</h2>
                
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Mobile Payment">Mobile Payment</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Amount Received (ETB)</label>
                    <input
                      type="number"
                      placeholder="e.g. 2000"
                      value={amountReceived}
                      onChange={e => setAmountReceived(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ background: 'var(--color-surface-container)', padding: 'var(--space-3)', borderRadius: '8px', marginTop: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: '4px' }}>
                    <span>Amount Due:</span>
                    <strong>{KES_TO_ETB(billTotal)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>
                    <span>Change Balance:</span>
                    <strong>{KES_TO_ETB(balanceDue)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-5)' }}>
                  <button className="secondary-button" onClick={() => setWizardStep(1)}>
                    ← Back to Samples
                  </button>
                  <button className="primary-button" onClick={handleConfirmPayment}>
                    Confirm Payment & Print Receipt
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PATIENT DETAILS REGISTRATION */}
            {wizardStep === 3 && (
              <div className="wizard-step-panel">
                <h2>Step 3 — Patient Details</h2>
                <form onSubmit={handleRegisterSubmit}>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <div className="form-group">
                      <label>Patient Type</label>
                      <select value={registrationType} onChange={e => setRegistrationType(e.target.value)}>
                        <option value="Self">Self</option>
                        <option value="Referral">Referral</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Patient Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Full Name"
                        value={patientName}
                        onChange={e => setPatientName(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Age <span style={{ color: 'var(--color-error)' }}>*</span></label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="130"
                        placeholder="Age"
                        value={patientAge}
                        onChange={e => setPatientAge(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Sex <span style={{ color: 'var(--color-error)' }}>*</span></label>
                      <select required value={patientSex} onChange={e => setPatientSex(e.target.value)}>
                        <option value="">Select Sex</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Phone Number <span style={{ color: 'var(--color-error)' }}>*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Phone Number"
                        value={patientPhone}
                        onChange={e => setPatientPhone(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Address (Optional)</label>
                      <input
                        type="text"
                        placeholder="Address"
                        value={patientAddress}
                        onChange={e => setPatientAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  {registrationType === 'Referral' && (
                    <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                      <label>Referral Hospital</label>
                      <select required value={referralHospital} onChange={e => setReferralHospital(e.target.value)}>
                        <option value="">Select hospital</option>
                        {hospitals.map(h => (
                          <option key={h._id} value={h.name}>{h.name}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      {referralHospital === 'Other' && (
                        <input
                          type="text"
                          required
                          placeholder="Specify hospital name"
                          value={otherHospital}
                          onChange={e => setOtherHospital(e.target.value)}
                          style={{ marginTop: '6px' }}
                        />
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-5)' }}>
                    <button type="button" className="secondary-button" onClick={() => counsellingOnly ? setWizardStep(1) : setWizardStep(2)}>
                      ← Back
                    </button>
                    <button type="submit" disabled={busy} className="primary-button">
                      {busy ? 'Saving patient...' : 'Complete Patient Registration'}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>

          {/* WIZARD RIGHT SIDEBAR: LIVE BILL SUMMARY */}
          <div>
            <div className="bill-summary-card">
              <h3>Receipt Bill Summary</h3>
              <hr style={{ border: 'none', borderTop: '1px dashed var(--color-outline-variant)', marginBottom: '12px' }} />
              
              <div className="bill-items-list">
                {selectedSamples.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--color-on-surface-variant)' }}>No test selected</p>
                ) : selectedSamples.map(s => (
                  <div key={s._id} className="bill-item">
                    <span>{s.name}</span>
                    <strong>{KES_TO_ETB(s.price)}</strong>
                  </div>
                ))}
              </div>

              <div className="bill-item total">
                <span>Grand Total</span>
                <strong>{KES_TO_ETB(billTotal)}</strong>
              </div>
              
              <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                <div>Selected Tests: <strong>{selectedSampleIds.length}</strong></div>
                <div>Discount: <strong>0.00 ETB</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ VIEW 3: PATIENT HISTORY SEARCH ═══ */}
      {view === 'patients' && (
        <section className="table-card">
          <div className="table-title">
            <h2>Patient Registry</h2>
            <div className="export-buttons">
              <button onClick={() => download('/reception/exports/patients.csv', token)}>CSV</button>
              <button onClick={() => download('/reception/exports/patients.pdf', token)}>PDF</button>
            </div>
          </div>
          {patients.length ? (
            <div className="sample-types-table-wrapper">
              <table className="sample-types-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Barcode</th>
                    <th>Phone</th>
                    <th>Samples</th>
                    <th>Payment</th>
                    <th>Registered Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(p => (
                    <tr key={p._id}>
                      <td><strong>{p.name}</strong><span>{p.patientId}</span></td>
                      <td>{p.phone}</td>
                      <td>{p.sampleTypes?.map(s => s.name).join(', ') || 'Counselling'}</td>
                      <td>{p.paymentStatus}</td>
                      <td>{new Date(p.registrationDate).toLocaleString()}</td>
                      <td>
                        <button className="secondary-button" onClick={() => handleShowHistory(p)}>History Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">Enter keywords above to search patient database.</p>}
        </section>
      )}

      {/* ═══ VIEW 4: APPROVED REPORTS ═══ */}
      {view === 'reports' && (
        <section className="table-card">
          <div className="table-title">
            <h2>Approved Diagnostics Reports</h2>
            <div className="export-buttons">
              <button onClick={() => download('/reception/exports/reports.csv', token)}>CSV</button>
              <button onClick={() => download('/reception/exports/reports.pdf', token)}>PDF</button>
            </div>
          </div>
          {reports.length ? (
            <div className="sample-types-table-wrapper">
              <table className="sample-types-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Test Results</th>
                    <th>Approved By</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r._id}>
                      <td>{r.patient?.name}<span>{r.patient?.patientId}</span></td>
                      <td>{r.patient?.barcode || r.patient?.patientId}</td>
                      <td>{r.results?.map(x => `${x.sampleName}: ${x.result}`).join('; ')}</td>
                      <td>{r.approvedBy?.fullName || '—'}<span>{r.approvedDate ? new Date(r.approvedDate).toLocaleString() : ''}</span></td>
                      <td>{r.status}</td>
                      <td>
                        <button className="secondary-button" onClick={() => download(`/final-reports/${r._id}.pdf`, token)}>Export PDF</button>{' '}<button className="primary-button" disabled={busy} onClick={() => handlePrintA4Report(r._id)}>{busy ? 'Printing…' : 'Print A4 Report'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">No approved patient reports currently ready for printing.</p>}
        </section>
      )}

      {/* ═══ VIEW 5: COUNSELLING RECORDS HISTORY ═══ */}
      {view === 'counselling' && (
        <section className="table-card">
          <div className="table-title">
            <h2>Counselling Log</h2>
            <div className="export-buttons">
              <button onClick={() => download('/reception/exports/counselling.csv', token)}>CSV</button>
              <button onClick={() => download('/reception/exports/counselling.pdf', token)}>PDF</button>
            </div>
          </div>
          {counselling.length ? (
            <div className="sample-types-table-wrapper">
              <table className="sample-types-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Counselling Reason</th>
                    <th>Notes</th>
                    <th>Registrar Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {counselling.map(x => (
                    <tr key={x._id}>
                      <td>{x.patient?.name}<span>{x.patient?.patientId}</span></td>
                      <td>{x.reason}</td>
                      <td>{x.notes || '—'}</td>
                      <td>{x.registeredBy?.fullName} · {new Date(x.createdDate).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">No counselling cases registered.</p>}
        </section>
      )}

      {/* ═══ POPUP: PATIENT DETAIL HISTORY MODAL ═══ */}
      {history && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', borderRadius: 'var(--radius-lg)' }}>
            <header className="modal-header">
              <h2>Patient History</h2>
              <button className="close-button" onClick={() => setHistory(null)}>&times;</button>
            </header>
            <div className="modal-body" style={{ padding: 'var(--space-4) 0' }}>
              <p><strong>Patient Name:</strong> {history.patient.name} ({history.patient.patientId})</p>
              
              <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', marginTop: 'var(--space-4)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                Previous Visit Timeline
              </h3>
              <ul style={{ paddingLeft: '20px', fontSize: 'var(--text-sm)', marginTop: '6px' }}>
                {history.previousVisits?.map(x => (
                  <li key={x._id} style={{ marginBottom: '4px' }}>
                    {x.patientId} · {new Date(x.registrationDate).toLocaleDateString()}
                  </li>
                )) || <li>No previous visits recorded</li>}
              </ul>

              <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', marginTop: 'var(--space-4)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                Counselling Records
              </h3>
              <p style={{ fontSize: 'var(--text-sm)' }}>{history.counselling?.length || 0} file(s) on record</p>

              <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', marginTop: 'var(--space-4)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                Laboratory Reports
              </h3>
              <p style={{ fontSize: 'var(--text-sm)' }}>{history.reports?.length || 0} diagnostics report(s)</p>
            </div>
            <footer className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="secondary-button" onClick={() => setHistory(null)}>Close</button>
            </footer>
          </div>
        </div>
      )}

      {/* ═══ POPUP: POS THERMAL RECEIPT PRINT MODAL ═══ */}
      {receiptData && (
        <ThermalReceiptModal
          patientData={receiptData}
          total={receiptData._id ? receiptData.grandTotal : billTotal}
          paymentDetails={{
            method: paymentMethod,
            received: counsellingOnly ? undefined : Number(amountReceived),
            balance: counsellingOnly ? undefined : balanceDue,
            cashier: user.fullName
          }}
          token={token}
          onClose={receiptData._id ? () => setReceiptData(null) : handleProceedToRegistration}
        />
      )}

    </section>
  );
}
