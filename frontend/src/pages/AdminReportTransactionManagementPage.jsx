/**
 * ETU Diagnostic Laboratory — Admin Report & Transaction Management Page
 *
 * Dedicated Admin workspace for comprehensive laboratory operations:
 * - Patient Queue (with Admin-only Queue Delete capability without patient deletion)
 * - Cross-Branch Transfers: Received From Otona & Received From Main
 * - Self-Aware Investigation Workspace (symptoms interview & test selection)
 * - Report Workflow (Drafts, Pending Approval, Approved, Rejected)
 * - Cleared Information & Restore to Received
 * - Unfinished Collections Work Area
 * - Branch Filter (All Branches, Main, Otona) for CEO/Admin
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, isSilentNetworkError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { useScrollLock } from '../utils/useScrollLock.js';
import ModalPortal from '../components/ModalPortal.jsx';
import ReportPreview from '../components/ReportPreview.jsx';
import LaboratoryResultEditor from '../components/LaboratoryResultEditor.jsx';
import ClinicalInterpretationAdminModal from '../components/ClinicalInterpretationAdminModal.jsx';
import { printLabReport } from '../utils/printLabReport.js';
import { formatETB } from '../utils/currencyHelper.js';
import {
  createTransfer,
  getTransfers,
  receiveTransfer,
  startInvestigation,
  getTransferAudit,
  sendResultBack,
  clearTransfer,
  restoreTransfer
} from '../services/transferService.js';
import RichReportEditor from '../components/RichReportEditor.jsx';
import { PATHOLOGY_TEMPLATES } from '../constants/pathologyTemplates.js';
import { RADIOLOGY_TEMPLATES } from '../constants/radiologyTemplates.js';
import { resolveOptionCTemplate, renderOptionCHtml } from '../utils/templateReportHelper.js';
import {
  preparePOS80ReceiptData,
  printPOS80ThermalReceipt,
  isCbcParameter,
  isUrineChemicalParameter,
  isUrineMicroscopyParameter,
  isHcgParameter,
  isSerumElectrolyteParameter
} from '../utils/receiptDataHelper.js';
import labLogo from '../assets/etu.jpg';
import '../styles/pages/collection-queue.css';

const CATEGORY_THEMES = {
  'HEMATOLOGY':           { icon: '🩸', gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', accent: '#dc2626', light: 'rgba(220,38,38,0.08)' },
  'CLINICAL CHEMISTRY':   { icon: '🧪', gradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', accent: '#2563eb', light: 'rgba(37,99,235,0.08)' },
  'COAGULATION':          { icon: '🔬', gradient: 'linear-gradient(135deg, #9333ea 0%, #6b21a8 100%)', accent: '#9333ea', light: 'rgba(147,51,234,0.08)' },
  'SERUM ELECTROLYTE':    { icon: '⚡', gradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', accent: '#ea580c', light: 'rgba(234,88,12,0.08)' },
  'HORMONE':              { icon: '💊', gradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', accent: '#0891b2', light: 'rgba(8,145,178,0.08)' },
  'SEROLOGY':             { icon: '🧬', gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)', accent: '#059669', light: 'rgba(5,150,105,0.08)' },
  'BLOOD SUGAR':          { icon: '🍬', gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', accent: '#d97706', light: 'rgba(217,119,6,0.08)' },
  'URINALYSIS':           { icon: '🧫', gradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', accent: '#0d9488', light: 'rgba(13,148,136,0.08)' },
  'BACTERIOLOGY':         { icon: '🦠', gradient: 'linear-gradient(135deg, #65a30d 0%, #4d7c0f 100%)', accent: '#65a30d', light: 'rgba(101,163,13,0.08)' },
  'PARASITOLOGY':         { icon: '🦠', gradient: 'linear-gradient(135deg, #65a30d 0%, #4d7c0f 100%)', accent: '#65a30d', light: 'rgba(101,163,13,0.08)' },
  'SEMEN':                { icon: '🔬', gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', accent: '#7c3aed', light: 'rgba(124,58,237,0.08)' },
  'STOOL':                { icon: '🔎', gradient: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)', accent: '#b45309', light: 'rgba(180,83,9,0.08)' },
  'URINE AND BODY FLUID': { icon: '💧', gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', accent: '#0284c7', light: 'rgba(2,132,199,0.08)' },
  'REFERRAL':             { icon: '🏥', gradient: 'linear-gradient(135deg, #6b7280 0%, #374151 100%)', accent: '#6b7280', light: 'rgba(107,114,128,0.08)' },
  'INTERNAL MEDICINE':    { icon: '🩺', gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', accent: '#0284c7', light: 'rgba(2,132,199,0.08)' },
  'EXAMINATION FORM':     { icon: '📋', gradient: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', accent: '#0f766e', light: 'rgba(15,118,110,0.08)' },
  '_DEFAULT':             { icon: '🧪', gradient: 'linear-gradient(135deg, #475569 0%, #334155 100%)', accent: '#475569', light: 'rgba(71,85,105,0.08)' }
};

function getCatTheme(catName) {
  const n = (catName || '').toUpperCase();
  for (const [key, val] of Object.entries(CATEGORY_THEMES)) {
    if (key !== '_DEFAULT' && (n.includes(key) || key.includes(n))) return val;
  }
  return CATEGORY_THEMES._DEFAULT;
}

// Live countdown calculator for pathology & radiology deadlines
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

const emptyReport = {
  equipment: [],
  results: [],
  comments: '',
  sampleCollectorComments: [],
  testInterpretations: []
};

const idOf = value => String(value?._id || value?.id || value);

function matchesReportPeriod(report, period) {
  if (!period || String(period).toLowerCase() === 'all') return true;
  const dateVal = report.approvedDate || report.submittedDate || report.createdDate || report.updatedDate;
  if (!dateVal) return true;
  const repDate = new Date(dateVal);
  if (isNaN(repDate.getTime())) return true;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (period === 'today' || period === "today's") {
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return repDate >= today && repDate <= endToday;
  }
  if (period === 'yesterday') {
    const startOfYesterday = new Date(today);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfYesterday);
    endOfYesterday.setHours(23, 59, 59, 999);
    return repDate >= startOfYesterday && repDate <= endOfYesterday;
  }
  if (period === 'this_week' || period === 'thisweek' || period === 'this week') {
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const thisMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0, 0);
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return repDate >= thisMon && repDate <= endToday;
  }
  if (period === 'last_week' || period === 'lastweek' || period === 'lastWeek' || period === 'last week') {
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const thisMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0, 0);
    const fromDate = new Date(thisMon);
    fromDate.setDate(fromDate.getDate() - 7);
    const toDate = new Date(thisMon);
    toDate.setMilliseconds(-1);
    return repDate >= fromDate && repDate <= toDate;
  }
  if (period === 'lastmonth' || period === 'lastMonth' || period === 'last month') {
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return repDate >= fromDate && repDate <= toDate;
  }
  return true;
}

function OrderedTests({ patient, catalog, allocationByTest, transferStatusByTest = {} }) {
  const [openCategory, setOpenCategory] = useState(null);
  const groups = useMemo(() => {
    const selectedIds = new Set((patient?.laboratoryTests || []).map(idOf));
    const selectedNames = new Set((patient?.laboratoryTests || []).map(t => typeof t === 'string' ? t : (t?.name || '')).filter(Boolean));
    return (catalog || []).map(category => ({
      ...category,
      tests: (category.tests || []).filter(test => selectedIds.has(idOf(test)) || selectedNames.has(test.name))
    })).filter(category => category.tests.length);
  }, [patient, catalog]);

  return (
    <section className="collector-ordered-tests">
      <div className="collector-ordered-title">
        <div>
          <span>🧪</span>
          <div>
            <small>Requested investigations</small>
            <h3>Ordered Laboratory Tests</h3>
          </div>
        </div>
        <b>{groups.reduce((count, category) => count + category.tests.length, 0)}</b>
      </div>
      <div className="ordered-category-list">
        {groups.map((category, index) => {
          const open = openCategory === category._id;
          return (
            <article className={`collector-test-category category-${index % 6} ${open ? 'open' : ''}`} key={category._id}>
              <button type="button" onClick={() => setOpenCategory(open ? null : category._id)} aria-expanded={open}>
                <span className="collector-category-icon">{['🩸', '🧪', '🧫', '🔬', '🦠', '🏥'][index % 6]}</span>
                <span>
                  <strong>{category.name}</strong>
                  <small>{category.tests.length} selected test{category.tests.length === 1 ? '' : 's'}</small>
                </span>
                <i>{open ? '⌃' : '⌄'}</i>
              </button>
              {open && (
                <div className="collector-test-cards">
                  {category.tests.map(test => {
                    const tId = idOf(test);
                    const trf = transferStatusByTest?.[tId] || transferStatusByTest?.[test.name?.toUpperCase()];
                    let transferBadge = null;
                    if (trf) {
                      if (['COMPLETED', 'APPROVED', 'RESULT_READY'].includes(trf.status)) {
                        transferBadge = (
                          <span className="transfer-badge received-badge" style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px' }}>
                            📥 RECEIVED FROM {trf.destinationBranch?.toUpperCase()}
                          </span>
                        );
                      } else {
                        transferBadge = (
                          <span className={`transfer-badge sent-from-${(trf.sourceBranch || 'main').toLowerCase()}`} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px' }}>
                            🚀 SENT TO {trf.destinationBranch?.toUpperCase()} ({trf.status.replace('_', ' ')})
                          </span>
                        );
                      }
                    } else {
                      transferBadge = (
                        <span className="transfer-badge local-badge" style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: '#64748b', color: '#fff' }}>
                          📍 LOCAL
                        </span>
                      );
                    }

                    return (
                      <article className="collector-test-card" key={test._id}>
                        <span>✓</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                            <strong>{test.name}</strong>
                            {transferBadge}
                          </div>
                          <small>{test.requiredSampleTypes?.map(sample => sample.name).join(', ') || 'Specimen assigned automatically'}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

// POS 80mm Thermal Receipt Component for Admin Workspace
function ThermalReceiptModal({
  patientData,
  total,
  paymentDetails,
  onClose,
  token,
  cbcGroupPrice = 150,
  urineChemicalPrice = 300,
  urineMicroscopyPrice = 300,
  serumElectrolytePrice = 1000,
  testCategories = []
}) {
  const [printing, setPrinting] = useState(false);
  if (!patientData) return null;

  const receipt = useMemo(() => {
    return preparePOS80ReceiptData(patientData, {
      testCategories,
      cbcGroupPrice,
      urineChemicalPrice,
      urineMicroscopyPrice,
      serumElectrolytePrice,
      paymentDetails
    });
  }, [patientData, testCategories, cbcGroupPrice, urineChemicalPrice, urineMicroscopyPrice, serumElectrolytePrice, paymentDetails]);

  const handlePrint = () => {
    if (printing) return;
    setPrinting(true);
    printPOS80ThermalReceipt(patientData, {
      testCategories,
      cbcGroupPrice,
      urineChemicalPrice,
      urineMicroscopyPrice,
      serumElectrolytePrice,
      paymentDetails
    });
    setPrinting(false);
  };

  return (
    <div className="thermal-receipt-modal no-print-backdrop" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <article className="thermal-receipt" onClick={e => e.stopPropagation()} style={{
        background: '#ffffff',
        color: '#000000',
        width: '330px',
        maxWidth: '92vw',
        maxHeight: '88vh',
        overflowY: 'auto',
        padding: '16px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <button type="button" className="secondary" onClick={onClose} style={{ padding: '4px 10px', fontSize: '12px' }}>Close</button>
          <button type="button" className="primary" onClick={handlePrint} disabled={printing} style={{ padding: '4px 12px', fontSize: '12px', background: '#0284c7' }}>
            {printing ? 'Printing…' : '🖨️ Print 80mm'}
          </button>
        </div>

        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>ETU Diagnostic Laboratory</div>
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#555', marginBottom: '8px' }}>
          Official Diagnostic Receipt &middot; 80mm Continuous Thermal
        </div>
        <hr style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
        
        <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
          <div><strong>Receipt #:</strong> {receipt.receiptNumber || 'POS-REC'}</div>
          <div><strong>Patient ID:</strong> {receipt.patientId}</div>
          <div><strong>Patient:</strong> {receipt.patientName}</div>
          <div><strong>Branch:</strong> {patientData.branchName || 'Main'}</div>
          <div><strong>Date:</strong> {receipt.dateStr} {receipt.timeStr}</div>
        </div>
        <hr style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />

        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>SELECTED INVESTIGATIONS</div>

        <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
          {receipt.categories?.map((cat, idx) => (
            <div key={idx} style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#333' }}>{cat.name}</div>
              {cat.items?.map((it, iIdx) => (
                <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '6px' }}>
                  <span>{it.name}</span>
                  <strong>{formatETB(it.price || 0)}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
        <hr style={{ borderTop: '1px solid #000', margin: '8px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
          <span>TOTAL:</span>
          <span>{formatETB(receipt.totalAmount || 0)}</span>
        </div>
        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
          Method: {patientData.paymentMethod || 'Cash'} &middot; Status: {patientData.paymentStatus || 'Paid'}
        </div>
        <hr style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#666' }}>Thank you for choosing ETU Diagnostic Laboratory!</div>
      </article>
    </div>
  );
}

export default function AdminReportTransactionManagementPage() {
  const { token, user } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();

  const isSuperAdmin = user?.role === 'Admin' || user?.isCEO || user?.branchName === 'All';
  const [selectedBranch, setSelectedBranch] = useState(isSuperAdmin ? 'All' : (user?.branchName || 'Main'));
  const [adminInterpModalOpen, setAdminInterpModalOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  // Department navigation: 'laboratory' (default) | 'reception' | 'pathology' | 'radiology'
  const [activeDepartment, setActiveDepartment] = useState('laboratory');

  // Main navigation tab for Laboratory Operations
  const [activeTab, setActiveTab] = useState('queue');

  // Approved & Pending dedicated view states
  const [approvedPeriod, setApprovedPeriod] = useState('today');
  const [approvedSearch, setApprovedSearch] = useState('');
  const [pendingPeriod, setPendingPeriod] = useState('all');
  const [pendingSearch, setPendingSearch] = useState('');

  // ── RECEPTION DEPARTMENT STATES ──────────────────────────────────
  const [receptionSubTab, setReceptionSubTab] = useState('pos'); // 'pos' | 'waiting'
  const [receptionDash, setReceptionDash] = useState(null);
  const [receptionWaitingList, setReceptionWaitingList] = useState([]);
  const [receptionWaitingSearch, setReceptionWaitingSearch] = useState('');
  const [receptionLoading, setReceptionLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);

  // Reception POS registration fields
  const [posPatientName, setPosPatientName] = useState('');
  const [posAge, setPosAge] = useState('');
  const [posSex, setPosSex] = useState('Male');
  const [posPhone, setPosPhone] = useState('');
  const [posAddress, setPosAddress] = useState('');
  const [posRegistrationType, setPosRegistrationType] = useState('Self');
  const [posReferralHospital, setPosReferralHospital] = useState('');
  const [posOtherHospital, setPosOtherHospital] = useState('');
  const [posBpSystolic, setPosBpSystolic] = useState('');
  const [posBpDiastolic, setPosBpDiastolic] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState('Cash');
  const [posSelectedTestIds, setPosSelectedTestIds] = useState([]);
  const [posSearch, setPosSearch] = useState('');
  const [posActiveCategory, setPosActiveCategory] = useState('All');
  const [posWizardStep, setPosWizardStep] = useState(1); // 1: Patient Intake, 2: Test Selection, 3: Payment
  const [posExpandedCategories, setPosExpandedCategories] = useState([]);
  const [posCategorySearch, setPosCategorySearch] = useState({});
  const [posTestFilter, setPosTestFilter] = useState('All');
  const [posServiceDiscountType, setPosServiceDiscountType] = useState('Regular Patient');
  const [posAmountReceived, setPosAmountReceived] = useState('');
  const [testSettings, setTestSettings] = useState({
    staffDiscount: 20,
    collaboratorDiscount: 20,
    counselingStatus: 'Free',
    counselingPrice: 0,
    cbcGroupPrice: 150,
    urineChemicalPrice: 300,
    urineMicroscopyPrice: 300,
    serumElectrolytePrice: 1000
  });
  const [posRegistering, setPosRegistering] = useState(false);
  const [posRecentPatients, setPosRecentPatients] = useState([]);
  const [posReceiptModalPatient, setPosReceiptModalPatient] = useState(null);
  const [completingPaymentPatient, setCompletingPaymentPatient] = useState(null);
  const [completingPaymentMethod, setCompletingPaymentMethod] = useState('Cash');
  const [isCompletingPayment, setIsCompletingPayment] = useState(false);

  // ── PATHOLOGY DEPARTMENT STATES ──────────────────────────────────
  const [pathologySubTab, setPathologySubTab] = useState('queue'); // 'queue' | 'optionA' | 'optionB' | 'optionC'
  const [pathologyQueue, setPathologyQueue] = useState([]);
  const [pathologyActiveCount, setPathologyActiveCount] = useState(0);
  const [pathologyClearedCount, setPathologyClearedCount] = useState(0);
  const [pathologyDateFilter, setPathologyDateFilter] = useState('all');
  const [pathologyStatusFilter, setPathologyStatusFilter] = useState('all');
  const [pathologySearch, setPathologySearch] = useState('');
  const [pathologyLoading, setPathologyLoading] = useState(false);
  const [selectedPathologyCase, setSelectedPathologyCase] = useState(null);
  const [pathologyReportType, setPathologyReportType] = useState('Option A');
  const [pathologyReportContent, setPathologyReportContent] = useState('');
  const [pathologyStructured, setPathologyStructured] = useState({
    clinicalHistory: '', specimen: '', procedure: '', grossDescription: '',
    microscopicDescription: '', cytologicalFindings: '', rbcMorphology: '',
    wbcMorphology: '', plateletMorphology: '', peripheralBloodFindings: '',
    impression: '', diagnosis: '', comments: '', recommendation: '', pathologistNotes: ''
  });
  const [pathologyTemplateReport, setPathologyTemplateReport] = useState({
    category: 'Pathology', templateKey: '', examination: '', clinicalInformation: '',
    technique: '', comparison: '', findings: '', impression: '', recommendation: ''
  });
  const [pathologyTemplateSearch, setPathologyTemplateSearch] = useState('');
  const [pathologyShowFooter, setPathologyShowFooter] = useState(true);
  const [pathologySaving, setPathologySaving] = useState(false);
  const [pathologyApproving, setPathologyApproving] = useState(false);
  const [pathologyPreviewOpen, setPathologyPreviewOpen] = useState(false);
  const pathologyEditorRef = useRef(null);

  // ── RADIOLOGY DEPARTMENT STATES ──────────────────────────────────
  const [radiologySubTab, setRadiologySubTab] = useState('queue'); // 'queue' | 'optionA' | 'optionB' | 'optionC'
  const [radiologyQueue, setRadiologyQueue] = useState([]);
  const [radiologyActiveCount, setRadiologyActiveCount] = useState(0);
  const [radiologyClearedCount, setRadiologyClearedCount] = useState(0);
  const [radiologyDateFilter, setRadiologyDateFilter] = useState('all');
  const [radiologyStatusFilter, setRadiologyStatusFilter] = useState('all');
  const [radiologySearch, setRadiologySearch] = useState('');
  const [radiologyLoading, setRadiologyLoading] = useState(false);
  const [selectedRadiologyCase, setSelectedRadiologyCase] = useState(null);
  const [radiologyReportType, setRadiologyReportType] = useState('Option A');
  const [radiologyReportContent, setRadiologyReportContent] = useState('');
  const [radiologyStructured, setRadiologyStructured] = useState({
    examination: '', clinicalInformation: '', technique: '', liver: '',
    gallbladder: '', biliarySystem: '', pancreas: '', spleen: '', kidneys: '',
    urinaryBladder: '', otherFindings: '', findings: '', impression: '',
    recommendation: '', radiologistNotes: ''
  });
  const [radiologyTemplateReport, setRadiologyTemplateReport] = useState({
    category: 'MRI', templateKey: '', examination: '', clinicalInformation: '',
    technique: '', comparison: '', findings: '', impression: '', recommendation: ''
  });
  const [radiologySelectedTemplateCategory, setRadiologySelectedTemplateCategory] = useState('MRI');
  const [radiologyTemplateSearch, setRadiologyTemplateSearch] = useState('');
  const [radiologyShowFooter, setRadiologyShowFooter] = useState(true);
  const [radiologySaving, setRadiologySaving] = useState(false);
  const [radiologyApproving, setRadiologyApproving] = useState(false);
  const [radiologyPreviewOpen, setRadiologyPreviewOpen] = useState(false);
  const radiologyEditorRef = useRef(null);

  // Auto-select view based on URL query parameter (?view=approved, ?view=pending, or ?view=transactions)
  useEffect(() => {
    const dept = (searchParams.get('dept') || searchParams.get('department') || '').toLowerCase();
    if (['laboratory', 'reception', 'pathology', 'radiology'].includes(dept)) {
      setActiveDepartment(dept);
    }

    const view = (searchParams.get('view') || searchParams.get('tab') || '').toLowerCase();
    if (view === 'approved') {
      setActiveTab('approved');
    } else if (view === 'pending') {
      setActiveTab('pending');
    } else if (view === 'transactions' || view === 'transaction' || view === 'money') {
      setActiveTab('transactions');
    } else if (view === 'rejected') {
      setActiveTab('reports');
      setReportWorkflowTab('Rejected');
    } else if (['queue', 'received_otona', 'received_main', 'investigation', 'transactions', 'reports', 'cleared', 'unfinished'].includes(view)) {
      setActiveTab(view);
    } else if (['pos', 'waiting', 'waiting-payment', 'reception'].includes(view)) {
      setActiveDepartment('reception');
      if (view === 'waiting' || view === 'waiting-payment') setReceptionSubTab('waiting');
      else setReceptionSubTab('pos');
    } else if (['pathology', 'biopsy', 'fnac'].includes(view)) {
      setActiveDepartment('pathology');
    } else if (['radiology', 'mri', 'ct', 'ultrasound', 'xray'].includes(view)) {
      setActiveDepartment('radiology');
    }
  }, [searchParams]);

  // Queue state
  const [queue, setQueue] = useState([]);
  const [dash, setDash] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [paramCatalog, setParamCatalog] = useState([]);
  const [queueSearch, setQueueSearch] = useState('');
  const [queuePeriod, setQueuePeriod] = useState('today');

  // Transfers state
  const [receivedTransfers, setReceivedTransfers] = useState([]);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferPeriod, setTransferPeriod] = useState('today');
  const [transferStatusFilter, setTransferStatusFilter] = useState('All');

  // Self-Aware Investigation state
  const [investigationPatients, setInvestigationPatients] = useState([]);
  const [investigationSearch, setInvestigationSearch] = useState('');
  const [investigatingPatient, setInvestigatingPatient] = useState(null);
  const [invSymptoms, setInvSymptoms] = useState('');
  const [invSelectedTests, setInvSelectedTests] = useState([]);
  const [invBpSystolic, setInvBpSystolic] = useState('');
  const [invBpDiastolic, setInvBpDiastolic] = useState('');
  const [invSubmitting, setInvSubmitting] = useState(false);

  // Reports workflow state
  const [reports, setReports] = useState([]);
  const [reportWorkflowTab, setReportWorkflowTab] = useState('Draft'); // Draft | Pending | Approved | Rejected
  const [reportSearch, setReportSearch] = useState('');
  const [previewReport, setPreviewReport] = useState(null);
  const [previewShowLogo, setPreviewShowLogo] = useState(true);
  const [previewShowFooter, setPreviewShowFooter] = useState(true);
  const [previewStampType, setPreviewStampType] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [editComments, setEditComments] = useState('');
  const [editStatus, setEditStatus] = useState('Draft');
  const [isSavingReportEdit, setIsSavingReportEdit] = useState(false);

  // Cleared transfers state
  const [clearedTransfers, setClearedTransfers] = useState([]);
  const [clearedSearch, setClearedSearch] = useState('');
  const [isRestoringTransfer, setIsRestoringTransfer] = useState(false);

  // Result entry / Collection in-progress state
  const [activeCollectionPatient, setActiveCollectionPatient] = useState(null);
  const [currentReport, setCurrentReport] = useState(emptyReport);
  const [equipmentList, setEquipmentList] = useState({ equipment: [], parameters: {}, equipmentDetails: {} });

  // Modals state
  const [transferModal, setTransferModal] = useState(null);
  const [auditModal, setAuditModal] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [clearModal, setClearModal] = useState({ open: false, transfer: null, busy: false, reason: '', error: '' });
  const [sendBackModal, setSendBackModal] = useState({ open: false, transfer: null, busy: false, error: '' });
  const [queueDeleteModal, setQueueDeleteModal] = useState({ open: false, patient: null, busy: false, error: '' });
  const [reportDeleteModal, setReportDeleteModal] = useState({ open: false, report: null, busy: false, error: '' });

  // Admin Money Transactions Management States
  const [transactions, setTransactions] = useState([]);
  const [txSummary, setTxSummary] = useState({ totalTransactions: 0, totalRevenue: 0 });
  const [txLoading, setTxLoading] = useState(false);
  const [txDatePreset, setTxDatePreset] = useState('today');
  const [txCustomDate, setTxCustomDate] = useState('');
  const [txSearch, setTxSearch] = useState('');

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxMethod, setEditTxMethod] = useState('Cash');
  const [editTxStatus, setEditTxStatus] = useState('Paid');
  const [editTxNotes, setEditTxNotes] = useState('');
  const [isSavingTx, setIsSavingTx] = useState(false);

  const [deletingTransaction, setDeletingTransaction] = useState(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);

  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const selectAllRef = useRef(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [addingTransaction, setAddingTransaction] = useState(false);
  const [addTxPatientId, setAddTxPatientId] = useState('');
  const [addTxAmount, setAddTxAmount] = useState('');
  const [addTxMethod, setAddTxMethod] = useState('Cash');
  const [addTxBranch, setAddTxBranch] = useState(user?.branchName || 'Main');
  const [addTxNotes, setAddTxNotes] = useState('');
  const [isAddingTx, setIsAddingTx] = useState(false);

  // Global messages & busy state
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useScrollLock(
    Boolean(previewReport) ||
    Boolean(transferModal?.open) ||
    Boolean(auditModal?.open) ||
    Boolean(clearModal?.open) ||
    Boolean(sendBackModal?.open) ||
    Boolean(queueDeleteModal?.open) ||
    Boolean(reportDeleteModal?.open) ||
    Boolean(investigatingPatient) ||
    Boolean(editingReport) ||
    Boolean(editingTransaction) ||
    Boolean(deletingTransaction) ||
    Boolean(showBulkDeleteModal) ||
    Boolean(addingTransaction) ||
    Boolean(posReceiptModalPatient) ||
    Boolean(completingPaymentPatient) ||
    Boolean(pathologyPreviewOpen) ||
    Boolean(radiologyPreviewOpen)
  );

  // Clear notifications after 5 seconds
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Load Queue & Dashboard
  const loadQueue = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBranch !== 'All') {
        params.append('branchName', selectedBranch);
      }
      if (queuePeriod && queuePeriod !== 'all') {
        params.append('period', queuePeriod);
      }
      if (queueSearch.trim()) {
        params.append('q', queueSearch.trim());
      }
      const qParam = params.toString() ? `?${params.toString()}` : '';
      const dashParam = selectedBranch !== 'All' ? `?branchName=${selectedBranch}` : '';

      const [d, q, e, tests, pCat] = await Promise.all([
        api(`/collection/dashboard${dashParam}`, { token }).catch(() => null),
        api(`/collection/queue${qParam}`, { token }).catch(() => ({ queue: [] })),
        api('/report-entry/equipment', { token }).catch(() => ({ equipment: [], parameters: {}, equipmentDetails: {} })),
        api('/laboratory-tests/catalog', { token }).catch(() => ({ categories: [] })),
        api('/report-entry/catalog', { token }).catch(() => ({ catalog: [] }))
      ]);

      setDash(d);
      setQueue(Array.isArray(q?.queue) ? q.queue : []);
      setEquipmentList(e || { equipment: [], parameters: {}, equipmentDetails: {} });
      setCatalog(Array.isArray(tests?.categories) ? tests.categories : (Array.isArray(tests?.data?.categories) ? tests.data.categories : []));
      setParamCatalog(Array.isArray(pCat?.catalog) ? pCat.catalog : []);
    } catch (e) {
      if (!isSilentNetworkError(e)) {
        setError(e.message || 'Failed to load laboratory queue.');
      }
    }
  }, [token, selectedBranch, queuePeriod, queueSearch]);

  // Load Transfers
  const loadTransfers = useCallback(async () => {
    try {
      const params = { type: 'received' };
      if (transferPeriod && transferPeriod !== 'all') {
        params.period = transferPeriod;
      }
      if (transferSearch.trim()) {
        params.q = transferSearch.trim();
      }
      if (selectedBranch !== 'All') {
        params.branchName = selectedBranch;
      }
      const res = await getTransfers(params, token);
      setReceivedTransfers(Array.isArray(res?.transfers) ? res.transfers : []);
    } catch (e) {
      if (!isSilentNetworkError(e)) {
        console.warn('Transfers load error:', e);
      }
    }
  }, [token, transferPeriod, transferSearch, selectedBranch]);

  // Load Self-Aware Investigation Queue
  const loadInvestigation = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBranch !== 'All') params.append('branchName', selectedBranch);
      if (investigationSearch.trim()) params.append('q', investigationSearch.trim());
      const res = await api(`/collection/investigation?${params.toString()}`, { token });
      setInvestigationPatients(Array.isArray(res?.patients) ? res.patients : []);
    } catch (e) {
      if (!isSilentNetworkError(e)) {
        console.warn('Investigation queue load error:', e);
      }
    }
  }, [token, selectedBranch, investigationSearch]);

  // Load Reports
  const loadReports = useCallback(async () => {
    try {
      const branchParam = selectedBranch !== 'All' ? `?branchName=${selectedBranch}` : '';
      const data = await api(`/collection/reports${branchParam}`, { token });
      setReports(Array.isArray(data?.reports) ? data.reports : []);
    } catch (e) {
      if (!isSilentNetworkError(e)) {
        console.warn('Reports load error:', e);
      }
    }
  }, [token, selectedBranch]);

  // Load Cleared Transfers
  const loadCleared = useCallback(async () => {
    try {
      const branchParam = selectedBranch !== 'All' ? `?branchName=${selectedBranch}` : '';
      const clearedData = await api(`/transfers/cleared${branchParam}`, { token });
      setClearedTransfers(Array.isArray(clearedData?.transfers) ? clearedData.transfers : []);
    } catch (e) {
      if (!isSilentNetworkError(e)) {
        console.warn('Cleared transfers load error:', e);
      }
    }
  }, [token, selectedBranch]);

  // Load Money Transactions
  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      let url = `/reports/transactions?branchName=${selectedBranch}`;
      if (txDatePreset === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        url += `&mode=single&date=${todayStr}`;
      } else if (txDatePreset === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        url += `&mode=single&date=${y.toISOString().slice(0, 10)}`;
      } else if (txDatePreset === 'week') {
        const now = new Date();
        const pastWeek = new Date(now);
        pastWeek.setDate(now.getDate() - 7);
        url += `&mode=range&dateFrom=${pastWeek.toISOString().slice(0, 10)}&dateTo=${now.toISOString().slice(0, 10)}`;
      } else if (txDatePreset === 'month') {
        const now = new Date();
        const pastMonth = new Date(now);
        pastMonth.setDate(now.getDate() - 30);
        url += `&mode=range&dateFrom=${pastMonth.toISOString().slice(0, 10)}&dateTo=${now.toISOString().slice(0, 10)}`;
      } else if (txDatePreset === 'custom' && txCustomDate) {
        url += `&mode=single&date=${txCustomDate}`;
      } else {
        url += `&mode=range&dateFrom=2020-01-01&dateTo=2030-12-31`;
      }

      const data = await api(url, { token });
      setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
      setTxSummary(data?.summary || {
        totalTransactions: (data?.transactions || []).length,
        totalRevenue: (data?.transactions || []).filter(t => t.paymentStatus === 'Paid').reduce((sum, t) => sum + (t.grandTotal || 0), 0)
      });
    } catch (e) {
      if (!isSilentNetworkError(e)) setError(e.message || 'Failed to load transactions.');
    } finally {
      setTxLoading(false);
    }
  }, [token, selectedBranch, txDatePreset, txCustomDate]);

  // ── RECEPTION DATA LOADER ─────────────────────────────────────────
  const loadReceptionData = useCallback(async () => {
    try {
      setReceptionLoading(true);
      const branchParam = selectedBranch !== 'All' ? `?branchName=${selectedBranch}` : '';
      const [dashRes, waitRes, hospRes, catRes] = await Promise.all([
        api(`/reception/dashboard${branchParam}`, { token }).catch(() => null),
        api(`/reception/waiting-payment${branchParam}`, { token }).catch(() => null),
        api('/reception/referral-hospitals', { token }).catch(() => null),
        api('/laboratory-tests/catalog', { token }).catch(() => null)
      ]);
      if (dashRes?.summary) setReceptionDash(dashRes.summary);
      if (Array.isArray(waitRes?.patients)) setReceptionWaitingList(waitRes.patients);
      if (Array.isArray(hospRes?.hospitals)) setHospitals(hospRes.hospitals);
      if (Array.isArray(catRes?.categories)) setCatalog(catRes.categories);
      if (catRes?.settings) setTestSettings(prev => ({ ...prev, ...catRes.settings }));
    } catch (e) {
      if (!isSilentNetworkError(e)) setError(e.message || 'Failed to load reception data.');
    } finally {
      setReceptionLoading(false);
    }
  }, [token, selectedBranch]);

  // ── PATHOLOGY DATA LOADER ─────────────────────────────────────────
  const loadPathologyData = useCallback(async () => {
    try {
      setPathologyLoading(true);
      const params = new URLSearchParams();
      if (pathologyDateFilter && pathologyDateFilter !== 'all') params.append('dateFilter', pathologyDateFilter);
      if (selectedBranch !== 'All') params.append('branch', selectedBranch);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await api(`/pathology/queue${qs}`, { token });
      setPathologyQueue(Array.isArray(data?.cases) ? data.cases : []);
      if (typeof data?.activeCount === 'number') setPathologyActiveCount(data.activeCount);
      if (typeof data?.clearedCount === 'number') setPathologyClearedCount(data.clearedCount);
    } catch (e) {
      if (!isSilentNetworkError(e)) setError(e.message || 'Failed to load pathology queue.');
    } finally {
      setPathologyLoading(false);
    }
  }, [token, pathologyDateFilter, selectedBranch]);

  // ── RADIOLOGY DATA LOADER ─────────────────────────────────────────
  const loadRadiologyData = useCallback(async () => {
    try {
      setRadiologyLoading(true);
      const params = new URLSearchParams();
      if (radiologyDateFilter && radiologyDateFilter !== 'all') params.append('dateFilter', radiologyDateFilter);
      if (selectedBranch !== 'All') params.append('branch', selectedBranch);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await api(`/radiology/queue${qs}`, { token });
      setRadiologyQueue(Array.isArray(data?.cases) ? data.cases : []);
      if (typeof data?.activeCount === 'number') setRadiologyActiveCount(data.activeCount);
      if (typeof data?.clearedCount === 'number') setRadiologyClearedCount(data.clearedCount);
    } catch (e) {
      if (!isSilentNetworkError(e)) setError(e.message || 'Failed to load radiology queue.');
    } finally {
      setRadiologyLoading(false);
    }
  }, [token, radiologyDateFilter, selectedBranch]);

  // Global load trigger
  const loadAll = useCallback(() => {
    loadQueue();
    loadTransfers();
    loadInvestigation();
    loadReports();
    loadCleared();
    loadTransactions();
    loadReceptionData();
    loadPathologyData();
    loadRadiologyData();
  }, [loadQueue, loadTransfers, loadInvestigation, loadReports, loadCleared, loadTransactions, loadReceptionData, loadPathologyData, loadRadiologyData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Real-time synchronization
  useEffect(() => {
    const handleCollectionSync = () => {
      loadQueue();
      loadInvestigation();
    };
    const handleTransferSync = () => {
      loadTransfers();
      loadCleared();
    };
    const handleReportSync = () => {
      loadReports();
      loadQueue();
      loadTransactions();
    };
    const handleReceptionSync = () => {
      loadQueue();
      loadTransactions();
      loadReceptionData();
    };
    const handlePathologySync = () => {
      loadPathologyData();
    };
    const handleRadiologySync = () => {
      loadRadiologyData();
    };

    subscribe('collection:change', handleCollectionSync);
    subscribe('transfers:change', handleTransferSync);
    subscribe('reports:change', handleReportSync);
    subscribe('reception:change', handleReceptionSync);
    subscribe('pathology:change', handlePathologySync);
    subscribe('radiology:change', handleRadiologySync);

    return () => {
      unsubscribe('collection:change', handleCollectionSync);
      unsubscribe('transfers:change', handleTransferSync);
      unsubscribe('reports:change', handleReportSync);
      unsubscribe('reception:change', handleReceptionSync);
      unsubscribe('pathology:change', handlePathologySync);
      unsubscribe('radiology:change', handleRadiologySync);
    };
  }, [subscribe, unsubscribe, loadQueue, loadTransfers, loadInvestigation, loadReports, loadCleared, loadTransactions, loadReceptionData, loadPathologyData, loadRadiologyData]);

  // Switcher sync effect
  useEffect(() => {
    if (activeDepartment === 'reception') loadReceptionData();
    else if (activeDepartment === 'pathology') loadPathologyData();
    else if (activeDepartment === 'radiology') loadRadiologyData();
  }, [activeDepartment, loadReceptionData, loadPathologyData, loadRadiologyData]);

  // ── RECEPTION POS & WAITING HELPERS ────────────────────────────────
  const allAvailableTests = useMemo(() => {
    return (catalog || []).flatMap(c => (c.tests || []).map(t => ({
      ...t,
      categoryName: c.name || t.categoryName || 'General'
    })));
  }, [catalog]);

  const isCbcTest = useCallback((t) => {
    if (!t) return false;
    if (t.parentBundle === 'Urine Microscopy' || t.parentBundle === 'Chemical Analysis') return false;
    const sub = (t.subcategory || '').trim().toUpperCase();
    if (sub === 'URINE MICROSCOPY' || sub === 'CHEMICAL ANALYSIS' || /MICROSCOP/i.test(sub) || /^CHEM/i.test(sub)) return false;
    const catName = (t.categoryName || (typeof t.category === 'object' ? t.category?.name : t.category) || '').trim().toUpperCase();
    if (catName === 'URINALYSIS' || /^URIN/i.test(catName) || catName.includes('URINE')) return false;
    return isCbcParameter(t, catName);
  }, []);

  const isSerumElectrolyteTest = useCallback((t) => {
    if (!t) return false;
    const catName = t.categoryName || (typeof t.category === 'object' ? t.category?.name : t.category) || '';
    return isSerumElectrolyteParameter(t, catName);
  }, []);

  const isUrineChemTest = useCallback((t) => {
    const catName = t.categoryName || (typeof t.category === 'object' ? t.category?.name : t.category) || '';
    return isUrineChemicalParameter(t, catName);
  }, []);

  const isUrineMicroTest = useCallback((t) => {
    const catName = t.categoryName || (typeof t.category === 'object' ? t.category?.name : t.category) || '';
    return isUrineMicroscopyParameter(t, catName);
  }, []);

  const isHcgTest = useCallback((t) => {
    const catName = t.categoryName || (typeof t.category === 'object' ? t.category?.name : t.category) || '';
    return isHcgParameter(t, catName);
  }, []);

  const posVisibleCategories = useMemo(() => {
    return (catalog || []).map(category => ({
      ...category,
      tests: (category.tests || []).filter(test => {
        const matchSearch = !posSearch || `${test.name} ${test.description || ''} ${category.name}`.toLowerCase().includes(posSearch.toLowerCase());
        const matchFilter = posTestFilter === 'All'
          || (posTestFilter === 'Selected' && posSelectedTestIds.includes(test._id))
          || (posTestFilter === 'Referral' && /referral/i.test(category.name))
          || (posTestFilter === 'Active' && test.status === 'Active')
          || posTestFilter === 'Popular'
          || posTestFilter === 'Recently Added';
        return matchSearch && matchFilter;
      })
    })).filter(category => category.tests.length > 0);
  }, [catalog, posSearch, posTestFilter, posSelectedTestIds]);

  const posSelectedTests = useMemo(() => {
    return allAvailableTests.filter(t => posSelectedTestIds.includes(t._id));
  }, [allAvailableTests, posSelectedTestIds]);

  const calcCategoryTotal = useCallback((catTests) => {
    const selected = catTests.filter(t => posSelectedTestIds.includes(t._id));
    const microTests = selected.filter(isUrineMicroTest);
    const chemTests = selected.filter(isUrineChemTest);
    const hcgTests = selected.filter(isHcgTest);
    const cbcTests = selected.filter(isCbcTest);
    const elecTests = selected.filter(isSerumElectrolyteTest);
    const otherTests = selected.filter(t => !isUrineMicroTest(t) && !isUrineChemTest(t) && !isHcgTest(t) && !isCbcTest(t) && !isSerumElectrolyteTest(t) && t.billableIndividually !== false && !t.includedInBundle);

    let total = otherTests.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
    if (cbcTests.length > 0) total += Number(testSettings.cbcGroupPrice ?? 150);
    if (chemTests.length > 0) total += Number(testSettings.urineChemicalPrice ?? 300);
    if (microTests.length > 0) total += Number(testSettings.urineMicroscopyPrice ?? 300);
    if (elecTests.length > 0) total += Number(testSettings.serumElectrolytePrice ?? 1000);
    hcgTests.forEach(t => { total += (Number(t.price) || 200); });
    return total;
  }, [posSelectedTestIds, testSettings, isCbcTest, isUrineChemTest, isUrineMicroTest, isHcgTest, isSerumElectrolyteTest]);

  const posBillSubtotal = useMemo(() => {
    const cbcGroupPrice = Number(testSettings.cbcGroupPrice ?? 150);
    const chemGroupPrice = Number(testSettings.urineChemicalPrice ?? 300);
    const microGroupPrice = Number(testSettings.urineMicroscopyPrice ?? 300);
    const serumElecPrice = Number(testSettings.serumElectrolytePrice ?? 1000);
    const cbcTests = [];
    const chemTests = [];
    const microTests = [];
    const hcgTests = [];
    const elecTests = [];
    const otherTests = [];

    posSelectedTests.forEach(s => {
      if (isUrineMicroTest(s)) microTests.push(s);
      else if (isUrineChemTest(s)) chemTests.push(s);
      else if (isHcgTest(s)) hcgTests.push(s);
      else if (isCbcTest(s)) cbcTests.push(s);
      else if (isSerumElectrolyteTest(s)) elecTests.push(s);
      else if (s.billableIndividually !== false && !s.includedInBundle) otherTests.push(s);
    });

    let subtotal = otherTests.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    if (cbcTests.length > 0) subtotal += cbcGroupPrice;
    if (chemTests.length > 0) subtotal += chemGroupPrice;
    if (microTests.length > 0) subtotal += microGroupPrice;
    if (elecTests.length > 0) subtotal += serumElecPrice;
    hcgTests.forEach(t => { subtotal += (Number(t.price) || 200); });
    return subtotal;
  }, [posSelectedTests, testSettings, isCbcTest, isUrineChemTest, isUrineMicroTest, isHcgTest, isSerumElectrolyteTest]);

  const posDiscountPercent = posServiceDiscountType === 'Staff Member'
    ? Number(testSettings.staffDiscount || 20)
    : posServiceDiscountType === 'Collaborator'
    ? Number(testSettings.collaboratorDiscount || 20)
    : 0;

  const posDiscountAmount = posServiceDiscountType === 'Counseling Only' ? 0 : (posBillSubtotal * posDiscountPercent / 100);
  const posBillTotal = posServiceDiscountType === 'Counseling Only'
    ? (testSettings.counselingStatus === 'Paid' ? Number(testSettings.counselingPrice || 0) : 0)
    : posBillSubtotal - posDiscountAmount;

  const posBalanceDue = useMemo(() => {
    if (!posAmountReceived) return 0;
    return Math.max(0, Number(posAmountReceived) - posBillTotal);
  }, [posAmountReceived, posBillTotal]);

  const handleTogglePosTest = (testId) => {
    const test = allAvailableTests.find(s => s._id === testId);
    if (!test) return;

    const isChemParent = test.name === 'Chemical Analysis' || test.parentBundle === 'Chemical Analysis';
    const isMicroParent = test.name === 'Urine Microscopy' || test.parentBundle === 'Urine Microscopy';
    const isCbcParent = test.name === 'CBC' || test.name === 'Complete Blood Count (CBC)';
    const isElecParent = isSerumElectrolyteTest(test) && /^Serum Electrolyte/i.test(test.name);

    if (isChemParent) {
      const chemChildTests = allAvailableTests.filter(s => isUrineChemTest(s) && !isHcgTest(s));
      const allSelected = chemChildTests.every(s => posSelectedTestIds.includes(s._id));
      if (allSelected) {
        setPosSelectedTestIds(prev => prev.filter(id => !chemChildTests.some(c => c._id === id)));
      } else {
        setPosSelectedTestIds(prev => [...new Set([...prev, ...chemChildTests.map(c => c._id)])]);
      }
      return;
    }

    if (isMicroParent) {
      const microChildTests = allAvailableTests.filter(isUrineMicroTest);
      const allSelected = microChildTests.every(s => posSelectedTestIds.includes(s._id));
      if (allSelected) {
        setPosSelectedTestIds(prev => prev.filter(id => !microChildTests.some(c => c._id === id)));
      } else {
        setPosSelectedTestIds(prev => [...new Set([...prev, ...microChildTests.map(c => c._id)])]);
      }
      return;
    }

    if (isCbcParent) {
      const cbcChildTests = allAvailableTests.filter(isCbcTest);
      const allSelected = cbcChildTests.every(s => posSelectedTestIds.includes(s._id));
      if (allSelected) {
        setPosSelectedTestIds(prev => prev.filter(id => !cbcChildTests.some(c => c._id === id)));
      } else {
        setPosSelectedTestIds(prev => [...new Set([...prev, ...cbcChildTests.map(c => c._id)])]);
      }
      return;
    }

    if (isElecParent) {
      const elecChildTests = allAvailableTests.filter(isSerumElectrolyteTest);
      const allSelected = elecChildTests.every(s => posSelectedTestIds.includes(s._id));
      if (allSelected) {
        setPosSelectedTestIds(prev => prev.filter(id => !elecChildTests.some(c => c._id === id)));
      } else {
        setPosSelectedTestIds(prev => [...new Set([...prev, ...elecChildTests.map(c => c._id)])]);
      }
      return;
    }

    setPosSelectedTestIds(prev =>
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  const handleToggleCbcGroup = (subTests) => {
    const subTestIds = subTests.map(t => t._id);
    const allSelected = subTestIds.length > 0 && subTestIds.every(id => posSelectedTestIds.includes(id));
    if (allSelected) {
      setPosSelectedTestIds(prev => prev.filter(id => !subTestIds.includes(id)));
    } else {
      setPosSelectedTestIds(prev => [...new Set([...prev, ...subTestIds])]);
    }
  };

  const handleProceedToTestSelection = (e) => {
    if (e) e.preventDefault();
    if (!posPatientName.trim()) {
      setError('Patient full name is required.');
      return;
    }
    if (!posAge || isNaN(Number(posAge)) || Number(posAge) <= 0) {
      setError('A valid patient age is required.');
      return;
    }
    if (!posSex) {
      setError('Patient sex is required.');
      return;
    }
    if (!posPhone.trim()) {
      setError('Patient phone number is required.');
      return;
    }
    if (posRegistrationType === 'Referral' && !posReferralHospital) {
      setError('Please select a referral hospital.');
      return;
    }
    if (posRegistrationType === 'Referral' && posReferralHospital === 'Other' && !posOtherHospital.trim()) {
      setError('Please specify the referral hospital name.');
      return;
    }
    if (posBpSystolic && (Number(posBpSystolic) < 50 || Number(posBpSystolic) > 300)) {
      setError('Systolic BP must be between 50 and 300 mmHg.');
      return;
    }
    if (posBpDiastolic && (Number(posBpDiastolic) < 30 || Number(posBpDiastolic) > 200)) {
      setError('Diastolic BP must be between 30 and 200 mmHg.');
      return;
    }
    setError('');
    setPosWizardStep(2);
  };

  const handleProceedToPayment = () => {
    if (posServiceDiscountType !== 'Counseling Only' && posSelectedTestIds.length === 0) {
      setError('Please select at least one laboratory test.');
      return;
    }
    setError('');
    setPosAmountReceived(String(posBillTotal));
    setPosWizardStep(3);
  };

  const handlePosRegister = async (e) => {
    if (e) e.preventDefault();
    if (posRegistering) return;
    if (!posPatientName.trim()) {
      setError('Patient name is required.');
      return;
    }
    if (!posAge || isNaN(Number(posAge)) || Number(posAge) <= 0) {
      setError('A valid patient age is required.');
      return;
    }
    if (!posSex) {
      setError('Patient sex is required.');
      return;
    }
    if (!posPhone.trim()) {
      setError('Patient phone number is required.');
      return;
    }
    if (posRegistrationType === 'Referral' && !posReferralHospital) {
      setError('Please select a referral hospital.');
      return;
    }
    if (posRegistrationType === 'Referral' && posReferralHospital === 'Other' && !posOtherHospital.trim()) {
      setError('Please specify the other referral hospital name.');
      return;
    }
    const isSelfAware = posRegistrationType === 'Self Aware';
    if (!isSelfAware && posServiceDiscountType !== 'Counseling Only' && posSelectedTestIds.length === 0) {
      setError('Please select at least one laboratory test.');
      return;
    }

    try {
      setPosRegistering(true);
      const finalHospital = posReferralHospital === 'Other' ? posOtherHospital.trim() : posReferralHospital;
      const branchToAssign = selectedBranch !== 'All' ? selectedBranch : (user?.branchName && user.branchName !== 'All' ? user.branchName : 'Main');

      const payload = {
        name: posPatientName.trim().toUpperCase(),
        age: Number(posAge),
        sex: posSex,
        phone: posPhone.trim(),
        address: posAddress.trim(),
        registrationType: isSelfAware ? 'Self Aware' : (posRegistrationType === 'Referral' ? 'Referral' : 'Self'),
        referralHospital: posRegistrationType === 'Referral' ? finalHospital : '',
        laboratoryTests: isSelfAware ? [] : posSelectedTestIds,
        patientCategory: posServiceDiscountType === 'Counseling Only' ? 'Regular Patient' : posServiceDiscountType,
        paymentMethod: posPaymentMethod,
        paymentStatus: isSelfAware ? 'Waiting for Payment' : 'Paid',
        branchName: branchToAssign,
        systolicBP: posBpSystolic ? Number(posBpSystolic) : null,
        diastolicBP: posBpDiastolic ? Number(posBpDiastolic) : null
      };

      const res = await api('/reception/patients', {
        token,
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setMessage(isSelfAware ? 'Self-Aware Patient registered and queued for sample collection.' : `Patient registered and payment collected successfully! (Receipt #${res?.patient?.receiptNumber || res?.receiptNumber || 'Generated'})`);

      if (res?.patient) {
        setPosRecentPatients(prev => [res.patient, ...prev.slice(0, 9)]);
        if (!isSelfAware) {
          setPosReceiptModalPatient(res.patient);
        }
      }

      // Reset form to Step 1
      setPosPatientName('');
      setPosAge('');
      setPosPhone('');
      setPosAddress('');
      setPosRegistrationType('Self');
      setPosReferralHospital('');
      setPosOtherHospital('');
      setPosBpSystolic('');
      setPosBpDiastolic('');
      setPosSelectedTestIds([]);
      setPosAmountReceived('');
      setPosServiceDiscountType('Regular Patient');
      setPosWizardStep(1);

      loadReceptionData();
      loadQueue();
      loadTransactions();
    } catch (err) {
      setError(err.message || 'Failed to complete registration.');
    } finally {
      setPosRegistering(false);
    }
  };

  const handleCompleteWaitingPayment = async () => {
    if (!completingPaymentPatient) return;
    try {
      setIsCompletingPayment(true);
      const res = await api(`/reception/patients/${completingPaymentPatient._id}/complete-payment`, {
        token,
        method: 'POST',
        body: JSON.stringify({ paymentMethod: completingPaymentMethod })
      });

      setMessage(`Payment completed for ${completingPaymentPatient.name} (Receipt: ${res?.receiptNumber || 'Generated'})`);
      if (res?.patient) {
        setPosReceiptModalPatient(res.patient);
      }
      setCompletingPaymentPatient(null);
      loadReceptionData();
      loadQueue();
      loadTransactions();
    } catch (err) {
      setError(err.message || 'Failed to complete payment.');
    } finally {
      setIsCompletingPayment(false);
    }
  };

  // ── PATHOLOGY HANDLERS ───────────────────────────────────────────
  const openPathologyCase = (c, targetTab = 'optionA') => {
    setSelectedPathologyCase(c);
    const isOptC = c.reportType === 'Option C' || Boolean(c.templateReport?.templateKey);
    const effectiveType = isOptC ? 'Option C' : (c.reportType || (targetTab === 'optionB' ? 'Option B' : targetTab === 'optionC' ? 'Option C' : 'Option A'));
    setPathologyReportType(effectiveType);
    setPathologySubTab(targetTab === 'optionC' || isOptC ? 'optionC' : targetTab);
    setPathologyShowFooter(c.showFooter !== undefined ? c.showFooter : true);

    setPathologyStructured({
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

    const resolvedTpl = resolveOptionCTemplate('pathology', c, c.templateReport);
    setPathologyTemplateReport(resolvedTpl);
    setPathologyReportContent(c.reportContent || (effectiveType === 'Option C' ? renderOptionCHtml(resolvedTpl, 'pathology') : ''));
    setPathologyTemplateSearch('');
  };

  const applyPathologyTemplate = (tplKey) => {
    if (!tplKey) {
      setPathologyTemplateReport(prev => ({ ...prev, templateKey: '' }));
      return;
    }
    const resolved = resolveOptionCTemplate('pathology', selectedPathologyCase, {}, tplKey);
    setPathologyTemplateReport(resolved);
    setPathologyReportContent(renderOptionCHtml(resolved, 'pathology'));
  };

  const handleOpenPathologyPreview = () => {
    if (pathologyReportType === 'Option C') {
      const resolved = resolveOptionCTemplate('pathology', selectedPathologyCase, pathologyTemplateReport);
      setPathologyTemplateReport(resolved);
      setPathologyReportContent(renderOptionCHtml(resolved, 'pathology'));
    }
    setPathologyPreviewOpen(true);
  };

  const handleSavePathologyDraft = async () => {
    if (!selectedPathologyCase) return;
    try {
      setPathologySaving(true);
      let htmlContent = pathologyReportType === 'Option A' && pathologyEditorRef.current ? pathologyEditorRef.current.innerHTML : pathologyReportContent;
      let finalTemplateReport = pathologyTemplateReport;
      if (pathologyReportType === 'Option C') {
        finalTemplateReport = resolveOptionCTemplate('pathology', selectedPathologyCase, pathologyTemplateReport);
        htmlContent = renderOptionCHtml(finalTemplateReport, 'pathology');
        setPathologyTemplateReport(finalTemplateReport);
        setPathologyReportContent(htmlContent);
      }
      await api(`/pathology/cases/${selectedPathologyCase._id}/draft`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          reportType: pathologyReportType,
          reportContent: htmlContent,
          structuredReport: pathologyStructured,
          templateReport: finalTemplateReport,
          showFooter: pathologyShowFooter
        })
      });
      setMessage('Pathology draft saved successfully.');
      loadPathologyData();
    } catch (e) {
      setError(e.message || 'Failed to save pathology draft.');
    } finally {
      setPathologySaving(false);
    }
  };

  const handleApprovePathologyCase = async () => {
    if (!selectedPathologyCase) return;
    try {
      setPathologyApproving(true);
      let htmlContent = pathologyReportType === 'Option A' && pathologyEditorRef.current ? pathologyEditorRef.current.innerHTML : pathologyReportContent;
      let finalTemplateReport = pathologyTemplateReport;
      if (pathologyReportType === 'Option C') {
        finalTemplateReport = resolveOptionCTemplate('pathology', selectedPathologyCase, pathologyTemplateReport);
        htmlContent = renderOptionCHtml(finalTemplateReport, 'pathology');
        setPathologyTemplateReport(finalTemplateReport);
        setPathologyReportContent(htmlContent);
      }

      if (pathologyReportType === 'Option A' && (!htmlContent || !htmlContent.trim() || htmlContent === '<br>')) {
        setError('Please enter or paste the pathology report content before approving.');
        setPathologyApproving(false);
        return;
      }
      if (pathologyReportType === 'Option B') {
        const hasField = Object.values(pathologyStructured).some(v => v && String(v).trim());
        if (!hasField) {
          setError('Please fill in the structured report fields before approving.');
          setPathologyApproving(false);
          return;
        }
      }
      if (pathologyReportType === 'Option C') {
        const hasField = Boolean(
          (finalTemplateReport.findings && finalTemplateReport.findings.trim()) ||
          (finalTemplateReport.impression && finalTemplateReport.impression.trim())
        );
        if (!hasField) {
          setError('Please select a template and enter findings before approving.');
          setPathologyApproving(false);
          return;
        }
      }

      await api(`/pathology/cases/${selectedPathologyCase._id}/approve`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          reportType: pathologyReportType,
          reportContent: htmlContent,
          structuredReport: pathologyStructured,
          templateReport: finalTemplateReport,
          showFooter: pathologyShowFooter
        })
      });

      setMessage(`Pathology case for ${selectedPathologyCase.patient?.name || 'Patient'} approved successfully!`);
      setSelectedPathologyCase(null);
      setPathologySubTab('queue');
      loadPathologyData();
    } catch (e) {
      setError(e.message || 'Failed to approve pathology case.');
    } finally {
      setPathologyApproving(false);
    }
  };

  // ── RADIOLOGY HANDLERS ───────────────────────────────────────────
  const openRadiologyCase = (c, targetTab = 'optionA') => {
    setSelectedRadiologyCase(c);
    const isOptC = c.reportType === 'Option C' || Boolean(c.templateReport?.templateKey);
    const effectiveType = isOptC ? 'Option C' : (c.reportType || (targetTab === 'optionB' ? 'Option B' : targetTab === 'optionC' ? 'Option C' : 'Option A'));
    setRadiologyReportType(effectiveType);
    setRadiologySubTab(targetTab === 'optionC' || isOptC ? 'optionC' : targetTab);
    setRadiologyShowFooter(c.showFooter !== undefined ? c.showFooter : true);

    setRadiologyStructured({
      examination: c.structuredReport?.examination || (c.ultrasoundSubtype || c.examinationType || ''),
      clinicalInformation: c.structuredReport?.clinicalInformation || '',
      technique: c.structuredReport?.technique || '',
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

    const resolvedTpl = resolveOptionCTemplate('radiology', c, c.templateReport);
    setRadiologySelectedTemplateCategory(resolvedTpl.category);
    setRadiologyTemplateReport(resolvedTpl);
    setRadiologyReportContent(c.reportContent || (effectiveType === 'Option C' ? renderOptionCHtml(resolvedTpl, 'radiology') : ''));
    setRadiologyTemplateSearch('');
  };

  const applyRadiologyTemplate = (tplKey, catOverride) => {
    const cat = catOverride || radiologySelectedTemplateCategory;
    if (!tplKey) {
      setRadiologyTemplateReport(prev => ({ ...prev, templateKey: '' }));
      return;
    }
    const resolved = resolveOptionCTemplate('radiology', selectedRadiologyCase, { category: cat }, tplKey);
    setRadiologySelectedTemplateCategory(resolved.category);
    setRadiologyTemplateReport(resolved);
    setRadiologyReportContent(renderOptionCHtml(resolved, 'radiology'));
  };

  const handleOpenRadiologyPreview = () => {
    if (radiologyReportType === 'Option C') {
      const resolved = resolveOptionCTemplate('radiology', selectedRadiologyCase, { ...radiologyTemplateReport, category: radiologySelectedTemplateCategory });
      setRadiologySelectedTemplateCategory(resolved.category);
      setRadiologyTemplateReport(resolved);
      setRadiologyReportContent(renderOptionCHtml(resolved, 'radiology'));
    }
    setRadiologyPreviewOpen(true);
  };

  const handleSaveRadiologyDraft = async () => {
    if (!selectedRadiologyCase) return;
    try {
      setRadiologySaving(true);
      let htmlContent = radiologyReportType === 'Option A' && radiologyEditorRef.current ? radiologyEditorRef.current.innerHTML : radiologyReportContent;
      let finalTemplateReport = radiologyTemplateReport;
      if (radiologyReportType === 'Option C') {
        finalTemplateReport = resolveOptionCTemplate('radiology', selectedRadiologyCase, { ...radiologyTemplateReport, category: radiologySelectedTemplateCategory });
        htmlContent = renderOptionCHtml(finalTemplateReport, 'radiology');
        setRadiologyTemplateReport(finalTemplateReport);
        setReportContent(htmlContent);
      }
      await api(`/radiology/cases/${selectedRadiologyCase._id}/draft`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          reportType: radiologyReportType,
          reportContent: htmlContent,
          structuredReport: radiologyStructured,
          templateReport: finalTemplateReport,
          showFooter: radiologyShowFooter
        })
      });
      setMessage('Radiology draft saved successfully.');
      loadRadiologyData();
    } catch (e) {
      setError(e.message || 'Failed to save radiology draft.');
    } finally {
      setRadiologySaving(false);
    }
  };

  const handleApproveRadiologyCase = async () => {
    if (!selectedRadiologyCase) return;
    try {
      setRadiologyApproving(true);
      let htmlContent = radiologyReportType === 'Option A' && radiologyEditorRef.current ? radiologyEditorRef.current.innerHTML : radiologyReportContent;
      let finalTemplateReport = radiologyTemplateReport;
      if (radiologyReportType === 'Option C') {
        finalTemplateReport = resolveOptionCTemplate('radiology', selectedRadiologyCase, { ...radiologyTemplateReport, category: radiologySelectedTemplateCategory });
        htmlContent = renderOptionCHtml(finalTemplateReport, 'radiology');
        setRadiologyTemplateReport(finalTemplateReport);
        setRadiologyReportContent(htmlContent);
      }

      if (radiologyReportType === 'Option A' && (!htmlContent || !htmlContent.trim() || htmlContent === '<br>')) {
        setError('Please enter or paste the radiology report content before approving.');
        setRadiologyApproving(false);
        return;
      }
      if (radiologyReportType === 'Option B') {
        const hasField = Object.values(radiologyStructured).some(v => v && String(v).trim());
        if (!hasField) {
          setError('Please fill in the structured report fields before approving.');
          setRadiologyApproving(false);
          return;
        }
      }
      if (radiologyReportType === 'Option C') {
        const hasField = Boolean(
          (finalTemplateReport.findings && finalTemplateReport.findings.trim()) ||
          (finalTemplateReport.impression && finalTemplateReport.impression.trim())
        );
        if (!hasField) {
          setError('Please select a template and enter findings before approving.');
          setRadiologyApproving(false);
          return;
        }
      }

      await api(`/radiology/cases/${selectedRadiologyCase._id}/approve`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          reportType: radiologyReportType,
          reportContent: htmlContent,
          structuredReport: radiologyStructured,
          templateReport: finalTemplateReport,
          showFooter: radiologyShowFooter
        })
      });

      setMessage(`Radiology case for ${selectedRadiologyCase.patient?.name || 'Patient'} approved successfully!`);
      setSelectedRadiologyCase(null);
      setRadiologySubTab('queue');
      loadRadiologyData();
    } catch (e) {
      setError(e.message || 'Failed to approve radiology case.');
    } finally {
      setRadiologyApproving(false);
    }
  };

  // ── FILTERED CASES FOR PATHOLOGY & RADIOLOGY ─────────────────────
  const filteredPathologyCases = useMemo(() => {
    return pathologyQueue.filter(c => {
      if (!c) return false;
      if (pathologyStatusFilter !== 'all' && c.status !== pathologyStatusFilter) return false;
      if (pathologySearch.trim()) {
        const s = pathologySearch.trim().toLowerCase();
        const p = c.patient || {};
        const match =
          (p.name && p.name.toLowerCase().includes(s)) ||
          (p.patientId && p.patientId.toLowerCase().includes(s)) ||
          (c.caseNumber && c.caseNumber.toLowerCase().includes(s)) ||
          (c.testType && c.testType.toLowerCase().includes(s)) ||
          (c.branchName && c.branchName.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  }, [pathologyQueue, pathologyStatusFilter, pathologySearch]);

  const filteredRadiologyCases = useMemo(() => {
    return radiologyQueue.filter(c => {
      if (!c) return false;
      if (radiologyStatusFilter !== 'all' && c.status !== radiologyStatusFilter) return false;
      if (radiologySearch.trim()) {
        const s = radiologySearch.trim().toLowerCase();
        const p = c.patient || {};
        const match =
          (p.name && p.name.toLowerCase().includes(s)) ||
          (p.patientId && p.patientId.toLowerCase().includes(s)) ||
          (c.caseNumber && c.caseNumber.toLowerCase().includes(s)) ||
          (c.examinationType && c.examinationType.toLowerCase().includes(s)) ||
          (c.ultrasoundSubtype && c.ultrasoundSubtype.toLowerCase().includes(s)) ||
          (c.branchName && c.branchName.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  }, [radiologyQueue, radiologyStatusFilter, radiologySearch]);

  const filteredWaitingPayment = useMemo(() => {
    return receptionWaitingList.filter(p => {
      if (!p) return false;
      if (!receptionWaitingSearch.trim()) return true;
      const s = receptionWaitingSearch.trim().toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(s)) ||
        (p.patientId && p.patientId.toLowerCase().includes(s)) ||
        (p.phone && p.phone.toLowerCase().includes(s))
      );
    });
  }, [receptionWaitingList, receptionWaitingSearch]);

  // Synthetic live reports for preview
  const livePathologyReport = useMemo(() => {
    if (!selectedPathologyCase) return null;
    const currentOptCHtml = pathologyReportType === 'Option C' ? renderOptionCHtml(pathologyTemplateReport, 'pathology') : '';
    const currentTplReport = pathologyReportType === 'Option C' ? resolveOptionCTemplate('pathology', selectedPathologyCase, pathologyTemplateReport) : pathologyTemplateReport;
    return {
      ...selectedPathologyCase,
      reportType: pathologyReportType,
      reportContent: pathologyReportType === 'Option A' && pathologyEditorRef.current
        ? pathologyEditorRef.current.innerHTML
        : pathologyReportType === 'Option C'
        ? currentOptCHtml
        : pathologyReportContent,
      structuredReport: pathologyStructured,
      templateReport: currentTplReport,
      showFooter: pathologyShowFooter,
      status: selectedPathologyCase.status || 'In Progress',
      pathologist: user,
      approvedBy: selectedPathologyCase.approvedBy || user,
      approvedDate: selectedPathologyCase.approvedAt || new Date()
    };
  }, [selectedPathologyCase, pathologyReportType, pathologyReportContent, pathologyStructured, pathologyTemplateReport, pathologyShowFooter, user]);

  const liveRadiologyReport = useMemo(() => {
    if (!selectedRadiologyCase) return null;
    const currentOptCHtml = radiologyReportType === 'Option C' ? renderOptionCHtml(radiologyTemplateReport, 'radiology') : '';
    const currentTplReport = radiologyReportType === 'Option C' ? resolveOptionCTemplate('radiology', selectedRadiologyCase, radiologyTemplateReport) : radiologyTemplateReport;
    return {
      ...selectedRadiologyCase,
      reportType: radiologyReportType,
      reportContent: radiologyReportType === 'Option A' && radiologyEditorRef.current
        ? radiologyEditorRef.current.innerHTML
        : radiologyReportType === 'Option C'
        ? currentOptCHtml
        : radiologyReportContent,
      structuredReport: radiologyStructured,
      templateReport: currentTplReport,
      showFooter: radiologyShowFooter,
      status: selectedRadiologyCase.status || 'In Progress',
      radiologist: user,
      approvedBy: selectedRadiologyCase.approvedBy || user,
      approvedDate: selectedRadiologyCase.approvedAt || new Date()
    };
  }, [selectedRadiologyCase, radiologyReportType, radiologyReportContent, radiologyStructured, radiologyTemplateReport, radiologyShowFooter, user]);

  // Filtered queue calculation
  const safeQueue = useMemo(() => (Array.isArray(queue) ? queue.filter(x => x && x.patient) : []), [queue]);
  const filteredQueue = useMemo(() => {
    return safeQueue.filter(x => {
      if (!x || !x.patient) return false;
      if (queueSearch.trim()) {
        const s = queueSearch.trim().toLowerCase();
        const p = x.patient;
        const match =
          (p.name && p.name.toLowerCase().includes(s)) ||
          (p.patientId && p.patientId.toLowerCase().includes(s)) ||
          (p.barcode && p.barcode.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  }, [safeQueue, queueSearch]);

  const queuedList = useMemo(() => filteredQueue.filter(x => x.collection?.status === 'Queued'), [filteredQueue]);
  const unfinishedList = useMemo(() => filteredQueue.filter(x => x.collection?.status === 'In Progress'), [filteredQueue]);

  // Counts for tabs
  const countOtona = useMemo(() => receivedTransfers.filter(t => t.sourceBranch === 'Otona').length, [receivedTransfers]);
  const countMain = useMemo(() => receivedTransfers.filter(t => t.sourceBranch === 'Main').length, [receivedTransfers]);
  const countApproved = useMemo(() => reports.filter(r => ['Approved', 'Ready for Printing'].includes(r.status)).length, [reports]);
  const countPending = useMemo(() => reports.filter(r => ['Submitted', 'Pending'].includes(r.status)).length, [reports]);
  const reportsCount = useMemo(() => reports.length, [reports]);

  // Filtered Approved Reports List
  const approvedList = useMemo(() => {
    return reports.filter(r => {
      if (!['Approved', 'Ready for Printing'].includes(r.status)) return false;
      if (!matchesReportPeriod(r, approvedPeriod)) return false;
      if (approvedSearch.trim()) {
        const s = approvedSearch.trim().toLowerCase();
        const p = r.patient || {};
        const match =
          (p.name && p.name.toLowerCase().includes(s)) ||
          (p.patientId && p.patientId.toLowerCase().includes(s)) ||
          (r.reportNumber && r.reportNumber.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  }, [reports, approvedPeriod, approvedSearch]);

  // Filtered Pending Approval List
  const pendingList = useMemo(() => {
    return reports.filter(r => {
      if (!['Submitted', 'Pending'].includes(r.status)) return false;
      if (!matchesReportPeriod(r, pendingPeriod)) return false;
      if (pendingSearch.trim()) {
        const s = pendingSearch.trim().toLowerCase();
        const p = r.patient || {};
        const match =
          (p.name && p.name.toLowerCase().includes(s)) ||
          (p.patientId && p.patientId.toLowerCase().includes(s)) ||
          (r.reportNumber && r.reportNumber.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  }, [reports, pendingPeriod, pendingSearch]);

  // Transaction computations & filters
  const transactionsCount = useMemo(() => txSummary.totalTransactions || transactions.length, [txSummary, transactions]);

  const filteredTransactions = useMemo(() => {
    if (!txSearch) return transactions;
    const qLower = txSearch.toLowerCase().trim();
    return transactions.filter(t => {
      const hay = `${t.transactionId || ''} ${t.patientId || ''} ${t.patientName || ''} ${t.phone || ''} ${t.receptionist || ''} ${t.paymentMethod || ''} ${t.tests || ''}`.toLowerCase();
      return hay.includes(qLower);
    });
  }, [transactions, txSearch]);

  const txCashTotal = useMemo(() => {
    return (filteredTransactions || [])
      .filter(t => t.paymentStatus === 'Paid' && (t.paymentMethod === 'Cash' || !t.paymentMethod))
      .reduce((sum, t) => sum + Number(t.amount !== undefined ? t.amount : t.grandTotal || 0), 0);
  }, [filteredTransactions]);

  const txElectronicTotal = useMemo(() => {
    return (filteredTransactions || [])
      .filter(t => t.paymentStatus === 'Paid' && t.paymentMethod && t.paymentMethod !== 'Cash')
      .reduce((sum, t) => sum + Number(t.amount !== undefined ? t.amount : t.grandTotal || 0), 0);
  }, [filteredTransactions]);

  // Keep indeterminate state synchronized on Select All checkbox
  useEffect(() => {
    if (!selectAllRef.current) return;
    if (!filteredTransactions || filteredTransactions.length === 0) {
      selectAllRef.current.indeterminate = false;
      return;
    }
    const displayedKeys = filteredTransactions.map(t => String(t._id || t.paymentId));
    const selectedCount = displayedKeys.filter(k => selectedTxIds.includes(k)).length;
    const isAll = selectedCount === displayedKeys.length && displayedKeys.length > 0;
    const isSome = selectedCount > 0 && !isAll;
    selectAllRef.current.indeterminate = isSome;
  }, [filteredTransactions, selectedTxIds]);

  // ----------------------------------------------------
  // Money and Transaction Action Handlers
  // ----------------------------------------------------
  const openEditTransaction = (tx) => {
    setEditingTransaction(tx);
    setEditTxAmount(tx.amount !== undefined ? tx.amount : tx.grandTotal || 0);
    setEditTxMethod(tx.paymentMethod || 'Cash');
    setEditTxStatus(tx.paymentStatus || 'Paid');
    setEditTxNotes(tx.notes || '');
  };

  const handleSaveTransaction = async (e) => {
    if (e) e.preventDefault();
    if (!editingTransaction) return;
    setIsSavingTx(true);
    setError('');
    try {
      const txId = editingTransaction._id || editingTransaction.paymentId;
      const res = await api(`/reports/transactions/${txId}`, {
        token,
        method: 'PUT',
        body: JSON.stringify({
          amount: Number(editTxAmount),
          paymentMethod: editTxMethod,
          paymentStatus: editTxStatus,
          notes: editTxNotes
        })
      });
      setMessage(res?.message || 'Transaction updated successfully.');
      setEditingTransaction(null);
      await loadTransactions();
    } catch (err) {
      if (!isSilentNetworkError(err)) setError(err.message || 'Failed to update transaction.');
    } finally {
      setIsSavingTx(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return;
    setIsDeletingTx(true);
    setError('');
    try {
      const txId = deletingTransaction._id || deletingTransaction.paymentId;
      const res = await api(`/reports/transactions/${txId}`, {
        token,
        method: 'DELETE'
      });
      setMessage(res?.message || '1 transaction deleted successfully.');
      setSelectedTxIds(prev => prev.filter(id => id !== String(txId)));
      setDeletingTransaction(null);
      await loadTransactions();
    } catch (err) {
      if (!isSilentNetworkError(err)) setError(err.message || 'Failed to delete transaction.');
    } finally {
      setIsDeletingTx(false);
    }
  };

  const toggleSelectTx = (id) => {
    const sId = String(id);
    setSelectedTxIds(prev =>
      prev.includes(sId) ? prev.filter(x => x !== sId) : [...prev, sId]
    );
  };

  const toggleSelectAllTx = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) return;
    const displayedKeys = filteredTransactions.map(t => String(t._id || t.paymentId));
    const allSelected = displayedKeys.every(k => selectedTxIds.includes(k));
    if (allSelected) {
      setSelectedTxIds(prev => prev.filter(k => !displayedKeys.includes(k)));
    } else {
      setSelectedTxIds(prev => Array.from(new Set([...prev, ...displayedKeys])));
    }
  };

  const handleBulkDeleteTransactions = async () => {
    if (selectedTxIds.length === 0) return;
    setIsBulkDeleting(true);
    setError('');
    const countToDelete = selectedTxIds.length;
    try {
      const res = await api('/reports/transactions/bulk-delete', {
        token,
        method: 'POST',
        body: JSON.stringify({
          transactionIds: selectedTxIds,
          ids: selectedTxIds
        })
      });
      if (res?.success === false || res?.deletedCount === 0) {
        setError(res?.message || 'No matching transactions were found or deleted.');
        return;
      }
      const count = res?.deletedCount || countToDelete;
      setMessage(`${count} money transaction${count === 1 ? '' : 's'} deleted successfully. Financial totals have been updated.`);
      setSelectedTxIds([]);
      setShowBulkDeleteModal(false);
      await loadTransactions();
    } catch (err) {
      if (!isSilentNetworkError(err)) setError(err.message || 'Failed to bulk delete transactions.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleAddTransaction = async (e) => {
    if (e) e.preventDefault();
    setIsAddingTx(true);
    setError('');
    try {
      const res = await api('/reports/transactions', {
        token,
        method: 'POST',
        body: JSON.stringify({
          patientId: addTxPatientId,
          amount: Number(addTxAmount),
          paymentMethod: addTxMethod,
          branchName: addTxBranch,
          notes: addTxNotes
        })
      });
      setMessage(res?.message || 'Money transaction recorded successfully.');
      setAddingTransaction(false);
      setAddTxPatientId('');
      setAddTxAmount('');
      setAddTxNotes('');
      await loadTransactions();
    } catch (err) {
      if (!isSilentNetworkError(err)) setError(err.message || 'Failed to record transaction.');
    } finally {
      setIsAddingTx(false);
    }
  };

  // ----------------------------------------------------
  // Admin Queue Delete Handler (Safely removes from queue)
  // ----------------------------------------------------
  const handleConfirmDeleteQueue = async () => {
    const p = queueDeleteModal.patient;
    if (!p?._id) return;
    try {
      setQueueDeleteModal(prev => ({ ...prev, busy: true, error: '' }));
      await api(`/collection/queue/${p._id}`, {
        token,
        method: 'DELETE'
      });
      setMessage(`✅ Patient ${p.patientId} (${p.name}) removed from sample queue. Historical records preserved.`);
      setQueueDeleteModal({ open: false, patient: null, busy: false, error: '' });
      loadQueue();
    } catch (err) {
      setQueueDeleteModal(prev => ({
        ...prev,
        busy: false,
        error: err.message || 'Failed to remove patient from queue.'
      }));
    }
  };

  // ----------------------------------------------------
  // Cross-Branch Transfer Action Handlers
  // ----------------------------------------------------
  const openTransferModal = (patient, transferStatusByTest = {}) => {
    const tests = Array.isArray(patient?.laboratoryTests) ? patient.laboratoryTests : [];
    const availableTests = tests.filter(t => {
      const tId = idOf(t);
      const st = transferStatusByTest?.[tId] || transferStatusByTest?.[t.name?.toUpperCase()];
      const isActive = st && ['PENDING_TRANSFER', 'RECEIVED', 'UNDER_INVESTIGATION', 'RESULT_READY'].includes(st.status);
      const isDone = st && ['COMPLETED', 'APPROVED'].includes(st.status);
      return !isActive && !isDone;
    });

    const destinationBranch = (patient.branchName || 'Main') === 'Main' ? 'Otona' : 'Main';

    setTransferModal({
      open: true,
      patient,
      tests,
      destinationBranch,
      transferStatusByTest,
      selectedTestIds: availableTests.map(t => idOf(t)),
      priority: 'Routine',
      notes: '',
      busy: false,
      error: ''
    });
  };

  const handleExecuteTransfer = async () => {
    if (!transferModal?.patient?._id || !transferModal?.selectedTestIds?.length) return;
    try {
      setTransferModal(m => ({ ...m, busy: true, error: '' }));
      const payload = {
        patientId: transferModal.patient._id,
        testIds: transferModal.selectedTestIds,
        priority: transferModal.priority,
        notes: transferModal.notes,
        sourceBranch: transferModal.patient.branchName || 'Main'
      };
      await createTransfer(payload, token);
      setMessage(`✅ Transferred ${transferModal.selectedTestIds.length} test(s) to ${transferModal.destinationBranch}.`);
      setTransferModal(null);
      loadQueue();
      loadTransfers();
    } catch (err) {
      setTransferModal(m => ({ ...m, busy: false, error: err.message || 'Failed to transfer sample.' }));
    }
  };

  const handleReceiveTransfer = async (transfer) => {
    try {
      setBusy(true);
      await receiveTransfer(transfer._id, token);
      setMessage(`✅ Transfer for ${transfer.patient?.name} marked as Received.`);
      loadTransfers();
    } catch (err) {
      setError(err.message || 'Failed to mark transfer as received.');
    } finally {
      setBusy(false);
    }
  };

  const handleStartInvestigation = async (transfer) => {
    try {
      setBusy(true);
      await startInvestigation(transfer._id, token);
      setMessage(`🔬 Investigation started for ${transfer.patient?.name}.`);
      loadTransfers();
    } catch (err) {
      setError(err.message || 'Failed to start investigation.');
    } finally {
      setBusy(false);
    }
  };

  const handleClearTransfer = async () => {
    if (!clearModal.transfer?._id) return;
    try {
      setClearModal(m => ({ ...m, busy: true, error: '' }));
      await clearTransfer(clearModal.transfer._id, clearModal.reason, token);
      setMessage('✅ Transfer cleared from active list and moved to Cleared Information.');
      setClearModal({ open: false, transfer: null, busy: false, reason: '', error: '' });
      loadTransfers();
      loadCleared();
    } catch (err) {
      setClearModal(m => ({ ...m, busy: false, error: err.message || 'Failed to clear transfer.' }));
    }
  };

  const handleRestoreTransfer = async (transferId) => {
    try {
      setIsRestoringTransfer(true);
      await restoreTransfer(transferId, token);
      setMessage('↩️ Transfer successfully restored back to active Received list.');
      loadTransfers();
      loadCleared();
    } catch (err) {
      setError(err.message || 'Failed to restore transfer.');
    } finally {
      setIsRestoringTransfer(false);
    }
  };

  const openAuditModal = async (transfer) => {
    setAuditModal({ open: true, transfer, events: [] });
    setAuditLoading(true);
    try {
      const res = await getTransferAudit(transfer._id, token);
      setAuditModal({ open: true, transfer: res.transfer || transfer, events: res.auditTrail || [] });
    } catch (err) {
      setAuditModal({ open: true, transfer, events: [], error: err.message || 'Failed to load audit trail.' });
    } finally {
      setAuditLoading(false);
    }
  };

  // ----------------------------------------------------
  // Self-Aware Investigation Handler
  // ----------------------------------------------------
  const openInvestigationModal = (patient) => {
    setInvestigatingPatient(patient);
    setInvSymptoms(patient.investigationNotes || '');
    setInvSelectedTests((patient.laboratoryTests || []).map(t => idOf(t)));
    setInvBpSystolic(patient.systolicBP || '');
    setInvBpDiastolic(patient.diastolicBP || '');
  };

  const handleSubmitInvestigation = async () => {
    if (!investigatingPatient?._id) return;
    if (!invSelectedTests.length) {
      setError('Please select at least one laboratory test.');
      return;
    }
    try {
      setInvSubmitting(true);
      await api(`/collection/investigation/${investigatingPatient._id}`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          laboratoryTests: invSelectedTests,
          symptoms: invSymptoms,
          systolicBP: invBpSystolic ? Number(invBpSystolic) : undefined,
          diastolicBP: invBpDiastolic ? Number(invBpDiastolic) : undefined
        })
      });
      setMessage(`✅ Investigation completed for ${investigatingPatient.name}. Tests sent to Reception for payment.`);
      setInvestigatingPatient(null);
      loadInvestigation();
      loadQueue();
    } catch (err) {
      setError(err.message || 'Failed to submit investigation.');
    } finally {
      setInvSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Report Workflow Handlers
  // ----------------------------------------------------
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesTab =
        reportWorkflowTab === 'Pending'
          ? ['Submitted', 'Pending'].includes(r.status)
          : reportWorkflowTab === 'Approved'
          ? ['Approved', 'Ready for Printing'].includes(r.status)
          : r.status === reportWorkflowTab;

      if (!matchesTab) return false;

      if (reportSearch.trim()) {
        const s = reportSearch.trim().toLowerCase();
        const p = r.patient || {};
        const match =
          (p.name && p.name.toLowerCase().includes(s)) ||
          (p.patientId && p.patientId.toLowerCase().includes(s)) ||
          (r.reportNumber && r.reportNumber.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  }, [reports, reportWorkflowTab, reportSearch]);

  const handleOpenEditReport = (report) => {
    setEditingReport(report);
    setEditComments(report.comments || '');
    setEditStatus(report.status || 'Draft');
  };

  const handleSaveReportEdit = async () => {
    if (!editingReport?._id) return;
    try {
      setIsSavingReportEdit(true);
      await api(`/collection/reports/${editingReport._id}`, {
        token,
        method: 'PUT',
        body: JSON.stringify({
          comments: editComments,
          status: editStatus
        })
      });
      setMessage('✅ Report updated successfully.');
      setEditingReport(null);
      loadReports();
    } catch (err) {
      setError(err.message || 'Failed to update report.');
    } finally {
      setIsSavingReportEdit(false);
    }
  };

  const handleDeleteReport = async () => {
    const r = reportDeleteModal.report;
    if (!r?._id) return;
    try {
      setReportDeleteModal(prev => ({ ...prev, busy: true, error: '' }));
      await api(`/collection/reports/${r._id}`, {
        token,
        method: 'DELETE'
      });
      setMessage(`✅ Report ${r.reportNumber || 'draft'} deleted successfully.`);
      setReportDeleteModal({ open: false, report: null, busy: false, error: '' });
      loadReports();
    } catch (err) {
      setReportDeleteModal(prev => ({
        ...prev,
        busy: false,
        error: err.message || 'Failed to delete report.'
      }));
    }
  };

  return (
    <section className="page collection-page collector-page admin-rtm-page">
      {/* Header with Title & Branch Switcher */}
      <header className="dash-header" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
          <div>
            <p className="eyebrow">Admin Laboratory Operations Workspace</p>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              Report & Transaction Management
              <span className="collector-paid" style={{ fontSize: '0.82rem', padding: '3px 10px', borderRadius: '12px' }}>
                📍 Branch View: {selectedBranch}
              </span>
            </h1>
            <p className="intro">
              Full visibility and management capability over patient test queues, cross-branch transfers, Self-Aware investigations, and laboratory report workflows across ETU branches.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setAdminInterpModalOpen(true)}
              className="secondary"
              style={{
                fontSize: '0.82rem',
                padding: '7px 14px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                background: 'var(--card-bg, #131e32)',
                border: '1px solid var(--card-border, #24344d)',
                color: 'var(--text-primary, #ffffff)',
                fontWeight: 700
              }}
            >
              <span>📚</span> Clinical Interpretation Library
            </button>

            {/* Branch Filter Pills */}
            {isSuperAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--card-bg, #131e32)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--card-border, #24344d)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>Branch:</span>
                {['All', 'Main', 'Otona'].map(b => (
                  <button
                    key={b}
                    type="button"
                    className={selectedBranch === b ? 'primary' : 'secondary'}
                    onClick={() => setSelectedBranch(b)}
                    style={{ fontSize: '0.78rem', padding: '4px 12px', borderRadius: '16px' }}
                  >
                    {b === 'All' ? 'All Branches' : `${b} Branch`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Alerts */}
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {/* ── TOP UNIFIED DEPARTMENT SWITCHER BAR ──────────────────────── */}
      <div className="admin-dept-switcher" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        marginBottom: '1.25rem',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(12px)',
        overflowX: 'auto'
      }}>
        {[
          { id: 'laboratory', label: '🧪 Laboratory Operations', badge: queuedList.length + reportsCount },
          { id: 'reception', label: '📋 Reception Department', badge: receptionWaitingList.length > 0 ? `${receptionWaitingList.length} Waiting` : '' },
          { id: 'pathology', label: '🔬 Pathology Department', badge: pathologyActiveCount > 0 ? pathologyActiveCount : '' },
          { id: 'radiology', label: '🩻 Radiology Department', badge: radiologyActiveCount > 0 ? radiologyActiveCount : '' }
        ].map(dept => (
          <button
            key={dept.id}
            type="button"
            className={activeDepartment === dept.id ? 'primary' : 'secondary'}
            onClick={() => {
              setActiveDepartment(dept.id);
              if (dept.id === 'reception') loadReceptionData();
              else if (dept.id === 'pathology') loadPathologyData();
              else if (dept.id === 'radiology') loadRadiologyData();
            }}
            style={{
              padding: '9px 18px',
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              ...(activeDepartment === dept.id ? {
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.45)',
                border: '1px solid #38bdf8'
              } : {
                background: 'rgba(30, 41, 59, 0.65)',
                color: '#cbd5e1',
                border: '1px solid rgba(148, 163, 184, 0.15)'
              })
            }}
          >
            <span>{dept.label}</span>
            {dept.badge ? (
              <span style={{
                background: activeDepartment === dept.id ? 'rgba(255,255,255,0.28)' : '#0284c7',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.74rem',
                fontWeight: 800
              }}>
                {dept.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── LABORATORY OPERATIONS TAB GROUP (PRESERVED 100%) ─────────── */}
      {activeDepartment === 'laboratory' && (
        <>
          {/* Top Main Navigation Tabs */}
          <div className="reception-tabs" style={{ marginBottom: '1.25rem' }}>
        {[
          ['queue', `Patient Queue (${queuedList.length})`],
          ['received_otona', `Received From Otona (${countOtona})`],
          ['received_main', `Received From Main (${countMain})`],
          ['investigation', `Self-Aware Investigation (${investigationPatients.length})`],
          ['approved', `Approved Reports (${countApproved})`],
          ['pending', `Pending Approval (${countPending})`],
          ['transactions', `Money and Transaction (${transactionsCount})`],
          ['reports', `Report Workflow (${reportsCount})`],
          ['cleared', `Cleared Information (${clearedTransfers.length})`],
          ['unfinished', `Unfinished Collections (${unfinishedList.length})`]
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={activeTab === id ? 'active' : ''}
            onClick={() => {
              setActiveTab(id);
              if (searchParams.get('view') || searchParams.get('tab')) {
                setSearchParams({ view: id });
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PATIENT QUEUE                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <>
          {/* Summary Metric Cards */}
          <div className="enterprise-grid" style={{ marginBottom: '1rem' }}>
            {[
              ['Today’s collections', dash?.summary?.todayCollections],
              ['Pending collections', dash?.summary?.pendingCollections],
              ['In progress', dash?.summary?.inProgress],
              ['Pending approvals', dash?.summary?.pendingApprovals]
            ].map(([label, value]) => (
              <article className="enterprise-card blue" key={label}>
                <small>{label}</small>
                <strong>{value ?? '—'}</strong>
              </article>
            ))}
          </div>

          <section className="collector-queue">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p className="eyebrow">Sample collection & laboratory work queue</p>
                <h2>Patients Awaiting Laboratory Work</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="search"
                  placeholder="Search patient name or ID..."
                  value={queueSearch}
                  onChange={e => setQueueSearch(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border, #2d3e5b)',
                    background: 'var(--input-bg, #0d1626)',
                    color: 'var(--input-color, #ffffff)',
                    minWidth: '250px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </header>

            {/* Time Period Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', margin: '12px 0 16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginRight: '4px' }}>
                Period:
              </span>
              {[
                ['today', "Today's"],
                ['lastWeek', 'Last Week'],
                ['lastMonth', 'Last Month'],
                ['all', 'All']
              ].map(([p, label]) => (
                <button
                  key={p}
                  type="button"
                  className={queuePeriod === p ? 'primary' : 'secondary'}
                  onClick={() => setQueuePeriod(p)}
                  style={{ fontSize: '0.8rem', padding: '5px 14px', borderRadius: '20px' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Patients Queue List */}
            <div className="collector-queue-list">
              {queuedList.length ? (
                queuedList.map(row => {
                  const pBranch = row.patient?.branchName || 'Main';
                  const destinationBranch = pBranch === 'Main' ? 'Otona' : 'Main';
                  return (
                    <article className="collector-patient-card" key={row.patient._id}>
                      <div className="collector-patient-summary">
                        <div className="collector-patient-avatar">{row.patient.name?.[0]}</div>
                        <div className="collector-patient-main">
                          <h3>
                            {row.patient.name}
                            <span style={{ marginLeft: '8px', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: pBranch === 'Main' ? '#0284c7' : '#0d9488', color: '#fff' }}>
                              📍 {pBranch}
                            </span>
                          </h3>
                          <p>
                            {row.patient.patientId} · {row.patient.age} YRS · {row.patient.sex} · {row.patient.phone}
                            {(row.patient.systolicBP || row.patient.diastolicBP) ? ` · 🫀 BP: ${row.patient.systolicBP || '—'}/${row.patient.diastolicBP || '—'} mmHg` : ''}
                          </p>
                        </div>
                        <aside style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="collector-paid">
                            {row.patient.paymentStatus === 'Paid' ? 'Ready for Sample Collection' : 'Counseling'}
                          </span>
                          <button
                            type="button"
                            className="secondary transfer-action-btn"
                            disabled={busy}
                            onClick={() => openTransferModal(row.patient, row.transferStatusByTest || {})}
                            title={`Send sample/test for ${row.patient.name} to ${destinationBranch}`}
                          >
                            ⇄ Send to {destinationBranch}
                          </button>
                          {/* Admin-only Queue Delete Button */}
                          <button
                            type="button"
                            className="secondary"
                            style={{ color: '#ef4444', borderColor: '#ef4444' }}
                            onClick={() => setQueueDeleteModal({ open: true, patient: row.patient, busy: false, error: '' })}
                            title="Remove patient from collection queue"
                          >
                            🗑️ Delete Queue
                          </button>
                        </aside>
                      </div>
                      <OrderedTests
                        patient={row.patient}
                        catalog={catalog}
                        allocationByTest={row.allocationByTest || {}}
                        transferStatusByTest={row.transferStatusByTest || {}}
                      />
                    </article>
                  );
                })
              ) : (
                <p className="empty">No queued patients awaiting sample collection for this filter.</p>
              )}
            </div>
          </section>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2 & 3: RECEIVED FROM OTONA & RECEIVED FROM MAIN                       */}
      {/* ========================================================================= */}
      {(activeTab === 'received_otona' || activeTab === 'received_main') && (() => {
        const activeSource = activeTab === 'received_otona' ? 'Otona' : 'Main';
        const list = receivedTransfers.filter(t => {
          if (t.sourceBranch !== activeSource) return false;
          if (transferStatusFilter !== 'All' && t.status !== transferStatusFilter) return false;
          if (transferSearch.trim()) {
            const s = transferSearch.trim().toLowerCase();
            const p = t.patient || {};
            const match =
              (p.name && p.name.toLowerCase().includes(s)) ||
              (p.patientId && p.patientId.toLowerCase().includes(s)) ||
              (t.testName && t.testName.toLowerCase().includes(s)) ||
              (t.transferId && t.transferId.toLowerCase().includes(s));
            if (!match) return false;
          }
          return true;
        });

        const countPending = receivedTransfers.filter(t => t.sourceBranch === activeSource && t.status === 'PENDING_TRANSFER').length;
        const countReceived = receivedTransfers.filter(t => t.sourceBranch === activeSource && t.status === 'RECEIVED').length;
        const countInvestigating = receivedTransfers.filter(t => t.sourceBranch === activeSource && t.status === 'UNDER_INVESTIGATION').length;
        const countReady = receivedTransfers.filter(t => t.sourceBranch === activeSource && t.status === 'RESULT_READY').length;
        const countCompleted = receivedTransfers.filter(t => t.sourceBranch === activeSource && ['COMPLETED', 'APPROVED'].includes(t.status)).length;

        return (
          <section className="collector-queue">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p className="eyebrow">Cross-branch transferred queue</p>
                <h2>Samples Received From {activeSource}</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="search"
                  placeholder="Search patient name or ID..."
                  value={transferSearch}
                  onChange={e => setTransferSearch(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border, #2d3e5b)',
                    background: 'var(--input-bg, #0d1626)',
                    color: 'var(--input-color, #ffffff)',
                    minWidth: '250px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </header>

            {/* Time Period Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', margin: '12px 0 8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginRight: '4px' }}>
                Period:
              </span>
              {[
                ['today', "Today's"],
                ['lastWeek', 'Last Week'],
                ['lastMonth', 'Last Month'],
                ['all', 'All']
              ].map(([p, label]) => (
                <button
                  key={p}
                  type="button"
                  className={transferPeriod === p ? 'primary' : 'secondary'}
                  onClick={() => setTransferPeriod(p)}
                  style={{ fontSize: '0.8rem', padding: '5px 14px', borderRadius: '20px' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Status Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', margin: '8px 0 16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginRight: '4px' }}>
                Status:
              </span>
              {[
                ['All', `All (${receivedTransfers.filter(t => t.sourceBranch === activeSource).length})`],
                ['PENDING_TRANSFER', `Pending (${countPending})`],
                ['RECEIVED', `Received (${countReceived})`],
                ['UNDER_INVESTIGATION', `Under Investigation (${countInvestigating})`],
                ['RESULT_READY', `Result Ready (${countReady})`],
                ['COMPLETED', `Completed (${countCompleted})`]
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={transferStatusFilter === val ? 'primary' : 'secondary'}
                  onClick={() => setTransferStatusFilter(val)}
                  style={{ fontSize: '0.8rem', padding: '5px 12px', borderRadius: '20px' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Transferred Cards List */}
            <div className="collector-queue-list">
              {list.length ? (
                list.map(transfer => (
                  <article className="collector-patient-card transfer-card" key={transfer._id}>
                    <div className="collector-patient-summary">
                      <div className="collector-patient-avatar transfer-avatar" style={{ background: '#0284c7', color: '#fff' }}>
                        {transfer.patient?.name?.[0] || 'T'}
                      </div>
                      <div className="collector-patient-main">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <h3>{transfer.patient?.name}</h3>
                          <span className={`transfer-badge sent-from-${transfer.sourceBranch.toLowerCase()}`}>
                            SENT FROM {transfer.sourceBranch.toUpperCase()}
                          </span>
                          <span className="transfer-badge received-badge">
                            RECEIVED FROM {transfer.sourceBranch.toUpperCase()}
                          </span>
                          <span className={`transfer-status-badge status-${transfer.status.toLowerCase()}`}>
                            {transfer.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p>
                          <strong>ID:</strong> {transfer.patient?.patientId} · <strong>Transfer:</strong> {transfer.transferId} · <strong>Test:</strong> {transfer.testName} · <strong>Priority:</strong> {transfer.priority}
                          {(transfer.patient?.systolicBP || transfer.patient?.diastolicBP) ? ` · 🫀 BP: ${transfer.patient?.systolicBP || '—'}/${transfer.patient?.diastolicBP || '—'} mmHg` : ''}
                        </p>
                        {transfer.notes && (
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '4px', fontStyle: 'italic' }}>
                            Notes: "{transfer.notes}"
                          </p>
                        )}
                      </div>
                      <aside style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {transfer.status === 'PENDING_TRANSFER' && (
                          <button
                            type="button"
                            className="primary"
                            disabled={busy}
                            onClick={() => handleReceiveTransfer(transfer)}
                          >
                            📥 Receive Sample
                          </button>
                        )}
                        {transfer.status === 'RECEIVED' && (
                          <button
                            type="button"
                            className="primary"
                            disabled={busy}
                            onClick={() => handleStartInvestigation(transfer)}
                          >
                            🔬 Start Investigation
                          </button>
                        )}
                        {transfer.status === 'RESULT_READY' && (
                          <button
                            type="button"
                            className="primary"
                            style={{ background: '#16a34a' }}
                            disabled={busy}
                            onClick={() => sendResultBack(transfer._id, token).then(() => {
                              setMessage('✅ Result sent back to requesting branch.');
                              loadTransfers();
                            })}
                          >
                            🚀 Send Result Back
                          </button>
                        )}
                        {(['COMPLETED', 'RESULT_READY', 'APPROVED'].includes(transfer.status)) && (
                          <button
                            type="button"
                            className="secondary"
                            disabled={busy}
                            onClick={() => setClearModal({ open: true, transfer, busy: false, reason: '', error: '' })}
                          >
                            🗑️ Clear Data
                          </button>
                        )}
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => openAuditModal(transfer)}
                        >
                          📜 Audit
                        </button>
                      </aside>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty">No transferred samples received from {activeSource} for this period/filter.</p>
              )}
            </div>
          </section>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 4: SELF-AWARE INVESTIGATION                                           */}
      {/* ========================================================================= */}
      {activeTab === 'investigation' && (
        <section className="collector-queue">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p className="eyebrow">Self-Aware Investigation Desk</p>
              <h2>Self-Aware Patients Awaiting Investigation & Test Selection</h2>
            </div>
            <input
              type="search"
              placeholder="Search patient name or ID..."
              value={investigationSearch}
              onChange={e => setInvestigationSearch(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--input-border, #2d3e5b)',
                background: 'var(--input-bg, #0d1626)',
                color: 'var(--input-color, #ffffff)',
                minWidth: '250px',
                fontSize: '0.85rem'
              }}
            />
          </header>

          <div className="collector-queue-list" style={{ marginTop: '16px' }}>
            {investigationPatients.length ? (
              investigationPatients.map(patient => (
                <article className="collector-patient-card" key={patient._id}>
                  <div className="collector-patient-summary">
                    <div className="collector-patient-avatar" style={{ background: '#8b5cf6', color: '#fff' }}>
                      {patient.name?.[0] || 'S'}
                    </div>
                    <div className="collector-patient-main">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3>{patient.name}</h3>
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: '#8b5cf6', color: '#fff' }}>
                          Self-Aware
                        </span>
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: '#0284c7', color: '#fff' }}>
                          📍 {patient.branchName || 'Main'}
                        </span>
                      </div>
                      <p>
                        {patient.patientId} · {patient.age} YRS · {patient.sex} · {patient.phone} · Registered: {new Date(patient.registrationDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {(patient.systolicBP || patient.diastolicBP) ? ` · 🫀 BP: ${patient.systolicBP || '—'}/${patient.diastolicBP || '—'} mmHg` : ''}
                      </p>
                      {patient.investigationNotes && (
                        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '4px' }}>
                          <strong>Symptoms:</strong> {patient.investigationNotes}
                        </p>
                      )}
                    </div>
                    <aside>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => openInvestigationModal(patient)}
                      >
                        🔬 Conduct Investigation
                      </button>
                    </aside>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty">No Self-Aware patients currently waiting for investigation.</p>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* DEDICATED VIEW: APPROVED REPORTS (Dashboard integration & Admin workspace) */}
      {/* ========================================================================= */}
      {activeTab === 'approved' && (
        <section className="collector-queue">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p className="eyebrow">Authorized Laboratory Investigations</p>
              <h2>Approved Laboratory Reports</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="search"
                placeholder="Search patient name or ID..."
                value={approvedSearch}
                onChange={e => setApprovedSearch(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--input-border, #2d3e5b)',
                  background: 'var(--input-bg, #0d1626)',
                  color: 'var(--input-color, #ffffff)',
                  minWidth: '250px',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </header>

          {/* Time Period Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', margin: '12px 0 16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginRight: '4px' }}>
              Period:
            </span>
            {[
              ['today', 'Today'],
              ['yesterday', 'Yesterday'],
              ['this_week', 'This Week'],
              ['last_week', 'Last Week'],
              ['all', 'All']
            ].map(([p, label]) => (
              <button
                key={p}
                type="button"
                className={approvedPeriod === p ? 'primary' : 'secondary'}
                onClick={() => setApprovedPeriod(p)}
                style={{ fontSize: '0.8rem', padding: '5px 14px', borderRadius: '20px' }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="collector-queue-list">
            {approvedList.length ? (
              approvedList.map(report => {
                const p = report.patient || {};
                const resultsCount = (report.results || []).length;
                const completedResults = (report.results || []).filter(r => String(r.result || '').trim()).length;
                const testsStr = (report.laboratoryTests || []).map(t => typeof t === 'string' ? t : t?.name).filter(Boolean).join(', ');

                return (
                  <article className="collector-patient-card" key={report._id}>
                    <div className="collector-patient-summary">
                      <div className="collector-patient-avatar" style={{ background: '#10b981', color: '#fff' }}>
                        {p.name?.[0] || 'A'}
                      </div>
                      <div className="collector-patient-main">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3>{p.name || 'Unknown Patient'}</h3>
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: '#0284c7', color: '#fff' }}>
                            📍 {report.branchName || 'Main'}
                          </span>
                          <span className="transfer-status-badge status-approved" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                            ✅ {report.status}
                          </span>
                        </div>
                        <p>
                          <strong>ID:</strong> {p.patientId} · <strong>Report No:</strong> {report.reportNumber || '—'} {p.age ? `· ${p.age} YRS` : ''} {p.sex ? `· ${p.sex}` : ''} {p.phone ? `· ${p.phone}` : ''}
                        </p>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '4px' }}>
                          👨‍⚕️ <strong>Approved By:</strong> {report.approvedBy?.fullName || 'Approving Doctor / Pathologist'} · <strong>Date:</strong> {report.approvedDate ? new Date(report.approvedDate).toLocaleString() : (report.updatedDate ? new Date(report.updatedDate).toLocaleString() : '—')}
                        </p>
                        {testsStr && (
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '2px' }}>
                            🧪 <strong>Tests:</strong> {testsStr}
                          </p>
                        )}
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '2px' }}>
                          📊 Progress: {resultsCount ? `${completedResults} of ${resultsCount} results entered` : 'Complete'}
                        </p>
                      </div>
                      <aside style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => { setPreviewReport(report); setPreviewStampType(report.stampType || null); }}
                        >
                          👁️ View / Preview
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => printLabReport(report)}
                        >
                          🖨️ Print
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => handleOpenEditReport(report)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          style={{ color: '#ef4444', borderColor: '#ef4444' }}
                          onClick={() => setReportDeleteModal({ open: true, report, busy: false, error: '' })}
                        >
                          🗑️ Delete
                        </button>
                      </aside>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="empty">No approved laboratory reports found for the selected branch and period.</p>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* DEDICATED VIEW: PENDING APPROVAL (Dashboard integration & Admin workspace) */}
      {/* ========================================================================= */}
      {activeTab === 'pending' && (
        <section className="collector-queue">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p className="eyebrow">Awaiting Doctor / Pathologist Review</p>
              <h2>Reports Pending Approval</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="search"
                placeholder="Search patient name or ID..."
                value={pendingSearch}
                onChange={e => setPendingSearch(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--input-border, #2d3e5b)',
                  background: 'var(--input-bg, #0d1626)',
                  color: 'var(--input-color, #ffffff)',
                  minWidth: '250px',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </header>

          {/* Time Period Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', margin: '12px 0 16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginRight: '4px' }}>
              Period:
            </span>
            {[
              ['all', 'All'],
              ['today', "Today's"],
              ['lastWeek', 'Last Week'],
              ['lastMonth', 'Last Month']
            ].map(([p, label]) => (
              <button
                key={p}
                type="button"
                className={pendingPeriod === p ? 'primary' : 'secondary'}
                onClick={() => setPendingPeriod(p)}
                style={{ fontSize: '0.8rem', padding: '5px 14px', borderRadius: '20px' }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="collector-queue-list">
            {pendingList.length ? (
              pendingList.map(report => {
                const p = report.patient || {};
                const resultsCount = (report.results || []).length;
                const completedResults = (report.results || []).filter(r => String(r.result || '').trim()).length;
                const testsStr = (report.laboratoryTests || []).map(t => typeof t === 'string' ? t : t?.name).filter(Boolean).join(', ');

                return (
                  <article className="collector-patient-card" key={report._id}>
                    <div className="collector-patient-summary">
                      <div className="collector-patient-avatar" style={{ background: '#f59e0b', color: '#fff' }}>
                        {p.name?.[0] || 'P'}
                      </div>
                      <div className="collector-patient-main">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3>{p.name || 'Unknown Patient'}</h3>
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: '#0284c7', color: '#fff' }}>
                            📍 {report.branchName || 'Main'}
                          </span>
                          <span className="transfer-status-badge status-pending" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                            ⏳ Pending Approval
                          </span>
                        </div>
                        <p>
                          <strong>ID:</strong> {p.patientId} · <strong>Report No:</strong> {report.reportNumber || 'Draft'} {p.age ? `· ${p.age} YRS` : ''} {p.sex ? `· ${p.sex}` : ''} {p.phone ? `· ${p.phone}` : ''}
                        </p>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '4px' }}>
                          🔬 <strong>Technician:</strong> {report.technician?.fullName || '—'} · <strong>Submitted:</strong> {report.submittedDate ? new Date(report.submittedDate).toLocaleString() : (report.updatedDate ? new Date(report.updatedDate).toLocaleString() : '—')}
                        </p>
                        {testsStr && (
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '2px' }}>
                            🧪 <strong>Tests:</strong> {testsStr}
                          </p>
                        )}
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '2px' }}>
                          📊 Progress: {resultsCount ? `${completedResults} of ${resultsCount} results entered` : 'Ready for review'}
                        </p>
                      </div>
                      <aside style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => { setPreviewReport(report); setPreviewStampType(report.stampType || null); }}
                        >
                          👁️ View / Preview
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => printLabReport(report)}
                        >
                          🖨️ Print
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => handleOpenEditReport(report)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          style={{ color: '#ef4444', borderColor: '#ef4444' }}
                          onClick={() => setReportDeleteModal({ open: true, report, busy: false, error: '' })}
                        >
                          🗑️ Delete
                        </button>
                      </aside>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="empty">No laboratory reports currently awaiting approval for the selected branch and period.</p>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* DEDICATED VIEW: MONEY AND TRANSACTION                                     */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div style={{ marginTop: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div>
              <p className="eyebrow">Financial Operations & Revenue Control</p>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem' }}>💰 Receptionist Money Transactions</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                Manage individual payments collected by receptionists. Edit or delete specific transactions with automatic Daily Income recalculation.
              </p>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => setAddingTransaction(true)}
              style={{ fontWeight: 600, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              ➕ Record Transaction
            </button>
          </div>

          {/* Transactions Summary Highlights */}
          <div className="admin-rtm-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--card-bg, #111a2c)', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--card-border, #24344d)' }}>
              <small style={{ color: 'var(--text-secondary, #cbd5e1)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>Total Period Revenue</small>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', marginTop: 4 }}>
                {Number(txSummary.totalRevenue || 0).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>ETB</span>
              </div>
            </div>
            <div style={{ background: 'var(--card-bg, #111a2c)', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--card-border, #24344d)' }}>
              <small style={{ color: 'var(--text-secondary, #cbd5e1)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>Cash Payments</small>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22c55e', marginTop: 4 }}>
                {Number(txCashTotal).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>ETB</span>
              </div>
            </div>
            <div style={{ background: 'var(--card-bg, #111a2c)', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--card-border, #24344d)' }}>
              <small style={{ color: 'var(--text-secondary, #cbd5e1)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>Card / Mobile Payment</small>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
                {Number(txElectronicTotal).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>ETB</span>
              </div>
            </div>
            <div style={{ background: 'var(--card-bg, #111a2c)', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--card-border, #24344d)' }}>
              <small style={{ color: 'var(--text-secondary, #cbd5e1)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>Total Transactions</small>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-secondary, #cbd5e1)', marginTop: 4 }}>
                {filteredTransactions.length} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>records</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <input
              style={{
                flex: 1,
                minWidth: 240,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--input-border, #2d3e5b)',
                background: 'var(--input-bg, #0d1626)',
                color: 'var(--input-color, #ffffff)',
                fontSize: '0.85rem'
              }}
              value={txSearch}
              onChange={e => setTxSearch(e.target.value)}
              placeholder="🔍 Search patient, ID, receipt, phone, or receptionist..."
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                ['today', "Today's"],
                ['yesterday', 'Yesterday'],
                ['week', 'This Week'],
                ['month', 'This Month'],
                ['all', 'All Time']
              ].map(([preset, label]) => (
                <button
                  key={preset}
                  type="button"
                  className={txDatePreset === preset ? 'primary' : 'secondary'}
                  onClick={() => {
                    setTxDatePreset(preset);
                    setTxCustomDate('');
                  }}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    fontWeight: txDatePreset === preset ? 700 : 500
                  }}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="secondary"
                onClick={loadTransactions}
                title="Refresh Transactions"
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Transactions Table Card */}
          <section className="table-card" style={{ background: 'var(--card-bg, #111a2c)', border: '1px solid var(--card-border, #24344d)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Multiple Selection Action Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              background: 'var(--surface-container, #131e32)',
              borderBottom: '1px solid var(--card-border, #24344d)',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary, #ffffff)', userSelect: 'none' }}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={filteredTransactions.length > 0 && filteredTransactions.every(t => selectedTxIds.includes(String(t._id || t.paymentId)))}
                    onChange={toggleSelectAllTx}
                    aria-label="Select all transactions"
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0284c7' }}
                  />
                  <span>Select All</span>
                </label>
                {selectedTxIds.length > 0 && (
                  <span style={{
                    fontWeight: 700,
                    color: '#38bdf8',
                    background: 'rgba(2, 132, 199, 0.25)',
                    padding: '3px 12px',
                    borderRadius: 14,
                    fontSize: '0.82rem',
                    border: '1px solid rgba(2, 132, 199, 0.4)'
                  }}>
                    {selectedTxIds.length} Selected
                  </span>
                )}
              </div>

              <button
                type="button"
                className="secondary"
                disabled={selectedTxIds.length === 0 || isBulkDeleting}
                onClick={() => setShowBulkDeleteModal(true)}
                style={{
                  padding: '6px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  opacity: selectedTxIds.length === 0 ? 0.5 : 1,
                  cursor: selectedTxIds.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 6,
                  color: '#ef4444',
                  borderColor: '#ef4444'
                }}
              >
                🗑️ Delete Selected
              </button>
            </div>

            {txLoading ? (
              <p className="empty" style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary, #cbd5e1)' }}>Loading transactions...</p>
            ) : filteredTransactions.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 960, width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-container, #131e32)', borderBottom: '1px solid var(--card-border, #24344d)' }}>
                      <th style={{ width: 44, textAlign: 'center', padding: '10px 8px' }}>
                        <input
                          type="checkbox"
                          checked={filteredTransactions.length > 0 && filteredTransactions.every(t => selectedTxIds.includes(String(t._id || t.paymentId)))}
                          onChange={toggleSelectAllTx}
                          aria-label="Select all transactions"
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0284c7' }}
                        />
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>TX / Receipt</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Date &amp; Time</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Patient</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Tests / Service</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount (ETB)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Method</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Created By</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Branch</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map(t => {
                      const txKey = String(t._id || t.paymentId);
                      const isSelected = selectedTxIds.includes(txKey);
                      return (
                        <tr
                          key={txKey}
                          style={{
                            background: isSelected ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
                            borderBottom: '1px solid var(--card-border, #1e293b)'
                          }}
                        >
                          <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                            <input
                              type="checkbox"
                              value={txKey}
                              checked={isSelected}
                              onChange={() => toggleSelectTx(txKey)}
                              aria-label={`Select transaction ${t.transactionId || t.patientId}`}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0284c7' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{t.transactionId || t.patientId}</strong>
                            {t.barcode && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #cbd5e1)' }}>Barcode: {t.barcode}</div>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div>{t.paidAt ? new Date(t.paidAt).toLocaleDateString() : (t.registrationDate ? new Date(t.registrationDate).toLocaleDateString() : '—')}</div>
                            <small style={{ color: 'var(--text-secondary, #cbd5e1)' }}>
                              {t.paidAt ? new Date(t.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </small>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{t.patientName}</strong>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                              {t.patientId} · {t.sex} · {t.age} YRS
                            </div>
                            {t.phone && <small style={{ color: 'var(--text-secondary, #cbd5e1)' }}>📞 {t.phone}</small>}
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: 220 }}>
                            <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {t.tests || 'Laboratory Order'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <strong style={{ fontSize: '0.95rem', color: t.paymentStatus === 'Paid' ? '#22c55e' : 'var(--text-secondary, #cbd5e1)' }}>
                              {Number(t.amount !== undefined ? t.amount : t.grandTotal || 0).toLocaleString()} ETB
                            </strong>
                            {t.lastModifiedBy && (
                              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontStyle: 'italic' }}>
                                ✏️ Modified by Admin
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              fontSize: '0.78rem',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontWeight: 600,
                              background: t.paymentMethod === 'Cash' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                              color: t.paymentMethod === 'Cash' ? '#4ade80' : '#38bdf8',
                              border: `1px solid ${t.paymentMethod === 'Cash' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(2, 132, 199, 0.4)'}`
                            }}>
                              {t.paymentMethod || 'Cash'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong>{t.registeredBy || t.receptionist || 'Receptionist'}</strong>
                            <div style={{
                              fontSize: '0.72rem',
                              color: (t.creatorRole === 'Admin' || (t.registeredBy && /admin/i.test(t.registeredBy))) ? '#38bdf8' : 'var(--text-secondary, #cbd5e1)',
                              fontWeight: 600
                            }}>
                              {(t.creatorRole === 'Admin' || (t.registeredBy && /admin/i.test(t.registeredBy))) ? '🛡️ Admin' : '👤 Receptionist'}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: (t.branchName || 'Main') === 'Main' ? '#0284c7' : '#0d9488', color: '#fff' }}>
                              📍 {t.branchName || 'Main'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              fontSize: '0.78rem',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontWeight: 700,
                              background: t.paymentStatus === 'Paid' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: t.paymentStatus === 'Paid' ? '#4ade80' : '#f87171'
                            }}>
                              {t.paymentStatus || 'Paid'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="secondary"
                                style={{ color: '#38bdf8', borderColor: '#38bdf8', fontWeight: 600, padding: '4px 8px', fontSize: '0.8rem' }}
                                onClick={() => openEditTransaction(t)}
                                title="Edit Transaction Amount & Method"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                className="secondary"
                                style={{ color: '#ef4444', borderColor: '#ef4444', padding: '4px 8px', fontSize: '0.8rem' }}
                                onClick={() => setDeletingTransaction(t)}
                                title="Delete this transaction"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty" style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary, #cbd5e1)' }}>No money transactions found for this date range or filter.</p>
            )}
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REPORT WORKFLOW (Draft, Pending, Approved, Rejected)               */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <section className="collector-queue">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p className="eyebrow">Laboratory Report Lifecycle</p>
              <h2>Report Management & Status Center</h2>
            </div>
            <input
              type="search"
              placeholder="Search patient name or ID..."
              value={reportSearch}
              onChange={e => setReportSearch(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--input-border, #2d3e5b)',
                background: 'var(--input-bg, #0d1626)',
                color: 'var(--input-color, #ffffff)',
                minWidth: '250px',
                fontSize: '0.85rem'
              }}
            />
          </header>

          {/* Sub-Tabs: Draft, Pending Approval, Approved, Rejected */}
          <div style={{ display: 'flex', gap: '8px', margin: '12px 0 16px', flexWrap: 'wrap' }}>
            {[
              ['Draft', `Drafts (${reports.filter(r => r.status === 'Draft').length})`],
              ['Pending', `Pending Approval (${reports.filter(r => ['Submitted', 'Pending'].includes(r.status)).length})`],
              ['Approved', `Approved (${reports.filter(r => ['Approved', 'Ready for Printing'].includes(r.status)).length})`],
              ['Rejected', `Rejected (${reports.filter(r => r.status === 'Rejected').length})`]
            ].map(([st, label]) => (
              <button
                key={st}
                type="button"
                className={reportWorkflowTab === st ? 'primary' : 'secondary'}
                onClick={() => setReportWorkflowTab(st)}
                style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '20px' }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="collector-queue-list">
            {filteredReports.length ? (
              filteredReports.map(report => {
                const p = report.patient || {};
                const resultsCount = (report.results || []).length;
                const completedResults = (report.results || []).filter(r => String(r.result || '').trim()).length;

                return (
                  <article className="collector-patient-card" key={report._id}>
                    <div className="collector-patient-summary">
                      <div className="collector-patient-avatar" style={{ background: '#0284c7', color: '#fff' }}>
                        {p.name?.[0] || 'R'}
                      </div>
                      <div className="collector-patient-main">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3>{p.name || 'Unknown Patient'}</h3>
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: '#0284c7', color: '#fff' }}>
                            📍 {report.branchName || 'Main'}
                          </span>
                          <span className={`transfer-status-badge status-${(report.status || 'draft').toLowerCase()}`}>
                            {report.status}
                          </span>
                        </div>
                        <p>
                          <strong>ID:</strong> {p.patientId} · <strong>Report No:</strong> {report.reportNumber || 'Draft'} · <strong>Technician:</strong> {report.technician?.fullName || '—'}
                        </p>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '4px' }}>
                          📊 Progress: {resultsCount ? `${completedResults} of ${resultsCount} results entered` : 'No results entered'}
                        </p>
                      </div>
                      <aside style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => { setPreviewReport(report); setPreviewStampType(report.stampType || null); }}
                        >
                          👁️ View / Preview
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => printLabReport(report)}
                        >
                          🖨️ Print
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => handleOpenEditReport(report)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          style={{ color: '#ef4444', borderColor: '#ef4444' }}
                          onClick={() => setReportDeleteModal({ open: true, report, busy: false, error: '' })}
                        >
                          🗑️ Delete
                        </button>
                      </aside>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="empty">No laboratory reports found under {reportWorkflowTab}.</p>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CLEARED INFORMATION                                                */}
      {/* ========================================================================= */}
      {activeTab === 'cleared' && (
        <section className="collector-queue">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p className="eyebrow">Archived Transfer Operations</p>
              <h2>Cleared Information & Restorable Records</h2>
            </div>
            <input
              type="search"
              placeholder="Search patient name or ID..."
              value={clearedSearch}
              onChange={e => setClearedSearch(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--input-border, #2d3e5b)',
                background: 'var(--input-bg, #0d1626)',
                color: 'var(--input-color, #ffffff)',
                minWidth: '250px',
                fontSize: '0.85rem'
              }}
            />
          </header>

          <div className="collector-queue-list" style={{ marginTop: '16px' }}>
            {clearedTransfers.length ? (
              clearedTransfers
                .filter(t => {
                  if (!clearedSearch.trim()) return true;
                  const s = clearedSearch.trim().toLowerCase();
                  const p = t.patient || {};
                  return (
                    (p.name && p.name.toLowerCase().includes(s)) ||
                    (p.patientId && p.patientId.toLowerCase().includes(s)) ||
                    (t.testName && t.testName.toLowerCase().includes(s))
                  );
                })
                .map(t => (
                  <article className="collector-patient-card" key={t._id}>
                    <div className="collector-patient-summary">
                      <div className="collector-patient-avatar" style={{ background: '#64748b', color: '#fff' }}>
                        {t.patient?.name?.[0] || 'C'}
                      </div>
                      <div className="collector-patient-main">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3>{t.patient?.name}</h3>
                          <span className="transfer-badge" style={{ background: '#475569', color: '#fff', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px' }}>
                            CLEARED
                          </span>
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: '#0284c7', color: '#fff' }}>
                            {t.sourceBranch} ➔ {t.destinationBranch}
                          </span>
                        </div>
                        <p>
                          <strong>Patient ID:</strong> {t.patient?.patientId} · <strong>Test:</strong> {t.testName} · <strong>Cleared:</strong> {new Date(t.clearedAt).toLocaleDateString()} by {t.clearedBy?.fullName || 'Staff'}
                        </p>
                        {t.clearedReason && (
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '4px' }}>
                            Reason: "{t.clearedReason}"
                          </p>
                        )}
                      </div>
                      <aside>
                        <button
                          type="button"
                          className="primary"
                          disabled={isRestoringTransfer}
                          onClick={() => handleRestoreTransfer(t._id)}
                          title="Restore transfer back to active Received list"
                        >
                          ↩️ Add Back to Received
                        </button>
                      </aside>
                    </div>
                  </article>
                ))
            ) : (
              <p className="empty">No cleared transfer records found.</p>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: UNFINISHED COLLECTIONS                                             */}
      {/* ========================================================================= */}
      {activeTab === 'unfinished' && (
        <section className="collector-queue">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p className="eyebrow">Active in-progress collections</p>
              <h2>Unfinished Collections In Progress</h2>
            </div>
          </header>
          <div className="collector-queue-list" style={{ marginTop: '16px' }}>
            {unfinishedList.length ? (
              unfinishedList.map(row => (
                <article className="collector-patient-card" key={row.patient._id}>
                  <div className="collector-patient-summary">
                    <div className="collector-patient-avatar" style={{ background: '#e69c00', color: '#fff' }}>
                      {row.patient.name?.[0] || 'U'}
                    </div>
                    <div className="collector-patient-main">
                      <h3>
                        {row.patient.name}
                        <span style={{ marginLeft: '8px', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: '#e69c00', color: '#fff' }}>
                          ⚡ In Progress
                        </span>
                      </h3>
                      <p>
                        {row.patient.patientId} · {row.patient.age} YRS · {row.patient.sex} · {row.patient.phone}
                      </p>
                    </div>
                    <aside>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          setActiveCollectionPatient(row.patient);
                          // Auto-fill draft if available
                          api(`/collection/patients/${row.patient._id}/report`, { token })
                            .then(res => setCurrentReport(res?.report || emptyReport))
                            .catch(() => setCurrentReport(emptyReport));
                        }}
                      >
                        ⚡ Continue Work
                      </button>
                    </aside>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty">No unfinished collections currently in progress.</p>
            )}
          </div>
        </section>
      )}
        </>
      )}

      {/* ========================================================================= */}
      {/* ── RECEPTION DEPARTMENT VIEW ───────────────────────────────────────────── */}
      {/* ========================================================================= */}
      {activeDepartment === 'reception' && (
        <div className="admin-dept-view admin-reception-view" style={{ marginBottom: '2rem' }}>
          {/* Reception Sub-Tabs Bar */}
          <div className="reception-tabs" style={{ marginBottom: '1.25rem' }}>
            {[
              ['pos', '🛒 Register [POS] & Thermal Receipt'],
              ['waiting', `💳 Waiting for Payment (${receptionWaitingList.length})`]
            ].map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                className={receptionSubTab === tabKey ? 'active' : ''}
                onClick={() => setReceptionSubTab(tabKey)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Reception Metrics Overview */}
          <div className="collector-metrics-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="collector-metric-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="collector-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>💵</div>
              <div className="collector-metric-info">
                <h3>Today Revenue</h3>
                <p className="collector-metric-num" style={{ color: '#10b981' }}>
                  {formatETB(receptionDash?.todayIncome || 0)}
                </p>
                <small style={{ color: '#94a3b8' }}>Net: {formatETB(receptionDash?.netDailyIncome || 0)}</small>
              </div>
            </div>

            <div className="collector-metric-card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div className="collector-metric-icon" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7' }}>👥</div>
              <div className="collector-metric-info">
                <h3>Registered Today</h3>
                <p className="collector-metric-num">{receptionDash?.todayPatients || 0}</p>
                <small style={{ color: '#94a3b8' }}>All registrations</small>
              </div>
            </div>

            <div className="collector-metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="collector-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>⏳</div>
              <div className="collector-metric-info">
                <h3>Waiting for Payment</h3>
                <p className="collector-metric-num" style={{ color: '#f59e0b' }}>{receptionWaitingList.length}</p>
                <small style={{ color: '#94a3b8' }}>Awaiting collection</small>
              </div>
            </div>

            <div className="collector-metric-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div className="collector-metric-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>📋</div>
              <div className="collector-metric-info">
                <h3>Ready Reports</h3>
                <p className="collector-metric-num">{receptionDash?.readyReports || 0}</p>
                <small style={{ color: '#94a3b8' }}>Ready for print/pickup</small>
              </div>
            </div>
          </div>

          {/* Sub-tab 1: Register [POS] */}
          {/* Sub-tab 1: Register [POS] — 3-Step Wizard Registration Workflow */}
          {receptionSubTab === 'pos' && (
            <div className="admin-reception-pos-container">
              {/* Wizard Step Progress Tracker */}
              <div className="admin-pos-stepper-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { step: 1, label: '1. Patient Intake', icon: '🧑‍⚕️', badge: posPatientName ? '✓' : '' },
                    { step: 2, label: '2. Select Tests & Pricing', icon: '🧪', badge: posSelectedTestIds.length > 0 ? `${posSelectedTestIds.length}` : '' },
                    { step: 3, label: '3. Payment & Receipt', icon: '💳', badge: posBillTotal > 0 ? `${formatETB(posBillTotal)}` : '' }
                  ].map(s => {
                    const isActive = posWizardStep === s.step;
                    const isCompleted = posWizardStep > s.step;
                    return (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => {
                          if (s.step === 2 && !posPatientName) {
                            handleProceedToTestSelection();
                          } else if (s.step === 3 && posSelectedTestIds.length === 0 && posServiceDiscountType !== 'Counseling Only') {
                            handleProceedToPayment();
                          } else {
                            setPosWizardStep(s.step);
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: isActive ? 700 : 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          background: isActive ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : (isCompleted ? 'rgba(34, 197, 94, 0.18)' : 'rgba(30, 41, 59, 0.6)'),
                          color: isActive ? '#ffffff' : (isCompleted ? '#4ade80' : '#94a3b8'),
                          border: isActive ? '1px solid #38bdf8' : (isCompleted ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(148, 163, 184, 0.2)')
                        }}
                      >
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                        {s.badge && (
                          <span style={{
                            background: isActive ? 'rgba(255, 255, 255, 0.25)' : (isCompleted ? '#22c55e' : '#38bdf8'),
                            color: '#ffffff',
                            borderRadius: '10px',
                            padding: '1px 6px',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}>
                            {s.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Mode:</span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: 'rgba(2, 132, 199, 0.2)',
                    color: '#38bdf8',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(56, 189, 248, 0.3)'
                  }}>
                    🛡️ Admin Receptionist Mode
                  </span>
                </div>
              </div>

              {/* STEP 1: PATIENT INTAKE & REGISTRATION — Centered Comfortable Window */}
              {posWizardStep === 1 && (
                <div className="admin-pos-intake-wrapper">
                  <div className="admin-pos-card">
                    <header className="admin-pos-card-header">
                      <p className="eyebrow">Step 1 — Patient Registration</p>
                      <h2>Patient Demographic Intake &amp; Referral Details</h2>
                      <p>
                        Registered by {user?.fullName || 'Admin'} (Admin Account). Patient will be directed downstream to Sample Collection.
                      </p>
                    </header>

                    <form onSubmit={posRegistrationType === 'Self Aware' ? handlePosRegister : handleProceedToTestSelection} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="admin-pos-form-row-2col-asym">
                        <div className="admin-pos-field">
                          <label>
                            Patient Full Name <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. ABEBE BIKILA"
                            value={posPatientName}
                            onChange={e => setPosPatientName(e.target.value)}
                            style={{ textTransform: 'uppercase', fontWeight: 600 }}
                          />
                        </div>

                        <div className="admin-pos-field">
                          <label>Registration Type</label>
                          <select
                            value={posRegistrationType}
                            onChange={e => setPosRegistrationType(e.target.value)}
                          >
                            <option value="Self">Self / Walk-in</option>
                            <option value="Referral">Referral Hospital</option>
                            <option value="Self Aware">Self Aware (Queue first, pay later)</option>
                          </select>
                        </div>
                      </div>

                      <div className="admin-pos-form-row-2col">
                        <div className="admin-pos-field">
                          <label>
                            Age (Years) <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="125"
                            required
                            placeholder="e.g. 35"
                            value={posAge}
                            onChange={e => setPosAge(e.target.value)}
                          />
                        </div>
                        <div className="admin-pos-field">
                          <label>
                            Sex <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <select
                            value={posSex}
                            onChange={e => setPosSex(e.target.value)}
                            required
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                      </div>

                      <div className="admin-pos-form-row-2col">
                        <div className="admin-pos-field">
                          <label>
                            Phone Number <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="09..."
                            value={posPhone}
                            onChange={e => setPosPhone(e.target.value)}
                          />
                        </div>
                        <div className="admin-pos-field">
                          <label>Address / City</label>
                          <input
                            type="text"
                            placeholder="e.g. Hawassa, Piassa"
                            value={posAddress}
                            onChange={e => setPosAddress(e.target.value)}
                          />
                        </div>
                      </div>

                      {posRegistrationType === 'Referral' && (
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.5)',
                          padding: '14px',
                          borderRadius: '10px',
                          border: '1px solid rgba(148, 163, 184, 0.2)'
                        }}>
                          <div className={posReferralHospital === 'Other' ? 'admin-pos-form-row-2col' : ''}>
                            <div className="admin-pos-field">
                              <label>
                                Referral Hospital <span style={{ color: '#ef4444' }}>*</span>
                              </label>
                              <select
                                value={posReferralHospital}
                                onChange={e => setPosReferralHospital(e.target.value)}
                                required
                              >
                                <option value="">-- Select Referral Hospital --</option>
                                {hospitals.map(h => (
                                  <option key={h._id || h.name} value={h.name}>{h.name}</option>
                                ))}
                                <option value="Other">Other (Specify below)</option>
                              </select>
                            </div>
                            {posReferralHospital === 'Other' && (
                              <div className="admin-pos-field">
                                <label>
                                  Hospital Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Type hospital name"
                                  value={posOtherHospital}
                                  onChange={e => setPosOtherHospital(e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Vital Signs (BP) */}
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.4)',
                        border: '1px solid rgba(148, 163, 184, 0.15)',
                        borderRadius: '10px',
                        padding: '14px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                          <span>🫀</span>
                          <strong style={{ fontSize: '0.86rem', color: '#38bdf8' }}>Vital Signs (Blood Pressure)</strong>
                          <small style={{ color: '#94a3b8' }}>— Optional</small>
                        </div>
                        <div className="admin-pos-form-row-2col" style={{ marginBottom: 0 }}>
                          <div className="admin-pos-field">
                            <label style={{ fontSize: '0.78rem' }}>Systolic BP (mmHg)</label>
                            <input
                              type="number"
                              min="50"
                              max="300"
                              placeholder="e.g. 120"
                              value={posBpSystolic}
                              onChange={e => setPosBpSystolic(e.target.value)}
                            />
                          </div>
                          <div className="admin-pos-field">
                            <label style={{ fontSize: '0.78rem' }}>Diastolic BP (mmHg)</label>
                            <input
                              type="number"
                              min="30"
                              max="200"
                              placeholder="e.g. 80"
                              value={posBpDiastolic}
                              onChange={e => setPosBpDiastolic(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Step 1 Actions */}
                      <div className="admin-pos-actions">
                        {posRegistrationType === 'Self Aware' ? (
                          <button
                            type="submit"
                            disabled={posRegistering}
                            className="primary"
                            style={{
                              padding: '11px 22px',
                              fontWeight: 700,
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            }}
                          >
                            {posRegistering ? 'Registering…' : 'Queue Self-Aware Patient (Sample Collection) →'}
                          </button>
                        ) : (
                          <button
                            type="submit"
                            className="primary"
                            style={{
                              padding: '11px 24px',
                              fontWeight: 700,
                              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                            }}
                          >
                            Select Tests &amp; Pricing (Step 2) →
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* STEPS 2 & 3: GRID (STEP CONTENT ON LEFT + LIVE BILL SUMMARY ON RIGHT) */}
              {(posWizardStep === 2 || posWizardStep === 3) && (
                <div className="admin-pos-step23-grid">
                  {/* ── LEFT COLUMN: STEP CONTENT ── */}
                  <div>
                    {/* STEP 2: LABORATORY TEST TYPE SELECTION */}
                    {posWizardStep === 2 && (
                      <div className="admin-pos-card">
                      <div className="lab-step2-header" style={{ marginBottom: '14px' }}>
                        <div className="lab-step2-title-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="lab-step2-title-icon" style={{ fontSize: '1.6rem' }}>🧬</div>
                          <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Laboratory Test Selection</h2>
                            <p className="lab-step2-subtitle" style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                              Select requested tests. Specimens and barcodes are assigned automatically upon registration.
                            </p>
                          </div>
                        </div>
                        {posSelectedTestIds.length > 0 && (
                          <div className="lab-step2-selection-pill" style={{ marginTop: '8px' }}>
                            <span className="lab-step2-pill-count" style={{ fontWeight: 800, color: '#38bdf8' }}>{posSelectedTestIds.length}</span>
                            <span style={{ fontSize: '0.82rem', color: '#cbd5e1', marginLeft: '6px' }}>test{posSelectedTestIds.length !== 1 ? 's' : ''} selected</span>
                          </div>
                        )}
                      </div>

                      {/* Global Search & Filter Toolbar */}
                      <div className="lab-v2-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        <div className="lab-v2-search-box" style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '8px', padding: '0 12px' }}>
                          <span className="lab-v2-search-icon" style={{ marginRight: '8px' }}>🔍</span>
                          <input
                            value={posSearch}
                            onChange={e => setPosSearch(e.target.value)}
                            placeholder="Search tests across all categories..."
                            aria-label="Search laboratory tests"
                            style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', padding: '9px 0', fontSize: '0.88rem' }}
                          />
                          {posSearch && (
                            <button
                              type="button"
                              className="lab-v2-search-clear"
                              onClick={() => setPosSearch('')}
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="lab-v2-filter-chips" role="toolbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                          {['All', 'Popular', 'Recently Added', 'Referral', 'Active', 'Selected'].map(item => (
                            <button
                              key={item}
                              type="button"
                              className={`lab-v2-chip ${posTestFilter === item ? 'active' : ''}`}
                              onClick={() => setPosTestFilter(item)}
                              style={{
                                fontSize: '0.74rem',
                                padding: '5px 12px',
                                borderRadius: '16px',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                background: posTestFilter === item ? '#0284c7' : 'rgba(30, 41, 59, 0.6)',
                                color: posTestFilter === item ? '#fff' : '#cbd5e1',
                                border: posTestFilter === item ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.15)'
                              }}
                            >
                              {item === 'Selected' && posSelectedTestIds.length > 0 && (
                                <span className="lab-v2-chip-badge" style={{ marginRight: '5px', background: '#38bdf8', color: '#0f172a', padding: '1px 5px', borderRadius: '10px', fontWeight: 800, fontSize: '0.7rem' }}>
                                  {posSelectedTestIds.length}
                                </span>
                              )}
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Category Cards Grid */}
                      <div className="lab-v2-categories" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {posVisibleCategories.map((category, catIdx) => {
                          const expanded = posExpandedCategories.includes(category._id);
                          const selectedCount = (category.tests || []).filter(t => posSelectedTestIds.includes(t._id)).length;
                          const theme = getCatTheme(category.name);
                          const catSearchVal = posCategorySearch[category._id] || '';
                          const totalTests = (category.tests || []).length;

                          const filteredTests = catSearchVal
                            ? (category.tests || []).filter(t => `${t.name} ${t.description || ''}`.toLowerCase().includes(catSearchVal.toLowerCase()))
                            : (category.tests || []);

                          return (
                            <section
                              key={category._id}
                              className={`lab-v2-cat-card ${expanded ? 'expanded' : ''}`}
                              style={{
                                background: 'rgba(15, 23, 42, 0.5)',
                                border: '1px solid rgba(148, 163, 184, 0.15)',
                                borderRadius: '12px',
                                overflow: 'hidden'
                              }}
                            >
                              {/* Category Header */}
                              <button
                                type="button"
                                className="lab-v2-cat-header"
                                aria-expanded={expanded}
                                onClick={() => setPosExpandedCategories(current => expanded ? current.filter(id => id !== category._id) : [...current, category._id])}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 14px',
                                  background: 'none',
                                  border: 'none',
                                  color: 'inherit',
                                  cursor: 'pointer',
                                  textAlign: 'left'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div className="lab-v2-cat-icon-wrap" style={{
                                    background: theme.gradient,
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1rem'
                                  }}>
                                    <span>{theme.icon}</span>
                                  </div>
                                  <div>
                                    <strong style={{ fontSize: '0.92rem', color: '#f8fafc', display: 'block' }}>{category.name}</strong>
                                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                                      {totalTests} test{totalTests !== 1 ? 's' : ''} available
                                    </span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {selectedCount > 0 && (
                                    <span style={{
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      background: 'rgba(56, 189, 248, 0.2)',
                                      color: '#38bdf8',
                                      border: '1px solid rgba(56, 189, 248, 0.3)'
                                    }}>
                                      ✓ {selectedCount}
                                    </span>
                                  )}
                                  <span style={{ fontSize: '0.9rem', color: '#94a3b8', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                                    ▼
                                  </span>
                                </div>
                              </button>

                              {/* Expanded Category Body */}
                              {expanded && (
                                <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '6px', padding: '0 8px', border: '1px solid rgba(148, 163, 184, 0.15)', minWidth: '220px' }}>
                                      <span style={{ fontSize: '0.75rem', marginRight: '6px' }}>🔍</span>
                                      <input
                                        value={catSearchVal}
                                        onChange={e => setPosCategorySearch(prev => ({ ...prev, [category._id]: e.target.value }))}
                                        placeholder={`Search in ${category.name}...`}
                                        style={{ border: 'none', background: 'transparent', color: '#fff', fontSize: '0.8rem', padding: '5px 0' }}
                                      />
                                      {catSearchVal && (
                                        <button
                                          type="button"
                                          onClick={() => setPosCategorySearch(prev => ({ ...prev, [category._id]: '' }))}
                                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>

                                    {selectedCount > 0 && (
                                      <span style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: 600 }}>
                                        {selectedCount} selected · {formatETB(calcCategoryTotal(category.tests || []))}
                                      </span>
                                    )}
                                  </div>

                                  {/* Test Items Render */}
                                  {(() => {
                                    const isElecCat = /^SERUM ELECTROLYTE$/i.test(category.name) || /^ELECTROLYTE/i.test(category.name);
                                    const elecTests = (category.tests || []).filter(isSerumElectrolyteTest);
                                    const allElecSelected = elecTests.length > 0 && elecTests.every(t => posSelectedTestIds.includes(t._id));
                                    const hasSubcats = filteredTests.some(t => t.subcategory);

                                    if (!hasSubcats) {
                                      return (
                                        <>
                                          {isElecCat && (
                                            <div
                                              onClick={() => handleToggleCbcGroup(elecTests)}
                                              style={{
                                                margin: '6px 0 12px',
                                                padding: '10px 14px',
                                                border: allElecSelected ? '2px solid #ea580c' : '2px dashed rgba(234, 88, 12, 0.5)',
                                                background: allElecSelected ? 'rgba(234, 88, 12, 0.2)' : 'rgba(234, 88, 12, 0.08)',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                  type="checkbox"
                                                  checked={allElecSelected}
                                                  onChange={() => handleToggleCbcGroup(elecTests)}
                                                  style={{ margin: 0, cursor: 'pointer' }}
                                                />
                                                <div>
                                                  <strong style={{ fontSize: '0.92rem', color: '#fb923c' }}>
                                                    ⚡ Serum Electrolyte — Complete Bundle
                                                  </strong>
                                                  <small style={{ color: '#cbd5e1', display: 'block', fontSize: '0.74rem' }}>
                                                    Single fixed price · Automatically includes all {elecTests.length} electrolyte parameters
                                                  </small>
                                                </div>
                                              </div>
                                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fb923c' }}>
                                                {formatETB(testSettings.serumElectrolytePrice ?? 1000)}
                                              </div>
                                            </div>
                                          )}

                                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                                            {filteredTests.map(test => {
                                              const isSelected = posSelectedTestIds.includes(test._id);
                                              const isHcg = isHcgTest(test);
                                              const isElec = isSerumElectrolyteTest(test);
                                              const isBundleParent = test.isBundle || test.name === 'Urine Microscopy' || test.name === 'Chemical Analysis' || test.name === 'CBC' || (isElec && /^Serum Electrolyte/i.test(test.name));
                                              const isIncludedChild = (test.includedInBundle || test.billableIndividually === false || isUrineMicroTest(test) || (isUrineChemTest(test) && !isHcg) || isCbcTest(test) || isElec) && !isBundleParent;

                                              return (
                                                <div
                                                  key={test._id}
                                                  onClick={() => handleTogglePosTest(test._id)}
                                                  style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 10px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.82rem',
                                                    transition: 'all 0.15s ease',
                                                    background: isSelected ? 'rgba(2, 132, 199, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                                                    border: isSelected ? '1px solid #0284c7' : '1px solid rgba(148, 163, 184, 0.12)'
                                                  }}
                                                >
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                    <input
                                                      type="checkbox"
                                                      checked={isSelected}
                                                      onChange={() => {}}
                                                      style={{ margin: 0, cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontWeight: isSelected ? 700 : 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                      {test.name}
                                                    </span>
                                                  </div>
                                                  <span style={{ fontWeight: 700, color: isSelected ? '#38bdf8' : '#94a3b8', fontSize: '0.78rem', marginLeft: '6px' }}>
                                                    {isIncludedChild ? (
                                                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Bundle Child</span>
                                                    ) : (
                                                      formatETB(test.price || (isHcg ? 200 : 0))
                                                    )}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </>
                                      );
                                    }

                                    // Subcategory grouping (CBC, Urinalysis, etc.)
                                    const subMap = new Map();
                                    filteredTests.forEach(test => {
                                      const sc = test.subcategory || 'GENERAL';
                                      if (!subMap.has(sc)) subMap.set(sc, []);
                                      subMap.get(sc).push(test);
                                    });

                                    return Array.from(subMap.entries()).map(([subName, subTests]) => {
                                      const isCbcSub = /^CBC$/i.test(subName) && /^HEMATOLOGY$/i.test(category.name);
                                      const isChemSub = (/^Chemical Analysis$/i.test(subName) || /^Chemical$/i.test(subName)) && (/^URINALYSIS$/i.test(category.name) || /^URINE/i.test(category.name));
                                      const isMicroSub = (/^Urine Microscopy$/i.test(subName) || /^Microscopy$/i.test(subName)) && (/^URINALYSIS$/i.test(category.name) || /^URINE/i.test(category.name));
                                      const bundleTests = isChemSub ? subTests.filter(t => !isHcgTest(t)) : subTests;
                                      const bundleTestIds = bundleTests.map(t => t._id);
                                      const allBundleSelected = bundleTestIds.length > 0 && bundleTestIds.every(id => posSelectedTestIds.includes(id));
                                      const subSelected = subTests.filter(t => posSelectedTestIds.includes(t._id)).length;

                                      return (
                                        <div key={subName} style={{ marginBottom: '12px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '8px 0 6px' }}>
                                            <span style={{ width: '4px', height: '14px', background: theme.accent, borderRadius: '2px' }}></span>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>{subName}</span>
                                            <small style={{ color: '#94a3b8', fontSize: '0.72rem' }}>({subTests.length} tests)</small>
                                            {subSelected > 0 && (
                                              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600, marginLeft: 'auto' }}>
                                                {subSelected} selected
                                              </span>
                                            )}
                                          </div>

                                          {/* CBC Bundle Card */}
                                          {isCbcSub && (
                                            <div
                                              onClick={() => handleToggleCbcGroup(bundleTests)}
                                              style={{
                                                margin: '6px 0 10px',
                                                padding: '10px 14px',
                                                border: allBundleSelected ? '2px solid #0284c7' : '2px dashed rgba(2, 132, 199, 0.5)',
                                                background: allBundleSelected ? 'rgba(2, 132, 199, 0.2)' : 'rgba(2, 132, 199, 0.08)',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                  type="checkbox"
                                                  checked={allBundleSelected}
                                                  onChange={() => handleToggleCbcGroup(bundleTests)}
                                                  style={{ margin: 0, cursor: 'pointer' }}
                                                />
                                                <div>
                                                  <strong style={{ fontSize: '0.92rem', color: '#38bdf8' }}>
                                                    🩸 CBC — Complete Blood Count (Complete Group)
                                                  </strong>
                                                  <small style={{ color: '#cbd5e1', display: 'block', fontSize: '0.74rem' }}>
                                                    Fixed bundle price · Includes all {bundleTests.length} CBC sub-parameters
                                                  </small>
                                                </div>
                                              </div>
                                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>
                                                {formatETB(testSettings.cbcGroupPrice ?? 150)}
                                              </div>
                                            </div>
                                          )}

                                          {/* Chemical Analysis Bundle Card */}
                                          {isChemSub && (
                                            <div
                                              onClick={() => handleToggleCbcGroup(bundleTests)}
                                              style={{
                                                margin: '6px 0 10px',
                                                padding: '10px 14px',
                                                border: allBundleSelected ? '2px solid #0d9488' : '2px dashed rgba(13, 148, 136, 0.5)',
                                                background: allBundleSelected ? 'rgba(13, 148, 136, 0.2)' : 'rgba(13, 148, 136, 0.08)',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                  type="checkbox"
                                                  checked={allBundleSelected}
                                                  onChange={() => handleToggleCbcGroup(bundleTests)}
                                                  style={{ margin: 0, cursor: 'pointer' }}
                                                />
                                                <div>
                                                  <strong style={{ fontSize: '0.92rem', color: '#2dd4bf' }}>
                                                    🧪 Chemical Analysis (Complete Group)
                                                  </strong>
                                                  <small style={{ color: '#cbd5e1', display: 'block', fontSize: '0.74rem' }}>
                                                    Fixed bundle price · Includes all {bundleTests.length} Chemical Analysis sub-parameters
                                                  </small>
                                                </div>
                                              </div>
                                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2dd4bf' }}>
                                                {formatETB(Number(testSettings.urineChemicalPrice ?? 300))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Urine Microscopy Bundle Card */}
                                          {isMicroSub && (
                                            <div
                                              onClick={() => handleToggleCbcGroup(bundleTests)}
                                              style={{
                                                margin: '6px 0 10px',
                                                padding: '10px 14px',
                                                border: allBundleSelected ? '2px solid #0d9488' : '2px dashed rgba(13, 148, 136, 0.5)',
                                                background: allBundleSelected ? 'rgba(13, 148, 136, 0.2)' : 'rgba(13, 148, 136, 0.08)',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                  type="checkbox"
                                                  checked={allBundleSelected}
                                                  onChange={() => handleToggleCbcGroup(bundleTests)}
                                                  style={{ margin: 0, cursor: 'pointer' }}
                                                />
                                                <div>
                                                  <strong style={{ fontSize: '0.92rem', color: '#2dd4bf' }}>
                                                    🔬 Urine Microscopy (Complete Group)
                                                  </strong>
                                                  <small style={{ color: '#cbd5e1', display: 'block', fontSize: '0.74rem' }}>
                                                    Fixed bundle price · Includes all {bundleTests.length} Microscopy sub-parameters
                                                  </small>
                                                </div>
                                              </div>
                                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2dd4bf' }}>
                                                {formatETB(Number(testSettings.urineMicroscopyPrice ?? 300))}
                                              </div>
                                            </div>
                                          )}

                                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '8px' }}>
                                            {subTests.map(test => {
                                              const isSelected = posSelectedTestIds.includes(test._id);
                                              const isHcg = isHcgTest(test);
                                              const isBundleParent = test.isBundle || test.name === 'Urine Microscopy' || test.name === 'Chemical Analysis' || test.name === 'CBC';
                                              const isIncludedChild = (isCbcSub || isChemSub || isMicroSub || test.includedInBundle || test.billableIndividually === false) && !isBundleParent && !isHcg;

                                              return (
                                                <div
                                                  key={test._id}
                                                  onClick={() => handleTogglePosTest(test._id)}
                                                  style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 10px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.82rem',
                                                    transition: 'all 0.15s ease',
                                                    background: isSelected ? 'rgba(2, 132, 199, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                                                    border: isSelected ? '1px solid #0284c7' : '1px solid rgba(148, 163, 184, 0.12)'
                                                  }}
                                                >
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                    <input
                                                      type="checkbox"
                                                      checked={isSelected}
                                                      onChange={() => {}}
                                                      style={{ margin: 0, cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontWeight: isSelected ? 700 : 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                      {test.name}
                                                    </span>
                                                  </div>
                                                  <span style={{ fontWeight: 700, color: isSelected ? '#38bdf8' : '#94a3b8', fontSize: '0.78rem', marginLeft: '6px' }}>
                                                    {isIncludedChild ? (
                                                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Bundle Child</span>
                                                    ) : (
                                                      formatETB(test.price || (isHcg ? 200 : 0))
                                                    )}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              )}
                            </section>
                          );
                        })}
                      </div>

                      {/* Navigation buttons */}
                      <div className="admin-pos-actions-space">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setPosWizardStep(1)}
                          style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                        >
                          ← Back to Patient Intake
                        </button>
                        <button
                          type="button"
                          className="primary"
                          onClick={handleProceedToPayment}
                          style={{
                            padding: '8px 20px',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                          }}
                        >
                          Proceed to Payment ({posSelectedTestIds.length} Selected) →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: PAYMENT */}
                  {posWizardStep === 3 && (
                    <div className="admin-pos-card">
                      <header className="admin-pos-card-header">
                        <p className="eyebrow" style={{ margin: 0 }}>Step 3 — Payment &amp; Confirmation</p>
                        <h2 style={{ fontSize: '1.25rem', margin: '4px 0 0' }}>Collect Payment &amp; Generate Thermal Receipt</h2>
                      </header>

                      {/* Patient Recap Banner */}
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        marginBottom: '1rem',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{posPatientName}</strong>
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '8px' }}>
                            ({posAge} YRS / {posSex} · 📞 {posPhone})
                          </span>
                        </div>
                        <div>
                          {(posBpSystolic || posBpDiastolic) && (
                            <span style={{
                              background: 'rgba(2, 132, 199, 0.2)',
                              color: '#38bdf8',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              border: '1px solid rgba(56, 189, 248, 0.3)'
                            }}>
                              🫀 BP: {posBpSystolic || '—'}/{posBpDiastolic || '—'} mmHg
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Discount & Service Options */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                            Service &amp; Discount Category
                          </label>
                          <select
                            value={posServiceDiscountType}
                            onChange={e => {
                              const next = e.target.value;
                              setPosServiceDiscountType(next);
                              setPosAmountReceived('');
                            }}
                            style={{ width: '100%' }}
                          >
                            <option value="Regular Patient">Regular Patient (Standard)</option>
                            <option value="Staff Member">Staff Member ({testSettings.staffDiscount || 20}% Discount)</option>
                            <option value="Collaborator">Collaborator ({testSettings.collaboratorDiscount || 20}% Discount)</option>
                            <option value="Counseling Only">Counseling Only</option>
                          </select>
                          <small style={{ color: '#94a3b8', display: 'block', marginTop: '3px', fontSize: '0.74rem' }}>
                            {posServiceDiscountType === 'Counseling Only'
                              ? `Counseling fee: ${formatETB(posBillTotal)}`
                              : posDiscountPercent > 0
                              ? `${posDiscountPercent}% discount applied: ${formatETB(posDiscountAmount)}`
                              : 'Standard laboratory service pricing.'}
                          </small>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                            Payment Method <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <select
                            value={posPaymentMethod}
                            onChange={e => setPosPaymentMethod(e.target.value)}
                            style={{ width: '100%' }}
                          >
                            <option value="Cash">Cash</option>
                            <option value="Telebirr">Telebirr</option>
                            <option value="CBE Birr">CBE Birr</option>
                            <option value="Card">Card / POS</option>
                            <option value="Other">Other Bank Transfer</option>
                          </select>
                        </div>
                      </div>

                      {/* Payment Inputs & Live Calculations */}
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '10px',
                        padding: '14px',
                        marginBottom: '1rem'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                              Amount Received (ETB)
                            </label>
                            <input
                              type="number"
                              placeholder={`e.g. ${posBillTotal}`}
                              value={posAmountReceived}
                              onChange={e => setPosAmountReceived(e.target.value)}
                              style={{ width: '100%', fontSize: '1rem', fontWeight: 700 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                              Change Balance
                            </label>
                            <div style={{
                              padding: '8px 12px',
                              background: 'rgba(30, 41, 59, 0.6)',
                              borderRadius: '8px',
                              fontSize: '1.1rem',
                              fontWeight: 800,
                              color: posBalanceDue > 0 ? '#4ade80' : '#94a3b8'
                            }}>
                              {formatETB(posBalanceDue)}
                            </div>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.15)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Total Amount Due:</span>
                          <strong style={{ fontSize: '1.3rem', color: '#38bdf8' }}>{formatETB(posBillTotal)}</strong>
                        </div>
                      </div>

                      {/* Navigation & Submit Buttons */}
                      <div className="admin-pos-actions-space">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setPosWizardStep(2)}
                          style={{ padding: '10px 18px' }}
                        >
                          ← Back to Test Selection
                        </button>
                        <button
                          type="button"
                          onClick={handlePosRegister}
                          disabled={posRegistering}
                          className="primary"
                          style={{
                            padding: '10px 24px',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          }}
                        >
                          {posRegistering ? 'Completing Registration…' : '💳 Confirm Payment & Complete Registration'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── RIGHT COLUMN: LIVE BILL SUMMARY SIDEBAR ── */}
                <div>
                  <div className="bill-summary-card lab-bill-summary lab-v2-bill" style={{
                    background: 'var(--surface-container, #131e32)',
                    border: '1px solid var(--card-border, #24344d)',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <div className="lab-v2-bill-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid rgba(148, 163, 184, 0.15)', paddingBottom: '10px' }}>
                      <div className="lab-v2-bill-icon" style={{ fontSize: '1.4rem' }}>💰</div>
                      <div>
                        <small style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LIVE BILLING</small>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc' }}>Receipt Summary</h3>
                      </div>
                    </div>

                    <div className="lab-v2-bill-items" style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '14px' }}>
                      {posSelectedTests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8' }}>
                          <span style={{ fontSize: '2rem' }}>🧪</span>
                          <p style={{ margin: '8px 0 2px', fontSize: '0.88rem', fontWeight: 600 }}>No tests selected yet</p>
                          <small style={{ fontSize: '0.75rem' }}>Select laboratory tests to begin live billing</small>
                        </div>
                      ) : (() => {
                        const grouped = new Map();
                        posSelectedTests.forEach(s => {
                          const catName = s.categoryName || (catalog || []).find(c => (c.tests || []).some(t => t._id === s._id))?.name || 'Other';
                          if (!grouped.has(catName)) grouped.set(catName, []);
                          grouped.get(catName).push(s);
                        });

                        return Array.from(grouped.entries()).map(([catName, tests]) => {
                          const catTheme = getCatTheme(catName);
                          const isHematology = /^HEMATOLOGY$/i.test(catName);
                          const isUrinalysis = /^URINALYSIS$/i.test(catName) || /^URINE/i.test(catName);
                          const isElecCat = /^SERUM ELECTROLYTE$/i.test(catName) || /^ELECTROLYTE/i.test(catName);

                          const cbcTests = isHematology ? tests.filter(isCbcTest) : [];
                          const chemTests = isUrinalysis ? tests.filter(isUrineChemTest) : [];
                          const microTests = isUrinalysis ? tests.filter(isUrineMicroTest) : [];
                          const hcgTests = isUrinalysis ? tests.filter(isHcgTest) : [];
                          const elecTests = isElecCat ? tests.filter(isSerumElectrolyteTest) : [];

                          const otherTests = tests.filter(t => {
                            if (isHematology && isCbcTest(t)) return false;
                            if (isUrinalysis && (isUrineChemTest(t) || isUrineMicroTest(t) || isHcgTest(t))) return false;
                            if (isElecCat && isSerumElectrolyteTest(t)) return false;
                            if (isCbcTest(t) || isUrineChemTest(t) || isUrineMicroTest(t) || isHcgTest(t) || isSerumElectrolyteTest(t)) return false;
                            if (t.billableIndividually === false || t.includedInBundle === true) return false;
                            return true;
                          });

                          let billableCount = otherTests.length + hcgTests.length;
                          if (cbcTests.length > 0) billableCount++;
                          if (chemTests.length > 0) billableCount++;
                          if (microTests.length > 0) billableCount++;
                          if (elecTests.length > 0) billableCount++;

                          return (
                            <div key={catName} style={{ marginBottom: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: catTheme.accent }}></span>
                                <span>{catName}</span>
                                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#94a3b8' }}>{billableCount} item(s)</span>
                              </div>

                              {cbcTests.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '4px 6px', background: 'rgba(2, 132, 199, 0.15)', borderRadius: '4px', marginBottom: '3px' }}>
                                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>🩸 CBC Complete ({cbcTests.length} params)</span>
                                  <strong style={{ color: '#38bdf8' }}>{formatETB(testSettings.cbcGroupPrice ?? 150)}</strong>
                                </div>
                              )}

                              {chemTests.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '4px 6px', background: 'rgba(13, 148, 136, 0.15)', borderRadius: '4px', marginBottom: '3px' }}>
                                  <span style={{ color: '#2dd4bf', fontWeight: 600 }}>🧪 Chemical Analysis ({chemTests.length} params)</span>
                                  <strong style={{ color: '#2dd4bf' }}>{formatETB(Number(testSettings.urineChemicalPrice ?? 300))}</strong>
                                </div>
                              )}

                              {microTests.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '4px 6px', background: 'rgba(13, 148, 136, 0.15)', borderRadius: '4px', marginBottom: '3px' }}>
                                  <span style={{ color: '#2dd4bf', fontWeight: 600 }}>🔬 Urine Microscopy ({microTests.length} params)</span>
                                  <strong style={{ color: '#2dd4bf' }}>{formatETB(Number(testSettings.urineMicroscopyPrice ?? 300))}</strong>
                                </div>
                              )}

                              {elecTests.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '4px 6px', background: 'rgba(234, 88, 12, 0.15)', borderRadius: '4px', marginBottom: '3px' }}>
                                  <span style={{ color: '#fb923c', fontWeight: 600 }}>⚡ Serum Electrolytes ({elecTests.length} params)</span>
                                  <strong style={{ color: '#fb923c' }}>{formatETB(Number(testSettings.serumElectrolytePrice ?? 1000))}</strong>
                                </div>
                              )}

                              {hcgTests.map(s => (
                                <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '3px 6px' }}>
                                  <span style={{ color: '#cbd5e1' }}>{s.name}</span>
                                  <strong>{formatETB(s.price || 200)}</strong>
                                </div>
                              ))}

                              {otherTests.map(s => (
                                <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '3px 6px' }}>
                                  <span style={{ color: '#cbd5e1' }}>{s.name}</span>
                                  <strong>{formatETB(s.price)}</strong>
                                </div>
                              ))}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Breakdown totals */}
                    <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.15)', paddingTop: '10px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Selected Tests:</span>
                        <strong>{posSelectedTestIds.length}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Subtotal:</span>
                        <strong>{formatETB(posBillSubtotal)}</strong>
                      </div>
                      {posDiscountAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80' }}>
                          <span>Discount ({posDiscountPercent}%):</span>
                          <strong>− {formatETB(posDiscountAmount)}</strong>
                        </div>
                      )}
                      {posServiceDiscountType === 'Counseling Only' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8' }}>
                          <span>Counseling Fee:</span>
                          <strong>{formatETB(testSettings.counselingPrice || 0)}</strong>
                        </div>
                      )}
                    </div>

                    <div style={{
                      borderTop: '1px solid rgba(148, 163, 184, 0.25)',
                      marginTop: '10px',
                      paddingTop: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Grand Total:</span>
                      <strong style={{ fontSize: '1.25rem', color: '#38bdf8' }}>{formatETB(posBillTotal)}</strong>
                    </div>

                    {/* Quick Step Advance Button */}
                    {posWizardStep === 1 && (
                      <button
                        type="button"
                        onClick={handleProceedToTestSelection}
                        className="primary"
                        style={{
                          width: '100%',
                          marginTop: '12px',
                          padding: '9px',
                          fontSize: '0.85rem',
                          fontWeight: 700
                        }}
                      >
                        Proceed to Test Selection →
                      </button>
                    )}
                    {posWizardStep === 2 && (
                      <button
                        type="button"
                        onClick={handleProceedToPayment}
                        className="primary"
                        style={{
                          width: '100%',
                          marginTop: '12px',
                          padding: '9px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                        }}
                      >
                        Proceed to Payment ({formatETB(posBillTotal)}) →
                      </button>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          )}

          {/* Recent Registrations Table (under POS) */}
          {receptionSubTab === 'pos' && posRecentPatients.length > 0 && (
            <div className="collector-queue" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#cbd5e1' }}>Recently Registered in Current Session</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{posRecentPatients.length} record(s)</span>
              </header>
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-tx-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Patient Name</th>
                      <th>Age / Sex</th>
                      <th>Phone</th>
                      <th>Receipt #</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Total (ETB)</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posRecentPatients.map(p => (
                      <tr key={p._id || p.patientId}>
                        <td><strong>{p.patientId}</strong></td>
                        <td>{p.name}</td>
                        <td>{p.age} yrs / {p.sex}</td>
                        <td>{p.phone}</td>
                        <td>{p.receiptNumber || '—'}</td>
                        <td>
                          <span className={`collector-status-pill ${p.paymentStatus === 'Paid' ? 'completed' : 'pending'}`}>
                            {p.paymentStatus || 'Paid'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatETB(p.grandTotal || 0)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => setPosReceiptModalPatient(p)}
                            style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '8px' }}
                          >
                            🖨️ Thermal Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Waiting for Payment Queue */}
          {receptionSubTab === 'waiting' && (
            <section className="collector-queue" style={{ padding: '1.25rem' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '1rem' }}>
                <div>
                  <p className="eyebrow" style={{ margin: 0 }}>Unpaid / Self-Aware Patients</p>
                  <h2 style={{ fontSize: '1.25rem', margin: '4px 0 0' }}>Patients Waiting for Payment Collection</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="🔍 Search waiting patients by name, ID, phone…"
                    value={receptionWaitingSearch}
                    onChange={e => setReceptionWaitingSearch(e.target.value)}
                    style={{ minWidth: '260px', padding: '7px 12px', fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    className="secondary"
                    onClick={loadReceptionData}
                    disabled={receptionLoading}
                    style={{ fontSize: '0.85rem', padding: '7px 12px' }}
                  >
                    🔄 Refresh
                  </button>
                </div>
              </header>

              <div style={{ marginTop: '12px' }}>
                {receptionLoading ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>⏳</div>
                    <strong>Loading waiting patients…</strong>
                  </div>
                ) : filteredWaitingPayment.length === 0 ? (
                  <div className="clinical-empty-card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🎉</div>
                    <h3 style={{ margin: '0 0 4px', color: '#f8fafc' }}>No Patients Waiting for Payment</h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                      All registered patients have completed payment, or no pending self-awareness cases exist.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredWaitingPayment.map(p => {
                      const testsStr = (p.laboratoryTests || []).map(t => typeof t === 'object' ? t.name : t).join(', ') || 'No tests selected';
                      return (
                        <div
                          key={p._id}
                          className="clinical-patient-case-card"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '14px 18px',
                            background: 'rgba(15, 23, 42, 0.65)',
                            borderRadius: '12px',
                            border: '1px solid rgba(148, 163, 184, 0.18)',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div style={{ minWidth: '220px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{p.name}</strong>
                              <span style={{ fontSize: '0.74rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                                ⏳ Waiting for Payment
                              </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                              <span>{p.patientId}</span> · <span>{p.age} YRS / {p.sex}</span> · <span>📞 {p.phone}</span> · <span style={{ color: '#38bdf8' }}>📍 {p.branchName || 'Main'}</span>
                            </div>
                          </div>

                          <div style={{ flex: 1, minWidth: '240px', maxWidth: '500px' }}>
                            <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>Ordered Tests</small>
                            <span style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.4, display: 'inline-block' }}>{testsStr}</span>
                          </div>

                          <div style={{ textAlign: 'right', minWidth: '120px' }}>
                            <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Fee</small>
                            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>{formatETB(p.grandTotal || 0)}</span>
                          </div>

                          <div>
                            <button
                              type="button"
                              className="primary"
                              onClick={() => {
                                setCompletingPaymentPatient(p);
                                setCompletingPaymentMethod('Cash');
                              }}
                              style={{
                                padding: '8px 16px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <span>💳</span>
                              <span>Complete Payment</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── PATHOLOGY DEPARTMENT VIEW ───────────────────────────────────────────── */}
      {/* ========================================================================= */}
      {activeDepartment === 'pathology' && (
        <div className="admin-dept-view admin-pathology-view" style={{ marginBottom: '2rem' }}>
          {/* Pathology Sub-Tabs Bar */}
          <div className="reception-tabs" style={{ marginBottom: '1.25rem' }}>
            {[
              ['queue', `📋 Patient Queue (${pathologyActiveCount})`],
              ['optionA', '📝 Option A: Specialist Report (Paste / Word)'],
              ['optionB', '🧪 Option B: Structured Findings'],
              ['optionC', '📚 Option C: Standardized Templates']
            ].map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                className={pathologySubTab === tabKey ? 'active' : ''}
                onClick={() => setPathologySubTab(tabKey)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Pathology Metrics Cards */}
          <div className="collector-metrics-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="collector-metric-card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div className="collector-metric-icon" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7' }}>🔬</div>
              <div className="collector-metric-info">
                <h3>Active Worklist</h3>
                <p className="collector-metric-num">{pathologyActiveCount}</p>
                <small style={{ color: '#94a3b8' }}>Total pending cases</small>
              </div>
            </div>

            <div className="collector-metric-card" style={{ borderLeft: '4px solid #ef4444' }}>
              <div className="collector-metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>🧪</div>
              <div className="collector-metric-info">
                <h3>Biopsy Cases</h3>
                <p className="collector-metric-num">{pathologyQueue.filter(c => c.testType === 'Biopsy').length}</p>
                <small style={{ color: '#94a3b8' }}>20-day turnaround target</small>
              </div>
            </div>

            <div className="collector-metric-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div className="collector-metric-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>💉</div>
              <div className="collector-metric-info">
                <h3>FNAC Cases</h3>
                <p className="collector-metric-num">{pathologyQueue.filter(c => c.testType === 'FNAC').length}</p>
                <small style={{ color: '#94a3b8' }}>Aspiration cytology</small>
              </div>
            </div>

            <div className="collector-metric-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="collector-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>✅</div>
              <div className="collector-metric-info">
                <h3>Approved / Cleared</h3>
                <p className="collector-metric-num" style={{ color: '#10b981' }}>
                  {pathologyQueue.filter(c => ['Approved', 'Ready for Printing'].includes(c.status)).length}
                </p>
                <small style={{ color: '#94a3b8' }}>Completed cases</small>
              </div>
            </div>
          </div>

          {/* Sub-tab 1: Patient Worklist Queue */}
          {pathologySubTab === 'queue' && (
            <section className="collector-queue" style={{ padding: '1.25rem' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '1rem' }}>
                <div>
                  <p className="eyebrow" style={{ margin: 0 }}>Histopathology & Cytology Cases</p>
                  <h2 style={{ fontSize: '1.25rem', margin: '4px 0 0' }}>Pathology Patient Worklist (Cross-Branch)</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={loadPathologyData}
                    disabled={pathologyLoading}
                    style={{ fontSize: '0.85rem', padding: '7px 12px' }}
                  >
                    🔄 Refresh Worklist
                  </button>
                </div>
              </header>

              {/* Filters Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', background: 'rgba(15, 23, 42, 0.4)', padding: '10px', borderRadius: '10px' }}>
                {/* Date Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>📅 Date:</span>
                  {[
                    ['all', 'All'],
                    ['today', 'Today'],
                    ['yesterday', 'Yesterday'],
                    ['this_week', 'This Week'],
                    ['last_week', 'Last Week']
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={pathologyDateFilter === val ? 'primary' : 'secondary'}
                      onClick={() => setPathologyDateFilter(val)}
                      style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '14px' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Status Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Status:</span>
                  {[
                    ['all', 'All'],
                    ['Queued', 'Queued'],
                    ['In Progress', 'In Progress'],
                    ['Approved', 'Approved']
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={pathologyStatusFilter === val ? 'primary' : 'secondary'}
                      onClick={() => setPathologyStatusFilter(val)}
                      style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '14px' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div>
                  <input
                    type="text"
                    placeholder="🔍 Search patient, ID, case #, test…"
                    value={pathologySearch}
                    onChange={e => setPathologySearch(e.target.value)}
                    style={{ minWidth: '240px', padding: '6px 10px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {/* Case Cards List */}
              <div>
                {pathologyLoading ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>⏳</div>
                    <strong>Loading pathology queue…</strong>
                  </div>
                ) : filteredPathologyCases.length === 0 ? (
                  <div className="clinical-empty-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🔬</div>
                    <h3 style={{ margin: '0 0 4px', color: '#f8fafc' }}>No Pathology Cases Found</h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                      No Biopsy, FNAC, or Peripheral Morphology cases match the selected filters.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredPathologyCases.map(c => {
                      const countdown = getCountdown(c.reportingDeadline);
                      const isBiopsy = c.testType === 'Biopsy';
                      const isApproved = ['Approved', 'Ready for Printing'].includes(c.status);
                      const senderName = c.registeredBy?.fullName || c.patient?.registeredBy?.fullName || 'Reception';

                      return (
                        <div
                          key={c._id}
                          className="clinical-patient-case-card"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '14px 18px',
                            background: 'rgba(15, 23, 42, 0.65)',
                            borderRadius: '12px',
                            border: '1px solid rgba(148, 163, 184, 0.18)',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div style={{ minWidth: '220px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{c.patient?.name || 'Unknown Patient'}</strong>
                              <span style={{ fontSize: '0.74rem', background: isBiopsy ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)', color: isBiopsy ? '#f87171' : '#c084fc', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                                {c.testType}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                              <span>{c.patient?.patientId}</span> · <span>{c.patient?.age} YRS / {c.patient?.sex}</span> · <span style={{ color: '#38bdf8' }}>📍 {c.branchName} Branch</span> · <span>Sent by: {senderName}</span>
                            </div>
                          </div>

                          <div style={{ minWidth: '140px' }}>
                            <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Fee</small>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>{formatETB(c.price || 0)}</span>
                          </div>

                          <div style={{ minWidth: '160px' }}>
                            <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Turnaround Target</small>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: countdown.isOverdue ? '#ef4444' : isApproved ? '#10b981' : '#f59e0b' }}>
                              {isApproved ? '✅ Completed' : `⏱️ ${countdown.text}`}
                            </span>
                          </div>

                          <div style={{ minWidth: '120px' }}>
                            <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Status</small>
                            <span className={`collector-status-pill ${isApproved ? 'completed' : c.status === 'In Progress' ? 'in-progress' : 'pending'}`}>
                              {isApproved ? 'Ready for Printing' : c.status}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="primary"
                              onClick={() => openPathologyCase(c, 'optionA')}
                              style={{ fontSize: '0.78rem', padding: '5px 10px', borderRadius: '8px' }}
                              title="Open in Specialist Rich Report Editor"
                            >
                              Option A
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => openPathologyCase(c, 'optionB')}
                              style={{ fontSize: '0.78rem', padding: '5px 10px', borderRadius: '8px' }}
                              title="Open in Structured Findings Entry"
                            >
                              Option B
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => openPathologyCase(c, 'optionC')}
                              style={{ fontSize: '0.78rem', padding: '5px 10px', borderRadius: '8px' }}
                              title="Open in Standardized Template Library"
                            >
                              Option C
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Sub-tab 2: Option A (Specialist Report with Paste / Word Support) */}
          {pathologySubTab === 'optionA' && (
            <section className="collector-queue" style={{ padding: '1.25rem' }}>
              {/* Active Case Selector Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <div>
                  <small style={{ color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.74rem' }}>Option A: Specialist Report Workstation</small>
                  <h3 style={{ margin: '2px 0 0', color: '#f8fafc', fontSize: '1.1rem' }}>
                    {selectedPathologyCase ? `${selectedPathologyCase.patient?.name} (${selectedPathologyCase.testType})` : 'No Case Currently Selected'}
                  </h3>
                  {selectedPathologyCase && (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {selectedPathologyCase.patient?.patientId} · {selectedPathologyCase.patient?.age} YRS / {selectedPathologyCase.patient?.sex} · 📍 {selectedPathologyCase.branchName} Branch
                    </span>
                  )}
                </div>

                {/* Quick Case Switcher Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>Select Case:</label>
                  <select
                    value={selectedPathologyCase?._id || ''}
                    onChange={e => {
                      const c = pathologyQueue.find(x => x._id === e.target.value);
                      if (c) openPathologyCase(c, 'optionA');
                    }}
                    style={{ padding: '6px 10px', fontSize: '0.82rem', minWidth: '220px' }}
                  >
                    <option value="">-- Choose from Pathology Queue --</option>
                    {pathologyQueue.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.patient?.name} - {c.testType} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedPathologyCase ? (
                <div className="clinical-empty-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👆</div>
                  <h3 style={{ color: '#f8fafc' }}>Please Select a Pathology Case</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Choose a patient case from the worklist dropdown above or the Patient Queue sub-tab to enter or paste a specialist report.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.84rem', color: '#cbd5e1' }}>
                    💡 <strong>Specialist Report Instructions:</strong> You can type freely or paste formatted reports directly from Microsoft Word / Google Docs. Full text formatting, bold headings, bullet points, and tables are preserved.
                  </div>

                  {/* Rich Text Editor */}
                  <div style={{ background: '#ffffff', color: '#000000', borderRadius: '10px', overflow: 'hidden' }}>
                    <RichReportEditor
                      value={pathologyReportContent}
                      onChange={html => setPathologyReportContent(html)}
                    />
                  </div>

                  {/* Footer & Actions Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={pathologyShowFooter}
                        onChange={e => setPathologyShowFooter(e.target.checked)}
                      />
                      <span>Include Authorized Signatures & Stamp on Final Report</span>
                    </label>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="secondary"
                        disabled={pathologySaving || pathologyApproving}
                        onClick={handleSavePathologyDraft}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        {pathologySaving ? 'Saving Draft…' : '💾 Save Draft'}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setPathologyPreviewOpen(true)}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        👁️ Preview Report
                      </button>
                      <button
                        type="button"
                        className="primary"
                        disabled={pathologySaving || pathologyApproving}
                        onClick={handleApprovePathologyCase}
                        style={{
                          padding: '8px 20px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        }}
                      >
                        {pathologyApproving ? 'Approving…' : '✅ Approve & Finalize'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Sub-tab 3: Option B (Structured Findings Entry) */}
          {pathologySubTab === 'optionB' && (
            <section className="collector-queue" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <div>
                  <small style={{ color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.74rem' }}>Option B: Structured Clinical Findings</small>
                  <h3 style={{ margin: '2px 0 0', color: '#f8fafc', fontSize: '1.1rem' }}>
                    {selectedPathologyCase ? `${selectedPathologyCase.patient?.name} (${selectedPathologyCase.testType})` : 'No Case Currently Selected'}
                  </h3>
                </div>
                <select
                  value={selectedPathologyCase?._id || ''}
                  onChange={e => {
                    const c = pathologyQueue.find(x => x._id === e.target.value);
                    if (c) openPathologyCase(c, 'optionB');
                  }}
                  style={{ padding: '6px 10px', fontSize: '0.82rem', minWidth: '220px' }}
                >
                  <option value="">-- Choose from Pathology Queue --</option>
                  {pathologyQueue.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.patient?.name} - {c.testType}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedPathologyCase ? (
                <div className="clinical-empty-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👆</div>
                  <h3 style={{ color: '#f8fafc' }}>Please Select a Pathology Case</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Select a case to fill in structured specimen, microscopic, and diagnostic fields.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Specimen Type / Source
                      </label>
                      <input
                        type="text"
                        value={pathologyStructured.specimen}
                        onChange={e => setPathologyStructured(prev => ({ ...prev, specimen: e.target.value }))}
                        placeholder="e.g. Skin biopsy, lymph node, thyroid"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Procedure
                      </label>
                      <input
                        type="text"
                        value={pathologyStructured.procedure}
                        onChange={e => setPathologyStructured(prev => ({ ...prev, procedure: e.target.value }))}
                        placeholder="e.g. Excisional biopsy, Fine needle aspiration"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Clinical History & Information
                    </label>
                    <textarea
                      rows={2}
                      value={pathologyStructured.clinicalHistory}
                      onChange={e => setPathologyStructured(prev => ({ ...prev, clinicalHistory: e.target.value }))}
                      placeholder="Relevant clinical presentation, duration, prior treatments..."
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Gross Description
                      </label>
                      <textarea
                        rows={3}
                        value={pathologyStructured.grossDescription}
                        onChange={e => setPathologyStructured(prev => ({ ...prev, grossDescription: e.target.value }))}
                        placeholder="Tissue size, color, consistency, dimensions..."
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Microscopic Description
                      </label>
                      <textarea
                        rows={3}
                        value={pathologyStructured.microscopicDescription}
                        onChange={e => setPathologyStructured(prev => ({ ...prev, microscopicDescription: e.target.value }))}
                        placeholder="Cellular architecture, nuclear atypia, mitotic figures..."
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Pathological Diagnosis *
                      </label>
                      <textarea
                        rows={2}
                        value={pathologyStructured.diagnosis}
                        onChange={e => setPathologyStructured(prev => ({ ...prev, diagnosis: e.target.value }))}
                        placeholder="Final histological or cytological diagnosis..."
                        style={{ width: '100%', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Impression / Summary
                      </label>
                      <textarea
                        rows={2}
                        value={pathologyStructured.impression}
                        onChange={e => setPathologyStructured(prev => ({ ...prev, impression: e.target.value }))}
                        placeholder="Clinical summary and correlation..."
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Recommendations / Notes
                    </label>
                    <input
                      type="text"
                      value={pathologyStructured.recommendation}
                      onChange={e => setPathologyStructured(prev => ({ ...prev, recommendation: e.target.value }))}
                      placeholder="e.g. IHC recommended, clinical follow-up suggested"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="secondary"
                      disabled={pathologySaving || pathologyApproving}
                      onClick={handleSavePathologyDraft}
                    >
                      {pathologySaving ? 'Saving…' : '💾 Save Draft'}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setPathologyPreviewOpen(true)}
                    >
                      👁️ Preview Report
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={pathologySaving || pathologyApproving}
                      onClick={handleApprovePathologyCase}
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      {pathologyApproving ? 'Approving…' : '✅ Approve & Finalize'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Sub-tab 4: Option C (Standardized Template Library) */}
          {pathologySubTab === 'optionC' && (
            <section className="collector-queue" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <div>
                  <small style={{ color: '#10b981', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.74rem' }}>Option C: Standardized Template Library</small>
                  <h3 style={{ margin: '2px 0 0', color: '#f8fafc', fontSize: '1.1rem' }}>
                    {selectedPathologyCase ? `${selectedPathologyCase.patient?.name} (${selectedPathologyCase.testType})` : 'No Case Currently Selected'}
                  </h3>
                </div>
                <select
                  value={selectedPathologyCase?._id || ''}
                  onChange={e => {
                    const c = pathologyQueue.find(x => x._id === e.target.value);
                    if (c) openPathologyCase(c, 'optionC');
                  }}
                  style={{ padding: '6px 10px', fontSize: '0.82rem', minWidth: '220px' }}
                >
                  <option value="">-- Choose from Pathology Queue --</option>
                  {pathologyQueue.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.patient?.name} - {c.testType}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedPathologyCase ? (
                <div className="clinical-empty-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👆</div>
                  <h3 style={{ color: '#f8fafc' }}>Please Select a Pathology Case</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Select a case to choose and apply standardized Biopsy, FNAC, or Blood Film templates.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Template Picker */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(148, 163, 184, 0.12)' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
                      Select Template from Library:
                    </label>
                    <select
                      value={pathologyTemplateReport.templateKey}
                      onChange={e => applyPathologyTemplate(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                      <option value="">-- Choose Template --</option>
                      {(PATHOLOGY_TEMPLATES.Pathology || []).map(t => (
                        <option key={t.id || t.key} value={t.id || t.key}>
                          {t.name} ({t.examination})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Examination
                    </label>
                    <input
                      type="text"
                      value={pathologyTemplateReport.examination}
                      onChange={e => setPathologyTemplateReport(prev => ({ ...prev, examination: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Technique & Clinical Information
                    </label>
                    <input
                      type="text"
                      value={pathologyTemplateReport.technique}
                      onChange={e => setPathologyTemplateReport(prev => ({ ...prev, technique: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Findings *
                    </label>
                    <textarea
                      rows={5}
                      value={pathologyTemplateReport.findings}
                      onChange={e => setPathologyTemplateReport(prev => ({ ...prev, findings: e.target.value }))}
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Impression *
                      </label>
                      <textarea
                        rows={3}
                        value={pathologyTemplateReport.impression}
                        onChange={e => setPathologyTemplateReport(prev => ({ ...prev, impression: e.target.value }))}
                        style={{ width: '100%', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Recommendation
                      </label>
                      <textarea
                        rows={3}
                        value={pathologyTemplateReport.recommendation}
                        onChange={e => setPathologyTemplateReport(prev => ({ ...prev, recommendation: e.target.value }))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="secondary"
                      disabled={pathologySaving || pathologyApproving}
                      onClick={handleSavePathologyDraft}
                    >
                      {pathologySaving ? 'Saving…' : '💾 Save Draft'}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleOpenPathologyPreview}
                    >
                      👁️ Preview Report
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={pathologySaving || pathologyApproving}
                      onClick={handleApprovePathologyCase}
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      {pathologyApproving ? 'Approving…' : '✅ Approve & Finalize'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── RADIOLOGY DEPARTMENT VIEW ───────────────────────────────────────────── */}
      {/* ========================================================================= */}
      {activeDepartment === 'radiology' && (
        <div className="admin-dept-view admin-radiology-view" style={{ marginBottom: '2rem' }}>
          {/* Radiology Sub-Tabs Bar */}
          <div className="reception-tabs" style={{ marginBottom: '1.25rem' }}>
            {[
              ['queue', `📋 Patient Queue (${radiologyActiveCount})`],
              ['optionA', '📝 Option A: Specialist Report (Paste / Word)'],
              ['optionB', '🫁 Option B: Structured Organ Findings'],
              ['optionC', '📚 Option C: Standardized Templates (MRI / CT / US)']
            ].map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                className={radiologySubTab === tabKey ? 'active' : ''}
                onClick={() => setRadiologySubTab(tabKey)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Radiology Metrics Cards */}
          <div className="collector-metrics-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="collector-metric-card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div className="collector-metric-icon" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7' }}>🩻</div>
              <div className="collector-metric-info">
                <h3>Active Worklist</h3>
                <p className="collector-metric-num">{radiologyActiveCount}</p>
                <small style={{ color: '#94a3b8' }}>Total pending exams</small>
              </div>
            </div>

            <div className="collector-metric-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="collector-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>🔊</div>
              <div className="collector-metric-info">
                <h3>Ultrasound Cases</h3>
                <p className="collector-metric-num">{radiologyQueue.filter(c => c.examinationType === 'Ultrasound').length}</p>
                <small style={{ color: '#94a3b8' }}>Abdominal, pelvic, obstetric</small>
              </div>
            </div>

            <div className="collector-metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="collector-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>🍩</div>
              <div className="collector-metric-info">
                <h3>CT Scan Cases</h3>
                <p className="collector-metric-num">{radiologyQueue.filter(c => c.examinationType === 'CT Scan').length}</p>
                <small style={{ color: '#94a3b8' }}>Brain, chest, abdomen</small>
              </div>
            </div>

            <div className="collector-metric-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div className="collector-metric-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>🧲</div>
              <div className="collector-metric-info">
                <h3>MRI Cases</h3>
                <p className="collector-metric-num">{radiologyQueue.filter(c => c.examinationType === 'MRI').length}</p>
                <small style={{ color: '#94a3b8' }}>Magnetic resonance imaging</small>
              </div>
            </div>
          </div>

          {/* Sub-tab 1: Patient Worklist Queue */}
          {radiologySubTab === 'queue' && (
            <section className="collector-queue" style={{ padding: '1.25rem' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '1rem' }}>
                <div>
                  <p className="eyebrow" style={{ margin: 0 }}>Diagnostic Imaging Cases</p>
                  <h2 style={{ fontSize: '1.25rem', margin: '4px 0 0' }}>Radiology Patient Worklist (Cross-Branch)</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={loadRadiologyData}
                    disabled={radiologyLoading}
                    style={{ fontSize: '0.85rem', padding: '7px 12px' }}
                  >
                    🔄 Refresh Worklist
                  </button>
                </div>
              </header>

              {/* Filters Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', background: 'rgba(15, 23, 42, 0.4)', padding: '10px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>📅 Date:</span>
                  {[
                    ['all', 'All'],
                    ['today', 'Today'],
                    ['yesterday', 'Yesterday'],
                    ['this_week', 'This Week'],
                    ['last_week', 'Last Week']
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={radiologyDateFilter === val ? 'primary' : 'secondary'}
                      onClick={() => setRadiologyDateFilter(val)}
                      style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '14px' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Status:</span>
                  {[
                    ['all', 'All'],
                    ['Queued', 'Queued'],
                    ['In Progress', 'In Progress'],
                    ['Approved', 'Approved']
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={radiologyStatusFilter === val ? 'primary' : 'secondary'}
                      onClick={() => setRadiologyStatusFilter(val)}
                      style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '14px' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="🔍 Search patient, ID, case #, exam…"
                    value={radiologySearch}
                    onChange={e => setRadiologySearch(e.target.value)}
                    style={{ minWidth: '240px', padding: '6px 10px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {/* Case Cards List */}
              <div>
                {radiologyLoading ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>⏳</div>
                    <strong>Loading radiology queue…</strong>
                  </div>
                ) : filteredRadiologyCases.length === 0 ? (
                  <div className="clinical-empty-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🩻</div>
                    <h3 style={{ margin: '0 0 4px', color: '#f8fafc' }}>No Radiology Cases Found</h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                      No Ultrasound, CT Scan, MRI, or X-Ray cases match the selected filters.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredRadiologyCases.map(c => {
                      const countdown = getCountdown(c.reportingDeadline);
                      const isApproved = ['Approved', 'Ready for Printing'].includes(c.status);
                      const examName = c.customExaminationName || c.ultrasoundSubtype || c.examinationType;
                      const senderName = c.registeredBy?.fullName || c.patient?.registeredBy?.fullName || 'Reception';

                      return (
                        <div
                          key={c._id}
                          className="clinical-patient-case-card"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '14px 18px',
                            background: 'rgba(15, 23, 42, 0.65)',
                            borderRadius: '12px',
                            border: '1px solid rgba(148, 163, 184, 0.18)',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div style={{ minWidth: '220px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{c.patient?.name || 'Unknown Patient'}</strong>
                              <span style={{ fontSize: '0.74rem', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                                {examName}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                              <span>{c.patient?.patientId}</span> · <span>{c.patient?.age} YRS / {c.patient?.sex}</span> · <span style={{ color: '#38bdf8' }}>📍 {c.branchName} Branch</span> · <span>Sent by: {senderName}</span>
                            </div>
                          </div>

                          <div style={{ minWidth: '140px' }}>
                            <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Fee</small>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>{formatETB(c.price || 0)}</span>
                          </div>

                          <div style={{ minWidth: '160px' }}>
                            <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Turnaround Target</small>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: countdown.isOverdue ? '#ef4444' : isApproved ? '#10b981' : '#f59e0b' }}>
                              {isApproved ? '✅ Completed' : `⏱️ ${countdown.text}`}
                            </span>
                          </div>

                          <div style={{ minWidth: '120px' }}>
                            <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Status</small>
                            <span className={`collector-status-pill ${isApproved ? 'completed' : c.status === 'In Progress' ? 'in-progress' : 'pending'}`}>
                              {isApproved ? 'Ready for Printing' : c.status}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="primary"
                              onClick={() => openRadiologyCase(c, 'optionA')}
                              style={{ fontSize: '0.78rem', padding: '5px 10px', borderRadius: '8px' }}
                              title="Open in Specialist Rich Report Editor"
                            >
                              Option A
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => openRadiologyCase(c, 'optionB')}
                              style={{ fontSize: '0.78rem', padding: '5px 10px', borderRadius: '8px' }}
                              title="Open in Structured Organ Findings"
                            >
                              Option B
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => openRadiologyCase(c, 'optionC')}
                              style={{ fontSize: '0.78rem', padding: '5px 10px', borderRadius: '8px' }}
                              title="Open in Standardized Template Library"
                            >
                              Option C
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Sub-tab 2: Option A (Specialist Report with Paste / Word Support) */}
          {radiologySubTab === 'optionA' && (
            <section className="collector-queue" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <div>
                  <small style={{ color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.74rem' }}>Option A: Specialist Report Workstation</small>
                  <h3 style={{ margin: '2px 0 0', color: '#f8fafc', fontSize: '1.1rem' }}>
                    {selectedRadiologyCase ? `${selectedRadiologyCase.patient?.name} (${selectedRadiologyCase.customExaminationName || selectedRadiologyCase.examinationType})` : 'No Case Currently Selected'}
                  </h3>
                  {selectedRadiologyCase && (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {selectedRadiologyCase.patient?.patientId} · {selectedRadiologyCase.patient?.age} YRS / {selectedRadiologyCase.patient?.sex} · 📍 {selectedRadiologyCase.branchName} Branch
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>Select Case:</label>
                  <select
                    value={selectedRadiologyCase?._id || ''}
                    onChange={e => {
                      const c = radiologyQueue.find(x => x._id === e.target.value);
                      if (c) openRadiologyCase(c, 'optionA');
                    }}
                    style={{ padding: '6px 10px', fontSize: '0.82rem', minWidth: '220px' }}
                  >
                    <option value="">-- Choose from Radiology Queue --</option>
                    {radiologyQueue.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.patient?.name} - {c.customExaminationName || c.examinationType} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedRadiologyCase ? (
                <div className="clinical-empty-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👆</div>
                  <h3 style={{ color: '#f8fafc' }}>Please Select a Radiology Case</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Choose an imaging case from the worklist dropdown above or the Patient Queue sub-tab to enter or paste a specialist report.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.84rem', color: '#cbd5e1' }}>
                    💡 <strong>Specialist Report Instructions:</strong> You can type freely or paste formatted reports directly from Microsoft Word / Google Docs. Full text formatting, bold headings, bullet points, and tables are preserved.
                  </div>

                  <div style={{ background: '#ffffff', color: '#000000', borderRadius: '10px', overflow: 'hidden' }}>
                    <RichReportEditor
                      value={radiologyReportContent}
                      onChange={html => setRadiologyReportContent(html)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={radiologyShowFooter}
                        onChange={e => setRadiologyShowFooter(e.target.checked)}
                      />
                      <span>Include Authorized Signatures & Stamp on Final Report</span>
                    </label>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="secondary"
                        disabled={radiologySaving || radiologyApproving}
                        onClick={handleSaveRadiologyDraft}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        {radiologySaving ? 'Saving Draft…' : '💾 Save Draft'}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setRadiologyPreviewOpen(true)}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        👁️ Preview Report
                      </button>
                      <button
                        type="button"
                        className="primary"
                        disabled={radiologySaving || radiologyApproving}
                        onClick={handleApproveRadiologyCase}
                        style={{
                          padding: '8px 20px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        }}
                      >
                        {radiologyApproving ? 'Approving…' : '✅ Approve & Finalize'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Sub-tab 3: Option B (Structured Organ Findings) */}
          {radiologySubTab === 'optionB' && (
            <section className="collector-queue" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <div>
                  <small style={{ color: '#06b6d4', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.74rem' }}>Option B: Structured Organ Examination</small>
                  <h3 style={{ margin: '2px 0 0', color: '#f8fafc', fontSize: '1.1rem' }}>
                    {selectedRadiologyCase ? `${selectedRadiologyCase.patient?.name} (${selectedRadiologyCase.customExaminationName || selectedRadiologyCase.examinationType})` : 'No Case Currently Selected'}
                  </h3>
                </div>
                <select
                  value={selectedRadiologyCase?._id || ''}
                  onChange={e => {
                    const c = radiologyQueue.find(x => x._id === e.target.value);
                    if (c) openRadiologyCase(c, 'optionB');
                  }}
                  style={{ padding: '6px 10px', fontSize: '0.82rem', minWidth: '220px' }}
                >
                  <option value="">-- Choose from Radiology Queue --</option>
                  {radiologyQueue.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.patient?.name} - {c.customExaminationName || c.examinationType}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedRadiologyCase ? (
                <div className="clinical-empty-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👆</div>
                  <h3 style={{ color: '#f8fafc' }}>Please Select a Radiology Case</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Select an ultrasound or imaging case to fill in organ-specific findings (Liver, Gallbladder, Kidneys, Spleen, etc.).
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Examination Type / Title
                      </label>
                      <input
                        type="text"
                        value={radiologyStructured.examination}
                        onChange={e => setRadiologyStructured(prev => ({ ...prev, examination: e.target.value }))}
                        placeholder="e.g. Abdominal & Pelvic Ultrasound"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Technique & Equipment
                      </label>
                      <input
                        type="text"
                        value={radiologyStructured.technique}
                        onChange={e => setRadiologyStructured(prev => ({ ...prev, technique: e.target.value }))}
                        placeholder="e.g. High-frequency 3.5MHz curvilinear probe"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Liver
                      </label>
                      <input
                        type="text"
                        value={radiologyStructured.liver}
                        onChange={e => setRadiologyStructured(prev => ({ ...prev, liver: e.target.value }))}
                        placeholder="Normal size, smooth contour, homogeneous echo-texture..."
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Gallbladder & Biliary Tree
                      </label>
                      <input
                        type="text"
                        value={radiologyStructured.gallbladder}
                        onChange={e => setRadiologyStructured(prev => ({ ...prev, gallbladder: e.target.value }))}
                        placeholder="Well distended, thin-walled, no calculi or sludge..."
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Pancreas & Spleen
                      </label>
                      <input
                        type="text"
                        value={radiologyStructured.pancreas}
                        onChange={e => setRadiologyStructured(prev => ({ ...prev, pancreas: e.target.value }))}
                        placeholder="Normal parenchymal appearance, non-enlarged..."
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Kidneys (Bilateral)
                      </label>
                      <input
                        type="text"
                        value={radiologyStructured.kidneys}
                        onChange={e => setRadiologyStructured(prev => ({ ...prev, kidneys: e.target.value }))}
                        placeholder="Bilateral kidneys normal in size, shape, position; normal CMD..."
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Urinary Bladder & Pelvis
                      </label>
                      <input
                        type="text"
                        value={radiologyStructured.urinaryBladder}
                        onChange={e => setRadiologyStructured(prev => ({ ...prev, urinaryBladder: e.target.value }))}
                        placeholder="Adequately distended, smooth regular outline..."
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Other Findings / Free Fluid
                      </label>
                      <input
                        type="text"
                        value={radiologyStructured.otherFindings}
                        onChange={e => setRadiologyStructured(prev => ({ ...prev, otherFindings: e.target.value }))}
                        placeholder="No ascites, no lymphadenopathy noted..."
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Impression / Conclusion *
                    </label>
                    <textarea
                      rows={2}
                      value={radiologyStructured.impression}
                      onChange={e => setRadiologyStructured(prev => ({ ...prev, impression: e.target.value }))}
                      placeholder="Overall diagnostic impression and clinical correlation..."
                      style={{ width: '100%', fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Recommendations / Notes
                    </label>
                    <input
                      type="text"
                      value={radiologyStructured.recommendation}
                      onChange={e => setRadiologyStructured(prev => ({ ...prev, recommendation: e.target.value }))}
                      placeholder="Clinical follow-up or additional imaging advised..."
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="secondary"
                      disabled={radiologySaving || radiologyApproving}
                      onClick={handleSaveRadiologyDraft}
                    >
                      {radiologySaving ? 'Saving…' : '💾 Save Draft'}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setRadiologyPreviewOpen(true)}
                    >
                      👁️ Preview Report
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={radiologySaving || radiologyApproving}
                      onClick={handleApproveRadiologyCase}
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      {radiologyApproving ? 'Approving…' : '✅ Approve & Finalize'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Sub-tab 4: Option C (Standardized Template Library: MRI / CT / US) */}
          {radiologySubTab === 'optionC' && (
            <section className="collector-queue" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <div>
                  <small style={{ color: '#10b981', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.74rem' }}>Option C: Standardized Imaging Template Library</small>
                  <h3 style={{ margin: '2px 0 0', color: '#f8fafc', fontSize: '1.1rem' }}>
                    {selectedRadiologyCase ? `${selectedRadiologyCase.patient?.name} (${selectedRadiologyCase.customExaminationName || selectedRadiologyCase.examinationType})` : 'No Case Currently Selected'}
                  </h3>
                </div>
                <select
                  value={selectedRadiologyCase?._id || ''}
                  onChange={e => {
                    const c = radiologyQueue.find(x => x._id === e.target.value);
                    if (c) openRadiologyCase(c, 'optionC');
                  }}
                  style={{ padding: '6px 10px', fontSize: '0.82rem', minWidth: '220px' }}
                >
                  <option value="">-- Choose from Radiology Queue --</option>
                  {radiologyQueue.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.patient?.name} - {c.customExaminationName || c.examinationType}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedRadiologyCase ? (
                <div className="clinical-empty-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👆</div>
                  <h3 style={{ color: '#f8fafc' }}>Please Select a Radiology Case</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Select an imaging case to apply MRI, CT Scan, or Ultrasound templates from the standardized library.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Category Pills & Template Selector */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(148, 163, 184, 0.12)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>Modality:</span>
                      {['MRI', 'CT', 'Ultrasound'].map(mod => (
                        <button
                          key={mod}
                          type="button"
                          className={radiologySelectedTemplateCategory === mod ? 'primary' : 'secondary'}
                          onClick={() => {
                            setRadiologySelectedTemplateCategory(mod);
                            const firstTpl = (RADIOLOGY_TEMPLATES[mod] || [])[0];
                            if (firstTpl) applyRadiologyTemplate(firstTpl.id || firstTpl.key, mod);
                          }}
                          style={{ fontSize: '0.78rem', padding: '4px 12px', borderRadius: '14px' }}
                        >
                          {mod}
                        </button>
                      ))}
                    </div>

                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
                      Select {radiologySelectedTemplateCategory} Template:
                    </label>
                    <select
                      value={radiologyTemplateReport.templateKey}
                      onChange={e => applyRadiologyTemplate(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                      <option value="">-- Choose Template --</option>
                      {(RADIOLOGY_TEMPLATES[radiologySelectedTemplateCategory] || []).map(t => (
                        <option key={t.id || t.key} value={t.id || t.key}>
                          {t.name} ({t.examination})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Examination
                    </label>
                    <input
                      type="text"
                      value={radiologyTemplateReport.examination}
                      onChange={e => setRadiologyTemplateReport(prev => ({ ...prev, examination: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Technique
                      </label>
                      <input
                        type="text"
                        value={radiologyTemplateReport.technique}
                        onChange={e => setRadiologyTemplateReport(prev => ({ ...prev, technique: e.target.value }))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Comparison
                      </label>
                      <input
                        type="text"
                        value={radiologyTemplateReport.comparison}
                        onChange={e => setRadiologyTemplateReport(prev => ({ ...prev, comparison: e.target.value }))}
                        placeholder="e.g. None available"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Findings *
                    </label>
                    <textarea
                      rows={6}
                      value={radiologyTemplateReport.findings}
                      onChange={e => setRadiologyTemplateReport(prev => ({ ...prev, findings: e.target.value }))}
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Impression *
                      </label>
                      <textarea
                        rows={3}
                        value={radiologyTemplateReport.impression}
                        onChange={e => setRadiologyTemplateReport(prev => ({ ...prev, impression: e.target.value }))}
                        style={{ width: '100%', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Recommendation
                      </label>
                      <textarea
                        rows={3}
                        value={radiologyTemplateReport.recommendation}
                        onChange={e => setRadiologyTemplateReport(prev => ({ ...prev, recommendation: e.target.value }))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="secondary"
                      disabled={radiologySaving || radiologyApproving}
                      onClick={handleSaveRadiologyDraft}
                    >
                      {radiologySaving ? 'Saving…' : '💾 Save Draft'}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleOpenRadiologyPreview}
                    >
                      👁️ Preview Report
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={radiologySaving || radiologyApproving}
                      onClick={handleApproveRadiologyCase}
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      {radiologyApproving ? 'Approving…' : '✅ Approve & Finalize'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HIGH-CONTRAST TRANSFER MODAL                                       */}
      {/* ========================================================================= */}
      {transferModal?.open && (
        <ModalPortal isOpen={true} onClose={() => !transferModal.busy && setTransferModal(null)}>
          <div className="transfer-modal" onClick={e => e.stopPropagation()}>
            <header className="transfer-modal-header">
              <h3>Send Test to {transferModal.destinationBranch}?</h3>
              <button type="button" className="close-button" disabled={transferModal.busy} onClick={() => setTransferModal(null)}>×</button>
            </header>

            <div className="transfer-modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                The sample/test will be sent to the <strong>{transferModal.destinationBranch}</strong> branch for investigation and approval.
              </p>

              <div className="transfer-info-box">
                <div><strong>Patient:</strong> <span>{transferModal.patient?.name}</span></div>
                <div><strong>Patient ID:</strong> <span>{transferModal.patient?.patientId}</span></div>
                <div><strong>Age / Sex:</strong> <span>{transferModal.patient?.age} YRS / {transferModal.patient?.sex}</span></div>
                <div><strong>From:</strong> <span>📍 {transferModal.patient?.branchName || 'Main'}</span></div>
                <div><strong>Destination:</strong> <span>📍 {transferModal.destinationBranch}</span></div>
                {(transferModal.patient?.systolicBP || transferModal.patient?.diastolicBP) && (
                  <div><strong>Blood Pressure:</strong> <span>{transferModal.patient.systolicBP || '—'}/{transferModal.patient.diastolicBP || '—'} mmHg</span></div>
                )}
              </div>

              <div className="transfer-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0 }}><strong>Select Test(s) to Send:</strong></label>
                  {transferModal.tests.length > 1 && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="link-button"
                        style={{ fontSize: '0.8rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-primary, #38bdf8)', textDecoration: 'underline' }}
                        onClick={() => {
                          const allAvailable = transferModal.tests
                            .filter(t => {
                              const tId = idOf(t);
                              const st = transferModal.transferStatusByTest?.[tId] || transferModal.transferStatusByTest?.[t.name?.toUpperCase()];
                              const isActive = st && ['PENDING_TRANSFER', 'RECEIVED', 'UNDER_INVESTIGATION', 'RESULT_READY'].includes(st.status);
                              const isDone = st && ['COMPLETED', 'APPROVED'].includes(st.status);
                              return !isActive && !isDone;
                            })
                            .map(t => idOf(t));
                          setTransferModal(m => ({ ...m, selectedTestIds: allAvailable, error: '' }));
                        }}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        className="link-button"
                        style={{ fontSize: '0.8rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', textDecoration: 'underline' }}
                        onClick={() => setTransferModal(m => ({ ...m, selectedTestIds: [], error: '' }))}
                      >
                        Deselect all
                      </button>
                    </div>
                  )}
                </div>

                <div className="transfer-test-options">
                  {transferModal.tests.map(t => {
                    const tId = idOf(t);
                    const tName = typeof t === 'string' ? t : t.name;
                    const tCat = t.category?.name || t.category || '';
                    const st = transferModal.transferStatusByTest?.[tId] || transferModal.transferStatusByTest?.[tName?.toUpperCase()];
                    const isActive = st && ['PENDING_TRANSFER', 'RECEIVED', 'UNDER_INVESTIGATION', 'RESULT_READY'].includes(st.status);
                    const isDone = st && ['COMPLETED', 'APPROVED'].includes(st.status);
                    const isDisabled = isActive || isDone;
                    const isChecked = !isDisabled && transferModal.selectedTestIds?.includes(tId);

                    return (
                      <label
                        key={tId}
                        className={`transfer-test-choice ${isChecked ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                        style={{ opacity: isDisabled ? 0.6 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          value={tId}
                          disabled={isDisabled}
                          checked={!!isChecked}
                          onChange={() => {
                            if (isDisabled) return;
                            setTransferModal(m => {
                              const current = m.selectedTestIds || [];
                              const next = current.includes(tId) ? current.filter(id => id !== tId) : [...current, tId];
                              return { ...m, selectedTestIds: next, error: '' };
                            });
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span>
                            <strong>{tCat ? `${tCat} — ` : ''}{tName}</strong>
                          </span>
                          {isActive && (
                            <span className="transfer-badge badge-transferred" style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'rgba(2, 132, 199, 0.25)', color: 'var(--color-primary, #38bdf8)', borderRadius: '4px', border: '1px solid rgba(2, 132, 199, 0.4)' }}>
                              Active Transfer ({st.status.replace('_', ' ')})
                            </span>
                          )}
                          {isDone && (
                            <span className="transfer-badge" style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                              Already Completed
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="transfer-form-group">
                <label><strong>Priority:</strong></label>
                <select
                  value={transferModal.priority}
                  onChange={e => setTransferModal(m => ({ ...m, priority: e.target.value }))}
                >
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="transfer-form-group">
                <label><strong>Clinical Notes / Reason for Transfer (optional):</strong></label>
                <textarea
                  rows="2"
                  placeholder="e.g. Specific analyzer only available at destination branch..."
                  value={transferModal.notes}
                  onChange={e => setTransferModal(m => ({ ...m, notes: e.target.value }))}
                />
              </div>

              {transferModal.error && (
                <div className="alert error" style={{ margin: '4px 0 0' }}>
                  {transferModal.error}
                </div>
              )}
            </div>

            <footer className="transfer-modal-footer">
              <button type="button" className="secondary" disabled={transferModal.busy} onClick={() => setTransferModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={transferModal.busy || !transferModal.selectedTestIds?.length}
                onClick={handleExecuteTransfer}
              >
                {transferModal.busy
                  ? 'Sending...'
                  : `Send to ${transferModal.destinationBranch}`}
              </button>
            </footer>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADMIN QUEUE DELETE CONFIRMATION MODAL                               */}
      {/* ========================================================================= */}
      {queueDeleteModal.open && (
        <ModalPortal isOpen={true} onClose={() => !queueDeleteModal.busy && setQueueDeleteModal({ open: false, patient: null, busy: false, error: '' })}>
          <div className="queue-delete-modal" onClick={e => e.stopPropagation()}>
            <header className="queue-delete-modal-header">
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <h3>Delete Patient Queue?</h3>
            </header>
            <div className="queue-delete-modal-body">
              <p>
                Are you sure you want to remove this patient from the active sample collection queue?
              </p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px' }}>
                ℹ️ <strong>Patient Record Preserved:</strong> This action only removes the entry from the active laboratory sample queue. The patient's registration record, payments, and medical history will <strong>NOT</strong> be deleted.
              </p>
              {queueDeleteModal.patient && (
                <div className="patient-highlight">
                  <div><strong>Patient:</strong> {queueDeleteModal.patient.name}</div>
                  <div><strong>Patient ID:</strong> {queueDeleteModal.patient.patientId}</div>
                  <div><strong>Branch:</strong> {queueDeleteModal.patient.branchName || 'Main'}</div>
                </div>
              )}
              {queueDeleteModal.error && (
                <div className="alert error" style={{ marginTop: '12px' }}>
                  {queueDeleteModal.error}
                </div>
              )}
            </div>
            <footer className="queue-delete-modal-footer">
              <button
                type="button"
                className="secondary"
                disabled={queueDeleteModal.busy}
                onClick={() => setQueueDeleteModal({ open: false, patient: null, busy: false, error: '' })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="queue-delete-btn"
                disabled={queueDeleteModal.busy}
                onClick={handleConfirmDeleteQueue}
              >
                {queueDeleteModal.busy ? 'Removing...' : 'Delete Queue'}
              </button>
            </footer>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SELF-AWARE INVESTIGATION MODAL                                     */}
      {/* ========================================================================= */}
      {investigatingPatient && (
        <ModalPortal isOpen={true} onClose={() => !invSubmitting && setInvestigatingPatient(null)}>
          <div className="transfer-modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <header className="transfer-modal-header">
              <h3>Self-Aware Investigation — {investigatingPatient.name}</h3>
              <button type="button" className="close-button" disabled={invSubmitting} onClick={() => setInvestigatingPatient(null)}>×</button>
            </header>
            <div className="transfer-modal-body">
              <div className="transfer-info-box">
                <div><strong>Patient:</strong> <span>{investigatingPatient.name}</span></div>
                <div><strong>Patient ID:</strong> <span>{investigatingPatient.patientId}</span></div>
                <div><strong>Age / Sex:</strong> <span>{investigatingPatient.age} YRS / {investigatingPatient.sex}</span></div>
                <div><strong>Phone:</strong> <span>{investigatingPatient.phone}</span></div>
                <div><strong>Branch:</strong> <span>📍 {investigatingPatient.branchName || 'Main'}</span></div>
                <div><strong>Service:</strong> <span>Self-Aware Diagnostic</span></div>
              </div>

              <div className="transfer-form-group">
                <label><strong>Reported Symptoms / Clinical Reason:</strong></label>
                <textarea
                  rows="2"
                  placeholder="Ask patient regarding their symptoms, complaints, or specific investigations requested..."
                  value={invSymptoms}
                  onChange={e => setInvSymptoms(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="transfer-form-group">
                  <label><strong>Systolic BP (mmHg):</strong></label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={invBpSystolic}
                    onChange={e => setInvBpSystolic(e.target.value)}
                  />
                </div>
                <div className="transfer-form-group">
                  <label><strong>Diastolic BP (mmHg):</strong></label>
                  <input
                    type="number"
                    placeholder="e.g. 80"
                    value={invBpDiastolic}
                    onChange={e => setInvBpDiastolic(e.target.value)}
                  />
                </div>
              </div>

              <div className="transfer-form-group">
                <label><strong>Select Laboratory Test(s):</strong></label>
                <div className="transfer-test-options" style={{ maxHeight: '220px' }}>
                  {(catalog || []).map(cat => (
                    <div key={cat._id || cat.name} style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary, #38bdf8)', padding: '2px 0' }}>
                        {cat.name}
                      </div>
                      {(cat.tests || []).map(t => {
                        const tId = idOf(t);
                        const isChecked = invSelectedTests.includes(tId);
                        return (
                          <label key={tId} className={`transfer-test-choice ${isChecked ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setInvSelectedTests(prev =>
                                  prev.includes(tId) ? prev.filter(x => x !== tId) : [...prev, tId]
                                );
                              }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <span>{t.name}</span>
                              {t.price && <small style={{ color: 'var(--text-muted, #94a3b8)' }}>{formatETB(t.price)}</small>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <footer className="transfer-modal-footer">
              <button type="button" className="secondary" disabled={invSubmitting} onClick={() => setInvestigatingPatient(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={invSubmitting || !invSelectedTests.length}
                onClick={handleSubmitInvestigation}
              >
                {invSubmitting ? 'Submitting...' : `Submit ${invSelectedTests.length} Test(s) for Payment`}
              </button>
            </footer>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLEAR TRANSFER MODAL                                               */}
      {/* ========================================================================= */}
      {clearModal.open && (
        <ModalPortal isOpen={true} onClose={() => !clearModal.busy && setClearModal({ open: false, transfer: null, busy: false, reason: '', error: '' })}>
          <div className="transfer-modal" onClick={e => e.stopPropagation()}>
            <header className="transfer-modal-header">
              <h3>Clear Transfer from Active List?</h3>
              <button type="button" className="close-button" disabled={clearModal.busy} onClick={() => setClearModal({ open: false, transfer: null, busy: false, reason: '', error: '' })}>×</button>
            </header>
            <div className="transfer-modal-body">
              <p style={{ margin: 0, color: 'var(--text-secondary, #cbd5e1)' }}>
                Clearing moves this completed record to <strong>Cleared Information</strong>. The record and full audit history are <strong>preserved</strong> and can be inspected or restored anytime.
              </p>
              <div className="transfer-form-group">
                <label><strong>Reason for Clearing (optional):</strong></label>
                <input
                  type="text"
                  placeholder="e.g. Investigation complete, result transmitted"
                  value={clearModal.reason}
                  onChange={e => setClearModal(m => ({ ...m, reason: e.target.value }))}
                />
              </div>
              {clearModal.error && <div className="alert error">{clearModal.error}</div>}
            </div>
            <footer className="transfer-modal-footer">
              <button type="button" className="secondary" disabled={clearModal.busy} onClick={() => setClearModal({ open: false, transfer: null, busy: false, reason: '', error: '' })}>
                Cancel
              </button>
              <button type="button" className="primary" disabled={clearModal.busy} onClick={handleClearTransfer}>
                {clearModal.busy ? 'Clearing...' : 'Clear Data'}
              </button>
            </footer>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AUDIT TRAIL MODAL                                                  */}
      {/* ========================================================================= */}
      {auditModal?.open && (
        <ModalPortal isOpen={true} onClose={() => setAuditModal(null)}>
          <div className="transfer-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <header className="transfer-modal-header">
              <h3>Audit Trail: {auditModal.transfer?.transferId}</h3>
              <button type="button" className="close-button" onClick={() => setAuditModal(null)}>×</button>
            </header>
            <div className="transfer-modal-body">
              {auditLoading ? (
                <p>Loading audit timeline...</p>
              ) : (
                <div className="transfer-audit-timeline">
                  {(auditModal.events || []).map((ev, i) => (
                    <div className="transfer-audit-item" key={i}>
                      <div className="audit-dot" />
                      <div className="audit-content">
                        <strong>{ev.action || ev.status}</strong>
                        <small>{new Date(ev.timestamp).toLocaleString()} · {ev.performedBy?.fullName || 'System'}</small>
                        {ev.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #cbd5e1)', margin: '2px 0 0' }}>"{ev.notes}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <footer className="transfer-modal-footer">
              <button type="button" className="secondary" onClick={() => setAuditModal(null)}>
                Close
              </button>
            </footer>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REPORT PREVIEW MODAL                                               */}
      {/* ========================================================================= */}
      {previewReport && (
        <ModalPortal isOpen={true} onClose={() => setPreviewReport(null)}>
          <div className="report-preview-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '920px', width: '95%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--modal-bg, #111a2c)', padding: '24px', borderRadius: '16px', border: '1px solid var(--modal-border, #24344d)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, color: 'var(--color-primary, #38bdf8)' }}>Laboratory Report Preview</h2>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: previewShowLogo ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', background: previewShowLogo ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)', padding: '5px 12px', borderRadius: '6px', border: `1px solid ${previewShowLogo ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.1)'}` }}>
                  <input
                    type="checkbox"
                    checked={previewShowLogo}
                    onChange={e => setPreviewShowLogo(e.target.checked)}
                  />
                  Show Logo
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: previewShowFooter ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', background: previewShowFooter ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)', padding: '5px 12px', borderRadius: '6px', border: `1px solid ${previewShowFooter ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.1)'}` }}>
                  <input
                    type="checkbox"
                    checked={previewShowFooter}
                    onChange={e => setPreviewShowFooter(e.target.checked)}
                  />
                  Show Footer
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: previewStampType === 'lab' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', background: previewStampType === 'lab' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)', padding: '5px 12px', borderRadius: '6px', border: `1px solid ${previewStampType === 'lab' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.1)'}` }}>
                  <input
                    type="checkbox"
                    checked={previewStampType === 'lab'}
                    onChange={() => setPreviewStampType(prev => prev === 'lab' ? null : 'lab')}
                  />
                  Add Lab Stamp
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: previewStampType === 'clinic' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', background: previewStampType === 'clinic' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)', padding: '5px 12px', borderRadius: '6px', border: `1px solid ${previewStampType === 'clinic' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.1)'}` }}>
                  <input
                    type="checkbox"
                    checked={previewStampType === 'clinic'}
                    onChange={() => setPreviewStampType(prev => prev === 'clinic' ? null : 'clinic')}
                  />
                  Add Clinic Stamp
                </label>
              </div>
              <button type="button" className="close-button" onClick={() => setPreviewReport(null)}>×</button>
            </div>
            <ReportPreview report={previewReport} showLogo={previewShowLogo} showFooter={previewShowFooter} stampType={previewStampType} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button type="button" className="secondary" onClick={() => setPreviewReport(null)}>Close</button>
              <button
                type="button"
                className="primary"
                onClick={() => printLabReport(previewReport, { showLogo: previewShowLogo, showFooter: previewShowFooter, stampType: previewStampType, token, user })}
              >
                🖨️ Print Report
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT REPORT MODAL                                                  */}
      {/* ========================================================================= */}
      {editingReport && (
        <ModalPortal isOpen={true} onClose={() => !isSavingReportEdit && setEditingReport(null)}>
          <div className="transfer-modal" onClick={e => e.stopPropagation()}>
            <header className="transfer-modal-header">
              <h3>Edit Report: {editingReport.reportNumber || 'Draft'}</h3>
              <button type="button" className="close-button" disabled={isSavingReportEdit} onClick={() => setEditingReport(null)}>×</button>
            </header>
            <div className="transfer-modal-body">
              <div className="transfer-form-group">
                <label><strong>Status:</strong></label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted (Pending Approval)</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="transfer-form-group">
                <label><strong>Technician Comments:</strong></label>
                <textarea
                  rows="3"
                  value={editComments}
                  onChange={e => setEditComments(e.target.value)}
                  placeholder="Enter comments or interpretations..."
                />
              </div>
            </div>
            <footer className="transfer-modal-footer">
              <button type="button" className="secondary" disabled={isSavingReportEdit} onClick={() => setEditingReport(null)}>
                Cancel
              </button>
              <button type="button" className="primary" disabled={isSavingReportEdit} onClick={handleSaveReportEdit}>
                {isSavingReportEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </footer>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE REPORT MODAL                                                */}
      {/* ========================================================================= */}
      {reportDeleteModal.open && (
        <ModalPortal isOpen={true} onClose={() => !reportDeleteModal.busy && setReportDeleteModal({ open: false, report: null, busy: false, error: '' })}>
          <div className="queue-delete-modal" onClick={e => e.stopPropagation()}>
            <header className="queue-delete-modal-header">
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <h3>Delete Laboratory Report?</h3>
            </header>
            <div className="queue-delete-modal-body">
              <p>Are you sure you want to permanently delete this report record?</p>
              {reportDeleteModal.report && (
                <div className="patient-highlight">
                  <div><strong>Report No:</strong> {reportDeleteModal.report.reportNumber || 'Draft'}</div>
                  <div><strong>Patient:</strong> {reportDeleteModal.report.patient?.name}</div>
                  <div><strong>Status:</strong> {reportDeleteModal.report.status}</div>
                </div>
              )}
              {reportDeleteModal.error && (
                <div className="alert error" style={{ marginTop: '12px' }}>
                  {reportDeleteModal.error}
                </div>
              )}
            </div>
            <footer className="queue-delete-modal-footer">
              <button
                type="button"
                className="secondary"
                disabled={reportDeleteModal.busy}
                onClick={() => setReportDeleteModal({ open: false, report: null, busy: false, error: '' })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="queue-delete-btn"
                disabled={reportDeleteModal.busy}
                onClick={handleDeleteReport}
              >
                {reportDeleteModal.busy ? 'Deleting...' : 'Delete Report'}
              </button>
            </footer>
          </div>
        </ModalPortal>
      )}

      {/* ═══ ADMIN EDIT TRANSACTION MODAL ════════════════════════════ */}
      {editingTransaction && (
        <ModalPortal isOpen={true} onClose={() => !isSavingTx && setEditingTransaction(null)}>
          <div className="transfer-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <header className="transfer-modal-header">
              <h3>✏️ Edit Money Transaction</h3>
              <button type="button" className="close-button" onClick={() => setEditingTransaction(null)} disabled={isSavingTx}>×</button>
            </header>

            <form onSubmit={handleSaveTransaction}>
              <div className="transfer-modal-body">
                {/* Transaction & Patient Info */}
                <div className="transfer-info-box" style={{ marginBottom: 16 }}>
                  <div><strong>Transaction / Receipt:</strong> <span>{editingTransaction?.transactionId || editingTransaction?.patientId}</span></div>
                  <div><strong>Patient:</strong> <span>{editingTransaction?.patientName} ({editingTransaction?.patientId})</span></div>
                  <div><strong>Original Creator:</strong> <span style={{ color: '#38bdf8', fontWeight: 600 }}>👤 {editingTransaction?.receptionist || 'Receptionist'}</span></div>
                  <div><strong>Transaction Date:</strong> <span>{editingTransaction?.paidAt ? new Date(editingTransaction.paidAt).toLocaleDateString() : '—'}</span></div>
                  <div><strong>Branch:</strong> <span>📍 {editingTransaction?.branchName || 'Main'}</span></div>
                </div>

                {/* Editable Fields */}
                <div className="transfer-form-group">
                  <label><strong>Transaction Amount (ETB) *</strong></label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editTxAmount}
                    onChange={e => setEditTxAmount(e.target.value)}
                    placeholder="Enter amount in ETB"
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="transfer-form-group">
                    <label><strong>Payment Method</strong></label>
                    <select
                      value={editTxMethod}
                      onChange={e => setEditTxMethod(e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Mobile Payment">Mobile Payment</option>
                    </select>
                  </div>

                  <div className="transfer-form-group">
                    <label><strong>Payment Status</strong></label>
                    <select
                      value={editTxStatus}
                      onChange={e => setEditTxStatus(e.target.value)}
                    >
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Waiting for Payment">Waiting for Payment</option>
                    </select>
                  </div>
                </div>

                <div className="transfer-form-group">
                  <label><strong>Administrative Reason / Notes</strong></label>
                  <textarea
                    rows={2}
                    value={editTxNotes}
                    onChange={e => setEditTxNotes(e.target.value)}
                    placeholder="Reason for modifying amount or method..."
                  />
                </div>

                <div style={{ padding: '8px 12px', background: 'rgba(2, 132, 199, 0.15)', borderRadius: 6, border: '1px solid rgba(2, 132, 199, 0.3)', fontSize: '0.8rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                  ℹ️ <strong>Automatic Recalculation:</strong> Updating this amount will automatically adjust Daily Income and financial summaries without double-counting. The original receptionist creator information is preserved.
                </div>
              </div>

              <footer className="transfer-modal-footer">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditingTransaction(null)}
                  disabled={isSavingTx}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={isSavingTx}
                  style={{ minWidth: 140 }}
                >
                  {isSavingTx ? 'Updating...' : 'Update Transaction'}
                </button>
              </footer>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* ═══ ADMIN DELETE TRANSACTION CONFIRMATION MODAL ══════════════ */}
      {deletingTransaction && (
        <ModalPortal isOpen={true} onClose={() => !isDeletingTx && setDeletingTransaction(null)}>
          <div className="queue-delete-modal" onClick={e => e.stopPropagation()}>
            <header className="queue-delete-modal-header">
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <h3>Delete Transaction?</h3>
            </header>
            <div className="queue-delete-modal-body">
              <p>Are you sure you want to delete this money transaction?</p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px' }}>
                This will update the related financial totals.
              </p>
              <div className="patient-highlight">
                <div><strong>TX / Receipt:</strong> {deletingTransaction.transactionId || deletingTransaction.patientId}</div>
                <div><strong>Patient:</strong> {deletingTransaction.patientName} ({deletingTransaction.patientId})</div>
                <div><strong>Amount:</strong> <span style={{ color: '#38bdf8', fontWeight: 700 }}>{Number(deletingTransaction.amount !== undefined ? deletingTransaction.amount : deletingTransaction.grandTotal || 0).toLocaleString()} ETB</span></div>
                <div><strong>Created By:</strong> {deletingTransaction.receptionist || 'Receptionist'}</div>
                <div><strong>Branch:</strong> {deletingTransaction.branchName || 'Main'}</div>
              </div>
            </div>
            <footer className="queue-delete-modal-footer">
              <button
                type="button"
                className="secondary"
                disabled={isDeletingTx}
                onClick={() => setDeletingTransaction(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="queue-delete-btn"
                disabled={isDeletingTx}
                onClick={handleDeleteTransaction}
              >
                {isDeletingTx ? 'Deleting...' : 'Delete'}
              </button>
            </footer>
          </div>
        </ModalPortal>
      )}

      {/* ═══ ADMIN BULK DELETE CONFIRMATION MODAL ═════════════════════ */}
      {showBulkDeleteModal && (
        <ModalPortal isOpen={true} onClose={() => !isBulkDeleting && setShowBulkDeleteModal(false)}>
          <div className="queue-delete-modal" onClick={e => e.stopPropagation()}>
            <header className="queue-delete-modal-header">
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <h3>Delete Selected Transactions?</h3>
            </header>
            <div className="queue-delete-modal-body">
              <p>
                Are you sure you want to delete <strong>{selectedTxIds.length}</strong> selected money transactions?
              </p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px' }}>
                This will update the related financial totals and permanently remove the selected records from the database.
              </p>
            </div>
            <footer className="queue-delete-modal-footer">
              <button
                type="button"
                className="secondary"
                disabled={isBulkDeleting}
                onClick={() => setShowBulkDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="queue-delete-btn"
                disabled={isBulkDeleting}
                onClick={handleBulkDeleteTransactions}
              >
                {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
              </button>
            </footer>
          </div>
        </ModalPortal>
      )}

      {/* ═══ ADMIN ADD TRANSACTION MODAL ═════════════════════════════ */}
      {addingTransaction && (
        <ModalPortal isOpen={true} onClose={() => !isAddingTx && setAddingTransaction(false)}>
          <div className="transfer-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <header className="transfer-modal-header">
              <h3>➕ Record Money Transaction</h3>
              <button type="button" className="close-button" onClick={() => setAddingTransaction(false)} disabled={isAddingTx}>×</button>
            </header>

            <form onSubmit={handleAddTransaction}>
              <div className="transfer-modal-body">
                <div className="transfer-form-group">
                  <label><strong>Patient ID or Identifier *</strong></label>
                  <input
                    type="text"
                    required
                    value={addTxPatientId}
                    onChange={e => setAddTxPatientId(e.target.value)}
                    placeholder="e.g. ETU123456 or patient database ID"
                  />
                  <small style={{ color: 'var(--text-secondary, #cbd5e1)', marginTop: 4, display: 'block' }}>Enter the Patient ID to connect this transaction to the patient's record.</small>
                </div>

                <div className="transfer-form-group">
                  <label><strong>Amount (ETB) *</strong></label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={addTxAmount}
                    onChange={e => setAddTxAmount(e.target.value)}
                    placeholder="e.g. 500"
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="transfer-form-group">
                    <label><strong>Payment Method</strong></label>
                    <select
                      value={addTxMethod}
                      onChange={e => setAddTxMethod(e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Mobile Payment">Mobile Payment</option>
                    </select>
                  </div>

                  <div className="transfer-form-group">
                    <label><strong>Branch</strong></label>
                    <select
                      value={addTxBranch}
                      onChange={e => setAddTxBranch(e.target.value)}
                    >
                      <option value="Main">Main Branch</option>
                      <option value="Otona">Otona Branch</option>
                    </select>
                  </div>
                </div>

                <div className="transfer-form-group">
                  <label><strong>Notes / Description</strong></label>
                  <textarea
                    rows={2}
                    value={addTxNotes}
                    onChange={e => setAddTxNotes(e.target.value)}
                    placeholder="Optional notes or reason for recording transaction..."
                  />
                </div>
              </div>

              <footer className="transfer-modal-footer">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setAddingTransaction(false)}
                  disabled={isAddingTx}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={isAddingTx}
                  style={{ minWidth: 130 }}
                >
                  {isAddingTx ? 'Recording...' : 'Save Transaction'}
                </button>
              </footer>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* POS Thermal 80mm Receipt Modal */}
      {posReceiptModalPatient && (
        <ThermalReceiptModal
          patientData={posReceiptModalPatient}
          total={posReceiptModalPatient.grandTotal}
          onClose={() => setPosReceiptModalPatient(null)}
          token={token}
          testCategories={catalog}
        />
      )}

      {/* Complete Waiting Payment Modal */}
      {completingPaymentPatient && (
        <ModalPortal isOpen={true} onClose={() => !isCompletingPayment && setCompletingPaymentPatient(null)}>
          <div className="transfer-modal" onClick={e => e.stopPropagation()}>
            <header className="transfer-modal-header">
              <h3>Complete Payment for {completingPaymentPatient.name}?</h3>
              <button
                type="button"
                className="close-button"
                disabled={isCompletingPayment}
                onClick={() => setCompletingPaymentPatient(null)}
              >
                ×
              </button>
            </header>

            <div className="transfer-modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>
                Confirm payment collection to mark registration as <strong>Paid</strong> and automatically dispatch investigations to laboratory queues.
              </p>

              <div className="transfer-info-box" style={{ marginTop: '12px' }}>
                <div><strong>Patient ID:</strong> <span>{completingPaymentPatient.patientId}</span></div>
                <div><strong>Patient Name:</strong> <span>{completingPaymentPatient.name}</span></div>
                <div><strong>Age / Sex:</strong> <span>{completingPaymentPatient.age} YRS / {completingPaymentPatient.sex}</span></div>
                <div><strong>Branch:</strong> <span>📍 {completingPaymentPatient.branchName || 'Main'}</span></div>
                <div>
                  <strong>Total Amount:</strong>
                  <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '1.05rem' }}>
                    {formatETB(completingPaymentPatient.grandTotal || 0)}
                  </span>
                </div>
              </div>

              <div className="transfer-form-group" style={{ marginTop: '14px' }}>
                <label><strong>Select Payment Method:</strong></label>
                <select
                  value={completingPaymentMethod}
                  onChange={e => setCompletingPaymentMethod(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="Telebirr">Telebirr</option>
                  <option value="CBE Birr">CBE Birr</option>
                  <option value="Card">Card / POS</option>
                  <option value="Other">Other Bank</option>
                </select>
              </div>
            </div>

            <footer className="transfer-modal-footer">
              <button
                type="button"
                className="secondary"
                disabled={isCompletingPayment}
                onClick={() => setCompletingPaymentPatient(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={isCompletingPayment}
                onClick={handleCompleteWaitingPayment}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  minWidth: '150px'
                }}
              >
                {isCompletingPayment ? 'Processing…' : '💳 Confirm & Print Receipt'}
              </button>
            </footer>
          </div>
        </ModalPortal>
      )}

      {/* Live Pathology Report Preview Modal */}
      {pathologyPreviewOpen && livePathologyReport && (
        <ModalPortal isOpen={true} onClose={() => setPathologyPreviewOpen(false)}>
          <div className="report-preview-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.15rem' }}>
                🔬 Pathology Report Preview · {livePathologyReport.patient?.name}
              </h3>
              <button
                type="button"
                className="secondary"
                onClick={() => setPathologyPreviewOpen(false)}
                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
              >
                Close Preview
              </button>
            </div>
            <ReportPreview
              report={livePathologyReport}
              onClose={() => setPathologyPreviewOpen(false)}
              onPrint={() => printLabReport(livePathologyReport, { showFooter: pathologyShowFooter, brandingLogo: labLogo })}
            />
          </div>
        </ModalPortal>
      )}

      {/* Live Radiology Report Preview Modal */}
      {radiologyPreviewOpen && liveRadiologyReport && (
        <ModalPortal isOpen={true} onClose={() => setRadiologyPreviewOpen(false)}>
          <div className="report-preview-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.15rem' }}>
                🩻 Radiology Report Preview · {liveRadiologyReport.patient?.name}
              </h3>
              <button
                type="button"
                className="secondary"
                onClick={() => setRadiologyPreviewOpen(false)}
                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
              >
                Close Preview
              </button>
            </div>
            <ReportPreview
              report={liveRadiologyReport}
              onClose={() => setRadiologyPreviewOpen(false)}
              onPrint={() => printLabReport(liveRadiologyReport, { showFooter: radiologyShowFooter, brandingLogo: labLogo })}
            />
          </div>
        </ModalPortal>
      )}

      {/* Admin Clinical Interpretation Library Modal */}
      {adminInterpModalOpen && (
        <ClinicalInterpretationAdminModal
          token={token}
          onClose={() => setAdminInterpModalOpen(false)}
        />
      )}

      {/* POS 80mm Continuous Thermal Receipt Modal Popup */}
      {posReceiptModalPatient && (
        <ThermalReceiptModal
          patientData={posReceiptModalPatient}
          onClose={() => setPosReceiptModalPatient(null)}
          token={token}
          testCategories={catalog || []}
          cbcGroupPrice={testSettings?.cbcGroupPrice || 150}
          urineChemicalPrice={testSettings?.urineChemicalPrice || 300}
          urineMicroscopyPrice={testSettings?.urineMicroscopyPrice || 300}
          serumElectrolytePrice={testSettings?.serumElectrolytePrice || 1000}
        />
      )}
    </section>
  );
}
