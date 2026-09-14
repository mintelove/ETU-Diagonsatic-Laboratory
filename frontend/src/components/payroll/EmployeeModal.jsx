import React, { useState, useEffect } from 'react';
import { JOB_TYPES, BRANCH_OPTIONS } from '../../services/payrollService.js';

export default function EmployeeModal({ isOpen, onClose, onSave, initialData, users = [] }) {
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    phone: '',
    jobType: 'Reception',
    customJobType: '',
    branch: 'Main',
    recruitmentDate: new Date().toISOString().slice(0, 10),
    salary: '',
    salaryCurrency: 'ETB',
    salaryFrequency: 'Monthly',
    employmentStatus: 'Active',
    userId: '',
    notes: '',
    salaryChangeReason: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        fullName: initialData.fullName || '',
        age: initialData.age || '',
        phone: initialData.phone || '',
        jobType: initialData.jobType || 'Reception',
        customJobType: initialData.customJobType || '',
        branch: initialData.branch || 'Main',
        recruitmentDate: initialData.recruitmentDate ? new Date(initialData.recruitmentDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        salary: initialData.salary !== undefined ? initialData.salary : '',
        salaryCurrency: initialData.salaryCurrency || 'ETB',
        salaryFrequency: initialData.salaryFrequency || 'Monthly',
        employmentStatus: initialData.employmentStatus || 'Active',
        userId: initialData.userId?._id || initialData.userId || '',
        notes: initialData.notes || '',
        salaryChangeReason: ''
      });
    } else {
      setFormData({
        fullName: '',
        age: '',
        phone: '',
        jobType: 'Reception',
        customJobType: '',
        branch: 'Main',
        recruitmentDate: new Date().toISOString().slice(0, 10),
        salary: '',
        salaryCurrency: 'ETB',
        salaryFrequency: 'Monthly',
        employmentStatus: 'Active',
        userId: '',
        notes: '',
        salaryChangeReason: ''
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!formData.age || Number(formData.age) < 16) errs.age = 'Age must be at least 16.';
    if (!formData.phone.trim()) errs.phone = 'Phone number is required.';
    if (formData.jobType === 'Other' && !formData.customJobType.trim()) {
      errs.customJobType = 'Please specify the custom job type.';
    }
    if (formData.salary === '' || Number(formData.salary) < 0) {
      errs.salary = 'Basic salary must be 0 or greater.';
    }
    if (!formData.recruitmentDate) errs.recruitmentDate = 'Recruitment date is required.';
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
        age: Number(formData.age),
        salary: Number(formData.salary)
      });
      onClose();
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to save employee.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(initialData?._id);
  const salaryHasChanged = isEditing && Number(formData.salary) !== Number(initialData.salary);

  return (
    <div className="payroll-modal-backdrop" onClick={onClose}>
      <div className="payroll-modal" onClick={e => e.stopPropagation()}>
        <div className="payroll-modal-header">
          <h2>
            <span>👤</span>
            {isEditing ? `Edit Employee (${initialData.employeeId})` : 'Add New Employee'}
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

            <div className="form-grid-2">
              <div className="form-field">
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Abebe Kebede"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                />
                {errors.fullName && <small className="error">{errors.fullName}</small>}
              </div>

              <div className="form-field">
                <label>Phone Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 0912345678"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
                {errors.phone && <small className="error">{errors.phone}</small>}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label>Age *</label>
                <input
                  type="number"
                  min="16"
                  max="100"
                  placeholder="e.g. 28"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: e.target.value })}
                />
                {errors.age && <small className="error">{errors.age}</small>}
              </div>

              <div className="form-field">
                <label>Branch *</label>
                <select
                  value={formData.branch}
                  onChange={e => setFormData({ ...formData, branch: e.target.value })}
                >
                  {BRANCH_OPTIONS.map(b => (
                    <option key={b} value={b}>{b} Branch</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label>Job Type *</label>
                <select
                  value={formData.jobType}
                  onChange={e => setFormData({ ...formData, jobType: e.target.value })}
                >
                  {JOB_TYPES.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              {formData.jobType === 'Other' ? (
                <div className="form-field">
                  <label>Specify Job Type *</label>
                  <input
                    type="text"
                    placeholder="Enter custom job type"
                    value={formData.customJobType}
                    onChange={e => setFormData({ ...formData, customJobType: e.target.value })}
                  />
                  {errors.customJobType && <small className="error">{errors.customJobType}</small>}
                </div>
              ) : (
                <div className="form-field">
                  <label>Linked User Account (Optional)</label>
                  <select
                    value={formData.userId}
                    onChange={e => setFormData({ ...formData, userId: e.target.value })}
                  >
                    <option value="">-- None (Non-System Staff) --</option>
                    {users.map(u => (
                      <option key={u.id || u._id} value={u.id || u._id}>
                        {u.fullName} ({u.username} - {u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label>Basic Salary (ETB / Month) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 15000"
                  value={formData.salary}
                  onChange={e => setFormData({ ...formData, salary: e.target.value })}
                />
                {errors.salary && <small className="error">{errors.salary}</small>}
              </div>

              <div className="form-field">
                <label>Recruitment / Hire Date *</label>
                <input
                  type="date"
                  value={formData.recruitmentDate}
                  onChange={e => setFormData({ ...formData, recruitmentDate: e.target.value })}
                />
                {errors.recruitmentDate && <small className="error">{errors.recruitmentDate}</small>}
              </div>
            </div>

            {isEditing && salaryHasChanged && (
              <div className="form-field" style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                <label style={{ color: '#38bdf8' }}>Reason for Salary Adjustment</label>
                <input
                  type="text"
                  placeholder="e.g. Annual increment, promotion, contract review"
                  value={formData.salaryChangeReason}
                  onChange={e => setFormData({ ...formData, salaryChangeReason: e.target.value })}
                />
                <small style={{ color: '#94a3b8', marginTop: '4px' }}>
                  This adjustment will be recorded into the employee's permanent salary audit history without modifying past finalized payroll runs.
                </small>
              </div>
            )}

            <div className="form-grid-2">
              <div className="form-field">
                <label>Employment Status</label>
                <select
                  value={formData.employmentStatus}
                  onChange={e => setFormData({ ...formData, employmentStatus: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>

              <div className="form-field">
                <label>Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Additional notes"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="payroll-modal-footer">
            <button type="button" className="btn-payroll-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-payroll-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
