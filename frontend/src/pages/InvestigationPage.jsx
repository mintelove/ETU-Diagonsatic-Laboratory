/**
 * ETU Diagnostic Laboratory — Investigation Workspace Page
 *
 * Dedicated workspace for Sample Collectors to conduct symptom interviews
 * and select laboratory test types for Self-Aware patients.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { api, isSilentNetworkError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { useScrollLock } from '../utils/useScrollLock.js';

const ETB = n => `${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB`;

const categoryIcons = {
  'HEMATOLOGY and IMMUNO HEMATOLOGY': '🩸',
  'CLINICAL CHEMISTRY and IMMUNOASSAY TESTS': '🧪',
  'URINE AND BODY FLUID ANALYSIS': '🔬',
  'PARASITOLOGY': '🦠',
  'MICROBIOLOGY': '🧫',
  'SEROLOGICAL TESTS': '🧬',
  'REFERRAL TESTS': '🏥',
  'OTHER TESTS': '⚡'
};

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast-message ${type === 'error' ? 'error' : 'success'}`} style={{
      position: 'fixed', bottom: '24px', right: '24px', padding: '12px 24px',
      borderRadius: '8px', color: '#fff', fontWeight: 600, zIndex: 1200,
      background: type === 'error' ? 'var(--color-error, #dc2626)' : 'var(--color-success, #16a34a)',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', gap: '8px', alignItems: 'center'
    }}>
      <span>{type === 'error' ? '❌' : '✅'}</span>
      <span>{message}</span>
    </div>
  );
}

export default function InvestigationPage() {
  const { token, user } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();

  const [patients, setPatients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [testSearch, setTestSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  useScrollLock(showConfirmationModal);
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');
  const [testSettings, setTestSettings] = useState({});

  const dismissToast = useCallback(() => setToast(null), []);

  const loadData = useCallback(async (signal) => {
    try {
      setLoading(true);
      const [resPatients, resCatalog] = await Promise.all([
        api('/collection/investigation', { token, signal }),
        api('/laboratory-tests/catalog', { token, signal })
      ]);
      setPatients(resPatients.patients || []);
      const cats = resCatalog.categories || resCatalog.data?.categories || [];
      setCategories(cats);
      setTestSettings(resCatalog.settings || resCatalog.data?.settings || {});
      setExpandedCategories(prev => prev.length === 0 ? cats.map(c => String(c._id || c.id)) : prev);
    } catch (e) {
      if (e.name === 'AbortError' || isSilentNetworkError(e)) return;
      setToast({ message: e.message || 'Error loading investigation queue.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  useEffect(() => {
    const refresh = () => loadData();
    subscribe('collection:change', refresh);
    subscribe('reception:change', refresh);
    return () => {
      unsubscribe('collection:change', refresh);
      unsubscribe('reception:change', refresh);
    };
  }, [subscribe, unsubscribe, loadData]);

  const filteredPatients = useMemo(() => {
    if (!q.trim()) return patients;
    const query = q.toLowerCase();
    return patients.filter(p =>
      p.patientId.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query) ||
      p.phone.toLowerCase().includes(query)
    );
  }, [patients, q]);

  const isCbcTest = useCallback((t) => {
    const catName = t.categoryName || (typeof t.category === 'object' ? t.category?.name : '') || '';
    return /^HEMATOLOGY$/i.test(catName) && /^CBC$/i.test(t.subcategory || '');
  }, []);

  const allTests = useMemo(() => {
    return categories.flatMap(c => (c.tests || []).map(t => ({ ...t, categoryName: c.name })));
  }, [categories]);

  const selectedTests = useMemo(() => {
    return allTests.filter(t => selectedTestIds.includes(String(t._id || t.id || t)));
  }, [allTests, selectedTestIds]);

  const totalPrice = useMemo(() => {
    const cbcGroupPrice = Number(testSettings.cbcGroupPrice ?? 150);
    const cbcTests = [];
    const nonCbcTests = [];
    selectedTests.forEach(t => {
      if (isCbcTest(t)) {
        cbcTests.push(t);
      } else {
        nonCbcTests.push(t);
      }
    });
    let total = nonCbcTests.reduce((sum, t) => sum + (t.price || 0), 0);
    if (cbcTests.length > 0) {
      total += cbcGroupPrice;
    }
    return total;
  }, [selectedTests, testSettings, isCbcTest]);

  const visibleCategories = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      tests: (cat.tests || []).filter(test => {
        if (!testSearch.trim()) return true;
        return `${test.name} ${test.description || ''} ${cat.name}`.toLowerCase().includes(testSearch.toLowerCase());
      })
    })).filter(cat => cat.tests.length > 0);
  }, [categories, testSearch]);

  const handleOpenPatient = (patient) => {
    setSelectedPatient(patient);
    setSymptoms(patient.investigationNotes || '');
    setSystolicBP(patient.systolicBP || '');
    setDiastolicBP(patient.diastolicBP || '');
    setSelectedTestIds((patient.laboratoryTests || []).map(t => String(t._id || t.id || t)));
    setExpandedCategories(categories.map(c => String(c._id || c.id)));
    setShowConfirmationModal(false);
  };

  const handleToggleTest = (id) => {
    const idStr = String(id);
    setSelectedTestIds(prev =>
      prev.includes(idStr) ? prev.filter(x => x !== idStr) : [...prev, idStr]
    );
  };

  const handleToggleCbcGroup = (subTests) => {
    const subTestIds = subTests.map(t => String(t._id || t.id || t));
    const allSelected = subTestIds.length > 0 && subTestIds.every(id => selectedTestIds.includes(id));
    if (allSelected) {
      setSelectedTestIds(prev => prev.filter(id => !subTestIds.includes(id)));
    } else {
      setSelectedTestIds(prev => [...new Set([...prev, ...subTestIds])]);
    }
  };

  const validateBP = () => {
    if (systolicBP && (Number(systolicBP) < 50 || Number(systolicBP) > 300)) {
      setToast({ message: 'Systolic BP must be between 50 and 300 mmHg.', type: 'error' });
      return false;
    }
    if (diastolicBP && (Number(diastolicBP) < 30 || Number(diastolicBP) > 200)) {
      setToast({ message: 'Diastolic BP must be between 30 and 200 mmHg.', type: 'error' });
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!selectedPatient) return;
    if (!validateBP()) return;
    setSubmitting(true);
    try {
      await api(`/collection/investigation/${selectedPatient._id}/draft`, {
        token,
        method: 'PUT',
        body: JSON.stringify({
          laboratoryTests: selectedTestIds,
          symptoms: symptoms.trim(),
          systolicBP: systolicBP ? Number(systolicBP) : null,
          diastolicBP: diastolicBP ? Number(diastolicBP) : null
        })
      });

      setToast({
        message: `Investigation draft saved for ${selectedPatient.name}.`,
        type: 'success'
      });

      setSelectedPatient(null);
      setShowConfirmationModal(false);
      loadData();
    } catch (e) {
      if (isSilentNetworkError(e)) {
        console.warn('Investigation draft save network error:', e);
        return;
      }
      setToast({ message: e.message || 'Failed to save investigation draft.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenConfirmation = () => {
    if (selectedTestIds.length === 0) {
      setToast({ message: 'Please select at least one laboratory test type.', type: 'error' });
      return;
    }
    if (!validateBP()) return;
    setShowConfirmationModal(true);
  };

  const handleSubmitInvestigation = async () => {
    if (!selectedPatient) return;
    if (selectedTestIds.length === 0) {
      setToast({ message: 'Please select at least one laboratory test type.', type: 'error' });
      return;
    }
    if (!validateBP()) return;

    setSubmitting(true);
    try {
      await api(`/collection/investigation/${selectedPatient._id}`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          laboratoryTests: selectedTestIds,
          symptoms: symptoms.trim(),
          systolicBP: systolicBP ? Number(systolicBP) : null,
          diastolicBP: diastolicBP ? Number(diastolicBP) : null
        })
      });

      setToast({
        message: `Investigation complete for ${selectedPatient.name}. Sent for Payment.`,
        type: 'success'
      });

      setSelectedPatient(null);
      setShowConfirmationModal(false);
      loadData();
    } catch (e) {
      if (isSilentNetworkError(e)) {
        console.warn('Investigation submit network error:', e);
        return;
      }
      setToast({ message: e.message || 'Failed to submit investigation.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page investigation-page">
      <header className="dash-header">
        <div>
          <p className="eyebrow">Sample Collection Workspace</p>
          <h1>Investigation (Self Aware)</h1>
          <p className="intro">Interview Self-Aware patients, conduct symptom assessments, and assign requested laboratory diagnostic test types.</p>
        </div>
        <input
          className="global-input"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="🔍 Search patient ID, name, phone..."
        />
      </header>

      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}

      <div className="table-card" style={{ marginTop: 'var(--space-6)' }}>
        <div className="table-title">
          <div>
            <h2>Patients Waiting for Investigation</h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-on-surface-variant)' }}>
              Self-Aware patients registered at Reception awaiting interview &amp; test selection.
            </span>
          </div>
        </div>

        <div className="sample-types-table-wrapper">
          <table className="sample-types-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Patient ID</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Vital Signs (BP)</th>
                <th>Registration Time</th>
                <th>Branch</th>
                <th>Receptionist</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading waiting investigation queue...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', fontStyle: 'italic' }}>
                    No Self-Aware patients waiting for investigation.
                  </td>
                </tr>
              ) : (
                filteredPatients.map(p => (
                  <tr key={p._id}>
                    <td><strong>{p.name}</strong></td>
                    <td><code>{p.patientId}</code></td>
                    <td>{p.age}</td>
                    <td>{p.sex}</td>
                    <td>{p.phone}</td>
                    <td>{(p.systolicBP || p.diastolicBP) ? <strong style={{ color: 'var(--color-primary)' }}>🫀 {p.systolicBP || '—'}/{p.diastolicBP || '—'} mmHg</strong> : <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>}</td>
                    <td>{new Date(p.registrationDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td><span className="pm-badge">📍 {p.branchName || 'Main'}</span></td>
                    <td>{p.registeredBy?.fullName || '—'}</td>
                    <td>
                      <span className="pm-badge unpaid" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                        Waiting for Investigation
                      </span>
                    </td>
                    <td>
                      <button
                        className="primary-button"
                        onClick={() => handleOpenPatient(p)}
                        style={{ padding: '4px 12px', fontSize: 'var(--text-xs)' }}
                      >
                        🔬 Interview &amp; Select Tests
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ PATIENT INTERVIEW & TEST SELECTION MODAL ═══ */}
      {selectedPatient && (
        <div className="pm-modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !submitting) setSelectedPatient(null); }}>
          <article className="pm-modal" style={{ maxWidth: '960px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}>
            <button className="pm-close" onClick={() => setSelectedPatient(null)} disabled={submitting}>×</button>

            <div style={{ borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '12px', marginBottom: '16px' }}>
              <p className="eyebrow" style={{ margin: 0 }}>PATIENT INVESTIGATION INTERVIEW (SELF AWARE)</p>
              <h2 style={{ margin: '4px 0', color: 'var(--color-primary)' }}>{selectedPatient.name}</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                Patient ID: <code>{selectedPatient.patientId}</code> · Age: {selectedPatient.age} · Sex: {selectedPatient.sex} · Phone: {selectedPatient.phone} · Branch: {selectedPatient.branchName || 'Main'}
              </span>
            </div>

            {/* Patient Symptoms Input */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                🗣️ Patient Symptoms &amp; Clinical History Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Patient reports fever for 3 days, fatigue, and persistent headache..."
                value={symptoms}
                onChange={e => setSymptoms(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px',
                  border: '1px solid var(--color-outline-variant, #cbd5e1)',
                  background: 'var(--color-surface, #ffffff)', color: 'var(--color-on-surface, #0f172a)'
                }}
              />
            </div>

            {/* ═══ VITAL SIGNS (OPTIONAL) ═══ */}
            <div style={{
              background: 'var(--color-surface-container, #f8fafc)',
              border: '1px solid var(--color-outline-variant, #cbd5e1)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🫀</span>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--color-primary, #075c91)' }}>Vital Signs (Optional)</strong>
                </div>
                {(selectedPatient.systolicBP || selectedPatient.diastolicBP) && (
                  <span style={{ fontSize: '0.78rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
                    ✓ Recorded from Registration: {selectedPatient.systolicBP || '—'}/{selectedPatient.diastolicBP || '—'} mmHg
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    min="50"
                    max="300"
                    placeholder="e.g. 120"
                    value={systolicBP}
                    onChange={e => setSystolicBP(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--color-outline-variant, #cbd5e1)', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    min="30"
                    max="200"
                    placeholder="e.g. 80"
                    value={diastolicBP}
                    onChange={e => setDiastolicBP(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--color-outline-variant, #cbd5e1)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Laboratory Test Types Selector */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>
                  🧪 Select Laboratory Test Types
                </h3>
                <input
                  type="text"
                  placeholder="🔍 Search tests by name or category..."
                  value={testSearch}
                  onChange={e => setTestSearch(e.target.value)}
                  style={{
                    padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                    border: '1px solid var(--color-outline-variant, #cbd5e1)', width: '240px',
                    background: 'var(--color-surface, #ffffff)', color: 'var(--color-on-surface)'
                  }}
                />
              </div>

              <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {visibleCategories.map(cat => {
                  const catIdStr = String(cat._id || cat.id);
                  const expanded = expandedCategories.includes(catIdStr);
                  const selectedCount = (cat.tests || []).filter(t => selectedTestIds.includes(String(t._id || t.id || t))).length;
                  const catIcon = categoryIcons[cat.name] || '🧪';

                  return (
                    <section key={catIdStr} className="investigation-cat-card">
                      <button
                        type="button"
                        className="investigation-cat-header"
                        onClick={() => setExpandedCategories(current => expanded ? current.filter(id => id !== catIdStr) : [...current, catIdStr])}
                      >
                        <span className="investigation-cat-icon">{catIcon}</span>
                        <div className="investigation-cat-title-wrap">
                          <span className="investigation-cat-title">{cat.name}</span>
                          {selectedCount > 0 && <span className="investigation-cat-badge">{selectedCount} selected</span>}
                        </div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>{expanded ? '▲' : '▼'}</span>
                      </button>

                      {expanded && (
                        <div className="investigation-test-grid-container" style={{ padding: '12px' }}>
                          {(() => {
                            const tests = cat.tests || [];
                            const hasSubcats = tests.some(t => t.subcategory);
                            if (!hasSubcats) {
                              return (
                                <div className="investigation-test-grid">
                                  {tests.map(test => {
                                    const isSelected = selectedTestIds.includes(String(test._id || test));
                                    const sampleName = (test.requiredSampleTypes || []).map(s => s.name || s).join(', ');
                                    return (
                                      <div
                                        key={test._id}
                                        className={`investigation-test-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleToggleTest(test._id)}
                                      >
                                        <div className="investigation-test-head">
                                          <span className="investigation-test-name">{test.name}</span>
                                          <div className="investigation-check-badge">{isSelected ? '✓' : ''}</div>
                                        </div>
                                        <div className="investigation-test-footer">
                                          <span className="investigation-sample-pill">{sampleName ? `🩸 ${sampleName}` : '🧪 Specimen'}</span>
                                          <span className="investigation-test-price">{ETB(test.price)}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }

                            const subMap = new Map();
                            tests.forEach(test => {
                              const sc = test.subcategory || 'GENERAL';
                              if (!subMap.has(sc)) subMap.set(sc, []);
                              subMap.get(sc).push(test);
                            });

                            return Array.from(subMap.entries()).map(([subName, subTests]) => {
                              const isCbcSub = /^CBC$/i.test(subName) && /^HEMATOLOGY$/i.test(cat.name);
                              const allCbcSelected = subTests.length > 0 && subTests.every(t => selectedTestIds.includes(String(t._id || t.id || t)));
                              const subSelected = subTests.filter(t => selectedTestIds.includes(String(t._id || t.id || t))).length;

                              return (
                                <div key={subName} style={{ marginBottom: '14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 8px 2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-primary, #075c91)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      <span>🏷️</span> {subName} ({subTests.length})
                                    </div>
                                    {subSelected > 0 && (
                                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary, #075c91)', background: '#e0f2fe', padding: '2px 8px', borderRadius: '12px' }}>
                                        {subSelected} selected
                                      </span>
                                    )}
                                  </div>

                                  {isCbcSub && (
                                    <div
                                      className={`investigation-test-card ${allCbcSelected ? 'selected' : ''}`}
                                      style={{
                                        marginBottom: '12px',
                                        padding: '14px 16px',
                                        border: allCbcSelected ? '2px solid var(--color-primary, #075c91)' : '2px dashed #0284c7',
                                        background: allCbcSelected ? '#e0f2fe' : '#f0f9ff',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        boxShadow: allCbcSelected ? '0 2px 8px rgba(7, 92, 145, 0.15)' : 'none'
                                      }}
                                      onClick={() => handleToggleCbcGroup(subTests)}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div className="investigation-check-badge" style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: allCbcSelected ? 'var(--color-primary, #075c91)' : '#ffffff', border: '2px solid var(--color-primary, #075c91)', color: allCbcSelected ? '#ffffff' : 'transparent', fontWeight: 800 }}>
                                          ✓
                                        </div>
                                        <div>
                                          <strong style={{ fontSize: '1rem', color: 'var(--color-primary, #075c91)', display: 'block' }}>
                                            🩸 CBC — Complete Blood Count (Complete Group)
                                          </strong>
                                          <small style={{ color: 'var(--color-on-surface-variant, #475569)', fontSize: '0.8rem', display: 'block', marginTop: '2px' }}>
                                            Single fixed price · Automatically includes all {subTests.length} CBC sub-tests for result entry &amp; reports
                                          </small>
                                        </div>
                                      </div>
                                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary, #075c91)' }}>
                                        {ETB(testSettings.cbcGroupPrice ?? 150)}
                                      </div>
                                    </div>
                                  )}

                                  <div className="investigation-test-grid">
                                    {subTests.map(test => {
                                      const isSelected = selectedTestIds.includes(String(test._id || test));
                                      const sampleName = (test.requiredSampleTypes || []).map(s => s.name || s).join(', ');
                                      return (
                                        <div
                                          key={test._id}
                                          className={`investigation-test-card ${isSelected ? 'selected' : ''}`}
                                          onClick={() => handleToggleTest(test._id)}
                                        >
                                          <div className="investigation-test-head">
                                            <span className="investigation-test-name">{test.name}</span>
                                            <div className="investigation-check-badge">{isSelected ? '✓' : ''}</div>
                                          </div>
                                          <div className="investigation-test-footer">
                                            <span className="investigation-sample-pill">{sampleName ? `🩸 ${sampleName}` : '🧪 Specimen'}</span>
                                            <span className="investigation-test-price">{isCbcSub ? <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Included in CBC</span> : ETB(test.price)}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>

            {/* Live Summary Bar */}
            <div className="investigation-summary-bar">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
                    Selected Laboratory Tests ({selectedTestIds.length}):
                  </span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    Total: {ETB(totalPrice)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" className="secondary-button" onClick={() => setSelectedPatient(null)} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="button" className="secondary-button" onClick={handleSaveDraft} disabled={submitting}>
                    💾 Save Draft
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleOpenConfirmation}
                    disabled={submitting || selectedTestIds.length === 0}
                    style={{ padding: '8px 20px', fontWeight: 700 }}
                  >
                    Review &amp; Send for Payment →
                  </button>
                </div>
              </div>

              {selectedTests.length > 0 && (
                <div className="investigation-summary-chips">
                  {selectedTests.map(t => (
                    <span key={t._id} className="investigation-chip">
                      <span>{t.name}</span>
                      <small style={{ opacity: 0.85 }}>({ETB(t.price)})</small>
                      <span
                        className="investigation-chip-remove"
                        onClick={(e) => { e.stopPropagation(); handleToggleTest(t._id); }}
                        title="Remove test"
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        </div>
      )}

      {/* ═══ CONFIRMATION GLASSMORPHISM MODAL ═══ */}
      {showConfirmationModal && selectedPatient && (
        <div className="investigation-modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !submitting) setShowConfirmationModal(false); }}>
          <article className="investigation-confirm-modal">
            <div className="investigation-confirm-header">
              <h2>📋 Confirm Selected Laboratory Tests</h2>
              <button
                className="manual-stock-close"
                onClick={() => setShowConfirmationModal(false)}
                disabled={submitting}
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="investigation-patient-info-box">
              <div>
                <strong style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Patient Name</strong>
                <strong>{selectedPatient.name}</strong>
              </div>
              <div>
                <strong style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Patient ID</strong>
                <code>{selectedPatient.patientId}</code>
              </div>
              <div>
                <strong style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Registration Time</strong>
                <span>{new Date(selectedPatient.registrationDate).toLocaleString()}</span>
              </div>
              <div>
                <strong style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Branch &amp; Receptionist</strong>
                <span>📍 {selectedPatient.branchName || 'Main'} ({selectedPatient.registeredBy?.fullName || 'Reception'})</span>
              </div>
              {symptoms && (
                <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed var(--color-outline-variant)', paddingTop: '6px', marginTop: '2px' }}>
                  <strong style={{ textTransform: 'uppercase', fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Recorded Symptoms: </strong>
                  <em>{symptoms}</em>
                </div>
              )}
            </div>

            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--color-primary)' }}>
              Selected Test Types ({selectedTests.length}):
            </div>

            <div className="investigation-confirm-list">
              {(() => {
                const cbcTests = selectedTests.filter(isCbcTest);
                const nonCbcTests = selectedTests.filter(t => !isCbcTest(t));

                return (
                  <>
                    {cbcTests.length > 0 && (
                      <div className="investigation-confirm-row" style={{ background: '#f0f9ff', borderLeft: '3px solid var(--color-primary, #075c91)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>🩸</span>
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-primary, #075c91)' }}>
                              CBC — Complete Blood Count ({cbcTests.length} parameters)
                            </strong>
                            <small style={{ color: 'var(--color-on-surface-variant)' }}>
                              HEMATOLOGY · Complete CBC Equipment Test
                            </small>
                          </div>
                        </div>
                        <strong style={{ color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                          {ETB(testSettings.cbcGroupPrice ?? 150)}
                        </strong>
                      </div>
                    )}
                    {nonCbcTests.map(t => {
                      const icon = categoryIcons[t.categoryName] || '🧪';
                      const samplesText = (t.requiredSampleTypes || []).map(s => s.name || s).join(', ');

                      return (
                        <div key={t._id} className="investigation-confirm-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.9rem' }}>{t.name}</strong>
                              <small style={{ color: 'var(--color-on-surface-variant)' }}>
                                {t.categoryName} {samplesText ? `· 🩸 Specimen: ${samplesText}` : ''}
                              </small>
                            </div>
                          </div>
                          <strong style={{ color: 'var(--color-primary)', fontSize: '0.92rem' }}>{ETB(t.price)}</strong>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>

            <div className="investigation-confirm-footer">
              <div>
                <small style={{ display: 'block', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>GRAND TOTAL BILL</small>
                <strong style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>{ETB(totalPrice)}</strong>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowConfirmationModal(false)}
                  disabled={submitting}
                  style={{ padding: '9px 18px', fontWeight: 600 }}
                >
                  ← Back to Edit
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleSubmitInvestigation}
                  disabled={submitting}
                  style={{ padding: '9px 24px', fontWeight: 700 }}
                >
                  {submitting ? 'Sending...' : 'Send to Payment →'}
                </button>
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
