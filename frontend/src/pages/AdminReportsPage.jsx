/**
 * ETU Diagnostic Laboratory — Admin Internal Reports Page
 *
 * Provides real-time query filtering for internal laboratory transactions by:
 * - Single Date calendar picker
 * - Date Range (From Date -> To Date inclusive)
 * - Receptionist account dropdown
 * - Sample Collector account dropdown
 *
 * Supports PDF export and print preview with official laboratory logo and summary totals.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { isSilentNetworkError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { FlagBadge } from '../utils/flagHelper.jsx';

import { useScrollLock } from '../utils/useScrollLock.js';
import ModalPortal from '../components/ModalPortal.jsx';
import { formatETB } from '../utils/currencyHelper.js';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { getTransfers, getTransferAudit } from '../services/transferService.js';
import ReportPreview from '../components/ReportPreview.jsx';
import printLabReport from '../utils/printLabReport.js';
import '../styles/pages/collection-queue.css';

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function safe(val) {
  return String(val ?? '—').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

export default function AdminReportsPage() {
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();
  const isSubAdmin = user?.role === 'Sub Admin' || (user?.role && user.role.toLowerCase().includes('sub admin'));
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'transfers'
  const [reportMode, setReportMode] = useState(isSubAdmin ? 'range' : (searchParams.get('mode') || 'single')); // 'single' | 'range'
  const [date, setDate] = useState(() => searchParams.get('date') || toISO(new Date()));

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return toISO(d);
  });
  const [dateTo, setDateTo] = useState(toISO(new Date()));
  const [receptionist, setReceptionist] = useState('all');
  const [collector, setCollector] = useState('all');
  const [branchName, setBranchName] = useState(isSubAdmin ? (user?.branchName || 'Main') : 'all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Admin Money Transaction Selection & Deletion State
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);
  const [txActionMsg, setTxActionMsg] = useState('');
  const selectAllRef = useRef(null);

  const canManageTransactions = user?.role === 'Admin' || user?.role === 'Sub Admin';

  // Cross-Branch Transfers State
  const [transfers, setTransfers] = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [transfersError, setTransfersError] = useState('');
  const [directionFilter, setDirectionFilter] = useState('All');
  const [transferStatusFilter, setTransferStatusFilter] = useState('All');
  const [transferSearch, setTransferSearch] = useState('');
  const [selectedAuditTransfer, setSelectedAuditTransfer] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);
  const [previewShowLogo, setPreviewShowLogo] = useState(true);
  const [previewShowFooter, setPreviewShowFooter] = useState(true);
  const [previewStampType, setPreviewStampType] = useState(null);

  useScrollLock(!!selectedTransaction || !!selectedAuditTransfer || !!previewReport || !!deletingTransaction || showBulkDeleteModal);

  /* ── Date Range Validation ───────────────────────────── */
  useEffect(() => {
    if (!isSubAdmin && reportMode === 'range' && dateFrom && dateTo && dateFrom > dateTo) {
      setValidationError('From Date cannot be later than To Date.');
    } else {
      setValidationError('');
    }
  }, [reportMode, dateFrom, dateTo, isSubAdmin]);

  /* ── Load Transaction Report ────────────────────────── */
  const loadReport = useCallback(async () => {
    if (!isSubAdmin && reportMode === 'range' && dateFrom && dateTo && dateFrom > dateTo) {
      setValidationError('From Date cannot be later than To Date.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setValidationError('');
      const params = {
        mode: isSubAdmin ? 'range' : reportMode,
        receptionist,
        collector
      };
      params.branchName = isSubAdmin ? (user?.branchName || 'Main') : (branchName !== 'all' ? branchName : undefined);

      if (!isSubAdmin) {
        if (reportMode === 'range') {
          params.dateFrom = dateFrom;
          params.dateTo = dateTo;
        } else {
          params.date = date;
        }
      }

      const res = await api.get('/reports/transactions', { params });
      setData(res.data);
    } catch (err) {
      if (!isSilentNetworkError(err)) setError(err.response?.data?.message || err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [reportMode, date, dateFrom, dateTo, receptionist, collector, branchName, isSubAdmin, user]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadReport();
    }
  }, [activeTab, loadReport]);

  /* ── Checkbox Indeterminate & Selection State Sync ─────── */
  useEffect(() => {
    if (!selectAllRef.current) return;
    const currentTxList = data?.transactions || [];
    if (currentTxList.length === 0) {
      selectAllRef.current.checked = false;
      selectAllRef.current.indeterminate = false;
      return;
    }
    const visibleIds = currentTxList.map(t => String(t._id || t.paymentId));
    const selectedCount = visibleIds.filter(id => selectedTxIds.includes(id)).length;
    if (selectedCount === 0) {
      selectAllRef.current.checked = false;
      selectAllRef.current.indeterminate = false;
    } else if (selectedCount === visibleIds.length) {
      selectAllRef.current.checked = true;
      selectAllRef.current.indeterminate = false;
    } else {
      selectAllRef.current.checked = false;
      selectAllRef.current.indeterminate = true;
    }
  }, [selectedTxIds, data?.transactions]);

  const toggleSelectTx = (id) => {
    const sId = String(id);
    setSelectedTxIds(prev =>
      prev.includes(sId) ? prev.filter(x => x !== sId) : [...prev, sId]
    );
  };

  const toggleSelectAllTx = () => {
    const currentTxList = data?.transactions || [];
    if (!currentTxList.length) return;
    const visibleIds = currentTxList.map(t => String(t._id || t.paymentId));
    const allSelected = visibleIds.every(id => selectedTxIds.includes(id));
    if (allSelected) {
      setSelectedTxIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedTxIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return;
    try {
      setIsDeletingTx(true);
      const txId = deletingTransaction._id || deletingTransaction.paymentId || deletingTransaction.transactionId;
      console.log('[SINGLE DELETE] Target ID:', txId);
      const res = await api.delete(`/reports/transactions/${txId}`);
      console.log('[SINGLE DELETE] Response:', res.data);
      setSelectedTxIds(prev => prev.filter(id => id !== String(deletingTransaction._id || deletingTransaction.paymentId)));
      setDeletingTransaction(null);
      setTxActionMsg(res.data?.message || 'Transaction deleted successfully.');
      setTimeout(() => setTxActionMsg(''), 5000);
      await loadReport();
    } catch (err) {
      console.error('[SINGLE DELETE] Error:', err);
      alert(err.response?.data?.message || err.message || 'Failed to delete transaction');
    } finally {
      setIsDeletingTx(false);
    }
  };

  const handleBulkDeleteTransactions = async () => {
    if (!selectedTxIds.length) return;
    try {
      setIsDeletingTx(true);
      const countToDelete = selectedTxIds.length;
      console.log('[BULK DELETE] Selected IDs:', selectedTxIds);
      console.log('[BULK DELETE] Sending request for', countToDelete, 'transactions...');
      const res = await api.post('/reports/transactions/bulk-delete', {
        transactionIds: selectedTxIds,
        ids: selectedTxIds
      });
      console.log('[BULK DELETE] Response:', res.data);
      if (res.data?.success === false || res.data?.deletedCount === 0) {
        alert(res.data?.message || 'No matching transactions were found or deleted.');
        return;
      }
      const count = res.data?.deletedCount || countToDelete;
      setSelectedTxIds([]);
      setShowBulkDeleteModal(false);
      setTxActionMsg(`${count} money transactions deleted successfully. Financial totals have been updated.`);
      setTimeout(() => setTxActionMsg(''), 5000);
      await loadReport();
    } catch (err) {
      console.error('[BULK DELETE] Error:', err);
      alert(err.response?.data?.message || err.message || 'Failed to bulk delete transactions');
    } finally {
      setIsDeletingTx(false);
    }
  };

  /* ── Load Cross-Branch Transfers ─────────────────────── */
  const loadTransfers = useCallback(async () => {
    try {
      setTransfersLoading(true);
      setTransfersError('');
      const params = {};
      if (directionFilter !== 'All') params.direction = directionFilter;
      if (transferStatusFilter !== 'All') params.status = transferStatusFilter;
      if (transferSearch.trim()) params.q = transferSearch.trim();
      if (branchName !== 'all') params.branchName = branchName;
      if (!isSubAdmin) {
        if (reportMode === 'range' && dateFrom && dateTo) {
          params.dateFrom = dateFrom;
          params.dateTo = dateTo;
        } else if (reportMode === 'single' && date) {
          params.date = date;
        }
      }
      const res = await getTransfers(params, token);
      setTransfers(res?.transfers || []);
    } catch (err) {
      if (!isSilentNetworkError(err)) setTransfersError(err.message || 'Failed to load transfer records');
    } finally {
      setTransfersLoading(false);
    }
  }, [directionFilter, transferStatusFilter, transferSearch, branchName, isSubAdmin, reportMode, dateFrom, dateTo, date, token]);

  useEffect(() => {
    if (activeTab === 'transfers') {
      loadTransfers();
    }
  }, [activeTab, loadTransfers]);

  useEffect(() => {
    const handleTransferSync = () => {
      if (activeTab === 'transfers') loadTransfers();
    };
    subscribe('transfers:change', handleTransferSync);
    return () => {
      unsubscribe('transfers:change', handleTransferSync);
    };
  }, [activeTab, subscribe, unsubscribe, loadTransfers]);

  const handleOpenAudit = async (transfer) => {
    setSelectedAuditTransfer(transfer);
    setAuditLoading(true);
    try {
      const res = await getTransferAudit(transfer._id, token);
      setAuditHistory(res?.auditHistory || transfer.transferHistory || []);
    } catch {
      setAuditHistory(transfer.transferHistory || []);
    } finally {
      setAuditLoading(false);
    }
  };

  /* ── Auto-reset selected user if not present in current branch ── */
  useEffect(() => {
    if (data?.receptionists && receptionist !== 'all') {
      const exists = data.receptionists.some(r => r._id === receptionist);
      if (!exists) setReceptionist('all');
    }
    if (data?.collectors && collector !== 'all') {
      const exists = data.collectors.some(c => c._id === collector);
      if (!exists) setCollector('all');
    }
  }, [branchName, data?.receptionists, data?.collectors, receptionist, collector]);

  /* ── Print / PDF Export Handler ────────────────────── */
  const handlePrint = () => {
    if (validationError || (reportMode === 'range' && dateFrom > dateTo)) {
      alert('From Date cannot be later than To Date.');
      return;
    }
    if (!data) return;

    const popup = window.open('', '_blank', 'width=1050,height=850');
    if (!popup) {
      alert('Print preview was blocked by your browser. Please allow popups for this site.');
      return;
    }

    const recName = receptionist === 'all'
      ? 'All Receptionists'
      : (data.receptionists?.find(r => r._id === receptionist)?.fullName || 'Selected Receptionist');
    
    const colName = collector === 'all'
      ? 'All Sample Collectors'
      : (data.collectors?.find(c => c._id === collector)?.fullName || 'Selected Sample Collector');

    const branchLabel = branchName === 'all' ? 'All Branches' : `${branchName} Branch`;

    const logoHtml = data.logoBase64
      ? `<img src="${data.logoBase64}" alt="ETU Logo" style="max-height: 80px; width: auto; display: block; margin: 0 auto 10px; object-fit: contain;" />`
      : `<div style="font-size: 26px; font-weight: bold; color: #075c91; text-align: center;">ETU</div>`;

    const rowsHtml = (data.transactions || []).map((t, idx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #d6e2e7; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #d6e2e7; font-weight: 600;">${safe(t.transactionId)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #d6e2e7;">
          <b>${safe(t.patientName)}</b><br/><small style="color: #607d8b;">${safe(t.patientId)} (${t.age} / ${t.sex})</small>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #d6e2e7;">📍 ${safe(t.branchName || 'Main')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #d6e2e7;">${safe(t.tests)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #d6e2e7; text-align: right; font-weight: 600;">${formatETB(t.grandTotal)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #d6e2e7;">${safe(t.paymentMethod)} (${safe(t.paymentStatus)})</td>
        <td style="padding: 8px; border-bottom: 1px solid #d6e2e7;">${safe(t.receptionist)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #d6e2e7;">${safe(t.collector)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #d6e2e7; text-align: center;">${safe(t.collectionStatus)}</td>
      </tr>
    `).join('');

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ETU Transaction Report — ${reportMode === 'range' ? `${dateFrom} to ${dateTo}` : date}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 15px; color: #1f2d3d; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #075c91; padding-bottom: 12px; margin-bottom: 15px; }
          .header h1 { margin: 5px 0; color: #075c91; font-size: 24px; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h2 { margin: 0; color: #455a64; font-size: 14px; font-weight: 500; }
          .meta-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; background: #f0f7fb; padding: 12px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #d0e4f0; font-size: 13px; }
          .meta-item strong { display: block; color: #075c91; font-size: 11px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px; }
          th { background: #075c91; color: white; padding: 9px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
          .summary-box { display: flex; justify-content: space-between; background: #e8f4f8; padding: 12px 18px; border-radius: 6px; font-weight: bold; border-left: 4px solid #075c91; font-size: 14px; }
          .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #78909c; border-top: 1px solid #e0e0e0; padding-top: 8px; }
          .toolbar { text-align: right; margin-bottom: 15px; }
          .btn { padding: 8px 16px; background: #075c91; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px; }
          @media print { .toolbar { display: none; } }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button class="btn" onclick="window.print()">Print / Export PDF</button>
          <button class="btn" style="background:#546e7a; margin-left: 6px;" onclick="window.close()">Close</button>
        </div>
        <div class="header">
          ${logoHtml}
          <h1>ETU Diagnostic Laboratory</h1>
          <h2>Internal Transaction & Collection Report</h2>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><strong>${reportMode === 'range' ? 'Report Period' : 'Report Date'}</strong>${reportMode === 'range' ? `${dateFrom} — ${dateTo}` : date}</div>
          <div class="meta-item"><strong>Branch Name</strong>${branchLabel}</div>
          <div class="meta-item"><strong>User (Receptionist)</strong>${recName}</div>
          <div class="meta-item"><strong>Sample Collector</strong>${colName}</div>
          <div class="meta-item"><strong>Generated At</strong>${new Date().toLocaleString()}</div>
        </div>
        ${rowsHtml ? `
          <table>
            <thead>
              <tr>
                <th style="text-align:center;">#</th>
                <th>Receipt / ID</th>
                <th>Patient Info</th>
                <th>Laboratory Tests</th>
                <th style="text-align:right;">Grand Total</th>
                <th>Payment Info</th>
                <th>Receptionist</th>
                <th>Sample Collector</th>
                <th style="text-align:center;">Collection Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary-box">
            <span>Total Transactions: ${data.summary?.totalTransactions || 0}</span>
            <span>Total Revenue: ${formatETB(data.summary?.totalRevenue)}</span>
          </div>
        ` : `
          <div style="padding: 30px; text-align: center; color: #607d8b; font-size: 16px; background: #fafafa; border: 1px dashed #cfd8dc; border-radius: 8px;">
            No transactions found for the selected filters.
          </div>
        `}
        <div class="footer">
          ETU Diagnostic Laboratory — Official Internal Audit & Transaction Document
        </div>
      </body>
      </html>
    `;

    popup.document.write(html);
    popup.document.close();
  };

  /* ── Derived Labels & Summary Metrics ───────────────── */
  const selectedRecLabel = useMemo(() => {
    if (receptionist === 'all') return 'All Receptionists';
    return data?.receptionists?.find(r => r._id === receptionist)?.fullName || 'Selected Receptionist';
  }, [receptionist, data?.receptionists]);

  const selectedColLabel = useMemo(() => {
    if (collector === 'all') return 'All Sample Collectors';
    return data?.collectors?.find(c => c._id === collector)?.fullName || 'Selected Sample Collector';
  }, [collector, data?.collectors]);

  const uniquePatients = useMemo(() => {
    if (!data?.transactions?.length) return 0;
    return new Set(data.transactions.map(t => t.patientId)).size;
  }, [data?.transactions]);

  const completedCollections = useMemo(() => {
    if (!data?.transactions?.length) return 0;
    return data.transactions.filter(t => t.collectionStatus === 'Completed').length;
  }, [data?.transactions]);

  return (
    <section className="page admin-reports-page">
      
      {/* ═══ PAGE HEADER ═══════════════════════════════ */}
      <header className="page-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p className="eyebrow">Enterprise Reporting & Compliance</p>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
            <span style={{ fontSize: '1.8rem' }}>📊</span> Reports
          </h1>
          <p className="intro">Generate, filter, export, and print laboratory transaction reports.</p>
        </div>
        {data?.logoBase64 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-surface,#fff)', padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid var(--color-border,#e0e7e9)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <img src={data.logoBase64} alt="ETU Logo" style={{ maxHeight: '40px', width: 'auto', objectFit: 'contain' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '13px', color: 'var(--color-primary,#075c91)' }}>ETU Diagnostic Laboratory</strong>
              <small style={{ color: 'var(--color-on-surface-variant,#607d8b)', fontSize: '11px' }}>Internal Audit & Reports</small>
            </div>
          </div>
        )}
      </header>

      {/* ═══ PRIMARY WORKSPACE TAB SWITCHER ═══════════════ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', borderBottom: '2px solid var(--color-border, #e2e8f0)', paddingBottom: '2px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          style={{
            padding: '0.65rem 1.4rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'transactions' ? '3px solid var(--color-primary, #075c91)' : '3px solid transparent',
            color: activeTab === 'transactions' ? 'var(--color-primary, #075c91)' : 'var(--color-on-surface-variant, #64748b)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <span>📊</span> Transactions &amp; Revenue
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transfers')}
          style={{
            padding: '0.65rem 1.4rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'transfers' ? '3px solid var(--color-primary, #075c91)' : '3px solid transparent',
            color: activeTab === 'transfers' ? 'var(--color-primary, #075c91)' : 'var(--color-on-surface-variant, #64748b)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <span>🔄</span> Cross-Branch Transfers (Main ⇄ Otona)
        </button>
      </div>

      {activeTab === 'transactions' && (
        <>
      {validationError && (
        <div className="alert error" style={{ background: '#ffebee', color: '#c62828', borderColor: '#ef9a9a', fontWeight: 600, marginBottom: '1.2rem' }}>
          ⚠️ {validationError}
        </div>
      )}
      {error && !validationError && (
        <div className="alert error" style={{ marginBottom: '1.2rem' }}>{error}</div>
      )}

      {/* ═══ FILTER CONTROL PANEL ═════════════════════ */}
      <section className="enterprise-card" style={{ background: 'var(--color-surface,#fff)', borderRadius: '14px', border: '1px solid var(--color-border,#e0e7e9)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', borderBottom: '1px solid var(--color-border,#eef3f6)', paddingBottom: '0.8rem', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--color-primary,#075c91)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎛️</span> Report Filter Controls
          </h3>
          
          {/* Report Mode Toggle Selector (Admin Only) */}
          {!isSubAdmin && (
            <div style={{ display: 'flex', background: 'var(--color-background,#f0f4f7)', borderRadius: '8px', padding: '3px', border: '1px solid var(--color-border,#d7e5eb)' }}>
              <button
                onClick={() => setReportMode('single')}
                style={{
                  padding: '0.4rem 0.9rem',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: reportMode === 'single' ? 'var(--color-primary,#075c91)' : 'transparent',
                  color: reportMode === 'single' ? '#fff' : 'var(--color-on-surface-variant,#546e7a)',
                  boxShadow: reportMode === 'single' ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                📅 Single Date
              </button>
              <button
                onClick={() => setReportMode('range')}
                style={{
                  padding: '0.4rem 0.9rem',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: reportMode === 'range' ? 'var(--color-primary,#075c91)' : 'transparent',
                  color: reportMode === 'range' ? '#fff' : 'var(--color-on-surface-variant,#546e7a)',
                  boxShadow: reportMode === 'range' ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                📆 Date Range
              </button>
            </div>
          )}
        </div>

        {isSubAdmin && (
          <div style={{ background: 'var(--color-background, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '10px', padding: '12px 16px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--color-primary, #075c91)' }}>🔒 Reporting Window: Allowed Past 4 Days</strong>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>Showing clinical transactions for <strong>📍 {user?.branchName || 'Main'} Branch</strong> from the last 4 days (Current Date + 3 Days).</p>
            </div>
            <span style={{ background: 'rgba(7, 92, 145, 0.12)', color: 'var(--color-primary, #075c91)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
              Branch &amp; 4-Day Window Locked
            </span>
          </div>
        )}

        {/* Filter Controls Responsive Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.2rem', alignItems: 'flex-end' }}>
          
          {/* Date Picker Controls (Admin Only) */}
          {!isSubAdmin && (
            reportMode === 'single' ? (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant,#546e7a)', marginBottom: '6px' }}>
                  📅 Select Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border,#cbdbe3)', fontSize: '13px', background: 'var(--color-surface,#fff)', color: 'var(--color-on-surface,#102a36)' }}
                />
              </div>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant,#546e7a)', marginBottom: '6px' }}>
                    🛫 From Date
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: validationError ? '1px solid #e53935' : '1px solid var(--color-border,#cbdbe3)', fontSize: '13px', background: 'var(--color-surface,#fff)', color: 'var(--color-on-surface,#102a36)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant,#546e7a)', marginBottom: '6px' }}>
                    🛬 To Date
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: validationError ? '1px solid #e53935' : '1px solid var(--color-border,#cbdbe3)', fontSize: '13px', background: 'var(--color-surface,#fff)', color: 'var(--color-on-surface,#102a36)' }}
                  />
                </div>
              </>
            )
          )}

          {/* Branch Dropdown (Admin Only) */}
          {!isSubAdmin && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant,#546e7a)', marginBottom: '6px' }}>
                📍 Branch Name
              </label>
              <select
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border,#cbdbe3)', fontSize: '13px', background: 'var(--color-surface,#fff)', color: 'var(--color-on-surface,#102a36)' }}
              >
                <option value="all">All Branches</option>
                <option value="Main">Main Branch</option>
                <option value="Otona">Otona Branch</option>
              </select>
            </div>
          )}

          {/* Receptionist Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant,#546e7a)', marginBottom: '6px' }}>
              👤 Receptionist
            </label>
            <select
              value={receptionist}
              onChange={e => setReceptionist(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border,#cbdbe3)', fontSize: '13px', background: 'var(--color-surface,#fff)', color: 'var(--color-on-surface,#102a36)' }}
            >
              <option value="all">All Receptionists</option>
              {(data?.receptionists || []).map(r => (
                <option key={r._id} value={r._id}>{r.fullName} ({r.username})</option>
              ))}
            </select>
          </div>

          {/* Sample Collector Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant,#546e7a)', marginBottom: '6px' }}>
              🧪 Sample Collector
            </label>
            <select
              value={collector}
              onChange={e => setCollector(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border,#cbdbe3)', fontSize: '13px', background: 'var(--color-surface,#fff)', color: 'var(--color-on-surface,#102a36)' }}
            >
              <option value="all">All Sample Collectors</option>
              {(data?.collectors || []).map(c => (
                <option key={c._id} value={c._id}>{c.fullName} ({c.username})</option>
              ))}
            </select>
          </div>

          {/* Action Area Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePrint}
              disabled={loading || !!validationError || !data?.transactions?.length}
              className="filter-chip active"
              style={{ flex: 1, padding: '0.6rem 0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: (loading || !!validationError || !data?.transactions?.length) ? 'not-allowed' : 'pointer', opacity: (loading || !!validationError || !data?.transactions?.length) ? 0.5 : 1, fontSize: '13px', fontWeight: 600 }}
            >
              📥 Export PDF
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || !!validationError || !data?.transactions?.length}
              className="filter-chip active"
              style={{ flex: 1, padding: '0.6rem 0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--color-primary,#075c91)', borderColor: 'var(--color-primary,#075c91)', cursor: (loading || !!validationError || !data?.transactions?.length) ? 'not-allowed' : 'pointer', opacity: (loading || !!validationError || !data?.transactions?.length) ? 0.5 : 1, fontSize: '13px', fontWeight: 600 }}
            >
              🖨️ Print Report
            </button>
          </div>

        </div>
      </section>

      {/* ═══ ACTIVE FILTER SUMMARY BAR ════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem', background: 'var(--color-surface,#fff)', padding: '0.75rem 1.2rem', borderRadius: '10px', border: '1px solid var(--color-border,#e0e7e9)', marginBottom: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '13px' }}>
          <span style={{ fontWeight: 700, color: 'var(--color-primary,#075c91)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🔍 Active Report Filters:
          </span>
          <span style={{ background: '#e3f2fd', color: '#0277bd', padding: '3px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '12px' }}>
            {reportMode === 'range' ? `Period: ${dateFrom} — ${dateTo}` : `Date: ${date}`}
          </span>
          <span style={{ background: '#fff3e0', color: '#e65100', padding: '3px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '12px' }}>
            Branch: {branchName === 'all' ? 'All Branches' : `${branchName} Branch`}
          </span>
          <span style={{ background: '#e0f2f1', color: '#00695c', padding: '3px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '12px' }}>
            Receptionist: {selectedRecLabel}
          </span>
          <span style={{ background: '#f3e5f5', color: '#6a1b9a', padding: '3px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '12px' }}>
            Sample Collector: {selectedColLabel}
          </span>
        </div>
      </div>

      {/* ═══ REPORT SUMMARY CARDS ═════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <article className="enterprise-card blue" style={{ padding: '1rem 1.2rem' }}>
          <small style={{ color: 'var(--color-on-surface-variant,#506a77)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Total Transactions</small>
          <strong style={{ fontSize: '1.4rem', color: '#075c91', marginTop: '4px', display: 'block' }}>
            {validationError ? '0' : (data?.summary?.totalTransactions || 0)} Records
          </strong>
        </article>
        <article className="enterprise-card teal" style={{ padding: '1rem 1.2rem' }}>
          <small style={{ color: 'var(--color-on-surface-variant,#506a77)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Total Patients</small>
          <strong style={{ fontSize: '1.4rem', color: '#00796b', marginTop: '4px', display: 'block' }}>
            {validationError ? '0' : uniquePatients} Patients
          </strong>
        </article>
        <article className="enterprise-card purple" style={{ padding: '1rem 1.2rem' }}>
          <small style={{ color: 'var(--color-on-surface-variant,#506a77)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Completed Collections</small>
          <strong style={{ fontSize: '1.4rem', color: '#6a1b9a', marginTop: '4px', display: 'block' }}>
            {validationError ? '0' : completedCollections} Samples
          </strong>
        </article>
        <article className="enterprise-card green" style={{ padding: '1rem 1.2rem' }}>
          <small style={{ color: 'var(--color-on-surface-variant,#506a77)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Total Filtered Revenue</small>
          <strong style={{ fontSize: '1.4rem', color: '#2e7d32', marginTop: '4px', display: 'block' }}>
            {validationError ? '0.00 ETB' : formatETB(data?.summary?.totalRevenue)}
          </strong>
        </article>
      </div>

      {/* ═══ TRANSACTION ACTION NOTIFICATION BANNER ═══ */}
      {txActionMsg && (
        <div
          className="alert success"
          style={{
            marginBottom: '1rem',
            background: '#e8f5e9',
            color: '#1b5e20',
            border: '1px solid #c8e6c9',
            padding: '10px 16px',
            borderRadius: '8px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>✅ {txActionMsg}</span>
          <button
            type="button"
            onClick={() => setTxActionMsg('')}
            style={{ background: 'none', border: 'none', color: '#1b5e20', fontSize: '16px', cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* ═══ TRANSACTION RESULTS SECTION ══════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem', padding: '0 4px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-primary,#075c91)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📋</span> Transaction Report <span style={{ fontSize: '12px', background: 'var(--color-background,#e2ecef)', color: 'var(--color-on-surface-variant,#37474f)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>{data?.transactions?.length || 0} Transactions Found</span>
        </h2>

        {/* Multi-Selection Controls Bar (Admin / Sub Admin Only) */}
        {canManageTransactions && (data?.transactions?.length > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {selectedTxIds.length > 0 && (
              <span
                style={{
                  fontWeight: 700,
                  color: '#0284c7',
                  background: 'var(--color-primary-container, #e0f2fe)',
                  padding: '4px 12px',
                  borderRadius: 14,
                  fontSize: '0.82rem',
                  border: '1px solid rgba(2, 132, 199, 0.3)'
                }}
              >
                {selectedTxIds.length} Selected
              </span>
            )}
            {selectedTxIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTxIds([])}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: 'var(--color-surface, #fff)',
                  cursor: 'pointer'
                }}
              >
                Deselect All
              </button>
            )}
            <button
              type="button"
              disabled={selectedTxIds.length === 0 || isDeletingTx}
              onClick={() => setShowBulkDeleteModal(true)}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: 600,
                background: selectedTxIds.length > 0 ? '#d32f2f' : '#e2e8f0',
                color: selectedTxIds.length > 0 ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                cursor: selectedTxIds.length > 0 ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: selectedTxIds.length > 0 ? '0 2px 6px rgba(211, 47, 47, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              🗑️ Delete Selected {selectedTxIds.length > 0 ? `(${selectedTxIds.length})` : ''}
            </button>
          </div>
        )}
      </div>

      <section className="table-card" style={{ background: 'var(--color-surface,#fff)', borderRadius: '12px', border: '1px solid var(--color-border,#e2ecef)', overflow: 'hidden' }}>
        {loading && !validationError ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--color-on-surface-variant,#607d8b)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏳</div>
            Loading transaction report data…
          </div>
        ) : validationError ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#c62828' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Invalid Date Range</p>
            <p style={{ fontSize: '0.85rem', color: '#b71c1c', marginTop: '6px' }}>{validationError}</p>
          </div>
        ) : (data?.transactions?.length > 0) ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--color-background,#f4f8fa)', borderBottom: '2px solid var(--color-border,#dce8ee)', color: 'var(--color-primary,#075c91)' }}>
                  {canManageTransactions && (
                    <th style={{ width: '44px', padding: '10px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        ref={selectAllRef}
                        checked={data.transactions.length > 0 && data.transactions.every(t => selectedTxIds.includes(String(t._id || t.paymentId)))}
                        onChange={toggleSelectAllTx}
                        aria-label="Select all transactions"
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0284c7' }}
                      />
                    </th>
                  )}
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Receipt / ID</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Patient Information</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Branch</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Requested Tests</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Grand Total</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Payment Info</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Receptionist</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Sample Collector</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Collection Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t, i) => {
                  const txKey = String(t._id || t.paymentId);
                  const isSelected = selectedTxIds.includes(txKey);
                  return (
                    <tr key={txKey} style={{ borderBottom: '1px solid var(--color-border,#edf3f6)', background: isSelected ? 'rgba(2, 132, 199, 0.08)' : undefined }}>
                      {canManageTransactions && (
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            value={txKey}
                            checked={isSelected}
                            onChange={() => toggleSelectTx(txKey)}
                            aria-label={`Select transaction ${t.transactionId || t.patientId}`}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0284c7' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-on-surface-variant,#78909c)' }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-primary,#075c91)' }}>{t.transactionId}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <strong>{t.patientName}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-on-surface-variant,#607d8b)' }}>{t.patientId} · {t.age} yrs / {t.sex}</div>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>📍 {t.branchName || 'Main'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-on-surface,#263238)' }}>{t.tests}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#2e7d32' }}>
                        {formatETB(t.grandTotal)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: t.paymentStatus === 'Paid' ? '#e8f5e9' : '#fff3e0', color: t.paymentStatus === 'Paid' ? '#1b5e20' : '#e65100', fontWeight: 600 }}>
                          {t.paymentMethod} ({t.paymentStatus})
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-on-surface,#37474f)' }}>{t.receptionist}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-on-surface,#37474f)' }}>{t.collector}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: t.collectionStatus === 'Completed' ? '#e0f2f1' : '#f3e5f5', color: t.collectionStatus === 'Completed' ? '#004d40' : '#4a148c', fontWeight: 600 }}>
                          {t.collectionStatus}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            className="filter-chip"
                            style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, border: '1px solid var(--color-primary, #075c91)', color: 'var(--color-primary, #075c91)', background: 'transparent' }}
                            onClick={() => setSelectedTransaction(t)}
                          >
                            View Details
                          </button>
                          {canManageTransactions && (
                            <button
                              type="button"
                              className="filter-chip"
                              style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, border: '1px solid #d32f2f', color: '#d32f2f', background: 'transparent', cursor: 'pointer' }}
                              onClick={() => setDeletingTransaction(t)}
                              title="Delete transaction"
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
          </div>
        ) : (
          /* ═══ PROFESSIONAL EMPTY STATE ═════════════════ */
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--color-surface,#fff)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem', opacity: 0.8 }}>📊</div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', color: 'var(--color-on-surface,#263238)' }}>No Transactions Found</h3>
            <p style={{ margin: '0 auto', fontSize: '0.88rem', color: 'var(--color-on-surface-variant,#78909c)', maxWidth: '440px' }}>
              No laboratory transactions match the selected report filters. Try adjusting the date range, receptionist, or sample collector selection.
            </p>
          </div>
        )}
      </section>
        </>
      )}

      {/* ═══ CROSS-BRANCH SAMPLE TRANSFERS OVERSIGHT TAB ═══ */}
      {activeTab === 'transfers' && (
        <>
          {transfersError && (
            <div className="alert error" style={{ marginBottom: '1.2rem' }}>{transfersError}</div>
          )}

          {/* Transfer Filter Controls */}
          <section className="enterprise-card" style={{ background: 'var(--color-surface,#fff)', borderRadius: '14px', border: '1px solid var(--color-border,#e0e7e9)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', borderBottom: '1px solid var(--color-border,#eef3f6)', paddingBottom: '0.8rem', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--color-primary,#075c91)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎛️</span> Transfer Filter Controls (Main ⇄ Otona)
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={loadTransfers}
                  className="secondary"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  🔄 Refresh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const popup = window.open('', '_blank', 'width=1100,height=850');
                    if (!popup) {
                      alert('Print preview was blocked by your browser. Please allow popups for this site.');
                      return;
                    }
                    const logoHtml = data?.logoBase64
                      ? `<img src="${data.logoBase64}" alt="ETU Logo" style="max-height: 70px; width: auto; display: block; margin: 0 auto 8px; object-fit: contain;" />`
                      : `<div style="font-size: 24px; font-weight: bold; color: #075c91; text-align: center;">ETU DIAGNOSTIC LABORATORY</div>`;

                    const rowsHtml = transfers.map((t, idx) => `
                      <tr>
                        <td style="padding: 7px; border-bottom: 1px solid #d6e2e7; text-align: center;">${idx + 1}</td>
                        <td style="padding: 7px; border-bottom: 1px solid #d6e2e7; font-weight: 700; color: #075c91;">${safe(t.transferId)}</td>
                        <td style="padding: 7px; border-bottom: 1px solid #d6e2e7;">
                          <b>${safe(t.patient?.name)}</b><br/><small style="color: #607d8b;">${safe(t.patient?.patientId)} (${t.patient?.age || '—'}y / ${t.patient?.sex || '—'})</small>
                        </td>
                        <td style="padding: 7px; border-bottom: 1px solid #d6e2e7;">
                          <b>${safe(t.testName)}</b><br/><small style="color: #607d8b;">${safe(t.testCategory)}</small>
                        </td>
                        <td style="padding: 7px; border-bottom: 1px solid #d6e2e7; text-align: center;">
                          <span style="font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 11px; ${t.sourceBranch === 'Main' ? 'background:#e0f2fe;color:#0369a1;' : 'background:#fef3c7;color:#92400e;'}">
                            ${t.sourceBranch} ➔ ${t.destinationBranch}
                          </span>
                        </td>
                        <td style="padding: 7px; border-bottom: 1px solid #d6e2e7;">
                          ${safe(t.sentBy?.fullName)}<br/><small style="color: #607d8b;">${t.sentAt ? new Date(t.sentAt).toLocaleString() : '—'}</small>
                        </td>
                        <td style="padding: 7px; border-bottom: 1px solid #d6e2e7;">
                          ${safe(t.receivedBy?.fullName || 'Pending')}<br/><small style="color: #607d8b;">${t.receivedAt ? new Date(t.receivedAt).toLocaleString() : '—'}</small>
                        </td>
                        <td style="padding: 7px; border-bottom: 1px solid #d6e2e7; text-align: center; font-weight: 700;">
                          ${safe(t.status)}
                        </td>
                        <td style="padding: 7px; border-bottom: 1px solid #d6e2e7;">
                          ${safe(t.approvedBy?.fullName || t.labReport?.approvedBy?.fullName || '—')}<br/><small style="color: #607d8b;">${t.completedAt || t.approvedAt ? new Date(t.completedAt || t.approvedAt).toLocaleString() : '—'}</small>
                        </td>
                      </tr>
                    `).join('');

                    const html = `
                      <!doctype html>
                      <html>
                      <head>
                        <meta charset="utf-8">
                        <title>ETU Cross-Branch Sample Transfers Audit Report</title>
                        <style>
                          @page { size: A4 landscape; margin: 10mm; }
                          body { font-family: Arial, sans-serif; margin: 0; padding: 15px; color: #1f2d3d; background: #fff; }
                          .header { text-align: center; border-bottom: 2px solid #075c91; padding-bottom: 10px; margin-bottom: 15px; }
                          .header h1 { margin: 5px 0; color: #075c91; font-size: 22px; text-transform: uppercase; }
                          .header h2 { margin: 0; color: #455a64; font-size: 13px; font-weight: 500; }
                          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f0f7fb; padding: 10px 14px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #d0e4f0; font-size: 12px; }
                          .meta-item strong { display: block; color: #075c91; font-size: 10px; text-transform: uppercase; }
                          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px; }
                          th { background: #075c91; color: white; padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; }
                          .summary-box { display: flex; justify-content: space-between; background: #e8f4f8; padding: 10px 16px; border-radius: 6px; font-weight: bold; border-left: 4px solid #075c91; font-size: 13px; }
                          .footer { margin-top: 15px; text-align: center; font-size: 10px; color: #78909c; border-top: 1px solid #e0e0e0; padding-top: 8px; }
                          .toolbar { text-align: right; margin-bottom: 12px; }
                          .btn { padding: 7px 14px; background: #075c91; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px; }
                          @media print { .toolbar { display: none; } }
                        </style>
                      </head>
                      <body>
                        <div class="toolbar">
                          <button class="btn" onclick="window.print()">Print / Export PDF</button>
                          <button class="btn" style="background:#546e7a; margin-left: 6px;" onclick="window.close()">Close</button>
                        </div>
                        <div class="header">
                          ${logoHtml}
                          <h1>ETU Diagnostic Laboratory</h1>
                          <h2>Cross-Branch Sample Transfer Oversight &amp; Audit Log (Main ⇄ Otona)</h2>
                        </div>
                        <div class="meta-grid">
                          <div class="meta-item"><strong>Direction</strong>${directionFilter === 'All' ? 'All Directions (Main ⇄ Otona)' : directionFilter}</div>
                          <div class="meta-item"><strong>Status</strong>${transferStatusFilter}</div>
                          <div class="meta-item"><strong>Total Records</strong>${transfers.length}</div>
                          <div class="meta-item"><strong>Generated At</strong>${new Date().toLocaleString()}</div>
                        </div>
                        ${rowsHtml ? `
                          <table>
                            <thead>
                              <tr>
                                <th style="text-align:center;">#</th>
                                <th>Transfer ID</th>
                                <th>Patient Info</th>
                                <th>Ordered Test</th>
                                <th style="text-align:center;">Direction</th>
                                <th>Sent By &amp; Time</th>
                                <th>Received By &amp; Time</th>
                                <th style="text-align:center;">Current Status</th>
                                <th>Approved By &amp; Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${rowsHtml}
                            </tbody>
                          </table>
                          <div class="summary-box">
                            <span>Total Transfers Logged: ${transfers.length}</span>
                            <span>Completed / Approved: ${transfers.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED').length}</span>
                          </div>
                        ` : `
                          <div style="padding: 24px; text-align: center; color: #607d8b; font-size: 14px; background: #fafafa; border: 1px dashed #cfd8dc; border-radius: 8px;">
                            No sample transfer records found for the selected filters.
                          </div>
                        `}
                        <div class="footer">
                          ETU Diagnostic Laboratory — Cross-Branch Transfer Quality &amp; Compliance Audit
                        </div>
                      </body>
                      </html>
                    `;
                    popup.document.write(html);
                    popup.document.close();
                  }}
                  className="primary-button"
                  style={{ padding: '0.45rem 1rem', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  🖨️ Export / Print PDF
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant,#546e7a)', marginBottom: '6px' }}>
                  🔄 Transfer Direction
                </label>
                <select
                  value={directionFilter}
                  onChange={e => setDirectionFilter(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border,#cbdbe3)', fontSize: '13px', background: 'var(--color-surface,#fff)' }}
                >
                  <option value="All">All Directions (Main ⇄ Otona)</option>
                  <option value="Main-to-Otona">Main ➔ Otona</option>
                  <option value="Otona-to-Main">Otona ➔ Main</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant,#546e7a)', marginBottom: '6px' }}>
                  📌 Transfer Status
                </label>
                <select
                  value={transferStatusFilter}
                  onChange={e => setTransferStatusFilter(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border,#cbdbe3)', fontSize: '13px', background: 'var(--color-surface,#fff)' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="PENDING_TRANSFER">Pending Transfer (In Transit)</option>
                  <option value="RECEIVED">Received at Destination</option>
                  <option value="UNDER_INVESTIGATION">Under Investigation</option>
                  <option value="RESULT_READY">Result Ready</option>
                  <option value="APPROVED">Approved / Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant,#546e7a)', marginBottom: '6px' }}>
                  🔍 Search Patient / Test / ID
                </label>
                <input
                  type="text"
                  value={transferSearch}
                  onChange={e => setTransferSearch(e.target.value)}
                  placeholder="Patient name, ID, test, TRF-..."
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border,#cbdbe3)', fontSize: '13px', background: 'var(--color-surface,#fff)' }}
                />
              </div>
            </div>
          </section>

          {/* Transfer KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <article className="enterprise-card blue" style={{ padding: '1rem 1.2rem' }}>
              <small style={{ color: 'var(--color-on-surface-variant,#506a77)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Total Transfers</small>
              <strong style={{ fontSize: '1.4rem', color: '#075c91', marginTop: '4px', display: 'block' }}>
                {transfers.length} Records
              </strong>
            </article>
            <article className="enterprise-card teal" style={{ padding: '1rem 1.2rem' }}>
              <small style={{ color: 'var(--color-on-surface-variant,#506a77)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Main ➔ Otona</small>
              <strong style={{ fontSize: '1.4rem', color: '#00796b', marginTop: '4px', display: 'block' }}>
                {transfers.filter(t => t.sourceBranch === 'Main').length} Samples
              </strong>
            </article>
            <article className="enterprise-card purple" style={{ padding: '1rem 1.2rem' }}>
              <small style={{ color: 'var(--color-on-surface-variant,#506a77)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Otona ➔ Main</small>
              <strong style={{ fontSize: '1.4rem', color: '#6a1b9a', marginTop: '4px', display: 'block' }}>
                {transfers.filter(t => t.sourceBranch === 'Otona').length} Samples
              </strong>
            </article>
            <article className="enterprise-card orange" style={{ padding: '1rem 1.2rem' }}>
              <small style={{ color: 'var(--color-on-surface-variant,#506a77)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>In Transit (Pending)</small>
              <strong style={{ fontSize: '1.4rem', color: '#e65100', marginTop: '4px', display: 'block' }}>
                {transfers.filter(t => t.status === 'PENDING_TRANSFER').length} Samples
              </strong>
            </article>
            <article className="enterprise-card green" style={{ padding: '1rem 1.2rem' }}>
              <small style={{ color: 'var(--color-on-surface-variant,#506a77)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Completed &amp; Approved</small>
              <strong style={{ fontSize: '1.4rem', color: '#2e7d32', marginTop: '4px', display: 'block' }}>
                {transfers.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED').length} Results
              </strong>
            </article>
          </div>

          {/* Transfer Table */}
          <section className="enterprise-card" style={{ background: 'var(--color-surface,#fff)', borderRadius: '14px', border: '1px solid var(--color-border,#e0e7e9)', padding: 0, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border,#eef3f6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--color-primary,#075c91)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📑</span> Cross-Branch Sample Transfers Audit Log
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant,#78909c)' }}>
                Showing {transfers.length} transfer{transfers.length === 1 ? '' : 's'}
              </span>
            </div>

            {transfersLoading ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: '#607d8b' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>⏳</div>
                Loading cross-branch transfers…
              </div>
            ) : transfers.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-container, #f4f8fa)', borderBottom: '2px solid var(--color-border,#e0e7e9)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'center', width: '40px' }}>#</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Transfer ID</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Patient Information</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Ordered Test</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Direction</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Sent By &amp; Time</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Received By</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Approved At</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t, index) => (
                      <tr key={t._id} style={{ borderBottom: '1px solid var(--color-border,#eef3f6)', background: index % 2 === 0 ? 'transparent' : 'var(--color-surface-container-lowest,#fafcfd)' }}>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#90a4ae' }}>{index + 1}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontWeight: 700, color: '#075c91', fontFamily: 'monospace' }}>{t.transferId}</span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <strong>{t.patient?.name || 'Unknown Patient'}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {t.patient?.patientId} • {t.patient?.age || '—'} yrs / {t.patient?.sex || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{t.testName}</div>
                          <small style={{ color: '#64748b' }}>{t.testCategory || 'General Laboratory'}</small>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span className={`transfer-badge ${t.sourceBranch === 'Main' ? 'sent-from-main' : 'sent-from-otona'}`}>
                            {t.sourceBranch === 'Main' ? 'SENT FROM MAIN' : 'SENT FROM OTONA'}
                          </span>
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            {t.sourceBranch} ➔ {t.destinationBranch}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div>{t.sentBy?.fullName || 'Staff'}</div>
                          <small style={{ color: '#64748b' }}>{t.sentAt ? new Date(t.sentAt).toLocaleString() : '—'}</small>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {t.receivedBy ? (
                            <div>
                              <div>{t.receivedBy.fullName}</div>
                              <small style={{ color: '#64748b' }}>{t.receivedAt ? new Date(t.receivedAt).toLocaleString() : '—'}</small>
                            </div>
                          ) : (
                            <span style={{ color: '#e65100', fontSize: '12px', fontStyle: 'italic' }}>Pending Receipt</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span className={`transfer-badge status-${t.status?.toLowerCase()}`}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {t.completedAt || t.approvedAt ? (
                            <div>
                              <div style={{ color: '#2e7d32', fontWeight: 600 }}>Approved</div>
                              <small style={{ color: '#64748b' }}>{new Date(t.completedAt || t.approvedAt).toLocaleString()}</small>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenAudit(t)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                              title="View full milestone history"
                            >
                              📜 Audit Log
                            </button>
                            {t.labReport && (
                              <button
                                type="button"
                                onClick={() => { setPreviewReport(t.labReport); setPreviewStampType(t.labReport?.stampType || null); }}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  borderRadius: '6px',
                                  border: '1px solid #0284c7',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                                title="View completed laboratory test report"
                              >
                                👁️ View Report
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--color-surface,#fff)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem', opacity: 0.8 }}>🔄</div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', color: 'var(--color-on-surface,#263238)' }}>No Transfers Found</h3>
                <p style={{ margin: '0 auto', fontSize: '0.88rem', color: 'var(--color-on-surface-variant,#78909c)', maxWidth: '440px' }}>
                  No cross-branch sample transfers match the selected filter criteria. Try adjusting the direction or status filter.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {/* ═══ TRANSACTION DETAIL GLASSMORPHISM MODAL ═══ */}
      <ModalPortal isOpen={!!selectedTransaction} onClose={() => setSelectedTransaction(null)}>
        <div className="modal-content" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
          <header className="modal-header">
            <h2 style={{ fontSize: '1.2rem', color: 'var(--color-primary, #075c91)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📑</span> Transaction Record — {selectedTransaction?.transactionId}
            </h2>
            <button className="close-button" onClick={() => setSelectedTransaction(null)}>&times;</button>
          </header>

          <div style={{ background: 'var(--color-primary-light, rgba(7, 92, 145, 0.08))', border: '1px solid rgba(7, 92, 145, 0.18)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.88rem' }}>
              <div><strong>Patient Name:</strong> {selectedTransaction?.patientName}</div>
              <div><strong>Patient Code:</strong> {selectedTransaction?.patientId}</div>
              <div><strong>Age / Sex:</strong> {selectedTransaction?.age} yrs / {selectedTransaction?.sex}</div>
              <div><strong>Branch:</strong> 📍 {selectedTransaction?.branchName || 'Main'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
            <div style={{ background: 'var(--color-surface-bright, #fff)', border: '1px solid var(--color-outline-variant, rgba(0,0,0,0.08))', borderRadius: '10px', padding: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary, #075c91)', fontSize: '0.82rem', textTransform: 'uppercase' }}>Billing & Payment</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Grand Total:</strong> {selectedTransaction?.grandTotal !== undefined ? formatETB(selectedTransaction.grandTotal) : '—'}</div>
                <div><strong>Payment Status:</strong> {selectedTransaction?.paymentStatus}</div>
                <div><strong>Payment Method:</strong> {selectedTransaction?.paymentMethod || 'Cash'}</div>
                <div><strong>Receipt #:</strong> {selectedTransaction?.receiptNumber || '—'}</div>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface-bright, #fff)', border: '1px solid var(--color-outline-variant, rgba(0,0,0,0.08))', borderRadius: '10px', padding: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary, #075c91)', fontSize: '0.82rem', textTransform: 'uppercase' }}>Staff & Dates</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Receptionist:</strong> {selectedTransaction?.registeredBy || '—'}</div>
                <div><strong>Collector:</strong> {selectedTransaction?.technician || '—'}</div>
                <div><strong>Date & Time:</strong> {selectedTransaction?.registrationDate ? new Date(selectedTransaction.registrationDate).toLocaleString() : '—'}</div>
                <div><strong>Report Status:</strong> {selectedTransaction?.reportStatus || '—'}</div>
              </div>
            </div>
          </div>

          {/* Test results preview if report results exist */}
          {selectedTransaction?.report?.results?.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary, #075c91)', fontSize: '0.82rem', textTransform: 'uppercase' }}>Test Results ({selectedTransaction.report.results.length})</h4>
              <table style={{ width: '100%', fontSize: '0.83rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-container, #f0f4f8)', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Parameter</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Result</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Unit</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Reference</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransaction.report.results.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eceff1' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{row.sampleName}</td>
                      <td style={{ padding: '6px 8px' }}>{row.result}</td>
                      <td style={{ padding: '6px 8px', color: '#607d8b' }}>{row.unit || '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#607d8b' }}>{row.referenceValue || '—'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <FlagBadge flag={row.flag} result={row.result} referenceValue={row.referenceValue} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <button type="button" className="secondary" onClick={() => setSelectedTransaction(null)}>Close</button>
          </div>
        </div>
      </ModalPortal>

      {/* ═══ CROSS-BRANCH TRANSFER AUDIT TIMELINE MODAL ═══ */}
      {selectedAuditTransfer && (
        <ModalPortal isOpen={!!selectedAuditTransfer} onClose={() => setSelectedAuditTransfer(null)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2 style={{ fontSize: '1.2rem', color: 'var(--color-primary, #075c91)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📜</span> Transfer Audit Trail — {selectedAuditTransfer.transferId}
              </h2>
              <button className="close-button" onClick={() => setSelectedAuditTransfer(null)}>&times;</button>
            </header>

            <div style={{ background: 'var(--color-primary-light, rgba(7, 92, 145, 0.08))', border: '1px solid rgba(7, 92, 145, 0.18)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.88rem' }}>
                <div><strong>Patient:</strong> {selectedAuditTransfer.patient?.name} ({selectedAuditTransfer.patient?.patientId})</div>
                <div><strong>Test:</strong> {selectedAuditTransfer.testName}</div>
                <div><strong>Route:</strong> {selectedAuditTransfer.sourceBranch} ➔ {selectedAuditTransfer.destinationBranch}</div>
                <div><strong>Status:</strong> <span className={`transfer-badge status-${selectedAuditTransfer.status?.toLowerCase()}`}>{selectedAuditTransfer.status}</span></div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary, #075c91)', fontSize: '0.86rem', textTransform: 'uppercase' }}>Milestone History</h4>
              {auditLoading ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>Loading audit events…</p>
              ) : auditHistory.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '12px' }}>No audit history recorded.</p>
              ) : (
                <div className="transfer-audit-timeline" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                  {auditHistory.map((step, idx) => (
                    <div key={idx} className="transfer-audit-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                        <strong style={{ color: '#075c91' }}>{step.action || step.status}</strong>
                        <span style={{ color: '#64748b' }}>{step.timestamp ? new Date(step.timestamp).toLocaleString() : '—'}</span>
                      </div>
                      {step.performedBy?.fullName && (
                        <small style={{ display: 'block', color: '#475569' }}>Actor: {step.performedBy.fullName} ({step.performedBy.role || 'Staff'})</small>
                      )}
                      {step.notes && (
                        <div style={{ fontSize: '0.8rem', color: '#334155', fontStyle: 'italic', marginTop: '3px' }}>
                          "{step.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <button type="button" className="secondary" onClick={() => setSelectedAuditTransfer(null)}>Close</button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ═══ REPORT PREVIEW MODAL ═══ */}
      {previewReport && (
        <ModalPortal isOpen={!!previewReport} onClose={() => setPreviewReport(null)}>
          <div className="modal-content" style={{ maxWidth: '960px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <header className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--color-primary, #075c91)', margin: 0 }}>
                  Laboratory Test Report — {previewReport.reportNumber || 'Preview'}
                </h2>
                <small style={{ color: '#64748b' }}>Original Branch: {previewReport.originalBranch || 'Main'} • Performed At: {previewReport.performingBranch || 'Otona'}</small>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={previewShowLogo}
                    onChange={e => setPreviewShowLogo(e.target.checked)}
                  />
                  Show Logo
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={previewShowFooter}
                    onChange={e => setPreviewShowFooter(e.target.checked)}
                  />
                  Show Footer
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: previewStampType === 'lab' ? '#0284c7' : '#334155', cursor: 'pointer', background: previewStampType === 'lab' ? '#e0f2fe' : '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${previewStampType === 'lab' ? '#0284c7' : '#cbd5e1'}` }}>
                  <input
                    type="checkbox"
                    checked={previewStampType === 'lab'}
                    onChange={() => setPreviewStampType(prev => prev === 'lab' ? null : 'lab')}
                  />
                  Add Lab Stamp
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: previewStampType === 'clinic' ? '#0284c7' : '#334155', cursor: 'pointer', background: previewStampType === 'clinic' ? '#e0f2fe' : '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${previewStampType === 'clinic' ? '#0284c7' : '#cbd5e1'}` }}>
                  <input
                    type="checkbox"
                    checked={previewStampType === 'clinic'}
                    onChange={() => setPreviewStampType(prev => prev === 'clinic' ? null : 'clinic')}
                  />
                  Add Clinic Stamp
                </label>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => printLabReport(previewReport, { showLogo: previewShowLogo, showFooter: previewShowFooter, stampType: previewStampType, token, user })}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  🖨️ Print Report
                </button>
                <button className="close-button" onClick={() => setPreviewReport(null)}>&times;</button>
              </div>
            </header>
            <div style={{ overflowY: 'auto', padding: '16px', flex: 1 }}>
              <ReportPreview report={previewReport} showLogo={previewShowLogo} showFooter={previewShowFooter} stampType={previewStampType} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <button type="button" className="secondary" onClick={() => setPreviewReport(null)}>Close</button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ═══ ADMIN DELETE SINGLE TRANSACTION CONFIRMATION MODAL ══════ */}
      {deletingTransaction && (
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
                This will update the related financial totals and Daily Income.
              </p>
              <div className="delete-confirm-details">
                <div><strong>TX / Receipt:</strong> {deletingTransaction.transactionId}</div>
                <div><strong>Patient:</strong> {deletingTransaction.patientName} ({deletingTransaction.patientId})</div>
                <div><strong>Amount:</strong> <span style={{ color: '#0284c7', fontWeight: 700 }}>{formatETB(deletingTransaction.grandTotal)}</span></div>
                <div><strong>Receptionist:</strong> {deletingTransaction.receptionist || 'Staff'}</div>
                <div><strong>Branch:</strong> {deletingTransaction.branchName || 'Main'}</div>
              </div>
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
                {isDeletingTx ? 'Deleting...' : 'Delete Transaction'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ═══ ADMIN BULK DELETE CONFIRMATION MODAL ═════════════════════ */}
      {showBulkDeleteModal && (
        <ModalPortal isOpen={showBulkDeleteModal} onClose={() => !isDeletingTx && setShowBulkDeleteModal(false)}>
          <div
            className="modal-content delete-confirm-modal"
            style={{ maxWidth: 460, padding: 0, overflow: 'hidden' }}
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
                Are you sure you want to delete <strong>{selectedTxIds.length}</strong> selected money transactions?
              </p>
              <p className="delete-confirm-subtext">
                Daily Income and financial totals will be automatically recalculated. Medical records and laboratory tests will remain intact.
              </p>
            </div>
            <div className="delete-confirm-footer">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isDeletingTx}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-danger-btn"
                onClick={handleBulkDeleteTransactions}
                disabled={isDeletingTx}
              >
                {isDeletingTx ? 'Deleting...' : `Delete ${selectedTxIds.length} Transactions`}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  );
}
