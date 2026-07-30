import React, { useState, useEffect, useMemo, useRef } from 'react';
import { calculateFlag } from '../utils/flagHelper.jsx';

export function LaboratoryResultEditor({
  patient,
  catalog,
  equipmentData,
  reportData,
  onReportChange,
  isSubmitting,
  onSaveDraft,
  onGeneratePreview,
  onSubmitApproval,
  previewReport
}) {
  // Mode selection: 'result' (Mode 1 - Default) or 'equipment' (Mode 2 - Optional)
  const [mode, setMode] = useState('result');
  const [categories, setCategories] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [openCategories, setOpenCategories] = useState({});
  const [urinalysisTab, setUrinalysisTab] = useState('chemical'); // 'chemical' or 'microscopy'
  const [otherEquipOpen, setOtherEquipOpen] = useState(false);
  const [otherEquipForm, setOtherEquipForm] = useState({ name: '', manufacturer: '', model: '', department: '', remarks: '' });
  const inputsRef = useRef([]);

  // Fetch Parameter Catalog from backend
  useEffect(() => {
    async function fetchCatalog() {
      try {
        setLoadingCatalog(true);
        const res = await fetch('/api/report-entry/catalog', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('etu_token') || ''}`
          }
        });
        const data = await res.json();
        if (res.ok && data.categories) {
          setCategories(data.categories);
          // Expand categories by default
          const initialOpen = {};
          data.categories.forEach(cat => {
            initialOpen[cat.name] = true;
          });
          setOpenCategories(initialOpen);
        }
      } catch (err) {
        console.error('Failed to load laboratory parameter catalog:', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    fetchCatalog();
  }, []);

  const resultsMap = useMemo(() => {
    const map = new Map();
    (reportData?.results || []).forEach((r, idx) => {
      if (r && r.sampleName) {
        map.set(r.sampleName, { ...r, index: idx });
      }
    });
    return map;
  }, [reportData?.results]);

  const handleResultChange = (paramName, field, value, unit = '', referenceValue = '', normalMin = null, normalMax = null) => {
    const currentResults = [...(reportData?.results || [])];
    const existingIndex = currentResults.findIndex(r => r.sampleName === paramName);

    let updatedItem;
    if (existingIndex >= 0) {
      updatedItem = { ...currentResults[existingIndex], [field]: value };
    } else {
      updatedItem = {
        sampleName: paramName,
        result: field === 'result' ? value : '',
        unit: unit || '',
        referenceValue: referenceValue || '',
        remarks: field === 'remarks' ? value : '',
        flag: ''
      };
    }

    // Auto calculate flag whenever result changes
    if (updatedItem.result !== '') {
      let calcFlag = '';
      const numVal = Number(String(updatedItem.result).replace(',', '.'));
      if (Number.isFinite(numVal)) {
        if (typeof normalMin === 'number' && numVal < normalMin) calcFlag = 'L';
        else if (typeof normalMax === 'number' && numVal > normalMax) calcFlag = 'H';
        else calcFlag = calculateFlag(updatedItem.result, updatedItem.referenceValue);
      } else {
        calcFlag = calculateFlag(updatedItem.result, updatedItem.referenceValue);
      }
      updatedItem.flag = calcFlag;
    } else {
      updatedItem.flag = '';
    }

    if (existingIndex >= 0) {
      currentResults[existingIndex] = updatedItem;
    } else {
      currentResults.push(updatedItem);
    }

    onReportChange({ ...reportData, results: currentResults });
  };

  const toggleCategory = (catName) => {
    setOpenCategories(prev => ({ ...prev, [catName]: !prev[catName] }));
  };

  // Keyboard navigation: Enter or Down Arrow moves to next input box
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = inputsRef.current[index + 1];
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = inputsRef.current[index - 1];
      if (prevInput) prevInput.focus();
    }
  };

  // Equipment Mode handlers
  const toggleEquipment = (eqName) => {
    const isSelected = (reportData.equipment || []).includes(eqName);
    const eqParams = equipmentData?.parameters?.[eqName] || [];
    const newEqList = isSelected
      ? (reportData.equipment || []).filter(e => e !== eqName)
      : [...(reportData.equipment || []), eqName];

    let newResults = [...(reportData.results || [])];
    if (isSelected) {
      newResults = newResults.filter(r => !eqParams.some(p => p.sampleName === r.sampleName));
    } else {
      eqParams.forEach(p => {
        if (!newResults.some(r => r.sampleName === p.sampleName)) {
          newResults.push({
            sampleName: p.sampleName,
            result: '',
            unit: p.unit || '',
            referenceValue: p.referenceValue || '',
            remarks: '',
            flag: ''
          });
        }
      });
    }

    onReportChange({ ...reportData, equipment: newEqList, results: newResults });
  };

  const handleAddOtherEquipment = () => {
    if (!otherEquipForm.name.trim()) return;
    const nameStr = `Other Equipment: ${otherEquipForm.name}${otherEquipForm.model ? ` (${otherEquipForm.model})` : ''}`;
    const newEq = [...(reportData.equipment || []), nameStr];
    onReportChange({ ...reportData, equipment: newEq });
    setOtherEquipOpen(false);
    setOtherEquipForm({ name: '', manufacturer: '', model: '', department: '', remarks: '' });
  };

  let globalInputIndex = 0;

  return (
    <div className="lims-result-editor-container">
      {/* Mode Switcher Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '12px 18px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Result Entry Mode</span>
          <h3 style={{ margin: '2px 0 0', fontSize: '1.05rem', color: '#075c91', fontWeight: 700 }}>
            {mode === 'result' ? '🧪 Laboratory Result Mode' : '⚙ Equipment Mode'}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            className={mode === 'result' ? 'primary' : 'secondary'}
            onClick={() => setMode('result')}
            style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px' }}
          >
            🧪 Laboratory Result Mode
          </button>
          <button
            type="button"
            className={mode === 'equipment' ? 'primary' : 'secondary'}
            onClick={() => setMode('equipment')}
            style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px' }}
          >
            ⚙ Equipment Mode
          </button>
        </div>
      </div>

      {/* MODE 1: LABORATORY RESULT MODE (DEFAULT) */}
      {mode === 'result' && (
        <div className="lims-result-mode">
          {loadingCatalog ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px' }}>
              <div className="lims-spinner" style={{ width: '36px', height: '36px', margin: '0 auto 12px', border: '3px solid #e2e8f0', borderTopColor: '#075c91', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading ETU Laboratory Parameter Catalog…</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {categories.map((cat) => {
                const isOpen = openCategories[cat.name] !== false;
                const isUrinalysis = cat.name.toUpperCase() === 'URINALYSIS';

                // Filter urinalysis parameters by tab
                let displayParams = cat.parameters || [];
                if (isUrinalysis) {
                  displayParams = (cat.parameters || []).filter(p => {
                    const sub = (p.subcategory || '').toLowerCase();
                    return urinalysisTab === 'chemical'
                      ? sub.includes('chemical') || !sub
                      : sub.includes('microscopy');
                  });
                }

                return (
                  <div key={cat.name} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                    {/* Collapsible Card Header */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.name)}
                      style={{ width: '100%', padding: '14px 20px', background: '#f8fafc', border: 'none', borderBottom: isOpen ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.1rem' }}>🩸</span>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{cat.name}</strong>
                        <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                          {cat.parameters?.length || 0} parameters
                        </span>
                      </div>
                      <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{isOpen ? '▲' : '▼'}</span>
                    </button>

                    {isOpen && (
                      <div style={{ padding: '16px 20px' }}>
                        {/* Urinalysis Dual Tabs */}
                        {isUrinalysis && (
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setUrinalysisTab('chemical')}
                              style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: urinalysisTab === 'chemical' ? '#075c91' : '#f1f5f9', color: urinalysisTab === 'chemical' ? '#fff' : '#334155', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                              🧪 Chemical Analysis
                            </button>
                            <button
                              type="button"
                              onClick={() => setUrinalysisTab('microscopy')}
                              style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: urinalysisTab === 'microscopy' ? '#075c91' : '#f1f5f9', color: urinalysisTab === 'microscopy' ? '#fff' : '#334155', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                              🔬 Urine Microscopy
                            </button>
                          </div>
                        )}

                        {/* Parameter Table */}
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead>
                              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                                <th style={{ padding: '10px 12px', width: '28%', color: '#334155', fontWeight: 700 }}>Parameter / Test</th>
                                <th style={{ padding: '10px 12px', width: '25%', color: '#334155', fontWeight: 700 }}>Result</th>
                                <th style={{ padding: '10px 12px', width: '15%', color: '#334155', fontWeight: 700 }}>SI Unit</th>
                                <th style={{ padding: '10px 12px', width: '20%', color: '#334155', fontWeight: 700 }}>Reference Range</th>
                                <th style={{ padding: '10px 12px', width: '12%', color: '#334155', fontWeight: 700, textAlign: 'center' }}>Flag</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayParams.map((p) => {
                                const existing = resultsMap.get(p.parameterName) || {};
                                const currentVal = existing.result !== undefined ? existing.result : '';
                                const currentFlag = existing.flag || '';
                                const inputIndex = globalInputIndex++;

                                return (
                                  <tr key={p._id || p.parameterName} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px 12px' }}>
                                      <strong style={{ color: '#0f172a' }}>{p.parameterName}</strong>
                                      {p.subcategory && <small style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>{p.subcategory}</small>}
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <input
                                        ref={el => inputsRef.current[inputIndex] = el}
                                        type="text"
                                        value={currentVal}
                                        onChange={(e) => handleResultChange(p.parameterName, 'result', e.target.value, p.unit, p.referenceValue, p.normalMin, p.normalMax)}
                                        onKeyDown={(e) => handleKeyDown(e, inputIndex)}
                                        placeholder="Enter result..."
                                        style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600, color: '#075c91', outline: 'none' }}
                                      />
                                    </td>
                                    <td style={{ padding: '8px 12px', color: '#475569' }}>{p.unit || '—'}</td>
                                    <td style={{ padding: '8px 12px', color: '#475569' }}>{p.referenceValue || '—'}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                      {currentFlag ? (
                                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, background: currentFlag === 'H' ? '#fee2e2' : currentFlag === 'L' ? '#fef3c7' : '#dcfce7', color: currentFlag === 'H' ? '#dc2626' : currentFlag === 'L' ? '#d97706' : '#16a34a' }}>
                                          {currentFlag === 'H' ? 'High (H)' : currentFlag === 'L' ? 'Low (L)' : 'Normal (N)'}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: EQUIPMENT MODE (OPTIONAL) */}
      {mode === 'equipment' && (
        <div className="lims-equipment-mode" style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: 0, color: '#075c91' }}>⚙ Equipment Selection</h4>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>Select automated laboratory equipment to map parameters into this report.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {(equipmentData?.equipment || []).map(eqName => {
              const detail = equipmentData?.equipmentDetails?.[eqName] || {};
              const isSelected = (reportData.equipment || []).includes(eqName);
              return (
                <button
                  key={eqName}
                  type="button"
                  onClick={() => toggleEquipment(eqName)}
                  style={{ padding: '14px', borderRadius: '10px', border: isSelected ? '2px solid #075c91' : '1px solid #e2e8f0', background: isSelected ? '#f0f9ff' : '#f8fafc', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: '10px', alignItems: 'center' }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{detail.icon || '🧪'}</span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a' }}>{eqName}</strong>
                    <small style={{ color: '#64748b', fontSize: '0.75rem' }}>{detail.type || 'Analyzer'}</small>
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setOtherEquipOpen(true)}
              style={{ padding: '14px', borderRadius: '10px', border: '1px dashed #075c91', background: '#ffffff', cursor: 'pointer', textAlign: 'center', color: '#075c91', fontWeight: 600, fontSize: '0.88rem' }}
            >
              ＋ Register Custom Equipment
            </button>
          </div>

          {otherEquipOpen && (
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px' }}>Register Custom Analyzer</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                <input type="text" placeholder="Equipment Name *" value={otherEquipForm.name} onChange={e => setOtherEquipForm({ ...otherEquipForm, name: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <input type="text" placeholder="Manufacturer" value={otherEquipForm.manufacturer} onChange={e => setOtherEquipForm({ ...otherEquipForm, manufacturer: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <input type="text" placeholder="Model" value={otherEquipForm.model} onChange={e => setOtherEquipForm({ ...otherEquipForm, model: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="primary" onClick={handleAddOtherEquipment}>Add Equipment</button>
                <button type="button" className="secondary" onClick={() => setOtherEquipOpen(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collector Comments Section */}
      <div style={{ marginTop: '20px', background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '6px', fontSize: '0.88rem' }}>
          Collector Comments / Pathologist Notes
        </label>
        <textarea
          rows="3"
          value={reportData.comments || ''}
          onChange={(e) => onReportChange({ ...reportData, comments: e.target.value })}
          placeholder="Add any sample collection or observation notes here..."
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
        />
      </div>

      {/* Form Action Controls */}
      <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" className="secondary" disabled={isSubmitting} onClick={onSaveDraft}>
          💾 Save Draft
        </button>
        <button type="button" className="secondary" disabled={isSubmitting} onClick={onGeneratePreview}>
          👁 Preview Report
        </button>
        <button type="button" className="primary" disabled={isSubmitting || !previewReport} onClick={onSubmitApproval}>
          🚀 Submit for Approval
        </button>
      </div>
    </div>
  );
}

export default LaboratoryResultEditor;
