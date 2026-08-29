/**
 * ETU Diagnostic Laboratory — Reception Workspace Page
 *
 * Full patient registration, sample selection, billing, and thermal printing
 * workflow. Connects directly to backend patient registries and sample collector queues.
 */

import { memo, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { api, isSilentNetworkError } from '../api/client.js';
import { download } from '../api/download.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { printLabReport } from '../utils/printLabReport.js';
import { useScrollLock } from '../utils/useScrollLock.js';
import { preparePOS80ReceiptData, isCbcParameter, printPOS80ThermalReceipt } from '../utils/receiptDataHelper.js';
import { formatETB } from '../utils/currencyHelper.js';
import ModalPortal from '../components/ModalPortal.jsx';
import ReportPreview from '../components/ReportPreview.jsx';

const formatDate = d => { try { const date = new Date(d); return isNaN(date.getTime()) ? '—' : date.toLocaleString(); } catch { return '—'; } };
const CATEGORY_THEMES = {
  'HEMATOLOGY':                               { icon: '🩸', gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', accent: '#dc2626', light: 'rgba(220,38,38,0.08)' },
  'CLINICAL CHEMISTRY':                       { icon: '🧪', gradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', accent: '#2563eb', light: 'rgba(37,99,235,0.08)' },
  'COAGULATION':                              { icon: '🔬', gradient: 'linear-gradient(135deg, #9333ea 0%, #6b21a8 100%)', accent: '#9333ea', light: 'rgba(147,51,234,0.08)' },
  'SERUM ELECTROLYTE':                        { icon: '⚡', gradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', accent: '#ea580c', light: 'rgba(234,88,12,0.08)' },
  'HORMONE':                                  { icon: '💊', gradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', accent: '#0891b2', light: 'rgba(8,145,178,0.08)' },
  'SEROLOGY':                                 { icon: '🧬', gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)', accent: '#059669', light: 'rgba(5,150,105,0.08)' },
  'BLOOD SUGAR':                              { icon: '🍬', gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', accent: '#d97706', light: 'rgba(217,119,6,0.08)' },
  'URINALYSIS':                               { icon: '🧫', gradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', accent: '#0d9488', light: 'rgba(13,148,136,0.08)' },
  'BACTERIOLOGY':                             { icon: '🦠', gradient: 'linear-gradient(135deg, #65a30d 0%, #4d7c0f 100%)', accent: '#65a30d', light: 'rgba(101,163,13,0.08)' },
  'PARASITOLOGY':                             { icon: '🦠', gradient: 'linear-gradient(135deg, #65a30d 0%, #4d7c0f 100%)', accent: '#65a30d', light: 'rgba(101,163,13,0.08)' },
  'SEMEN':                                    { icon: '🔬', gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', accent: '#7c3aed', light: 'rgba(124,58,237,0.08)' },
  'STOOL':                                    { icon: '🔎', gradient: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)', accent: '#b45309', light: 'rgba(180,83,9,0.08)' },
  'URINE AND BODY FLUID':                     { icon: '💧', gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', accent: '#0284c7', light: 'rgba(2,132,199,0.08)' },
  'REFERRAL':                                 { icon: '🏥', gradient: 'linear-gradient(135deg, #6b7280 0%, #374151 100%)', accent: '#6b7280', light: 'rgba(107,114,128,0.08)' },
  'MICROBIOLOGY':                             { icon: '🧫', gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', accent: '#16a34a', light: 'rgba(22,163,74,0.08)' },
  '_DEFAULT':                                 { icon: '🧪', gradient: 'linear-gradient(135deg, #475569 0%, #334155 100%)', accent: '#475569', light: 'rgba(71,85,105,0.08)' }
};
function getCatTheme(catName) {
  const n = (catName || '').toUpperCase();
  for (const [key, val] of Object.entries(CATEGORY_THEMES)) {
    if (key !== '_DEFAULT' && (n.includes(key) || key.includes(n))) return val;
  }
  return CATEGORY_THEMES._DEFAULT;
}

const ReceptionClock = memo(function ReceptionClock() { const [now,setNow]=useState(()=>new Date()); useEffect(()=>{const id=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(id)},[]); return <p className="intro">{now.toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {now.toLocaleTimeString('en-US')}</p>; });

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

// POS Manual Stock Update Modal Component
// POS Manual Stock Update Modal Component
function ManualStockUpdateModal({ patient, stockItems, token, onClose, setToast }) {
  const [deductions, setDeductions] = useState(() => {
    const testList = patient.laboratoryTests || [];
    const map = new Map();
    testList.forEach(t => {
      const tName = t.name || t;
      (t.consumables || []).forEach(c => {
        const itemObj = stockItems.find(s => String(s._id) === String(c.item?._id || c.item));
        if (!itemObj) return;
        const key = `${itemObj._id}_${tName}`;
        const current = map.get(key) || {
          item: itemObj._id,
          itemName: itemObj.itemName,
          unit: itemObj.unit || '',
          testName: tName,
          currentQuantity: itemObj.remainingQuantity ?? (itemObj.currentQuantity - itemObj.usedQuantity),
          requiredQuantity: 0,
          quantityDeducted: 0
        };
        current.requiredQuantity += Number(c.quantity || 1);
        current.quantityDeducted = current.requiredQuantity;
        map.set(key, current);
      });
    });
    if (map.size === 0) {
      const singleTestName = testList.length === 1 ? (testList[0].name || testList[0]) : '';
      stockItems.forEach(s => {
        map.set(String(s._id), {
          item: s._id,
          itemName: s.itemName,
          unit: s.unit || '',
          testName: singleTestName,
          currentQuantity: s.remainingQuantity ?? (s.currentQuantity - s.usedQuantity),
          requiredQuantity: 0,
          quantityDeducted: 0
        });
      });
    }
    return Array.from(map.values());
  });
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleQtyChange = (key, val) => {
    setDeductions(prev => prev.map(d => {
      const dKey = `${d.item}_${d.testName}`;
      return (dKey === key || String(d.item) === String(key)) ? { ...d, quantityDeducted: Math.max(0, Number(val) || 0) } : d;
    }));
  };

  const activeDeductions = useMemo(() => deductions.filter(d => d.quantityDeducted > 0), [deductions]);

  const handleProceedToConfirm = () => {
    if (activeDeductions.length === 0) {
      setToast({ message: 'Please enter a quantity greater than 0 for at least one stock item.', type: 'error' });
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (activeDeductions.length === 0) {
        onClose();
        return;
      }
      await api('/stock/manual-deduct', {
        token,
        method: 'POST',
        body: JSON.stringify({
          patientId: patient._id,
          patientCode: patient.patientId,
          testNames: (patient.laboratoryTests || []).map(t => t.name || t),
          deductions: activeDeductions.map(d => ({ item: d.item, quantityDeducted: d.quantityDeducted, testName: d.testName }))
        })
      });
      setToast({ message: 'Manual stock update confirmed & deducted successfully.', type: 'success' });
      onClose();
    } catch (e) {
      if (isSilentNetworkError(e)) {
        console.warn('Manual stock update network error:', e);
        return;
      }
      setToast({ message: e.message || 'Failed to update manual stock.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const testNamesList = (patient.laboratoryTests || []).map(t => t.name || t).filter(Boolean).join(', ') || 'Selected Tests';

  return (
    <div className="manual-stock-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <article className="manual-stock-modal">
        <div className="manual-stock-header">
          <h2>📦 Manual Stock Deduction</h2>
          <button className="manual-stock-close" onClick={onClose} disabled={saving} title="Close">&times;</button>
        </div>

        <div className="manual-stock-patient-banner">
          <div><strong>Completed Patient Transaction:</strong> {patient.name} ({patient.patientId})</div>
          <div><strong>Laboratory Tests:</strong> {testNamesList}</div>
        </div>

        {!showConfirmation ? (
          <>
            <div className="manual-stock-table-wrap">
              <table className="manual-stock-table">
                <thead>
                  <tr>
                    <th>Stock Item</th>
                    <th style={{ textAlign: 'right' }}>Current</th>
                    <th style={{ textAlign: 'right' }}>Req.</th>
                    <th style={{ textAlign: 'right' }}>Deduct Qty</th>
                    <th style={{ textAlign: 'right' }}>Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {deductions.map(d => {
                    const remainingAfter = d.currentQuantity - d.quantityDeducted;
                    const rowKey = `${d.item}_${d.testName}`;
                    return (
                      <tr key={rowKey}>
                        <td style={{ fontWeight: 600 }}>
                          {d.itemName}
                          {d.unit && <small style={{ display: 'inline-block', marginLeft: '5px', color: 'var(--color-on-surface-variant)', fontWeight: 400 }}>({d.unit})</small>}
                        </td>
                        <td style={{ textAlign: 'right' }}>{d.currentQuantity}</td>
                        <td style={{ textAlign: 'right' }}>{d.requiredQuantity}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            min="0"
                            className="manual-stock-input"
                            value={d.quantityDeducted}
                            onChange={e => handleQtyChange(rowKey, e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'right', color: remainingAfter < 0 ? '#ef4444' : 'inherit', fontWeight: 600 }}>
                          {remainingAfter}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="manual-stock-actions">
              <button className="secondary-button" onClick={onClose} disabled={saving} style={{ padding: '8px 16px', fontSize: '13px' }}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleProceedToConfirm} disabled={saving} style={{ padding: '8px 16px', fontSize: '13px' }}>
                Review & Confirm
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="manual-stock-confirm-box">
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--color-primary, #075c91)' }}>
                Please Confirm Stock Deduction
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: 'var(--color-on-surface-variant, #607985)' }}>
                Verify the stock items and quantities to be deducted for patient <strong>{patient.name}</strong> ({patient.patientId}):
              </p>

              {activeDeductions.map(d => {
                const remainingAfter = d.currentQuantity - d.quantityDeducted;
                return (
                  <div key={`${d.item}_${d.testName}`} className="manual-stock-confirm-item">
                    <div>
                      <strong>Stock Item:</strong> {d.itemName}
                      {d.testName && <small style={{ display: 'block', color: 'var(--color-on-surface-variant)' }}>For test: {d.testName}</small>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div><strong>Quantity to Deduct:</strong> {d.quantityDeducted} unit(s)</div>
                      <small style={{ color: remainingAfter < 0 ? '#ef4444' : 'var(--color-on-surface-variant)' }}>
                        New Remaining: {remainingAfter}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="manual-stock-actions">
              <button className="secondary-button" onClick={() => setShowConfirmation(false)} disabled={saving} style={{ padding: '8px 16px', fontSize: '13px' }}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleConfirm} disabled={saving} style={{ padding: '8px 16px', fontSize: '13px' }}>
                {saving ? 'Deducting Stock...' : 'Confirm Deduction'}
              </button>
            </div>
          </>
        )}
      </article>
    </div>
  );
}

// POS 80mm Thermal Receipt Component
function ThermalReceiptModal({ patientData, total, paymentDetails, onClose, token, cbcGroupPrice = 150, testCategories = [] }) {
  const [printing, setPrinting] = useState(false);
  if (!patientData) return null;

  // Single source of truth: transforms raw patient/order data into structured receipt items
  const receipt = useMemo(() => {
    return preparePOS80ReceiptData(patientData, {
      testCategories,
      cbcGroupPrice,
      paymentDetails
    });
  }, [patientData, testCategories, cbcGroupPrice, paymentDetails]);

  const handlePrint = async () => {
    if (printing) return;
    setPrinting(true);
    if (receipt.isReprint && patientData._id) {
      try {
        await api(`/reception/patients/${patientData._id}/receipt-print`, { token, method: 'POST' });
      } catch (e) {
        console.error('Failed to log reprint activity:', e.message);
      }
    }
    // Prints directly via 80mm continuous thermal driver without browser headers or A4 breaks
    printPOS80ThermalReceipt(patientData, {
      testCategories,
      cbcGroupPrice,
      paymentDetails
    });
    setPrinting(false);
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
        
        <div style={{ fontSize: '9.5px', lineHeight: '1.35' }}>
          <div><strong>Receipt #:</strong> {receipt.receiptNumber}</div>
          <div><strong>Patient ID:</strong> {receipt.patientId}</div>
          <div><strong>Patient:</strong> {receipt.patientName}</div>
          <div><strong>Date:</strong> {receipt.dateStr}</div>
          <div><strong>Time:</strong> {receipt.timeStr}</div>
        </div>
        <hr />

        <div style={{ fontWeight: 'bold', fontSize: '10.5px', marginBottom: '4px', textTransform: 'uppercase' }}>SELECTED TESTS</div>

        {!receipt.hasTests ? (
          <div style={{ fontSize: '9.5px', color: '#666666', fontStyle: 'italic', padding: '4px 0' }}>
            Counseling Only Service
          </div>
        ) : (
          receipt.categories.map((cat) => (
            <div key={cat.categoryName} style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', color: '#000000', marginBottom: '2px', borderBottom: '1px dotted #444', paddingBottom: '1px' }}>
                {cat.categoryName}
              </div>

              {cat.items.map((item) => {
                if (item.isCbcParent) {
                  return (
                    <div key="cbc-parent-group" style={{ marginBottom: '4px' }}>
                      <div className="item-row cbc-main-row">
                        <span className="item-name">{item.name}</span>
                        <span className="item-price">{formatETB(item.price)}</span>
                      </div>
                      <div style={{ paddingLeft: '8px', marginTop: '2px', marginBottom: '3px' }}>
                        {item.children.map((child) => (
                          <div key={child._id || child.name} className="cbc-subtest-row">
                            <span style={{ fontWeight: 'bold' }}>✓</span>
                            <span>{child.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={item._id || item.name} className="item-row">
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">{formatETB(item.price)}</span>
                  </div>
                );
              })}
            </div>
          ))
        )}

        <hr />

        <div className="total-row">
          <span>GRAND TOTAL</span>
          <span>{formatETB(total !== undefined ? total : receipt.grandTotal)}</span>
        </div>
        {receipt.isReprint && (
          <div style={{ fontSize: '9.5px', lineHeight: '1.35', marginTop: '4px' }}>
            <div><strong>Patient Category:</strong> {receipt.registrationType}</div>
            <div><strong>Service Type:</strong> {receipt.patientCategory}</div>
            {receipt.discountPercent > 0 && (
              <div><strong>Discount:</strong> {receipt.discountPercent}% ({formatETB(receipt.discountAmount)})</div>
            )}
          </div>
        )}
        <hr />

        <div style={{ fontSize: '9.5px', lineHeight: '1.35' }}>
          <div><strong>Payment Method:</strong> {receipt.paymentMethod}</div>
          {receipt.amountReceived !== undefined && (
            <>
              <div><strong>Amount Received:</strong> {formatETB(receipt.amountReceived)}</div>
              <div><strong>Change:</strong> {formatETB(receipt.changeBalance)}</div>
            </>
          )}
          <div><strong>Cashier:</strong> {receipt.cashier}</div>
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
  const { subscribe, unsubscribe } = useRealtime();

  // Dashboard & global data states
  const [dash, setDash] = useState(null);
  const [samples, setSamples] = useState([]);
  const [testCategories, setTestCategories] = useState([]);
  const [testSettings, setTestSettings] = useState({ staffDiscount: 20, collaboratorDiscount: 20, counselingStatus: 'Free', counselingPrice: 0 });
  const [serviceDiscountType, setServiceDiscountType] = useState('Regular Patient');
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [testSearch, setTestSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState({});
  const [testFilter, setTestFilter] = useState('All');
  const [hospitals, setHospitals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [reports, setReports] = useState([]);
  const [counselling, setCounselling] = useState([]);
  const [view, setView] = useState('dashboard');
  const [q, setQ] = useState('');
  const [history, setHistory] = useState(null);
  const [selectedCounselling, setSelectedCounselling] = useState(null);

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
  const [waitingPaymentList, setWaitingPaymentList] = useState([]);
  const [selectedWaitingPaymentPatient, setSelectedWaitingPaymentPatient] = useState(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [manualStockPatient, setManualStockPatient] = useState(null);
  const [pendingManualStockPatient, setPendingManualStockPatient] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [customRadiologyExamName, setCustomRadiologyExamName] = useState('');
  const [showReportFooter, setShowReportFooter] = useState(true);
  const [selectedReportForPreview, setSelectedReportForPreview] = useState(null);

  useScrollLock(!!selectedCounselling || !!history || !!receiptData || !!manualStockPatient || !!pendingManualStockPatient || !!selectedReportForPreview);

  // Patient Registration Form State
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientSex, setPatientSex] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [registrationType, setRegistrationType] = useState('Self');
  const [referralHospital, setReferralHospital] = useState('');
  const [otherHospital, setOtherHospital] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');

  // Startup payload excludes reports and counselling; those load only when opened.
  const loadData = useCallback(async (signal) => {
    try {
      const [d, s, h, stk] = await Promise.all([
        api('/reception/dashboard', { token, signal }),
        api('/laboratory-tests/catalog', { token, signal }),
        api('/reception/referral-hospitals', { token, signal }),
        api('/stock', { token, signal }).catch(() => ({ items: [] }))
      ]);
      setDash(d);
      setSamples(s.categories.flatMap(category => (category.tests || []).map(t => ({ ...t, categoryName: category.name }))));
      setTestCategories(s.categories);
      setTestSettings(s.settings || {});
      setHospitals(h.hospitals);
      setStockItems(stk.items || []);
    } catch (e) {
      if (e.name === 'AbortError' || isSilentNetworkError(e)) return;
      setToast({ message: e.message || 'Error loading reception settings.', type: 'error' });
    }
  }, [token]);

  const loadWaitingPayment = useCallback(async () => {
    try {
      const data = await api('/reception/waiting-payment', { token });
      setWaitingPaymentList(data.patients || []);
    } catch (_) { /* silent */ }
  }, [token]);

  const loadReports = useCallback(async (signal) => {
    try {
      const data = await api(`/reception/reports?q=${encodeURIComponent(q)}`, { token, signal });
      setReports(data.reports || []);
    } catch (e) {
      if (e.name === 'AbortError' || isSilentNetworkError(e)) return;
      setToast({ message: e.message || 'Failed to load approved reports.', type: 'error' });
    }
  }, [q, token]);

  const loadCounselling = useCallback(async (signal) => {
    try {
      const data = await api(`/reception/counselling?q=${encodeURIComponent(q)}`, { token, signal });
      setCounselling(data.records || []);
    } catch (e) {
      if (e.name === 'AbortError' || isSilentNetworkError(e)) return;
      setToast({ message: e.message || 'Failed to load counselling log.', type: 'error' });
    }
  }, [q, token]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    loadWaitingPayment();
    return () => controller.abort();
  }, [loadData, loadWaitingPayment]);

  // Real-time sync — refresh dashboard and active view data on changes
  useEffect(() => {
    const refresh = () => {
      loadData();
      loadWaitingPayment();
      if (view === 'reports') loadReports();
      if (view === 'counselling') loadCounselling();
    };
    subscribe('reception:change', refresh);
    subscribe('reports:change', refresh);
    return () => {
      unsubscribe('reception:change', refresh);
      unsubscribe('reports:change', refresh);
    };
  }, [subscribe, unsubscribe, loadData, loadWaitingPayment, loadReports, loadCounselling, view]);

  // View data fetching (reports & counselling)
  useEffect(() => {
    if (view === 'reports') {
      const controller = new AbortController();
      loadReports(controller.signal);
      return () => controller.abort();
    }
    if (view === 'counselling') {
      const controller = new AbortController();
      loadCounselling(controller.signal);
      return () => controller.abort();
    }
  }, [view, loadReports, loadCounselling]);

  // Live patient search
  useEffect(() => {
    if (!['dashboard', 'patients'].includes(view)) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      api(`/reception/patients?q=${encodeURIComponent(q)}&limit=15`, { token, signal: controller.signal })
        .then(x => setPatients(x.patients))
        .catch(error => {
          if (error.name === 'AbortError' || isSilentNetworkError(error)) return;
          setToast({ message: 'Unable to search patients. Please try again.', type: 'error' });
        });
    }, q ? 300 : 0);
    return () => { clearTimeout(t); controller.abort(); };
  }, [q, token, view]);

  // Bill Calculations
  const isCbcTest = useCallback((t) => {
    const catName = t.categoryName || (typeof t.category === 'object' ? t.category?.name : t.category) || '';
    return isCbcParameter(t, catName);
  }, []);

  const selectedSamples = useMemo(() => {
    return samples.filter(s => selectedSampleIds.includes(s._id));
  }, [samples, selectedSampleIds]);

  const visibleTestCategories = useMemo(() => testCategories.map(category => ({...category,tests:(category.tests||[]).filter(test => {
    const matchSearch=!testSearch||`${test.name} ${test.description||''} ${category.name}`.toLowerCase().includes(testSearch.toLowerCase());
    const matchFilter=testFilter==='All'||(testFilter==='Selected'&&selectedSampleIds.includes(test._id))||(testFilter==='Referral'&&/referral/i.test(category.name))||(testFilter==='Active'&&test.status==='Active')||testFilter==='Popular'||testFilter==='Recently Added';
    return matchSearch&&matchFilter;
  })})).filter(category=>category.tests.length),[testCategories,testSearch,testFilter,selectedSampleIds]);

  const calcCategoryTotal = useCallback((catTests) => {
    const selected = catTests.filter(t => selectedSampleIds.includes(t._id));
    const cbcTests = selected.filter(isCbcTest);
    const nonCbcTests = selected.filter(t => !isCbcTest(t));
    let total = nonCbcTests.reduce((sum, t) => sum + (t.price || 0), 0);
    if (cbcTests.length > 0) {
      total += Number(testSettings.cbcGroupPrice ?? 150);
    }
    return total;
  }, [selectedSampleIds, testSettings, isCbcTest]);

  const billSubtotal = useMemo(() => {
    const cbcGroupPrice = Number(testSettings.cbcGroupPrice ?? 150);
    const cbcTests = [];
    const otherTests = [];
    selectedSamples.forEach(s => {
      if (isCbcTest(s)) {
        cbcTests.push(s);
      } else {
        otherTests.push(s);
      }
    });
    let subtotal = otherTests.reduce((sum, s) => sum + (s.price || 0), 0);
    if (cbcTests.length > 0) {
      subtotal += cbcGroupPrice;
    }
    return subtotal;
  }, [selectedSamples, testSettings, isCbcTest]);
  const discountPercent = serviceDiscountType === 'Staff Member' ? Number(testSettings.staffDiscount || 20) : serviceDiscountType === 'Collaborator' ? Number(testSettings.collaboratorDiscount || 20) : 0;
  const discountAmount = serviceDiscountType === 'Counseling Only' ? 0 : billSubtotal * discountPercent / 100;
  const billTotal = serviceDiscountType === 'Counseling Only' ? (testSettings.counselingStatus === 'Paid' ? Number(testSettings.counselingPrice || 0) : 0) : billSubtotal - discountAmount;

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

  const handleToggleCbcGroup = (subTests) => {
    const subTestIds = subTests.map(t => t._id);
    const allSelected = subTestIds.length > 0 && subTestIds.every(id => selectedSampleIds.includes(id));
    if (allSelected) {
      setSelectedSampleIds(prev => prev.filter(id => !subTestIds.includes(id)));
    } else {
      setSelectedSampleIds(prev => [...new Set([...prev, ...subTestIds])]);
    }
  };

  const handleProceedToTestSelection = (e) => {
    if (e) e.preventDefault();
    if (!patientName.trim() || !patientAge || !patientSex || !patientPhone.trim()) {
      setToast({ message: 'Please fill in all required patient details.', type: 'error' });
      return;
    }
    if (registrationType === 'Referral' && !referralHospital) {
      setToast({ message: 'Please select a referral hospital.', type: 'error' });
      return;
    }
    if (registrationType === 'Referral' && referralHospital === 'Other' && !otherHospital.trim()) {
      setToast({ message: 'Please specify the referral hospital name.', type: 'error' });
      return;
    }
    setWizardStep(2);
  };

  const handleProceedToPayment = () => {
    if (!counsellingOnly && selectedSampleIds.length === 0) {
      setToast({ message: 'Please select at least one laboratory test.', type: 'error' });
      return;
    }
    setWizardStep(3);
  };

  const handleSelfAwareSubmit = async (e) => {
    if (e) e.preventDefault();
    if (submittingRef.current) return;
    if (!patientName.trim() || !patientAge || !patientSex || !patientPhone.trim()) {
      setToast({ message: 'Please fill in all required patient details.', type: 'error' });
      return;
    }
    if (systolicBP && (Number(systolicBP) < 50 || Number(systolicBP) > 300)) {
      setToast({ message: 'Systolic BP must be between 50 and 300 mmHg.', type: 'error' });
      return;
    }
    if (diastolicBP && (Number(diastolicBP) < 30 || Number(diastolicBP) > 200)) {
      setToast({ message: 'Diastolic BP must be between 30 and 200 mmHg.', type: 'error' });
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    try {
      const payload = {
        name: patientName.trim(),
        age: Number(patientAge),
        sex: patientSex,
        phone: patientPhone.trim(),
        address: patientAddress.trim(),
        registrationType: 'Self Aware',
        referralHospital: '',
        laboratoryTests: [],
        patientCategory: 'Regular Patient',
        paymentMethod: 'Cash',
        serviceType: 'Laboratory Test',
        systolicBP: systolicBP ? Number(systolicBP) : null,
        diastolicBP: diastolicBP ? Number(diastolicBP) : null,
      };

      await api('/reception/patients', {
        token,
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setToast({
        message: 'Self-Aware Patient Registered & Sent to Sample Collector Queue',
        type: 'success'
      });

      resetForm();
      loadData();
      setView('dashboard');
    } catch (err) {
      if (isSilentNetworkError(err)) {
        console.warn('Registration network error (silent):', err);
        return;
      }
      setToast({ message: err.message || 'Failed to complete registration.', type: 'error' });
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  // Step 3: Complete Patient Registration and API Submit
  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    if (submittingRef.current) return;
    if (!patientName.trim() || !patientAge || !patientSex || !patientPhone.trim()) {
      setToast({ message: 'Please fill in all required patient details.', type: 'error' });
      return;
    }
    if (systolicBP && (Number(systolicBP) < 50 || Number(systolicBP) > 300)) {
      setToast({ message: 'Systolic BP must be between 50 and 300 mmHg.', type: 'error' });
      return;
    }
    if (diastolicBP && (Number(diastolicBP) < 30 || Number(diastolicBP) > 200)) {
      setToast({ message: 'Diastolic BP must be between 30 and 200 mmHg.', type: 'error' });
      return;
    }
    if (!counsellingOnly && Number(amountReceived) !== billTotal) {
      setToast({ message: 'Amount received must exactly equal the grand total.', type: 'error' });
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
        laboratoryTests: selectedSampleIds,
        patientCategory: serviceDiscountType === 'Counseling Only' ? 'Regular Patient' : serviceDiscountType,
        paymentMethod,
        counsellingOnly,
        serviceType: counsellingOnly ? 'Counseling Only' : 'Laboratory Test',
        counsellingReason: counsellingOnly ? counsellingReason : '',
        counsellingNotes: counsellingOnly ? counsellingNotes : '',
        customRadiologyExamName: customRadiologyExamName.trim(),
        systolicBP: systolicBP ? Number(systolicBP) : null,
        diastolicBP: diastolicBP ? Number(diastolicBP) : null,
      };

      const result = await api('/reception/patients', {
        token,
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const successMsg = counsellingOnly
        ? 'Counselling Registered Successfully'
        : 'Patient Registered & Sent to Sample Collector Queue';

      handlePostPayment(result.patient, successMsg, counsellingOnly);
    } catch (err) {
      if (isSilentNetworkError(err)) {
        console.warn('Registration network error (silent):', err);
        return;
      }
      setToast({ message: err.message || 'Failed to complete registration.', type: 'error' });
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  const handlePostPayment = (patientRecord, successMessage, isCounselling = false) => {
    setToast({
      message: successMessage || `Payment completed for ${patientRecord.name}. Sent to Sample Collector Queue.`,
      type: 'success'
    });

    if (!isCounselling) {
      // Step 1: Open POS80 Thermal Receipt Modal immediately after payment
      setReceiptData(patientRecord);

      // Step 2: Queue Manual Stock Patient (will trigger AFTER receipt modal is closed)
      if (testSettings.stockManagementMode === 'Manual') {
        setPendingManualStockPatient(patientRecord);
      }
    }

    setSelectedWaitingPaymentPatient(null);
    resetForm();
    loadData();
    loadWaitingPayment();
    setView('dashboard');
  };

  const handleCloseReceipt = () => {
    setReceiptData(null);
    if (pendingManualStockPatient) {
      setManualStockPatient(pendingManualStockPatient);
      setPendingManualStockPatient(null);
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
    setSystolicBP('');
    setDiastolicBP('');
    setCustomRadiologyExamName('');
    setSelectedWaitingPaymentPatient(null);
  };

  const handleOpenWaitingPayment = (patient) => {
    setSelectedWaitingPaymentPatient(patient);
    setPatientName(patient.name);
    setPatientAge(patient.age);
    setPatientSex(patient.sex);
    setPatientPhone(patient.phone);
    setSystolicBP(patient.systolicBP || '');
    setDiastolicBP(patient.diastolicBP || '');
    setRegistrationType('Self Aware');
    setSelectedSampleIds((patient.laboratoryTests || []).map(t => String(t._id || t)));
    setAmountReceived(String(patient.grandTotal || ''));
    setWizardStep(3);
    setView('register');
  };

  const handleCompleteWaitingPayment = async (e) => {
    if (e) e.preventDefault();
    if (submittingRef.current || !selectedWaitingPaymentPatient) return;
    if (Number(amountReceived) !== billTotal) {
      setToast({ message: 'Amount received must exactly equal the grand total.', type: 'error' });
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    try {
      const result = await api(`/reception/patients/${selectedWaitingPaymentPatient._id}/complete-payment`, {
        token,
        method: 'POST',
        body: JSON.stringify({ paymentMethod }),
      });

      const successMsg = `Payment completed for ${selectedWaitingPaymentPatient.name}. Returned to Sample Collector Queue.`;
      handlePostPayment(result.patient, successMsg, false);
    } catch (err) {
      if (isSilentNetworkError(err)) {
        console.warn('Payment network error (silent):', err);
        return;
      }
      setToast({ message: err.message || 'Failed to complete payment.', type: 'error' });
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
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
      if (isSilentNetworkError(e)) {
        console.warn('History network error (silent):', e);
        return;
      }
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
      printLabReport(report, token, user, showReportFooter);
      setToast({ message: 'A4 report preview opened with the latest report data.', type: 'success' });
      loadData();
    } catch (e) {
      if (isSilentNetworkError(e)) {
        console.warn('Report print network error (silent):', e);
        return;
      }
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
          <h1>Welcome, {user.fullName} <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: '#e0f2fe', color: '#075c91', marginLeft: '10px' }}>📍 Branch: {user.branchName || 'Main'}</span></h1>
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
          ['waiting-payment', `💳 Waiting for Payment ${waitingPaymentList.length ? `(${waitingPaymentList.length})` : ''}`],
          ['patients', '🧑‍⚕️ Patient Search'],
          ['reports', '📝 Approved Reports'],
          ['counselling', '🗂️ Counselling History']].map(([id, label]) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => { if (id !== 'register') setSelectedWaitingPaymentPatient(null); setView(id); }}>
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
              <strong>{formatETB(dash?.summary.todayIncome)}</strong>
            </article>
            <article className="stat-card teal">
              <small>Weekly Income</small>
              <strong>{formatETB(dash?.summary.weeklyIncome)}</strong>
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
                      <td><strong>{formatETB(tx.grandTotal)}</strong></td>
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
            
            {/* STEP 1: PATIENT REGISTRATION */}
            {wizardStep === 1 && (
              <div className="wizard-step-panel">
                <h2>Step 1 — Patient Registration</h2>
                <form onSubmit={registrationType === 'Self Aware' ? handleSelfAwareSubmit : handleProceedToTestSelection}>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <div className="form-group">
                      <label>Patient Type</label>
                      <select value={registrationType} onChange={e => setRegistrationType(e.target.value)}>
                        <option value="Self">Self</option>
                        <option value="Referral">Referral</option>
                        <option value="Self Aware">Self Aware</option>
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

                  {/* ═══ VITAL SIGNS (OPTIONAL) ═══ */}
                  <div style={{
                    background: 'var(--color-surface-container, #f8fafc)',
                    border: '1px solid var(--color-outline-variant, #e2e8f0)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginTop: '14px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1rem' }}>🫀</span>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--color-primary, #075c91)' }}>Vital Signs (Optional)</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Systolic BP (mmHg)</label>
                        <input
                          type="number"
                          min="50"
                          max="300"
                          placeholder="e.g. 120"
                          value={systolicBP}
                          onChange={e => setSystolicBP(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Diastolic BP (mmHg)</label>
                        <input
                          type="number"
                          min="30"
                          max="200"
                          placeholder="e.g. 80"
                          value={diastolicBP}
                          onChange={e => setDiastolicBP(e.target.value)}
                        />
                      </div>
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

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
                    {registrationType === 'Self Aware' ? (
                      <button type="submit" disabled={busy} className="primary-button">
                        {busy ? 'Registering...' : 'Register & Send to Sample Collector →'}
                      </button>
                    ) : (
                      <button type="submit" className="primary-button">
                        Continue to Step 2 — Laboratory Test Type Selection →
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: LABORATORY TEST TYPE SELECTION */}
            {wizardStep === 2 && (
              <div className="wizard-step-panel">
                <div className="lab-step2-header">
                  <div className="lab-step2-title-row">
                    <div className="lab-step2-title-icon">🧬</div>
                    <div>
                      <h2>Laboratory Test Selection</h2>
                      <p className="lab-step2-subtitle">Select requested laboratory tests. Specimens are assigned automatically.</p>
                    </div>
                  </div>
                  {selectedSampleIds.length > 0 && (
                    <div className="lab-step2-selection-pill">
                      <span className="lab-step2-pill-count">{selectedSampleIds.length}</span>
                      <span>test{selectedSampleIds.length !== 1 ? 's' : ''} selected</span>
                    </div>
                  )}
                </div>

                {/* Global Search & Filter Toolbar */}
                <div className="lab-v2-toolbar">
                  <div className="lab-v2-search-box">
                    <span className="lab-v2-search-icon">🔍</span>
                    <input
                      value={testSearch}
                      onChange={e => setTestSearch(e.target.value)}
                      placeholder="Search tests across all categories..."
                      aria-label="Search laboratory tests"
                    />
                    {testSearch && (
                      <button type="button" className="lab-v2-search-clear" onClick={() => setTestSearch('')}>✕</button>
                    )}
                  </div>
                  <div className="lab-v2-filter-chips" role="toolbar" aria-label="Laboratory test filters">
                    {['All','Popular','Recently Added','Referral','Active','Selected'].map(item => (
                      <button
                        key={item}
                        type="button"
                        className={`lab-v2-chip ${testFilter === item ? 'active' : ''}`}
                        onClick={() => setTestFilter(item)}
                      >
                        {item === 'Selected' && selectedSampleIds.length > 0 && (
                          <span className="lab-v2-chip-badge">{selectedSampleIds.length}</span>
                        )}
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Cards Grid */}
                <div className="lab-v2-categories">
                  {visibleTestCategories.map((category, catIdx) => {
                    const expanded = expandedCategories.includes(category._id);
                    const selectedCount = (category.tests || []).filter(t => selectedSampleIds.includes(t._id)).length;
                    const theme = getCatTheme(category.name);
                    const catSearchVal = categorySearch[category._id] || '';
                    const totalTests = (category.tests || []).length;

                    // Filter tests within category by local search
                    const filteredTests = catSearchVal
                      ? (category.tests || []).filter(t => `${t.name} ${t.description || ''}`.toLowerCase().includes(catSearchVal.toLowerCase()))
                      : (category.tests || []);

                    return (
                      <section
                        key={category._id}
                        className={`lab-v2-cat-card ${expanded ? 'expanded' : ''}`}
                        style={{ '--cat-accent': theme.accent, '--cat-gradient': theme.gradient, '--cat-light': theme.light, animationDelay: `${catIdx * 0.04}s` }}
                      >
                        {/* Category Header */}
                        <button
                          type="button"
                          className="lab-v2-cat-header"
                          aria-expanded={expanded}
                          onClick={() => setExpandedCategories(current => expanded ? current.filter(id => id !== category._id) : [...current, category._id])}
                        >
                          <div className="lab-v2-cat-icon-wrap" style={{ background: theme.gradient }}>
                            <span className="lab-v2-cat-icon">{theme.icon}</span>
                          </div>
                          <div className="lab-v2-cat-info">
                            <strong className="lab-v2-cat-name">{category.name}</strong>
                            <span className="lab-v2-cat-meta">
                              {totalTests} test{totalTests !== 1 ? 's' : ''} available
                            </span>
                          </div>
                          <div className="lab-v2-cat-right">
                            {selectedCount > 0 && (
                              <span className="lab-v2-cat-selected-badge">
                                ✓ {selectedCount}
                              </span>
                            )}
                            <span className={`lab-v2-cat-chevron ${expanded ? 'open' : ''}`}>
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                          </div>
                        </button>

                        {/* Expanded Content */}
                        {expanded && (
                          <div className="lab-v2-cat-body">
                            {/* Category-level search & status */}
                            <div className="lab-v2-cat-toolbar">
                              <div className="lab-v2-cat-search">
                                <span>🔍</span>
                                <input
                                  value={catSearchVal}
                                  onChange={e => setCategorySearch(prev => ({ ...prev, [category._id]: e.target.value }))}
                                  placeholder={`Search within ${category.name}...`}
                                />
                                {catSearchVal && (
                                  <button type="button" className="lab-v2-search-clear" onClick={() => setCategorySearch(prev => ({ ...prev, [category._id]: '' }))}>✕</button>
                                )}
                              </div>
                              <div className="lab-v2-cat-stats">
                                <span className="lab-v2-cat-stat">
                                  Showing <strong>{filteredTests.length}</strong> of {totalTests}
                                </span>
                                {selectedCount > 0 && (
                                  <span className="lab-v2-cat-stat selected">
                                    {/^HEMATOLOGY$/i.test(category.name) ? (
                                      <strong>{selectedCount} selected</strong>
                                    ) : (
                                      <>
                                        <strong>{selectedCount}</strong> selected · {formatETB(calcCategoryTotal(category.tests || []))}
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Test Items */}
                            {(() => {
                              const hasSubcats = filteredTests.some(t => t.subcategory);
                              if (!hasSubcats) {
                                return (
                                  <div className="lab-v2-tests-grid">
                                    {filteredTests.map(test => {
                                      const isSelected = selectedSampleIds.includes(test._id);
                                      return (
                                        <label key={test._id} className={`lab-v2-test-card ${isSelected ? 'selected' : ''}`}>
                                          <div className={`lab-v2-checkbox ${isSelected ? 'checked' : ''}`}>
                                            <input type="checkbox" checked={isSelected} onChange={() => handleToggleSample(test._id)} />
                                            {isSelected && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                          </div>
                                          <div className="lab-v2-test-info">
                                            <strong>{test.name}</strong>
                                            {test.description && <small>{test.description}</small>}
                                          </div>
                                          <div className="lab-v2-test-price">{formatETB(test.price)}</div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                );
                              }

                              // Subcategory grouping
                              const subMap = new Map();
                              filteredTests.forEach(test => {
                                const sc = test.subcategory || 'GENERAL';
                                if (!subMap.has(sc)) subMap.set(sc, []);
                                subMap.get(sc).push(test);
                              });

                              return Array.from(subMap.entries()).map(([subName, subTests]) => {
                                const isCbcSub = /^CBC$/i.test(subName) && /^HEMATOLOGY$/i.test(category.name);
                                const allCbcSelected = subTests.length > 0 && subTests.every(t => selectedSampleIds.includes(t._id));
                                const subSelected = subTests.filter(t => selectedSampleIds.includes(t._id)).length;
                                return (
                                  <div key={subName} className="lab-v2-subcat-group">
                                    <div className="lab-v2-subcat-header">
                                      <span className="lab-v2-subcat-marker" style={{ background: theme.accent }}></span>
                                      <span className="lab-v2-subcat-name">{subName}</span>
                                      <span className="lab-v2-subcat-count">{subTests.length} test{subTests.length !== 1 ? 's' : ''}</span>
                                      {subSelected > 0 && <span className="lab-v2-subcat-selected">{subSelected} selected</span>}
                                    </div>
                                    {isCbcSub && (
                                      <div
                                        className={`lab-v2-test-card ${allCbcSelected ? 'selected' : ''}`}
                                        style={{
                                          margin: '8px 12px 14px 12px',
                                          padding: '12px 16px',
                                          border: allCbcSelected ? '2px solid var(--color-primary, #075c91)' : '2px dashed #0284c7',
                                          background: allCbcSelected ? '#e0f2fe' : '#f0f9ff',
                                          borderRadius: '10px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          cursor: 'pointer',
                                          boxShadow: allCbcSelected ? '0 2px 8px rgba(7, 92, 145, 0.15)' : 'none'
                                        }}
                                        onClick={() => handleToggleCbcGroup(subTests)}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                          <div className={`lab-v2-checkbox ${allCbcSelected ? 'checked' : ''}`}>
                                            <input
                                              type="checkbox"
                                              checked={allCbcSelected}
                                              onChange={() => handleToggleCbcGroup(subTests)}
                                            />
                                            {allCbcSelected && (
                                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                <path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                              </svg>
                                            )}
                                          </div>
                                          <div className="lab-v2-test-info">
                                            <strong style={{ fontSize: '1.02rem', color: 'var(--color-primary, #075c91)' }}>
                                              🩸 CBC — Complete Blood Count (Complete Group)
                                            </strong>
                                            <small style={{ color: 'var(--color-on-surface-variant, #475569)', display: 'block', marginTop: '2px' }}>
                                              Single fixed price · Automatically includes all {subTests.length} CBC sub-test parameters for result entry &amp; reports
                                            </small>
                                          </div>
                                        </div>
                                        <div className="lab-v2-test-price" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary, #075c91)' }}>
                                          {formatETB(testSettings.cbcGroupPrice ?? 150)}
                                        </div>
                                      </div>
                                    )}
                                    <div className="lab-v2-tests-grid">
                                      {subTests.map(test => {
                                        const isSelected = selectedSampleIds.includes(test._id);
                                        return (
                                          <label key={test._id} className={`lab-v2-test-card ${isSelected ? 'selected' : ''}`}>
                                            <div className={`lab-v2-checkbox ${isSelected ? 'checked' : ''}`}>
                                              <input type="checkbox" checked={isSelected} onChange={() => handleToggleSample(test._id)} />
                                              {isSelected && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                            </div>
                                            <div className="lab-v2-test-info">
                                              <strong>{test.name}</strong>
                                              {test.description && <small>{test.description}</small>}
                                            </div>
                                            <div className="lab-v2-test-price">{isCbcSub ? <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Included in CBC</span> : formatETB(test.price)}</div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              });
                            })()}

                            {filteredTests.length === 0 && (
                              <div className="lab-v2-empty">
                                <span>🔍</span>
                                <p>No tests match your search in this category.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>

                {visibleTestCategories.length === 0 && (
                  <div className="lab-v2-no-results">
                    <span style={{ fontSize: '2rem' }}>🔬</span>
                    <p>No categories match your current filters.</p>
                    <button type="button" className="secondary-button" onClick={() => { setTestSearch(''); setTestFilter('All'); }}>Clear Filters</button>
                  </div>
                )}

                {/* Custom Radiology Exam Name if Ultrasound - Other selected */}
                {selectedSamples.some(s => s.name?.includes('Other') && (s.categoryName === 'RADIOLOGY' || s.category?.name === 'RADIOLOGY')) && (
                  <div style={{ marginTop: '14px', marginBottom: '14px', padding: '12px 16px', background: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
                      Ultrasound Specific Examination Name * <span style={{ fontSize: '11px', fontWeight: 600, background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '6px', marginLeft: '6px' }}>Fixed Price: 800 ETB</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="global-input"
                      value={customRadiologyExamName}
                      onChange={e => setCustomRadiologyExamName(e.target.value)}
                      placeholder="e.g. Thyroid Ultrasound, Pelvic Ultrasound, Scrotal Ultrasound"
                      style={{ width: '100%', background: '#fff' }}
                    />
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="lab-v2-nav-buttons">
                  <button className="secondary-button" onClick={() => setWizardStep(1)}>
                    ← Back to Patient Registration
                  </button>
                  <button className="primary-button lab-v2-proceed-btn" onClick={handleProceedToPayment}>
                    Proceed to Payment →
                    {selectedSampleIds.length > 0 && <span className="lab-v2-proceed-badge">{selectedSampleIds.length}</span>}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PAYMENT */}
            {wizardStep === 3 && (
              <div className="wizard-step-panel">
                <h2>Step 3 — Payment</h2>

                {selectedWaitingPaymentPatient && (
                  <div style={{ background: 'var(--color-surface-container, #f8fafc)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--color-outline-variant, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{patientName}</strong> <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>({patientAge} / {patientSex} · 📞 {patientPhone})</span>
                    </div>
                    <div>
                      {(systolicBP || diastolicBP) ? (
                        <span className="pm-badge" style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700 }}>
                          🫀 BP: {systolicBP || '—'}/{diastolicBP || '—'} mmHg
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>BP: Not recorded</span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label>Service &amp; Discount Type</label>
                  <select value={serviceDiscountType} onChange={e => { const next = e.target.value; setServiceDiscountType(next); setCounsellingOnly(next === 'Counseling Only'); setAmountReceived(''); }}>
                    <option>Regular Patient</option><option>Staff Member</option><option>Collaborator</option><option>Counseling Only</option>
                  </select>
                  <small>{serviceDiscountType === 'Counseling Only' ? `Counseling fee: ${formatETB(billTotal)}` : discountPercent ? `${discountPercent}% discount applied: ${formatETB(discountAmount)}` : 'Standard laboratory service pricing.'}</small>
                </div>
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
                    <strong>{formatETB(billTotal)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>
                    <span>Change Balance:</span>
                    <strong>{formatETB(balanceDue)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-5)' }}>
                  <button className="secondary-button" onClick={() => selectedWaitingPaymentPatient ? setView('waiting-payment') : setWizardStep(2)}>
                    {selectedWaitingPaymentPatient ? '← Back to Waiting Payment' : '← Back to Step 2 — Test Type Selection'}
                  </button>
                  {selectedWaitingPaymentPatient ? (
                    <button className="primary-button" onClick={handleCompleteWaitingPayment} disabled={busy}>
                      {busy ? 'Processing...' : 'Complete Payment →'}
                    </button>
                  ) : (
                    <button className="primary-button" onClick={handleRegisterSubmit} disabled={busy}>
                      {busy ? 'Processing...' : 'Confirm Payment & Complete Registration'}
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* WIZARD RIGHT SIDEBAR: LIVE BILL SUMMARY */}
          <div>
            <div className="bill-summary-card lab-bill-summary lab-v2-bill">
              <div className="lab-v2-bill-header">
                <div className="lab-v2-bill-icon">💰</div>
                <div>
                  <small>LIVE BILLING</small>
                  <h3>Receipt Summary</h3>
                </div>
              </div>

              <div className="lab-v2-bill-items">
                {selectedSamples.length === 0 ? (
                  <div className="lab-v2-bill-empty">
                    <span>🧪</span>
                    <p>No tests selected yet</p>
                    <small>Select laboratory tests to begin billing</small>
                  </div>
                ) : (() => {
                  const grouped = new Map();
                  selectedSamples.forEach(s => {
                    const catName = s.categoryName || testCategories.find(c => (c.tests || []).some(t => t._id === s._id))?.name || 'Other';
                    if (!grouped.has(catName)) grouped.set(catName, []);
                    grouped.get(catName).push(s);
                  });
                  return Array.from(grouped.entries()).map(([catName, tests]) => {
                    const catTheme = getCatTheme(catName);
                    const isHematology = /^HEMATOLOGY$/i.test(catName);
                    const cbcTests = isHematology ? tests.filter(isCbcTest) : [];
                    const nonCbcTests = isHematology ? tests.filter(t => !isCbcTest(t)) : tests;

                    return (
                      <div key={catName} className="lab-v2-bill-cat-group">
                        <div className="lab-v2-bill-cat-label">
                          <span className="lab-v2-bill-cat-dot" style={{ background: catTheme.accent }}></span>
                          <span>{catName}</span>
                          <span className="lab-v2-bill-cat-count">
                            {cbcTests.length > 0 ? (nonCbcTests.length + 1) : tests.length}
                          </span>
                        </div>
                        {cbcTests.length > 0 && (
                          <div className="lab-v2-bill-item" style={{ background: '#f0f9ff', borderRadius: '6px', padding: '6px 10px', borderLeft: '3px solid var(--color-primary, #075c91)' }}>
                            <span className="lab-v2-bill-item-name" style={{ fontWeight: 700, color: 'var(--color-primary, #075c91)' }}>
                              🩸 CBC — Complete Blood Count ({cbcTests.length} parameters)
                            </span>
                            <strong style={{ color: 'var(--color-primary, #075c91)' }}>
                              {formatETB(testSettings.cbcGroupPrice ?? 150)}
                            </strong>
                          </div>
                        )}
                        {nonCbcTests.map(s => (
                          <div key={s._id} className="lab-v2-bill-item">
                            <span className="lab-v2-bill-item-name">{s.name}</span>
                            <strong>{formatETB(s.price)}</strong>
                          </div>
                        ))}
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="lab-v2-bill-breakdown">
                <div className="lab-v2-bill-row"><span>Selected Tests</span><strong>{selectedSampleIds.length}</strong></div>
                <div className="lab-v2-bill-row"><span>Subtotal</span><strong>{formatETB(billSubtotal)}</strong></div>
                {discountAmount > 0 && <div className="lab-v2-bill-row discount"><span>Discount ({discountPercent}%)</span><strong>− {formatETB(discountAmount)}</strong></div>}
                {counsellingOnly && testSettings.counselingStatus === 'Paid' && <div className="lab-v2-bill-row"><span>Counseling Fee</span><strong>{formatETB(testSettings.counselingPrice)}</strong></div>}
              </div>

              <div className="lab-v2-bill-total">
                <span>Grand Total</span>
                <strong>{formatETB(billTotal)}</strong>
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

      {/* ═══ WAITING FOR PAYMENT QUEUE VIEW ═══ */}
      {view === 'waiting-payment' && (
        <section className="table-card">
          <div className="table-title">
            <div>
              <h2>Self-Aware Patients — Waiting for Payment</h2>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-on-surface-variant)' }}>
                Laboratory Test Types assigned by Sample Collector during Investigation. Proceed directly to Payment.
              </span>
            </div>
          </div>
          {waitingPaymentList.length ? (
            <div className="sample-types-table-wrapper">
              <table className="sample-types-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Patient ID</th>
                    <th>Phone</th>
                    <th>Vital Signs (BP)</th>
                    <th>Selected Tests</th>
                    <th>Grand Total</th>
                    <th>Branch</th>
                    <th>Receptionist</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingPaymentList.map(p => (
                    <tr key={p._id}>
                      <td><strong>{p.name}</strong></td>
                      <td><code>{p.patientId}</code></td>
                      <td>{p.phone}</td>
                      <td>{(p.systolicBP || p.diastolicBP) ? <strong style={{ color: 'var(--color-primary)' }}>🫀 {p.systolicBP || '—'}/{p.diastolicBP || '—'} mmHg</strong> : <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>}</td>
                      <td>{(p.laboratoryTests || []).map(t => t.name).join(', ') || '—'}</td>
                      <td><strong>{formatETB(p.grandTotal)}</strong></td>
                      <td><span className="pm-badge">📍 {p.branchName || 'Main'}</span></td>
                      <td>{p.registeredBy?.fullName || '—'}</td>
                      <td>
                        <button
                          className="primary-button"
                          onClick={() => handleOpenWaitingPayment(p)}
                          style={{ padding: '4px 12px', fontSize: 'var(--text-xs)' }}
                        >
                          💳 Proceed to Payment →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">No Self-Aware patients waiting for payment.</p>}
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
          <div className="table-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h2>Approved Diagnostics Reports</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showReportFooter}
                  onChange={e => setShowReportFooter(e.target.checked)}
                />
                Show Logo & Footer
              </label>
              <div className="export-buttons">
                <button onClick={() => download('/reception/exports/reports.csv', token)}>CSV</button>
                <button onClick={() => download('/reception/exports/reports.pdf', token)}>PDF</button>
              </div>
            </div>
          </div>
          {reports.length ? (
            <div className="sample-types-table-wrapper">
              <table className="sample-types-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Department & Examination</th>
                    <th>Report Summary</th>
                    <th>Approved By</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => {
                    const dept = r.department || (r.testType ? 'Pathology' : r.examinationType ? 'Radiology' : 'Laboratory');
                    const isPath = dept === 'Pathology';
                    const isRad = dept === 'Radiology';
                    const examLabel = r.testType || r.customExaminationName || r.ultrasoundSubtype || r.examinationType || (r.results?.map(x => x.sampleName).slice(0, 2).join(', ')) || 'Laboratory Tests';

                    return (
                      <tr key={r._id}>
                        <td><strong>{r.patient?.name}</strong><span>{r.patient?.patientId}</span></td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: isPath ? '#fef3c7' : isRad ? '#e0f2fe' : '#e0e7ff', color: isPath ? '#92400e' : isRad ? '#0369a1' : '#3730a3' }}>
                            {dept}
                          </span>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '2px', color: '#1e293b' }}>
                            {examLabel}
                          </div>
                        </td>
                        <td>
                          {r.results?.length ? (
                            r.results.slice(0, 2).map(x => `${x.sampleName}: ${x.result}`).join('; ')
                          ) : r.reportContent ? (
                            <span style={{ color: '#0369a1', fontStyle: 'italic' }}>Detailed Specialist Report</span>
                          ) : r.structuredReport?.diagnosis ? (
                            <span>{r.structuredReport.diagnosis}</span>
                          ) : r.structuredReport?.impression ? (
                            <span>{r.structuredReport.impression}</span>
                          ) : 'Complete Clinical Report'}
                        </td>
                        <td>
                          <strong>{r.approvedBy?.fullName ? `Dr. ${r.approvedBy.fullName}` : (r.pathologist?.fullName ? `Dr. ${r.pathologist.fullName}` : (r.radiologist?.fullName ? `Dr. ${r.radiologist.fullName}` : '—'))}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>{r.approvedDate ? new Date(r.approvedDate).toLocaleString() : ''}</span>
                        </td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: '#dcfce7', color: '#166534', fontWeight: 600 }}>
                            {r.status || 'Ready for Printing'}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="secondary-button"
                              style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 600 }}
                              onClick={() => setSelectedReportForPreview(r)}
                            >
                              👁️ Preview
                            </button>
                            <button
                              type="button"
                              className="primary-button"
                              disabled={busy}
                              style={{ padding: '5px 12px', fontSize: '11.5px', fontWeight: 600 }}
                              onClick={() => handlePrintA4Report(r._id)}
                            >
                              {busy ? 'Printing…' : '🖨️ Print A4'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">No approved patient reports currently ready for printing.</p>}

          {/* ── A4 Report Preview Modal ────────────────────────────── */}
          {selectedReportForPreview && (
            <ModalPortal isOpen={!!selectedReportForPreview} onClose={() => setSelectedReportForPreview(null)}>
              <div
                className="modal-content"
                style={{
                  maxWidth: '860px',
                  maxHeight: '92vh',
                  overflowY: 'auto',
                  padding: '0',
                  background: '#e2e8f0',
                  borderRadius: '10px'
                }}
                onClick={e => e.stopPropagation()}
              >
                <header
                  className="modal-header"
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: '#fff',
                    zIndex: 10,
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
                    <h2 style={{ fontSize: '1.15rem', color: '#075c91', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📄</span> A4 Report Preview
                    </h2>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={showReportFooter}
                        onChange={e => setShowReportFooter(e.target.checked)}
                      />
                      Show Logo & Footer
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={busy}
                      style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600 }}
                      onClick={() => {
                        if (selectedReportForPreview) {
                          handlePrintA4Report(selectedReportForPreview._id);
                        }
                      }}
                    >
                      {busy ? 'Printing…' : '🖨️ Print A4 Report'}
                    </button>
                    <button className="close-button" onClick={() => setSelectedReportForPreview(null)}>&times;</button>
                  </div>
                </header>

                {/* A4 Document Canvas */}
                <div style={{ padding: '24px 16px', display: 'flex', justifyContent: 'center', background: '#cbd5e1' }}>
                  <ReportPreview report={selectedReportForPreview} showFooter={showReportFooter} />
                </div>
              </div>
            </ModalPortal>
          )}
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {counselling.map(x => (
                    <tr key={x._id}>
                      <td>{x.patient?.name}<span>{x.patient?.patientId}</span></td>
                      <td>{x.reason}</td>
                      <td>{x.notes || '—'}</td>
                      <td>{x.registeredBy?.fullName} · {new Date(x.createdDate).toLocaleString()}</td>
                      <td>
                        <button className="secondary-button" onClick={() => setSelectedCounselling(x)} style={{ fontSize: '11px', padding: '4px 10px' }}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">No counselling cases registered.</p>}
        </section>
      )}

      {/* ═══ POPUP: COUNSELLING DETAIL MODAL ═══ */}
      {selectedCounselling && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelectedCounselling(null); }}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <header className="modal-header">
              <h2 style={{ fontSize: '1.2rem', color: 'var(--color-primary, #075c91)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💬</span> Counselling Record Details
              </h2>
              <button className="close-button" onClick={() => setSelectedCounselling(null)}>&times;</button>
            </header>

            <div style={{ background: 'var(--color-primary-light, rgba(7, 92, 145, 0.08))', border: '1px solid rgba(7, 92, 145, 0.18)', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', fontSize: '0.88rem' }}>
              <div><strong>Patient Name:</strong> {selectedCounselling.patient?.name} ({selectedCounselling.patient?.patientId})</div>
              <div><strong>Registered By:</strong> {selectedCounselling.registeredBy?.fullName || '—'} · {new Date(selectedCounselling.createdDate).toLocaleString()}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <div style={{ background: 'var(--color-surface-bright, #fff)', border: '1px solid var(--color-outline-variant, rgba(0,0,0,0.08))', borderRadius: '10px', padding: '12px' }}>
                <strong>Counselling Reason:</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--color-on-surface)' }}>{selectedCounselling.reason || 'Standard Counseling'}</p>
              </div>

              {selectedCounselling.notes && (
                <div style={{ background: 'var(--color-surface-bright, #fff)', border: '1px solid var(--color-outline-variant, rgba(0,0,0,0.08))', borderRadius: '10px', padding: '12px' }}>
                  <strong>Counselling Notes & Recommendations:</strong>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--color-on-surface)' }}>{selectedCounselling.notes}</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', marginTop: '12px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <button className="secondary" onClick={() => setSelectedCounselling(null)}>Close Record</button>
            </div>
          </div>
        </div>
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
          total={receiptData._id && receiptData.grandTotal !== undefined ? receiptData.grandTotal : billTotal}
          paymentDetails={{
            method: receiptData.paymentMethod || paymentMethod,
            received: receiptData._id ? undefined : (counsellingOnly ? undefined : Number(amountReceived)),
            balance: receiptData._id ? undefined : (counsellingOnly ? undefined : balanceDue),
            cashier: (typeof receiptData.registeredBy === 'object' ? receiptData.registeredBy?.fullName : receiptData.registeredBy) || user?.fullName || 'Receptionist'
          }}
          token={token}
          onClose={handleCloseReceipt}
          cbcGroupPrice={testSettings?.cbcGroupPrice ?? 150}
          testCategories={testCategories}
        />
      )}

      {/* ═══ POPUP: MANUAL STOCK UPDATE MODAL ═══ */}
      {manualStockPatient && (
        <ManualStockUpdateModal
          patient={manualStockPatient}
          stockItems={stockItems}
          token={token}
          onClose={() => setManualStockPatient(null)}
          setToast={setToast}
        />
      )}

    </section>
  );
}
