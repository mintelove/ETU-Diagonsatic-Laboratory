import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import {
  getPayrollDashboard,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  syncUserAccounts,
  getAdvances,
  createAdvance,
  updateAdvance,
  cancelAdvance,
  getPayrollRecords,
  getPayrollPreview,
  getAnnualPayrollMatrix,
  processPayroll,
  updatePayrollStatus,
  updatePayrollSettings,
  getExportPdfUrl,
  getExportCsvUrl,
  JOB_TYPES,
  BRANCH_OPTIONS,
  MONTHS
} from '../services/payrollService.js';
import { getUsers } from '../services/userService.js';

// Modals
import EmployeeModal from '../components/payroll/EmployeeModal.jsx';
import AdvanceModal from '../components/payroll/AdvanceModal.jsx';
import PayrollSettingsModal from '../components/payroll/PayrollSettingsModal.jsx';
import ProcessPayrollModal from '../components/payroll/ProcessPayrollModal.jsx';
import EmployeeProfileModal from '../components/payroll/EmployeeProfileModal.jsx';
import SalarySlipModal from '../components/payroll/SalarySlipModal.jsx';
import PayrollDetailModal from '../components/payroll/PayrollDetailModal.jsx';

// Styles
import '../styles/pages/payroll.css';

export default function PayrollPage() {
  const { user } = useAuth();
  const { t } = usePreferences();

  // Live Clock
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Active Tab: 'employees', 'currentPayroll', 'advances', 'payrollHistory'
  const [activeTab, setActiveTab] = useState('employees');

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState(null);

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedAdvanceForEdit, setSelectedAdvanceForEdit] = useState(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  const [profileEmployeeId, setProfileEmployeeId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [salarySlipEmployeeId, setSalarySlipEmployeeId] = useState(null);
  const [isSalarySlipModalOpen, setIsSalarySlipModalOpen] = useState(false);

  // History & Annual Matrix states
  const currentYear = new Date().getFullYear();
  const [historyYear, setHistoryYear] = useState(currentYear);
  const [historyMonthFilter, setHistoryMonthFilter] = useState('All'); // 'All' or 1..12
  const [historyViewMode, setHistoryViewMode] = useState('matrix'); // 'matrix' or 'list'
  const [annualMatrixData, setAnnualMatrixData] = useState(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  // Detail Modal state
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Process Modal preconfig
  const [processModalConfig, setProcessModalConfig] = useState({
    initialMonth: null,
    initialYear: null,
    initialEmployeeIds: []
  });

  // Load all initial payroll data
  useEffect(() => {
    loadAllData();
  }, [branchFilter, jobTypeFilter, statusFilter]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [dashRes, empRes, advRes, payRes, usersRes] = await Promise.all([
        getPayrollDashboard({ branch: branchFilter }),
        getEmployees({ branch: branchFilter, jobType: jobTypeFilter, status: statusFilter, search }),
        getAdvances({ branch: branchFilter }),
        getPayrollRecords({ branch: branchFilter }),
        getUsers().catch(() => ({ users: [] }))
      ]);

      if (dashRes?.data) setDashboardData(dashRes.data);
      if (empRes?.data) setEmployees(empRes.data);
      if (advRes?.data) setAdvances(advRes.data);
      if (payRes?.data) setPayrollRecords(payRes.data);
      const userList = usersRes?.users || usersRes?.data || [];
      setSystemUsers(userList);

      // Automatic Sync Check: if no employees exist yet, automatically sync system users
      if (empRes?.data?.length === 0 && userList.length > 0) {
        await handleSyncUsers(true);
      }
    } catch (err) {
      console.error('Error loading payroll data:', err);
      setActionNotice({ type: 'error', message: err.message || 'Failed to load payroll data.' });
    } finally {
      setLoading(false);
    }
  };

  const showNotice = (type, message) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Sync Existing System Users into Employees
  const handleSyncUsers = async (silent = false) => {
    try {
      const res = await syncUserAccounts();
      if (!silent) {
        showNotice('success', res.message || 'User accounts synchronized successfully.');
      }
      // Refresh list
      const [dashRes, empRes] = await Promise.all([
        getPayrollDashboard({ branch: branchFilter }),
        getEmployees({ branch: branchFilter, jobType: jobTypeFilter, status: statusFilter, search })
      ]);
      if (dashRes?.data) setDashboardData(dashRes.data);
      if (empRes?.data) setEmployees(empRes.data);
    } catch (err) {
      console.error('User sync error:', err);
      if (!silent) showNotice('error', err.message || 'Sync failed.');
    }
  };

  // Employee CRUD
  const handleSaveEmployee = async (formData) => {
    if (selectedEmployeeForEdit?._id) {
      await updateEmployee(selectedEmployeeForEdit._id, formData);
      showNotice('success', `Employee ${formData.fullName} updated successfully.`);
    } else {
      await createEmployee(formData);
      showNotice('success', `Employee ${formData.fullName} created successfully.`);
    }
    loadAllData();
  };

  const handleDeleteEmployee = async (emp) => {
    const confirmMsg = `Are you sure you want to deactivate/delete employee ${emp.fullName} (${emp.employeeId})?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await deleteEmployee(emp._id);
      showNotice('success', res.message || 'Employee deleted/deactivated.');
      loadAllData();
    } catch (err) {
      showNotice('error', err.message || 'Failed to delete employee.');
    }
  };

  // Advance CRUD
  const handleSaveAdvance = async (formData) => {
    if (selectedAdvanceForEdit?._id) {
      await updateAdvance(selectedAdvanceForEdit._id, formData);
      showNotice('success', 'Salary advance updated successfully.');
    } else {
      await createAdvance(formData);
      showNotice('success', 'Salary advance recorded successfully.');
    }
    loadAllData();
  };

  const handleCancelAdvance = async (adv) => {
    if (!window.confirm(`Are you sure you want to cancel this advance of ${Number(adv.amount).toLocaleString()} ETB?`)) return;
    try {
      await cancelAdvance(adv._id);
      showNotice('success', 'Advance cancelled.');
      loadAllData();
    } catch (err) {
      showNotice('error', err.message || 'Failed to cancel advance.');
    }
  };

  // Load Annual Matrix data
  const loadAnnualMatrix = async () => {
    try {
      setLoadingMatrix(true);
      const res = await getAnnualPayrollMatrix({
        year: historyYear,
        branch: branchFilter,
        jobType: jobTypeFilter,
        search: search
      });
      if (res?.data) {
        setAnnualMatrixData(res.data);
      }
    } catch (err) {
      console.error('Error loading annual matrix:', err);
    } finally {
      setLoadingMatrix(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payrollHistory') {
      loadAnnualMatrix();
    }
  }, [activeTab, historyYear, branchFilter, jobTypeFilter, search]);

  // Payroll Processing
  const handleProcessPayroll = async (payload) => {
    const res = await processPayroll(payload);
    showNotice('success', res.message || 'Payroll processed successfully.');
    loadAllData();
    loadAnnualMatrix();
    setActiveTab('payrollHistory');
  };

  const handleUpdatePayrollStatus = async (payrollId, status) => {
    try {
      await updatePayrollStatus(payrollId, { status });
      showNotice('success', `Payroll record status updated to ${status}.`);
      loadAllData();
    } catch (err) {
      showNotice('error', err.message || 'Failed to update payroll status.');
    }
  };

  // Settings
  const handleSaveSettings = async (settingsData) => {
    const res = await updatePayrollSettings(settingsData);
    showNotice('success', res.message || 'Configuration updated.');
    if (res?.data) {
      setDashboardData(prev => ({
        ...prev,
        settings: res.data,
        nextDateInfo: res.data.nextDateInfo
      }));
    }
    loadAllData();
  };

  // Export handlers
  const handleExportPdf = () => {
    const url = getExportPdfUrl({ branch: branchFilter, period: dashboardData?.nextDateInfo?.salaryPeriod });
    window.open(url, '_blank');
  };

  const handleExportCsv = () => {
    const url = getExportCsvUrl({ branch: branchFilter, jobType: jobTypeFilter, status: statusFilter, search });
    window.open(url, '_blank');
  };

  // Filtered employees memo
  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase().trim();
    return employees.filter(e =>
      e.fullName?.toLowerCase().includes(q) ||
      e.employeeId?.toLowerCase().includes(q) ||
      e.phone?.includes(q) ||
      (e.jobType === 'Other' && e.customJobType?.toLowerCase().includes(q)) ||
      e.jobType?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  // Filtered history records memo (for transaction list)
  const filteredHistoryRecords = useMemo(() => {
    return payrollRecords.filter(rec => {
      if (branchFilter !== 'All' && rec.branch !== branchFilter) return false;
      if (historyYear) {
        const recYear = rec.payrollYear || (rec.salaryDate ? new Date(rec.salaryDate).getFullYear() : null);
        if (recYear && recYear !== Number(historyYear)) return false;
      }
      if (historyMonthFilter !== 'All') {
        const recMonth = rec.payrollMonth || (rec.salaryDate ? new Date(rec.salaryDate).getMonth() + 1 : null);
        if (recMonth && recMonth !== Number(historyMonthFilter)) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = rec.employeeName?.toLowerCase().includes(q);
        const matchCode = rec.employeeCode?.toLowerCase().includes(q);
        const matchId = rec.payrollId?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchId) return false;
      }
      return true;
    });
  }, [payrollRecords, branchFilter, historyYear, historyMonthFilter, search]);

  // Current period summary calculation
  const currentPeriodSummary = useMemo(() => {
    if (!annualMatrixData) return null;

    if (historyMonthFilter !== 'All') {
      const mNum = Number(historyMonthFilter);
      const mSummary = annualMatrixData.monthSummaries?.[mNum] || {
        totalPaidEmployees: 0,
        totalBasic: 0,
        totalAdvances: 0,
        totalNet: 0
      };
      const mObj = MONTHS.find(m => m.value === mNum);
      return {
        label: `${mObj?.name || 'Month'} ${historyYear}`,
        paidCount: mSummary.totalPaidEmployees,
        basicSalary: mSummary.totalBasic,
        advances: mSummary.totalAdvances,
        netSalary: mSummary.totalNet,
        isSpecificMonth: true
      };
    } else {
      const totals = annualMatrixData.annualTotals || {
        totalDisbursements: 0,
        totalBasic: 0,
        totalAdvances: 0,
        totalNet: 0
      };
      return {
        label: `Year ${historyYear} (Full Year)`,
        paidCount: totals.totalDisbursements,
        basicSalary: totals.totalBasic,
        advances: totals.totalAdvances,
        netSalary: totals.totalNet,
        isSpecificMonth: false
      };
    }
  }, [annualMatrixData, historyMonthFilter, historyYear]);

  const nextInfo = dashboardData?.nextDateInfo;

  return (
    <section className="page admin-dashboard payroll-dashboard">
      {/* Notice Banner */}
      {actionNotice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: actionNotice.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          border: `1px solid ${actionNotice.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
          color: actionNotice.type === 'error' ? '#f87171' : '#34d399',
          fontSize: '0.9rem',
          marginBottom: '16px'
        }}>
          <span>{actionNotice.message}</span>
          <button style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setActionNotice(null)}>✕</button>
        </div>
      )}

      {/* ═══ HEADER (Main Dashboard Consistent) ════════════════════ */}
      <header className="dash-header">
        <div className="header-left">
          <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)', fontWeight: 700, margin: '0 0 2px' }}>
            ETU Diagnostic Laboratory
          </p>
          <h1>Payroll Management <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: '#e0f2fe', color: '#075c91', marginLeft: '10px' }}>📍 {user?.fullName} ({user?.branchName || 'Main'})</span></h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            Human Resources, Salary & Advance Administration · {clock.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="header-right">
          <span className="live-clock">
            🕐 {clock.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button className="btn-payroll-secondary" onClick={() => setIsSettingsModalOpen(true)}>
            ⚙️ Salary Settings
          </button>
          <button className="btn-payroll-secondary" onClick={() => handleSyncUsers(false)}>
            🔄 Sync System Users
          </button>
          <button
            className="btn-payroll-success"
            onClick={() => {
              setProcessModalConfig({
                initialMonth: historyMonthFilter !== 'All' ? Number(historyMonthFilter) : new Date().getMonth() + 1,
                initialYear: historyYear || new Date().getFullYear(),
                initialEmployeeIds: []
              });
              setIsProcessModalOpen(true);
            }}
          >
            ⚡ Process Payroll
          </button>
          <button
            className="btn-payroll-primary"
            onClick={() => {
              setSelectedEmployeeForEdit(null);
              setIsEmployeeModalOpen(true);
            }}
          >
            ➕ Add Employee
          </button>
        </div>
      </header>

      {/* ═══ ROW 1 — EXECUTIVE SUMMARY CARDS (Main Dashboard Style) ═════ */}
      <div className="exec-cards-grid">
        <StatCard
          icon="👥"
          label="Total Employees"
          value={dashboardData?.totalEmployees ?? 0}
          color="indigo"
          subtitle={`${dashboardData?.activeEmployees ?? 0} Active · ${(dashboardData?.totalEmployees || 0) - (dashboardData?.activeEmployees || 0)} Inactive`}
        />
        <StatCard
          icon="👤"
          label="Active Employees"
          value={dashboardData?.activeEmployees ?? 0}
          color="teal"
          subtitle="Currently active staff"
        />
        <StatCard
          icon="💰"
          label="Monthly Payroll"
          value={dashboardData?.totalMonthlyPayroll ?? 0}
          color="blue"
          isCurrency={true}
          subtitle="Total basic monthly salary"
        />
        <StatCard
          icon="💸"
          label="Total Advances"
          value={dashboardData?.totalAdvancesAmount ?? 0}
          color="orange"
          isCurrency={true}
          subtitle={`${dashboardData?.activeAdvancesCount ?? 0} active period advances`}
        />
        <StatCard
          icon="💵"
          label="Net Payroll"
          value={dashboardData?.currentNetPayroll ?? 0}
          color="green"
          isCurrency={true}
          subtitle="Payable after deductions"
        />
        <StatCard
          icon="📅"
          label="Next Salary Date"
          value={nextInfo ? (nextInfo.calendarType === 'Ethiopian' ? `Day ${nextInfo.salaryDay} (E.C.)` : `Day ${nextInfo.salaryDay} (G.C.)`) : '—'}
          color="deep"
          subtitle={nextInfo ? `${nextInfo.daysRemaining} days remaining · ${nextInfo.nextSalaryDateFormatted}` : 'Configured Payday'}
        />
      </div>

      {/* ═══ TABS NAVIGATION ═══════════════════════════════════════ */}
      <div className="payroll-tabs-bar">
        <div className="payroll-tabs-list">
          <button
            className={`payroll-tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            👥 Employee Management
            <span className="payroll-tab-badge">{employees.length}</span>
          </button>
          <button
            className={`payroll-tab-btn ${activeTab === 'currentPayroll' ? 'active' : ''}`}
            onClick={() => setActiveTab('currentPayroll')}
          >
            ⚡ Current Payroll
            <span className="payroll-tab-badge">
              {employees.filter(e => e.employmentStatus === 'Active').length}
            </span>
          </button>
          <button
            className={`payroll-tab-btn ${activeTab === 'advances' ? 'active' : ''}`}
            onClick={() => setActiveTab('advances')}
          >
            💸 Recent Salary Advances
            <span className="payroll-tab-badge">{advances.length}</span>
          </button>
          <button
            className={`payroll-tab-btn ${activeTab === 'payrollHistory' ? 'active' : ''}`}
            onClick={() => setActiveTab('payrollHistory')}
          >
            📜 Payroll History
            <span className="payroll-tab-badge">{payrollRecords.length}</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-payroll-secondary" onClick={handleExportPdf} title="Export Professional PDF Report">
            📄 Export PDF
          </button>
          <button className="btn-payroll-secondary" onClick={handleExportCsv} title="Export CSV Spreadsheet">
            📊 Export CSV
          </button>
        </div>
      </div>

      {/* TAB 1: EMPLOYEES DIRECTORY */}
      {activeTab === 'employees' && (
        <>
          <div className="payroll-toolbar">
            <div className="payroll-toolbar-left">
              <div className="payroll-search-input-wrap">
                <span className="payroll-search-icon">🔍</span>
                <input
                  type="text"
                  className="payroll-search-input"
                  placeholder="Search name, ID, phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <select
                className="payroll-filter-select"
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
              >
                <option value="All">All Branches</option>
                <option value="Main">Main Branch</option>
                <option value="Otona">Otona Branch</option>
              </select>

              <select
                className="payroll-filter-select"
                value={jobTypeFilter}
                onChange={e => setJobTypeFilter(e.target.value)}
              >
                <option value="All">All Job Types</option>
                {JOB_TYPES.map(j => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>

              <select
                className="payroll-filter-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>

            <div className="payroll-toolbar-right">
              {(search || branchFilter !== 'All' || jobTypeFilter !== 'All' || statusFilter !== 'All') && (
                <button
                  className="btn-payroll-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={() => {
                    setSearch('');
                    setBranchFilter('All');
                    setJobTypeFilter('All');
                    setStatusFilter('All');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="payroll-table-wrap">
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                Loading employee records...
              </div>
            ) : filteredEmployees.length > 0 ? (
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>Emp ID</th>
                    <th>Employee Name</th>
                    <th>Job Type</th>
                    <th>Branch</th>
                    <th>Phone</th>
                    <th style={{ textAlign: 'right' }}>Basic Salary</th>
                    <th style={{ textAlign: 'right' }}>Advances</th>
                    <th style={{ textAlign: 'right' }}>Net Payable</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => {
                    const basic = Number(emp.salary) || 0;
                    const adv = Number(emp.activeAdvances) || 0;
                    const net = Number(emp.netPayable) !== undefined ? Number(emp.netPayable) : Math.max(0, basic - adv);
                    const jobTitle = emp.jobType === 'Other' && emp.customJobType ? emp.customJobType : emp.jobType;

                    return (
                      <tr key={emp._id || emp.id}>
                        <td>
                          <span className="emp-code-badge">{emp.employeeId}</span>
                        </td>
                        <td>
                          <div className="emp-name-cell">
                            <strong>{emp.fullName}</strong>
                            {emp.userId && (
                              <small>User: @{emp.userId.username}</small>
                            )}
                          </div>
                        </td>
                        <td>{jobTitle}</td>
                        <td>
                          <span className={`branch-pill ${emp.branch?.toLowerCase()}`}>
                            {emp.branch}
                          </span>
                        </td>
                        <td style={{ color: '#94a3b8' }}>{emp.phone}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="salary-val">{basic.toLocaleString()} ETB</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="advance-val">
                            {adv > 0 ? `-${adv.toLocaleString()} ETB` : '0 ETB'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="net-val">{net.toLocaleString()} ETB</span>
                        </td>
                        <td>
                          <span className={`status-badge ${emp.employmentStatus?.toLowerCase()}`}>
                            {emp.employmentStatus}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn-icon-only"
                              title="View Profile & Full History"
                              onClick={() => {
                                setProfileEmployeeId(emp._id);
                                setIsProfileModalOpen(true);
                              }}
                            >
                              👁️
                            </button>
                            <button
                              className="btn-icon-only"
                              title="Record Salary Advance"
                              onClick={() => {
                                setSelectedAdvanceForEdit({ employeeId: emp._id });
                                setIsAdvanceModalOpen(true);
                              }}
                            >
                              💸
                            </button>
                            <button
                              className="btn-icon-only"
                              title="View / Print Salary Slip"
                              onClick={() => {
                                setSalarySlipEmployeeId(emp._id);
                                setIsSalarySlipModalOpen(true);
                              }}
                            >
                              📄
                            </button>
                            <button
                              className="btn-icon-only"
                              title="Edit Employee"
                              onClick={() => {
                                setSelectedEmployeeForEdit(emp);
                                setIsEmployeeModalOpen(true);
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-icon-only"
                              title="Delete / Deactivate Employee"
                              onClick={() => handleDeleteEmployee(emp)}
                              style={{ color: '#f87171' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="payroll-empty-state">
                <div className="payroll-empty-icon">👥</div>
                <h3>No Employees Found</h3>
                <p>
                  No employee records match the selected filter. You can add a new employee or sync existing system user accounts.
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button className="btn-payroll-secondary" onClick={() => handleSyncUsers(false)}>
                    🔄 Sync System Accounts
                  </button>
                  <button className="btn-payroll-primary" onClick={() => setIsEmployeeModalOpen(true)}>
                    ➕ Add Employee
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: CURRENT PAYROLL */}
      {activeTab === 'currentPayroll' && (
        <>
          {/* Current Period Highlight */}
          {nextInfo && (
            <div className="payroll-payday-banner">
              <div className="payday-banner-info">
                <div className="payday-calendar-badge">
                  <small>{nextInfo.calendarType === 'Ethiopian' ? '🇪🇹 E.C.' : '🌐 G.C.'}</small>
                  <span>Day {nextInfo.salaryDay}</span>
                </div>
                <div className="payday-text">
                  <strong>Current Salary Period: {nextInfo.salaryPeriod || 'Active Period'} · Upcoming Payday: {nextInfo.nextSalaryDateFormatted}</strong>
                  <small>
                    {nextInfo.calendarType === 'Ethiopian'
                      ? `Gregorian Equivalent: ${nextInfo.alternativeCalendarFormatted} • Ethiopian Day 30 configuration active`
                      : `Ethiopian Equivalent: ${nextInfo.alternativeCalendarFormatted} • Gregorian mode active`}
                  </small>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="payday-countdown">
                  ⏱ {nextInfo.daysRemaining} Days Remaining
                </div>
                <button className="btn-payroll-success" onClick={() => setIsProcessModalOpen(true)}>
                  ⚡ Process Payroll
                </button>
              </div>
            </div>
          )}

          {/* Current Period Calculations Summary */}
          <div className="payroll-toolbar" style={{ background: 'var(--card-bg, #111827)', border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))', padding: '16px 20px', borderRadius: '12px' }}>
            <div className="payroll-toolbar-left" style={{ gap: '24px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>Active Staff</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
                  {dashboardData?.activeEmployees ?? 0}
                </div>
              </div>
              <div style={{ height: '32px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>Gross Monthly Base</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60a5fa' }}>
                  {Number(dashboardData?.totalMonthlyPayroll || 0).toLocaleString()} ETB
                </div>
              </div>
              <div style={{ height: '32px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>Period Advances Deducted</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>
                  -{Number(dashboardData?.totalAdvancesAmount || 0).toLocaleString()} ETB
                </div>
              </div>
              <div style={{ height: '32px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>Net Disbursable Payroll</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>
                  {Number(dashboardData?.currentNetPayroll || 0).toLocaleString()} ETB
                </div>
              </div>
            </div>
            <div className="payroll-toolbar-right">
              <button className="btn-payroll-primary" onClick={() => setIsProcessModalOpen(true)}>
                ⚡ Process & Freeze Period
              </button>
            </div>
          </div>

          {/* Advance Deductions & Payroll Pre-Calculation Table */}
          <div className="payroll-table-wrap">
            <h3 style={{ margin: '16px 0 12px', fontSize: '1rem', color: 'var(--text-primary, #f8fafc)' }}>
              Current Period Employee Calculations & Advance Deductions
            </h3>
            <table className="payroll-table">
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Employee Name</th>
                  <th>Job Type</th>
                  <th>Branch</th>
                  <th style={{ textAlign: 'right' }}>Basic Salary</th>
                  <th style={{ textAlign: 'right' }}>Advance Deduction</th>
                  <th style={{ textAlign: 'right' }}>Net Payable</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.filter(e => e.employmentStatus === 'Active').map(emp => {
                  const basic = Number(emp.salary) || 0;
                  const adv = Number(emp.activeAdvances) || 0;
                  const net = Math.max(0, basic - adv);
                  const jobTitle = emp.jobType === 'Other' && emp.customJobType ? emp.customJobType : emp.jobType;

                  return (
                    <tr key={emp._id || emp.id}>
                      <td><span className="emp-code-badge">{emp.employeeId}</span></td>
                      <td>
                        <div className="emp-name-cell">
                          <strong>{emp.fullName}</strong>
                          {emp.userId && <small>User: @{emp.userId.username}</small>}
                        </div>
                      </td>
                      <td>{jobTitle}</td>
                      <td><span className={`branch-pill ${emp.branch?.toLowerCase()}`}>{emp.branch}</span></td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{basic.toLocaleString()} ETB</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: adv > 0 ? '#f87171' : '#94a3b8' }}>
                        {adv > 0 ? `-${adv.toLocaleString()} ETB` : '0 ETB'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
                        {net.toLocaleString()} ETB
                      </td>
                      <td><span className="status-badge active">{emp.employmentStatus}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions">
                          <button
                            className="btn-payroll-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => {
                              setSalarySlipEmployeeId(emp._id);
                              setIsSalarySlipModalOpen(true);
                            }}
                            title="View Pre-Payroll Salary Slip"
                          >
                            📄 Slip
                          </button>
                          <button
                            className="btn-payroll-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => {
                              setSelectedAdvanceForEdit({ employeeId: emp._id });
                              setIsAdvanceModalOpen(true);
                            }}
                            title="Add Advance"
                          >
                            💸 Advance
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 3: SALARY ADVANCES */}
      {activeTab === 'advances' && (
        <>
          <div className="payroll-toolbar">
            <div className="payroll-toolbar-left">
              <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                Track and manage money disbursed to employees prior to the official salary payment date. Advances are automatically deducted on payday.
              </span>
            </div>
            <div className="payroll-toolbar-right">
              <button
                className="btn-payroll-primary"
                onClick={() => {
                  setSelectedAdvanceForEdit(null);
                  setIsAdvanceModalOpen(true);
                }}
              >
                💸 Record New Advance
              </button>
            </div>
          </div>

          <div className="payroll-table-wrap">
            {advances.length > 0 ? (
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Branch</th>
                    <th style={{ textAlign: 'right' }}>Advance Amount</th>
                    <th>Reason / Purpose</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Recorded By</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map(adv => (
                    <tr key={adv._id}>
                      <td>{new Date(adv.date).toLocaleDateString()}</td>
                      <td>
                        <strong>{adv.employee?.fullName || '—'}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {adv.employee?.employeeId}
                        </div>
                      </td>
                      <td>
                        <span className={`branch-pill ${adv.employee?.branch?.toLowerCase()}`}>
                          {adv.employee?.branch || 'Main'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="advance-val">
                          {Number(adv.amount).toLocaleString()} ETB
                        </span>
                      </td>
                      <td>{adv.reason || 'Salary advance'}</td>
                      <td>{adv.paymentMethod}</td>
                      <td>
                        <span className={`status-badge ${adv.status?.toLowerCase()}`}>
                          {adv.status}
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8' }}>
                        {adv.recordedBy?.fullName || 'Admin'}
                      </td>
                      <td>
                        <div className="table-actions">
                          {adv.status === 'Approved' && (
                            <>
                              <button
                                className="btn-icon-only"
                                title="Edit Advance"
                                onClick={() => {
                                  setSelectedAdvanceForEdit(adv);
                                  setIsAdvanceModalOpen(true);
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                className="btn-icon-only"
                                title="Cancel / Void Advance"
                                onClick={() => handleCancelAdvance(adv)}
                                style={{ color: '#f87171' }}
                              >
                                ✕
                              </button>
                            </>
                          )}
                          {adv.status === 'Deducted' && (
                            <span style={{ fontSize: '0.75rem', color: '#c084fc', fontStyle: 'italic' }}>
                              Deducted in Payroll
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="payroll-empty-state">
                <div className="payroll-empty-icon">💸</div>
                <h3>No Salary Advances Recorded</h3>
                <p>No advances have been recorded yet. Any advance given before payday will appear here.</p>
                <button className="btn-payroll-primary" onClick={() => setIsAdvanceModalOpen(true)}>
                  💸 Record First Advance
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 3: PAYROLL PROCESSING, ANNUAL MATRIX & HISTORY */}
      {activeTab === 'payrollHistory' && (
        <>
          {/* Historical Controls & Filters Bar */}
          <div className="payroll-toolbar" style={{ flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div className="payroll-toolbar-left" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {/* View Mode Toggle */}
              <div className="history-view-toggle">
                <button
                  type="button"
                  className={`history-view-toggle-btn ${historyViewMode === 'matrix' ? 'active' : ''}`}
                  onClick={() => setHistoryViewMode('matrix')}
                >
                  📅 Annual Matrix (Jan - Dec)
                </button>
                <button
                  type="button"
                  className={`history-view-toggle-btn ${historyViewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setHistoryViewMode('list')}
                >
                  📋 Transaction Log ({filteredHistoryRecords.length})
                </button>
              </div>

              {/* Year Selector */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Year:</span>
                <select
                  className="payroll-filter-select"
                  value={historyYear}
                  onChange={e => setHistoryYear(Number(e.target.value))}
                  style={{ fontWeight: 700, color: 'var(--color-primary, #38bdf8)' }}
                >
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Month Selector */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Month:</span>
                <select
                  className="payroll-filter-select"
                  value={historyMonthFilter}
                  onChange={e => setHistoryMonthFilter(e.target.value)}
                >
                  <option value="All">All Months (Jan - Dec)</option>
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Branch Filter */}
              <select
                className="payroll-filter-select"
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
              >
                <option value="All">All Branches</option>
                <option value="Main">Main Branch</option>
                <option value="Otona">Otona Branch</option>
              </select>

              {/* Job Type Filter */}
              <select
                className="payroll-filter-select"
                value={jobTypeFilter}
                onChange={e => setJobTypeFilter(e.target.value)}
              >
                <option value="All">All Job Types</option>
                {JOB_TYPES.map(j => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>

              {/* Search Filter */}
              <div className="payroll-search-input-wrap" style={{ minWidth: '180px' }}>
                <span className="payroll-search-icon">🔍</span>
                <input
                  type="text"
                  className="payroll-search-input"
                  placeholder="Filter employee..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="payroll-toolbar-right">
              <button
                className="btn-payroll-success"
                onClick={() => {
                  setProcessModalConfig({
                    initialMonth: historyMonthFilter !== 'All' ? Number(historyMonthFilter) : new Date().getMonth() + 1,
                    initialYear: historyYear,
                    initialEmployeeIds: []
                  });
                  setIsProcessModalOpen(true);
                }}
              >
                ⚡ Process Payroll Run
              </button>
            </div>
          </div>

          {/* Historical Period Summary Cards Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              borderRadius: '10px',
              padding: '12px 16px'
            }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.05em' }}>
                Period / Scope
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                {currentPeriodSummary?.label || `${historyYear}`}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {currentPeriodSummary?.isSpecificMonth ? 'Monthly Status' : 'Annual Cumulative'}
              </span>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '10px',
              padding: '12px 16px'
            }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#34d399', fontWeight: 700, letterSpacing: '0.05em' }}>
                Paid Disbursements
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
                {currentPeriodSummary?.paidCount ?? 0} {currentPeriodSummary?.isSpecificMonth ? 'Employees' : 'Payments'}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Disbursed & confirmed
              </span>
            </div>

            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '10px',
              padding: '12px 16px'
            }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#60a5fa', fontWeight: 700, letterSpacing: '0.05em' }}>
                Total Basic Salary
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                {Number(currentPeriodSummary?.basicSalary || 0).toLocaleString()} ETB
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Base salary obligations
              </span>
            </div>

            <div style={{
              background: 'rgba(249, 115, 22, 0.08)',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '10px',
              padding: '12px 16px'
            }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#fb923c', fontWeight: 700, letterSpacing: '0.05em' }}>
                Advances Deducted
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fb923c', marginTop: '2px' }}>
                -{Number(currentPeriodSummary?.advances || 0).toLocaleString()} ETB
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Recovered in payroll
              </span>
            </div>

            <div style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              borderRadius: '10px',
              padding: '12px 16px'
            }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#4ade80', fontWeight: 700, letterSpacing: '0.05em' }}>
                Net Disbursed
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80', marginTop: '2px' }}>
                {Number(currentPeriodSummary?.netSalary || 0).toLocaleString()} ETB
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Total take-home pay
              </span>
            </div>
          </div>

          {/* VIEW 1: ANNUAL PAYMENT MATRIX (JAN - DEC) */}
          {historyViewMode === 'matrix' && (
            <div className="payroll-matrix-wrap">
              {loadingMatrix ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  ⏳ Loading annual payroll matrix for {historyYear}...
                </div>
              ) : annualMatrixData?.employees?.length > 0 ? (
                <table className="payroll-matrix-table">
                  <thead>
                    <tr>
                      <th className="emp-col-head">Employee Details</th>
                      {MONTHS.map(m => (
                        <th
                          key={m.value}
                          style={{
                            background: historyMonthFilter !== 'All' && Number(historyMonthFilter) === m.value
                              ? 'rgba(2, 132, 199, 0.25)'
                              : undefined
                          }}
                        >
                          {m.short}
                        </th>
                      ))}
                      <th style={{ textAlign: 'right', paddingRight: '16px' }}>Total Paid (YTD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annualMatrixData.employees.map(row => {
                      const emp = row.employee;
                      return (
                        <tr key={emp._id}>
                          <td className="emp-col-cell">
                            <div>
                              <strong>{emp.fullName}</strong>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                                <span className="emp-code-badge" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                                  {emp.employeeId}
                                </span>
                                <span className={`branch-pill ${emp.branch?.toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                                  {emp.branch}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                  {emp.jobType}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 12 Months */}
                          {MONTHS.map(m => {
                            const cell = row.matrix?.[m.value];
                            const isColHighlighted = historyMonthFilter !== 'All' && Number(historyMonthFilter) === m.value;

                            return (
                              <td
                                key={m.value}
                                style={{
                                  background: isColHighlighted ? 'rgba(2, 132, 199, 0.05)' : undefined
                                }}
                              >
                                {cell?.isPaid ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      className="matrix-status-btn paid"
                                      title={`Paid ${Number(cell.netSalary).toLocaleString()} ETB. Click to view full slip & details.`}
                                      onClick={() => {
                                        setSelectedRecordForDetail(cell);
                                        setIsDetailModalOpen(true);
                                      }}
                                    >
                                      ✓ Paid
                                    </button>
                                    <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 600, marginTop: '2px', fontFamily: 'monospace' }}>
                                      {Number(cell.netSalary).toLocaleString()}
                                    </span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="matrix-status-btn unpaid"
                                    title={`Unpaid for ${m.name} ${historyYear}. Click to disburse payroll.`}
                                    onClick={() => {
                                      setProcessModalConfig({
                                        initialMonth: m.value,
                                        initialYear: historyYear,
                                        initialEmployeeIds: [emp._id]
                                      });
                                      setIsProcessModalOpen(true);
                                    }}
                                  >
                                    Unpaid
                                  </button>
                                )}
                              </td>
                            );
                          })}

                          {/* Total YTD */}
                          <td style={{ textAlign: 'right', paddingRight: '16px', fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
                            {Number(row.totalNetYtd || 0).toLocaleString()} ETB
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="payroll-empty-state">
                  <div className="payroll-empty-icon">📅</div>
                  <h3>No Employees Found</h3>
                  <p>No employees match the current filters for Year {historyYear}.</p>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: DETAILED TRANSACTION RECORDS LOG */}
          {historyViewMode === 'list' && (
            <div className="payroll-table-wrap">
              {filteredHistoryRecords.length > 0 ? (
                <table className="payroll-table">
                  <thead>
                    <tr>
                      <th>Payroll ID</th>
                      <th>Period</th>
                      <th>Employee</th>
                      <th>Branch</th>
                      <th style={{ textAlign: 'right' }}>Basic Salary</th>
                      <th style={{ textAlign: 'right' }}>Advances Deducted</th>
                      <th style={{ textAlign: 'right' }}>Net Disbursed</th>
                      <th>Calendar</th>
                      <th>Status</th>
                      <th>Processed By</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryRecords.map(rec => (
                      <tr key={rec._id}>
                        <td><span className="emp-code-badge">{rec.payrollId}</span></td>
                        <td><strong>{rec.salaryPeriod}</strong></td>
                        <td>
                          <strong>{rec.employeeName}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rec.employeeCode}</div>
                        </td>
                        <td>
                          <span className={`branch-pill ${rec.branch?.toLowerCase()}`}>
                            {rec.branch}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {Number(rec.basicSalary).toLocaleString()} ETB
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: rec.totalAdvances > 0 ? '#f87171' : '#94a3b8' }}>
                          {rec.totalAdvances > 0 ? `-${Number(rec.totalAdvances).toLocaleString()} ETB` : '0 ETB'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
                          {Number(rec.netSalary).toLocaleString()} ETB
                        </td>
                        <td>{rec.calendarType}</td>
                        <td>
                          <span className={`status-badge ${rec.status?.toLowerCase()}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td style={{ color: '#94a3b8' }}>{rec.processedBy?.fullName || 'Admin'}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn-icon-only"
                              title="View Details"
                              onClick={() => {
                                setSelectedRecordForDetail(rec);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              🔍
                            </button>
                            {rec.employee && (
                              <button
                                className="btn-icon-only"
                                title="Print Slip"
                                onClick={() => {
                                  setSalarySlipEmployeeId(rec.employee._id || rec.employee);
                                  setIsSalarySlipModalOpen(true);
                                }}
                              >
                                📄
                              </button>
                            )}
                            {rec.status === 'Processed' && (
                              <button
                                className="btn-payroll-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                onClick={() => handleUpdatePayrollStatus(rec._id, 'Paid')}
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="payroll-empty-state">
                  <div className="payroll-empty-icon">📜</div>
                  <h3>No Historical Records Found</h3>
                  <p>No payroll records match the selected year, month, or search filters.</p>
                  <button
                    className="btn-payroll-success"
                    onClick={() => {
                      setProcessModalConfig({
                        initialMonth: historyMonthFilter !== 'All' ? Number(historyMonthFilter) : new Date().getMonth() + 1,
                        initialYear: historyYear,
                        initialEmployeeIds: []
                      });
                      setIsProcessModalOpen(true);
                    }}
                  >
                    ⚡ Process Payroll
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODALS */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={handleSaveEmployee}
        initialData={selectedEmployeeForEdit}
        users={systemUsers}
      />

      <AdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        onSave={handleSaveAdvance}
        initialData={selectedAdvanceForEdit}
        employees={employees}
      />

      <PayrollSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveSettings}
        currentSettings={dashboardData?.settings}
      />

      <ProcessPayrollModal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        onProcess={handleProcessPayroll}
        employees={employees}
        nextDateInfo={nextInfo}
        settings={dashboardData?.settings}
        defaultBranch={branchFilter}
        initialMonth={processModalConfig.initialMonth}
        initialYear={processModalConfig.initialYear}
        initialEmployeeIds={processModalConfig.initialEmployeeIds}
      />

      <EmployeeProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        employeeId={profileEmployeeId}
        onEdit={(emp) => {
          setIsProfileModalOpen(false);
          setSelectedEmployeeForEdit(emp);
          setIsEmployeeModalOpen(true);
        }}
        onAddAdvance={(emp) => {
          setIsProfileModalOpen(false);
          setSelectedAdvanceForEdit({ employeeId: emp._id });
          setIsAdvanceModalOpen(true);
        }}
        onPrintSlip={(emp) => {
          setIsProfileModalOpen(false);
          setSalarySlipEmployeeId(emp._id);
          setIsSalarySlipModalOpen(true);
        }}
      />

      <SalarySlipModal
        isOpen={isSalarySlipModalOpen}
        onClose={() => setIsSalarySlipModalOpen(false)}
        employeeId={salarySlipEmployeeId}
      />

      <PayrollDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRecordForDetail(null);
        }}
        record={selectedRecordForDetail}
        onPrintSlip={(empId) => {
          setIsDetailModalOpen(false);
          setSalarySlipEmployeeId(empId);
          setIsSalarySlipModalOpen(true);
        }}
      />
    </section>
  );
}
