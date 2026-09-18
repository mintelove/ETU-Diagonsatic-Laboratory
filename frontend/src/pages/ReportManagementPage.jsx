import {useEffect, useMemo, useState, useCallback, useRef} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {api, isSilentNetworkError} from '../api/client.js';
import {useAuth} from '../context/AuthContext.jsx';
import {useRealtime} from '../context/RealtimeContext.jsx';
import {printLabReport} from '../utils/printLabReport.js';
import ReportPreview, { getReportTestTypes } from '../components/ReportPreview.jsx';
import {FlagBadge} from '../utils/flagHelper.jsx';
import {buildPublicReportUrl} from '../utils/publicUrlHelper.js';
import ModalPortal from '../components/ModalPortal.jsx';
import { useScrollLock } from '../utils/useScrollLock.js';

const date = value => value ? new Date(value).toLocaleString() : '—';
const statusOf = report => report.status === 'Submitted' || report.status === 'Pending' ? 'Pending Approval' : report.status;
const progress = report => {
  const total = report.results?.length || 0;
  const complete = report.results?.filter(row => String(row.result || '').trim()).length || 0;
  return total ? `${complete} of ${total} results entered` : 'No results entered';
};

function Card({ label, value, tone }) {
  return (
    <article className={`enterprise-card ${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

export default function ReportManagementPage() {
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();
  const go = useNavigate();
  const { subscribe, unsubscribe } = useRealtime();
  const isAdmin = ['Admin', 'Sub Admin'].includes(user?.role);

  const [reports, setReports] = useState([]);
  const [clearedTransfers, setClearedTransfers] = useState([]);
  const initialTab = searchParams.get('tab') || searchParams.get('status') || 'Draft';
  const [tab, setTab] = useState(initialTab);
  const [q, setQ] = useState('');
  const [range, setRange] = useState('Today');
  const [selected, setSelected] = useState(null);
  const [deptFilter, setDeptFilter] = useState('All');
  const [showReportLogo, setShowReportLogo] = useState(true);
  const [showReportFooter, setShowReportFooter] = useState(true);
  const [reportStampType, setReportStampType] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Admin Report Edit & Delete States
  const [deletingReport, setDeletingReport] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [editComments, setEditComments] = useState('');
  const [editEquipment, setEditEquipment] = useState('');
  const [editPriority, setEditPriority] = useState('Routine');
  const [editStatus, setEditStatus] = useState('Draft');
  const [editResults, setEditResults] = useState([]);
  const [editPrices, setEditPrices] = useState([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Admin Money Transactions Management States
  const [transactions, setTransactions] = useState([]);
  const [txSummary, setTxSummary] = useState({ totalTransactions: 0, totalRevenue: 0 });
  const [txLoading, setTxLoading] = useState(false);
  const [txDatePreset, setTxDatePreset] = useState('today');
  const [txCustomDate, setTxCustomDate] = useState('');
  const [txBranch, setTxBranch] = useState(user?.role === 'Admin' ? 'All' : (user?.branchName || 'Main'));
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

  useEffect(() => {
    const urlTab = searchParams.get('tab') || searchParams.get('status');
    if (urlTab && ['Draft', 'Pending', 'Approved', 'Rejected', 'Cleared', 'Transactions'].includes(urlTab)) {
      setTab(urlTab);
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    try {
      const [colData, recData] = await Promise.all([
        api('/collection/reports', { token }).catch(() => ({ reports: [] })),
        api('/reception/reports?dateFilter=all', { token }).catch(() => ({ reports: [] }))
      ]);

      const colList = Array.isArray(colData?.reports) ? colData.reports : [];
      const recList = Array.isArray(recData?.reports) ? recData.reports : [];

      const reportMap = new Map();
      colList.forEach(r => {
        if (r?._id) reportMap.set(String(r._id), r);
      });
      recList.forEach(r => {
        if (r?._id) {
          const existing = reportMap.get(String(r._id));
          reportMap.set(String(r._id), existing ? { ...existing, ...r } : r);
        }
      });

      setReports(Array.from(reportMap.values()));
    } catch (e) {
      if (!isSilentNetworkError(e)) setError(e.message);
    }
    try {
      const clearedData = await api('/transfers/cleared', { token });
      setClearedTransfers(Array.isArray(clearedData.transfers) ? clearedData.transfers : []);
    } catch (e) {
      console.warn('Cleared transfers load error:', e);
    }
  }, [token]);

  const loadTransactions = useCallback(async () => {
    if (!isAdmin) return;
    setTxLoading(true);
    try {
      let url = `/reports/transactions?branchName=${txBranch}`;
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
      setTransactions(data.transactions || []);
      setTxSummary(data.summary || {
        totalTransactions: (data.transactions || []).length,
        totalRevenue: (data.transactions || []).filter(t => t.paymentStatus === 'Paid').reduce((sum, t) => sum + (t.grandTotal || 0), 0)
      });
    } catch (e) {
      if (!isSilentNetworkError(e)) setError(e.message || 'Failed to load transactions.');
    } finally {
      setTxLoading(false);
    }
  }, [isAdmin, token, txBranch, txDatePreset, txCustomDate]);

  useEffect(() => {
    load();
    if (isAdmin) loadTransactions();
  }, [load, loadTransactions, isAdmin]);

  useEffect(() => {
    const onSync = () => {
      load();
      if (isAdmin) loadTransactions();
    };
    subscribe('reports:change', onSync);
    subscribe('reception:change', onSync);
    subscribe('transfers:change', load);
    return () => {
      unsubscribe('reports:change', onSync);
      unsubscribe('reception:change', onSync);
      unsubscribe('transfers:change', load);
    };
  }, [subscribe, unsubscribe, load, loadTransactions, isAdmin]);

  const counts = useMemo(() => ({
    Draft: reports.filter(r => r.status === 'Draft').length,
    Pending: reports.filter(r => ['Submitted', 'Pending'].includes(r.status)).length,
    Approved: reports.filter(r => ['Approved', 'Ready for Printing'].includes(r.status)).length,
    Rejected: reports.filter(r => r.status === 'Rejected').length,
    today: reports.filter(r => new Date(r.createdDate).toDateString() === new Date().toDateString()).length,
    cleared: clearedTransfers.length,
    transactions: transactions.length
  }), [reports, clearedTransfers, transactions]);

  const filtered = useMemo(() => reports.filter(r => {
    const bucket = tab === 'Pending'
      ? ['Submitted', 'Pending'].includes(r.status)
      : tab === 'Approved'
        ? ['Approved', 'Ready for Printing'].includes(r.status)
        : r.status === tab;
    if (tab === 'Approved' && deptFilter !== 'All') {
      const dept = r.department || (r.testType ? 'Pathology' : r.examinationType ? 'Radiology' : 'Laboratory');
      if (dept !== deptFilter && !(deptFilter === 'Laboratory' && dept === 'Internal Medicine')) {
        return false;
      }
    }
    const tests = (r.patient?.laboratoryTests || []).map(x => x?.name).filter(Boolean);
    const samples = (r.patient?.sampleTypes || []).map(x => x?.name).filter(Boolean);
    const examName = r.testType || r.customExaminationName || r.ultrasoundSubtype || r.examinationType || '';
    const text = `${r.patient?.name || ''} ${r.patient?.patientId || ''} ${r.patient?.barcode || ''} ${r.reportNumber || ''} ${r.caseNumber || ''} ${examName} ${tests.join(' ')} ${samples.join(' ')}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (!range || String(range).toLowerCase() === 'all') return true;
    const d = new Date(r.approvedDate || r.submittedAt || r.createdDate);
    const now = new Date();
    if (range === 'Today') return d.toDateString() === now.toDateString();
    if (range === 'Yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return d.toDateString() === y.toDateString();
    }
    if (range === 'This Week') {
      const currentDay = now.getDay();
      const diffToMon = (currentDay === 0 ? -6 : 1) - currentDay;
      const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0, 0);
      return d >= startOfThisWeek;
    }
    if (range === 'Last Week') {
      const currentDay = now.getDay();
      const diffToMon = (currentDay === 0 ? -6 : 1) - currentDay;
      const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0, 0);
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
      return d >= startOfLastWeek && d < startOfThisWeek;
    }
    return true;
  }), [reports, tab, q, range, deptFilter]);

  const filteredCleared = useMemo(() => clearedTransfers.filter(t => {
    if (!q) return true;
    const text = `${t.patient?.name || ''} ${t.patient?.patientId || ''} ${t.testName || ''} ${t.testCategory || ''} ${t.sourceBranch || ''}`.toLowerCase();
    return text.includes(q.toLowerCase());
  }), [clearedTransfers, q]);

  const filteredTransactions = useMemo(() => {
    if (!txSearch) return transactions;
    const qLower = txSearch.toLowerCase().trim();
    return transactions.filter(t => {
      const hay = `${t.transactionId || ''} ${t.patientId || ''} ${t.patientName || ''} ${t.phone || ''} ${t.receptionist || ''} ${t.paymentMethod || ''} ${t.tests || ''}`.toLowerCase();
      return hay.includes(qLower);
    });
  }, [transactions, txSearch]);

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

  const openEditModal = (r) => {
    setEditingReport(r);
    setEditComments(r.comments || '');
    setEditEquipment(Array.isArray(r.equipment) ? r.equipment.join(', ') : (r.equipment || ''));
    setEditPriority(r.priority || 'Routine');
    setEditStatus(r.status || 'Draft');
    setEditResults(
      (r.results || []).map(row => ({
        sampleName: row.sampleName || '',
        result: row.result !== undefined && row.result !== null ? String(row.result) : '',
        unit: row.unit || '',
        referenceValue: row.referenceValue || '',
        flag: row.flag || '',
        remarks: row.remarks || '',
        category: row.category || '',
        subcategory: row.subcategory || '',
        isTransferred: Boolean(row.isTransferred),
        transferredFrom: row.transferredFrom || null,
        performedAt: row.performedAt || null,
        transferId: row.transferId || null,
        testId: row.testId || null
      }))
    );
    const tests = r.patient?.laboratoryTests || r.laboratoryTests || [];
    setEditPrices(
      tests.map(t => ({
        testId: t._id || t.id || t,
        testName: t.name || 'Laboratory Test',
        category: t.category?.name || t.category || 'General',
        currentPrice: t.price !== undefined ? t.price : '',
        newPrice: t.price !== undefined ? t.price : ''
      }))
    );
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingReport) return;
    setIsSavingEdit(true);
    setError('');
    try {
      const payload = {
        comments: editComments,
        equipment: typeof editEquipment === 'string' ? editEquipment.split(',').map(x => x.trim()).filter(Boolean) : editEquipment,
        priority: editPriority,
        status: editStatus,
        results: editResults,
        testPrices: editPrices.filter(p => p.testId && p.newPrice !== '' && !isNaN(Number(p.newPrice))).map(p => ({
          testId: p.testId,
          newPrice: Number(p.newPrice)
        }))
      };

      const res = await api(`/collection/reports/${editingReport._id}`, {
        token,
        method: 'PUT',
        body: payload
      });

      setMessage(res.message || 'Report updated successfully.');
      setEditingReport(null);
      if (selected?._id === editingReport._id) {
        setSelected(res.report || null);
      }
      load();
    } catch (err) {
      if (!isSilentNetworkError(err)) setError(err.message || 'Failed to update report.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!deletingReport) return;
    setIsDeleting(true);
    setError('');
    try {
      await api(`/collection/reports/${deletingReport._id}`, { token, method: 'DELETE' });
      setMessage(`Report #${deletingReport.reportNumber || deletingReport._id} deleted successfully.`);
      const delId = deletingReport._id;
      setDeletingReport(null);
      if (selected?._id === delId) setSelected(null);
      load();
    } catch (err) {
      if (!isSilentNetworkError(err)) setError(err.message || 'Failed to delete report.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Transaction Handlers
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
      console.log('[SINGLE DELETE] Target ID:', txId);
      const res = await api(`/reports/transactions/${txId}`, {
        token,
        method: 'DELETE'
      });
      console.log('[SINGLE DELETE] Response:', res);
      setMessage(res?.message || '1 transaction deleted successfully.');
      setSelectedTxIds(prev => prev.filter(id => id !== String(txId)));
      setDeletingTransaction(null);
      await loadTransactions();
    } catch (err) {
      console.error('[SINGLE DELETE] Error:', err);
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
    console.log('[BULK DELETE] Selected IDs:', selectedTxIds);
    try {
      console.log('[BULK DELETE] Sending request for', countToDelete, 'transactions...');
      const res = await api('/reports/transactions/bulk-delete', {
        token,
        method: 'POST',
        body: JSON.stringify({
          transactionIds: selectedTxIds,
          ids: selectedTxIds
        })
      });
      console.log('[BULK DELETE] Response:', res);
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
      console.error('[BULK DELETE] Error:', err);
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
      setMessage(res?.message || 'Transaction recorded successfully.');
      setAddingTransaction(false);
      setAddTxPatientId('');
      setAddTxAmount('');
      setAddTxNotes('');
      await loadTransactions();
    } catch (err) {
      if (!isSilentNetworkError(err)) setError(err.message || 'Failed to add transaction.');
    } finally {
      setIsAddingTx(false);
    }
  };

  const restore = async (t) => {
    try {
      await api(`/transfers/${t._id}/restore`, { token, method: 'POST' });
      setMessage(`✅ Restored test for ${t.patient?.name || 'patient'} (${t.testName}) back to active Received queue.`);
      load();
    } catch (e) {
      setError(e.message || 'Failed to restore transfer.');
    }
  };

  const resume = r => go('/collection', { state: { resume: r } });

  // Compute breakdown for transactions tab
  const txCashTotal = useMemo(() => filteredTransactions.filter(t => t.paymentMethod === 'Cash' && t.paymentStatus === 'Paid').reduce((s, t) => s + (t.grandTotal || 0), 0), [filteredTransactions]);
  const txElectronicTotal = useMemo(() => filteredTransactions.filter(t => ['Card', 'Mobile Payment'].includes(t.paymentMethod) && t.paymentStatus === 'Paid').reduce((s, t) => s + (t.grandTotal || 0), 0), [filteredTransactions]);

  return (
    <section className="page collector-management">
      <header className="page-title">
        <div>
          <p className="eyebrow">Laboratory Information Management</p>
          <h1>Report &amp; Transaction Management</h1>
          <p className="intro">Track clinical laboratory reports and manage individual financial transactions with full audit control.</p>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="enterprise-grid">
        <Card label="Draft Reports" value={counts.Draft} tone="blue" />
        <Card label="Pending Approval" value={counts.Pending} tone="purple" />
        <Card label="Approved Reports" value={counts.Approved} tone="green" />
        <Card label="Rejected Reports" value={counts.Rejected} tone="orange" />
        <Card label="Reports Created Today" value={counts.today} tone="teal" />
        {isAdmin ? (
          <Card label="Money Transactions" value={counts.transactions} tone="blue" />
        ) : (
          <Card label="Cleared Transferred Info" value={counts.cleared} tone="purple" />
        )}
      </div>

      <div className="reception-tabs">
        {[
          ['Draft', 'Draft Reports'],
          ['Pending', 'Pending Approval'],
          ['Approved', 'Approved Reports'],
          ['Rejected', 'Rejected Reports'],
          ['Cleared', `Cleared Information (${clearedTransfers.length})`],
          ...(isAdmin ? [['Transactions', `💰 Money Transactions (${transactions.length})`]] : [])
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'Transactions' && isAdmin ? (
        /* ═══ ADMIN MONEY TRANSACTION MANAGEMENT SECTION ══════════════ */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem' }}>💰 Receptionist Money Transactions</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
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
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>Total Period Revenue</small>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {Number(txSummary.totalRevenue || 0).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0284c7' }}>ETB</span>
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>Cash Payments</small>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                {Number(txCashTotal).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>ETB</span>
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>Card / Mobile Payment</small>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
                {Number(txElectronicTotal).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>ETB</span>
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>Total Transactions</small>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#475569', marginTop: 4 }}>
                {filteredTransactions.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>records</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="table-title" style={{ marginTop: 0 }}>
            <div className="form-actions" style={{ width: '100%', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                style={{ flex: 1, minWidth: 240 }}
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
                placeholder="🔍 Search patient, ID, receipt, phone, or receptionist..."
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {['today', 'yesterday', 'week', 'month', 'all'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    className={`filter-chip ${txDatePreset === preset ? 'active' : ''}`}
                    onClick={() => {
                      setTxDatePreset(preset);
                      setTxCustomDate('');
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: '1px solid',
                      borderColor: txDatePreset === preset ? '#0284c7' : '#cbd5e1',
                      background: txDatePreset === preset ? '#e0f2fe' : '#ffffff',
                      color: txDatePreset === preset ? '#0369a1' : '#475569',
                      fontWeight: txDatePreset === preset ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    {preset === 'today' ? 'Today' : preset === 'yesterday' ? 'Yesterday' : preset === 'week' ? 'This Week' : preset === 'month' ? 'This Month' : 'All Time'}
                  </button>
                ))}
                {user?.role === 'Admin' && (
                  <select
                    value={txBranch}
                    onChange={e => setTxBranch(e.target.value)}
                    style={{ padding: '5px 10px', fontSize: '0.82rem', borderRadius: 8 }}
                  >
                    <option value="All">📍 All Branches</option>
                    <option value="Main">📍 Main Branch</option>
                    <option value="Otona">📍 Otona Branch</option>
                  </select>
                )}
                <button
                  type="button"
                  className="secondary"
                  onClick={loadTransactions}
                  title="Refresh Transactions"
                  style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                >
                  🔄
                </button>
              </div>
            </div>
          </div>

          {/* Transactions Table Card */}
          <section className="table-card">
            {/* Multiple Selection Action Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              background: 'var(--color-surface-container-high, #f8fafc)',
              borderBottom: '1px solid var(--table-border, #e2e8f0)',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary, #1e293b)', userSelect: 'none' }}>
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
                    color: '#0284c7',
                    background: 'var(--color-primary-container, #e0f2fe)',
                    padding: '3px 12px',
                    borderRadius: 14,
                    fontSize: '0.82rem',
                    border: '1px solid rgba(2, 132, 199, 0.3)'
                  }}>
                    {selectedTxIds.length} Selected
                  </span>
                )}
              </div>

              <button
                type="button"
                className="secondary danger"
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
                  borderRadius: 6
                }}
              >
                🗑️ Delete Selected
              </button>
            </div>

            {txLoading ? (
              <p className="empty">Loading transactions...</p>
            ) : filteredTransactions.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 960 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredTransactions.length > 0 && filteredTransactions.every(t => selectedTxIds.includes(String(t._id || t.paymentId)))}
                          onChange={toggleSelectAllTx}
                          aria-label="Select all transactions"
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0284c7' }}
                        />
                      </th>
                      <th>TX / Receipt</th>
                      <th>Date &amp; Time</th>
                      <th>Patient</th>
                      <th>Tests / Service</th>
                      <th style={{ textAlign: 'right' }}>Amount (ETB)</th>
                      <th>Method</th>
                      <th>Created By</th>
                      <th>Branch</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map(t => {
                      const txKey = String(t._id || t.paymentId);
                      const isSelected = selectedTxIds.includes(txKey);
                      return (
                      <tr key={txKey} style={{ background: isSelected ? 'rgba(2, 132, 199, 0.08)' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            value={txKey}
                            checked={isSelected}
                            onChange={() => toggleSelectTx(txKey)}
                            aria-label={`Select transaction ${t.transactionId || t.patientId}`}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0284c7' }}
                          />
                        </td>
                        <td>
                          <strong>{t.transactionId || t.patientId}</strong>
                          {t.barcode && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Barcode: {t.barcode}</div>}
                        </td>
                        <td>
                          <div>{t.paidAt ? new Date(t.paidAt).toLocaleDateString() : date(t.registrationDate)}</div>
                          <small style={{ color: '#64748b' }}>
                            {t.paidAt ? new Date(t.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </small>
                        </td>
                        <td>
                          <strong>{t.patientName}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                            {t.patientId} · {t.sex} · {t.age} YRS
                          </div>
                          {t.phone && <small style={{ color: '#64748b' }}>📞 {t.phone}</small>}
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          <span style={{ fontSize: '0.82rem', color: '#075c91', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {t.tests || 'Laboratory Order'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong style={{ fontSize: '0.95rem', color: t.paymentStatus === 'Paid' ? '#0f172a' : '#94a3b8' }}>
                            {Number(t.amount !== undefined ? t.amount : t.grandTotal || 0).toLocaleString()} ETB
                          </strong>
                          {t.lastModifiedBy && (
                            <div style={{ fontSize: '0.7rem', color: '#0284c7', fontStyle: 'italic' }}>
                              ✏️ Modified by Admin
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.78rem',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontWeight: 600,
                            background: t.paymentMethod === 'Cash' ? '#ecfdf5' : '#eff6ff',
                            color: t.paymentMethod === 'Cash' ? '#047857' : '#1d4ed8',
                            border: `1px solid ${t.paymentMethod === 'Cash' ? '#a7f3d0' : '#bfdbfe'}`
                          }}>
                            {t.paymentMethod || 'Cash'}
                          </span>
                        </td>
                        <td>
                          <strong>{t.receptionist || 'Receptionist'}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Receptionist</div>
                        </td>
                        <td>
                          <span className={`transfer-badge sent-from-${(t.branchName || '').toLowerCase()}`}>
                            📍 {t.branchName || 'Main'}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.78rem',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontWeight: 700,
                            background: t.paymentStatus === 'Paid' ? '#dcfce7' : '#fee2e2',
                            color: t.paymentStatus === 'Paid' ? '#15803d' : '#b91c1c'
                          }}>
                            {t.paymentStatus || 'Paid'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="secondary"
                              style={{ color: '#0284c7', borderColor: '#38bdf8', fontWeight: 600, padding: '4px 8px', fontSize: '0.8rem' }}
                              onClick={() => openEditTransaction(t)}
                              title="Edit Transaction Amount & Method"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="secondary danger"
                              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
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
              <p className="empty">No money transactions found for this date range or filter.</p>
            )}
          </section>
        </div>
      ) : (
        /* ═══ STANDARD REPORT MANAGEMENT TABS ══════════════════════════ */
        <div>
          <div className="table-title">
            <h2>{tab === 'Cleared' ? 'Cleared Transferred Test Information' : `${tab} reports`}</h2>
            <div className="form-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {tab === 'Approved' && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginRight: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Dept:</span>
                  {['All', 'Laboratory', 'Pathology', 'Radiology'].map(d => (
                    <button
                      key={d}
                      type="button"
                      className={`filter-chip ${deptFilter === d ? 'active' : ''}`}
                      onClick={() => setDeptFilter(d)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        borderRadius: '16px',
                        border: '1px solid',
                        borderColor: deptFilter === d ? '#0284c7' : 'var(--card-border, #cbd5e1)',
                        background: deptFilter === d ? '#e0f2fe' : 'transparent',
                        color: deptFilter === d ? '#0369a1' : 'var(--text-primary)',
                        fontWeight: deptFilter === d ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {d === 'Pathology' ? '🔬 ' : d === 'Radiology' ? '🩻 ' : d === 'Laboratory' ? '🧪 ' : ''}{d}
                    </button>
                  ))}
                </div>
              )}
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search patient, ID, barcode or test/sample"
              />
              <select value={range} onChange={e => setRange(e.target.value)}>
                <option>All</option>
                <option>Today</option>
                <option>Yesterday</option>
                <option>This Week</option>
                <option>Last Week</option>
              </select>
            </div>
          </div>

          <section className="table-card">
            {tab === 'Cleared' ? (
              filteredCleared.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Test / Category</th>
                      <th>Sent From</th>
                      <th>Cleared Date &amp; Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCleared.map(t => (
                      <tr key={t._id}>
                        <td>
                          <strong>{t.patient?.name}</strong>
                          <span>{t.patient?.patientId} · {t.patient?.sex} · {t.patient?.age} YRS</span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-primary)' }}>{t.testName}</strong>
                          <span>{t.testCategory || 'General'}</span>
                        </td>
                        <td>
                          <span className={`transfer-badge sent-from-${(t.sourceBranch || '').toLowerCase()}`}>
                            📍 {t.sourceBranch}
                          </span>
                        </td>
                        <td>
                          <div>{t.clearedAt ? new Date(t.clearedAt).toLocaleString() : '—'}</div>
                          <small style={{ color: '#64748b', fontStyle: 'italic' }}>{t.clearedReason || 'No reason specified'}</small>
                        </td>
                        <td>
                          <span className={`transfer-status-badge status-${(t.status || '').toLowerCase()}`}>
                            {t.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="primary"
                            style={{ fontSize: '0.82rem', padding: '6px 12px', background: '#0284c7', borderColor: '#0369a1', color: '#fff', fontWeight: 600 }}
                            onClick={() => restore(t)}
                            title="Restore this test back to active Received queue with partial results intact"
                          >
                            ↩ Add Back to Received
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty">No cleared transfer records found.</p>
              )
            ) : filtered.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>{tab === 'Approved' ? 'Department & Examination' : 'Barcode / Tests'}</th>
                    <th>Status</th>
                    <th>
                      {tab === 'Draft' ? 'Progress' : tab === 'Approved' ? 'Approved by' : tab === 'Rejected' ? 'Rejection reason' : 'Submitted'}
                    </th>
                    <th>Last saved / activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const desc = getReportTestTypes(r).formattedNames;
                    const dept = r.department || (r.testType ? 'Pathology' : r.examinationType ? 'Radiology' : 'Laboratory');
                    const isPath = dept === 'Pathology';
                    const isRad = dept === 'Radiology';
                    const examName = r.testType || r.customExaminationName || r.ultrasoundSubtype || r.examinationType || desc;

                    return (
                      <tr key={r._id}>
                        <td>
                          <strong>{r.patient?.name}</strong>
                          <span>{r.patient?.patientId}</span>
                        </td>
                        <td>
                          {isPath || isRad ? (
                            <div>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: isPath ? '#fef3c7' : '#e0f2fe',
                                color: isPath ? '#92400e' : '#0369a1',
                                marginBottom: '2px'
                              }}>
                                {isPath ? '🔬 Pathology' : '🩻 Radiology'}
                              </span>
                              <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.88rem' }}>
                                {examName}
                              </div>
                            </div>
                          ) : (
                            <>
                              {r.patient?.barcode || '—'}
                              <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{desc}</span>
                            </>
                          )}
                        </td>
                        <td>{statusOf(r)}</td>
                        <td>
                          {tab === 'Draft'
                            ? progress(r)
                            : tab === 'Approved'
                              ? (r.approvedBy?.fullName ? `Dr. ${r.approvedBy.fullName}` : (r.pathologist?.fullName ? `Dr. ${r.pathologist.fullName}` : (r.radiologist?.fullName ? `Dr. ${r.radiologist.fullName}` : '—')))
                              : tab === 'Rejected'
                                ? <strong className="danger">{r.rejectionReason}</strong>
                                : date(r.submittedAt || r.submittedDate)}
                        </td>
                        <td>{date(r.lastSavedAt || r.updatedDate || r.approvedDate)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => { setSelected(r); setReportStampType(r.stampType || null); }}
                            >
                              {tab === 'Draft' ? 'View Draft' : '👁️ View Report'}
                            </button>
                            {tab === 'Approved' && (
                              <button
                                type="button"
                                className="secondary"
                                style={{ color: '#059669', borderColor: '#34d399', fontWeight: 600 }}
                                onClick={() => printLabReport(r, { showLogo: showReportLogo, showFooter: showReportFooter, stampType: reportStampType, token, user })}
                                title="Print Approved A4 Report"
                              >
                                🖨️ Print
                              </button>
                            )}
                            {tab === 'Draft' && (
                              <button type="button" className="primary" onClick={() => resume(r)}>
                                ▶ Continue
                              </button>
                            )}
                            {tab === 'Rejected' && (
                              <button type="button" className="primary" onClick={() => resume(r)}>
                                Continue &amp; Generate
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                className="secondary"
                                style={{ color: '#0284c7', borderColor: '#38bdf8', fontWeight: 600 }}
                                onClick={() => openEditModal(r)}
                                title="Edit Report Details & Prices"
                              >
                                ✏️ Edit
                              </button>
                            )}
                            {(isAdmin || tab === 'Draft') && (
                              <button
                                type="button"
                                className="secondary danger"
                                onClick={() => setDeletingReport(r)}
                                title="Delete this report"
                              >
                                🗑️ Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="empty">No reports match this view.</p>
            )}
          </section>
        </div>
      )}

      {/* VIEW REPORT MODAL */}
      <ModalPortal isOpen={!!selected} onClose={() => setSelected(null)}>
        <div className="modal-content" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
          <header className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>Laboratory Report</h2>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <input
                  type="checkbox"
                  checked={showReportLogo}
                  onChange={e => setShowReportLogo(e.target.checked)}
                />
                Show Logo
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <input
                  type="checkbox"
                  checked={showReportFooter}
                  onChange={e => setShowReportFooter(e.target.checked)}
                />
                Show Footer
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: reportStampType === 'lab' ? '#0284c7' : '#334155', cursor: 'pointer', background: reportStampType === 'lab' ? '#e0f2fe' : '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${reportStampType === 'lab' ? '#0284c7' : '#cbd5e1'}` }}>
                <input
                  type="checkbox"
                  checked={reportStampType === 'lab'}
                  onChange={() => setReportStampType(prev => prev === 'lab' ? null : 'lab')}
                />
                Add Stamp for Lab
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: reportStampType === 'clinic' ? '#0284c7' : '#334155', cursor: 'pointer', background: reportStampType === 'clinic' ? '#e0f2fe' : '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${reportStampType === 'clinic' ? '#0284c7' : '#cbd5e1'}` }}>
                <input
                  type="checkbox"
                  checked={reportStampType === 'clinic'}
                  onChange={() => setReportStampType(prev => prev === 'clinic' ? null : 'clinic')}
                />
                Add Stamp for Clinic
              </label>
            </div>
            <button type="button" className="close-button" onClick={() => setSelected(null)}>×</button>
          </header>
          <div className="modal-body">
            {selected?.rejectionReason && (
              <div className="alert error">
                <strong>Rejection reason:</strong>&nbsp;{selected.rejectionReason}
              </div>
            )}
            <ReportPreview report={selected} showLogo={showReportLogo} showFooter={showReportFooter} stampType={reportStampType} />
          </div>
          <div className="form-actions" style={{ padding: '14px 24px', borderTop: '1px solid var(--color-outline-variant, #e2e8f0)', marginTop: 0, display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  try {
                    printLabReport(selected, { showLogo: showReportLogo, showFooter: showReportFooter, stampType: reportStampType, token, user });
                  } catch (e) {
                    if (!isSilentNetworkError(e)) setError(e.message);
                  }
                }}
              >
                🖨 Print Report
              </button>
              {['Approved', 'Ready for Printing'].includes(selected?.status) && (
                <button
                  type="button"
                  className="primary"
                  onClick={async () => {
                    let tok = selected?.publicReport?.token;
                    if (!tok && selected?._id) {
                      try {
                        const res = await api(`/final-reports/${selected._id}/public-link`, { token });
                        if (res?.token) tok = res.token;
                      } catch (err) {}
                    }
                    if (tok) {
                      const link = buildPublicReportUrl(tok, reportStampType);
                      navigator.clipboard.writeText(link);
                      setMessage('Public report link copied to clipboard!');
                    }
                  }}
                >
                  📋 Copy Share Link
                </button>
              )}
              {isAdmin && (
                <>
                  <button
                    type="button"
                    className="secondary"
                    style={{ color: '#0284c7', borderColor: '#38bdf8', fontWeight: 600 }}
                    onClick={() => {
                      const rep = selected;
                      setSelected(null);
                      openEditModal(rep);
                    }}
                  >
                    ✏️ Edit Report
                  </button>
                  <button
                    type="button"
                    className="secondary danger"
                    onClick={() => {
                      const rep = selected;
                      setDeletingReport(rep);
                    }}
                  >
                    🗑️ Delete Report
                  </button>
                </>
              )}
            </div>
            <button type="button" className="secondary" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      </ModalPortal>

      {/* ADMIN EDIT REPORT MODAL */}
      <ModalPortal isOpen={!!editingReport} onClose={() => !isSavingEdit && setEditingReport(null)}>
        <div className="modal-content" style={{ maxWidth: 960, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
          <header className="modal-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                ✏️ Edit Laboratory Report — {editingReport?.reportNumber || 'Draft'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Patient: <strong>{editingReport?.patient?.name}</strong> ({editingReport?.patient?.patientId}) · Barcode: {editingReport?.patient?.barcode || '—'}
              </p>
            </div>
            <button type="button" className="close-button" onClick={() => setEditingReport(null)} disabled={isSavingEdit}>×</button>
          </header>

          <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="modal-body" style={{ overflowY: 'auto', padding: '16px 24px', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Report Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    disabled={!isAdmin}
                    style={{ width: '100%', padding: '6px 10px' }}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted (Pending Approval)</option>
                    <option value="Pending">Pending Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Ready for Printing">Ready for Printing</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Priority</label>
                  <select
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px' }}
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Equipment Used</label>
                  <input
                    type="text"
                    value={editEquipment}
                    onChange={e => setEditEquipment(e.target.value)}
                    placeholder="e.g. Mindray BS120, BC3000"
                    style={{ width: '100%', padding: '6px 10px' }}
                  />
                </div>
              </div>

              {isAdmin && editPrices.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.9rem', color: '#1e293b' }}>
                    💰 Test Pricing &amp; Billing (Admin)
                  </label>
                  <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 6, border: '1px solid #bfdbfe', fontSize: '0.8rem', color: '#1e40af', marginBottom: 10 }}>
                    ℹ️ <strong>Financial Preservation:</strong> Historical payment transactions and completed receipts remain strictly unchanged. If this patient has an unpaid balance, modifying test prices will recalculate the order balance.
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Test Name</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Category</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Current Price</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>New Price (ETB)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editPrices.map((p, pIdx) => (
                          <tr key={p.testId || pIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 500 }}>{p.testName}</td>
                            <td style={{ padding: '6px 10px', color: '#64748b' }}>{p.category}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', color: '#475569' }}>
                              {p.currentPrice !== '' ? `${Number(p.currentPrice).toLocaleString()} ETB` : '—'}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={p.newPrice}
                                onChange={e => {
                                  const val = e.target.value;
                                  setEditPrices(prev => {
                                    const updated = [...prev];
                                    updated[pIdx] = { ...updated[pIdx], newPrice: val };
                                    return updated;
                                  });
                                }}
                                style={{ width: 110, padding: '4px 8px', textAlign: 'right', fontSize: '0.85rem' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.9rem', color: '#1e293b' }}>
                  🧪 Parameter Results &amp; Reference Ranges
                </label>
                <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Parameter / Test</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Result Value</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Unit</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Reference Range</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Flag</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editResults.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px' }}>
                            <strong>{row.sampleName}</strong>
                            {row.category && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.category}</div>}
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <input
                              type="text"
                              value={row.result}
                              onChange={e => {
                                const val = e.target.value;
                                setEditResults(prev => {
                                  const updated = [...prev];
                                  updated[idx] = { ...updated[idx], result: val };
                                  return updated;
                                });
                              }}
                              style={{ width: '100%', minWidth: 80, padding: '4px 8px', fontSize: '0.85rem' }}
                              placeholder="Result"
                            />
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <input
                              type="text"
                              value={row.unit}
                              onChange={e => {
                                const val = e.target.value;
                                setEditResults(prev => {
                                  const updated = [...prev];
                                  updated[idx] = { ...updated[idx], unit: val };
                                  return updated;
                                });
                              }}
                              style={{ width: '100%', minWidth: 60, padding: '4px 8px', fontSize: '0.85rem' }}
                              placeholder="Unit"
                            />
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <input
                              type="text"
                              value={row.referenceValue}
                              onChange={e => {
                                const val = e.target.value;
                                setEditResults(prev => {
                                  const updated = [...prev];
                                  updated[idx] = { ...updated[idx], referenceValue: val };
                                  return updated;
                                });
                              }}
                              style={{ width: '100%', minWidth: 80, padding: '4px 8px', fontSize: '0.85rem' }}
                              placeholder="Ref range"
                            />
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <select
                              value={row.flag}
                              onChange={e => {
                                const val = e.target.value;
                                setEditResults(prev => {
                                  const updated = [...prev];
                                  updated[idx] = { ...updated[idx], flag: val };
                                  return updated;
                                });
                              }}
                              style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                            >
                              <option value="">(None)</option>
                              <option value="Normal">Normal</option>
                              <option value="High">High</option>
                              <option value="Low">Low</option>
                              <option value="Critical High">Critical High (CH)</option>
                              <option value="Critical Low">Critical Low (CL)</option>
                            </select>
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <input
                              type="text"
                              value={row.remarks}
                              onChange={e => {
                                const val = e.target.value;
                                setEditResults(prev => {
                                  const updated = [...prev];
                                  updated[idx] = { ...updated[idx], remarks: val };
                                  return updated;
                                });
                              }}
                              style={{ width: '100%', minWidth: 80, padding: '4px 8px', fontSize: '0.85rem' }}
                              placeholder="Remarks"
                            />
                          </td>
                        </tr>
                      ))}
                      {editResults.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                            No individual parameter results recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                  Comments / Clinical Observations
                </label>
                <textarea
                  rows={3}
                  value={editComments}
                  onChange={e => setEditComments(e.target.value)}
                  placeholder="Enter clinical comments or impressions..."
                  style={{ width: '100%', padding: '8px 10px', fontSize: '0.88rem', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <footer className="form-actions" style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setEditingReport(null)}
                disabled={isSavingEdit}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary"
                disabled={isSavingEdit}
                style={{ minWidth: 120 }}
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </footer>
          </form>
        </div>
      </ModalPortal>

      {/* DELETE REPORT CONFIRMATION MODAL */}
      <ModalPortal isOpen={!!deletingReport} onClose={() => !isDeleting && setDeletingReport(null)}>
        <div
          className="modal-content delete-confirm-modal"
          style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
            <div className="delete-confirm-icon">
              ⚠️
            </div>
            <h3 className="delete-confirm-title">
              Delete Report?
            </h3>
            <p className="delete-confirm-body">
              This action will remove the selected report and update all related system records.
            </p>
            {deletingReport && (
              <div className="delete-confirm-details">
                <div><strong>Patient:</strong> {deletingReport.patient?.name} ({deletingReport.patient?.patientId})</div>
                <div><strong>Report #:</strong> {deletingReport.reportNumber || deletingReport._id}</div>
                <div><strong>Status:</strong> {deletingReport.status}</div>
              </div>
            )}
          </div>
          <div className="delete-confirm-footer">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={() => setDeletingReport(null)}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="modal-danger-btn"
              onClick={handleDeleteReport}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* ═══ ADMIN EDIT TRANSACTION MODAL ════════════════════════════ */}
      <ModalPortal isOpen={!!editingTransaction} onClose={() => !isSavingTx && setEditingTransaction(null)}>
        <div className="modal-content" style={{ maxWidth: 520, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
          <header className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
              ✏️ Edit Money Transaction
            </h3>
            <button type="button" className="close-button" onClick={() => setEditingTransaction(null)} disabled={isSavingTx}>×</button>
          </header>

          <form onSubmit={handleSaveTransaction}>
            <div className="modal-body" style={{ padding: '20px' }}>
              {/* Transaction & Patient Info */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, fontSize: '0.86rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Transaction / Receipt:</span>
                  <strong>{editingTransaction?.transactionId}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Patient:</span>
                  <strong>{editingTransaction?.patientName} ({editingTransaction?.patientId})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Original Creator:</span>
                  <span style={{ fontWeight: 600, color: '#075c91' }}>
                    👤 {editingTransaction?.receptionist || 'Receptionist'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Transaction Date:</span>
                  <span>{editingTransaction?.paidAt ? new Date(editingTransaction.paidAt).toLocaleDateString() : '—'}</span>
                </div>
              </div>

              {/* Editable Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, color: '#1e293b' }}>
                    Transaction Amount (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editTxAmount}
                    onChange={e => setEditTxAmount(e.target.value)}
                    placeholder="Enter amount in ETB"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.95rem', fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, color: '#1e293b' }}>
                      Payment Method
                    </label>
                    <select
                      value={editTxMethod}
                      onChange={e => setEditTxMethod(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.88rem' }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Mobile Payment">Mobile Payment</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, color: '#1e293b' }}>
                      Payment Status
                    </label>
                    <select
                      value={editTxStatus}
                      onChange={e => setEditTxStatus(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.88rem' }}
                    >
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Waiting for Payment">Waiting for Payment</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, color: '#1e293b' }}>
                    Administrative Reason / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={editTxNotes}
                    onChange={e => setEditTxNotes(e.target.value)}
                    placeholder="Reason for modifying amount or method..."
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 6, border: '1px solid #bfdbfe', fontSize: '0.78rem', color: '#1e40af' }}>
                  ℹ️ <strong>Automatic Recalculation:</strong> Updating this amount will automatically adjust Daily Income and financial summaries without double-counting. The original receptionist creator information is preserved.
                </div>
              </div>
            </div>

            <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
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

      {/* ═══ ADMIN DELETE TRANSACTION CONFIRMATION MODAL ══════════════ */}
      <ModalPortal isOpen={!!deletingTransaction} onClose={() => !isDeletingTx && setDeletingTransaction(null)}>
        <div
          className="modal-content delete-confirm-modal"
          style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
            <div className="delete-confirm-icon">
              ⚠️
            </div>
            <h3 className="delete-confirm-title">
              Delete Transaction?
            </h3>
            <p className="delete-confirm-body">
              Are you sure you want to delete this money transaction?
            </p>
            <p className="delete-confirm-subtext">
              This will update the related financial totals.
            </p>
            {deletingTransaction && (
              <div className="delete-confirm-details">
                <div><strong>TX / Receipt:</strong> {deletingTransaction.transactionId}</div>
                <div><strong>Patient:</strong> {deletingTransaction.patientName} ({deletingTransaction.patientId})</div>
                <div><strong>Amount:</strong> <span style={{ color: '#0284c7', fontWeight: 700 }}>{Number(deletingTransaction.amount !== undefined ? deletingTransaction.amount : deletingTransaction.grandTotal || 0).toLocaleString()} ETB</span></div>
                <div><strong>Created By:</strong> {deletingTransaction.receptionist || 'Receptionist'}</div>
                <div><strong>Branch:</strong> {deletingTransaction.branchName}</div>
              </div>
            )}
          </div>
          <div className="delete-confirm-footer">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={() => setDeletingTransaction(null)}
              disabled={isDeletingTx}
            >
              Cancel
            </button>
            <button
              type="button"
              className="modal-danger-btn"
              onClick={handleDeleteTransaction}
              disabled={isDeletingTx}
            >
              {isDeletingTx ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* ═══ ADMIN BULK DELETE CONFIRMATION MODAL ═════════════════════ */}
      <ModalPortal isOpen={showBulkDeleteModal} onClose={() => !isBulkDeleting && setShowBulkDeleteModal(false)}>
        <div
          className="modal-content delete-confirm-modal"
          style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
            <div className="delete-confirm-icon">
              ⚠️
            </div>
            <h3 className="delete-confirm-title">
              Delete Selected Transactions?
            </h3>
            <p className="delete-confirm-body">
              Are you sure you want to delete {selectedTxIds.length} selected money transactions?
            </p>
            <p className="delete-confirm-subtext">
              This will update the related financial totals.
            </p>
          </div>
          <div className="delete-confirm-footer">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={() => setShowBulkDeleteModal(false)}
              disabled={isBulkDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="modal-danger-btn"
              onClick={handleBulkDeleteTransactions}
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* ═══ ADMIN ADD TRANSACTION MODAL ═════════════════════════════ */}
      <ModalPortal isOpen={addingTransaction} onClose={() => !isAddingTx && setAddingTransaction(false)}>
        <div className="modal-content" style={{ maxWidth: 500, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
          <header className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
              ➕ Record Money Transaction
            </h3>
            <button type="button" className="close-button" onClick={() => setAddingTransaction(false)} disabled={isAddingTx}>×</button>
          </header>

          <form onSubmit={handleAddTransaction}>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, color: '#1e293b' }}>
                    Patient ID or Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    value={addTxPatientId}
                    onChange={e => setAddTxPatientId(e.target.value)}
                    placeholder="e.g. ETU123456 or patient database ID"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem' }}
                  />
                  <small style={{ color: '#64748b' }}>Enter the Patient ID to connect this transaction to the patient's record.</small>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, color: '#1e293b' }}>
                    Amount (ETB) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={addTxAmount}
                    onChange={e => setAddTxAmount(e.target.value)}
                    placeholder="e.g. 500"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.95rem', fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, color: '#1e293b' }}>
                      Payment Method
                    </label>
                    <select
                      value={addTxMethod}
                      onChange={e => setAddTxMethod(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.88rem' }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Mobile Payment">Mobile Payment</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, color: '#1e293b' }}>
                      Branch
                    </label>
                    <select
                      value={addTxBranch}
                      onChange={e => setAddTxBranch(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.88rem' }}
                    >
                      <option value="Main">Main Branch</option>
                      <option value="Otona">Otona Branch</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, color: '#1e293b' }}>
                    Notes / Description
                  </label>
                  <textarea
                    rows={2}
                    value={addTxNotes}
                    onChange={e => setAddTxNotes(e.target.value)}
                    placeholder="Optional notes or reason for recording transaction..."
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            </div>

            <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
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
    </section>
  );
}
