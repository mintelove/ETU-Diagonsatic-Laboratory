import React, { useState, useEffect } from 'react';
import Logo from '../../assets/Logo.jsx';
import { getSalarySlip } from '../../services/payrollService.js';

export default function SalarySlipModal({ isOpen, onClose, employeeId }) {
  const [slipData, setSlipData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && employeeId) {
      loadSlip();
    } else {
      setSlipData(null);
    }
  }, [isOpen, employeeId]);

  const loadSlip = async () => {
    try {
      setLoading(true);
      const res = await getSalarySlip(employeeId);
      if (res?.data) {
        setSlipData(res.data);
      }
    } catch (err) {
      console.error('Error fetching salary slip:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="payroll-modal-backdrop" onClick={onClose}>
      <div className="payroll-modal" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
        <div className="payroll-modal-header no-print">
          <h2>
            <span>📄</span>
            Employee Salary Payment Slip
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-payroll-primary" onClick={handlePrint}>
              🖨️ Print Slip
            </button>
            <button className="payroll-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="payroll-modal-body" style={{ background: '#f8fafc', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
              Generating salary slip...
            </div>
          ) : slipData ? (
            <div className="salary-slip-view">
              {/* Slip Header */}
              <div className="slip-header">
                <div className="slip-brand">
                  <Logo size={48} style={{ borderRadius: '8px', background: '#0b2a4a', padding: '4px' }} />
                  <div className="slip-title">
                    <h3>ETU DIAGNOSTIC LABORATORY</h3>
                    <p>Quality Diagnostic Healthcare Services • Ethiopia</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block',
                    background: '#0b2a4a',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Salary Payment Slip
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    Date: {new Date().toISOString().slice(0, 10)}
                  </div>
                </div>
              </div>

              {/* Employee & Period Meta Information */}
              <div className="slip-meta-grid">
                <div className="slip-meta-item">
                  <strong>Employee ID:</strong>
                  <span style={{ fontFamily: 'monospace', color: '#1d4ed8' }}>{slipData.employee.employeeId}</span>
                </div>
                <div className="slip-meta-item">
                  <strong>Salary Period:</strong>
                  <span>{slipData.salaryPeriod}</span>
                </div>
                <div className="slip-meta-item">
                  <strong>Employee Name:</strong>
                  <span>{slipData.employee.fullName}</span>
                </div>
                <div className="slip-meta-item">
                  <strong>Scheduled Payday:</strong>
                  <span>{slipData.salaryDate}</span>
                </div>
                <div className="slip-meta-item">
                  <strong>Job Title / Role:</strong>
                  <span>{slipData.employee.jobType}</span>
                </div>
                <div className="slip-meta-item">
                  <strong>Branch:</strong>
                  <span>{slipData.employee.branch} Branch</span>
                </div>
                <div className="slip-meta-item">
                  <strong>Phone:</strong>
                  <span>{slipData.employee.phone}</span>
                </div>
                <div className="slip-meta-item">
                  <strong>Calendar Mode:</strong>
                  <span>{slipData.calendarType}</span>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown Table */}
              <table className="slip-breakdown-table">
                <thead>
                  <tr>
                    <th>Earnings Item</th>
                    <th style={{ textAlign: 'right' }}>Amount ({slipData.currency})</th>
                    <th>Deductions Item</th>
                    <th style={{ textAlign: 'right' }}>Amount ({slipData.currency})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Basic Monthly Salary</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                      {Number(slipData.basicSalary).toLocaleString()}
                    </td>
                    <td>
                      {slipData.advances && slipData.advances.length > 0
                        ? `Salary Advances (${slipData.advances.length} payments)`
                        : 'Salary Advance Deductions'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: slipData.totalAdvances > 0 ? '#dc2626' : '#64748b' }}>
                      {slipData.totalAdvances > 0 ? `-${Number(slipData.totalAdvances).toLocaleString()}` : '0.00'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>Allowances / Bonuses</td>
                    <td style={{ textAlign: 'right', color: '#64748b', fontFamily: 'monospace' }}>0.00</td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>Other Deductions</td>
                    <td style={{ textAlign: 'right', color: '#64748b', fontFamily: 'monospace' }}>0.00</td>
                  </tr>
                  <tr className="total-row">
                    <td>TOTAL EARNINGS</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {Number(slipData.basicSalary).toLocaleString()} {slipData.currency}
                    </td>
                    <td>TOTAL DEDUCTIONS</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>
                      {slipData.totalAdvances > 0 ? `-${Number(slipData.totalAdvances).toLocaleString()}` : '0.00'} {slipData.currency}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Net Pay Highlight Card */}
              <div style={{
                background: '#f0fdf4',
                border: '2px solid #86efac',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#15803d', fontWeight: 700 }}>
                    Net Salary Payable
                  </div>
                  <small style={{ color: '#166534', fontSize: '0.75rem' }}>
                    Gross Basic ({Number(slipData.basicSalary).toLocaleString()}) - Advances ({Number(slipData.totalAdvances).toLocaleString()})
                  </small>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', fontFamily: 'monospace' }}>
                  {Number(slipData.netSalary).toLocaleString()} {slipData.currency}
                </div>
              </div>

              {/* Signatures & Stamp */}
              <div className="slip-signatures">
                <div className="slip-sign-box">
                  <div className="slip-sign-line" />
                  <strong>Prepared By (HR / Admin)</strong>
                  <span>ETU Diagnostic Laboratory</span>
                </div>
                <div className="slip-sign-box" style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '90px',
                    height: '90px',
                    border: '2px dashed #94a3b8',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 6px',
                    color: '#94a3b8',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Laboratory Stamp
                  </div>
                  <span>Official Verification</span>
                </div>
                <div className="slip-sign-box" style={{ textAlign: 'right' }}>
                  <div className="slip-sign-line" style={{ marginLeft: 'auto' }} />
                  <strong>Employee Signature</strong>
                  <span>Date: ________________</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="payroll-modal-footer no-print">
          <button className="btn-payroll-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-payroll-primary" onClick={handlePrint}>
            🖨️ Print Salary Slip
          </button>
        </div>
      </div>
    </div>
  );
}
