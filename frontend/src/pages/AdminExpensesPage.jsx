import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { formatETB } from '../utils/currencyHelper.js';
import { api } from '../api/client.js';
import {
  getExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  voidExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
  ADMIN_EXPENSE_SOURCES,
  EXPENSE_PAYMENT_METHODS,
  formatCategory
} from '../services/expenseService.js';
import Logo from '../assets/Logo.jsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import '../styles/pages/expenses.css';

const CATEGORY_COLORS = [
  '#0284c7',
  '#0ea5e9',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#f43f5e',
  '#6366f1',
  '#14b8a6',
  '#64748b'
];

/* ── Animated Counter Hook (matches Main Dashboard) ──────── */
function useAnimatedValue(target, duration = 600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const from = 0;
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

/* ── Main Dashboard Style Stat Card ──────────────────────── */
function StatCard({ icon, label, value, color, isCurrency = true }) {
  const animated = useAnimatedValue(typeof value === 'number' ? value : 0);
  const display =
    typeof value === 'number'
      ? isCurrency
        ? `${animated.toLocaleString()} ETB`
        : animated.toLocaleString()
      : value ?? '—';
  return (
    <article className={`exec-card ${color}`}>
      <div className="card-icon">{icon}</div>
      <div className="card-value">{display}</div>
      <div className="card-label">{label}</div>
    </article>
  );
}

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getPresetRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  switch (preset) {
    case 'today':
      return { dateFrom: toISO(today), dateTo: toISO(today) };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { dateFrom: toISO(y), dateTo: toISO(y) };
    }
    case 'week': {
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      return { dateFrom: toISO(mon), dateTo: toISO(now) };
    }
    case 'month': {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: toISO(m), dateTo: toISO(now) };
    }
    case 'all':
    default:
      return { dateFrom: '', dateTo: '' };
  }
}

function downloadCSV(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function AdminExpensesPage() {
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();

  // State
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalCount: 0,
    averageAmount: 0,
    topCategory: 'None',
    receptionistExpenses: 0,
    adminExpenses: 0,
    transportationTotal: 0,
    printerPaperTotal: 0,
    otherExpensesTotal: 0,
    stockExpensesTotal: 0,
    voidedCount: 0,
    voidedAmount: 0,
    byCategory: [],
    byPaymentMethod: [],
    dailyTrend: []
  });
  const [usersList, setUsersList] = useState([]);
  const [stockItemsList, setStockItemsList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [expenseSource, setExpenseSource] = useState('All');
  const [branch, setBranch] = useState('All');
  const [recordedBy, setRecordedBy] = useState('All');
  const [category, setCategory] = useState('All');
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [status, setStatus] = useState('All');
  const initialPreset = searchParams.get('preset') || 'month';
  const [preset, setPreset] = useState(initialPreset);
  const [dateFrom, setDateFrom] = useState(() => getPresetRange(initialPreset).dateFrom);
  const [dateTo, setDateTo] = useState(() => getPresetRange(initialPreset).dateTo);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const p = searchParams.get('preset');
    if (p && p !== preset) {
      setPreset(p);
      const range = getPresetRange(p);
      setDateFrom(range.dateFrom);
      setDateTo(range.dateTo);
    }
  }, [searchParams]);


  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    category: 'Transportation',
    expenseName: '',
    amount: '',
    date: toISO(new Date()),
    branchName: 'Main',
    paymentMethod: 'Cash',
    receiptNumber: '',
    description: '',
    stockItem: '',
    stockItemName: '',
    stockQuantity: '',
    stockUnitPrice: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Void modal
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidingExpense, setVoidingExpense] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(null);

  // Auto-dismiss messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fetch users & stock items for filters and forms
  useEffect(() => {
    if (!token) return;
    api('/users', { token })
      .then((res) => {
        if (res?.users) setUsersList(res.users);
      })
      .catch((_) => {});

    api('/stock', { token })
      .then((res) => {
        if (res?.items) setStockItemsList(res.items);
      })
      .catch((_) => {});
  }, [token]);

  // Handle date preset change
  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    const range = getPresetRange(newPreset);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    setPage(1);
  };

  // Fetch data
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');

      const queryParams = {
        page,
        limit: 20,
        search,
        expenseSource: expenseSource !== 'All' ? expenseSource : undefined,
        branchName: branch !== 'All' ? branch : undefined,
        recordedBy: recordedBy !== 'All' ? recordedBy : undefined,
        category: category !== 'All' ? category : undefined,
        paymentMethod: paymentMethod !== 'All' ? paymentMethod : undefined,
        status: status !== 'All' ? status : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      };

      const [resList, resSum] = await Promise.all([
        getExpenses(queryParams, token),
        getExpenseSummary(
          {
            expenseSource: expenseSource !== 'All' ? expenseSource : undefined,
            branchName: branch !== 'All' ? branch : undefined,
            recordedBy: recordedBy !== 'All' ? recordedBy : undefined,
            category: category !== 'All' ? category : undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined
          },
          token
        )
      ]);

      if (resList?.success) {
        setExpenses(resList.expenses || []);
        if (resList.pagination) {
          setPagination(resList.pagination);
        }
      }

      if (resSum?.success) {
        setSummary(resSum.summary);
      }
    } catch (err) {
      setError(err.message || 'Failed to load expense records.');
    } finally {
      setLoading(false);
    }
  }, [token, page, search, expenseSource, branch, recordedBy, category, paymentMethod, status, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription
  useEffect(() => {
    const handleRealtimeChange = () => {
      loadData();
    };

    subscribe('expense:change', handleRealtimeChange);
    return () => {
      unsubscribe('expense:change', handleRealtimeChange);
    };
  }, [subscribe, unsubscribe, loadData]);

  // Open Add Modal
  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({
      category: 'Transportation',
      expenseName: '',
      amount: '',
      date: toISO(new Date()),
      branchName: user?.branchName && user.branchName !== 'All' ? user.branchName : 'Main',
      paymentMethod: 'Cash',
      receiptNumber: '',
      description: '',
      stockItem: '',
      stockItemName: '',
      stockQuantity: '',
      stockUnitPrice: ''
    });
    setShowFormModal(true);
  };

  // Open Edit Modal
  const openEditModal = (expense) => {
    setEditingExpense(expense);
    const catFormatted = formatCategory(expense.category);
    setFormData({
      category: catFormatted,
      expenseName: expense.title || '',
      amount: expense.amount,
      date: expense.date ? toISO(new Date(expense.date)) : toISO(new Date()),
      branchName: expense.branchName || 'Main',
      paymentMethod: expense.paymentMethod || 'Cash',
      receiptNumber: expense.receiptNumber || '',
      description: expense.description || '',
      stockItem: expense.stockItem?._id || expense.stockItem || '',
      stockItemName: expense.stockItemName || '',
      stockQuantity: expense.stockQuantity != null ? String(expense.stockQuantity) : '',
      stockUnitPrice: expense.stockUnitPrice != null ? String(expense.stockUnitPrice) : ''
    });
    setShowFormModal(true);
  };

  // Save Expense (Create or Update)
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const isOther = formData.category === 'Other Expenses';
    const isStock = formData.category === 'Stock purchased expenses';

    if (isOther && !formData.expenseName.trim()) {
      setError('Please provide an Expense Name / Description for Other Expenses.');
      return;
    }

    if (isStock && !formData.stockItem && !formData.stockItemName) {
      setError('Please select an existing stock item for Stock Purchased Expenses.');
      return;
    }

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    const finalTitle = isStock
      ? (formData.stockItemName ? `Stock Purchase: ${formData.stockItemName}` : 'Stock purchased expenses')
      : isOther
        ? formData.expenseName.trim()
        : formData.category;

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        title: finalTitle,
        expenseName: isOther ? formData.expenseName.trim() : undefined,
        category: formData.category,
        amount: parsedAmount,
        date: formData.date,
        branchName: formData.branchName,
        paymentMethod: formData.paymentMethod,
        receiptNumber: formData.receiptNumber,
        description: formData.description || (isOther ? formData.expenseName.trim() : (isStock && formData.stockItemName ? `Stock purchase for ${formData.stockItemName}` : '')),
        stockItem: isStock ? (formData.stockItem || undefined) : undefined,
        stockItemName: isStock ? formData.stockItemName : undefined,
        stockQuantity: isStock && formData.stockQuantity ? Number(formData.stockQuantity) : undefined,
        stockUnitPrice: isStock && formData.stockUnitPrice ? Number(formData.stockUnitPrice) : undefined,
        type: isStock ? 'STOCK_PURCHASE' : 'MANUAL'
      };

      if (editingExpense) {
        await updateExpense(editingExpense._id, payload, token);
        setMessage('Expense updated successfully.');
      } else {
        await createExpense(payload, token);
        setMessage('Expense recorded successfully.');
      }
      setShowFormModal(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to save expense record.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Void Modal
  const openVoidModal = (expense) => {
    setVoidingExpense(expense);
    setVoidReason('');
    setShowVoidModal(true);
  };

  // Confirm Void
  const handleConfirmVoid = async (e) => {
    e.preventDefault();
    if (!voidReason.trim()) {
      setError('Please specify a reason for voiding this expense.');
      return;
    }

    try {
      setSubmitting(true);
      await voidExpense(voidingExpense._id, voidReason, token);
      setMessage(`Expense "${voidingExpense.title}" has been voided.`);
      setShowVoidModal(false);
      setVoidingExpense(null);
      setVoidReason('');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to void expense.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (expense) => {
    setDeletingExpense(expense);
    setShowDeleteModal(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    try {
      setSubmitting(true);
      await deleteExpense(deletingExpense._id, token);
      setMessage(`Expense "${deletingExpense.title}" permanently deleted.`);
      setShowDeleteModal(false);
      setDeletingExpense(null);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete expense.');
    } finally {
      setSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!expenses.length) return;
    const rows = expenses.map((exp) => ({
      Date: new Date(exp.date).toLocaleDateString(),
      'Expense Name / Title': exp.title,
      Branch: exp.branchName,
      Category: formatCategory(exp.category),
      'Amount (ETB)': exp.amount,
      'Payment Method': exp.paymentMethod,
      'Receipt / Voucher #': exp.receiptNumber || '—',
      Status: exp.status,
      'Recorded By': exp.recordedBy?.fullName || '—',
      Description: exp.description || '',
      'Void Reason': exp.voidReason || ''
    }));
    downloadCSV(`Admin_Expenses_Report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="expenses-page">
      {/* ── HEADER ── */}
      <header className="expenses-header no-print">
        <div className="expenses-header-title">
          <h1>
            <span>💰</span> Expenses Management & Oversight
          </h1>
          <p>
            Central administrative oversight, financial audit trails, and multi-branch expenditure analytics
          </p>
        </div>

        <div className="expenses-header-actions">
          <button className="exp-btn exp-btn-primary" onClick={openAddModal}>
            <span>➕</span> Add Expense
          </button>
          <button className="exp-btn exp-btn-outline" onClick={handleExportCSV}>
            <span>📊</span> Export Excel
          </button>
          <button className="exp-btn exp-btn-outline" onClick={handlePrint}>
            <span>🖨</span> Print Report
          </button>
        </div>
      </header>

      {/* ── ALERTS ── */}
      {error && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#991b1b',
            fontSize: '0.9rem'
          }}
          className="no-print"
        >
          {error}
        </div>
      )}
      {message && (
        <div
          style={{
            background: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#166534',
            fontSize: '0.9rem'
          }}
          className="no-print"
        >
          {message}
        </div>
      )}

      {/* ── TOP FILTER PANEL (DATE SELECTION + EXPENSE TYPE) ── */}
      <section className="exp-top-filters-card no-print">
        <div className="exp-top-filters-wrapper">
          {/* Quick Date Presets */}
          <div className="exp-presets">
            {[
              { label: 'Today', key: 'today' },
              { label: 'Yesterday', key: 'yesterday' },
              { label: 'This Week', key: 'week' },
              { label: 'This Month', key: 'month' },
              { label: 'All Time', key: 'all' }
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                className={`exp-preset-btn ${preset === p.key ? 'active' : ''}`}
                onClick={() => handlePresetChange(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="exp-top-filters-controls">
            {/* From Date */}
            <div className="exp-top-filter-group">
              <label>From Date:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPreset('custom');
                  setPage(1);
                }}
              />
            </div>

            {/* To Date */}
            <div className="exp-top-filter-group">
              <label>To Date:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPreset('custom');
                  setPage(1);
                }}
              />
            </div>

            {/* Expense Type */}
            <div className="exp-top-filter-group">
              <label>Expense Type:</label>
              <select
                className="exp-select"
                value={expenseSource}
                onChange={(e) => {
                  setExpenseSource(e.target.value);
                  setPage(1);
                }}
                title="Expense Type Filter"
              >
                <option value="All">All</option>
                <option value="Admin expenses">Admin expenses</option>
                <option value="Receptionist expenses">Receptionist expenses</option>
              </select>
            </div>

            {/* Refresh / Apply Button */}
            <button
              type="button"
              className="exp-btn exp-btn-primary"
              onClick={loadData}
              title="Apply Filters and Refresh"
              disabled={loading}
            >
              <span>🔄</span> {loading ? 'Refreshing...' : 'Apply / Refresh'}
            </button>
          </div>
        </div>
      </section>

      {/* ── DASHBOARD-STYLE SUMMARY CARDS (MAIN DASHBOARD LOOK & FEEL) ── */}
      <section className="exec-cards-grid">
        <StatCard
          icon="💰"
          label="Total Expenses"
          value={summary.totalAmount}
          color="blue"
          isCurrency
        />
        <StatCard
          icon="👩‍💼"
          label="Receptionist Expenses"
          value={summary.receptionistExpenses || 0}
          color="teal"
          isCurrency
        />
        <StatCard
          icon="🏢"
          label="Admin Expenses"
          value={summary.adminExpenses || 0}
          color="purple"
          isCurrency
        />
        <StatCard
          icon="📦"
          label="Stock Expenses"
          value={summary.stockExpensesTotal || 0}
          color="green"
          isCurrency
        />
        <StatCard
          icon="🚗"
          label="Transportation"
          value={summary.transportationTotal || 0}
          color="amber"
          isCurrency
        />
        <StatCard
          icon="📄"
          label="Printer Paper"
          value={summary.printerPaperTotal || 0}
          color="indigo"
          isCurrency
        />
        <StatCard
          icon="🏷"
          label="Other Expenses"
          value={summary.otherExpensesTotal || 0}
          color="orange"
          isCurrency
        />
        {summary.voidedCount > 0 && (
          <StatCard
            icon="🚫"
            label="Voided Records"
            value={summary.voidedAmount || 0}
            color="pink"
            isCurrency
          />
        )}
      </section>

      {/* ── CHARTS SECTION (Admin Analytics) ── */}
      {(summary.byCategory?.length > 0 || summary.dailyTrend?.length > 0) && (
        <section className="expenses-charts-grid no-print">
          {/* Category Breakdown */}
          <article className="exp-chart-card">
            <h3 className="exp-chart-title">
              <span>📊</span> Category Spending Distribution
            </h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart
                  data={summary.byCategory || []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [`${formatETB(value)}`, 'Total']}
                    contentStyle={{ borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                  <Bar dataKey="totalAmount" radius={[4, 4, 0, 0]}>
                    {(summary.byCategory || []).map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* Daily Trend */}
          <article className="exp-chart-card">
            <h3 className="exp-chart-title">
              <span>📈</span> Daily Expenditure Trend
            </h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart
                  data={summary.dailyTrend || []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [`${formatETB(value)}`, 'Amount']}
                    contentStyle={{ borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalAmount"
                    stroke="#0284c7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      )}

      {/* ── TOOLBAR & FILTERS ── */}
      {/* ── FILTER & SEARCH TOOLBAR (TABLE LEVEL) ── */}
      <section className="expenses-toolbar no-print">
        <div className="expenses-toolbar-row">
          <div className="exp-search-box">
            <span className="exp-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, voucher # or notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Branch Filter */}
          <select
            className="exp-select"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Branches</option>
            <option value="Main">Main Branch</option>
            <option value="Otona">Otona Branch</option>
          </select>

          {/* User Filter */}
          <select
            className="exp-select"
            value={recordedBy}
            onChange={(e) => {
              setRecordedBy(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Staff / Recorders</option>
            {usersList.map((u) => (
              <option key={u._id || u.id} value={u._id || u.id}>
                {u.fullName} ({u.role})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            className="exp-select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            <option value="Stock purchased expenses">Stock purchased expenses</option>
          </select>

          {/* Payment Method */}
          <select
            className="exp-select"
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Payment Methods</option>
            {EXPENSE_PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="exp-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Voided">Voided</option>
          </select>
        </div>
      </section>

      {/* ── EXPENSES TABLE ── */}
      <section className="expenses-table-card">
        <div className="expenses-table-wrapper">
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Expense Name / Description</th>
                <th>Branch</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Receipt #</th>
                <th>Recorded By</th>
                <th>Status</th>
                <th className="no-print" style={{ textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="spinner-small" /> Loading expense records...
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="10">
                    <div className="exp-empty-state">
                      <div className="exp-empty-icon">💸</div>
                      <h3>No expense records found</h3>
                      <p>Try adjusting your search criteria or date filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr
                    key={exp._id}
                    className={exp.status === 'Voided' ? 'row-voided' : ''}
                  >
                    <td>{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="title-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {exp.type === 'STOCK_PURCHASE' && (
                          <span className="exp-stock-tag" title="Stock System Generated">📦 Stock</span>
                        )}
                        <strong>{exp.title}</strong>
                      </div>
                      {exp.type === 'STOCK_PURCHASE' && exp.stockQuantity != null && (
                        <div style={{ fontSize: '0.78rem', color: '#0d9488', fontWeight: 600, marginTop: '2px' }}>
                          Qty: {exp.stockQuantity}{exp.stockUnitPrice != null ? ` × ${formatETB(exp.stockUnitPrice)}` : ''}
                        </div>
                      )}
                      {exp.description && exp.description !== exp.title && (
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            marginTop: '2px'
                          }}
                        >
                          {exp.description}
                        </div>
                      )}
                      {exp.status === 'Voided' && exp.voidReason && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#dc2626',
                            fontStyle: 'italic',
                            marginTop: '2px'
                          }}
                        >
                          Void reason: {exp.voidReason}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-branch">{exp.branchName}</span>
                    </td>
                    <td>
                      <span className={`badge ${exp.type === 'STOCK_PURCHASE' ? 'badge-stock' : 'badge-category'}`}>
                        {formatCategory(exp.category)}
                      </span>
                    </td>
                    <td className="amount-cell" style={{ fontWeight: 700 }}>
                      {formatETB(exp.amount)}
                    </td>
                    <td>
                      <span className="badge badge-payment">{exp.paymentMethod}</span>
                    </td>
                    <td>
                      <code>{exp.receiptNumber || '—'}</code>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {exp.recordedBy?.fullName || 'System (Stock)'}
                    </td>
                    <td>
                      {exp.status === 'Active' ? (
                        <span className="badge badge-active">Active</span>
                      ) : (
                        <span className="badge badge-voided">🚫 Voided</span>
                      )}
                    </td>
                    <td className="no-print" style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        {exp.status === 'Active' && (
                          <>
                            <button
                              className="action-btn"
                              title="Edit Expense"
                              onClick={() => openEditModal(exp)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="action-btn action-btn-warning"
                              title="Void Expense"
                              onClick={() => openVoidModal(exp)}
                            >
                              🚫 Void
                            </button>
                          </>
                        )}
                        <button
                          className="action-btn action-btn-danger"
                          title="Permanently Delete"
                          onClick={() => openDeleteModal(exp)}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ── */}
        {pagination.pages > 1 && (
          <div className="expenses-pagination no-print">
            <div>
              Showing {expenses.length} of {pagination.total} expenses
            </div>
            <div className="pagination-controls">
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ◀ Prev
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    className={`page-btn ${page === pageNum ? 'active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {pagination.pages > 5 && <span>...</span>}
              <button
                className="page-btn"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── ADD / EDIT MODAL ── */}
      {showFormModal && (
        <div
          className="exp-modal-backdrop no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowFormModal(false);
            }
          }}
        >
          <div className="exp-modal-content">
            <header className="exp-modal-header">
              <h2>
                <span>{editingExpense ? '✏️' : '➕'}</span>
                {editingExpense ? 'Edit Expense Record' : 'Record Operational Expense'}
              </h2>
              <button
                className="exp-modal-close"
                onClick={() => setShowFormModal(false)}
                disabled={submitting}
              >
                &times;
              </button>
            </header>

            <form onSubmit={handleSaveExpense}>
              <div className="exp-modal-body">
                <div className="exp-form-row">
                  <div className="exp-form-group">
                    <label>Branch *</label>
                    <select
                      value={formData.branchName}
                      onChange={(e) =>
                        setFormData({ ...formData, branchName: e.target.value })
                      }
                    >
                      <option value="Main">Main Branch</option>
                      <option value="Otona">Otona Branch</option>
                    </select>
                  </div>

                  <div className="exp-form-group">
                    <label>Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setFormData({
                          ...formData,
                          category: newCat,
                          ...(newCat !== 'Stock purchased expenses' ? { stockItem: '', stockItemName: '', stockQuantity: '', stockUnitPrice: '' } : {})
                        });
                      }}
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="Stock purchased expenses">Stock purchased expenses</option>
                    </select>
                  </div>
                </div>

                {/* Conditional fields for Stock purchased expenses */}
                {formData.category === 'Stock purchased expenses' && (
                  <div
                    style={{
                      background: 'rgba(13, 148, 136, 0.06)',
                      border: '1px solid rgba(13, 148, 136, 0.25)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', color: '#0f766e', fontWeight: 600 }}>
                      📦 Stock Purchase Information (Selected from Stock Management)
                    </div>
                    <div className="exp-form-group">
                      <label>Stock Item *</label>
                      <select
                        required
                        value={formData.stockItem}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const item = stockItemsList.find((i) => (i._id || i.id) === selectedId);
                          const unitPrice = item?.purchasePrice ?? formData.stockUnitPrice ?? '';
                          const qty = formData.stockQuantity ? Number(formData.stockQuantity) : 1;
                          const total = unitPrice && qty ? (qty * Number(unitPrice)).toFixed(2) : formData.amount;
                          setFormData({
                            ...formData,
                            stockItem: selectedId,
                            stockItemName: item?.itemName || '',
                            stockUnitPrice: unitPrice,
                            stockQuantity: formData.stockQuantity || (qty ? String(qty) : ''),
                            amount: total || formData.amount
                          });
                        }}
                      >
                        <option value="">-- Choose Existing Stock Item --</option>
                        {stockItemsList.map((item) => (
                          <option key={item._id || item.id} value={item._id || item.id}>
                            {item.itemName} ({item.unit}) — Current Stock: {item.currentQuantity}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="exp-form-row">
                      <div className="exp-form-group">
                        <label>Quantity Purchased *</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          placeholder="e.g. 10"
                          value={formData.stockQuantity}
                          onChange={(e) => {
                            const qty = e.target.value;
                            const unitPrice = formData.stockUnitPrice ? Number(formData.stockUnitPrice) : 0;
                            const total = qty && unitPrice ? (Number(qty) * unitPrice).toFixed(2) : formData.amount;
                            setFormData({
                              ...formData,
                              stockQuantity: qty,
                              amount: total || formData.amount
                            });
                          }}
                        />
                      </div>

                      <div className="exp-form-group">
                        <label>Unit Purchase Price (ETB) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="e.g. 500.00"
                          value={formData.stockUnitPrice}
                          onChange={(e) => {
                            const unitPrice = e.target.value;
                            const qty = formData.stockQuantity ? Number(formData.stockQuantity) : 0;
                            const total = qty && unitPrice ? (qty * Number(unitPrice)).toFixed(2) : formData.amount;
                            setFormData({
                              ...formData,
                              stockUnitPrice: unitPrice,
                              amount: total || formData.amount
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional Expense Name / Description for Other Expenses */}
                {formData.category === 'Other Expenses' ? (
                  <div className="exp-form-group">
                    <label>Expense Name / Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Office maintenance, Generator oil filter, Cleaning chemicals..."
                      value={formData.expenseName}
                      onChange={(e) =>
                        setFormData({ ...formData, expenseName: e.target.value })
                      }
                    />
                  </div>
                ) : formData.category !== 'Stock purchased expenses' ? (
                  <div
                    style={{
                      background: 'rgba(2, 132, 199, 0.06)',
                      border: '1px solid rgba(2, 132, 199, 0.2)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      color: '#0369a1'
                    }}
                  >
                    Recording: <strong>{formData.category}</strong>. Only amount is required.
                  </div>
                ) : null}

                <div className="exp-form-row">
                  <div className="exp-form-group">
                    <label>Amount (ETB) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                    />
                  </div>

                  <div className="exp-form-group">
                    <label>Payment Method *</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        setFormData({ ...formData, paymentMethod: e.target.value })
                      }
                    >
                      {EXPENSE_PAYMENT_METHODS.map((pm) => (
                        <option key={pm} value={pm}>
                          {pm}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="exp-form-row">
                  <div className="exp-form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>

                  <div className="exp-form-group">
                    <label>Receipt / Voucher Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="Auto-generated if left blank"
                      value={formData.receiptNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, receiptNumber: e.target.value })
                      }
                    />
                  </div>
                </div>

                {formData.category !== 'Other Expenses' && (
                  <div className="exp-form-group">
                    <label>Additional Notes (Optional)</label>
                    <textarea
                      placeholder="Optional remarks or supplier details..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <footer className="exp-modal-footer">
                <button
                  type="button"
                  className="exp-btn exp-btn-outline"
                  onClick={() => setShowFormModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="exp-btn exp-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingExpense ? 'Save Changes' : 'Record Expense'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ── VOID CONFIRMATION MODAL ── */}
      {showVoidModal && voidingExpense && (
        <div
          className="exp-modal-backdrop no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowVoidModal(false);
            }
          }}
        >
          <div className="exp-modal-content" style={{ maxWidth: '480px' }}>
            <header className="exp-modal-header">
              <h2 style={{ color: '#dc2626' }}>
                <span>🚫</span> Void Expense Record
              </h2>
              <button
                className="exp-modal-close"
                onClick={() => setShowVoidModal(false)}
                disabled={submitting}
              >
                &times;
              </button>
            </header>

            <form onSubmit={handleConfirmVoid}>
              <div className="exp-modal-body">
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Are you sure you want to void this expense? Voided expenses are crossed out in reports
                  and excluded from total calculations, preserving an auditable trail.
                </p>

                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '0.85rem'
                  }}
                >
                  <div>
                    <strong>Expense:</strong> {voidingExpense.title}
                  </div>
                  <div>
                    <strong>Branch:</strong> {voidingExpense.branchName}
                  </div>
                  <div>
                    <strong>Category:</strong> {formatCategory(voidingExpense.category)}
                  </div>
                  <div>
                    <strong>Amount:</strong> {formatETB(voidingExpense.amount)}
                  </div>
                  <div>
                    <strong>Receipt #:</strong> {voidingExpense.receiptNumber || '—'}
                  </div>
                  {voidingExpense.type === 'STOCK_PURCHASE' && (
                    <div style={{ marginTop: '8px', color: '#0f766e', fontWeight: 600 }}>
                      📦 Stock Purchase Record (Quantity & physical inventory will NOT be altered)
                    </div>
                  )}
                </div>

                <div className="exp-form-group">
                  <label>Reason for Voiding *</label>
                  <textarea
                    required
                    placeholder="Provide a clear justification for voiding..."
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                  />
                </div>
              </div>

              <footer className="exp-modal-footer">
                <button
                  type="button"
                  className="exp-btn exp-btn-outline"
                  onClick={() => setShowVoidModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="exp-btn exp-btn-danger"
                  disabled={submitting}
                >
                  {submitting ? 'Voiding...' : 'Confirm Void'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {showDeleteModal && deletingExpense && (
        <div
          className="exp-modal-backdrop no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowDeleteModal(false);
            }
          }}
        >
          <div className="exp-modal-content" style={{ maxWidth: '480px' }}>
            <header className="exp-modal-header">
              <h2 style={{ color: '#dc2626' }}>
                <span>🗑</span> Hard Delete Expense
              </h2>
              <button
                className="exp-modal-close"
                onClick={() => setShowDeleteModal(false)}
                disabled={submitting}
              >
                &times;
              </button>
            </header>

            <div className="exp-modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#b91c1c', fontWeight: 600 }}>
                ⚠️ Warning: This will permanently remove the expense record from the database!
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                If you simply wish to cancel or invalidate the transaction while keeping an audit trail, use
                the <strong>Void</strong> option instead.
              </p>

              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '0.85rem'
                }}
              >
                <div>
                  <strong>Expense:</strong> {deletingExpense.title}
                </div>
                <div>
                  <strong>Branch:</strong> {deletingExpense.branchName}
                </div>
                <div>
                  <strong>Amount:</strong> {formatETB(deletingExpense.amount)}
                </div>
                {deletingExpense.type === 'STOCK_PURCHASE' && (
                  <div style={{ marginTop: '8px', color: '#0f766e', fontWeight: 600 }}>
                    📦 Stock Purchase Record (Physical inventory & stock history will NOT be affected)
                  </div>
                )}
              </div>
            </div>

            <footer className="exp-modal-footer">
              <button
                type="button"
                className="exp-btn exp-btn-outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="exp-btn exp-btn-danger"
                disabled={submitting}
                onClick={handleConfirmDelete}
              >
                {submitting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ── PRINT-ONLY DEDICATED REPORT SHEET ── */}
      <div className="exp-print-container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #0284c7',
            paddingBottom: '12px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Logo size={56} style={{ borderRadius: '6px' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#075985' }}>
                ETU DIAGNOSTIC LABORATORY
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#475569' }}>
                Comprehensive Expenses & Operations Financial Audit Report
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
            <div>
              <strong>Printed:</strong> {new Date().toLocaleString()}
            </div>
            <div>
              <strong>Branch Filter:</strong> {branch}
            </div>
            <div>
              <strong>Period:</strong> {dateFrom || 'Start'} to {dateTo || 'Today'}
            </div>
            <div>
              <strong>Authorized By:</strong> {user?.fullName || 'Admin'}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            marginBottom: '18px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
              TOTAL EXPENSES
            </span>
            <strong style={{ fontSize: '1.1rem', color: '#0284c7' }}>
              {formatETB(summary.totalAmount)}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
              RECEPTIONIST EXPENSES
            </span>
            <strong style={{ fontSize: '1.1rem' }}>{formatETB(summary.receptionistExpenses || 0)}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
              ADMIN EXPENSES
            </span>
            <strong style={{ fontSize: '1.1rem' }}>{formatETB(summary.adminExpenses || 0)}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
              STOCK EXPENSES
            </span>
            <strong style={{ fontSize: '1.1rem' }}>{formatETB(summary.stockExpensesTotal || 0)}</strong>
          </div>
        </div>

        {/* Category Breakdown Table in Print */}
        {summary.byCategory?.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#0f172a' }}>
              Category Breakdown
            </h4>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.78rem',
                marginBottom: '16px'
              }}
            >
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '4px 8px', textAlign: 'center' }}>Transactions</th>
                  <th style={{ padding: '4px 8px', textAlign: 'right' }}>Total Amount</th>
                  <th style={{ padding: '4px 8px', textAlign: 'right' }}>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.byCategory.map((cat) => {
                  const pct =
                    summary.totalAmount > 0
                      ? ((cat.totalAmount / summary.totalAmount) * 100).toFixed(1)
                      : 0;
                  return (
                    <tr key={cat.category} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 8px' }}>{formatCategory(cat.category)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>{cat.count}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>
                        {formatETB(cat.totalAmount)}
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#0f172a' }}>
          Detailed Transaction Ledger
        </h4>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.78rem',
            marginBottom: '30px'
          }}
        >
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Expense Name / Description</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Branch</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Category</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Payment</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Voucher #</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Recorded By</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr
                key={exp._id}
                style={{
                  borderBottom: '1px solid #e2e8f0',
                  color: exp.status === 'Voided' ? '#94a3b8' : '#0f172a'
                }}
              >
                <td style={{ padding: '6px 8px' }}>
                  {new Date(exp.date).toLocaleDateString()}
                </td>
                <td
                  style={{
                    padding: '6px 8px',
                    textDecoration: exp.status === 'Voided' ? 'line-through' : 'none'
                  }}
                >
                  {exp.title}
                </td>
                <td style={{ padding: '6px 8px' }}>{exp.branchName}</td>
                <td style={{ padding: '6px 8px' }}>{formatCategory(exp.category)}</td>
                <td
                  style={{
                    padding: '6px 8px',
                    textAlign: 'right',
                    fontWeight: 700,
                    textDecoration: exp.status === 'Voided' ? 'line-through' : 'none'
                  }}
                >
                  {formatETB(exp.amount)}
                </td>
                <td style={{ padding: '6px 8px' }}>{exp.paymentMethod}</td>
                <td style={{ padding: '6px 8px' }}>{exp.receiptNumber || '—'}</td>
                <td style={{ padding: '6px 8px' }}>{exp.recordedBy?.fullName || '—'}</td>
                <td style={{ padding: '6px 8px' }}>{exp.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px dashed #cbd5e1'
          }}
        >
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '6px', height: '40px' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Internal Auditor</span>
          </div>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '6px', height: '40px' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Managing Director / CEO</span>
          </div>
        </div>
      </div>
    </div>
  );
}
