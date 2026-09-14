import React, { useState, useEffect } from 'react';
import { ADVANCE_PAYMENT_METHODS } from '../../services/payrollService.js';

export default function AdvanceModal({ isOpen, onClose, onSave, initialData, employees = [] }) {
  const [formData, setFormData] = useState({
    employeeId: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    reason: 'Mid-month personal advance',
    paymentMethod: 'Cash',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        employeeId: initialData.employee?._id || initialData.employeeId || '',
        amount: initialData.amount !== undefined ? initialData.amount : '',
        date: initialData.date ? new Date(initialData.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        reason: initialData.reason || '',
        paymentMethod: initialData.paymentMethod || 'Cash',
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        employeeId: employees.length > 0 ? (employees[0]._id || employees[0].id) : '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        reason: 'Mid-month personal advance',
        paymentMethod: 'Cash',
        notes: ''
      });
    }
    setErrors({});
  }, [initialData, isOpen, employees]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.employeeId) errs.employeeId = 'Please select an employee.';
    if (!formData.amount || Number(formData.amount) <= 0) {
      errs.amount = 'Advance amount must be greater than zero.';
    }
    if (!formData.date) errs.date = 'Date is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        ...formData,
        amount: Number(formData.amount)
      });
      onClose();
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to record advance.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(initialData?._id);
  const selectedEmp = employees.find(e => (e._id || e.id) === formData.employeeId);

  return (
    <div className="payroll-modal-backdrop" onClick={onClose}>
      <div className="payroll-modal" onClick={e => e.stopPropagation()}>
        <div className="payroll-modal-header">
          <h2>
            <span>💸</span>
            {isEditing ? 'Edit Salary Advance' : 'Record Salary Advance'}
          </h2>
          <button className="payroll-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="payroll-modal-body">
            {errors.submit && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#f87171', fontSize: '0.88rem' }}>
                {errors.submit}
              </div>
            )}

            <div className="form-field">
              <label>Select Employee *</label>
              <select
                value={formData.employeeId}
                onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                disabled={isEditing}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>
                    {emp.employeeId} — {emp.fullName} ({emp.branch}) [Salary: {Number(emp.salary || 0).toLocaleString()} ETB]
                  </option>
                ))}
              </select>
              {errors.employeeId && <small className="error">{errors.employeeId}</small>}
            </div>

            {selectedEmp && (
              <div style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem'
              }}>
                <div>
                  <div style={{ color: '#94a3b8' }}>Monthly Salary</div>
                  <div style={{ color: '#f8fafc', fontWeight: 700 }}>
                    {Number(selectedEmp.salary || 0).toLocaleString()} ETB
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8' }}>Current Active Advances</div>
                  <div style={{ color: '#f87171', fontWeight: 700 }}>
                    {Number(selectedEmp.activeAdvances || 0).toLocaleString()} ETB
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8' }}>Net Salary Remaining</div>
                  <div style={{ color: '#34d399', fontWeight: 700 }}>
                    {Math.max(0, (Number(selectedEmp.salary || 0) - Number(selectedEmp.activeAdvances || 0))).toLocaleString()} ETB
                  </div>
                </div>
              </div>
            )}

            <div className="form-grid-2">
              <div className="form-field">
                <label>Advance Amount (ETB) *</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 3000"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                />
                {errors.amount && <small className="error">{errors.amount}</small>}
              </div>

              <div className="form-field">
                <label>Advance Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
                {errors.date && <small className="error">{errors.date}</small>}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label>Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                >
                  {ADVANCE_PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Reason / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Medical emergency, urgent travel"
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
            </div>

            <div className="form-field">
              <label>Additional Notes (Optional)</label>
              <textarea
                rows="2"
                placeholder="Any relevant reference or approval detail..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="payroll-modal-footer">
            <button type="button" className="btn-payroll-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-payroll-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Advance' : 'Record Advance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
