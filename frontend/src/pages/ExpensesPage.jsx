import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { formatETB } from '../utils/currencyHelper.js';
import {
  getExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  voidExpense,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  formatCategory
} from '../services/expenseService.js';
import Logo from '../assets/Logo.jsx';
import '../styles/pages/expenses.css';

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

export default function ExpensesPage() {
  const { token, user } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();

  // State
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalCount: 0,
    averageAmount: 0,
    topCategory: 'None',
    transportationTotal: 0,
    printerPaperTotal: 0,
    otherExpensesTotal: 0,
    voidedCount: 0,
    voidedAmount: 0
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [status, setStatus] = useState('All');
  const [preset, setPreset] = useState('month');
  const [dateFrom, setDateFrom] = useState(() => getPresetRange('month').dateFrom);
  const [dateTo, setDateTo] = useState(() => getPresetRange('month').dateTo);
  const [page, setPage] = useState(1);

  // Form modal (Create only)
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Transportation',
    expenseName: '',
    amount: '',
    date: toISO(new Date()),
    paymentMethod: 'Cash',
    receiptNumber: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

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
  }, [token, page, search, category, paymentMethod, status, dateFrom, dateTo]);

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
    setFormData({
      category: 'Transportation',
      expenseName: '',
      amount: '',
      date: toISO(new Date()),
      paymentMethod: 'Cash',
      receiptNumber: '',
      description: ''
    });
    setShowFormModal(true);
  };

  // Save New Expense
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const isOther = formData.category === 'Other Expenses';
    if (isOther && !formData.expenseName.trim()) {
      setError('Please provide an Expense Name / Description for Other Expenses.');
      return;
    }

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    const finalTitle = isOther
      ? formData.expenseName.trim()
      : formData.category;

    try {
      setSubmitting(true);
      setError('');

      await createExpense(
        {
          title: finalTitle,
          expenseName: isOther ? formData.expenseName.trim() : undefined,
          category: formData.category,
          amount: parsedAmount,
          date: formData.date,
          paymentMethod: formData.paymentMethod,
          receiptNumber: formData.receiptNumber,
          description: formData.description || (isOther ? formData.expenseName.trim() : '')
        },
        token
      );
      setMessage('Expense recorded successfully.');
      setShowFormModal(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to record expense.');
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
      Category: formatCategory(exp.category),
      'Amount (ETB)': exp.amount,
      'Payment Method': exp.paymentMethod,
      'Receipt / Voucher #': exp.receiptNumber || '—',
      Branch: exp.branchName,
      Status: exp.status,
      'Recorded By': exp.recordedBy?.fullName || '—',
      Description: exp.description || ''
    }));
    downloadCSV(`Expenses_Report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
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
            <span>💰</span> Expenses
          </h1>
          <p>
            Track and manage daily operational expenses for <strong>{user?.branchName || 'Main'} Branch</strong>
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
          icon="🚗"
          label="Transportation"
          value={summary.transportationTotal || 0}
          color="teal"
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
      </section>

      {/* ── TOOLBAR & FILTERS ── */}
      <section className="expenses-toolbar no-print">
        <div className="expenses-toolbar-row">
          <div className="exp-search-box">
            <span className="exp-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search expenses by name, voucher # or note..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

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
          </select>

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

        <div className="expenses-toolbar-row">
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

          <div className="exp-date-inputs">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPreset('custom');
                setPage(1);
              }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>To:</span>
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
                <th>Category</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Receipt / Voucher #</th>
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
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="spinner-small" /> Loading expenses...
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="exp-empty-state">
                      <div className="exp-empty-icon">💸</div>
                      <h3>No expense records found</h3>
                      <p>
                        {search || category !== 'All' || status !== 'All'
                          ? 'Try adjusting your search or filters.'
                          : 'Click "Add Expense" above to record your first operational expense.'}
                      </p>
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
                      <strong>{exp.title}</strong>
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
                      <span className="badge badge-category">{formatCategory(exp.category)}</span>
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
                      {exp.recordedBy?.fullName || '—'}
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
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'var(--border-subtle, #f1f5f9)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 500
                          }}
                          title="Expense saved. Changes require administrator assistance."
                        >
                          🔒 Saved
                        </span>
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
                <span>➕</span> Record Operational Expense
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
                <div className="exp-form-group">
                  <label>Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional Expense Name / Description for Other Expenses */}
                {formData.category === 'Other Expenses' ? (
                  <div className="exp-form-group">
                    <label>Expense Name / Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Printer ink, Office maintenance, Cleaning supplies..."
                      value={formData.expenseName}
                      onChange={(e) =>
                        setFormData({ ...formData, expenseName: e.target.value })
                      }
                    />
                  </div>
                ) : (
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
                )}

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
                    <label>Receipt / Voucher # (Optional)</label>
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
                      placeholder="Optional notes or context..."
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
                  {submitting ? 'Saving...' : 'Record Expense'}
                </button>
              </footer>
            </form>
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
                Operational Expenses Audit Report — {user?.branchName || 'Main'} Branch
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
            <div>
              <strong>Printed:</strong> {new Date().toLocaleString()}
            </div>
            <div>
              <strong>Period:</strong> {dateFrom || 'Start'} to {dateTo || 'Today'}
            </div>
            <div>
              <strong>Auditor:</strong> {user?.fullName || 'Reception'}
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
              TRANSPORTATION
            </span>
            <strong style={{ fontSize: '1.1rem' }}>{formatETB(summary.transportationTotal || 0)}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
              PRINTER PAPER
            </span>
            <strong style={{ fontSize: '1.1rem' }}>{formatETB(summary.printerPaperTotal || 0)}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
              OTHER EXPENSES
            </span>
            <strong style={{ fontSize: '1.1rem' }}>{formatETB(summary.otherExpensesTotal || 0)}</strong>
          </div>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
            marginBottom: '30px'
          }}
        >
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Expense Name / Item</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Category</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Payment</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Voucher #</th>
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
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Prepared By</span>
          </div>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '6px', height: '40px' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Approved By</span>
          </div>
        </div>
      </div>
    </div>
  );
}
