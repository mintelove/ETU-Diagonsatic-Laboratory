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

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api.js';

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
  const [reportMode, setReportMode] = useState('single'); // 'single' | 'range'
  const [date, setDate] = useState(toISO(new Date()));
  const [dateFrom, setDateFrom] = useState(toISO(new Date()));
  const [dateTo, setDateTo] = useState(toISO(new Date()));
  const [receptionist, setReceptionist] = useState('all');
  const [collector, setCollector] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  /* ── Date Range Validation ───────────────────────────── */
  useEffect(() => {
    if (reportMode === 'range' && dateFrom && dateTo && dateFrom > dateTo) {
      setValidationError('From Date cannot be later than To Date.');
    } else {
      setValidationError('');
    }
  }, [reportMode, dateFrom, dateTo]);

  /* ── Load Transaction Report ────────────────────────── */
  const loadReport = useCallback(async () => {
    if (reportMode === 'range' && dateFrom && dateTo && dateFrom > dateTo) {
      setValidationError('From Date cannot be later than To Date.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setValidationError('');
      const params = {
        mode: reportMode,
        receptionist,
        collector
      };

      if (reportMode === 'range') {
        params.dateFrom = dateFrom;
        params.dateTo = dateTo;
      } else {
        params.date = date;
      }

      const res = await api.get('/reports/transactions', { params });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [reportMode, date, dateFrom, dateTo, receptionist, collector]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

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
        <td style="padding: 8px; border-bottom: 1px solid #d6e2e7;">${safe(t.tests)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #d6e2e7; text-align: right; font-weight: 600;">ETB ${(t.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
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
          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f0f7fb; padding: 12px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #d0e4f0; font-size: 13px; }
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
          <div class="meta-item"><strong>Receptionist Filter</strong>${recName}</div>
          <div class="meta-item"><strong>Sample Collector Filter</strong>${colName}</div>
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
            <span>Total Revenue: ETB ${(data.summary?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
          
          {/* Report Mode Toggle Selector */}
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
        </div>

        {/* Filter Controls Responsive Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.2rem', alignItems: 'flex-end' }}>
          
          {/* Date Picker Controls */}
          {reportMode === 'single' ? (
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
            ETB {validationError ? '0.00' : (data?.summary?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </strong>
        </article>
      </div>

      {/* ═══ TRANSACTION RESULTS SECTION ══════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem', padding: '0 4px' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-primary,#075c91)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📋</span> Transaction Report <span style={{ fontSize: '12px', background: 'var(--color-background,#e2ecef)', color: 'var(--color-on-surface-variant,#37474f)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>{data?.transactions?.length || 0} Transactions Found</span>
        </h2>
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
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Receipt / ID</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Patient Information</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Requested Tests</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Grand Total</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Payment Info</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Receptionist</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Sample Collector</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Collection Status</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t, i) => (
                  <tr key={t._id} style={{ borderBottom: '1px solid var(--color-border,#edf3f6)' }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-on-surface-variant,#78909c)' }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-primary,#075c91)' }}>{t.transactionId}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <strong>{t.patientName}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--color-on-surface-variant,#607d8b)' }}>{t.patientId} · {t.age} yrs / {t.sex}</div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-on-surface,#263238)' }}>{t.tests}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#2e7d32' }}>
                      ETB {t.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                  </tr>
                ))}
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
    </section>
  );
}
