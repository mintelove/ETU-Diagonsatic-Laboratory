import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client.js';
import { CLINICAL_INTERPRETATION_CATEGORIES } from '../constants/clinicalInterpretations.js';

export default function ClinicalInterpretationAdminModal({ token, onClose, onRefresh }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [editItem, setEditItem] = useState(null); // null, 'new', or item object
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchInterpretations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/clinical-interpretations/admin', { token });
      setList(Array.isArray(res?.interpretations) ? res.interpretations : []);
    } catch (err) {
      setError(err?.message || 'Failed to load interpretations library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterpretations();
  }, [token]);

  const filtered = useMemo(() => {
    return list.filter(item => {
      const catMatch = selectedCat === 'ALL' || (item.categoryName || '').toUpperCase() === selectedCat;
      const s = search.toLowerCase().trim();
      const searchMatch = !s ||
        (item.title || '').toLowerCase().includes(s) ||
        (item.interpretation || '').toLowerCase().includes(s) ||
        (item.laboratoryTestName || '').toLowerCase().includes(s) ||
        (item.categoryName || '').toLowerCase().includes(s);
      return catMatch && searchMatch;
    });
  }, [list, selectedCat, search]);

  const handleSaveForm = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!editItem.title?.trim() || !editItem.interpretation?.trim()) {
      setFormError('Title and Interpretation text are required.');
      return;
    }
    setSaving(true);
    try {
      if (editItem._id) {
        // Update
        await api(`/clinical-interpretations/${editItem._id}`, {
          token,
          method: 'PUT',
          body: JSON.stringify({
            title: editItem.title.trim(),
            categoryName: editItem.categoryName || 'GENERAL',
            laboratoryTestName: editItem.laboratoryTestName || 'GENERAL',
            interpretation: editItem.interpretation.trim(),
            active: editItem.active !== false
          })
        });
      } else {
        // Create
        await api('/clinical-interpretations', {
          token,
          method: 'POST',
          body: JSON.stringify({
            title: editItem.title.trim(),
            categoryName: editItem.categoryName || 'GENERAL',
            laboratoryTestName: editItem.laboratoryTestName || 'GENERAL',
            interpretation: editItem.interpretation.trim(),
            active: true
          })
        });
      }
      setEditItem(null);
      await fetchInterpretations();
      if (onRefresh) onRefresh();
    } catch (err) {
      setFormError(err?.message || 'Failed to save interpretation.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this interpretation from the library?')) return;
    try {
      await api(`/clinical-interpretations/${id}`, { token, method: 'DELETE' });
      await fetchInterpretations();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err?.message || 'Failed to delete interpretation.');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await api(`/clinical-interpretations/${item._id}`, {
        token,
        method: 'PUT',
        body: JSON.stringify({ active: !item.active })
      });
      await fetchInterpretations();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err?.message || 'Failed to update status.');
    }
  };

  const [resetting, setResetting] = useState(false);

  const handleResetToApproved = async () => {
    if (!window.confirm('Restore master library strictly to the 15 clean clinical interpretations derived from the supplied document? Any custom additions will be cleared and reset to authentic defaults.')) return;
    setResetting(true);
    try {
      await api('/clinical-interpretations/admin/reset', { token, method: 'POST' });
      await fetchInterpretations();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err?.message || 'Failed to restore source library.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div
      className="etu-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9600,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="etu-modal-content"
        style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--card-border, #e2e8f0)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--card-border, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #075c91 0%, #0369a1 100%)',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>📚</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                Clinical Interpretation Library Management
              </h3>
              <small style={{ opacity: 0.9, fontSize: '0.78rem' }}>
                Predefined professional clinical explanations for Sample Collectors & Admins
              </small>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleResetToApproved}
              disabled={resetting}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Reset master library to the 15 clean source document interpretations"
            >
              🔄 {resetting ? 'Restoring…' : 'Restore Source Library'}
            </button>
            <button
              type="button"
              onClick={() => setEditItem({ title: '', categoryName: 'CLINICAL CHEMISTRY', laboratoryTestName: '', interpretation: '', active: true })}
              style={{
                background: '#ffffff',
                color: '#075c91',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              ＋ Add New
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', borderRadius: '6px', padding: '0 8px' }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ padding: '14px 24px', background: 'var(--color-surface-container, #f8fafc)', borderBottom: '1px solid var(--card-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search title, test name, keyword (e.g. kidney, CBC, liver, cholesterol)..."
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid var(--card-border, #cbd5e1)',
                background: 'var(--card-bg, #ffffff)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            />
            <select
              value={selectedCat}
              onChange={e => setSelectedCat(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid var(--card-border, #cbd5e1)',
                background: 'var(--card-bg, #ffffff)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.88rem',
                fontWeight: 600
              }}
            >
              {CLINICAL_INTERPRETATION_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Body */}
        <div style={{ padding: '18px 24px', flex: 1, overflowY: 'auto' }}>
          {editItem ? (
            /* Form view */
            <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary, #075c91)' }}>
                  {editItem._id ? '✏ Edit Clinical Interpretation' : '＋ New Clinical Interpretation Template'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  ← Back to list
                </button>
              </div>

              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '10px 14px', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
                  ⚠ {formError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <label>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Category</span>
                  <select
                    value={editItem.categoryName || 'CLINICAL CHEMISTRY'}
                    onChange={e => setEditItem({ ...editItem, categoryName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid var(--card-border, #cbd5e1)', background: 'var(--card-bg, #fff)' }}
                  >
                    {CLINICAL_INTERPRETATION_CATEGORIES.filter(c => c !== 'ALL').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Associated Test Name</span>
                  <input
                    type="text"
                    value={editItem.laboratoryTestName || ''}
                    placeholder="e.g. CBC, Liver Function Test, Lipid Profile"
                    onChange={e => setEditItem({ ...editItem, laboratoryTestName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid var(--card-border, #cbd5e1)', background: 'var(--card-bg, #fff)', boxSizing: 'border-box' }}
                  />
                </label>
              </div>

              <label>
                <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Interpretation Title <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <input
                  type="text"
                  required
                  value={editItem.title || ''}
                  placeholder="e.g. Complete Blood Count (CBC) — Bone Marrow & Cellular Function"
                  onChange={e => setEditItem({ ...editItem, title: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid var(--card-border, #cbd5e1)', background: 'var(--card-bg, #fff)', boxSizing: 'border-box' }}
                />
              </label>

              <label>
                <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Clinical Explanatory / Interpretation Text <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <textarea
                  required
                  rows={8}
                  value={editItem.interpretation || ''}
                  placeholder="Enter reusable clinical interpretation text (no specific patient values)..."
                  onChange={e => setEditItem({ ...editItem, interpretation: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--card-border, #cbd5e1)', background: 'var(--card-bg, #fff)', fontSize: '0.88rem', lineHeight: 1.5, boxSizing: 'border-box' }}
                />
              </label>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  disabled={saving}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1.5px solid var(--card-border, #cbd5e1)', background: 'var(--card-bg, #fff)', cursor: 'pointer', fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: '#075c91', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  {saving ? '⏳ Saving…' : '✓ Save Template'}
                </button>
              </div>
            </form>
          ) : (
            /* Table / List view */
            <div>
              {loading ? (
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #64748b)' }}>
                  ⏳ Loading clinical interpretation library…
                </p>
              ) : error ? (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px', borderRadius: '8px', color: '#b91c1c' }}>
                  ⚠ {error}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #64748b)' }}>
                  No interpretations found matching the current filters.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filtered.map(item => (
                    <div
                      key={item._id}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '12px',
                        background: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--card-border, #e2e8f0)',
                        boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        opacity: item.active ? 1 : 0.65
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              textTransform: 'uppercase'
                            }}>
                              {item.categoryName || 'GENERAL'}
                            </span>
                            {item.laboratoryTestName && (
                              <span style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px'
                              }}>
                                {item.laboratoryTestName}
                              </span>
                            )}
                            {!item.active && (
                              <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                                Disabled
                              </span>
                            )}
                          </div>
                          <strong style={{ fontSize: '0.94rem', color: 'var(--text-primary, #0f172a)' }}>
                            {item.title}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--card-border, #cbd5e1)',
                              background: item.active ? '#f8fafc' : '#dcfce7',
                              color: item.active ? '#475569' : '#15803d',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {item.active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditItem(item)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: '1px solid #075c91',
                              background: '#075c91',
                              color: '#fff',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item._id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #fca5a5',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: '0.84rem',
                        color: 'var(--text-secondary, #334155)',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-line'
                      }}>
                        {item.interpretation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--card-border, #e2e8f0)',
          background: 'var(--color-surface-container, #f8fafc)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
            Showing {filtered.length} of {list.length} clinical interpretations
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1.5px solid var(--card-border, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
