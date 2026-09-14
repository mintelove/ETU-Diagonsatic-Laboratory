import React, { useState, useEffect, useMemo } from 'react';
import { MONTHS, getPayrollPreview } from '../../services/payrollService.js';

export default function ProcessPayrollModal({
  isOpen,
  onClose,
  onProcess,
  employees = [],
  nextDateInfo,
  settings,
  defaultBranch = 'All',
  initialMonth = null,
  initialYear = null,
  initialEmployeeIds = null
}) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Form states
  const [selectedMonth, setSelectedMonth] = useState(initialMonth ? Number(initialMonth) : currentMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear ? Number(initialYear) : currentYear);
  const [paymentScope, setPaymentScope] = useState(initialEmployeeIds && initialEmployeeIds.length > 0 ? 'SELECTED' : 'ALL'); // 'ALL' or 'SELECTED'
  const [selectedEmpIds, setSelectedEmpIds] = useState(initialEmployeeIds || []);
  const [empSearch, setEmpSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [salaryDate, setSalaryDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Preview & Processing state
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [processResult, setProcessResult] = useState(null);

  // Year options (Current year - 2 to + 2)
  const yearOptions = useMemo(() => {
    const list = [];
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Selected Month name
  const monthName = useMemo(() => {
    const m = MONTHS.find(item => item.value === Number(selectedMonth));
    return m ? m.name : 'Unknown';
  }, [selectedMonth]);

  const periodLabel = `${monthName} ${selectedYear}`;
  const periodKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // Initial employee selection
  useEffect(() => {
    if (isOpen) {
      if (initialMonth) setSelectedMonth(Number(initialMonth));
      if (initialYear) setSelectedYear(Number(initialYear));
      if (initialEmployeeIds && initialEmployeeIds.length > 0) {
        setPaymentScope('SELECTED');
        setSelectedEmpIds(initialEmployeeIds);
      } else {
        const activeIds = employees.filter(e => e.employmentStatus === 'Active').map(e => e._id);
        setSelectedEmpIds(activeIds);
        setPaymentScope('ALL');
      }
      setShowConfirmation(false);
      setProcessResult(null);
    }
  }, [isOpen, employees, initialMonth, initialYear, initialEmployeeIds]);

  // Fetch pre-flight preview whenever period or scope changes
  useEffect(() => {
    if (!isOpen) return;
    loadPreview();
  }, [isOpen, selectedMonth, selectedYear, paymentScope, selectedEmpIds, defaultBranch]);

  const loadPreview = async () => {
    try {
      setLoadingPreview(true);
      const params = {
        year: selectedYear,
        month: selectedMonth,
        branch: defaultBranch
      };
      if (paymentScope === 'SELECTED') {
        params.employeeIds = selectedEmpIds.length > 0 ? selectedEmpIds.join(',') : 'none';
      }

      const res = await getPayrollPreview(params);
      if (res?.data) {
        setPreviewData(res.data);
      }
    } catch (err) {
      console.error('Error fetching payroll preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleToggleEmp = (id) => {
    setSelectedEmpIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const activeIds = employees.filter(e => e.employmentStatus === 'Active').map(e => e._id);
    setSelectedEmpIds(activeIds);
  };

  const handleDeselectAll = () => {
    setSelectedEmpIds([]);
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!previewData || previewData.totals?.readyCount === 0) {
      alert(`All selected employees have already been paid for ${periodLabel}. No unpaid salaries to process.`);
      return;
    }
    setShowConfirmation(true);
  };

  const handleExecutePayment = async () => {
    try {
      setIsProcessing(true);
      const payload = {
        payrollYear: Number(selectedYear),
        payrollMonth: Number(selectedMonth),
        paymentScope,
        employeeIds: paymentScope === 'SELECTED' ? selectedEmpIds : [],
        salaryDate,
        paymentMethod,
        notes: notes.trim()
      };

      const res = await onProcess(payload);
      setProcessResult(res || { success: true });
      setShowConfirmation(false);
    } catch (err) {
      console.error('Processing error:', err);
      alert(err.message || 'Failed to process payroll.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const totals = previewData?.totals || {
    totalEligibleEmployees: 0,
    readyCount: 0,
    alreadyPaidCount: 0,
    totalBasicSalary: 0,
    totalAdvances: 0,
    totalNetPayroll: 0
  };

  return (
    <div className="payroll-modal-backdrop" onClick={onClose}>
      <div className="payroll-modal" style={{ maxWidth: '920px' }} onClick={e => e.stopPropagation()}>
        <div className="payroll-modal-header">
          <h2>
            <span>⚡</span>
            Process Period Payroll
          </h2>
          <button className="payroll-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Process Result View */}
        {processResult ? (
          <div className="payroll-modal-body" style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {processResult.success !== false ? '✅' : '⚠️'}
            </div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary, #f8fafc)', margin: '0 0 8px' }}>
              {processResult.success !== false ? 'Payroll Processed Successfully' : 'Notice: Already Paid'}
            </h3>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', maxWidth: '520px', margin: '0 auto 24px', fontSize: '0.95rem' }}>
              {processResult.message || 'Operation completed.'}
            </p>

            <div style={{
              display: 'inline-flex',
              gap: '18px',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '16px 24px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '28px'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>PERIOD</span>
                <strong style={{ color: '#38bdf8' }}>{periodLabel}</strong>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>PAID STAFF</span>
                <strong style={{ color: '#34d399' }}>{processResult.processed ?? totals.readyCount}</strong>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>SKIPPED (ALREADY PAID)</span>
                <strong style={{ color: '#f59e0b' }}>{processResult.alreadyPaid ?? totals.alreadyPaidCount}</strong>
              </div>
            </div>

            <div>
              <button className="btn-payroll-primary" onClick={onClose} style={{ padding: '10px 24px' }}>
                Done & Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReviewSubmit}>
            <div className="payroll-modal-body">

              {/* ═══ 1. SALARY PERIOD DROPDOWNS (Month & Year) ═══ */}
              <div className="form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px' }}>
                <div className="form-field">
                  <label>Salary Month *</label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="payroll-filter-select"
                    style={{ width: '100%' }}
                    required
                  >
                    {MONTHS.map(m => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Salary Year *</label>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="payroll-filter-select"
                    style={{ width: '100%' }}
                    required
                  >
                    {yearOptions.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Selected Period Key</label>
                  <div style={{
                    padding: '8px 12px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    color: '#38bdf8',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>📅 {periodLabel}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8, fontFamily: 'monospace' }}>[{periodKey}]</span>
                  </div>
                </div>
              </div>

              {/* ═══ 2. PAYMENT SCOPE (All vs Selected) ═══ */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '14px 16px',
                margin: '8px 0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary, #f8fafc)', fontSize: '0.9rem' }}>
                    Payment Scope:
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontSize: '0.88rem' }}>
                      <input
                        type="radio"
                        name="paymentScope"
                        value="ALL"
                        checked={paymentScope === 'ALL'}
                        onChange={() => setPaymentScope('ALL')}
                      />
                      <span>All Eligible Employees</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontSize: '0.88rem' }}>
                      <input
                        type="radio"
                        name="paymentScope"
                        value="SELECTED"
                        checked={paymentScope === 'SELECTED'}
                        onChange={() => setPaymentScope('SELECTED')}
                      />
                      <span>Selected Employees Only</span>
                    </label>
                  </div>
                </div>

                {/* Sub-selector when 'SELECTED' is chosen */}
                {paymentScope === 'SELECTED' && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <input
                        type="text"
                        placeholder="Search employee in list..."
                        value={empSearch}
                        onChange={e => setEmpSearch(e.target.value)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.82rem',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          width: '200px'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="btn-payroll-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={handleSelectAll}>
                          Select All
                        </button>
                        <button type="button" className="btn-payroll-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={handleDeselectAll}>
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
                      {employees
                        .filter(e => e.employmentStatus === 'Active')
                        .filter(e => !empSearch || e.fullName.toLowerCase().includes(empSearch.toLowerCase()))
                        .map(emp => (
                          <label
                            key={emp._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 8px',
                              background: selectedEmpIds.includes(emp._id) ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              margin: 0
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedEmpIds.includes(emp._id)}
                              onChange={() => handleToggleEmp(emp._id)}
                            />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {emp.fullName}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ═══ 3. SUMMARY HIGHLIGHTS ═══ */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '12px 14px'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>TOTAL SCOPE</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                    {totals.totalEligibleEmployees}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>READY TO PAY</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}>
                    {totals.readyCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ALREADY PAID</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: totals.alreadyPaidCount > 0 ? '#f59e0b' : '#94a3b8' }}>
                    {totals.alreadyPaidCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>BASIC SALARIES</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#60a5fa' }}>
                    {totals.totalBasicSalary.toLocaleString()} ETB
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ADVANCES DEDUCTED</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f87171' }}>
                    -{totals.totalAdvances.toLocaleString()} ETB
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>NET DISBURSABLE</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}>
                    {totals.totalNetPayroll.toLocaleString()} ETB
                  </div>
                </div>
              </div>

              {/* ═══ 4. PREVIEW TABLE (With Ready vs Already Paid) ═══ */}
              <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}>
                {loadingPreview ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    Calculating preview & verifying duplicate payment records...
                  </div>
                ) : previewData?.employees?.length > 0 ? (
                  <table className="payroll-table" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Emp ID</th>
                        <th>Employee Name</th>
                        <th>Job Type</th>
                        <th>Branch</th>
                        <th style={{ textAlign: 'right' }}>Basic</th>
                        <th style={{ textAlign: 'right' }}>Advance</th>
                        <th style={{ textAlign: 'right' }}>Net Payable</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.employees.map(emp => (
                        <tr
                          key={emp._id}
                          style={{
                            opacity: emp.isAlreadyPaid ? 0.65 : 1,
                            background: emp.isAlreadyPaid ? 'rgba(245, 158, 11, 0.03)' : 'transparent'
                          }}
                        >
                          <td><span className="emp-code-badge">{emp.employeeId}</span></td>
                          <td><strong>{emp.fullName}</strong></td>
                          <td>{emp.jobType}</td>
                          <td>{emp.branch}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                            {emp.basicSalary.toLocaleString()} ETB
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', color: emp.advanceAmount > 0 ? '#f87171' : '#94a3b8' }}>
                            {emp.advanceAmount > 0 ? `-${emp.advanceAmount.toLocaleString()} ETB` : '0 ETB'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: emp.isAlreadyPaid ? '#94a3b8' : '#34d399' }}>
                            {emp.netSalary.toLocaleString()} ETB
                          </td>
                          <td>
                            {emp.isAlreadyPaid ? (
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: 'rgba(245, 158, 11, 0.2)',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.4)'
                              }}>
                                ⚠️ ALREADY PAID
                              </span>
                            ) : (
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.4)'
                              }}>
                                READY
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No employees matching the selected scope.
                  </div>
                )}
              </div>

              {/* ═══ 5. PAYMENT DATE & METHOD ═══ */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-field">
                  <label>Official Payday Date *</label>
                  <input
                    type="date"
                    value={salaryDate}
                    onChange={e => setSalaryDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Disbursement Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="payroll-filter-select"
                    style={{ width: '100%' }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Telebirr">Telebirr</option>
                    <option value="CBE Birr">CBE Birr</option>
                    <option value="Check">Check</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>Processing Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Regular monthly disbursement verified by HR"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {totals.alreadyPaidCount > 0 && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  color: '#fbbf24',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <span>ℹ️</span>
                  <span>
                    <strong>{totals.alreadyPaidCount}</strong> employee(s) were already paid for {periodLabel} and will be automatically skipped to prevent duplicate payments.
                  </span>
                </div>
              )}
            </div>

            <div className="payroll-modal-footer">
              <button type="button" className="btn-payroll-secondary" onClick={onClose} disabled={isProcessing}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-payroll-success"
                disabled={isProcessing || loadingPreview || totals.readyCount === 0}
              >
                {totals.readyCount === 0
                  ? `Already Paid (${totals.alreadyPaidCount} Staff)`
                  : `Review & Pay (${totals.readyCount} Staff)`}
              </button>
            </div>
          </form>
        )}

        {/* ═══ CONFIRMATION MODAL OVERLAY ═══ */}
        {showConfirmation && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(11, 17, 30, 0.95)',
            backdropFilter: 'blur(4px)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 50
          }}>
            <div style={{
              background: 'var(--card-bg, #1e293b)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '14px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>💳</div>
              <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary, #f8fafc)', fontSize: '1.25rem' }}>
                Confirm Payroll Payment
              </h3>
              <p style={{ margin: '0 0 16px', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>
                Please verify the final disbursement figures before execution.
              </p>

              <div style={{
                textAlign: 'left',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px',
                padding: '14px 18px',
                marginBottom: '20px',
                fontSize: '0.88rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Salary Period:</span>
                  <strong style={{ color: '#38bdf8' }}>{periodLabel}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Employees to Pay:</span>
                  <strong style={{ color: '#34d399' }}>{totals.readyCount} staff</strong>
                </div>
                {totals.alreadyPaidCount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#94a3b8' }}>Skipped (Already Paid):</span>
                    <strong style={{ color: '#f59e0b' }}>{totals.alreadyPaidCount} staff</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Basic Salaries:</span>
                  <span>{totals.totalBasicSalary.toLocaleString()} ETB</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Total Advances:</span>
                  <span style={{ color: '#f87171' }}>-{totals.totalAdvances.toLocaleString()} ETB</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', margin: '8px 0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: '#f8fafc' }}>Net Disbursable:</span>
                  <strong style={{ fontSize: '1.05rem', color: '#34d399' }}>{totals.totalNetPayroll.toLocaleString()} ETB</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn-payroll-secondary"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isProcessing}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn-payroll-success"
                  onClick={handleExecutePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Executing Payment...' : 'Confirm & Pay'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
