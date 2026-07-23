import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { useLocation } from 'react-router-dom';
const emptyReport = {
  equipment: [],
  results: [],
  comments: ''
};
const emptyRequest = {
  item: '',
  quantity: 1,
  reason: '',
  priority: 'Routine'
};
const emptyOther = {
  name: '',
  manufacturer: '',
  model: '',
  department: '',
  remarks: ''
};
const idOf = value => String(value?._id || value?.id || value);
function flagFor(row) {
  const value = Number(String(row.result || '').replace(',', '.')),
    range = String(row.referenceValue || '').replace(',', '.');
  if (!Number.isFinite(value)) return '';
  const match = range.match(/(-?\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (match) return value < Number(match[1]) ? 'L' : value > Number(match[2]) ? 'H' : 'N';
  const upper = range.match(/^\s*[<≤]\s*(-?\d+(?:\.\d+)?)/);
  if (upper) return value > Number(upper[1]) ? 'H' : 'N';
  const lower = range.match(/^\s*[>≥]\s*(-?\d+(?:\.\d+)?)/);
  return lower ? value < Number(lower[1]) ? 'L' : 'N' : '';
}
const flagText = flag => ({
  H: 'High',
  L: 'Low',
  N: 'Normal'
})[flag] || '—';
function OrderedTests({
  patient,
  catalog,
  allocationByTest
}) {
  const [openCategory, setOpenCategory] = useState(null);
  const groups = useMemo(() => {
    const selected = new Set((patient?.laboratoryTests || []).map(idOf));
    return (catalog || []).map(category => ({
      ...category,
      tests: (category.tests || []).filter(test => selected.has(idOf(test)))
    })).filter(category => category.tests.length);
  }, [patient, catalog]);

  return <section className="collector-ordered-tests"><div className="collector-ordered-title"><div><span>🧪</span><div><small>Requested investigations</small><h3>Ordered Laboratory Tests</h3></div></div><b>{groups.reduce((count, category) => count + category.tests.length, 0)}</b></div><div className="ordered-category-list">{groups.map((category, index) => {
        const open = openCategory === category._id;
        return <article className={`collector-test-category category-${index % 6} ${open ? 'open' : ''}`} key={category._id}><button type="button" onClick={() => setOpenCategory(open ? null : category._id)} aria-expanded={open}><span className="collector-category-icon">{['🩸', '🧪', '🧫', '🔬', '🦠', '🏥'][index % 6]}</span><span><strong>{category.name}</strong><small>{category.tests.length} selected test{category.tests.length === 1 ? '' : 's'}</small></span><i>{open ? '⌃' : '⌄'}</i></button>{open && <div className="collector-test-cards">{category.tests.map(test => {
          return <article className="collector-test-card" key={test._id}><span>✓</span><div><strong>{test.name}</strong><small>{test.requiredSampleTypes?.map(sample => sample.name).join(', ') || 'Specimen assigned automatically'}</small></div></article>;
        })}</div>}</article>;
      })}</div>
  </section>;
}
export default function CollectionPage() {
  const {
      token,
      user
    } = useAuth(),
    location = useLocation(),
    {
      subscribe,
      unsubscribe
    } = useRealtime();
  const [dash, setDash] = useState(),
    [queue, setQueue] = useState([]),
    [catalog, setCatalog] = useState([]),
    [equipment, setEquipment] = useState({
      equipment: [],
      parameters: {},
      equipmentDetails: {}
    }),
    [stock, setStock] = useState([]),
    [tab, setTab] = useState('queue'),
    [selected, setSelected] = useState(),
    [report, setReport] = useState(emptyReport),
    [generated, setGenerated] = useState(),
    [otherOpen, setOtherOpen] = useState(false),
    [other, setOther] = useState(emptyOther),
    [editingParameters, setEditingParameters] = useState(false),
    [parameterSnapshot, setParameterSnapshot] = useState([]),
    [hidden, setHidden] = useState([]),
    [confirmSubmit, setConfirmSubmit] = useState(false),
    [request, setRequest] = useState(emptyRequest),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [allocationByTest, setAllocationByTest] = useState({});

  const safeQueue = useMemo(() => (Array.isArray(queue) ? queue.filter(x => x && x.patient) : []), [queue]);
  const queuedList = useMemo(() => safeQueue.filter(x => x.collection?.status === 'Queued'), [safeQueue]);
  const unfinishedList = useMemo(() => safeQueue.filter(x => x.collection?.status === 'In Progress'), [safeQueue]);

  // Load per-patient allocation data per test from actual stock transactions
  const loadAllocation = (patientId) => {
    if (patientId) {
      api(`/collection/patients/${patientId}/allocation`, { token })
        .then(res => setAllocationByTest(res.allocationByTest || {}))
        .catch(() => setAllocationByTest({}));
    } else {
      setAllocationByTest({});
    }
  };
  useEffect(() => {
    loadAllocation(selected?._id);
  }, [selected, token]);

  // Persistent Auto-Save Effect
  useEffect(() => {
    if (!selected?._id) return;
    const localKey = `etu_draft_${selected._id}`;
    localStorage.setItem(localKey, JSON.stringify(report));

    const timer = setTimeout(() => {
      if (report.results?.length || report.equipment?.length || report.comments) {
        api(`/collection/patients/${selected._id}/report`, {
          token,
          method: 'PUT',
          body: JSON.stringify(report)
        }).catch(() => {});
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [report, selected, token]);

  const load = async () => {
    try {
      const [d, q, e, s, tests] = await Promise.all([
        api('/collection/dashboard', { token }).catch(() => null),
        api('/collection/queue', { token }).catch(() => ({ queue: [] })),
        api('/report-entry/equipment', { token }).catch(() => ({ equipment: [], parameters: {}, equipmentDetails: {} })),
        api('/collection/stock', { token }).catch(() => ({ items: [] })),
        api('/laboratory-tests/catalog', { token }).catch(() => ({ categories: [] }))
      ]);
      setDash(d);
      setQueue(Array.isArray(q?.queue) ? q.queue : []);
      setEquipment(e || { equipment: [], parameters: {}, equipmentDetails: {} });
      setStock(Array.isArray(s?.items) ? s.items : []);
      setCatalog(Array.isArray(tests?.categories) ? tests.categories : []);
    } catch (e) {
      setError(e.message || 'Failed to load collection workspace.');
    }
  };
  useEffect(() => {
    load();
  }, [token]);
  useEffect(() => {
    subscribe('collection:change', load);
    return () => unsubscribe('collection:change', load);
  }, [subscribe, unsubscribe]);
  useEffect(() => {
    const resume = location.state?.resume;
    if (resume) {
      setSelected(resume.patient);
      setReport({
        equipment: resume.equipment || [],
        results: resume.results || [],
        comments: resume.comments || ''
      });
      setTab('report');
    }
  }, [location.state]);
  useEffect(() => {
    const root = document.querySelector('.collector-report');
    if (!root) return;
    root.querySelectorAll('.parameter-row').forEach(row => {
      row.querySelectorAll('label input').forEach((input, index) => {
        input.readOnly = index !== 1 && !editingParameters;
        input.classList.toggle('parameter-locked', index !== 1 && !editingParameters);
      });
      const remove = row.querySelector('.remove-parameter');
      if (remove) remove.hidden = !editingParameters;
    });
    const addParameter = root.querySelector('.result-editor-head > button');
    if (addParameter) addParameter.hidden = !editingParameters;
  }, [editingParameters, report.results]);
  useEffect(() => {
    const heading = document.querySelector('.result-editor-head');
    if (!heading || heading.querySelector('.parameter-edit-actions')) return;
    const actions = document.createElement('div');
    actions.className = 'parameter-edit-actions';
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'secondary'; edit.textContent = 'Edit Parameters';
    edit.addEventListener('click', beginParameterEdit);
    const saveChanges = document.createElement('button');
    saveChanges.type = 'button'; saveChanges.className = 'primary'; saveChanges.textContent = 'Save Parameter Changes';
    saveChanges.addEventListener('click', saveParameterEdit);
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'secondary'; cancel.textContent = 'Cancel Editing';
    cancel.addEventListener('click', cancelParameterEdit);
    actions.append(edit, saveChanges, cancel); heading.append(actions);
    return () => actions.remove();
  }, [selected]);
  const start = async row => {
    setBusy(true);
    try {
      await api(`/collection/patients/${row.patient._id}/start`, {
        token,
        method: 'POST'
      });
      const draft = await api(`/report-entry/patients/${row.patient._id}/draft`, {
        token
      });
      let finalReport = draft.report || emptyReport;
      const localKey = `etu_draft_${row.patient._id}`;
      const savedLocal = localStorage.getItem(localKey);
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          if (parsed.results?.length || parsed.equipment?.length || parsed.comments) {
            finalReport = { ...finalReport, ...parsed };
          }
        } catch (e) {}
      }
      setSelected(row.patient);
      setReport(finalReport);
      setGenerated(null);
      setTab('report');
      setMessage(draft.report || savedLocal ? 'Unfinished collection restored.' : 'Collection started.');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const pickEquipment = name => {
    const on = report.equipment.includes(name),
      defaults = equipment.parameters[name] || [];
    setGenerated(null);
    setReport({
      ...report,
      equipment: on ? report.equipment.filter(x => x !== name) : [...report.equipment, name],
      results: on ? report.results.filter(row => !defaults.some(p => p.sampleName === row.sampleName)) : [...report.results, ...defaults.map(p => ({
        ...p,
        result: '',
        remarks: ''
      }))]
    });
  };
  const addOther = () => {
    if (!other.name.trim()) return setError('Equipment name is required.');
    const label = `Other Equipment: ${other.name}${other.model ? ` (${other.model})` : ''}${other.manufacturer ? ` — ${other.manufacturer}` : ''}`;
    setReport({
      ...report,
      equipment: report.equipment.includes(label) ? report.equipment : [...report.equipment, label]
    });
    setOtherOpen(false);
    setOther(emptyOther);
  };
  const updateRow = (i, patch) => {
    const results = [...report.results];
    results[i] = {
      ...results[i],
      ...patch
    };
    setGenerated(null);
    setReport({
      ...report,
      results
    });
  };
  const beginParameterEdit = () => {
    setParameterSnapshot(structuredClone(report.results));
    setEditingParameters(true);
  };
  const cancelParameterEdit = () => {
    setReport({ ...report, results: parameterSnapshot });
    setEditingParameters(false);
    setGenerated(null);
  };
  const saveParameterEdit = () => {
    setEditingParameters(false);
    setMessage('Parameter changes are applied to this report only.');
  };
  const removeRow = i => {
    setHidden(hidden.filter(n => n !== i).map(n => n > i ? n - 1 : n));
    setGenerated(null);
    setReport({
      ...report,
      results: report.results.filter((_, n) => n !== i)
    });
  };
  const addRow = () => setReport({
    ...report,
    results: [...report.results, {
      sampleName: '',
      result: '',
      unit: '',
      referenceValue: '',
      remarks: ''
    }]
  });
  const hideRow = i => setHidden([...hidden, i]);
  const restoreRow = i => setHidden(hidden.filter(n => n !== i));
  const save = async submit => {
    if (!selected) return;
    setBusy(true);
    try {
      await api(`/collection/patients/${selected._id}/report`, {
        token,
        method: 'PUT',
        body: JSON.stringify(report)
      });
      if (submit) await api(`/collection/patients/${selected._id}/report/submit`, {
        token,
        method: 'POST'
      });
      setMessage(submit ? 'Report submitted for approval.' : 'Draft report saved.');
      if (submit) {
        setSelected(null);
        setTab('queue');
      }
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const generate = async () => {
    setBusy(true);
    try {
      await api(`/collection/patients/${selected._id}/report`, {
        token,
        method: 'PUT',
        body: JSON.stringify(report)
      });
      setGenerated((await api(`/report-entry/patients/${selected._id}/generate`, {
        token,
        method: 'POST'
      })).report);
      setMessage('Laboratory report generated for review.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return <section className="page collection-page collector-page"><header className="dash-header"><div><p className="eyebrow">Laboratory technician workspace</p><h1>Welcome, {user.fullName}</h1><p className="intro">Review orders, collect samples, and produce accurate laboratory reports.</p></div></header>{error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}<div className="reception-tabs">{[['queue', `Patient queue (${queuedList.length})`], ['unfinished', `Unfinished collections (${unfinishedList.length})`], ['report', 'Result entry'], ['stock', 'Available stock']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
{tab === 'queue' && <><div className="enterprise-grid">{[['Today’s collections', dash?.summary.todayCollections], ['Pending collections', dash?.summary.pendingCollections], ['In progress', dash?.summary.inProgress], ['Pending approvals', dash?.summary.pendingApprovals]].map(([label, value]) => <article className="enterprise-card blue" key={label}><small>{label}</small><strong>{value ?? '—'}</strong></article>)}</div>
{unfinishedList.length > 0 && (
  <div style={{ background: '#fff8e6', border: '1px solid #ffe0b2', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
    <div>
      <strong style={{ color: '#b78103', display: 'block', fontSize: '14px' }}>⚡ {unfinishedList.length} Unfinished Collection{unfinishedList.length > 1 ? 's' : ''} In Progress</strong>
      <span style={{ fontSize: '12px', color: '#7a5a02' }}>Active collections are automatically saved and ready to resume anytime.</span>
    </div>
    <button className="primary" style={{ background: '#e69c00', border: 'none' }} onClick={() => setTab('unfinished')}>View Unfinished Collections ({unfinishedList.length})</button>
  </div>
)}
<section className="collector-queue"><header><div><p className="eyebrow">Sample collection queue</p><h2>Patients awaiting laboratory work</h2></div></header><div className="collector-queue-list">{queuedList.length ? queuedList.map(row => <article className="collector-patient-card" key={row.patient._id}><div className="collector-patient-summary"><div className="collector-patient-avatar">{row.patient.name?.[0]}</div><div className="collector-patient-main"><h3>{row.patient.name}</h3><p>{row.patient.patientId} · {row.patient.age} · {row.patient.sex} · {row.patient.phone}</p></div><aside><span className="collector-paid">{row.patient.paymentStatus === 'Paid' ? 'Paid' : 'Counseling'}</span><button className="primary" disabled={busy || row.collection.status === 'Completed'} onClick={() => start(row)}>{row.collection.status === 'In Progress' ? 'Continue Collection' : 'Start collection'}</button></aside></div><OrderedTests patient={row.patient} catalog={catalog} allocationByTest={row.allocationByTest || {}} /></article>) : <p className="empty">No queued patients awaiting sample collection.</p>}</div></section></>}
{tab === 'unfinished' && <section className="collector-queue"><header><div><p className="eyebrow">Active & Recovered Work</p><h2>Unfinished Sample Collections</h2></div></header><div className="collector-queue-list">{unfinishedList.length ? unfinishedList.map(row => <article className="collector-patient-card" key={row.patient._id} style={{ borderLeft: '4px solid #e69c00' }}><div className="collector-patient-summary"><div className="collector-patient-avatar" style={{ background: '#fff3e0', color: '#e69c00' }}>⏳</div><div className="collector-patient-main"><h3>{row.patient.name} <small style={{ background: '#fff3e0', color: '#b78103', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Unfinished</small></h3><p>{row.patient.patientId} · {row.patient.barcode || ''} · Started: {row.collection?.startedAt ? new Date(row.collection.startedAt).toLocaleString() : 'In Progress'}</p></div><aside><button className="primary" style={{ background: '#e69c00', border: 'none' }} disabled={busy} onClick={() => start(row)}>Continue Collection</button></aside></div><OrderedTests patient={row.patient} catalog={catalog} allocationByTest={row.allocationByTest || {}} /></article>) : <div className="empty-state"><h2>No unfinished collections</h2><p>When you start a sample collection, it will be automatically saved and displayed here if left incomplete.</p></div>}</div></section>}
{tab === 'report' && <section className="reception-form collector-report"><div><p className="eyebrow">Laboratory report</p><h2>{selected ? `${selected.name} · ${selected.patientId}` : 'Select a patient from the queue'}</h2></div>{selected && <><OrderedTests patient={selected} catalog={catalog} allocationByTest={allocationByTest} /><div className="equipment-heading"><div><p className="eyebrow">Analyzer selection</p><h3>Equipment used</h3></div><span>{report.equipment.length} selected</span></div><div className="equipment-card-grid">{equipment.equipment.map(name => {
            const detail = equipment.equipmentDetails?.[name] || {};
            return <button type="button" key={name} className={`equipment-card ${report.equipment.includes(name) ? 'chosen' : ''}`} onClick={() => pickEquipment(name)}><i>{detail.icon || '🧪'}</i><span><strong>{name}</strong><small>{detail.type}</small><em>{detail.manufacturer} · {detail.automation}</em></span><b>{detail.parameterCount || 0} parameters</b></button>;
          })}<button type="button" className="equipment-card other" onClick={() => setOtherOpen(true)}><i>＋</i><span><strong>Other Equipment</strong><small>Register a custom analyzer</small><em>Unlimited custom parameters</em></span></button></div>{otherOpen && <div className="other-equipment-form"><h3>Other Equipment</h3><div className="form-grid">{[['name', 'Equipment Name'], ['manufacturer', 'Manufacturer'], ['model', 'Model'], ['department', 'Department']].map(([key, label]) => <label key={key}>{label}<input value={other[key]} onChange={e => setOther({
                ...other,
                [key]: e.target.value
              })} /></label>)}<label className="wide">Remarks<textarea value={other.remarks} onChange={e => setOther({
                ...other,
                remarks: e.target.value
              })} /></label></div><div className="form-actions"><button type="button" className="secondary" onClick={() => setOtherOpen(false)}>Cancel</button><button type="button" className="primary" onClick={addOther}>Add equipment</button></div></div>}<div className="result-editor-head"><div><h3>Laboratory parameters</h3><p>Flags are calculated automatically from the configured reference range.</p></div><button type="button" className="secondary" onClick={addRow}>＋ Add Parameter</button></div><div className="professional-results">{report.results.map((row, i) => {
            const flag = flagFor(row);
            return <article className="parameter-row" key={`${row.sampleName}${i}`}><label>Parameter<input value={row.sampleName} onChange={e => updateRow(i, {
                  sampleName: e.target.value
                })} /></label><label>Result<input value={row.result} onChange={e => updateRow(i, {
                  result: e.target.value
                })} /></label><label>SI Unit<input value={row.unit || ''} onChange={e => updateRow(i, {
                  unit: e.target.value
                })} /></label><label>Reference Range<input value={row.referenceValue || ''} onChange={e => updateRow(i, {
                  referenceValue: e.target.value
                })} /></label><span className={`flag-badge ${flag || 'blank'}`}>{flag || '—'}<small>{flagText(flag)}</small></span><button type="button" className="remove-parameter" onClick={() => removeRow(i)}>×</button><label className="parameter-remarks">Remarks<input value={row.remarks || ''} onChange={e => updateRow(i, {
                  remarks: e.target.value
                })} /></label></article>;
          })}</div><label>Comments<textarea value={report.comments} onChange={e => setReport({
            ...report,
            comments: e.target.value
          })} /></label><div className="form-actions"><button className="secondary" disabled={busy || !report.results.length} onClick={() => save(false)}>Save draft</button><button className="secondary" disabled={busy || !report.results.length} onClick={generate}>Generate Report Preview</button><button className="primary" disabled={busy || !generated} onClick={() => setConfirmSubmit(true)}>Submit for approval</button></div>{generated && <section className="collector-preview"><p className="eyebrow">Report preview · Pending approval</p><h2>ETU Diagnostic Laboratory</h2><table><thead><tr><th>Parameter</th><th>Result</th><th>SI Unit</th><th>Reference range</th><th>Flag</th></tr></thead><tbody>{generated.results.map((row, i) => <tr key={i}><td>{row.sampleName}</td><td>{row.result}</td><td>{row.unit || '—'}</td><td>{row.referenceValue}</td><td><span className={`flag-badge ${row.flag || flagFor(row) || 'blank'}`}>{row.flag || flagFor(row) || '—'}</span></td></tr>)}</tbody></table></section>}</>}</section>}
{tab === 'stock' && <section className="table-card"><h2>Available consumables</h2><table><thead><tr><th>Item</th><th>Code</th><th>Remaining</th><th>Status</th></tr></thead><tbody>{stock.map(item => <tr key={item._id}><td>{item.itemName}</td><td>{item.itemCode}</td><td>{item.remainingQuantity} {item.unit}</td><td>{item.remainingQuantity <= item.minimumThreshold ? 'Low stock' : 'Available'}</td></tr>)}</tbody></table></section>}
{confirmSubmit && <div className="modal-backdrop"><div className="modal-content"><h2>Confirm report accuracy</h2><p>Please review the report carefully before submission.</p><div className="form-actions"><button className="secondary" onClick={() => setConfirmSubmit(false)}>Review again</button><button className="primary" onClick={() => {
            setConfirmSubmit(false);
            save(true);
          }}>Submit for approval</button></div></div></div>}</section>;
}
