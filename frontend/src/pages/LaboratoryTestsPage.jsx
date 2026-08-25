import { useEffect, useMemo, useState } from 'react';
import { api, isSilentNetworkError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { FlagBadge } from '../utils/flagHelper.jsx';

const blank = { name: '', category: '', price: 600, description: '', requiredSampleTypes: [], consumables: [] };
const palette = [
  ['#8c1d2c', '#d95062', '🩸'],
  ['#075c91', '#1d9fce', '🧪'],
  ['#007c79', '#28aea4', '💧'],
  ['#26743a', '#65b96e', '🔬'],
  ['#633b92', '#9a70ca', '🦠'],
  ['#ad5d11', '#e99b39', '🧫'],
  ['#293d81', '#6378c2', '🏥'],
  ['#52616b', '#87949d', '⚕️']
];

const keyFor = name => {
  const normalized = (name || '').toLowerCase();
  if (normalized.includes('hema')) return 0;
  if (normalized.includes('chem') || normalized.includes('assay')) return 1;
  if (normalized.includes('urine') || normalized.includes('fluid')) return 2;
  if (normalized.includes('paras')) return 3;
  if (normalized.includes('micro')) return 4;
  if (normalized.includes('serol')) return 5;
  if (normalized.includes('referral')) return 6;
  return 7;
};

const DEFAULT_ANALYZERS = [
  'Mindray BC-3000Plus (Hematology)',
  'Mindray BS-120 (Chemistry)',
  'K-Lyte 8 (Electrolytes)',
  'Finecare HbA1c Reader',
  'Semi-Automatic Coagulation Analyzer',
  'Manual / Microscopy / Rapid Strip',
  'Immunoassay Reader',
  'External Referral Laboratory'
];

const SPECIMEN_TYPES = [
  'Serum',
  'EDTA Whole Blood',
  'Citrated Plasma',
  'Fluoride Oxalate Plasma',
  'Urine',
  'Stool',
  'Semen',
  'CSF',
  'Pleural Fluid',
  'Peritoneal Fluid',
  'Synovial Fluid',
  'Swab / Smear',
  'Other Specimen'
];

const RESULT_TYPES = [
  'Numeric',
  'Qualitative',
  'Text',
  'Percentage',
  'Positive/Negative',
  'Normal/Abnormal',
  'Reactive/Non-Reactive',
  'Time',
  'Date',
  'Categorical Decision Threshold'
];

const REFERENCE_SOURCES = [
  'Manufacturer Reagent Insert',
  'Analyzer Manual',
  'CLSI EP28 (Verified Range)',
  'WHO Guidelines',
  'ADA Diagnostic Criteria',
  'Laboratory-Verified Local Interval',
  'Clinical Decision Threshold',
  'Other Approved Source'
];

export const getCategoryDefaultAnalyzer = (catName = '') => {
  const norm = (catName || '').toUpperCase();
  if (norm.includes('HEMA')) return 'Mindray BC-3000Plus (Hematology)';
  if (norm.includes('CHEM') || norm.includes('ASSAY') || norm.includes('LIPID') || norm.includes('LIVER') || norm.includes('RENAL')) return 'Mindray BS-120 (Chemistry)';
  if (norm.includes('ELECTROL')) return 'K-Lyte 8 (Electrolytes)';
  if (norm.includes('SUGAR') || norm.includes('DIABETIC') || norm.includes('HBA1C') || norm.includes('DM')) return 'Finecare HbA1c Reader';
  if (norm.includes('COAGUL')) return 'Semi-Automatic Coagulation Analyzer';
  if (norm.includes('URIN')) return 'Manual / Microscopy / Rapid Strip';
  if (norm.includes('PARASIT') || norm.includes('STOOL') || norm.includes('SEMEN') || norm.includes('MICROBIOL')) return 'Manual / Microscopy / Rapid Strip';
  if (norm.includes('SEROL') || norm.includes('IMMUNO')) return 'Manual / Microscopy / Rapid Strip';
  if (norm.includes('HORMON')) return 'Immunoassay Reader';
  if (norm.includes('REFERRAL')) return 'External Referral Laboratory';
  return 'Manual / Microscopy / Rapid Strip';
};

export default function LaboratoryTestsPage() {
  const { token } = useAuth();
  const [data, setData] = useState({ categories: [], tests: [], samples: [], settings: {} });
  const [form, setForm] = useState(blank);
  const [newCategory, setNewCategory] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [message, setMessage] = useState('');
  const [editingTest, setEditingTest] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const [viewMode, setViewMode] = useState('tests'); // 'tests' | 'ranges'

  const [paramTabOpen, setParamTabOpen] = useState(false);
  const [paramList, setParamList] = useState([]);
  const [paramForm, setParamForm] = useState({
    parameterName: '',
    category: 'HEMATOLOGY',
    subcategory: '',
    unit: '',
    referenceValue: '',
    normalMin: '',
    normalMax: '',
    criticalLow: '',
    criticalHigh: '',
    methodOrAnalyzer: 'Mindray BC-3000Plus (Hematology)',
    specimenType: 'EDTA Whole Blood',
    resultType: 'Numeric',
    referenceSource: 'Manufacturer Reagent Insert',
    verificationStatus: 'Requires Laboratory Verification'
  });
  const [editingParam, setEditingParam] = useState(null);

  // Local draft changes for category inline parameter range rows
  const [localParamEdits, setLocalParamEdits] = useState({});

  const [interpTabOpen, setInterpTabOpen] = useState(false);
  const [interpList, setInterpList] = useState([]);
  const [interpForm, setInterpForm] = useState({ laboratoryTestName: 'Lipid Profile', title: '', interpretation: '' });

  const [catalogCatFilter, setCatalogCatFilter] = useState('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');

  const load = () => api('/laboratory-tests/admin', { token }).then(catalog => {
    setData(catalog);
    if (catalog.categories?.length > 0) {
      setSelectedId(prev => prev || catalog.categories[0]._id);
    }
  }).catch(error => {
    if (!isSilentNetworkError(error)) setMessage(error.message);
  });

  const loadParams = () => api('/report-entry/parameters', { token }).then(res => {
    setParamList(res.parameters || []);
  }).catch(() => {});

  const loadInterps = () => api('/clinical-interpretations/admin', { token }).then(res => setInterpList(res.interpretations || [])).catch(() => {});

  useEffect(() => {
    load();
    loadParams();
  }, [token]);

  useEffect(() => { if (interpTabOpen) loadInterps(); }, [interpTabOpen, token]);

  const selected = data.categories.find(category => category._id === selectedId);
  const categoryTests = useMemo(() => data.tests.filter(test => test.category?._id === selected?._id), [data.tests, selected]);
  
  const matches = useMemo(() => categoryTests.filter(test => {
    const searchable = `${test.name} ${test.description || ''} ${selected?.name || ''}`.toLowerCase();
    return (!query || searchable.includes(query.toLowerCase())) && (filter === 'All' || filter === 'Active' && test.status === 'Active' || filter === 'Referral' && /referral/i.test(selected?.name) || filter === 'Popular' || filter === 'Recently Added');
  }).sort((first, second) => {
    if (sortBy === 'price') return Number(first.price) - Number(second.price);
    if (sortBy === 'status') return first.status.localeCompare(second.status) || first.name.localeCompare(second.name);
    return first.name.localeCompare(second.name);
  }), [categoryTests, filter, query, selected, sortBy]);

  const visibleCategories = useMemo(() => data.categories.filter(category => {
    const searchable = `${category.name} ${data.tests.filter(test => test.category?._id === category._id).map(test => test.name).join(' ')}`.toLowerCase();
    return !query || searchable.includes(query.toLowerCase());
  }), [data.categories, data.tests, query]);

  // Match parameters belonging to the selected category
  const categoryParams = useMemo(() => {
    if (!selected) return [];
    const selectedNorm = selected.name.trim().toUpperCase();
    return paramList.filter(p => {
      const pCatNorm = (p.category || '').trim().toUpperCase();
      if (pCatNorm === selectedNorm) return true;
      if (selectedNorm.includes('CHEM') && pCatNorm.includes('CHEM')) return true;
      if (selectedNorm.includes('URINE') && pCatNorm.includes('URINE')) return true;
      if (selectedNorm.includes('SEROL') && pCatNorm.includes('SEROL')) return true;
      if (selectedNorm.includes('HEMA') && pCatNorm.includes('HEMA')) return true;
      if (selectedNorm.includes('ELECTROL') && pCatNorm.includes('ELECTROL')) return true;
      if (selectedNorm.includes('SUGAR') && pCatNorm.includes('SUGAR')) return true;
      if (selectedNorm.includes('COAGUL') && pCatNorm.includes('COAGUL')) return true;
      if (selectedNorm.includes('STOOL') && pCatNorm.includes('STOOL')) return true;
      if (selectedNorm.includes('SEMEN') && pCatNorm.includes('SEMEN')) return true;
      if (selectedNorm.includes('HORMON') && pCatNorm.includes('HORMON')) return true;
      if (selectedNorm.includes('PARASIT') && pCatNorm.includes('PARASIT')) return true;
      if (selectedNorm.includes('REFERRAL') && pCatNorm.includes('REFERRAL')) return true;
      return false;
    });
  }, [paramList, selected]);

  const applyTestUpdate = (test, changes) => setData(current => ({
    ...current,
    tests: current.tests.map(item => item._id === test._id ? { ...item, ...changes, category: changes.category ? current.categories.find(category => category._id === changes.category) || item.category : item.category } : item)
  }));

  const chooseCategory = category => {
    if (selectedId === category._id) {
      setSelectedId('');
      return;
    }
    setSelectedId(category._id);
    setCategoryName(category.name);
    setEditingCategory(false);
    setForm(current => ({ ...current, category: category._id }));
    setParamForm(current => ({
      ...current,
      category: category.name.toUpperCase(),
      methodOrAnalyzer: getCategoryDefaultAnalyzer(category.name)
    }));
  };

  const saveTest = async event => {
    event.preventDefault();
    try {
      await api('/laboratory-tests/tests', { token, method: 'POST', body: JSON.stringify({ ...form, category: form.category || selected?._id }) });
      setForm({ ...blank, category: selected?._id || '' });
      setMessage('Laboratory test added.');
      load();
    } catch (error) {
      if (!isSilentNetworkError(error)) setMessage(error.message);
    }
  };

  const saveSettings = async event => {
    event.preventDefault();
    try {
      await api('/laboratory-tests/settings', { token, method: 'PUT', body: JSON.stringify(data.settings) });
      setMessage('Pricing settings saved.');
    } catch (error) {
      if (!isSilentNetworkError(error)) setMessage(error.message);
    }
  };

  const updateCategory = async changes => {
    try {
      await api(`/laboratory-tests/categories/${selected._id}`, { token, method: 'PUT', body: JSON.stringify(changes) });
      setMessage('Category updated.');
      setEditingCategory(false);
      load();
    } catch (error) {
      if (!isSilentNetworkError(error)) setMessage(error.message);
    }
  };

  const removeCategory = async () => {
    if (!confirm(`Delete ${selected.name}? This is only available when it has no tests.`)) return;
    try {
      await api(`/laboratory-tests/categories/${selected._id}`, { token, method: 'DELETE' });
      setSelectedId('');
      setMessage('Category deleted.');
      load();
    } catch (error) {
      if (!isSilentNetworkError(error)) setMessage(error.message);
    }
  };

  const handleEdit = test => {
    setEditingTest(test);
    setEditForm({ name: test.name || '', price: test.price ?? 0, description: test.description || '', status: test.status || 'Active', categoryId: test.category?._id || test.category || '', consumables: (test.consumables || []).map(c => ({ item: c.item?._id || c.item, quantity: c.quantity })) });
  };

  const closeEdit = () => {
    if (!savingEdit) {
      setEditingTest(null);
      setEditForm(null);
    }
  };

  const saveEdit = async event => {
    event.preventDefault();
    if (!editingTest || !editForm) return;
    const isEditingCbc = /^CBC$/i.test(editingTest?.subcategory || '') && /^HEMATOLOGY$/i.test(data.categories.find(c => c._id === (editForm.categoryId || editingTest?.category?._id || editingTest?.category))?.name || '');
    const price = isEditingCbc ? (Number(editingTest.price) || 0) : Number(editForm.price);
    if (!editForm.name.trim() || (!isEditingCbc && (!Number.isFinite(price) || price < 0))) return setMessage('Enter a test name and a valid price.');
    const changes = { name: editForm.name.trim(), price, description: editForm.description, status: editForm.status, category: editForm.categoryId, consumables: editForm.consumables.filter(c=>c.item && Number(c.quantity)>0).map(c=>({item:c.item,quantity:Number(c.quantity)})) };
    setSavingEdit(true);
    try {
      await api(`/laboratory-tests/tests/${editingTest._id}`, { token, method: 'PUT', body: JSON.stringify(changes) });
      applyTestUpdate(editingTest, changes);
      setEditingTest(null);
      setEditForm(null);
      setMessage('Laboratory test updated successfully.');
    } catch (error) {
      if (!isSilentNetworkError(error)) setMessage(error.message);
    } finally { setSavingEdit(false); }
  };

  const removeTest = async test => {
    if (!confirm(`Delete ${test.name}?`)) return;
    try {
      await api(`/laboratory-tests/tests/${test._id}`, { token, method: 'DELETE' });
      setMessage('Test deleted.');
      load();
    } catch (error) {
      if (!isSilentNetworkError(error)) setMessage(error.message);
    }
  };

  // Quick save an inline edited parameter
  const handleQuickSaveParam = async (paramId, baseParam) => {
    const edits = localParamEdits[paramId] || {};
    const updated = {
      ...baseParam,
      ...edits
    };
    try {
      await api(`/report-entry/parameters/${paramId}`, {
        token,
        method: 'PUT',
        body: JSON.stringify(updated)
      });
      setMessage(`Clinical reference interval for "${baseParam.parameterName}" saved successfully.`);
      setLocalParamEdits(prev => {
        const next = { ...prev };
        delete next[paramId];
        return next;
      });
      loadParams();
    } catch (err) {
      if (!isSilentNetworkError(err)) setMessage(err.message || 'Failed to save reference range.');
    }
  };

  // Restore previous audit history value
  const handleRestoreAudit = async (paramId) => {
    if (!confirm('Restore the previous verified reference range values from the audit history?')) return;
    try {
      const res = await api(`/report-entry/parameters/${paramId}/restore`, {
        token,
        method: 'POST'
      });
      setMessage(res.message || 'Previous reference range restored.');
      setEditingParam(null);
      loadParams();
    } catch (err) {
      if (!isSilentNetworkError(err)) setMessage(err.message || 'Failed to restore previous reference values.');
    }
  };

  return (
    <section className="page laboratory-tests-page">
      <header className="lab-page-header">
        <div>
          <p className="eyebrow">Laboratory configuration</p>
          <h1>Laboratory Test Types</h1>
          <p>Organize your diagnostic catalogue, pricing, and clinical reference intervals in one workspace.</p>
        </div>
        <label className="lab-search">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search test name or main category" aria-label="Search laboratory tests" />
        </label>
      </header>

      {message && <div className="alert success" role="status">{message}</div>}

      <section className="lab-catalogue-stats" aria-label="Laboratory test catalogue statistics">
        <article><span>Total categories</span><strong>{data.categories.length}</strong><i>▦</i></article>
        <article><span>Total laboratory tests</span><strong>{data.tests.length}</strong><i>🧪</i></article>
        <article><span>Active tests</span><strong>{data.tests.filter(test => test.status === 'Active').length}</strong><i>✓</i></article>
        <article><span>Parameters configured</span><strong>{paramList.length}</strong><i>📊</i></article>
      </section>

      <div className="lab-filter-bar" role="toolbar" aria-label="Test filters">
        {['All', 'Popular', 'Recently Added', 'Referral', 'Active'].map(item => (
          <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>

      <div className="lab-admin-layout">
        {/* Category List Sidebar */}
        <aside className="lab-category-rail">
          <div className="lab-section-title">
            <div><span>Catalogue</span><h2>Main laboratory categories</h2></div>
            <b>{visibleCategories.length}</b>
          </div>
          <div className="lab-category-grid">
            {visibleCategories.map(category => {
              const count = data.tests.filter(test => test.category?._id === category._id).length;
              const active = data.tests.filter(test => test.category?._id === category._id && test.status === 'Active').length;
              const [from, to, icon] = palette[keyFor(category.name)];
              return (
                <button
                  key={category._id}
                  className={`lab-category-card ${selected?._id === category._id ? 'selected' : ''}`}
                  style={{ '--lab-from': from, '--lab-to': to }}
                  onClick={() => chooseCategory(category)}
                >
                  <span className="lab-category-icon">{icon}</span>
                  <span className="lab-category-copy">
                    <small>{category.status}</small>
                    <strong>{category.name}</strong>
                    <em>{count} tests · {active} active</em>
                  </span>
                  <span className="lab-chevron">›</span>
                </button>
              );
            })}
          </div>
          {selected && (
            <form
              className="lab-new-category"
              onSubmit={async event => {
                event.preventDefault();
                try {
                  await api('/laboratory-tests/categories', { token, method: 'POST', body: JSON.stringify({ name: newCategory, displayOrder: data.categories.length }) });
                  setNewCategory('');
                  setMessage('Category added.');
                  load();
                } catch (error) {
                  if (!isSilentNetworkError(error)) setMessage(error.message);
                }
              }}
            >
              <input required value={newCategory} onChange={event => setNewCategory(event.target.value)} placeholder="New category name" />
              <button className="primary" aria-label="Add category">＋</button>
            </form>
          )}
        </aside>

        {/* Main Detail Panel */}
        <main className="lab-detail-panel">
          {selected ? (
            <>
              {/* Category Hero */}
              <section className="lab-detail-hero" style={{ '--lab-from': palette[keyFor(selected.name)][0], '--lab-to': palette[keyFor(selected.name)][1] }}>
                <span className="lab-detail-icon">{palette[keyFor(selected.name)][2]}</span>
                <div>
                  {editingCategory ? (
                    <input autoFocus value={categoryName} onChange={event => setCategoryName(event.target.value)} aria-label="Category name" />
                  ) : (
                    <>
                      <p>Selected category</p>
                      <h2>{selected.name}</h2>
                    </>
                  )}
                  <span>
                    {categoryTests.length} test types · {categoryParams.length} clinical parameters · Instrument: {getCategoryDefaultAnalyzer(selected.name)}
                  </span>
                </div>
                <div className="lab-hero-actions">
                  {editingCategory ? (
                    <button className="lab-icon-button" onClick={() => updateCategory({ name: categoryName })}>Save</button>
                  ) : (
                    <button className="lab-icon-button" onClick={() => { setCategoryName(selected.name); setEditingCategory(true); }}>Edit category</button>
                  )}
                  <button className="lab-icon-button" onClick={() => updateCategory({ hidden: !selected.hidden })}>{selected.hidden ? 'Show' : 'Hide'}</button>
                  <button className="lab-icon-button danger" onClick={removeCategory}>Delete</button>
                </div>
              </section>

              {/* View Mode Switcher: Tests/Pricing vs Reference Ranges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', background: '#f8fafc', padding: '8px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '6px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    className={viewMode === 'tests' ? 'primary' : 'secondary'}
                    style={{ padding: '6px 14px', fontSize: '0.84rem', fontWeight: 700, borderRadius: '6px', minHeight: 'unset', height: '32px' }}
                    onClick={() => setViewMode('tests')}
                  >
                    🧪 Test Types & Billing
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'ranges' ? 'primary' : 'secondary'}
                    style={{ padding: '6px 14px', fontSize: '0.84rem', fontWeight: 700, borderRadius: '6px', minHeight: 'unset', height: '32px' }}
                    onClick={() => { setViewMode('ranges'); loadParams(); }}
                  >
                    📊 Clinical Reference Intervals & Ranges
                  </button>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                  {viewMode === 'tests' ? `Showing ${matches.length} test definition${matches.length === 1 ? '' : 's'}` : `Showing ${categoryParams.length} reference parameter${categoryParams.length === 1 ? '' : 's'}`}
                </div>
              </div>

              {/* VIEW 1: TESTS & BILLING MANAGEMENT */}
              {viewMode === 'tests' && (
                <>
                  <section className="lab-test-toolbar">
                    <div>
                      <h2>Tests in this category</h2>
                      <p>Update pricing or availability directly, then save without leaving the list.</p>
                    </div>
                    <div className="lab-toolbar-actions">
                      <label className="lab-sort">
                        Sort by
                        <select value={sortBy} onChange={event => setSortBy(event.target.value)}>
                          <option value="name">Test name</option>
                          <option value="price">Price</option>
                          <option value="status">Status</option>
                        </select>
                      </label>
                      <button className="primary" onClick={() => document.getElementById('new-lab-test')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                        ＋ Add test
                      </button>
                    </div>
                  </section>

                  <div className="lab-test-table" role="region" aria-label="Laboratory tests">
                    <div className="lab-test-head"><span>Laboratory test</span><span>Price</span><span>Details</span><span>Status</span><span>Actions</span></div>
                    {(() => {
                      const hasSubcats = matches.some(t => t.subcategory);
                      if (!hasSubcats) {
                        return matches.map(test => {
                          const isCbc = /^CBC$/i.test(test.subcategory || '') && /^HEMATOLOGY$/i.test(selected?.name || '');
                          return (
                            <article className="lab-test-row" key={test._id}>
                              <div className="lab-test-name"><i>🧪</i><span><label className="sr-only" htmlFor={`test-name-${test._id}`}>Test name</label><input id={`test-name-${test._id}`} value={test.name} readOnly disabled /><label className="sr-only" htmlFor={`test-description-${test._id}`}>Description</label><input id={`test-description-${test._id}`} value={test.description || 'Routine laboratory investigation'} readOnly disabled /></span></div>
                              <div className="lab-inline-price">
                                {isCbc ? (
                                  <span style={{ fontSize: '0.78rem', color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    Included in CBC
                                  </span>
                                ) : (
                                  <><label><span className="sr-only">Price for {test.name}</span><input type="number" value={test.price} readOnly disabled /></label><b>ETB</b></>
                                )}
                              </div>
                              <span className="lab-specimen">{test.requiredSampleTypes?.map(sample => sample.name).join(', ') || 'Not mapped'}</span>
                              <label className={`lab-status-select ${test.status === 'Active' ? 'active' : ''}`}><span className="sr-only">Status for {test.name}</span><select value={test.status} disabled readOnly><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
                              <div className="lab-row-actions"><button onClick={() => handleEdit(test)} aria-label={`Edit ${test.name}`}>Edit</button><button className="danger" onClick={() => removeTest(test)}>Delete</button></div>
                            </article>
                          );
                        });
                      }

                      const subcatGroupMap = new Map();
                      matches.forEach(test => {
                        const sc = test.subcategory || 'GENERAL TESTS';
                        if (!subcatGroupMap.has(sc)) subcatGroupMap.set(sc, []);
                        subcatGroupMap.get(sc).push(test);
                      });

                      return Array.from(subcatGroupMap.entries()).map(([subName, tests]) => {
                        const isCbcGroup = subName.toUpperCase() === 'CBC' && /^HEMATOLOGY$/i.test(selected?.name || '');
                        return (
                          <div key={subName} style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ background: '#f1f5f9', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #cbd5e1' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1rem', color: '#075c91' }}>🏷️</span>
                                <strong style={{ fontSize: '0.9rem', color: '#0f172a', textTransform: 'uppercase' }}>{subName}</strong>
                                <span style={{ fontSize: '0.78rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>{tests.length} parameters</span>
                              </div>
                              {isCbcGroup && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#e0f2fe', padding: '5px 12px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1' }}>🩸 CBC Complete Fixed Price:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    style={{ width: '85px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #0284c7', fontSize: '0.88rem', fontWeight: 700, background: '#ffffff', textAlign: 'right' }}
                                    value={data.settings?.cbcGroupPrice ?? 150}
                                    onChange={e => setData({ ...data, settings: { ...data.settings, cbcGroupPrice: Math.max(0, Number(e.target.value) || 0) } })}
                                    aria-label="Complete CBC Price"
                                  />
                                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1' }}>ETB</span>
                                  <button
                                    type="button"
                                    className="primary"
                                    style={{ padding: '4px 12px', fontSize: '0.8rem', height: '28px', minHeight: 'unset' }}
                                    onClick={saveSettings}
                                  >
                                    Save Price
                                  </button>
                                </div>
                              )}
                            </div>
                            <div>
                              {tests.map(test => {
                                const isCbc = isCbcGroup || (/^CBC$/i.test(test.subcategory || '') && /^HEMATOLOGY$/i.test(selected?.name || ''));
                                return (
                                  <article className="lab-test-row" key={test._id}>
                                    <div className="lab-test-name"><i>🧪</i><span><label className="sr-only" htmlFor={`test-name-${test._id}`}>Test name</label><input id={`test-name-${test._id}`} value={test.name} readOnly disabled /><label className="sr-only" htmlFor={`test-description-${test._id}`}>Description</label><input id={`test-description-${test._id}`} value={test.description || 'Routine laboratory investigation'} readOnly disabled /></span></div>
                                    <div className="lab-inline-price">
                                      {isCbc ? (
                                        <span style={{ fontSize: '0.78rem', color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                          Included in CBC
                                        </span>
                                      ) : (
                                        <><label><span className="sr-only">Price for {test.name}</span><input type="number" value={test.price} readOnly disabled /></label><b>ETB</b></>
                                      )}
                                    </div>
                                    <span className="lab-specimen">{test.requiredSampleTypes?.map(sample => sample.name).join(', ') || 'Not mapped'}</span>
                                    <label className={`lab-status-select ${test.status === 'Active' ? 'active' : ''}`}><span className="sr-only">Status for {test.name}</span><select value={test.status} disabled readOnly><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
                                    <div className="lab-row-actions"><button onClick={() => handleEdit(test)} aria-label={`Edit ${test.name}`}>Edit</button><button className="danger" onClick={() => removeTest(test)}>Delete</button></div>
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                    {!matches.length && <div className="lab-empty"><span>🧪</span><h3>No Laboratory Tests Available</h3><p>There are no tests matching this view.</p><button className="primary" onClick={() => document.getElementById('new-lab-test')?.scrollIntoView({ behavior: 'smooth' })}>Add First Test</button></div>}
                  </div>

                  <section id="new-lab-test" className="lab-management-forms">
                    <form className="lab-form-card" onSubmit={saveTest}>
                      <div><p className="eyebrow">Catalogue entry</p><h2>Add laboratory test</h2></div>
                      <div className="form-grid">
                        <label>Test name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
                        <label>Category<select value={form.category || selected._id} onChange={event => setForm({ ...form, category: event.target.value })}>{data.categories.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
                        <label>Price (ETB)<input type="number" min="0" value={form.price} onChange={event => setForm({ ...form, price: +event.target.value })} /></label>
                        <label>Required specimen<select multiple value={form.requiredSampleTypes} onChange={event => setForm({ ...form, requiredSampleTypes: [...event.target.selectedOptions].map(option => option.value) })}>{data.samples.map(sample => <option key={sample._id} value={sample._id}>{sample.name}</option>)}</select></label>
                        <label className="wide">Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
                      </div>
                      <button className="primary">Add Test</button>
                    </form>

                    <form className="lab-form-card lab-settings-card" onSubmit={saveSettings}>
                      <div><p className="eyebrow">Billing settings</p><h2>Discount & counseling</h2></div>
                      <div className="form-grid">
                        <label>Staff discount %<input type="number" min="0" max="100" value={data.settings.staffDiscount ?? 20} onChange={event => setData({ ...data, settings: { ...data.settings, staffDiscount: +event.target.value } })} /></label>
                        <label>Collaborator discount %<input type="number" min="0" max="100" value={data.settings.collaboratorDiscount ?? 20} onChange={event => setData({ ...data, settings: { ...data.settings, collaboratorDiscount: +event.target.value } })} /></label>
                        <label>Counseling fee<select value={data.settings.counselingStatus || 'Free'} onChange={event => setData({ ...data, settings: { ...data.settings, counselingStatus: event.target.value } })}><option>Free</option><option>Paid</option></select></label>
                        <label>Counseling price (ETB)<input type="number" min="0" value={data.settings.counselingPrice ?? 0} onChange={event => setData({ ...data, settings: { ...data.settings, counselingPrice: +event.target.value } })} /></label>
                        <label>Complete CBC Fixed Price (ETB)<input type="number" min="0" value={data.settings.cbcGroupPrice ?? 150} onChange={event => setData({ ...data, settings: { ...data.settings, cbcGroupPrice: Math.max(0, Number(event.target.value) || 0) } })} /></label>
                      </div>
                      <button className="primary">Save Settings</button>
                    </form>
                  </section>
                </>
              )}

              {/* VIEW 2: CLINICAL REFERENCE INTERVALS & RANGES MANAGEMENT */}
              {viewMode === 'ranges' && (
                <section className="lab-reference-range-view">
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <strong style={{ color: '#166534', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🔬</span> Associated Instrument: {getCategoryDefaultAnalyzer(selected.name)}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '2px', display: 'block' }}>
                        CLSI EP28 & WHO clinical reference intervals. Analytical instrument measuring ranges remain distinct from clinical patient reference intervals.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="primary"
                      style={{ fontSize: '0.8rem', padding: '6px 14px', height: '32px', minHeight: 'unset' }}
                      onClick={() => {
                        setParamForm({
                          parameterName: '',
                          category: selected.name.toUpperCase(),
                          subcategory: '',
                          unit: '',
                          referenceValue: '',
                          normalMin: '',
                          normalMax: '',
                          criticalLow: '',
                          criticalHigh: '',
                          methodOrAnalyzer: getCategoryDefaultAnalyzer(selected.name),
                          specimenType: 'Serum',
                          resultType: 'Numeric',
                          referenceSource: 'Manufacturer Reagent Insert',
                          verificationStatus: 'Requires Laboratory Verification'
                        });
                        setParamTabOpen(true);
                        document.getElementById('master-param-catalog')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      ＋ Add Parameter to {selected.name}
                    </button>
                  </div>

                  {categoryParams.length === 0 ? (
                    <div className="lab-empty">
                      <span>📊</span>
                      <h3>No Parameters Configured for {selected.name}</h3>
                      <p>Add clinical parameters and reference intervals using the catalog form below.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {categoryParams.map(param => {
                        const edits = localParamEdits[param._id] || {};
                        const currentUnit = edits.unit !== undefined ? edits.unit : (param.unit || '');
                        const currentMin = edits.normalMin !== undefined ? edits.normalMin : (param.normalMin ?? '');
                        const currentMax = edits.normalMax !== undefined ? edits.normalMax : (param.normalMax ?? '');
                        const currentCritLow = edits.criticalLow !== undefined ? edits.criticalLow : (param.criticalLow ?? '');
                        const currentCritHigh = edits.criticalHigh !== undefined ? edits.criticalHigh : (param.criticalHigh ?? '');
                        const currentRefVal = edits.referenceValue !== undefined ? edits.referenceValue : (param.referenceValue || '');
                        const isDirty = !!localParamEdits[param._id];
                        const isVerified = param.verificationStatus === 'Verified';

                        return (
                          <article
                            key={param._id}
                            style={{
                              background: '#ffffff',
                              border: isDirty ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '16px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{param.parameterName}</strong>
                                  {param.subcategory && (
                                    <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                      {param.subcategory}
                                    </span>
                                  )}
                                  <span style={{ fontSize: '0.72rem', background: isVerified ? '#dcfce7' : '#fef3c7', color: isVerified ? '#166534' : '#92400e', border: `1px solid ${isVerified ? '#86efac' : '#fde68a'}`, padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                                    {isVerified ? '✓ Verified' : '⚠ Requires Lab Verification'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                                  Instrument: <strong>{param.methodOrAnalyzer || getCategoryDefaultAnalyzer(selected.name)}</strong> · Specimen: {param.specimenType || 'Standard'} · Type: {param.resultType || 'Numeric'}
                                  {param.referenceSource && ` · Source: ${param.referenceSource}`}
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {isDirty && (
                                  <button
                                    type="button"
                                    className="primary"
                                    style={{ fontSize: '0.8rem', padding: '4px 12px', height: '30px', minHeight: 'unset' }}
                                    onClick={() => handleQuickSaveParam(param._id, param)}
                                  >
                                    Save Changes
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="secondary"
                                  style={{ fontSize: '0.8rem', padding: '4px 12px', height: '30px', minHeight: 'unset' }}
                                  onClick={() => setEditingParam({ ...param })}
                                >
                                  ⚙ Details & Demographics
                                </button>
                              </div>
                            </div>

                            {/* Editable Fields Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                              <label style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                Unit
                                <input
                                  type="text"
                                  value={currentUnit}
                                  placeholder="e.g. g/dL, mg/dL"
                                  style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                                  onChange={e => setLocalParamEdits(prev => ({
                                    ...prev,
                                    [param._id]: { ...prev[param._id], unit: e.target.value }
                                  }))}
                                />
                              </label>

                              <label style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                Lower Limit (Low)
                                <input
                                  type="number"
                                  step="any"
                                  value={currentMin}
                                  placeholder="e.g. 12.0"
                                  style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                                  onChange={e => setLocalParamEdits(prev => ({
                                    ...prev,
                                    [param._id]: { ...prev[param._id], normalMin: e.target.value }
                                  }))}
                                />
                              </label>

                              <label style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                Upper Limit (High)
                                <input
                                  type="number"
                                  step="any"
                                  value={currentMax}
                                  placeholder="e.g. 17.0"
                                  style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                                  onChange={e => setLocalParamEdits(prev => ({
                                    ...prev,
                                    [param._id]: { ...prev[param._id], normalMax: e.target.value }
                                  }))}
                                />
                              </label>

                              <label style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#991b1b' }}>
                                Critical Low (Panic)
                                <input
                                  type="number"
                                  step="any"
                                  value={currentCritLow}
                                  placeholder="e.g. 7.0 (opt)"
                                  style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #fca5a5', marginTop: '4px', background: '#fef2f2' }}
                                  onChange={e => setLocalParamEdits(prev => ({
                                    ...prev,
                                    [param._id]: { ...prev[param._id], criticalLow: e.target.value }
                                  }))}
                                />
                              </label>

                              <label style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#991b1b' }}>
                                Critical High (Panic)
                                <input
                                  type="number"
                                  step="any"
                                  value={currentCritHigh}
                                  placeholder="e.g. 20.0 (opt)"
                                  style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #fca5a5', marginTop: '4px', background: '#fef2f2' }}
                                  onChange={e => setLocalParamEdits(prev => ({
                                    ...prev,
                                    [param._id]: { ...prev[param._id], criticalHigh: e.target.value }
                                  }))}
                                />
                              </label>

                              <label style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#334155', gridColumn: 'span 2' }}>
                                Reference Display Text / Clinical Range
                                <input
                                  type="text"
                                  value={currentRefVal}
                                  placeholder="e.g. 12.0–17.0 or Male: 14.4–16.6 | Female: 12.0–15.0"
                                  style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                                  onChange={e => setLocalParamEdits(prev => ({
                                    ...prev,
                                    [param._id]: { ...prev[param._id], referenceValue: e.target.value }
                                  }))}
                                />
                              </label>
                            </div>

                            {/* Demographic Sub-ranges indicator */}
                            {Array.isArray(param.demographicRanges) && param.demographicRanges.length > 0 && (
                              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#0369a1', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span>👥 {param.demographicRanges.length} demographic sub-range{param.demographicRanges.length === 1 ? '' : 's'} configured:</span>
                                {param.demographicRanges.map((dr, idx) => (
                                  <span key={idx} style={{ background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    {dr.demographic || dr.gender}: {dr.referenceValue || `${dr.normalMin ?? '—'} to ${dr.normalMax ?? '—'}`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Master Parameter Catalog & Normal Ranges (Collapsible Footer Section) */}
              <section id="master-param-catalog" className="lab-form-card" style={{ marginTop: '24px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <p className="eyebrow">Catalog Administration</p>
                    <h2>Master Parameter Catalog & Normal Ranges</h2>
                  </div>
                  <button className="secondary" type="button" onClick={() => setParamTabOpen(!paramTabOpen)}>
                    {paramTabOpen ? 'Collapse Catalog' : '⚙ Manage Full 13-Category Parameter Catalog'}
                  </button>
                </div>

                {paramTabOpen && (
                  <div style={{ marginTop: '16px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                      Configure SI units, clinical reference ranges, instruments, and threshold boundaries across all 13 laboratory categories.
                    </p>

                    {/* Add New Parameter Form */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await api('/report-entry/parameters', { token, method: 'POST', body: JSON.stringify(paramForm) });
                          setMessage('New parameter added to master catalog.');
                          setParamForm({
                            parameterName: '',
                            category: selected?.name?.toUpperCase() || 'HEMATOLOGY',
                            subcategory: '',
                            unit: '',
                            referenceValue: '',
                            normalMin: '',
                            normalMax: '',
                            criticalLow: '',
                            criticalHigh: '',
                            methodOrAnalyzer: getCategoryDefaultAnalyzer(selected?.name || 'HEMATOLOGY'),
                            specimenType: 'Serum',
                            resultType: 'Numeric',
                            referenceSource: 'Manufacturer Reagent Insert',
                            verificationStatus: 'Requires Laboratory Verification'
                          });
                          loadParams();
                        } catch (err) {
                          if (!isSilentNetworkError(err)) setMessage(err.message);
                        }
                      }}
                      style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}
                    >
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#075c91' }}>＋ Add New Parameter to Master Catalog</h4>
                      <div className="form-grid" style={{ gap: '10px' }}>
                        <label>Parameter Name<input required value={paramForm.parameterName} onChange={e => setParamForm({ ...paramForm, parameterName: e.target.value })} placeholder="e.g. Total Cholesterol, HGB" /></label>
                        <label>Category
                          <select value={paramForm.category} onChange={e => setParamForm({ ...paramForm, category: e.target.value, methodOrAnalyzer: getCategoryDefaultAnalyzer(e.target.value) })}>
                            {data.categories.map(c => <option key={c._id} value={c.name.toUpperCase()}>{c.name}</option>)}
                          </select>
                        </label>
                        <label>Subcategory<input value={paramForm.subcategory} onChange={e => setParamForm({ ...paramForm, subcategory: e.target.value })} placeholder="e.g. Lipid Profile, CBC, Chemical Analysis" /></label>
                        <label>Instrument / Analyzer
                          <select value={paramForm.methodOrAnalyzer} onChange={e => setParamForm({ ...paramForm, methodOrAnalyzer: e.target.value })}>
                            {DEFAULT_ANALYZERS.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </label>
                        <label>Specimen Type
                          <select value={paramForm.specimenType} onChange={e => setParamForm({ ...paramForm, specimenType: e.target.value })}>
                            {SPECIMEN_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </label>
                        <label>Result Type
                          <select value={paramForm.resultType} onChange={e => setParamForm({ ...paramForm, resultType: e.target.value })}>
                            {RESULT_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </label>
                        <label>SI Unit<input value={paramForm.unit} onChange={e => setParamForm({ ...paramForm, unit: e.target.value })} placeholder="e.g. g/dL, mg/dL, mmol/L, %" /></label>
                        <label>Reference Range<input value={paramForm.referenceValue} onChange={e => setParamForm({ ...paramForm, referenceValue: e.target.value })} placeholder="e.g. 12.0–17.0" /></label>
                        <label>Normal Min (Low)<input type="number" step="any" value={paramForm.normalMin} onChange={e => setParamForm({ ...paramForm, normalMin: e.target.value })} placeholder="e.g. 12.0" /></label>
                        <label>Normal Max (High)<input type="number" step="any" value={paramForm.normalMax} onChange={e => setParamForm({ ...paramForm, normalMax: e.target.value })} placeholder="e.g. 17.0" /></label>
                        <label>Critical Low (Panic)<input type="number" step="any" value={paramForm.criticalLow} onChange={e => setParamForm({ ...paramForm, criticalLow: e.target.value })} placeholder="e.g. 7.0 (optional)" /></label>
                        <label>Critical High (Panic)<input type="number" step="any" value={paramForm.criticalHigh} onChange={e => setParamForm({ ...paramForm, criticalHigh: e.target.value })} placeholder="e.g. 20.0 (optional)" /></label>
                        <label>Reference Source
                          <select value={paramForm.referenceSource} onChange={e => setParamForm({ ...paramForm, referenceSource: e.target.value })}>
                            {REFERENCE_SOURCES.map(rs => <option key={rs} value={rs}>{rs}</option>)}
                          </select>
                        </label>
                        <label>Verification Status
                          <select value={paramForm.verificationStatus} onChange={e => setParamForm({ ...paramForm, verificationStatus: e.target.value })}>
                            <option value="Requires Laboratory Verification">Requires Laboratory Verification</option>
                            <option value="Verified">Verified</option>
                          </select>
                        </label>
                      </div>
                      <button className="primary" style={{ marginTop: '12px' }}>Add Parameter to Catalog</button>
                    </form>

                    {/* Filter & Search Bar */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        value={catalogCatFilter}
                        onChange={e => setCatalogCatFilter(e.target.value)}
                        style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="ALL">All Categories ({paramList.length})</option>
                        {data.categories.map(c => (
                          <option key={c._id} value={c.name.toUpperCase()}>{c.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="🔍 Search parameter name..."
                        value={catalogSearch}
                        onChange={e => setCatalogSearch(e.target.value)}
                        style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '220px' }}
                      />
                    </div>

                    {/* Parameter Table */}
                    <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                            <th style={{ padding: '8px 10px' }}>Category</th>
                            <th style={{ padding: '8px 10px' }}>Parameter</th>
                            <th style={{ padding: '8px 10px' }}>Instrument</th>
                            <th style={{ padding: '8px 10px' }}>SI Unit</th>
                            <th style={{ padding: '8px 10px' }}>Reference Range</th>
                            <th style={{ padding: '8px 10px' }}>Status</th>
                            <th style={{ padding: '8px 10px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paramList
                            .filter(p => catalogCatFilter === 'ALL' || (p.category || '').toUpperCase() === catalogCatFilter)
                            .filter(p => !catalogSearch || (p.parameterName || '').toLowerCase().includes(catalogSearch.toLowerCase()))
                            .map(p => (
                              <tr key={p._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px 10px' }}>
                                  <strong>{p.category}</strong> {p.subcategory && <small style={{ color: '#64748b' }}>({p.subcategory})</small>}
                                </td>
                                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{p.parameterName}</td>
                                <td style={{ padding: '8px 10px', color: '#475569' }}>{p.methodOrAnalyzer || 'Standard'}</td>
                                <td style={{ padding: '8px 10px' }}>{p.unit || '—'}</td>
                                <td style={{ padding: '8px 10px' }}>{p.referenceValue || '—'}</td>
                                <td style={{ padding: '8px 10px' }}>
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: p.verificationStatus === 'Verified' ? '#dcfce7' : '#fef3c7', color: p.verificationStatus === 'Verified' ? '#166534' : '#92400e' }}>
                                    {p.verificationStatus === 'Verified' ? '✓ Verified' : '⚠ Requires Verification'}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                  <button
                                    type="button"
                                    className="secondary"
                                    style={{ fontSize: '0.75rem', padding: '4px 8px', marginRight: '6px' }}
                                    onClick={() => setEditingParam({ ...p })}
                                  >
                                    Edit Range
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary danger"
                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                    onClick={async () => {
                                      if (confirm(`Delete ${p.parameterName}?`)) {
                                        try {
                                          await api(`/report-entry/parameters/${p._id}`, { token, method: 'DELETE' });
                                          setMessage('Parameter deleted.');
                                          loadParams();
                                        } catch (err) {
                                          if (!isSilentNetworkError(err)) setMessage(err.message);
                                        }
                                      }
                                    }}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>

              {/* Master Clinical Interpretation Template Library */}
              <section className="lab-form-card" style={{ marginTop: '24px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <p className="eyebrow">Clinical Interpretation Library</p>
                    <h2>Test-Specific Preloaded Clinical Interpretations</h2>
                  </div>
                  <button className="secondary" type="button" onClick={() => setInterpTabOpen(!interpTabOpen)}>
                    {interpTabOpen ? 'Collapse Library' : '🩺 Manage Clinical Interpretation Templates'}
                  </button>
                </div>

                {interpTabOpen && (
                  <div style={{ marginTop: '16px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                      Preload and manage professional diagnostic interpretation templates mapped to specific laboratory test types for Sample Collector selection.
                    </p>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!interpForm.title.trim() || !interpForm.interpretation.trim()) return;
                        try {
                          await api('/clinical-interpretations', { token, method: 'POST', body: JSON.stringify(interpForm) });
                          setMessage('New clinical interpretation template added.');
                          setInterpForm({ laboratoryTestName: 'Lipid Profile', title: '', interpretation: '' });
                          loadInterps();
                        } catch (err) {
                          if (!isSilentNetworkError(err)) setMessage(err.message);
                        }
                      }}
                      style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}
                    >
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#075c91' }}>＋ Add New Interpretation Template</h4>
                      <div className="form-grid" style={{ gap: '10px' }}>
                        <label>Laboratory Test Type
                          <input
                            required
                            value={interpForm.laboratoryTestName}
                            onChange={e => setInterpForm({ ...interpForm, laboratoryTestName: e.target.value })}
                            placeholder="e.g. Lipid Profile, Semen Analysis, CBC"
                          />
                        </label>
                        <label>Template Title<input required value={interpForm.title} onChange={e => setInterpForm({ ...interpForm, title: e.target.value })} placeholder="e.g. Lipid Profile Risk Assessment" /></label>
                        <label className="wide">Interpretation Body
                          <textarea required rows={3} value={interpForm.interpretation} onChange={e => setInterpForm({ ...interpForm, interpretation: e.target.value })} placeholder="Enter standard non-diagnostic clinical interpretation text..." />
                        </label>
                      </div>
                      <button className="primary" style={{ marginTop: '12px' }}>Save Template</button>
                    </form>

                    <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                            <th style={{ padding: '8px 10px' }}>Test Type</th>
                            <th style={{ padding: '8px 10px' }}>Title</th>
                            <th style={{ padding: '8px 10px' }}>Interpretation</th>
                            <th style={{ padding: '8px 10px' }}>Status</th>
                            <th style={{ padding: '8px 10px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {interpList.map(item => (
                            <tr key={item._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 700, color: '#075c91' }}>{item.laboratoryTestName}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 700 }}>{item.title}</td>
                              <td style={{ padding: '8px 10px', maxWidth: '360px', whiteSpace: 'pre-line' }}>{item.interpretation}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: item.active ? '#dcfce7' : '#f1f5f9', color: item.active ? '#15803d' : '#64748b' }}>
                                  {item.active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <button
                                  type="button"
                                  className="secondary"
                                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                  onClick={async () => {
                                    try {
                                      await api(`/clinical-interpretations/${item._id}`, { token, method: 'PUT', body: JSON.stringify({ active: !item.active }) });
                                      loadInterps();
                                    } catch (err) {
                                      if (!isSilentNetworkError(err)) setMessage(err.message);
                                    }
                                  }}
                                >
                                  {item.active ? 'Deactivate' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>

              {/* Detailed Parameter Range & Demographic Modal Drawer */}
              {editingParam && (
                <div className="lab-drawer-backdrop" onClick={() => setEditingParam(null)}>
                  <form
                    className="lab-edit-drawer"
                    style={{ maxWidth: '640px', width: '92vw' }}
                    onClick={e => e.stopPropagation()}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await api(`/report-entry/parameters/${editingParam._id}`, {
                          token,
                          method: 'PUT',
                          body: JSON.stringify(editingParam)
                        });
                        setMessage(`Reference interval for "${editingParam.parameterName}" updated successfully.`);
                        setEditingParam(null);
                        loadParams();
                      } catch (err) {
                        if (!isSilentNetworkError(err)) setMessage(err.message);
                      }
                    }}
                  >
                    <header>
                      <div>
                        <p className="eyebrow">Clinical Reference Interval</p>
                        <h2>{editingParam.parameterName}</h2>
                        <span>Configure clinical interpretation range, instrument, and demographic thresholds.</span>
                      </div>
                      <button type="button" className="modal-close" onClick={() => setEditingParam(null)}>×</button>
                    </header>

                    <div className="lab-drawer-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                      <div className="form-grid" style={{ gap: '12px' }}>
                        <label>Parameter Name
                          <input required value={editingParam.parameterName} onChange={e => setEditingParam({ ...editingParam, parameterName: e.target.value })} />
                        </label>
                        <label>Reporting SI Unit
                          <input value={editingParam.unit || ''} onChange={e => setEditingParam({ ...editingParam, unit: e.target.value })} placeholder="e.g. g/dL, mg/dL, mmol/L" />
                        </label>
                        <label>Associated Instrument / Method
                          <select value={editingParam.methodOrAnalyzer || ''} onChange={e => setEditingParam({ ...editingParam, methodOrAnalyzer: e.target.value })}>
                            {DEFAULT_ANALYZERS.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </label>
                        <label>Specimen Type
                          <select value={editingParam.specimenType || 'Serum'} onChange={e => setEditingParam({ ...editingParam, specimenType: e.target.value })}>
                            {SPECIMEN_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </label>
                        <label>Result Type
                          <select value={editingParam.resultType || 'Numeric'} onChange={e => setEditingParam({ ...editingParam, resultType: e.target.value })}>
                            {RESULT_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </label>
                        <label>Reference Source
                          <select value={editingParam.referenceSource || 'Manufacturer Reagent Insert'} onChange={e => setEditingParam({ ...editingParam, referenceSource: e.target.value })}>
                            {REFERENCE_SOURCES.map(rs => <option key={rs} value={rs}>{rs}</option>)}
                          </select>
                        </label>
                        <label className="wide">Reference Display Text
                          <input value={editingParam.referenceValue || ''} onChange={e => setEditingParam({ ...editingParam, referenceValue: e.target.value })} placeholder="e.g. 12.0–17.0 or Male: 14.4–16.6 | Female: 12.0–15.0" />
                        </label>
                        <label>Lower Reference Limit (Low)
                          <input type="number" step="any" value={editingParam.normalMin ?? ''} onChange={e => setEditingParam({ ...editingParam, normalMin: e.target.value })} placeholder="e.g. 12.0" />
                        </label>
                        <label>Upper Reference Limit (High)
                          <input type="number" step="any" value={editingParam.normalMax ?? ''} onChange={e => setEditingParam({ ...editingParam, normalMax: e.target.value })} placeholder="e.g. 17.0" />
                        </label>
                        <label style={{ color: '#991b1b' }}>Critical Low (Panic Cutoff)
                          <input type="number" step="any" value={editingParam.criticalLow ?? ''} onChange={e => setEditingParam({ ...editingParam, criticalLow: e.target.value })} placeholder="e.g. 7.0 (optional)" style={{ background: '#fef2f2', borderColor: '#fca5a5' }} />
                        </label>
                        <label style={{ color: '#991b1b' }}>Critical High (Panic Cutoff)
                          <input type="number" step="any" value={editingParam.criticalHigh ?? ''} onChange={e => setEditingParam({ ...editingParam, criticalHigh: e.target.value })} placeholder="e.g. 20.0 (optional)" style={{ background: '#fef2f2', borderColor: '#fca5a5' }} />
                        </label>
                        <label className="wide">Verification Status
                          <select value={editingParam.verificationStatus || 'Requires Laboratory Verification'} onChange={e => setEditingParam({ ...editingParam, verificationStatus: e.target.value })}>
                            <option value="Requires Laboratory Verification">Requires Laboratory Verification</option>
                            <option value="Verified">Verified by Laboratory Professional</option>
                          </select>
                        </label>
                        <label className="wide">Clinical Notes / Interpretation
                          <textarea rows={2} value={editingParam.notes || ''} onChange={e => setEditingParam({ ...editingParam, notes: e.target.value })} placeholder="Diagnostic notes, method sensitivity, or population guidance..." />
                        </label>
                      </div>

                      {/* Demographic Sub-ranges Builder */}
                      <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>👥 Demographic-Specific Reference Intervals</strong>
                          <button
                            type="button"
                            className="secondary"
                            style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                            onClick={() => {
                              const currentRanges = Array.isArray(editingParam.demographicRanges) ? [...editingParam.demographicRanges] : [];
                              currentRanges.push({
                                demographic: 'Female',
                                gender: 'Female',
                                normalMin: null,
                                normalMax: null,
                                criticalLow: null,
                                criticalHigh: null,
                                referenceValue: ''
                              });
                              setEditingParam({ ...editingParam, demographicRanges: currentRanges });
                            }}
                          >
                            ＋ Add Demographic Interval
                          </button>
                        </div>

                        {Array.isArray(editingParam.demographicRanges) && editingParam.demographicRanges.length > 0 ? (
                          editingParam.demographicRanges.map((dr, idx) => (
                            <div key={idx} style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #cbd5e1' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                                <label style={{ fontSize: '0.74rem' }}>Target
                                  <select
                                    value={dr.gender || 'All'}
                                    onChange={e => {
                                      const updated = [...editingParam.demographicRanges];
                                      updated[idx] = { ...updated[idx], gender: e.target.value, demographic: e.target.value };
                                      setEditingParam({ ...editingParam, demographicRanges: updated });
                                    }}
                                  >
                                    <option value="All">All</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                  </select>
                                </label>
                                <label style={{ fontSize: '0.74rem' }}>Group
                                  <input
                                    type="text"
                                    value={dr.demographic || ''}
                                    placeholder="e.g. Adult, Pediatric"
                                    onChange={e => {
                                      const updated = [...editingParam.demographicRanges];
                                      updated[idx] = { ...updated[idx], demographic: e.target.value };
                                      setEditingParam({ ...editingParam, demographicRanges: updated });
                                    }}
                                  />
                                </label>
                                <label style={{ fontSize: '0.74rem' }}>Low
                                  <input
                                    type="number"
                                    step="any"
                                    value={dr.normalMin ?? ''}
                                    placeholder="Min"
                                    onChange={e => {
                                      const updated = [...editingParam.demographicRanges];
                                      updated[idx] = { ...updated[idx], normalMin: e.target.value === '' ? null : Number(e.target.value) };
                                      setEditingParam({ ...editingParam, demographicRanges: updated });
                                    }}
                                  />
                                </label>
                                <label style={{ fontSize: '0.74rem' }}>High
                                  <input
                                    type="number"
                                    step="any"
                                    value={dr.normalMax ?? ''}
                                    placeholder="Max"
                                    onChange={e => {
                                      const updated = [...editingParam.demographicRanges];
                                      updated[idx] = { ...updated[idx], normalMax: e.target.value === '' ? null : Number(e.target.value) };
                                      setEditingParam({ ...editingParam, demographicRanges: updated });
                                    }}
                                  />
                                </label>
                                <label style={{ fontSize: '0.74rem', gridColumn: 'span 2' }}>Reference Text
                                  <input
                                    type="text"
                                    value={dr.referenceValue || ''}
                                    placeholder="e.g. 12.0–15.0"
                                    onChange={e => {
                                      const updated = [...editingParam.demographicRanges];
                                      updated[idx] = { ...updated[idx], referenceValue: e.target.value };
                                      setEditingParam({ ...editingParam, demographicRanges: updated });
                                    }}
                                  />
                                </label>
                              </div>
                              <button
                                type="button"
                                className="secondary danger"
                                style={{ fontSize: '0.7rem', padding: '2px 8px', marginTop: '6px' }}
                                onClick={() => {
                                  const updated = editingParam.demographicRanges.filter((_, i) => i !== idx);
                                  setEditingParam({ ...editingParam, demographicRanges: updated });
                                }}
                              >
                                Remove Demographic Interval
                              </button>
                            </div>
                          ))
                        ) : (
                          <small style={{ color: '#64748b', fontStyle: 'italic' }}>No demographic intervals configured. Universal range applies.</small>
                        )}
                      </div>

                      {/* Audit History & Restore Previous Version */}
                      {Array.isArray(editingParam.auditHistory) && editingParam.auditHistory.length > 0 && (
                        <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#475569' }}>📜 Audit History ({editingParam.auditHistory.length} edits)</strong>
                            <button
                              type="button"
                              className="secondary"
                              style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                              onClick={() => handleRestoreAudit(editingParam._id)}
                            >
                              ↺ Restore Previous Value
                            </button>
                          </div>
                          <div style={{ maxHeight: '140px', overflowY: 'auto', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                            {editingParam.auditHistory.slice(-5).reverse().map((entry, idx) => (
                              <div key={idx} style={{ marginBottom: '6px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '4px' }}>
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{entry.changedBy || 'Admin'}</span> · {new Date(entry.changedAt).toLocaleString()}
                                {entry.reason && <em> ({entry.reason})</em>}
                                {entry.previousValues?.referenceValue && (
                                  <div style={{ color: '#64748b' }}>
                                    Prev Range: {entry.previousValues.referenceValue} (Unit: {entry.previousValues.unit || '—'})
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <footer>
                      <button type="button" onClick={() => setEditingParam(null)}>Cancel</button>
                      <button className="primary">Save Changes</button>
                    </footer>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="lab-empty"><h2>Select a category</h2></div>
          )}
        </main>
      </div>

      {/* Edit Test Drawer */}
      {editingTest && editForm && (() => {
        const isEditingCbc = /^CBC$/i.test(editingTest?.subcategory || '') && /^HEMATOLOGY$/i.test(data.categories.find(c => c._id === (editForm.categoryId || editingTest?.category?._id || editingTest?.category))?.name || '');
        return (
          <div className="lab-drawer-backdrop" role="presentation" onClick={closeEdit}>
            <form className="lab-edit-drawer" aria-label="Edit laboratory test" onClick={event => event.stopPropagation()} onSubmit={saveEdit}>
              <header>
                <div>
                  <p className="eyebrow">Laboratory catalogue</p>
                  <h2>Edit laboratory test</h2>
                  <span>Update the complete test definition.</span>
                </div>
                <button type="button" className="modal-close" aria-label="Close edit drawer" disabled={savingEdit} onClick={closeEdit}>×</button>
              </header>
              <div className="lab-drawer-body">
                <label>Test Name<input required value={editForm.name} onChange={event => setEditForm({ ...editForm, name: event.target.value })} /></label>
                {isEditingCbc ? (
                  <div style={{ background: '#e0f2fe', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#0369a1', display: 'block' }}>🩸 CBC Sub-test Parameter</strong>
                    <span style={{ fontSize: '0.8rem', color: '#0369a1' }}>
                      Individual price setting is disabled. CBC uses the Complete CBC Fixed Price ({data.settings?.cbcGroupPrice ?? 150} ETB).
                    </span>
                  </div>
                ) : (
                  <label>Price (ETB)<input required type="number" min="0" step="0.01" value={editForm.price} onChange={event => setEditForm({ ...editForm, price: event.target.value })} /></label>
                )}
                <label>Main Category
                  <select value={editForm.categoryId} onChange={event => setEditForm({ ...editForm, categoryId: event.target.value })}>
                    {data.categories.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}
                  </select>
                </label>
                <label>Status
                  <select value={editForm.status} onChange={event => setEditForm({ ...editForm, status: event.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
                <label>Description<textarea value={editForm.description} onChange={event => setEditForm({ ...editForm, description: event.target.value })} /></label>
                <div className="wide">
                  <strong>Default consumables</strong>
                  {editForm.consumables.map((c, i) => (
                    <div className="form-grid" key={i}>
                      <select value={c.item} onChange={e => setEditForm({ ...editForm, consumables: editForm.consumables.map((x, n) => n === i ? { ...x, item: e.target.value } : x) })}>
                        <option value="">Choose stock item</option>
                        {data.stockItems.map(item => <option key={item._id} value={item._id}>{item.itemName}</option>)}
                      </select>
                      <input type="number" min="1" value={c.quantity} onChange={e => setEditForm({ ...editForm, consumables: editForm.consumables.map((x, n) => n === i ? { ...x, quantity: e.target.value } : x) })} />
                      <button type="button" onClick={() => setEditForm({ ...editForm, consumables: editForm.consumables.filter((_, n) => n !== i) })}>Remove</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEditForm({ ...editForm, consumables: [...editForm.consumables, { item: '', quantity: 1 }] })}>+ Add consumable</button>
                </div>
              </div>
              <footer>
                <button type="button" disabled={savingEdit} onClick={closeEdit}>Cancel</button>
                <button className="primary" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save changes'}</button>
              </footer>
            </form>
          </div>
        );
      })()}
    </section>
  );
}
