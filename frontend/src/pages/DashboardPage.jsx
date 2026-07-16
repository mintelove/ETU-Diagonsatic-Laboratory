/**
 * ETU Diagnostic Laboratory — Enterprise Admin Dashboard
 *
 * Premium executive analytics dashboard with gradient stat cards,
 * interactive Recharts visualizations, data tables, critical stock
 * monitoring, quick actions, date range filtering, and CSV/PDF export.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getDashboardData, globalSearch } from '../services/dashboardService.js';
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

/* ── Color Palettes ──────────────────────────────────── */
const PIE_COLORS = ['#0b6bcb', '#00897b', '#e65100', '#6a1b9a', '#c62828', '#ff8f00', '#2e7d32', '#283593'];
const GENDER_COLORS = { Male: '#1e88e5', Female: '#f06292', Other: '#78909c' };

/* ── Animated Counter Hook ───────────────────────────── */
function useAnimatedValue(target, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
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

/* ── Stat Card Component ─────────────────────────────── */
function StatCard({ icon, label, value, color }) {
  const animated = useAnimatedValue(typeof value === 'number' ? value : 0);
  const display = typeof value === 'number' ? animated.toLocaleString() : (value ?? '—');
  return (
    <article className={`exec-card ${color}`}>
      <div className="card-icon">{icon}</div>
      <div className="card-value">{display}</div>
      <div className="card-label">{label}</div>
    </article>
  );
}

/* ── Custom Tooltip ──────────────────────────────────── */
function CustomTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)',
      fontSize: 13, fontFamily: 'Inter, sans-serif',
    }}>
      <p style={{ fontWeight: 700, marginBottom: 4, color: '#171c20' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

/* ── Date helpers ────────────────────────────────────── */
function toISO(d) { return d.toISOString().split('T')[0]; }
function getPresetRange(preset) {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  switch (preset) {
    case 'today': return { dateFrom: toISO(today), dateTo: toISO(today) };
    case 'yesterday': { const y = new Date(today); y.setDate(y.getDate() - 1); return { dateFrom: toISO(y), dateTo: toISO(y) }; }
    case 'week': { const w = new Date(today); w.setDate(w.getDate() - 6); return { dateFrom: toISO(w), dateTo: toISO(today) }; }
    case 'lastweek': { const e = new Date(today); e.setDate(e.getDate() - 7); const s = new Date(e); s.setDate(s.getDate() - 6); return { dateFrom: toISO(s), dateTo: toISO(e) }; }
    case 'month': { const m = new Date(today); m.setDate(1); return { dateFrom: toISO(m), dateTo: toISO(today) }; }
    case 'lastmonth': { const fm = new Date(today.getFullYear(), today.getMonth() - 1, 1); const lm = new Date(today.getFullYear(), today.getMonth(), 0); return { dateFrom: toISO(fm), dateTo: toISO(lm) }; }
    case 'year': { const yr = new Date(today.getFullYear(), 0, 1); return { dateFrom: toISO(yr), dateTo: toISO(today) }; }
    default: return {};
  }
}

/* ── CSV Export ───────────────────────────────────────── */
function downloadCSV(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ── PDF Export (browser print) ──────────────────────── */
function exportPDF() {
  window.print();
}

/* ══════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ══════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* ── State ─────────────────────────────────────────── */
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(new Date());
  const [filterPreset, setFilterPreset] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [revenueView, setRevenueView] = useState('30d');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchRef = useRef(null);

  /* ── Load dashboard data ───────────────────────────── */
  const loadDashboard = useCallback(async (filters = {}) => {
    try {
      setError('');
      const result = await getDashboardData(filters);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Initial load + auto-refresh ───────────────────── */
  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => loadDashboard(), 60000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  /* ── Live clock ────────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Filter changes ────────────────────────────────── */
  const applyPreset = (preset) => {
    setFilterPreset(preset);
    setCustomFrom('');
    setCustomTo('');
    const range = getPresetRange(preset);
    loadDashboard(range);
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return;
    setFilterPreset('custom');
    loadDashboard({ dateFrom: customFrom, dateTo: customTo });
  };

  const clearFilters = () => {
    setFilterPreset('');
    setCustomFrom('');
    setCustomTo('');
    loadDashboard();
  };

  /* ── Global search ─────────────────────────────────── */
  useEffect(() => {
    if (search.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await globalSearch(search.trim());
        setSearchResults(res.results || []);
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Close search results on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Derived data ──────────────────────────────────── */
  const s = data?.summary || {};
  const rev = data?.revenue || {};
  const charts = data?.charts || {};
  const stock = data?.stock || {};
  const tables = data?.tables || {};

  // Revenue trend data
  const trendData = useMemo(() => {
    const raw = charts.revenueTrend || [];
    if (revenueView === '7d') return raw.slice(-7);
    if (revenueView === '14d') return raw.slice(-14);
    return raw;
  }, [charts.revenueTrend, revenueView]);

  // Top samples with total for percentage
  const topSamplesData = useMemo(() => {
    const arr = charts.topSamples || [];
    const total = arr.reduce((a, b) => a + b.count, 0);
    return arr.map(x => ({ ...x, pct: total ? ((x.count / total) * 100).toFixed(1) : 0 }));
  }, [charts.topSamples]);

  /* ── Loading skeleton ──────────────────────────────── */
  if (loading && !data) {
    return (
      <section className="page admin-dashboard">
        <div className="dash-skeleton">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton-card" />)}
        </div>
        <div className="dash-skeleton" style={{ gridTemplateColumns: '1fr' }}>
          <div className="skeleton-card" style={{ height: 300 }} />
        </div>
        <div className="dash-skeleton" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-card" style={{ height: 280 }} />)}
        </div>
      </section>
    );
  }

  return (
    <section className="page admin-dashboard">

      {/* ═══ HEADER ═══════════════════════════════════ */}
      <header className="dash-header">
        <div className="header-left">
          <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)', fontWeight: 700, margin: '0 0 2px' }}>
            ETU Diagnostic Laboratory
          </p>
          <h1>Admin Dashboard</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            {clock.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="header-right">
          <span className="live-clock">
            🕐 {clock.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <div className="global-search" ref={searchRef} style={{ position: 'relative' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search patients, stock, users..."
              style={{
                padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-outline-variant)', fontSize: 'var(--text-xs)',
                width: 240, fontFamily: 'var(--font-body)', background: 'var(--color-surface-bright)',
              }}
            />
            {searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 500,
                maxHeight: 300, overflowY: 'auto', border: '1px solid var(--color-outline-variant)',
              }}>
                {searchResults.map((r, i) => (
                  <Link key={i} to={r.path} style={{
                    display: 'block', padding: '0.6rem 0.85rem', textDecoration: 'none',
                    borderBottom: '1px solid rgba(0,0,0,0.04)', color: 'inherit',
                  }}>
                    <strong style={{ fontSize: '0.8rem' }}>{r.label}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', display: 'block' }}>
                      {r.type} · {r.detail}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══ ERROR BANNER ═════════════════════════════ */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
          background: 'var(--color-error-container)', color: 'var(--color-error)',
          fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-4)',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ═══ SYSTEM STATUS BAR ════════════════════════ */}
      <div className="system-status-bar">
        <div className="system-status-item">
          <span className={`status-indicator ${data?.system?.api === 'Operational' ? 'green' : 'red'}`} />
          API: {data?.system?.api || 'Unknown'}
        </div>
        <div className="system-status-item">
          <span className={`status-indicator ${data?.system?.database === 'Connected' ? 'green' : 'red'}`} />
          Database: {data?.system?.database || 'Unknown'}
        </div>
        <div className="system-status-item">
          <span className="status-indicator green" />
          Logged in as: <strong style={{ marginLeft: 4 }}>{user?.fullName}</strong>
        </div>
        <div className="system-status-item" style={{ marginLeft: 'auto' }}>
          <span className="status-indicator green" />
          {user?.role}
        </div>
      </div>

      {/* ═══ DATE FILTER BAR ══════════════════════════ */}
      <div className="dash-filter-bar">
        {['', 'today', 'yesterday', 'week', 'lastweek', 'month', 'lastmonth', 'year'].map(p => (
          <button
            key={p}
            className={`filter-chip ${filterPreset === p ? 'active' : ''}`}
            onClick={() => p === '' ? clearFilters() : applyPreset(p)}
          >
            {p === '' ? 'All Time' : p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday'
              : p === 'week' ? 'This Week' : p === 'lastweek' ? 'Last Week'
              : p === 'month' ? 'This Month' : p === 'lastmonth' ? 'Last Month' : 'This Year'}
          </button>
        ))}
        <div className="date-inputs">
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
          <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)' }}>to</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          <button className="filter-chip active" onClick={applyCustomRange} style={{ padding: '0.4rem 0.7rem' }}>Apply</button>
        </div>
      </div>

      {/* ═══ ROW 1 — EXECUTIVE SUMMARY CARDS ═════════ */}
      <div className="exec-cards-grid">
        <StatCard icon="💰" label="Daily Income"           value={rev.dailyIncome}   color="blue" />
        <StatCard icon="📈" label="Weekly Income"          value={rev.weeklyIncome}  color="teal" />
        <StatCard icon="📅" label="Monthly Income"         value={rev.monthlyIncome} color="green" />
        <StatCard icon="💵" label="Total Revenue"          value={rev.totalRevenue}  color="orange" />
        <StatCard icon="👨‍⚕️" label="Today's Patients"      value={s.todayPatients}   color="purple" />
        <StatCard icon="🧪" label="Samples Today"          value={s.samplesCollectedToday} color="cyan" />
        <StatCard icon="📄" label="Pending Reports"        value={s.pendingReports}  color="amber" />
        <StatCard icon="✅" label="Approved Reports"       value={s.approvedReports} color="green" />
        <StatCard icon="❌" label="Rejected Reports"       value={s.rejectedReports} color="red" />
        <StatCard icon="📦" label="Critical Stock"         value={s.criticalStockItems} color="pink" />
        <StatCard icon="👥" label="Active Users"           value={s.totalUsers}      color="indigo" />
        <StatCard icon="🏥" label="Referral Patients"      value={s.referralPatients} color="deep" />
      </div>

      {/* ═══ ROW 2 — REVENUE ANALYTICS LINE CHART ════ */}
      <h2 className="dash-section-title"><span className="section-icon">📊</span> Revenue Analytics</h2>
      <div className="charts-row full">
        <div className="chart-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ margin: 0 }}>Revenue & Patient Trend</h3>
            <div className="revenue-toggles">
              {[['7d', '7 Days'], ['14d', '14 Days'], ['30d', '30 Days']].map(([k, l]) => (
                <button key={k} className={revenueView === k ? 'active' : ''} onClick={() => setRevenueView(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="chart-container tall">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
                <YAxis yAxisId="rev" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="pts" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="#0b6bcb" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line yAxisId="pts" type="monotone" dataKey="patients" name="Patients" stroke="#00897b" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══ ROW 3 — TOP SAMPLES / PATIENT TREND / REV BY SAMPLE ══ */}
      <h2 className="dash-section-title"><span className="section-icon">🧬</span> Sample & Patient Analytics</h2>
      <div className="charts-row three-col">

        {/* Doughnut: Top Sample Types */}
        <div className="chart-panel">
          <h3>Top Collected Sample Types</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={topSamplesData} dataKey="count" nameKey="name" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={95} paddingAngle={3} label={({ name, pct }) => `${name} (${pct}%)`}>
                  {topSamplesData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area: Patient Registration Trend */}
        <div className="chart-panel">
          <h3>Patient Registration Trend</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="patientGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6a1b9a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6a1b9a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="patients" name="Patients" stroke="#6a1b9a" fill="url(#patientGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar: Revenue by Sample Type */}
        <div className="chart-panel">
          <h3>Revenue by Sample Type</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.revenueBySample || []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip prefix="ETB " />} />
                <Bar dataKey="revenue" name="Revenue" fill="#e65100" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══ ROW 4 — REFERRAL / GENDER / AGE ═════════ */}
      <h2 className="dash-section-title"><span className="section-icon">📋</span> Demographics & Referrals</h2>
      <div className="charts-row three-col">

        {/* Horizontal Bar: Referral Hospitals */}
        <div className="chart-panel">
          <h3>Referral Hospital Statistics</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.referralStats || []} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Patients" fill="#283593" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie: Gender Distribution */}
        <div className="chart-panel">
          <h3>Gender Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.genderDistribution || []} dataKey="count" nameKey="name" cx="50%" cy="50%"
                  outerRadius={90} label={({ name, count }) => `${name}: ${count}`}>
                  {(charts.genderDistribution || []).map((entry, i) => (
                    <Cell key={i} fill={GENDER_COLORS[entry.name] || PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar: Age Distribution */}
        <div className="chart-panel">
          <h3>Age Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.ageDistribution || []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Patients" fill="#00897b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══ ROW 5 — RECENT PATIENTS TABLE ════════════ */}
      <h2 className="dash-section-title"><span className="section-icon">🧑‍⚕️</span> Recent Patients</h2>
      <div className="dash-table-panel">
        <div className="panel-header">
          <h3>Latest Patient Registrations</h3>
          <div className="export-btns">
            <button className="export-btn" onClick={() => downloadCSV('patients.csv', tables.recentPatients)}>CSV</button>
            <button className="export-btn" onClick={exportPDF}>PDF</button>
          </div>
        </div>
        <div className="dash-table-scroll">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Sex</th>
                <th>Sample Types</th>
                <th>Registration Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(tables.recentPatients || []).length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-on-surface-variant)' }}>No patients registered yet</td></tr>
              ) : tables.recentPatients.map(p => (
                <tr key={p._id}>
                  <td><strong>{p.patientId}</strong></td>
                  <td>{p.name}</td>
                  <td>{p.age}</td>
                  <td>{p.sex}</td>
                  <td>{p.sampleTypes || '—'}</td>
                  <td>{p.registrationDate ? new Date(p.registrationDate).toLocaleDateString() : '—'}</td>
                  <td>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.68rem',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      background: p.paymentStatus === 'Paid' ? 'var(--color-success-container)' : 'var(--color-warning-container)',
                      color: p.paymentStatus === 'Paid' ? 'var(--color-success)' : 'var(--color-warning)',
                    }}>
                      {p.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ ROW 6 — RECENT REPORTS TABLE ═════════════ */}
      <h2 className="dash-section-title"><span className="section-icon">📝</span> Recent Laboratory Reports</h2>
      <div className="dash-table-panel">
        <div className="panel-header">
          <h3>Latest Reports</h3>
          <div className="export-btns">
            <button className="export-btn" onClick={() => downloadCSV('reports.csv', tables.recentReports)}>CSV</button>
            <button className="export-btn" onClick={exportPDF}>PDF</button>
          </div>
        </div>
        <div className="dash-table-scroll">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Patient ID</th>
                <th>Technician</th>
                <th>Approved By</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {(tables.recentReports || []).length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-on-surface-variant)' }}>No reports created yet</td></tr>
              ) : tables.recentReports.map(r => (
                <tr key={r._id}>
                  <td><strong>{r.patient}</strong></td>
                  <td>{r.patientId}</td>
                  <td>{r.technician}</td>
                  <td>{r.approvedBy || '—'}</td>
                  <td>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.68rem',
                      fontWeight: 700, textTransform: 'uppercase',
                      background: r.status === 'Approved' ? 'var(--color-success-container)'
                        : r.status === 'Rejected' ? 'var(--color-error-container)' : 'var(--color-warning-container)',
                      color: r.status === 'Approved' ? 'var(--color-success)'
                        : r.status === 'Rejected' ? 'var(--color-error)' : 'var(--color-warning)',
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.createdDate ? new Date(r.createdDate).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ ROW 7 — CRITICAL STOCK DASHBOARD ════════ */}
      <h2 className="dash-section-title"><span className="section-icon">🚨</span> Critical Stock Dashboard</h2>
      {stock.criticalItems?.length > 0 ? (
        <div className="critical-stock-grid">
          {stock.criticalItems.map(item => {
            const total = item.currentQuantity || 1;
            const remaining = item.remainingQuantity ?? (total - (item.usedQuantity || 0));
            const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
            const barColor = pct > 20 ? 'yellow' : pct > 5 ? 'red' : 'red';
            const isCritical = pct <= 5;
            return (
              <div key={item._id} className={`critical-stock-card ${isCritical ? 'level-critical blinking' : pct <= 20 ? 'level-critical' : 'level-warning'}`}>
                <div className="stock-item-name">{item.itemName}</div>
                <div className="stock-item-category">
                  {item.category?.name || item.category?.categoryName || 'Uncategorized'} · {item.itemCode}
                </div>
                <div className="stock-progress">
                  <div className={`stock-progress-fill ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="stock-stats">
                  <span>Remaining: <strong>{remaining}</strong> / {total}</span>
                  <span style={{ color: isCritical ? 'var(--color-error)' : 'var(--color-warning)', fontWeight: 700 }}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="chart-panel" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 'var(--text-md)' }}>
            ✅ All stock items are at healthy levels
          </p>
        </div>
      )}

      {/* ═══ QUICK ACTIONS ════════════════════════════ */}
      <h2 className="dash-section-title"><span className="section-icon">⚡</span> Quick Actions</h2>
      <div className="quick-actions-panel">
        <Link to="/reception" className="quick-action-btn"><span className="action-icon">🧑‍⚕️</span> Register Patient</Link>
        <Link to="/users" className="quick-action-btn"><span className="action-icon">👤</span> Add User</Link>
        <Link to="/stock" className="quick-action-btn"><span className="action-icon">📦</span> Add Stock Item</Link>
        <Link to="/categories" className="quick-action-btn"><span className="action-icon">🗂️</span> Manage Categories</Link>
        <button className="quick-action-btn" onClick={() => downloadCSV('dashboard_patients.csv', tables.recentPatients)}>
          <span className="action-icon">📊</span> Export Patients CSV
        </button>
        <button className="quick-action-btn" onClick={() => downloadCSV('dashboard_reports.csv', tables.recentReports)}>
          <span className="action-icon">📋</span> Export Reports CSV
        </button>
        <button className="quick-action-btn" onClick={exportPDF}>
          <span className="action-icon">🖨️</span> Print Dashboard
        </button>
      </div>

    </section>
  );
}
