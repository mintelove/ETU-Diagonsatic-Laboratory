import React from 'react';

export default function PayrollDetailModal({
  isOpen,
  onClose,
  record,
  onPrintSlip
}) {
  if (!isOpen || !record) return null;

  return (
    <div className="payroll-modal-backdrop" onClick={onClose}>
      <div className="payroll-modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <div className="payroll-modal-header">
          <h2>
            <span>📄</span>
            Payroll Record Details
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onPrintSlip && (
              <button
                className="btn-payroll-primary"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                onClick={() => onPrintSlip(record.employeeId || record._id)}
              >
                🖨️ Salary Slip
              </button>
            )}
            <button className="payroll-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="payroll-modal-body" style={{ padding: '20px' }}>
          {/* Header Card */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '16px'
          }}>
            <div>
              <span className="emp-code-badge" style={{ marginBottom: '4px', display: 'inline-block' }}>
                {record.payrollId || 'PAYROLL'}
              </span>
              <h3 style={{ margin: '2px 0 0', color: 'var(--text-primary, #f8fafc)', fontSize: '1.2rem' }}>
                {record.employeeName}
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)' }}>
                {record.jobType} · Branch: {record.branch}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: record.status === 'Paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                color: record.status === 'Paid' ? '#34d399' : '#38bdf8',
                border: `1px solid ${record.status === 'Paid' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`
              }}>
                {record.status?.toUpperCase() || 'PAID'}
              </span>
              <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '6px', fontWeight: 600 }}>
                {record.salaryPeriod}
              </div>
            </div>
          </div>

          {/* Calculations Breakdown Box */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', display: 'block' }}>Basic Salary</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary, #f8fafc)' }}>
                {Number(record.basicSalary || 0).toLocaleString()} ETB
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', display: 'block' }}>Advances Deducted</span>
              <strong style={{ fontSize: '1.1rem', color: '#f87171' }}>
                -{Number(record.totalAdvances || 0).toLocaleString()} ETB
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', display: 'block' }}>Net Disbursed</span>
              <strong style={{ fontSize: '1.1rem', color: '#34d399' }}>
                {Number(record.netSalary || 0).toLocaleString()} ETB
              </strong>
            </div>
          </div>

          {/* Details Table */}
          <table className="payroll-table" style={{ fontSize: '0.84rem' }}>
            <tbody>
              <tr>
                <td style={{ color: '#94a3b8', width: '40%' }}>Payment Date</td>
                <td><strong>{record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : (record.salaryDate ? new Date(record.salaryDate).toLocaleDateString() : '—')}</strong></td>
              </tr>
              <tr>
                <td style={{ color: '#94a3b8' }}>Payment Method</td>
                <td>{record.paymentMethod || 'Cash'}</td>
              </tr>
              <tr>
                <td style={{ color: '#94a3b8' }}>Processed By</td>
                <td>{record.processedBy?.fullName || record.processedBy || 'Administrator'}</td>
              </tr>
              <tr>
                <td style={{ color: '#94a3b8' }}>Calendar Format</td>
                <td>{record.calendarType || 'Ethiopian'}</td>
              </tr>
              {record.notes && (
                <tr>
                  <td style={{ color: '#94a3b8' }}>Notes</td>
                  <td>{record.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="payroll-modal-footer">
          <button type="button" className="btn-payroll-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
