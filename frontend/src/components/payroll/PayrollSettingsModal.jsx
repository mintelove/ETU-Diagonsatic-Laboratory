import React, { useState, useEffect } from 'react';
import { calculateNextSalaryDate } from '../../utils/ethiopianCalendar.js';

export default function PayrollSettingsModal({ isOpen, onClose, onSave, currentSettings }) {
  const [calendarType, setCalendarType] = useState('Ethiopian');
  const [salaryDay, setSalaryDay] = useState(30);
  const [salaryFrequency, setSalaryFrequency] = useState('Monthly');
  const [currency, setCurrency] = useState('ETB');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (currentSettings) {
      setCalendarType(currentSettings.calendarType || 'Ethiopian');
      setSalaryDay(currentSettings.salaryDay || 30);
      setSalaryFrequency(currentSettings.salaryFrequency || 'Monthly');
      setCurrency(currentSettings.currency || 'ETB');
    }
  }, [currentSettings, isOpen]);

  // Live preview whenever inputs change
  useEffect(() => {
    try {
      const calc = calculateNextSalaryDate({
        calendarType,
        salaryDay: Number(salaryDay) || 30,
        fromDate: new Date()
      });
      setPreview(calc);
    } catch (_) {}
  }, [calendarType, salaryDay]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onSave({
        calendarType,
        salaryDay: Number(salaryDay),
        salaryFrequency,
        currency
      });
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="payroll-modal-backdrop" onClick={onClose}>
      <div className="payroll-modal" onClick={e => e.stopPropagation()}>
        <div className="payroll-modal-header">
          <h2>
            <span>⚙️</span>
            Payroll & Salary Date Configuration
          </h2>
          <button className="payroll-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="payroll-modal-body">
            <div className="form-field">
              <label>Calendar System for Payday Configuration *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                <button
                  type="button"
                  className={`btn-payroll-secondary ${calendarType === 'Ethiopian' ? 'active' : ''}`}
                  style={{
                    background: calendarType === 'Ethiopian' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                    borderColor: calendarType === 'Ethiopian' ? '#38bdf8' : 'rgba(255,255,255,0.15)',
                    color: calendarType === 'Ethiopian' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
                    padding: '12px',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => setCalendarType('Ethiopian')}
                >
                  <strong style={{ fontSize: '1rem' }}>🇪🇹 Ethiopian Calendar (E.C.)</strong>
                  <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>Default Mode (Day 30)</small>
                </button>

                <button
                  type="button"
                  className={`btn-payroll-secondary ${calendarType === 'Gregorian' ? 'active' : ''}`}
                  style={{
                    background: calendarType === 'Gregorian' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                    borderColor: calendarType === 'Gregorian' ? '#38bdf8' : 'rgba(255,255,255,0.15)',
                    color: calendarType === 'Gregorian' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
                    padding: '12px',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => setCalendarType('Gregorian')}
                >
                  <strong style={{ fontSize: '1rem' }}>🌐 Gregorian Calendar (G.C.)</strong>
                  <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>International Standard</small>
                </button>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label>Salary Payment Day of Month *</label>
                <input
                  type="number"
                  min="1"
                  max={calendarType === 'Ethiopian' ? 30 : 31}
                  value={salaryDay}
                  onChange={e => setSalaryDay(e.target.value)}
                />
                <small style={{ color: '#94a3b8' }}>
                  {calendarType === 'Ethiopian'
                    ? 'Default: 30th (Meskerem 30, Tikimt 30, etc.)'
                    : 'e.g. 25th or 30th of each month'}
                </small>
              </div>

              <div className="form-field">
                <label>Salary Frequency</label>
                <select
                  value={salaryFrequency}
                  onChange={e => setSalaryFrequency(e.target.value)}
                >
                  <option value="Monthly">Monthly (Standard)</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>
            </div>

            {/* Live Calculation Preview Banner */}
            {preview && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(14, 116, 144, 0.2), rgba(15, 23, 42, 0.8))',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Live Next Payday Preview
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                      {preview.nextSalaryDateFormatted}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Equivalent: {preview.alternativeCalendarFormatted}
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    color: '#34d399',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}>
                    ⏱ {preview.daysRemaining} Days Remaining
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="payroll-modal-footer">
            <button type="button" className="btn-payroll-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-payroll-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Apply Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
