import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FlagBadge, calculateFlag } from '../utils/flagHelper.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { MAIN_CATEGORY_ORDER, CATEGORY_MAP_ALIASES, normalizeCategoryName } from '../utils/categoryHelper.js';
import { sendResultDirect, sendResultBack } from '../services/transferService.js';
import {
  CLINICAL_INTERPRETATION_CATEGORIES,
  CLINICAL_INTERPRETATIONS_LIBRARY,
  getRecommendedInterpretations,
  findMatchingSourceInterpretation
} from '../constants/clinicalInterpretations.js';
import ClinicalInterpretationAdminModal from './ClinicalInterpretationAdminModal.jsx';

const CATEGORY_META = {
  'HEMATOLOGY': { icon: '🩸', themeClass: 'cat-theme-hematology', bgGradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
  'BLOOD GROUP': { icon: '🩸', themeClass: 'cat-theme-hematology', bgGradient: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)' },
  'B/GROUP': { icon: '🩸', themeClass: 'cat-theme-hematology', bgGradient: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)' },
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

/* ─── Interpretation Selection Modal (Category & Search Library) ─────────── */
function InterpretationSelectionModal({ testName, testId, token, onSelect, onClose }) {
  const [list, setList] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDropdownId, setSelectedDropdownId] = useState('');

  // Initial category detection based on testName
  useEffect(() => {
    if (!testName) return;
    const upper = testName.toUpperCase();
    if (upper.includes('HEMAT') || upper.includes('CBC') || upper.includes('BLOOD')) {
      setSelectedCategory('HEMATOLOGY');
    } else if (upper.includes('CHEM') || upper.includes('LIVER') || upper.includes('LFT') || upper.includes('RENAL') || upper.includes('RFT') || upper.includes('LIPID') || upper.includes('ELECTRO') || upper.includes('GLUCOSE')) {
      setSelectedCategory('CLINICAL CHEMISTRY');
    } else if (upper.includes('URIN')) {
      setSelectedCategory('URINALYSIS');
    } else if (upper.includes('STOOL') || upper.includes('PARASIT')) {
      setSelectedCategory('PARASITOLOGY');
    } else if (upper.includes('IMMUN') || upper.includes('SEROL') || upper.includes('CRP')) {
      setSelectedCategory('IMMUNOLOGY / INFLAMMATION');
    } else if (upper.includes('FLUID') || upper.includes('SEMEN') || upper.includes('CSF') || upper.includes('SYNOVIAL')) {
      setSelectedCategory('BODY FLUIDS & SPECIAL');
    }
  }, [testName]);

  // Load from backend API with fallback to offline constant library
  useEffect(() => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'ALL') params.set('category', selectedCategory);
    if (query.trim()) params.set('search', query.trim());
    else if (testName) params.set('testName', testName);

    api(`/clinical-interpretations?${params.toString()}`, { token })
      .then(res => {
        if (Array.isArray(res?.interpretations) && res.interpretations.length > 0) {
          setList(res.interpretations);
        } else {
          // Fallback to our authentic document-derived library constants
          setList(CLINICAL_INTERPRETATIONS_LIBRARY);
        }
      })
      .catch(() => {
        // Safe graceful fallback
        setList(CLINICAL_INTERPRETATIONS_LIBRARY);
      })
      .finally(() => setLoading(false));
  }, [testName, selectedCategory, query, token]);

  // Filtered interpretations for card view and dropdown
  const filtered = useMemo(() => {
    const rawList = list.length > 0 ? list : CLINICAL_INTERPRETATIONS_LIBRARY;
    const s = query.trim().toLowerCase();
    const cat = selectedCategory.toUpperCase();

    return rawList.filter(item => {
      const itemCat = (item.categoryName || item.category || '').toUpperCase();
      const catMatch = cat === 'ALL' || itemCat.includes(cat) || cat.includes(itemCat);

      if (!s) return catMatch;

      const titleMatch = (item.title || '').toLowerCase().includes(s);
      const textMatch = (item.interpretation || '').toLowerCase().includes(s);
      const testMatch = (item.laboratoryTestName || '').toLowerCase().includes(s);
      const kwMatch = Array.isArray(item.keywords) && item.keywords.some(k => k.toLowerCase().includes(s));
      const testNamesMatch = Array.isArray(item.testNames) && item.testNames.some(t => t.toLowerCase().includes(s));

      return catMatch && (titleMatch || textMatch || testMatch || kwMatch || testNamesMatch);
    });
  }, [list, query, selectedCategory]);

  // Sync selected dropdown item
  useEffect(() => {
    if (filtered.length > 0 && (!selectedDropdownId || !filtered.some(f => (f._id || f.id) === selectedDropdownId))) {
      setSelectedDropdownId(filtered[0]._id || filtered[0].id);
    }
  }, [filtered, selectedDropdownId]);

  const activeDropdownItem = useMemo(() => {
    return filtered.find(f => (f._id || f.id) === selectedDropdownId) || filtered[0] || null;
  }, [filtered, selectedDropdownId]);

  const QUICK_KEYWORDS = [
    { label: 'CBC', q: 'cbc' },
    { label: 'Kidney / eGFR', q: 'kidney' },
    { label: 'Liver Function', q: 'liver' },
    { label: 'Lipid / Cholesterol', q: 'cholesterol' },
    { label: 'Electrolytes', q: 'electrolyte' },
    { label: 'Urinalysis', q: 'urinalysis' },
    { label: 'CRP / hs-CRP', q: 'crp' },
    { label: 'Diabetic / Glucose', q: 'glucose' },
    { label: 'Iron Studies', q: 'iron' },
    { label: 'Calcium & Phos', q: 'calcium' }
  ];

  return (
    <div
      className="etu-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9500,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="etu-modal-content"
        style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.38)',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--card-border, #e2e8f0)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--card-border, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #075c91 0%, #0369a1 100%)',
          color: '#ffffff'
        }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
              Clinical Interpretation Library
            </p>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#ffffff' }}>
              Select Interpretation for: <span style={{ color: '#fef08a' }}>{testName}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#ffffff',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px 10px',
              borderRadius: '8px'
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Category & Search Filter Bar */}
        <div style={{
          padding: '14px 20px',
          background: 'var(--color-surface-container, #f8fafc)',
          borderBottom: '1px solid var(--card-border, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Category Dropdown / Selector */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', marginBottom: '4px', letterSpacing: '0.04em' }}>
                Category:
              </label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--card-border, #cbd5e1)',
                  background: 'var(--card-bg, #ffffff)',
                  color: 'var(--text-primary, #0f172a)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                {CLINICAL_INTERPRETATION_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 2, minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', marginBottom: '4px', letterSpacing: '0.04em' }}>
                Search Interpretations:
              </label>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="🔍 Search kidney, CBC, liver, cholesterol, iron..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--card-border, #cbd5e1)',
                  background: 'var(--card-bg, #ffffff)',
                  color: 'var(--text-primary, #0f172a)',
                  fontSize: '0.86rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Quick Keyword Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', WebkitOverflowScrolling: 'touch' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', alignSelf: 'center', whiteSpace: 'nowrap' }}>
              Quick filter:
            </span>
            {QUICK_KEYWORDS.map(kw => (
              <button
                key={kw.q}
                type="button"
                onClick={() => { setQuery(kw.q); setSelectedCategory('ALL'); }}
                style={{
                  padding: '3px 9px',
                  borderRadius: '12px',
                  border: '1px solid var(--card-border, #cbd5e1)',
                  background: query.toLowerCase() === kw.q.toLowerCase() ? '#075c91' : 'var(--card-bg, #ffffff)',
                  color: query.toLowerCase() === kw.q.toLowerCase() ? '#ffffff' : 'var(--text-secondary, #475569)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {kw.label}
              </button>
            ))}
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{ padding: '3px 8px', borderRadius: '12px', border: 'none', background: '#fee2e2', color: '#b91c1c', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Clear ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick Dropdown Copy Bar (Section 4 & 5 Requirement) */}
        {filtered.length > 0 && (
          <div style={{
            padding: '12px 20px',
            background: 'color-mix(in srgb, #075c91 5%, var(--card-bg, #ffffff))',
            borderBottom: '1px solid var(--card-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <small style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#075c91', marginBottom: '2px' }}>
                Interpretation:
              </small>
              <select
                value={selectedDropdownId}
                onChange={e => setSelectedDropdownId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #075c91',
                  background: 'var(--card-bg, #ffffff)',
                  color: 'var(--text-primary, #0f172a)',
                  fontSize: '0.84rem',
                  fontWeight: 600
                }}
              >
                {filtered.map(item => (
                  <option key={item._id || item.id} value={item._id || item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!activeDropdownItem}
              onClick={() => {
                if (activeDropdownItem) onSelect(activeDropdownItem);
              }}
              style={{
                background: '#075c91',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(7,92,145,0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              <span>📋</span> Copy to Clinical Interpretation
            </button>
          </div>
        )}

        {/* Scrollable Results List */}
        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #64748b)' }}>
              ⏳ Loading clinical interpretations from library…
            </div>
          ) : error ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px', borderRadius: '8px', color: '#b91c1c', fontSize: '0.88rem' }}>
              ⚠ {error}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #64748b)' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🔍</span>
              <strong>No interpretations found matching your filter.</strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem' }}>
                Try switching the category to "ALL" or clearing search keywords.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map(item => {
                const isCurrent = (item._id || item.id) === selectedDropdownId;
                const catBadge = item.categoryName || item.category || 'GENERAL';
                return (
                  <div
                    key={item._id || item.id || item.title}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: isCurrent ? 'color-mix(in srgb, #075c91 4%, var(--card-bg, #ffffff))' : 'var(--card-bg, #ffffff)',
                      border: isCurrent ? '2px solid #075c91' : '1px solid var(--card-border, #e2e8f0)',
                      boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            textTransform: 'uppercase'
                          }}>
                            {catBadge}
                          </span>
                          {item.laboratoryTestName && (
                            <span style={{
                              background: '#f1f5f9',
                              color: '#475569',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}>
                              {item.laboratoryTestName}
                            </span>
                          )}
                        </div>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary, #0f172a)' }}>
                          {item.title}
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelect(item)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: 'none',
                          background: '#075c91',
                          color: '#ffffff',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 2px 4px rgba(7,92,145,0.2)'
                        }}
                      >
                        <span>📋</span> Copy to Clinical Interpretation
                      </button>
                    </div>

                    <p style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary, #334155)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line',
                      background: 'var(--color-surface-dim, #f8fafc)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--card-border, #f1f5f9)'
                    }}>
                      {item.interpretation}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--card-border, #e2e8f0)',
          background: 'var(--color-surface-container, #f8fafc)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
            {filtered.length} predefined interpretation{filtered.length === 1 ? '' : 's'} available
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
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Test Clinical Interpretation Container (Editable & Predefined Copy) ── */
function TestClinicalInterpretationSection({
  testName,
  testInterpretations = [],
  onAddClick,
  onRemove,
  onUpdateText,
  onToggleShowOnReport,
  onAddCustom,
  onOpenAdmin,
  isAdmin
}) {
  const currentTestEntry = testInterpretations.find(t => t.testName?.toUpperCase() === testName.toUpperCase());
  const selectedList = currentTestEntry?.interpretations || [];

  return (
    <div style={{
      margin: '16px 16px 16px 16px',
      padding: '16px',
      background: 'var(--color-surface-container, #f8fafc)',
      border: '1px solid var(--card-border, #e2e8f0)',
      borderRadius: '12px',
      borderLeft: '4px solid var(--color-primary, #075c91)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary, #075c91)', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🩺</span> Clinical Interpretation
          </h4>
          <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.78rem' }}>
            Predefined or editable clinical explanatory text for {testName}
          </small>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onAddClick}
            style={{
              background: '#075c91',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(7,92,145,0.25)'
            }}
          >
            <span>💡</span> Choose Clinical Interpretation
          </button>

          <button
            type="button"
            onClick={onAddCustom}
            style={{
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              border: '1.5px solid var(--card-border, #cbd5e1)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ＋ Add Custom Note
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              style={{
                background: 'var(--color-surface-dim, #f1f5f9)',
                color: '#075c91',
                border: '1px solid var(--card-border, #cbd5e1)',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Admin Library Management"
            >
              ⚙ Manage Library
            </button>
          )}
        </div>
      </div>

      {/* Body: List of Editable Clinical Interpretations */}
      {selectedList.length === 0 ? (
        <div style={{
          padding: '16px',
          textAlign: 'center',
          background: 'var(--card-bg, #ffffff)',
          border: '1.5px dashed var(--card-border, #cbd5e1)',
          borderRadius: '10px',
          color: 'var(--text-muted, #64748b)',
          fontSize: '0.85rem'
        }}>
          <p style={{ margin: '0 0 10px' }}>
            No clinical interpretation entered for <strong>{testName}</strong>.
          </p>
          <button
            type="button"
            onClick={onAddClick}
            style={{
              background: '#075c91',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>💡</span> Choose Clinical Interpretation
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {selectedList.map((item, idx) => {
            const isShown = item.showOnReport !== false;
            return (
              <div
                key={item.interpretationId || item.title || idx}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: isShown ? 'var(--card-bg, #ffffff)' : '#f8fafc',
                  border: isShown ? '1px solid var(--card-border, #cbd5e1)' : '1px dashed #94a3b8',
                  boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  opacity: isShown ? 1 : 0.8
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <strong style={{ fontSize: '0.88rem', color: isShown ? 'var(--text-primary, #0f172a)' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📋</span> {item.title || 'Clinical Interpretation'}
                  </strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Show/Hide Toggle Control (Requirement 8) */}
                    <button
                      type="button"
                      onClick={() => onToggleShowOnReport(testName, idx)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isShown ? '1px solid #10b981' : '1px solid #cbd5e1',
                        background: isShown ? '#ecfdf5' : '#f1f5f9',
                        color: isShown ? '#065f46' : '#64748b'
                      }}
                      title={isShown ? 'Currently included on report. Click to hide.' : 'Currently hidden from report. Click to show.'}
                    >
                      <span>{isShown ? '👁' : '🚫'}</span>
                      <span>{isShown ? 'Show on Report' : 'Hide on Report'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemove(item)}
                      style={{
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        color: '#b91c1c',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '4px 10px',
                        borderRadius: '6px'
                      }}
                      title="Remove from this report"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>

                {/* Directly Editable Text Area */}
                <div>
                  <textarea
                    rows={4}
                    value={item.interpretation || ''}
                    onChange={e => onUpdateText(testName, idx, e.target.value)}
                    placeholder="Enter or edit clinical explanatory text..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: isShown ? '1.5px solid var(--card-border, #cbd5e1)' : '1.5px dashed #cbd5e1',
                      background: isShown ? 'var(--card-bg, #ffffff)' : '#f1f5f9',
                      color: isShown ? 'var(--text-primary, #0f172a)' : '#64748b',
                      fontSize: '0.86rem',
                      lineHeight: 1.5,
                      boxSizing: 'border-box',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap', gap: '6px' }}>
                    <small style={{ color: isShown ? '#059669' : '#dc2626', fontSize: '0.74rem', fontWeight: 700 }}>
                      {isShown ? '✓ Visible on printed and patient report.' : '🚫 Hidden from printed and patient report.'}
                    </small>
                    <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.72rem' }}>
                      Edits apply strictly to this patient report.
                    </small>
                  </div>
                </div>
              </div>
            );
          })}
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
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [entryMode, setEntryMode] = useState('result');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [activeSubcatsMap, setActiveSubcatsMap] = useState({});
  const [addParamModal, setAddParamModal] = useState(null); // { catName, subcatName }
  const [interpModalTest, setInterpModalTest] = useState(null); // testName string or null
  const [adminInterpModalOpen, setAdminInterpModalOpen] = useState(false);
  const [addParamToast, setAddParamToast] = useState('');
  const [transferToast, setTransferToast] = useState('');
  const [directModal, setDirectModal] = useState({ open: false, sendBackOpen: false, busy: false, error: '' });
  const inputsRef = useRef([]);

  const isTransfer = Boolean(
    patient?.isTransferMode ||
    patient?.transferredFrom ||
    reportData?.isCrossBranchTransfer ||
    reportData?.transfer
  );
  const transferId = patient?.transferId || reportData?.transfer;
  const requestedBranch = patient?.sourceBranch || reportData?.originalBranch || 'Main';
  const transferStatus = patient?.transferStatus || (reportData?.approvalStatus === 'Approved' ? 'READY_TO_RETURN' : (reportData?.status === 'Submitted' || reportData?.status === 'Pending' ? 'RESULT_READY' : 'UNDER_INVESTIGATION'));

  const handleExecuteDirectReturn = async () => {
    if (!transferId) {
      setDirectModal(m => ({ ...m, error: 'Transfer ID not found.' }));
      return;
    }
    setDirectModal(m => ({ ...m, busy: true, error: '' }));
    try {
      await sendResultDirect(transferId, {
        results: reportData?.results || [],
        comments: reportData?.comments || '',
        notes: reportData?.comments || ''
      }, token);
      setDirectModal({ open: false, sendBackOpen: false, busy: false, error: '' });
      setTransferToast(`✅ Result successfully returned directly to ${requestedBranch}!`);
      if (onSaveDraft) onSaveDraft();
    } catch (err) {
      setDirectModal(m => ({ ...m, busy: false, error: err?.message || 'Failed to send result directly.' }));
    }
  };

  const handleExecuteSendBack = async () => {
    if (!transferId) {
      setDirectModal(m => ({ ...m, error: 'Transfer ID not found.' }));
      return;
    }
    setDirectModal(m => ({ ...m, busy: true, error: '' }));
    try {
      await sendResultBack(transferId, {
        results: reportData?.results || [],
        comments: reportData?.comments || ''
      }, token);
      setDirectModal({ open: false, sendBackOpen: false, busy: false, error: '' });
      setTransferToast(`🚀 Approved results successfully sent back to ${requestedBranch}!`);
      if (onSaveDraft) onSaveDraft();
    } catch (err) {
      setDirectModal(m => ({ ...m, busy: false, error: err?.message || 'Failed to send result back.' }));
    }
  };

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
      const categoryScopedNames = new Map(); // catNorm -> Set of parameter names

      if (!patient) {
        return { selectedTestIds, selectedTestNames, selectedTestCategories, names, categories, categoryScopedNames };
      }

      const requestedTestsList = [];

      const addTestItem = (t) => {
        if (!t) return;
        if (typeof t === 'string' && t.trim()) {
          const u = t.trim().toUpperCase();
          selectedTestNames.push(u);
          names.add(u);
          requestedTestsList.push({ id: '', name: u, normCat: '', sub: '' });
        } else if (typeof t === 'object') {
          const tid = String(t._id || t.id || '');
          if (tid) selectedTestIds.push(tid);

          const nameVal = t.name || t.parameterName || t.sampleName;
          const subVal = (t.subcategory || '').trim().toUpperCase();
          const catVal = (typeof t.category === 'object' && t.category?.name)
            ? t.category.name
            : (typeof t.category === 'string' ? t.category : '');
          const normCat = catVal ? normalizeCategoryName(catVal) : '';

          if (nameVal && typeof nameVal === 'string') {
            const u = nameVal.trim().toUpperCase();
            selectedTestNames.push(u);
            names.add(u);
            if (normCat) {
              if (!categoryScopedNames.has(normCat)) categoryScopedNames.set(normCat, new Set());
              categoryScopedNames.get(normCat).add(u);
            }
            requestedTestsList.push({ id: tid, name: u, normCat, sub: subVal });
          }
          if (normCat) {
            selectedTestCategories.push(normCat);
            categories.add(normCat);
          }
        }
      };

      // Strictly check laboratoryTests and requestedTests (DO NOT include sampleTypes container names)
      if (patient.isTransferMode && patient.transferredTestName) {
        // Exclusively process the single transferred test (Requirements 4, 5, 8, 10)
        addTestItem({
          _id: patient.transferredTestId || '',
          name: patient.transferredTestName,
          category: patient.transferredCategory || ''
        });
      } else {
        if (Array.isArray(patient.laboratoryTests)) {
          patient.laboratoryTests.forEach(addTestItem);
        }
        if (Array.isArray(patient.requestedTests)) {
          patient.requestedTests.forEach(addTestItem);
        }
        if (patient.registrationType === 'Referral') {
          categories.add('REFERRAL');
        }
      }

      // Match catalog parameters against receptionist-selected test names strictly WITHIN THEIR CATEGORY
      if (requestedTestsList.length > 0 && Array.isArray(effectiveCatalog)) {
        effectiveCatalog.forEach(param => {
          const pName = (param.parameterName || '').trim().toUpperCase();
          const pSub = (param.subcategory || '').trim().toUpperCase();
          const pCat = (param.category || '').trim().toUpperCase();
          const pId = String(param._id || '');
          const normCat = normalizeCategoryName(pCat);
          const pAliases = Array.isArray(param.aliases) ? param.aliases.map(a => String(a).trim().toUpperCase()) : [];

          requestedTestsList.forEach(reqT => {
            // Direct ID match
            const idMatch = Boolean(pId && reqT.id && pId === reqT.id);

            // Category match: if reqT has a known category, param must match that category
            const catMatch = !reqT.normCat || (normCat && normCat === reqT.normCat);

            if (idMatch) {
              if (normCat) {
                categories.add(normCat);
                if (!categoryScopedNames.has(normCat)) categoryScopedNames.set(normCat, new Set());
                categoryScopedNames.get(normCat).add(pName);
              }
              if (pName) names.add(pName);
              return;
            }

            if (catMatch) {
              const nUpper = reqT.name;
              const isNameMatch = pName === nUpper ||
                pSub === nUpper ||
                pAliases.includes(nUpper) ||
                (nUpper.length > 2 && pName.includes(`(${nUpper})`)) ||
                (nUpper.length > 2 && (pName.startsWith(`${nUpper} `) || pName.endsWith(` ${nUpper}`))) ||
                (nUpper === 'URINE MICROSCOPY' && (pSub === 'URINE MICROSCOPY' || /MICROSCOP/i.test(pSub))) ||
                (nUpper === 'CHEMICAL ANALYSIS' && (pSub === 'CHEMICAL ANALYSIS' || /^CHEM/i.test(pSub))) ||
                (nUpper === 'CBC' && (pSub === 'CBC' || normCat === 'HEMATOLOGY'));

              if (isNameMatch) {
                if (normCat) {
                  categories.add(normCat);
                  if (!categoryScopedNames.has(normCat)) categoryScopedNames.set(normCat, new Set());
                  categoryScopedNames.get(normCat).add(pName);
                }
                if (pName) names.add(pName);
              }
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

      return { selectedTestIds, selectedTestNames, selectedTestCategories, names, categories, categoryScopedNames };
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
    if (patient?.isTransferMode && patient.transferredCategory) {
      return [normalizeCategoryName(patient.transferredCategory)];
    }
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
  }, [categoriesGrouped, patient?.isTransferMode, patient?.transferredCategory]);

  // Auto-select ONLY categories with requested tests on initial load or patient change
  useEffect(() => {
    if (patient?.isTransferMode && patient.transferredCategory) {
      const norm = normalizeCategoryName(patient.transferredCategory);
      setSelectedCategories([norm]);
      return;
    }
    if (categoryList.length > 0 && patient?._id && !userInteractedCats) {
      const enteredNames = new Set(
        (reportData?.results || [])
          .map(r => (r.sampleName || '').trim().toUpperCase())
          .filter(Boolean)
      );

      const reqCats = categoryList.filter(catName => {
        const paramsInCat = categoriesGrouped.get(catName) || [];
        const catScopedSet = requestedInfo.categoryScopedNames?.get(catName);
        const hasReqParam = paramsInCat.some(p => {
          const pName = (p.parameterName || '').trim().toUpperCase();
          const pSub = (p.subcategory || '').trim().toUpperCase();
          return (catScopedSet && (catScopedSet.has(pName) || catScopedSet.has(pSub))) ||
            enteredNames.has(pName);
        });
        const hasReqCat = Array.from(requestedInfo.categories).some(rc =>
          catName.toUpperCase() === rc || catName.toUpperCase().includes(rc) || rc.includes(catName.toUpperCase())
        );
        return hasReqParam && (hasReqCat || requestedInfo.categories.size === 0);
      });
      setSelectedCategories(reqCats);
    }
  }, [patient?._id, patient?.isTransferMode, patient?.transferredCategory, categoryList, categoriesGrouped, requestedInfo, userInteractedCats, reportData?.results]);

  const toggleCategory = (catName) => {
    if (patient?.isTransferMode) return; // Locked in transfer mode (Requirement 9)
    setUserInteractedCats(true);
    setSelectedCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  // Handle result changes
  const handleResultChange = (paramName, field, value, defaultUnit = '', defaultRef = '', catName = '', subcatName = '') => {
    const results = Array.isArray(reportData?.results) ? [...reportData.results] : [];
    const index = results.findIndex(r => r.sampleName === paramName && (!catName || !r.category || r.category === catName));

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
  const getResultItem = (paramName, defaultUnit = '', defaultRef = '', catName = '') => {
    const item = (reportData?.results || []).find(r => r.sampleName === paramName && (!catName || !r.category || r.category === catName));
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
  const autoLoadedCatsRef = useRef(new Set());
  const userRemovedInterpsRef = useRef(new Set());

  // Reset tracking when switching patients
  useEffect(() => {
    autoLoadedCatsRef.current = new Set();
    userRemovedInterpsRef.current = new Set();
  }, [patient?._id]);

  // Automatic Clinical Interpretation Loading (Requirement 7 & 16)
  useEffect(() => {
    if (!selectedCategories || selectedCategories.length === 0) return;

    let updatedList = [...testInterpretations];
    let changed = false;

    selectedCategories.forEach(catName => {
      const normCat = catName.toUpperCase();
      if (autoLoadedCatsRef.current.has(normCat)) return;
      autoLoadedCatsRef.current.add(normCat);

      // Check if this test already has interpretations recorded in current reportData
      let testEntry = updatedList.find(t => t.testName?.toUpperCase() === normCat);
      if (testEntry && Array.isArray(testEntry.interpretations) && testEntry.interpretations.length > 0) {
        // Patient report already has interpretations saved, do not overwrite historical data!
        return;
      }

      // Collect candidate interpretations from authentic source document only
      const candidateInterps = [];

      // 1. Check patient's requested test names within this category
      const catScoped = requestedInfo.categoryScopedNames?.get(catName);
      if (catScoped && catScoped.size > 0) {
        catScoped.forEach(testName => {
          const match = findMatchingSourceInterpretation(testName);
          if (match && !candidateInterps.some(c => c.id === match.id)) {
            const removeKey = `${normCat}:${match.id}`;
            if (!userRemovedInterpsRef.current.has(removeKey)) {
              candidateInterps.push(match);
            }
          }
        });
      }

      // 2. Also check patient.laboratoryTests directly
      if (Array.isArray(patient?.laboratoryTests)) {
        patient.laboratoryTests.forEach(t => {
          const tName = typeof t === 'string' ? t : (t?.name || '');
          const tCat = normalizeCategoryName(typeof t === 'object' && t?.category?.name ? t.category.name : (typeof t?.category === 'string' ? t.category : ''));
          if (tName && (tCat === catName || !tCat)) {
            const match = findMatchingSourceInterpretation(tName);
            if (match && !candidateInterps.some(c => c.id === match.id)) {
              const removeKey = `${normCat}:${match.id}`;
              if (!userRemovedInterpsRef.current.has(removeKey)) {
                candidateInterps.push(match);
              }
            }
          }
        });
      }

      // 3. Fallback to category-level match (e.g. HEMATOLOGY -> CBC, URINALYSIS -> Routine Urinalysis)
      if (candidateInterps.length === 0) {
        const catMatch = findMatchingSourceInterpretation(catName);
        if (catMatch) {
          const removeKey = `${normCat}:${catMatch.id}`;
          if (!userRemovedInterpsRef.current.has(removeKey)) {
            candidateInterps.push(catMatch);
          }
        }
      }

      // If authentic source matches found, auto-load them into this test category
      if (candidateInterps.length > 0) {
        changed = true;
        const newInterps = candidateInterps.map(m => ({
          interpretationId: m.id,
          title: m.title,
          interpretation: m.interpretation,
          showOnReport: true
        }));

        if (testEntry) {
          testEntry.interpretations = newInterps;
        } else {
          updatedList.push({
            testName: catName,
            interpretations: newInterps
          });
        }
      }
    });

    if (changed) {
      onChange({ ...reportData, testInterpretations: updatedList });
    }
  }, [selectedCategories, requestedInfo, patient, testInterpretations, reportData, onChange]);

  const handleSelectInterpretation = (testName, interpItem) => {
    const list = [...testInterpretations];
    let testEntry = list.find(t => t.testName?.toUpperCase() === testName.toUpperCase());

    if (!testEntry) {
      testEntry = { testName, interpretations: [] };
      list.push(testEntry);
    }

    const currentInterps = Array.isArray(testEntry.interpretations) ? [...testEntry.interpretations] : [];
    const existsIdx = currentInterps.findIndex(i =>
      (i.interpretationId && (i.interpretationId === String(interpItem._id) || i.interpretationId === String(interpItem.id))) ||
      i.title === interpItem.title
    );

    if (existsIdx === -1) {
      currentInterps.push({
        interpretationId: String(interpItem._id || interpItem.id || ''),
        title: interpItem.title,
        interpretation: interpItem.interpretation,
        showOnReport: true
      });
    } else {
      currentInterps[existsIdx] = {
        ...currentInterps[existsIdx],
        interpretation: interpItem.interpretation,
        showOnReport: true
      };
    }

    testEntry.interpretations = currentInterps;
    onChange({ ...reportData, testInterpretations: list });
    setInterpModalTest(null);
    setAddParamToast(`✅ Predefined interpretation copied into ${testName}! Text is ready for editing.`);
    setTimeout(() => setAddParamToast(''), 4000);
  };

  const handleToggleShowOnReport = (testName, interpIndex) => {
    const list = [...testInterpretations];
    const testEntry = list.find(t => t.testName?.toUpperCase() === testName.toUpperCase());
    if (testEntry && Array.isArray(testEntry.interpretations) && testEntry.interpretations[interpIndex]) {
      const cur = testEntry.interpretations[interpIndex];
      testEntry.interpretations[interpIndex] = {
        ...cur,
        showOnReport: cur.showOnReport === false ? true : false
      };
      onChange({ ...reportData, testInterpretations: list });
    }
  };

  const handleUpdateInterpretationText = (testName, interpIndex, updatedText) => {
    const list = [...testInterpretations];
    const testEntry = list.find(t => t.testName?.toUpperCase() === testName.toUpperCase());
    if (testEntry && Array.isArray(testEntry.interpretations) && testEntry.interpretations[interpIndex]) {
      testEntry.interpretations[interpIndex] = {
        ...testEntry.interpretations[interpIndex],
        interpretation: updatedText
      };
      onChange({ ...reportData, testInterpretations: list });
    }
  };

  const handleAddCustomInterpretation = (testName) => {
    const list = [...testInterpretations];
    let testEntry = list.find(t => t.testName?.toUpperCase() === testName.toUpperCase());
    if (!testEntry) {
      testEntry = { testName, interpretations: [] };
      list.push(testEntry);
    }
    const currentInterps = Array.isArray(testEntry.interpretations) ? [...testEntry.interpretations] : [];
    currentInterps.push({
      interpretationId: 'custom-' + Date.now(),
      title: `${testName} Clinical Note`,
      interpretation: '',
      showOnReport: true
    });
    testEntry.interpretations = currentInterps;
    onChange({ ...reportData, testInterpretations: list });
  };

  const handleRemoveInterpretation = (testName, interpItem) => {
    const removeKey = `${testName.toUpperCase()}:${interpItem.interpretationId || interpItem.title}`;
    userRemovedInterpsRef.current.add(removeKey);

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

      {/* INTERPRETATION SELECTION MODAL (CATEGORY & SEARCH LIBRARY) */}
      {interpModalTest && (
        <InterpretationSelectionModal
          testName={interpModalTest}
          token={token}
          onSelect={(item) => handleSelectInterpretation(interpModalTest, item)}
          onClose={() => setInterpModalTest(null)}
        />
      )}

      {/* ADMIN CLINICAL INTERPRETATION LIBRARY MANAGEMENT MODAL */}
      {adminInterpModalOpen && (
        <ClinicalInterpretationAdminModal
          token={token}
          onClose={() => setAdminInterpModalOpen(false)}
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

          {/* CROSS-BRANCH TRANSFER BANNER (Requirements 4, 5, 9, 10) */}
          {patient?.isTransferMode && (
            <div className="transfer-editor-banner" style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              padding: '14px 18px',
              borderRadius: '12px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 4px 14px rgba(2,132,199,0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.6rem' }}>🔄</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#ffffff' }}>
                    Cross-Branch Transferred Investigation: {patient.transferredTestName}
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', opacity: 0.95 }}>
                    Sent from <strong>{patient.sourceBranch || 'Origin'} Branch</strong> · Category: <strong>{patient.transferredCategory}</strong>
                  </p>
                </div>
              </div>
              <span style={{
                background: 'rgba(255,255,255,0.25)',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                🔒 {patient.transferredCategory} Result Entry Only
              </span>
            </div>
          )}

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
              const catScopedSet = requestedInfo.categoryScopedNames?.get(catName);
              const requestedParamsCount = paramsInCat.filter(p => {
                const pName = (p.parameterName || '').trim().toUpperCase();
                const pSub = (p.subcategory || '').trim().toUpperCase();
                return (catScopedSet && (catScopedSet.has(pName) || catScopedSet.has(pSub))) ||
                  enteredNames.has(pName);
              }).length;
              const isRequested = requestedParamsCount > 0 ||
                Array.from(requestedInfo.categories).some(rc => catName.toUpperCase() === rc || catName.toUpperCase().includes(rc) || rc.includes(catName.toUpperCase()));

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

              const catScopedSet = requestedInfo.categoryScopedNames?.get(catName);
              rawParams.forEach(p => {
                const pName = (p.parameterName || '').trim().toUpperCase();
                const pSub = (p.subcategory || '').trim().toUpperCase();
                const isReq = (catScopedSet && (catScopedSet.has(pName) || catScopedSet.has(pSub))) ||
                  (pName && requestedInfo.names.has(pName) && (!catScopedSet || catScopedSet.has(pName))) ||
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
                              const rowData = getResultItem(pName, paramObj.unit, paramObj.referenceValue, catName);
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

                  {/* 2. OTHER AVAILABLE TESTS SECTION (Collapsible, hidden during cross-branch transfer) */}
                  {!patient?.isTransferMode && otherParams.length > 0 && (() => {
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
                                  const rowData = getResultItem(pName, paramObj.unit, paramObj.referenceValue, catName);
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
                    onUpdateText={handleUpdateInterpretationText}
                    onToggleShowOnReport={handleToggleShowOnReport}
                    onAddCustom={() => handleAddCustomInterpretation(catName)}
                    onOpenAdmin={() => setAdminInterpModalOpen(true)}
                    isAdmin={isAdmin}
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

      {/* Cross-Branch Transfer Status Banner */}
      {isTransfer && (
        <div style={{ marginTop: '16px' }}>
          {transferStatus === 'RESULT_READY' && (
            <div className="alert warning" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '10px', padding: '12px 16px', fontSize: '0.9rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⏳</span>
              <div>
                <strong>Waiting for Approval at this branch.</strong> Direct return to <strong>{requestedBranch}</strong> is disabled while awaiting approval. Once approved, you can click "Send Back to {requestedBranch}".
              </div>
            </div>
          )}
          {transferStatus === 'READY_TO_RETURN' && (
            <div className="alert success" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '10px', padding: '12px 16px', fontSize: '0.9rem' }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <div>
                <strong>Results Approved!</strong> Click <strong>"Send Back to {requestedBranch}"</strong> below to return the approved results and finalize the test.
              </div>
            </div>
          )}
          {!['RESULT_READY', 'READY_TO_RETURN'].includes(transferStatus) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: '10px', padding: '12px 16px', fontSize: '0.88rem' }}>
              <div>
                <strong>🧪 Transferred from {requestedBranch} Branch.</strong> Enter results and choose your return method:
                <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.84rem' }}>
                  <li><strong>Option 1 (Direct Return):</strong> Click <em>"Send Result to {requestedBranch}"</em> to merge directly without local approval.</li>
                  <li><strong>Option 2 (Approval First):</strong> Click <em>"Send for Approval"</em> to require local approval before returning.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="secondary" type="button" disabled={busy || isSavingDraft} onClick={onSaveDraft}>
          {isSavingDraft ? '⏳ Saving Draft…' : '💾 Save Draft Report'}
        </button>
        <button className="secondary" type="button" disabled={busy || isGeneratingPreview} onClick={onGeneratePreview}>
          {isGeneratingPreview ? '⏳ Generating Preview…' : '📄 Review Report'}
        </button>

        {!isTransfer ? (
          <button className="primary" type="button" disabled={busy || isSubmitting} onClick={onSubmitApproval}>
            {isSubmitting ? '🚀 Submitting Report…' : '🚀 Submit for Approval'}
          </button>
        ) : (
          <>
            {transferStatus === 'READY_TO_RETURN' ? (
              <button
                className="primary"
                type="button"
                style={{ background: '#16a34a', borderColor: '#15803d', color: '#fff', fontWeight: 700 }}
                disabled={busy || directModal.busy}
                onClick={() => setDirectModal({ open: false, sendBackOpen: true, busy: false, error: '' })}
              >
                🚀 Send Back to {requestedBranch}
              </button>
            ) : (
              <>
                <button
                  className="primary"
                  type="button"
                  style={{ background: '#0284c7', borderColor: '#0369a1', color: '#fff', fontWeight: 600, opacity: transferStatus === 'RESULT_READY' ? 0.6 : 1 }}
                  disabled={busy || directModal.busy || transferStatus === 'RESULT_READY'}
                  onClick={() => setDirectModal({ open: true, sendBackOpen: false, busy: false, error: '' })}
                  title={transferStatus === 'RESULT_READY' ? 'Direct return is disabled while awaiting approval' : `Send result directly to ${requestedBranch} without local approval`}
                >
                  ⚡ Send Result to {requestedBranch}
                </button>
                <button
                  className="secondary"
                  type="button"
                  disabled={busy || isSubmitting || transferStatus === 'RESULT_READY'}
                  onClick={onSubmitApproval}
                  title="Submit for receiving-branch approval first before returning"
                >
                  {transferStatus === 'RESULT_READY' ? '⏳ Waiting for Approval' : '📤 Send for Approval'}
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal: Option 1 Direct Return */}
      {directModal.open && (
        <div className="etu-modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="etu-modal-content" style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', width: '100%', maxWidth: '500px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚡</span> Send Result to {requestedBranch} (Direct Return)
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.92rem', color: '#334155', lineHeight: 1.5 }}>
              Are you sure you want to send this completed result directly to <strong>{requestedBranch}</strong> without receiving-branch approval? The results will immediately merge into the patient's original order at {requestedBranch}.
            </p>
            {directModal.error && (
              <div className="alert error" style={{ marginBottom: '14px' }}>{directModal.error}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="secondary" disabled={directModal.busy} onClick={() => setDirectModal(m => ({ ...m, open: false }))}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                style={{ background: '#0284c7', borderColor: '#0369a1', color: '#fff', fontWeight: 600 }}
                disabled={directModal.busy}
                onClick={handleExecuteDirectReturn}
              >
                {directModal.busy ? 'Sending...' : `Send Result to ${requestedBranch}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Option 2 Send Back */}
      {directModal.sendBackOpen && (
        <div className="etu-modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="etu-modal-content" style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', width: '100%', maxWidth: '500px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚀</span> Send Approved Results Back
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.92rem', color: '#334155', lineHeight: 1.5 }}>
              Send the approved results back to <strong>{requestedBranch}</strong>? The results will merge into the patient's original draft report at {requestedBranch}.
            </p>
            {directModal.error && (
              <div className="alert error" style={{ marginBottom: '14px' }}>{directModal.error}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="secondary" disabled={directModal.busy} onClick={() => setDirectModal(m => ({ ...m, sendBackOpen: false }))}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                style={{ background: '#16a34a', borderColor: '#15803d', color: '#fff', fontWeight: 700 }}
                disabled={directModal.busy}
                onClick={handleExecuteSendBack}
              >
                {directModal.busy ? 'Sending...' : `Send Back to ${requestedBranch}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {transferToast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 18px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
          <span>{transferToast}</span>
          <button type="button" onClick={() => setTransferToast('')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', padding: 0 }}>×</button>
        </div>
      )}


    </div>
  );
}
