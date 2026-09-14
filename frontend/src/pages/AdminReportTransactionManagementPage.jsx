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
import '../styles/pages/collection-queue.css';

const emptyReport = {
  equipment: [],
  results: [],
  comments: '',
  sampleCollectorComments: [],
  testInterpretations: []
};

const idOf = value => String(value?._id || value?.id || value);

function matchesReportPeriod(report, period) {
  if (!period || period === 'all') return true;
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
  if (period === 'lastweek' || period === 'lastWeek' || period === 'last week') {
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const thisMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0, 0);
    const fromDate = new Date(thisMon);
    fromDate.setDate(fromDate.getDate() - 7);
    const toDate = new Date(thisMon);
    toDate.setDate(toDate.getDate() - 1);
    toDate.setHours(23, 59, 59, 999);
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

export default function AdminReportTransactionManagementPage() {
  const { token, user } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();

  const isSuperAdmin = user?.role === 'Admin' || user?.isCEO || user?.branchName === 'All';
  const [selectedBranch, setSelectedBranch] = useState(isSuperAdmin ? 'All' : (user?.branchName || 'Main'));

  const [searchParams, setSearchParams] = useSearchParams();

  // Main navigation tab
  const [activeTab, setActiveTab] = useState('queue');

  // Approved & Pending dedicated view states
  const [approvedPeriod, setApprovedPeriod] = useState('all');
  const [approvedSearch, setApprovedSearch] = useState('');
  const [pendingPeriod, setPendingPeriod] = useState('all');
  const [pendingSearch, setPendingSearch] = useState('');

  // Auto-select view based on URL query parameter (?view=approved, ?view=pending, or ?view=transactions)
  useEffect(() => {
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
    Boolean(addingTransaction)
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

  // Global load trigger
  const loadAll = useCallback(() => {
    loadQueue();
    loadTransfers();
    loadInvestigation();
    loadReports();
    loadCleared();
    loadTransactions();
  }, [loadQueue, loadTransfers, loadInvestigation, loadReports, loadCleared, loadTransactions]);

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
    };

    subscribe('collection:change', handleCollectionSync);
    subscribe('transfers:change', handleTransferSync);
    subscribe('reports:change', handleReportSync);
    subscribe('reception:change', handleReceptionSync);

    return () => {
      unsubscribe('collection:change', handleCollectionSync);
      unsubscribe('transfers:change', handleTransferSync);
      unsubscribe('reports:change', handleReportSync);
      unsubscribe('reception:change', handleReceptionSync);
    };
  }, [subscribe, unsubscribe, loadQueue, loadTransfers, loadInvestigation, loadReports, loadCleared, loadTransactions]);

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
    <section className="page collection-page collector-page">
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
      </header>

      {/* Global Alerts */}
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

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
              ['all', 'All'],
              ['today', "Today's"],
              ['lastWeek', 'Last Week'],
              ['lastMonth', 'Last Month']
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
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
                            <strong>{t.receptionist || 'Receptionist'}</strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #cbd5e1)' }}>Receptionist</div>
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
    </section>
  );
}
