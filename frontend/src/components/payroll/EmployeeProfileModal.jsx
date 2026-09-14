import React, { useState, useEffect } from 'react';
import { getEmployeeById } from '../../services/payrollService.js';

export default function EmployeeProfileModal({ isOpen, onClose, employeeId, onEdit, onAddAdvance, onPrintSlip }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && employeeId) {
      loadProfile();
    } else {
      setProfile(null);
      setActiveTab('overview');
    }
  }, [isOpen, employeeId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await getEmployeeById(employeeId);
      if (res?.data) {
        setProfile(res.data);
      }
    } catch (err) {
      console.error('Error fetching employee profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="payroll-modal-backdrop" onClick={onClose}>
      <div className="payroll-modal" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
        <div className="payroll-modal-header">
          <h2>
            <span>👤</span>
            {loading ? 'Loading Employee Profile...' : profile?.fullName || 'Employee Profile'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {profile && (
              <>
                <button
                  className="btn-payroll-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  onClick={() => onPrintSlip(profile)}
                  title="View / Print Salary Slip"
                >
                  📄 Salary Slip
                </button>
                <button
                  className="btn-payroll-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  onClick={() => onAddAdvance(profile)}
                  title="Give Advance"
                >
                  💸 Add Advance
                </button>
                <button
                  className="btn-payroll-primary"
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  onClick={() => onEdit(profile)}
                >
                  ✏️ Edit
                </button>
              </>
            )}
            <button className="payroll-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            Loading employee details...
          </div>
        ) : profile ? (
          <div>
            {/* Quick Profile Summary Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 700
                }}>
                  {profile.fullName?.charAt(0) || 'E'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '1.1rem', color: '#f8fafc' }}>{profile.fullName}</strong>
                    <span className="emp-code-badge">{profile.employeeId}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                    {profile.jobType === 'Other' && profile.customJobType ? profile.customJobType : profile.jobType} • {profile.branch} Branch
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
                <div>
                  <small style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>CURRENT BASIC</small>
                  <strong style={{ color: '#f8fafc', fontSize: '1.05rem', fontFamily: 'monospace' }}>
                    {Number(profile.salary || 0).toLocaleString()} ETB
                  </strong>
                </div>
                <div>
                  <small style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>NET PAYABLE</small>
                  <strong style={{ color: '#34d399', fontSize: '1.05rem', fontFamily: 'monospace' }}>
                    {Number(profile.netPayable || 0).toLocaleString()} ETB
                  </strong>
                </div>
              </div>
            </div>

            {/* Profile Tabs */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 24px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'advances', label: `Advances (${profile.advances?.length || 0})` },
                { id: 'payrollHistory', label: `Payroll Records (${profile.payrollHistory?.length || 0})` },
                { id: 'salaryHistory', label: `Salary Adjustments (${profile.salaryHistory?.length || 0})` }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === t.id ? '2px solid #38bdf8' : '2px solid transparent',
                    color: activeTab === t.id ? '#38bdf8' : '#94a3b8',
                    padding: '8px 14px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="payroll-modal-body" style={{ minHeight: '280px' }}>
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-field">
                      <label>Age</label>
                      <div style={{ color: '#f8fafc', fontWeight: 600 }}>{profile.age} years old</div>
                    </div>
                    <div className="form-field">
                      <label>Phone</label>
                      <div style={{ color: '#f8fafc', fontWeight: 600 }}>{profile.phone}</div>
                    </div>
                    <div className="form-field">
                      <label>Recruitment / Hire Date</label>
                      <div style={{ color: '#f8fafc' }}>
                        {profile.recruitmentDate ? new Date(profile.recruitmentDate).toLocaleDateString() : '—'}
                      </div>
                    </div>
                    <div className="form-field">
                      <label>Employment Status</label>
                      <div>
                        <span className={`status-badge ${profile.employmentStatus?.toLowerCase()}`}>
                          {profile.employmentStatus}
                        </span>
                      </div>
                    </div>
                    <div className="form-field">
                      <label>Linked User Account</label>
                      <div style={{ color: profile.userId ? '#60a5fa' : '#94a3b8' }}>
                        {profile.userId ? `${profile.userId.fullName} (@${profile.userId.username})` : 'None (Non-login staff)'}
                      </div>
                    </div>
                    <div className="form-field">
                      <label>Salary Frequency</label>
                      <div style={{ color: '#f8fafc' }}>{profile.salaryFrequency || 'Monthly'}</div>
                    </div>
                  </div>

                  {profile.notes && (
                    <div className="form-field" style={{ marginTop: '8px' }}>
                      <label>Notes</label>
                      <div style={{ color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px' }}>
                        {profile.notes}
                      </div>
                    </div>
                  )}

                  {/* Current Cycle Financial Breakdown */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '16px',
                    marginTop: '8px'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', marginBottom: '10px' }}>
                      CURRENT SALARY CYCLE CALCULATION
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.88rem' }}>
                      <span>Gross Basic Salary:</span>
                      <strong style={{ fontFamily: 'monospace' }}>{Number(profile.salary || 0).toLocaleString()} ETB</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.88rem' }}>
                      <span>Active Advances (Pre-salary payments):</span>
                      <strong style={{ fontFamily: 'monospace', color: profile.activeAdvances > 0 ? '#f87171' : '#94a3b8' }}>
                        {profile.activeAdvances > 0 ? `-${Number(profile.activeAdvances).toLocaleString()} ETB` : '0 ETB'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontSize: '1rem' }}>
                      <strong style={{ color: '#38bdf8' }}>Current Net Salary Payable:</strong>
                      <strong style={{ fontFamily: 'monospace', color: '#34d399', fontSize: '1.1rem' }}>
                        {Number(profile.netPayable || 0).toLocaleString()} ETB
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'advances' && (
                <div>
                  {profile.advances?.length > 0 ? (
                    <table className="payroll-table" style={{ fontSize: '0.82rem' }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Reason</th>
                          <th>Method</th>
                          <th>Status</th>
                          <th>Recorded By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.advances.map(adv => (
                          <tr key={adv._id}>
                            <td>{new Date(adv.date).toLocaleDateString()}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f87171' }}>
                              {Number(adv.amount).toLocaleString()} ETB
                            </td>
                            <td>{adv.reason || 'Salary advance'}</td>
                            <td>{adv.paymentMethod}</td>
                            <td>
                              <span className={`status-badge ${adv.status?.toLowerCase()}`}>
                                {adv.status}
                              </span>
                            </td>
                            <td>{adv.recordedBy?.fullName || 'Admin'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      No advances recorded for this employee.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'payrollHistory' && (
                <div>
                  {profile.payrollHistory?.length > 0 ? (
                    <table className="payroll-table" style={{ fontSize: '0.82rem' }}>
                      <thead>
                        <tr>
                          <th>Payroll ID</th>
                          <th>Period</th>
                          <th>Basic Salary</th>
                          <th>Advances</th>
                          <th>Net Paid</th>
                          <th>Payment Date</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Slip</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.payrollHistory.map(rec => (
                          <tr key={rec._id}>
                            <td><span className="emp-code-badge">{rec.payrollId}</span></td>
                            <td><strong>{rec.salaryPeriod}</strong></td>
                            <td style={{ fontFamily: 'monospace' }}>{Number(rec.basicSalary).toLocaleString()} ETB</td>
                            <td style={{ fontFamily: 'monospace', color: rec.totalAdvances > 0 ? '#f87171' : '#94a3b8' }}>
                              {rec.totalAdvances > 0 ? `-${Number(rec.totalAdvances).toLocaleString()} ETB` : '0 ETB'}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
                              {Number(rec.netSalary).toLocaleString()} ETB
                            </td>
                            <td style={{ color: '#94a3b8' }}>
                              {rec.paymentDate ? new Date(rec.paymentDate).toLocaleDateString() : (rec.salaryDate ? new Date(rec.salaryDate).toLocaleDateString() : '—')}
                            </td>
                            <td>
                              <span className={`status-badge ${rec.status?.toLowerCase()}`}>
                                {rec.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn-payroll-secondary"
                                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                onClick={() => onPrintSlip(profile)}
                                title="View Slip"
                              >
                                📄 Slip
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      No past finalized payroll records for this employee yet.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'salaryHistory' && (
                <div>
                  {profile.salaryHistory?.length > 0 ? (
                    <table className="payroll-table" style={{ fontSize: '0.82rem' }}>
                      <thead>
                        <tr>
                          <th>Effective Date</th>
                          <th>Salary</th>
                          <th>Reason</th>
                          <th>Recorded By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.salaryHistory.map((hist, idx) => (
                          <tr key={idx}>
                            <td>{new Date(hist.effectiveDate || hist.createdAt).toLocaleDateString()}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f8fafc' }}>
                              {Number(hist.salary).toLocaleString()} ETB
                            </td>
                            <td>{hist.reason || 'Salary revision'}</td>
                            <td>{hist.changedBy?.fullName || 'System'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      No salary revisions recorded.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="payroll-modal-footer">
          <button className="btn-payroll-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
