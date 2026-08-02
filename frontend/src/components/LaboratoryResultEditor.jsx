import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FlagBadge, calculateFlag } from '../utils/flagHelper.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { MAIN_CATEGORY_ORDER, CATEGORY_MAP_ALIASES, normalizeCategoryName } from '../utils/categoryHelper.js';

const CATEGORY_META = {
  'HEMATOLOGY': { icon: '🩸', themeClass: 'cat-theme-hematology', bgGradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
  'CLINICAL CHEMISTRY': { icon: '🧪', themeClass: 'cat-theme-chemistry', bgGradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' },
  'CHEMISTRY': { icon: '🧪', themeClass: 'cat-theme-chemistry', bgGradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' },
  'URINALYSIS': { icon: '🟡', themeClass: 'cat-theme-urinalysis', bgGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' },
  'URINE ANALYSIS': { icon: '🟡', themeClass: 'cat-theme-urinalysis', bgGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' },
  'URINE AND BODY FLUID ANALYSIS': { icon: '🟡', themeClass: 'cat-theme-urinalysis', bgGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' },
  'STOOL EXAMINATION': { icon: '💩', themeClass: 'cat-theme-parasitology', bgGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' },
  'STOOL': { icon: '💩', themeClass: 'cat-theme-parasitology', bgGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' },
  'PARASITOLOGY': { icon: '🔬', themeClass: 'cat-theme-parasitology', bgGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' },
  'MICROBIOLOGY': { icon: '🧫', themeClass: 'cat-theme-microbiology', bgGradient: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)' },
  'SEROLOGY AND IMMUNOHEMATOLOGY': { icon: '🧬', themeClass: 'cat-theme-serology', bgGradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' },
  'SEROLOGY & IMMUNOHEMATOLOGY': { icon: '🧬', themeClass: 'cat-theme-serology', bgGradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' },
  'SEROLOGY': { icon: '🧬', themeClass: 'cat-theme-serology', bgGradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' },
  'IMMUNOHEMATOLOGY': { icon: '🩸', themeClass: 'cat-theme-coagulation', bgGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' },
  'HORMONE': { icon: '🏥', themeClass: 'cat-theme-hormone', bgGradient: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' },
  'HORMONES': { icon: '🏥', themeClass: 'cat-theme-hormone', bgGradient: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' },
  'HORMONAL TESTS': { icon: '🏥', themeClass: 'cat-theme-hormone', bgGradient: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' },
  'COAGULATION': { icon: '🩸', themeClass: 'cat-theme-coagulation', bgGradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' },
  'REFERRAL': { icon: '🩺', themeClass: 'cat-theme-referral', bgGradient: 'linear-gradient(135deg, #6b7280 0%, #374151 100%)' },
  'SEMEN': { icon: '🔬', themeClass: 'cat-theme-microbiology', bgGradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' },
  'OTHER': { icon: '📦', themeClass: 'cat-theme-other', bgGradient: 'linear-gradient(135deg, #475569 0%, #334155 100%)' }
};

function getCategoryMeta(catName) {
  const norm = normalizeCategoryName(catName);
  if (CATEGORY_META[norm]) return CATEGORY_META[norm];
  for (const [key, meta] of Object.entries(CATEGORY_META)) {
    if (norm === key || norm.startsWith(key) || key.startsWith(norm)) return meta;
  }
  return CATEGORY_META['OTHER'];
}

const RESULT_TYPES = [
  'Text', 'Numeric', 'Qualitative', 'Percentage', 'Positive/Negative',
  'Normal/Abnormal', 'Reactive/Non-Reactive', 'Time', 'Date'
];

const emptyParamForm = { parameterName: '', resultType: 'Text', unit: '', referenceValue: '', normalMin: '', normalMax: '', description: '', notes: '' };

/* ─── Add Parameter Modal ─────────────────────────────────────────────────── */
function AddParameterModal({ catName, subcatName, token, onClose, onSuccess }) {
  const [form, setForm] = useState(emptyParamForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.parameterName.trim()) { setError('Parameter Name is required.'); return; }
    setError('');
    setBusy(true);
    try {
      const refVal = form.referenceValue.trim() ||
        (form.normalMin !== '' && form.normalMax !== '' ? `${form.normalMin} – ${form.normalMax}` :
         form.normalMin !== '' ? `≥ ${form.normalMin}` :
         form.normalMax !== '' ? `≤ ${form.normalMax}` : '');

      const res = await api('/report-entry/parameters', {
        token,
        method: 'POST',
        body: JSON.stringify({
          parameterName: form.parameterName.trim(),
          category: catName,
          subcategory: subcatName || '',
          unit: form.unit.trim(),
          referenceValue: refVal,
          normalMin: form.normalMin !== '' ? Number(form.normalMin) : null,
          normalMax: form.normalMax !== '' ? Number(form.normalMax) : null,
          resultType: form.resultType
        })
      });

      if (res?.parameter) {
        onSuccess(res.parameter);
      }
    } catch (err) {
      const msg = err?.message || 'Failed to save parameter.';
      if (msg.includes('already exists') || msg.includes('409')) {
        setError('Parameter already exists in this category.');
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="etu-modal-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="etu-modal-content"
        style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--card-border, #e2e8f0)' }}
      >
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--card-border, #e2e8f0)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #64748b)' }}>
              {subcatName ? `${catName} › ${subcatName}` : catName}
            </p>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>＋ Add New Parameter</h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted, #64748b)', lineHeight: 1, padding: '2px 6px', borderRadius: '6px' }} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#b91c1c', fontSize: '0.875rem', fontWeight: 600 }}>
              ⚠ {error}
            </div>
          )}

          <label style={{ display: 'block', marginBottom: '14px' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-primary, #0f172a)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Parameter Name <span style={{ color: '#ef4444' }}>*</span>
            </span>
            <input
              type="text"
              value={form.parameterName}
              onChange={e => set('parameterName', e.target.value)}
              placeholder="e.g. GLUCOSE, Hemoglobin"
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--card-border, #e2e8f0)', background: 'var(--input-bg, #f8fafc)', color: 'var(--text-primary, #0f172a)', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: '14px' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-primary, #0f172a)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Result Type</span>
            <select
              value={form.resultType}
              onChange={e => set('resultType', e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--card-border, #e2e8f0)', background: 'var(--input-bg, #f8fafc)', color: 'var(--text-primary, #0f172a)', fontSize: '0.9rem', boxSizing: 'border-box' }}
            >
              {RESULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label style={{ display: 'block', marginBottom: '14px' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-primary, #0f172a)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Unit / SI Unit</span>
            <input
              type="text"
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              placeholder="e.g. mg/dL, g/L, %, mmol/L"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--card-border, #e2e8f0)', background: 'var(--input-bg, #f8fafc)', color: 'var(--text-primary, #0f172a)', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </label>

          <div style={{ marginBottom: '14px' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-primary, #0f172a)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Reference Range</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <input
                type="number"
                step="any"
                value={form.normalMin}
                onChange={e => set('normalMin', e.target.value)}
                placeholder="Low (min)"
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--card-border, #e2e8f0)', background: 'var(--input-bg, #f8fafc)', color: 'var(--text-primary, #0f172a)', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box' }}
              />
              <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 700, textAlign: 'center' }}>—</span>
              <input
                type="number"
                step="any"
                value={form.normalMax}
                onChange={e => set('normalMax', e.target.value)}
                placeholder="High (max)"
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--card-border, #e2e8f0)', background: 'var(--input-bg, #f8fafc)', color: 'var(--text-primary, #0f172a)', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <input
              type="text"
              value={form.referenceValue}
              onChange={e => set('referenceValue', e.target.value)}
              placeholder="Or qualitative value: NEGATIVE, NORMAL, < 5.0 mmol/L"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--card-border, #e2e8f0)', background: 'var(--input-bg, #f8fafc)', color: 'var(--text-primary, #0f172a)', fontSize: '0.88rem', boxSizing: 'border-box' }}
            />
            <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.76rem' }}>Enter numeric Low/High OR a qualitative reference text above.</small>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button type="button" onClick={onClose} disabled={busy} style={{ padding: '10px 20px', borderRadius: '8px', border: '1.5px solid var(--card-border, #e2e8f0)', background: 'var(--card-bg, #ffffff)', color: 'var(--text-primary, #0f172a)', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={busy} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: busy ? '#94a3b8' : '#075c91', color: '#ffffff', fontSize: '0.88rem', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {busy ? '⏳ Saving…' : '✓ Save Parameter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Interpretation Selection Modal (Test-Specific) ─────────────────────── */
function InterpretationSelectionModal({ testName, testId, token, selectedList = [], onSelect, onClose }) {
  const [list, setList] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (testName) q.set('testName', testName);
    if (testId) q.set('testId', testId);

    api(`/clinical-interpretations?${q.toString()}`, { token })
      .then(res => setList(Array.isArray(res?.interpretations) ? res.interpretations : []))
      .catch(err => setError(err.message || 'Failed to load interpretations.'))
      .finally(() => setLoading(false));
  }, [testName, testId, token]);

  const filtered = useMemo(() => {
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(item =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.interpretation || '').toLowerCase().includes(q) ||
      (item.laboratoryTestName || '').toLowerCase().includes(q)
    );
  }, [list, query]);

  const isSelected = (item) => {
    return selectedList.some(s => s.interpretationId === String(item._id) || s.title === item.title);
  };

  return (
    <div
      className="etu-modal-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="etu-modal-content"
        style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', width: '100%', maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--card-border, #e2e8f0)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--card-border, #e2e8f0)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary, #075c91)' }}>
              Clinical Interpretations
            </p>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
              For: <span style={{ color: '#075c91' }}>{testName}</span>
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted, #64748b)', lineHeight: 1, padding: '2px 6px', borderRadius: '6px' }} aria-label="Close">×</button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '14px 24px', background: 'var(--color-surface-container, #f8fafc)', borderBottom: '1px solid var(--card-border, #e2e8f0)' }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="🔍 Search interpretations..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--card-border, #cbd5e1)', background: 'var(--card-bg, #ffffff)', color: 'var(--text-primary, #0f172a)', fontSize: '0.88rem', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        {/* Body List */}
        <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted, #64748b)' }}>⏳ Loading preloaded interpretations…</p>
          ) : error ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px', borderRadius: '8px', color: '#b91c1c', fontSize: '0.88rem' }}>⚠ {error}</div>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted, #64748b)' }}>
              No interpretations found matching "{query}".
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map(item => {
                const chosen = isSelected(item);
                return (
                  <div
                    key={item._id || item.title}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: chosen ? 'var(--color-surface-dim, #f1f5f9)' : 'var(--card-bg, #ffffff)',
                      border: chosen ? '1.5px solid #075c91' : '1px solid var(--card-border, #e2e8f0)',
                      boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary, #0f172a)' }}>{item.title}</strong>
                      <button
                        type="button"
                        disabled={chosen}
                        onClick={() => onSelect(item)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          border: 'none',
                          background: chosen ? '#cbd5e1' : '#075c91',
                          color: chosen ? '#475569' : '#ffffff',
                          cursor: chosen ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {chosen ? '✓ Selected' : '＋ Add'}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary, #334155)', lineHeight: 1.5 }}>
                      {item.interpretation}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--card-border, #e2e8f0)', background: 'var(--color-surface-container, #f8fafc)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid var(--card-border, #cbd5e1)', background: 'var(--card-bg, #ffffff)', color: 'var(--text-primary, #0f172a)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Test Clinical Interpretation Container ────────────────────────────── */
function TestClinicalInterpretationSection({ testName, testInterpretations = [], onAddClick, onRemove }) {
  const currentTestEntry = testInterpretations.find(t => t.testName?.toUpperCase() === testName.toUpperCase());
  const selectedList = currentTestEntry?.interpretations || [];

  return (
    <div style={{ margin: '16px 16px 16px 16px', padding: '16px', background: 'var(--color-surface-container, #f8fafc)', border: '1px solid var(--card-border, #e2e8f0)', borderRadius: '12px', borderLeft: '4px solid var(--color-primary, #075c91)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary, #075c91)', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🩺</span> Clinical Interpretation
          </h4>
          <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.78rem' }}>
            Test-specific interpretations mapped to {testName}
          </small>
        </div>
        <button
          type="button"
          onClick={onAddClick}
          style={{ background: '#075c91', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(7,92,145,0.25)' }}
        >
          ＋ Add Interpretation
        </button>
      </div>

      {selectedList.length === 0 ? (
        <div style={{ padding: '14px', textAlign: 'center', background: 'var(--card-bg, #ffffff)', border: '1px dashed var(--card-border, #cbd5e1)', borderRadius: '8px', color: 'var(--text-muted, #64748b)', fontSize: '0.85rem' }}>
          No clinical interpretation selected. Click "＋ Add Interpretation" to select preloaded professional interpretations for this test.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {selectedList.map((item, idx) => (
            <div
              key={item.interpretationId || item.title || idx}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--card-border, #cbd5e1)',
                boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <div>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary, #0f172a)', marginBottom: '4px' }}>
                  {item.title}
                </strong>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary, #334155)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                  {item.interpretation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item)}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px', lineHeight: 1, borderRadius: '4px' }}
                title="Remove from this report"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────────── */
export default function LaboratoryResultEditor({
  patient,
  catalog = [],
  labTestCatalog = [],
  reportData,
  onChange,
  onSaveDraft,
  onGeneratePreview,
  onSubmitApproval,
  busy,
  isSavingDraft,
  isGeneratingPreview,
  isSubmitting,
  equipmentData = { equipment: [], equipmentDetails: {} },
  onPickEquipment,
  otherOpen,
  setOtherOpen,
  otherEquipmentForm,
  onCatalogRefresh
}) {
  const { token } = useAuth();
  const [entryMode, setEntryMode] = useState('result');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [activeSubcatsMap, setActiveSubcatsMap] = useState({});
  const [addParamModal, setAddParamModal] = useState(null); // { catName, subcatName }
  const [interpModalTest, setInterpModalTest] = useState(null); // testName string or null
  const [addParamToast, setAddParamToast] = useState('');
  const inputsRef = useRef([]);

  const [userInteractedCats, setUserInteractedCats] = useState(false);
  const [showUnrequestedMap, setShowUnrequestedMap] = useState({});

  useEffect(() => {
    setUserInteractedCats(false);
  }, [patient?._id]);

  // Unified master catalog merging parameter catalog and receptionist laboratory test catalog
  const effectiveCatalog = useMemo(() => {
    const combined = [];
    const seenKeys = new Set();

    const addParam = (item) => {
      if (!item || !item.parameterName) return;
      const catNorm = normalizeCategoryName(item.category);
      const key = `${catNorm}::${(item.parameterName || '').toUpperCase().trim()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        combined.push({
          ...item,
          category: catNorm
        });
      }
    };

    if (Array.isArray(catalog)) {
      catalog.forEach(addParam);
    }

    if (Array.isArray(labTestCatalog)) {
      labTestCatalog.forEach(catObj => {
        const catName = typeof catObj === 'string' ? catObj : (catObj?.name || '');
        const tests = Array.isArray(catObj?.tests) ? catObj.tests : [];
        tests.forEach(t => {
          const tName = typeof t === 'string' ? t : (t?.name || '');
          if (tName) {
            addParam({
              _id: t._id || tName,
              parameterName: tName,
              category: catName || 'OTHER',
              subcategory: t.subcategory || '',
              unit: t.unit || '',
              referenceValue: t.referenceValue || '—',
              normalMin: t.normalMin ?? null,
              normalMax: t.normalMax ?? null,
              status: 'Active'
            });
          }
        });
      });
    }

    return combined;
  }, [catalog, labTestCatalog]);

  // Map patient's receptionist-selected tests & categories with precision
  const requestedInfo = useMemo(() => {
    const selectedTestIds = [];
    const selectedTestNames = [];
    const selectedTestCategories = [];

    const names = new Set();
    const categories = new Set();

    if (!patient) {
      return { selectedTestIds, selectedTestNames, selectedTestCategories, names, categories };
    }

    const addTestItem = (t) => {
      if (!t) return;
      if (typeof t === 'string' && t.trim()) {
        const u = t.trim().toUpperCase();
        selectedTestNames.push(u);
        names.add(u);
      } else if (typeof t === 'object') {
        const tid = String(t._id || t.id || '');
        if (tid) selectedTestIds.push(tid);

        const nameVal = t.name || t.parameterName || t.sampleName;
        if (nameVal && typeof nameVal === 'string') {
          const u = nameVal.trim().toUpperCase();
          selectedTestNames.push(u);
          names.add(u);
        }
        const catVal = (typeof t.category === 'object' && t.category?.name)
          ? t.category.name
          : (typeof t.category === 'string' ? t.category : '');
        if (catVal && typeof catVal === 'string') {
          const normCat = normalizeCategoryName(catVal);
          selectedTestCategories.push(normCat);
          categories.add(normCat);
        }
      }
    };

    // Strictly check laboratoryTests and requestedTests (DO NOT include sampleTypes container names)
    if (Array.isArray(patient.laboratoryTests)) {
      patient.laboratoryTests.forEach(addTestItem);
    }
    if (Array.isArray(patient.requestedTests)) {
      patient.requestedTests.forEach(addTestItem);
    }
    if (patient.registrationType === 'Referral') {
      categories.add('REFERRAL');
    }

    // Match catalog parameters against receptionist-selected test names strictly
    if (names.size > 0 && Array.isArray(effectiveCatalog)) {
      effectiveCatalog.forEach(param => {
        const pName = (param.parameterName || '').trim().toUpperCase();
        const pSub = (param.subcategory || '').trim().toUpperCase();
        const pCat = (param.category || '').trim().toUpperCase();
        const pId = String(param._id || '');
        const normCat = normalizeCategoryName(pCat);
        const pAliases = Array.isArray(param.aliases) ? param.aliases.map(a => String(a).trim().toUpperCase()) : [];

        names.forEach(nUpper => {
          if (
            (pId && selectedTestIds.includes(pId)) ||
            pName === nUpper ||
            pSub === nUpper ||
            pAliases.includes(nUpper) ||
            (nUpper.length > 2 && pName.includes(`(${nUpper})`)) ||
            (nUpper.length > 2 && (pName.startsWith(`${nUpper} `) || pName.endsWith(` ${nUpper}`)))
          ) {
            if (normCat) categories.add(normCat);
            if (pName) names.add(pName);
          }
        });
      });
    }

    // Console Debug Logging as required by prompt
    console.log('=== LIMS RESULT EDITOR DEBUG ===');
    console.log('Receptionist selected laboratory test IDs:', selectedTestIds);
    console.log('Main category of each selected test:', selectedTestCategories);
    console.log('Selected test names:', selectedTestNames);
    console.log('Categories marked as Requested:', Array.from(categories));

    return { selectedTestIds, selectedTestNames, selectedTestCategories, names, categories };
  }, [patient, effectiveCatalog]);

  // Group ALL catalog parameters by category — ALWAYS INCLUDE ALL CATEGORIES
  const categoriesGrouped = useMemo(() => {
    const map = new Map();

    // 1. Initialize map with all 13 main categories
    MAIN_CATEGORY_ORDER.forEach(cat => {
      map.set(cat, []);
    });

    if (!effectiveCatalog || !Array.isArray(effectiveCatalog)) return map;

    // 2. Map all catalog parameters into their category strictly
    effectiveCatalog.forEach(p => {
      const key = normalizeCategoryName(p.category);

      if (!map.has(key)) map.set(key, []);
      const existing = map.get(key);
      if (!existing.some(x => (x.parameterName || '').toUpperCase() === (p.parameterName || '').toUpperCase())) {
        existing.push(p);
      }
    });

    // 3. Merge patient's requested referral tests into REFERRAL category if missing
    if (patient && Array.isArray(patient.laboratoryTests)) {
      patient.laboratoryTests.forEach(t => {
        const tName = typeof t === 'string' ? t : (t?.name || '');
        const tCat = (typeof t === 'object' && t?.category?.name) ? t.category.name : (typeof t?.category === 'string' ? t.category : '');
        const isRefTest = /referral/i.test(tCat) || (patient.registrationType === 'Referral');
        if (tName && isRefTest) {
          if (!map.has('REFERRAL')) map.set('REFERRAL', []);
          const refParams = map.get('REFERRAL');
          if (!refParams.some(p => (p.parameterName || '').toUpperCase() === tName.toUpperCase())) {
            refParams.push({
              _id: t._id || tName,
              parameterName: tName,
              category: 'REFERRAL',
              subcategory: '',
              unit: '',
              referenceValue: '—',
              status: 'Active'
            });
          }
        }
      });
    }

    return map;
  }, [effectiveCatalog, patient]);

  const categoryList = useMemo(() => {
    const list = Array.from(categoriesGrouped.keys());
    list.sort((a, b) => {
      const normA = normalizeCategoryName(a);
      const normB = normalizeCategoryName(b);
      const idxA = MAIN_CATEGORY_ORDER.indexOf(normA);
      const idxB = MAIN_CATEGORY_ORDER.indexOf(normB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return list;
  }, [categoriesGrouped]);

  // Auto-select ONLY categories with requested tests on initial load or patient change
  useEffect(() => {
    if (categoryList.length > 0 && patient?._id && !userInteractedCats) {
      const enteredNames = new Set(
        (reportData?.results || [])
          .map(r => (r.sampleName || '').trim().toUpperCase())
          .filter(Boolean)
      );

      const reqCats = categoryList.filter(catName => {
        const paramsInCat = categoriesGrouped.get(catName) || [];
        const hasReqParam = paramsInCat.some(p => {
          const pName = (p.parameterName || '').trim().toUpperCase();
          const pSub = (p.subcategory || '').trim().toUpperCase();
          return (pName && requestedInfo.names.has(pName)) ||
            (pSub && requestedInfo.names.has(pSub)) ||
            enteredNames.has(pName);
        });
        const hasReqCat = Array.from(requestedInfo.categories).some(rc =>
          catName.toUpperCase() === rc || catName.toUpperCase().includes(rc) || rc.includes(catName.toUpperCase())
        );
        return hasReqParam && (hasReqCat || requestedInfo.categories.size === 0);
      });
      setSelectedCategories(reqCats);
    }
  }, [patient?._id, categoryList, categoriesGrouped, requestedInfo, userInteractedCats, reportData?.results]);

  const toggleCategory = (catName) => {
    setUserInteractedCats(true);
    setSelectedCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  // Handle result changes
  const handleResultChange = (paramName, field, value, defaultUnit = '', defaultRef = '', catName = '', subcatName = '') => {
    const results = Array.isArray(reportData?.results) ? [...reportData.results] : [];
    const index = results.findIndex(r => r.sampleName === paramName);

    if (index >= 0) {
      const updated = { ...results[index], [field]: value };
      if (catName) updated.category = catName;
      if (subcatName) updated.subcategory = subcatName;
      if (field === 'result') {
        updated.flag = calculateFlag(value, updated.referenceValue || defaultRef, patient?.sex);
      }
      results[index] = updated;
    } else {
      const newItem = {
        sampleName: paramName,
        result: field === 'result' ? value : '',
        unit: field === 'unit' ? value : defaultUnit,
        referenceValue: field === 'referenceValue' ? value : defaultRef,
        remarks: field === 'remarks' ? value : '',
        flag: field === 'result' ? calculateFlag(value, defaultRef, patient?.sex) : '',
        category: catName,
        subcategory: subcatName
      };
      results.push(newItem);
    }
    onChange({ ...reportData, results });
  };

  // Helper to remove row (equipment mode)
  const handleRemoveRow = (index) => {
    const results = Array.isArray(reportData?.results) ? [...reportData.results] : [];
    results.splice(index, 1);
    onChange({ ...reportData, results });
  };

  // Helper to add blank row (equipment mode)
  const handleAddCustomRow = () => {
    const results = Array.isArray(reportData?.results) ? [...reportData.results] : [];
    results.push({ sampleName: '', result: '', unit: '', referenceValue: '', remarks: '', flag: '' });
    onChange({ ...reportData, results });
  };

  // Quick lookup helper for result item
  const getResultItem = (paramName, defaultUnit = '', defaultRef = '') => {
    const item = (reportData?.results || []).find(r => r.sampleName === paramName);
    return {
      result: item?.result || '',
      unit: item?.unit || defaultUnit,
      referenceValue: item?.referenceValue || defaultRef,
      flag: item?.flag || (item?.result ? calculateFlag(item.result, item?.referenceValue || defaultRef, patient?.sex) : ''),
      remarks: item?.remarks || ''
    };
  };

  // Keyboard navigation
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = inputsRef.current[index + 1];
      if (next) next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = inputsRef.current[index - 1];
      if (prev) prev.focus();
    }
  };

  // Test Interpretation Handlers
  const testInterpretations = Array.isArray(reportData?.testInterpretations) ? reportData.testInterpretations : [];

  const handleSelectInterpretation = (testName, interpItem) => {
    const list = [...testInterpretations];
    let testEntry = list.find(t => t.testName?.toUpperCase() === testName.toUpperCase());

    if (!testEntry) {
      testEntry = { testName, interpretations: [] };
      list.push(testEntry);
    }

    const currentInterps = Array.isArray(testEntry.interpretations) ? [...testEntry.interpretations] : [];
    const exists = currentInterps.some(i => i.interpretationId === String(interpItem._id) || i.title === interpItem.title);

    if (!exists) {
      currentInterps.push({
        interpretationId: String(interpItem._id || ''),
        title: interpItem.title,
        interpretation: interpItem.interpretation
      });
      testEntry.interpretations = currentInterps;
      onChange({ ...reportData, testInterpretations: list });
    }
  };

  const handleRemoveInterpretation = (testName, interpItem) => {
    const list = testInterpretations.map(t => {
      if (t.testName?.toUpperCase() === testName.toUpperCase()) {
        return {
          ...t,
          interpretations: (t.interpretations || []).filter(i =>
            i.interpretationId !== interpItem.interpretationId && i.title !== interpItem.title
          )
        };
      }
      return t;
    });
    onChange({ ...reportData, testInterpretations: list });
  };

  // Handle Add Parameter modal success
  const handleParamSaved = useCallback((newParam) => {
    setAddParamModal(null);
    setAddParamToast(`✅ "${newParam.parameterName}" added successfully.`);
    setTimeout(() => setAddParamToast(''), 4000);
    if (typeof onCatalogRefresh === 'function') onCatalogRefresh();
  }, [onCatalogRefresh]);

  let inputCounter = 0;

  return (
    <div className="lims-result-entry-system" style={{ marginTop: '16px' }}>

      {/* SUCCESS TOAST */}
      {addParamToast && (
        <div style={{ position: 'fixed', bottom: '80px', right: '24px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', borderRadius: '10px', background: '#10b981', color: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', fontWeight: 600, fontSize: '0.88rem', maxWidth: '420px' }}>
          {addParamToast}
          <button type="button" onClick={() => setAddParamToast('')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
      )}

      {/* ADD PARAMETER MODAL */}
      {addParamModal && (
        <AddParameterModal
          catName={addParamModal.catName}
          subcatName={addParamModal.subcatName}
          token={token}
          onClose={() => setAddParamModal(null)}
          onSuccess={handleParamSaved}
        />
      )}

      {/* INTERPRETATION SELECTION MODAL (TEST-SPECIFIC) */}
      {interpModalTest && (
        <InterpretationSelectionModal
          testName={interpModalTest}
          token={token}
          selectedList={(testInterpretations.find(t => t.testName?.toUpperCase() === interpModalTest.toUpperCase())?.interpretations) || []}
          onSelect={(item) => handleSelectInterpretation(interpModalTest, item)}
          onClose={() => setInterpModalTest(null)}
        />
      )}

      {/* RESULT ENTRY MODE TOGGLE BAR */}
      <div className="mode-toggle-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'var(--card-bg, #ffffff)', padding: '12px 18px', borderRadius: '14px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--card-border, #e2e8f0)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary, #0f172a)' }}>Result Entry Mode:</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>({selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} active)</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--color-surface-dim, #f1f5f9)', padding: '4px', borderRadius: '10px' }}>
          <button type="button" className={entryMode === 'result' ? 'primary' : 'secondary'} onClick={() => setEntryMode('result')} style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', border: 'none' }}>
            🧪 Multi-Category Result Mode (Default)
          </button>
          <button type="button" className={entryMode === 'equipment' ? 'primary' : 'secondary'} onClick={() => setEntryMode('equipment')} style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', border: 'none' }}>
            ⚙ Equipment Mode (Optional)
          </button>
        </div>
      </div>

      {/* MODE 2: EQUIPMENT MODE */}
      {entryMode === 'equipment' && (
        <div className="equipment-mode-section">
          <div className="equipment-heading">
            <div><p className="eyebrow">Analyzer selection</p><h3>Equipment used</h3></div>
            <span>{reportData.equipment?.length || 0} selected</span>
          </div>
          <div className="equipment-card-grid" style={{ marginBottom: '20px' }}>
            {(equipmentData.equipment || []).map(name => {
              const detail = equipmentData.equipmentDetails?.[name] || {};
              const isChosen = (reportData.equipment || []).includes(name);
              return (
                <button type="button" key={name} className={`equipment-card ${isChosen ? 'chosen' : ''}`} onClick={() => onPickEquipment(name)}>
                  <i>{detail.icon || '🧪'}</i>
                  <span><strong>{name}</strong><small>{detail.type}</small><em>{detail.manufacturer} · {detail.automation}</em></span>
                  <b>{detail.parameterCount || 0} parameters</b>
                </button>
              );
            })}
            <button type="button" className="equipment-card other" onClick={() => setOtherOpen(true)}>
              <i>＋</i>
              <span><strong>Other Equipment</strong><small>Register a custom analyzer</small><em>Unlimited custom parameters</em></span>
            </button>
          </div>
          {otherOpen && otherEquipmentForm}
          <div className="result-editor-head" style={{ marginTop: '24px' }}>
            <div><h3>Equipment Parameters</h3><p>Parameters populated by selected laboratory equipment analyzer.</p></div>
            <button type="button" className="secondary" onClick={handleAddCustomRow}>＋ Add Parameter</button>
          </div>
          <div className="professional-results" style={{ marginBottom: '24px' }}>
            {Array.isArray(reportData.results) && reportData.results.length > 0 ? (
              reportData.results.map((row, i) => {
                const flag = row.flag || calculateFlag(row.result, row.referenceValue);
                const currentIndex = inputCounter++;
                return (
                  <article className="parameter-row" key={i}>
                    <label>Parameter<input value={row.sampleName || ''} onChange={e => { const results = [...reportData.results]; results[i] = { ...results[i], sampleName: e.target.value }; onChange({ ...reportData, results }); }} /></label>
                    <label>Result<input ref={el => (inputsRef.current[currentIndex] = el)} value={row.result || ''} onKeyDown={e => handleKeyDown(e, currentIndex)} onChange={e => { const results = [...reportData.results]; const val = e.target.value; results[i] = { ...results[i], result: val, flag: calculateFlag(val, results[i].referenceValue) }; onChange({ ...reportData, results }); }} /></label>
                    <label>SI Unit<input value={row.unit || ''} onChange={e => { const results = [...reportData.results]; results[i] = { ...results[i], unit: e.target.value }; onChange({ ...reportData, results }); }} /></label>
                    <label>Reference Range<input value={row.referenceValue || ''} onChange={e => { const results = [...reportData.results]; results[i] = { ...results[i], referenceValue: e.target.value }; onChange({ ...reportData, results }); }} /></label>
                    <span className={`flag-badge ${flag || 'blank'}`}><FlagBadge flag={flag} result={row.result} referenceValue={row.referenceValue} /></span>
                    <button type="button" className="remove-parameter" onClick={() => handleRemoveRow(i)}>×</button>
                    <label className="parameter-remarks">Remarks<input value={row.remarks || ''} onChange={e => { const results = [...reportData.results]; results[i] = { ...results[i], remarks: e.target.value }; onChange({ ...reportData, results }); }} /></label>
                  </article>
                );
              })
            ) : (
              <p className="empty" style={{ padding: '20px', textAlign: 'center', background: 'var(--color-surface-dim, #f8fafc)', borderRadius: '8px', color: 'var(--text-muted, #64748b)' }}>
                Select an equipment analyzer above or click "＋ Add Parameter" to begin result entry.
              </p>
            )}
          </div>
        </div>
      )}

      {/* MODE 1: LABORATORY MULTI-CATEGORY RESULT MODE (Default) */}
      {entryMode === 'result' && (
        <div className="laboratory-result-mode-section">

          {/* CATEGORY SELECTION CARDS */}
          <div style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>
              🧪 SELECT INVESTIGATION CATEGORIES ({selectedCategories.length} SELECTED)
            </span>
          </div>

          <div className="lims-category-grid">
            {categoryList.map(catName => {
              const isSelected = selectedCategories.includes(catName);
              const meta = getCategoryMeta(catName);
              const paramsInCat = categoriesGrouped.get(catName) || [];
              const enteredNames = new Set(
                (reportData?.results || [])
                  .map(r => (r.sampleName || '').trim().toUpperCase())
                  .filter(Boolean)
              );
              const requestedParamsCount = paramsInCat.filter(p => {
                const pName = (p.parameterName || '').trim().toUpperCase();
                const pSub = (p.subcategory || '').trim().toUpperCase();
                return (pName && requestedInfo.names.has(pName)) ||
                  (pSub && requestedInfo.names.has(pSub)) ||
                  enteredNames.has(pName);
              }).length;
              const isRequested = requestedParamsCount > 0 ||
                Array.from(requestedInfo.categories).some(rc => catName.toUpperCase().includes(rc) || rc.includes(catName.toUpperCase()));

              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() => toggleCategory(catName)}
                  className={`lims-cat-card ${meta.themeClass} ${isSelected ? 'selected' : ''} ${isRequested ? 'is-requested' : ''}`}
                  style={isRequested ? { borderColor: '#10b981', boxShadow: '0 4px 14px rgba(16,185,129,0.22)' } : {}}
                >
                  <div className="lims-cat-card-header">
                    <div className="lims-cat-icon-title">
                      <span className="lims-cat-icon">{meta.icon}</span>
                      <span className="lims-cat-title">{catName}</span>
                    </div>
                    <span className="lims-cat-badge-select">{isSelected ? '✓' : '+'}</span>
                  </div>
                  <div className="lims-cat-card-footer">
                    <span>{paramsInCat.length} parameters</span>
                    {isRequested && (
                      <span className="lims-cat-req-badge" style={{ background: '#10b981', color: '#ffffff', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        ★ Requested {requestedParamsCount > 0 ? `(${requestedParamsCount})` : ''}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* RENDER RESULT SECTIONS FOR EVERY SELECTED CATEGORY */}
          {selectedCategories.length > 0 ? (
            selectedCategories.map(catName => {
              const meta = getCategoryMeta(catName);
              const rawParams = categoriesGrouped.get(catName) || [];
              const availableSubcats = Array.from(new Set(rawParams.map(p => p.subcategory).filter(Boolean)));
              const activeSubList = activeSubcatsMap[catName] || availableSubcats;

              const enteredNames = new Set(
                (reportData?.results || [])
                  .map(r => (r.sampleName || '').trim().toUpperCase())
                  .filter(Boolean)
              );

              const requestedParams = [];
              const otherParams = [];

              rawParams.forEach(p => {
                const pName = (p.parameterName || '').trim().toUpperCase();
                const pSub = (p.subcategory || '').trim().toUpperCase();
                const isReq = (pName && requestedInfo.names.has(pName)) ||
                  (pSub && requestedInfo.names.has(pSub)) ||
                  enteredNames.has(pName);
                if (isReq) {
                  requestedParams.push(p);
                } else {
                  otherParams.push(p);
                }
              });

              return (
                <div key={catName} className="lims-category-section-card">

                  {/* Category Header */}
                  <div className="lims-category-section-header" style={{ background: meta.bgGradient }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>{catName}</h3>
                        <small style={{ opacity: 0.9, fontSize: '0.78rem', color: '#ffffff' }}>
                          {requestedParams.length > 0 ? `★ ${requestedParams.length} requested · ` : ''}{rawParams.length} parameters available
                        </small>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Subcategory Toggles */}
                      {availableSubcats.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.2)', padding: '3px', borderRadius: '8px', flexWrap: 'wrap' }}>
                          {availableSubcats.map(subcat => {
                            const isSubActive = activeSubList.includes(subcat);
                            return (
                              <button key={subcat} type="button"
                                onClick={() => setActiveSubcatsMap(prev => {
                                  const current = prev[catName] || availableSubcats;
                                  const updated = current.includes(subcat)
                                    ? (current.length === 1 ? current : current.filter(s => s !== subcat))
                                    : [...current, subcat];
                                  return { ...prev, [catName]: updated };
                                })}
                                style={{ padding: '4px 10px', fontSize: '0.76rem', fontWeight: 700, borderRadius: '6px', background: isSubActive ? '#ffffff' : 'transparent', color: isSubActive ? '#0f172a' : '#ffffff', border: 'none', cursor: 'pointer' }}
                              >
                                {isSubActive ? '✓ ' : '+ '}{subcat}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Parameter button at MAIN CATEGORY level */}
                      <button
                        type="button"
                        onClick={() => setAddParamModal({ catName, subcatName: '' })}
                        style={{ background: 'rgba(255,255,255,0.25)', color: '#ffffff', border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: '8px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        ＋ Add Parameter
                      </button>
                    </div>
                  </div>

                  {/* 1. ★ REQUESTED TESTS SECTION (Displayed FIRST) */}
                  {requestedParams.length > 0 && (
                    <div style={{ margin: '16px 16px 0 16px', border: '2px solid #10b981', borderRadius: '12px', overflow: 'hidden', background: 'color-mix(in srgb, #10b981 4%, var(--card-bg, #ffffff))' }}>
                      <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ffffff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.1rem' }}>★</span>
                          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>REQUESTED TESTS</h4>
                          <span style={{ background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>✓ {requestedParams.length} Requested</span>
                        </div>
                      </div>

                      <div className="lims-table-container" style={{ overflowX: 'auto', padding: '12px' }}>
                        <table className="lims-param-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                          <thead>
                            <tr className="lims-param-thead-tr">
                              <th style={{ padding: '10px 12px', fontWeight: 700 }}>Parameter / Test</th>
                              <th style={{ padding: '10px 12px', fontWeight: 700, width: '160px' }}>Result</th>
                              <th style={{ padding: '10px 12px', fontWeight: 700, width: '110px' }}>SI Unit</th>
                              <th style={{ padding: '10px 12px', fontWeight: 700, width: '150px' }}>Reference Range</th>
                              <th style={{ padding: '10px 12px', fontWeight: 700, width: '90px', textAlign: 'center' }}>Flag</th>
                              <th style={{ padding: '10px 12px', fontWeight: 700, width: '180px' }}>Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {requestedParams.map(paramObj => {
                              const pName = paramObj.parameterName;
                              const rowData = getResultItem(pName, paramObj.unit, paramObj.referenceValue);
                              const currentIndex = inputCounter++;
                              return (
                                <tr key={pName} className="lims-param-row is-ordered" style={{ background: 'color-mix(in srgb, #10b981 8%, transparent)' }}>
                                  <td style={{ padding: '10px 12px' }}>
                                    <strong className="param-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary, #0f172a)' }}>
                                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>✅</span>
                                      {pName}
                                      <span className="param-req-badge" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>✓ Requested</span>
                                    </strong>
                                  </td>
                                  <td style={{ padding: '6px 12px' }}>
                                    <input ref={el => (inputsRef.current[currentIndex] = el)} type="text" className="lims-result-input" value={rowData.result} placeholder="Enter result" onKeyDown={e => handleKeyDown(e, currentIndex)} onChange={e => handleResultChange(pName, 'result', e.target.value, paramObj.unit, paramObj.referenceValue, catName, paramObj.subcategory || '')} style={{ border: rowData.flag === 'H' ? '2px solid #ef4444' : rowData.flag === 'L' ? '2px solid #eab308' : '1.5px solid #10b981', background: 'var(--card-bg, #ffffff)' }} />
                                  </td>
                                  <td style={{ padding: '6px 12px' }}><input type="text" className="lims-unit-input" value={rowData.unit} placeholder={paramObj.unit || '—'} onChange={e => handleResultChange(pName, 'unit', e.target.value, paramObj.unit, paramObj.referenceValue, catName, paramObj.subcategory || '')} /></td>
                                  <td style={{ padding: '6px 12px' }}><input type="text" className="lims-ref-input" value={rowData.referenceValue} placeholder={paramObj.referenceValue || '—'} onChange={e => handleResultChange(pName, 'referenceValue', e.target.value, paramObj.unit, paramObj.referenceValue, catName, paramObj.subcategory || '')} /></td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}><FlagBadge flag={rowData.flag} result={rowData.result} referenceValue={rowData.referenceValue} sex={patient?.sex} /></td>
                                  <td style={{ padding: '6px 12px' }}><input type="text" className="lims-remarks-input" value={rowData.remarks} placeholder="Remarks…" onChange={e => handleResultChange(pName, 'remarks', e.target.value, paramObj.unit, paramObj.referenceValue, catName, paramObj.subcategory || '')} /></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 2. OTHER AVAILABLE TESTS SECTION (Collapsible) */}
                  {otherParams.length > 0 && (() => {
                    const isOtherOpen = !!showUnrequestedMap[catName];
                    const toggleOther = () => {
                      setShowUnrequestedMap(prev => ({
                        ...prev,
                        [catName]: !prev[catName]
                      }));
                    };

                    return (
                      <div style={{ margin: '20px 16px 0 16px', border: '1px solid var(--card-border, #e2e8f0)', borderRadius: '12px', overflow: 'hidden' }}>
                        <button
                          type="button"
                          onClick={toggleOther}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'var(--color-surface-container, #f1f5f9)',
                            border: 'none',
                            borderBottom: isOtherOpen ? '1px solid var(--card-border, #cbd5e1)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'space-between',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted, #64748b)' }}>📋</span>
                            <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary, #334155)', letterSpacing: '0.04em' }}>
                              Other Available Tests ({otherParams.length})
                            </h4>
                            <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.75rem', fontWeight: 500 }}>
                              (Optional additional tests)
                            </small>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary, #334155)', background: 'var(--card-bg, #ffffff)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--card-border, #cbd5e1)' }}>
                            {isOtherOpen ? '▲' : '▼'}
                          </span>
                        </button>

                        {isOtherOpen && (
                          <div className="lims-table-container" style={{ overflowX: 'auto', padding: '12px' }}>
                            <table className="lims-param-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                              <thead>
                                <tr className="lims-param-thead-tr">
                                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Parameter / Test</th>
                                  <th style={{ padding: '10px 12px', fontWeight: 700, width: '160px' }}>Result</th>
                                  <th style={{ padding: '10px 12px', fontWeight: 700, width: '110px' }}>SI Unit</th>
                                  <th style={{ padding: '10px 12px', fontWeight: 700, width: '150px' }}>Reference Range</th>
                                  <th style={{ padding: '10px 12px', fontWeight: 700, width: '90px', textAlign: 'center' }}>Flag</th>
                                  <th style={{ padding: '10px 12px', fontWeight: 700, width: '180px' }}>Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {otherParams.map(paramObj => {
                                  const pName = paramObj.parameterName;
                                  const rowData = getResultItem(pName, paramObj.unit, paramObj.referenceValue);
                                  const currentIndex = inputCounter++;
                                  return (
                                    <tr key={pName} className="lims-param-row">
                                      <td style={{ padding: '10px 12px' }}>
                                        <strong className="param-title" style={{ color: 'var(--text-primary, #0f172a)' }}>
                                          {pName}
                                        </strong>
                                      </td>
                                      <td style={{ padding: '6px 12px' }}>
                                        <input ref={el => (inputsRef.current[currentIndex] = el)} type="text" className="lims-result-input" value={rowData.result} placeholder="Enter result" onKeyDown={e => handleKeyDown(e, currentIndex)} onChange={e => handleResultChange(pName, 'result', e.target.value, paramObj.unit, paramObj.referenceValue, catName, paramObj.subcategory || '')} style={{ border: rowData.flag === 'H' ? '2px solid #ef4444' : rowData.flag === 'L' ? '2px solid #eab308' : undefined }} />
                                      </td>
                                      <td style={{ padding: '6px 12px' }}><input type="text" className="lims-unit-input" value={rowData.unit} placeholder={paramObj.unit || '—'} onChange={e => handleResultChange(pName, 'unit', e.target.value, paramObj.unit, paramObj.referenceValue, catName, paramObj.subcategory || '')} /></td>
                                      <td style={{ padding: '6px 12px' }}><input type="text" className="lims-ref-input" value={rowData.referenceValue} placeholder={paramObj.referenceValue || '—'} onChange={e => handleResultChange(pName, 'referenceValue', e.target.value, paramObj.unit, paramObj.referenceValue, catName, paramObj.subcategory || '')} /></td>
                                      <td style={{ padding: '10px 12px', textAlign: 'center' }}><FlagBadge flag={rowData.flag} result={rowData.result} referenceValue={rowData.referenceValue} sex={patient?.sex} /></td>
                                      <td style={{ padding: '6px 12px' }}><input type="text" className="lims-remarks-input" value={rowData.remarks} placeholder="Remarks…" onChange={e => handleResultChange(pName, 'remarks', e.target.value, paramObj.unit, paramObj.referenceValue, catName, paramObj.subcategory || '')} /></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {requestedParams.length === 0 && otherParams.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #64748b)', fontSize: '0.88rem' }}>
                      No parameters currently configured for {catName}. Click "＋ Add Parameter" above to create parameters for this category.
                    </div>
                  )}

                  {/* TEST-SPECIFIC CLINICAL INTERPRETATION CONTAINER */}
                  <TestClinicalInterpretationSection
                    testName={catName}
                    testInterpretations={testInterpretations}
                    onAddClick={() => setInterpModalTest(catName)}
                    onRemove={(item) => handleRemoveInterpretation(catName, item)}
                  />

                </div>
              );
            })
          ) : (
            <div className="lims-no-cat-selected">
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🧪</span>
              <h4>No Investigation Categories Selected</h4>
              <p>Click on one or more category cards above to select investigations and open result sheets.</p>
            </div>
          )}

        </div>
      )}

      {/* Global Technician Comments */}
      <div className="lims-comments-box">
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Collector / Technologist General Notes</span>
          <small style={{ fontWeight: 400, color: 'var(--text-muted)' }}>Editable by Sample Collector or Approver</small>
        </label>
        <textarea
          value={reportData.comments || ''}
          placeholder="Add general specimen observations or technologist notes..."
          onChange={e => onChange({ ...reportData, comments: e.target.value })}
        />
      </div>

      {/* Action Buttons */}
      <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className="secondary" type="button" disabled={busy || isSavingDraft} onClick={onSaveDraft}>
          {isSavingDraft ? '⏳ Saving Draft…' : '💾 Save Draft Report'}
        </button>
        <button className="secondary" type="button" disabled={busy || isGeneratingPreview} onClick={onGeneratePreview}>
          {isGeneratingPreview ? '⏳ Generating Preview…' : '📄 Review Report'}
        </button>
        <button className="primary" type="button" disabled={busy || isSubmitting} onClick={onSubmitApproval}>
          {isSubmitting ? '🚀 Submitting Report…' : '🚀 Submit for Approval'}
        </button>
      </div>

    </div>
  );
}
