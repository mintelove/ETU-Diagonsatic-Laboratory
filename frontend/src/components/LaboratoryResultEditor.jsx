import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FlagBadge, calculateFlag } from '../utils/flagHelper.jsx';

const CATEGORY_META = {
  'HEMATOLOGY': { icon: '🩸', themeClass: 'cat-theme-hematology', bgGradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
  'CLINICAL CHEMISTRY': { icon: '🧪', themeClass: 'cat-theme-chemistry', bgGradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' },
  'CHEMISTRY': { icon: '🧪', themeClass: 'cat-theme-chemistry', bgGradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' },
  'URINALYSIS': { icon: '🟡', themeClass: 'cat-theme-urinalysis', bgGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' },
  'URINE ANALYSIS': { icon: '🟡', themeClass: 'cat-theme-urinalysis', bgGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' },
  'PARASITOLOGY': { icon: '🔬', themeClass: 'cat-theme-parasitology', bgGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' },
  'MICROBIOLOGY': { icon: '🧫', themeClass: 'cat-theme-microbiology', bgGradient: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)' },
  'SEROLOGY': { icon: '🧬', themeClass: 'cat-theme-serology', bgGradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' },
  'HORMONE': { icon: '🏥', themeClass: 'cat-theme-hormone', bgGradient: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' },
  'HORMONES': { icon: '🏥', themeClass: 'cat-theme-hormone', bgGradient: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' },
  'COAGULATION': { icon: '🩸', themeClass: 'cat-theme-coagulation', bgGradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' },
  'REFERRAL': { icon: '🩺', themeClass: 'cat-theme-referral', bgGradient: 'linear-gradient(135deg, #6b7280 0%, #374151 100%)' },
  'OTHER': { icon: '📦', themeClass: 'cat-theme-other', bgGradient: 'linear-gradient(135deg, #475569 0%, #334155 100%)' }
};

function getCategoryMeta(catName) {
  const norm = String(catName || '').trim().toUpperCase();
  for (const [key, meta] of Object.entries(CATEGORY_META)) {
    if (norm.includes(key) || key.includes(norm)) return meta;
  }
  return CATEGORY_META['OTHER'];
}

export default function LaboratoryResultEditor({
  patient,
  catalog = [],
  reportData,
  onChange,
  onSaveDraft,
  onGeneratePreview,
  onSubmitApproval,
  busy,
  isSavingDraft,
  isGeneratingPreview,
  isSubmitting,
  // Equipment mode props
  equipmentData = { equipment: [], equipmentDetails: {} },
  onPickEquipment,
  otherOpen,
  setOtherOpen,
  otherEquipmentForm,
  onAddOtherEquipment
}) {
  const [entryMode, setEntryMode] = useState('result'); // 'result' (default) or 'equipment'
  const [selectedCategories, setSelectedCategories] = useState([]); // Array of selected categories to display in selection order
  const [urinalysisSubTab, setUrinalysisSubTab] = useState('Chemical Analysis');
  const inputsRef = useRef([]);

  // Map patient's requested test names & categories
  const requestedInfo = useMemo(() => {
    if (!patient || !Array.isArray(patient.laboratoryTests)) {
      return { names: new Set(), categories: new Set() };
    }
    const names = new Set();
    const categories = new Set();
    patient.laboratoryTests.forEach(t => {
      if (typeof t === 'string') {
        names.add(t);
      } else if (typeof t === 'object' && t) {
        if (t.name) names.add(t.name);
        const catName = t.category?.name || '';
        if (catName) categories.add(catName.toUpperCase());
      }
    });
    return { names, categories };
  }, [patient]);

  // Group catalog parameters by category
  const categoriesGrouped = useMemo(() => {
    const map = new Map();
    (catalog || []).forEach(p => {
      const cat = p.category || 'OTHER';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(p);
    });
    return map;
  }, [catalog]);

  const categoryList = useMemo(() => Array.from(categoriesGrouped.keys()), [categoriesGrouped]);

  // Auto-select ALL categories containing requested tests on load
  useEffect(() => {
    if (categoryList.length > 0 && selectedCategories.length === 0) {
      const requestedCats = categoryList.filter(c => {
        const norm = c.toUpperCase();
        return Array.from(requestedInfo.categories).some(rc => norm.includes(rc) || rc.includes(norm));
      });
      if (requestedCats.length > 0) {
        setSelectedCategories(requestedCats);
      } else {
        setSelectedCategories([categoryList[0]]);
      }
    }
  }, [categoryList, requestedInfo, selectedCategories.length]);

  // Toggle category selection in selection order
  const toggleCategory = (catName) => {
    setSelectedCategories(prev => {
      if (prev.includes(catName)) {
        return prev.filter(c => c !== catName);
      } else {
        return [...prev, catName];
      }
    });
  };

  // Handle result changes
  const handleResultChange = (paramName, field, value, defaultUnit = '', defaultRef = '') => {
    const results = Array.isArray(reportData?.results) ? [...reportData.results] : [];
    const index = results.findIndex(r => r.sampleName === paramName);

    if (index >= 0) {
      const updated = { ...results[index], [field]: value };
      if (field === 'result') {
        updated.flag = calculateFlag(value, updated.referenceValue || defaultRef);
      }
      results[index] = updated;
    } else {
      const newItem = {
        sampleName: paramName,
        result: field === 'result' ? value : '',
        unit: field === 'unit' ? value : defaultUnit,
        referenceValue: field === 'referenceValue' ? value : defaultRef,
        remarks: field === 'remarks' ? value : '',
        flag: field === 'result' ? calculateFlag(value, defaultRef) : ''
      };
      results.push(newItem);
    }
    onChange({ ...reportData, results });
  };

  // Helper to add custom row
  const handleAddCustomRow = () => {
    const results = Array.isArray(reportData?.results) ? [...reportData.results] : [];
    results.push({
      sampleName: '',
      result: '',
      unit: '',
      referenceValue: '',
      remarks: '',
      flag: ''
    });
    onChange({ ...reportData, results });
  };

  // Helper to remove row
  const handleRemoveRow = (index) => {
    const results = Array.isArray(reportData?.results) ? [...reportData.results] : [];
    results.splice(index, 1);
    onChange({ ...reportData, results });
  };

  // Quick lookup helper for result item
  const getResultItem = (paramName, defaultUnit = '', defaultRef = '') => {
    const item = (reportData?.results || []).find(r => r.sampleName === paramName);
    return {
      result: item?.result || '',
      unit: item?.unit || defaultUnit,
      referenceValue: item?.referenceValue || defaultRef,
      flag: item?.flag || (item?.result ? calculateFlag(item.result, item?.referenceValue || defaultRef) : ''),
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

  let inputCounter = 0;

  return (
    <div className="lims-result-entry-system" style={{ marginTop: '16px' }}>
      
      {/* RESULT ENTRY MODE TOGGLE BAR */}
      <div className="mode-toggle-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'var(--card-bg, #ffffff)', padding: '12px 18px', borderRadius: '14px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--card-border, #e2e8f0)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary, #0f172a)' }}>Result Entry Mode:</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>({selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} active)</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--color-surface-dim, #f1f5f9)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            className={entryMode === 'result' ? 'primary' : 'secondary'}
            onClick={() => setEntryMode('result')}
            style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', border: 'none' }}
          >
            🧪 Multi-Category Result Mode (Default)
          </button>
          <button
            type="button"
            className={entryMode === 'equipment' ? 'primary' : 'secondary'}
            onClick={() => setEntryMode('equipment')}
            style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', border: 'none' }}
          >
            ⚙ Equipment Mode (Optional)
          </button>
        </div>
      </div>

      {/* MODE 2: EQUIPMENT MODE */}
      {entryMode === 'equipment' && (
        <div className="equipment-mode-section">
          {/* Equipment Selection Heading & Cards Grid */}
          <div className="equipment-heading">
            <div>
              <p className="eyebrow">Analyzer selection</p>
              <h3>Equipment used</h3>
            </div>
            <span>{reportData.equipment?.length || 0} selected</span>
          </div>

          <div className="equipment-card-grid" style={{ marginBottom: '20px' }}>
            {(equipmentData.equipment || []).map(name => {
              const detail = equipmentData.equipmentDetails?.[name] || {};
              const isChosen = (reportData.equipment || []).includes(name);
              return (
                <button
                  type="button"
                  key={name}
                  className={`equipment-card ${isChosen ? 'chosen' : ''}`}
                  onClick={() => onPickEquipment(name)}
                >
                  <i>{detail.icon || '🧪'}</i>
                  <span>
                    <strong>{name}</strong>
                    <small>{detail.type}</small>
                    <em>{detail.manufacturer} · {detail.automation}</em>
                  </span>
                  <b>{detail.parameterCount || 0} parameters</b>
                </button>
              );
            })}
            <button type="button" className="equipment-card other" onClick={() => setOtherOpen(true)}>
              <i>＋</i>
              <span>
                <strong>Other Equipment</strong>
                <small>Register a custom analyzer</small>
                <em>Unlimited custom parameters</em>
              </span>
            </button>
          </div>

          {/* Other Equipment Form */}
          {otherOpen && otherEquipmentForm}

          {/* Restored Equipment Parameter Results Table */}
          <div className="result-editor-head" style={{ marginTop: '24px' }}>
            <div>
              <h3>Equipment Parameters</h3>
              <p>Parameters populated by selected laboratory equipment analyzer.</p>
            </div>
            <button type="button" className="secondary" onClick={handleAddCustomRow}>
              ＋ Add Parameter
            </button>
          </div>

          <div className="professional-results" style={{ marginBottom: '24px' }}>
            {Array.isArray(reportData.results) && reportData.results.length > 0 ? (
              reportData.results.map((row, i) => {
                const flag = row.flag || calculateFlag(row.result, row.referenceValue);
                const currentIndex = inputCounter++;
                return (
                  <article className="parameter-row" key={i}>
                    <label>
                      Parameter
                      <input
                        value={row.sampleName || ''}
                        onChange={e => {
                          const results = [...reportData.results];
                          results[i] = { ...results[i], sampleName: e.target.value };
                          onChange({ ...reportData, results });
                        }}
                      />
                    </label>
                    <label>
                      Result
                      <input
                        ref={el => (inputsRef.current[currentIndex] = el)}
                        value={row.result || ''}
                        onKeyDown={e => handleKeyDown(e, currentIndex)}
                        onChange={e => {
                          const results = [...reportData.results];
                          const val = e.target.value;
                          results[i] = { ...results[i], result: val, flag: calculateFlag(val, results[i].referenceValue) };
                          onChange({ ...reportData, results });
                        }}
                      />
                    </label>
                    <label>
                      SI Unit
                      <input
                        value={row.unit || ''}
                        onChange={e => {
                          const results = [...reportData.results];
                          results[i] = { ...results[i], unit: e.target.value };
                          onChange({ ...reportData, results });
                        }}
                      />
                    </label>
                    <label>
                      Reference Range
                      <input
                        value={row.referenceValue || ''}
                        onChange={e => {
                          const results = [...reportData.results];
                          results[i] = { ...results[i], referenceValue: e.target.value };
                          onChange({ ...reportData, results });
                        }}
                      />
                    </label>
                    <span className={`flag-badge ${flag || 'blank'}`}>
                      <FlagBadge flag={flag} result={row.result} referenceValue={row.referenceValue} />
                    </span>
                    <button type="button" className="remove-parameter" onClick={() => handleRemoveRow(i)}>
                      ×
                    </button>
                    <label className="parameter-remarks">
                      Remarks
                      <input
                        value={row.remarks || ''}
                        onChange={e => {
                          const results = [...reportData.results];
                          results[i] = { ...results[i], remarks: e.target.value };
                          onChange({ ...reportData, results });
                        }}
                      />
                    </label>
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
          
          {/* 10 DECORATED MAIN CATEGORY SELECTION CARDS */}
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
              const isRequested = paramsInCat.some(p => requestedInfo.names.has(p.parameterName)) ||
                Array.from(requestedInfo.categories).some(rc => catName.toUpperCase().includes(rc) || rc.includes(catName.toUpperCase()));

              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() => toggleCategory(catName)}
                  className={`lims-cat-card ${meta.themeClass} ${isSelected ? 'selected' : ''}`}
                >
                  <div className="lims-cat-card-header">
                    <div className="lims-cat-icon-title">
                      <span className="lims-cat-icon">{meta.icon}</span>
                      <span className="lims-cat-title">{catName}</span>
                    </div>
                    <span className="lims-cat-badge-select">
                      {isSelected ? '✓' : '+'}
                    </span>
                  </div>

                  <div className="lims-cat-card-footer">
                    <span>{paramsInCat.length} parameters</span>
                    {isRequested && (
                      <span className="lims-cat-req-badge">★ Requested</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* RENDER INDEPENDENT RESULT SECTIONS FOR EVERY SELECTED CATEGORY */}
          {selectedCategories.length > 0 ? (
            selectedCategories.map(catName => {
              const meta = getCategoryMeta(catName);
              const rawParams = categoriesGrouped.get(catName) || [];
              const catParams = (catName === 'URINALYSIS' || catName === 'URINE ANALYSIS')
                ? rawParams.filter(p => (p.subcategory || 'Chemical Analysis') === urinalysisSubTab)
                : rawParams;

              return (
                <div key={catName} className="lims-category-section-card">
                  
                  {/* Category Header with Gradient */}
                  <div className="lims-category-section-header" style={{ background: meta.bgGradient }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>{catName}</h3>
                        <small style={{ opacity: 0.9, fontSize: '0.78rem', color: '#ffffff' }}>{rawParams.length} parameters in this investigation category</small>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Urinalysis Subtabs if active */}
                      {(catName === 'URINALYSIS' || catName === 'URINE ANALYSIS') && (
                        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.2)', padding: '3px', borderRadius: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setUrinalysisSubTab('Chemical Analysis')}
                            style={{ padding: '4px 10px', fontSize: '0.76rem', fontWeight: 700, borderRadius: '6px', background: urinalysisSubTab === 'Chemical Analysis' ? '#ffffff' : 'transparent', color: urinalysisSubTab === 'Chemical Analysis' ? '#0f172a' : '#ffffff', border: 'none', cursor: 'pointer' }}
                          >
                            Chemical Analysis
                          </button>
                          <button
                            type="button"
                            onClick={() => setUrinalysisSubTab('Urine Microscopy')}
                            style={{ padding: '4px 10px', fontSize: '0.76rem', fontWeight: 700, borderRadius: '6px', background: urinalysisSubTab === 'Urine Microscopy' ? '#ffffff' : 'transparent', color: urinalysisSubTab === 'Urine Microscopy' ? '#0f172a' : '#ffffff', border: 'none', cursor: 'pointer' }}
                          >
                            Urine Microscopy
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleAddCustomRow}
                        style={{ background: 'rgba(255,255,255,0.25)', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ＋ Add Parameter
                      </button>
                    </div>
                  </div>

                  {/* Parameter Table */}
                  <div className="lims-table-container" style={{ overflowX: 'auto', padding: '16px' }}>
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
                        {catParams.map(paramObj => {
                          const pName = paramObj.parameterName;
                          const rowData = getResultItem(pName, paramObj.unit, paramObj.referenceValue);
                          const isOrdered = requestedInfo.names.has(pName);
                          const currentIndex = inputCounter++;

                          return (
                            <tr key={pName} className={`lims-param-row ${isOrdered ? 'is-ordered' : ''}`}>
                              
                              {/* Parameter Name */}
                              <td style={{ padding: '10px 12px' }}>
                                <strong className="param-title">
                                  {pName}
                                  {isOrdered && <span className="param-req-badge">Requested</span>}
                                </strong>
                              </td>

                              {/* Result Input */}
                              <td style={{ padding: '6px 12px' }}>
                                <input
                                  ref={el => (inputsRef.current[currentIndex] = el)}
                                  type="text"
                                  className="lims-result-input"
                                  value={rowData.result}
                                  placeholder="Enter result"
                                  onKeyDown={e => handleKeyDown(e, currentIndex)}
                                  onChange={e => handleResultChange(pName, 'result', e.target.value, paramObj.unit, paramObj.referenceValue)}
                                  style={{
                                    border: rowData.flag === 'H' ? '2px solid #ef4444' : rowData.flag === 'L' ? '2px solid #eab308' : undefined
                                  }}
                                />
                              </td>

                              {/* SI Unit */}
                              <td style={{ padding: '6px 12px' }}>
                                <input
                                  type="text"
                                  className="lims-unit-input"
                                  value={rowData.unit}
                                  placeholder={paramObj.unit || '—'}
                                  onChange={e => handleResultChange(pName, 'unit', e.target.value, paramObj.unit, paramObj.referenceValue)}
                                />
                              </td>

                              {/* Reference Range */}
                              <td style={{ padding: '6px 12px' }}>
                                <input
                                  type="text"
                                  className="lims-ref-input"
                                  value={rowData.referenceValue}
                                  placeholder={paramObj.referenceValue || '—'}
                                  onChange={e => handleResultChange(pName, 'referenceValue', e.target.value, paramObj.unit, paramObj.referenceValue)}
                                />
                              </td>

                              {/* Automatic Flag Badge */}
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <FlagBadge flag={rowData.flag} result={rowData.result} referenceValue={rowData.referenceValue} />
                              </td>

                              {/* Remarks */}
                              <td style={{ padding: '6px 12px' }}>
                                <input
                                  type="text"
                                  className="lims-remarks-input"
                                  value={rowData.remarks}
                                  placeholder="Remarks..."
                                  onChange={e => handleResultChange(pName, 'remarks', e.target.value, paramObj.unit, paramObj.referenceValue)}
                                />
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

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

      {/* Technician Comments */}
      <div className="lims-comments-box">
        <label>
          Collector / Technologist Comments
        </label>
        <textarea
          value={reportData.comments || ''}
          placeholder="Add clinical observations, specimen conditions, or technologist notes..."
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
