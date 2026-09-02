import { useEffect, useMemo, useState } from 'react';
import { api, isSilentNetworkError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { useLocation } from 'react-router-dom';
import LaboratoryResultEditor from '../components/LaboratoryResultEditor.jsx';
import InternalMedicineEditor from '../components/InternalMedicineEditor.jsx';
import ReportPreview from '../components/ReportPreview.jsx';
import { useScrollLock } from '../utils/useScrollLock.js';
import ModalPortal from '../components/ModalPortal.jsx';
const emptyReport = {
  equipment: [],
  results: [],
  comments: '',
  sampleCollectorComments: [],
  testInterpretations: []
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
import { calculateFlag } from '../utils/flagHelper.jsx';
function flagFor(row, sex = '') {
  return calculateFlag(row.result, row.referenceValue, sex);
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
    const selectedIds = new Set((patient?.laboratoryTests || []).map(idOf));
    const selectedNames = new Set((patient?.laboratoryTests || []).map(t => typeof t === 'string' ? t : (t?.name || '')).filter(Boolean));
    return (catalog || []).map(category => ({
      ...category,
      tests: (category.tests || []).filter(test => selectedIds.has(idOf(test)) || selectedNames.has(test.name))
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
    [previewOpen, setPreviewOpen] = useState(false),
    [otherOpen, setOtherOpen] = useState(false),
    [other, setOther] = useState(emptyOther),
    [editingParameters, setEditingParameters] = useState(false),
    [parameterSnapshot, setParameterSnapshot] = useState([]),
    [hidden, setHidden] = useState([]),
    [confirmSubmit, setConfirmSubmit] = useState(false);

  useScrollLock(previewOpen || confirmSubmit);
  const [request, setRequest] = useState(emptyRequest),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [branchFilter, setBranchFilter] = useState('All'),
    [allocationByTest, setAllocationByTest] = useState({}),
    [paramCatalog, setParamCatalog] = useState([]),
    [bpSystolic, setBpSystolic] = useState(''),
    [bpDiastolic, setBpDiastolic] = useState('');

  const safeQueue = useMemo(() => (Array.isArray(queue) ? queue.filter(x => x && x.patient) : []), [queue]);
  const queuedList = useMemo(() => safeQueue.filter(x => x.collection?.status === 'Queued'), [safeQueue]);
  const unfinishedList = useMemo(() => safeQueue.filter(x => x.collection?.status === 'In Progress'), [safeQueue]);

  useEffect(() => {
    if (selected) {
      setBpSystolic(selected.systolicBP || '');
      setBpDiastolic(selected.diastolicBP || '');
    } else {
      setBpSystolic('');
      setBpDiastolic('');
    }
  }, [selected]);

  const handleSaveVitals = async () => {
    if (!selected?._id) return;
    if (bpSystolic && (Number(bpSystolic) < 50 || Number(bpSystolic) > 300)) {
      setError('Systolic BP must be between 50 and 300 mmHg.');
      return;
    }
    if (bpDiastolic && (Number(bpDiastolic) < 30 || Number(bpDiastolic) > 200)) {
      setError('Diastolic BP must be between 30 and 200 mmHg.');
      return;
    }
    try {
      setBusy(true);
      await api(`/collection/patients/${selected._id}/vital-signs`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          systolicBP: bpSystolic ? Number(bpSystolic) : null,
          diastolicBP: bpDiastolic ? Number(bpDiastolic) : null
        })
      });
      setMessage('✅ Vital Signs updated successfully.');
      setSelected(prev => ({
        ...prev,
        systolicBP: bpSystolic ? Number(bpSystolic) : null,
        diastolicBP: bpDiastolic ? Number(bpDiastolic) : null
      }));
      load();
    } catch (err) {
      if (isSilentNetworkError(err)) {
        console.warn('Vital signs update network error (silent):', err);
        return;
      }
      setError(err.message || 'Failed to update vital signs.');
    } finally {
      setBusy(false);
    }
  };

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
      if (report.results?.length || report.equipment?.length || report.comments || report.sampleCollectorComments?.length || report.testInterpretations?.length) {
        api(`/collection/patients/${selected._id}/report`, {
          token,
          method: 'PUT',
          body: JSON.stringify(report),
          showLoading: false
        }).catch(() => {});
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [report, selected, token]);

  const refreshParamCatalog = () => {
    api('/report-entry/catalog', { token })
      .then(res => setParamCatalog(Array.isArray(res?.catalog) ? res.catalog : []))
      .catch(() => {});
  };

  const load = async () => {
    try {
      const qParam = user?.role === 'Admin' && branchFilter !== 'All' ? `?branchName=${branchFilter}` : '';
      const [d, q, e, s, tests, pCat] = await Promise.all([
        api(`/collection/dashboard${qParam}`, { token }).catch(() => null),
        api(`/collection/queue${qParam}`, { token }).catch(() => ({ queue: [] })),
        api('/report-entry/equipment', { token }).catch(() => ({ equipment: [], parameters: {}, equipmentDetails: {} })),
        api('/collection/stock', { token }).catch(() => ({ items: [] })),
        api('/laboratory-tests/catalog', { token }).catch(() => ({ categories: [] })),
        api('/report-entry/catalog', { token }).catch(() => ({ catalog: [] }))
      ]);
      setDash(d);
      setQueue(Array.isArray(q?.queue) ? q.queue : []);
      setEquipment(e || { equipment: [], parameters: {}, equipmentDetails: {} });
      setStock(Array.isArray(s?.items) ? s.items : []);
      setCatalog(Array.isArray(tests?.categories) ? tests.categories : []);
      setParamCatalog(Array.isArray(pCat?.catalog) ? pCat.catalog : []);
    } catch (e) {
      if (isSilentNetworkError(e)) {
        console.warn('Collection load error (silent):', e);
        return;
      }
      setError(e.message || 'Failed to load collection workspace.');
    }
  };
  useEffect(() => {
    load();
  }, [token, branchFilter]);
  useEffect(() => {
    subscribe('collection:change', load);
    return () => unsubscribe('collection:change', load);
  }, [subscribe, unsubscribe]);
  useEffect(() => {
    const resume = location.state?.resume;
    if (resume) {
      const patientObj = (resume.patient && typeof resume.patient === 'object') ? resume.patient : {};
      setSelected(patientObj);
      setReport({
        ...resume,
        patient: patientObj,
        equipment: resume.equipment || [],
        results: resume.results || [],
        comments: resume.comments || '',
        sampleCollectorComments: resume.sampleCollectorComments || [],
        testInterpretations: resume.testInterpretations || []
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
      const draftPatient = (draft.report?.patient && typeof draft.report.patient === 'object') ? draft.report.patient : {};
      const mergedPatient = { ...(row.patient || {}), ...draftPatient };
      setSelected(mergedPatient);
      setReport({ ...finalReport, patient: mergedPatient });
      setGenerated(null);
      setTab('report');
      setMessage(draft.report || savedLocal ? 'Unfinished collection restored.' : 'Collection started.');
      load();
    } catch (e) {
      if (isSilentNetworkError(e)) {
        console.warn('Collection start error (silent):', e);
        return;
      }
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
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const save = async (submit = false) => {
    if (!selected) return;
    setError('');
    setMessage('');
    if (submit) setIsSubmitting(true);
    else setIsSavingDraft(true);
    setBusy(true);

    try {
      const cleanResults = (Array.isArray(report.results) ? report.results : []).filter(r => r && r.sampleName && String(r.sampleName).trim() && r.result !== undefined && r.result !== null && String(r.result).trim() !== '');
      if (submit && cleanResults.length === 0) {
        setError('Cannot submit report without laboratory results. Please enter at least one result.');
        setIsSubmitting(false);
        setBusy(false);
        return;
      }
      const payload = {
        ...report,
        results: cleanResults,
        systolicBP: bpSystolic ? Number(bpSystolic) : null,
        diastolicBP: bpDiastolic ? Number(bpDiastolic) : null
      };

      // 1. Save draft payload via PUT
      await api(`/collection/patients/${selected._id}/report`, {
        token,
        method: 'PUT',
        body: JSON.stringify(payload),
        showLoading: true
      });

      if (submit) {
        // 2. Submit report via POST
        await api(`/collection/patients/${selected._id}/report/submit`, {
          token,
          method: 'POST',
          showLoading: true
        });
        setMessage('✅ Report submitted successfully for approval.');
        setSelected(null);
        setTab('queue');
      } else {
        setMessage('✅ Draft report saved successfully.');
      }
      load();
    } catch (e) {
      if (isSilentNetworkError(e)) {
        console.warn('Report save/submit error (silent):', e);
        return;
      }
      setError(e.message || 'Failed to process report action.');
    } finally {
      setIsSavingDraft(false);
      setIsSubmitting(false);
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!selected) return;
    setError('');
    setMessage('');
    setIsGeneratingPreview(true);
    setBusy(true);

    try {
      const cleanResults = (Array.isArray(report.results) ? report.results : []).filter(r => r && r.sampleName && String(r.sampleName).trim() && r.result !== undefined && r.result !== null && String(r.result).trim() !== '');
      const payload = { ...report, results: cleanResults };
      await api(`/collection/patients/${selected._id}/report`, {
        token,
        method: 'PUT',
        body: JSON.stringify(payload),
        showLoading: false
      });
      const res = await api(`/report-entry/patients/${selected._id}/generate`, {
        token,
        method: 'POST',
        showLoading: false
      });
      setGenerated(res.report);
      setPreviewOpen(true);
    } catch (e) {
      if (isSilentNetworkError(e)) {
        console.warn('Report preview error (silent):', e);
        return;
      }
      setError(e.message || 'Failed to generate report preview.');
    } finally {
      setIsGeneratingPreview(false);
      setBusy(false);
    }
  };

  // Group results by category for the preview modal
  const groupResultsByCategory = (results) => {
    if (!results || !results.length) return [];
    const groups = new Map();
    results.forEach(row => {
      // Find which category this parameter belongs to from the paramCatalog
      const catParam = (paramCatalog || []).find(p => p.parameterName === row.sampleName);
      const catName = catParam?.category || 'OTHER';
      if (!groups.has(catName)) groups.set(catName, []);
      groups.get(catName).push(row);
    });
    return Array.from(groups.entries());
  };
  return <section className="page collection-page collector-page"><header className="dash-header"><div><p className="eyebrow">Laboratory technician workspace</p><h1>Welcome, {user.fullName} <span className="collector-paid" style={{ marginLeft: '10px', fontSize: '0.85rem' }}>📍 Branch: {user.branchName || 'Main'}</span></h1><p className="intro">Review orders, collect samples, and produce accurate laboratory reports.</p></div></header>{error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}<div className="reception-tabs">{[['queue', `Patient queue (${queuedList.length})`], ['unfinished', `Unfinished collections (${unfinishedList.length})`], ['report', 'Result entry'], ['stock', 'Available stock']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
{tab === 'queue' && <><div className="enterprise-grid">{[['Today’s collections', dash?.summary.todayCollections], ['Pending collections', dash?.summary.pendingCollections], ['In progress', dash?.summary.inProgress], ['Pending approvals', dash?.summary.pendingApprovals]].map(([label, value]) => <article className="enterprise-card blue" key={label}><small>{label}</small><strong>{value ?? '—'}</strong></article>)}</div>
{unfinishedList.length > 0 && (
  <div className="unfinished-banner">
    <div>
      <strong>⚡ {unfinishedList.length} Unfinished Collection{unfinishedList.length > 1 ? 's' : ''} In Progress</strong>
      <span>Active collections are automatically saved and ready to resume anytime.</span>
    </div>
    <button className="primary" style={{ background: '#e69c00', border: 'none' }} onClick={() => setTab('unfinished')}>View Unfinished Collections ({unfinishedList.length})</button>
  </div>
)}
<section className="collector-queue"><header><div><p className="eyebrow">Sample collection queue</p><h2>Patients awaiting laboratory work</h2></div></header><div className="collector-queue-list">{queuedList.length ? queuedList.map(row => <article className="collector-patient-card" key={row.patient._id}><div className="collector-patient-summary"><div className="collector-patient-avatar">{row.patient.name?.[0]}</div><div className="collector-patient-main"><h3>{row.patient.name}</h3><p>{row.patient.patientId} · {row.patient.age} · {row.patient.sex} · {row.patient.phone}{(row.patient.systolicBP || row.patient.diastolicBP) ? ` · 🫀 BP: ${row.patient.systolicBP || '—'}/${row.patient.diastolicBP || '—'} mmHg` : ''}</p></div><aside><span className="collector-paid">{row.patient.paymentStatus === 'Paid' ? 'Ready for Sample Collection' : 'Counseling'}</span><button className="primary" disabled={busy || row.collection.status === 'Completed'} onClick={() => start(row)}>{row.collection.status === 'In Progress' ? 'Continue Collection' : 'Start collection'}</button></aside></div><OrderedTests patient={row.patient} catalog={catalog} allocationByTest={row.allocationByTest || {}} /></article>) : <p className="empty">No queued patients awaiting sample collection.</p>}</div></section></>}
{tab === 'unfinished' && <section className="collector-queue"><header><div><p className="eyebrow">Active & Recovered Work</p><h2>Unfinished Sample Collections</h2></div></header><div className="collector-queue-list">{unfinishedList.length ? unfinishedList.map(row => <article className="collector-patient-card unfinished-card" key={row.patient._id}><div className="collector-patient-summary"><div className="collector-patient-avatar unfinished-avatar">⏳</div><div className="collector-patient-main"><h3>{row.patient.name} <small className="unfinished-badge">Unfinished</small></h3><p>{row.patient.patientId} · {row.patient.barcode || ''}{(row.patient.systolicBP || row.patient.diastolicBP) ? ` · 🫀 BP: ${row.patient.systolicBP || '—'}/${row.patient.diastolicBP || '—'} mmHg` : ''} · Started: {row.collection?.startedAt ? new Date(row.collection.startedAt).toLocaleString() : 'In Progress'}</p></div><aside><button className="primary unfinished-btn" disabled={busy} onClick={() => start(row)}>Continue Collection</button></aside></div><OrderedTests patient={row.patient} catalog={catalog} allocationByTest={row.allocationByTest || {}} /></article>) : <div className="empty-state"><h2>No unfinished collections</h2><p>When you start a sample collection, it will be automatically saved and displayed here if left incomplete.</p></div>}</div></section>}
{tab === 'report' && <section className="reception-form collector-report"><div><p className="eyebrow">Laboratory report</p><h2>{selected ? `${selected.name} · ${selected.patientId}` : 'Select a patient from the queue'}</h2></div>{selected && <>
  {/* Vital Signs (Blood Pressure) Bar */}
  <div style={{
    background: 'var(--color-surface-container, #f8fafc)',
    border: '1px solid var(--color-outline-variant, #cbd5e1)',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '1.2rem' }}>🫀</span>
      <div>
        <strong style={{ fontSize: '0.88rem', color: 'var(--color-primary, #075c91)', display: 'block' }}>
          Vital Signs (Blood Pressure)
        </strong>
        <small style={{ color: 'var(--color-on-surface-variant, #64748b)' }}>
          Shared clinical BP record across Reception &amp; Sample Collection
        </small>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Systolic (mmHg):</label>
        <input
          type="number"
          min="50"
          max="300"
          placeholder="e.g. 120"
          value={bpSystolic}
          onChange={e => setBpSystolic(e.target.value)}
          style={{ width: '85px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-outline-variant, #cbd5e1)', fontSize: '0.85rem' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Diastolic (mmHg):</label>
        <input
          type="number"
          min="30"
          max="200"
          placeholder="e.g. 80"
          value={bpDiastolic}
          onChange={e => setBpDiastolic(e.target.value)}
          style={{ width: '85px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-outline-variant, #cbd5e1)', fontSize: '0.85rem' }}
        />
      </div>

      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={handleSaveVitals}
        style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
      >
        Update Vitals
      </button>
    </div>
  </div>

  {Boolean(selected?.examinationFormType === 'Internal Medicine Speciality Examination Form' ||
    report?.isInternalMedicineForm === true) ? (
    <InternalMedicineEditor
      patient={selected}
      report={report}
      onSave={(savedReport) => {
        setReport(savedReport);
        setMessage('Draft saved successfully.');
        load();
      }}
      onSubmit={(submittedReport) => {
        setSelected(null);
        setTab('queue');
        setMessage('Internal Medicine Medical Report submitted for approval!');
        load();
      }}
      onCancel={() => {
        setSelected(null);
        setTab('queue');
      }}
    />
  ) : (
    <>
      <OrderedTests patient={selected} catalog={catalog} allocationByTest={allocationByTest} />
      <LaboratoryResultEditor patient={selected} catalog={paramCatalog} labTestCatalog={catalog} reportData={report} onChange={setReport} onSaveDraft={() => save(false)} onGeneratePreview={generate} onSubmitApproval={() => setConfirmSubmit(true)} busy={busy} isSavingDraft={isSavingDraft} isGeneratingPreview={isGeneratingPreview} isSubmitting={isSubmitting} equipmentData={equipment} onPickEquipment={pickEquipment} otherOpen={otherOpen} setOtherOpen={setOtherOpen} onCatalogRefresh={refreshParamCatalog} otherEquipmentForm={<div className="other-equipment-form"><h3>Other Equipment</h3><div className="form-grid">{[['name', 'Equipment Name'], ['manufacturer', 'Manufacturer'], ['model', 'Model'], ['department', 'Department']].map(([key, label]) => <label key={key}>{label}<input value={other[key]} onChange={e => setOther({ ...other, [key]: e.target.value })} /></label>)}<label className="wide">Remarks<textarea value={other.remarks} onChange={e => setOther({ ...other, remarks: e.target.value })} /></label></div><div className="form-actions"><button type="button" className="secondary" onClick={() => setOtherOpen(false)}>Cancel</button><button type="button" className="primary" onClick={addOther}>Add equipment</button></div></div>} />
    </>
  )}
</>}</section>}
{tab === 'stock' && <section className="table-card"><h2>Available consumables</h2><table><thead><tr><th>Item</th><th>Code</th><th>Remaining</th><th>Status</th></tr></thead><tbody>{stock.map(item => <tr key={item._id}><td>{item.itemName}</td><td>{item.itemCode}</td><td>{item.remainingQuantity} {item.unit}</td><td>{item.remainingQuantity <= item.minimumThreshold ? 'Low stock' : 'Available'}</td></tr>)}</tbody></table></section>}
<ModalPortal isOpen={confirmSubmit} onClose={() => setConfirmSubmit(false)}>
  <div className="modal-content" onClick={e => e.stopPropagation()}>
    <h2>Confirm report accuracy</h2>
    <p>Please review the report carefully before submission.</p>
    <div className="form-actions">
      <button type="button" className="secondary" onClick={() => setConfirmSubmit(false)}>Review again</button>
      <button type="button" className="primary" onClick={() => {
        setConfirmSubmit(false);
        save(true);
      }}>Submit for approval</button>
    </div>
  </div>
</ModalPortal>

<ModalPortal isOpen={previewOpen && !!generated} onClose={() => setPreviewOpen(false)}>
  <div className="modal-content" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
    <header className="modal-header">
      <h2>Laboratory Report Preview</h2>
      <button type="button" className="close-button" onClick={() => setPreviewOpen(false)}>×</button>
    </header>

    <div className="modal-body" style={{ padding: '16px' }}>
      <ReportPreview report={generated} showFooter={true} />
    </div>

    <div className="form-actions" style={{ padding: '14px 24px', borderTop: '1px solid var(--color-outline-variant, #e2e8f0)', marginTop: 0, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
      <button type="button" className="secondary" onClick={() => setPreviewOpen(false)}>Close Preview</button>
      <button type="button" className="primary" onClick={() => { setPreviewOpen(false); setConfirmSubmit(true); }}>🚀 Proceed to Submit</button>
    </div>
  </div>
</ModalPortal>
{error && (
  <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '10px', background: '#ef4444', color: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', fontWeight: 600, fontSize: '0.9rem', maxWidth: '450px' }}>
    <span>❌</span><span style={{ flex: 1 }}>{error}</span><button type="button" onClick={() => setError('')} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px' }}>×</button>
  </div>
)}
{message && (
  <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '10px', background: '#10b981', color: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', fontWeight: 600, fontSize: '0.9rem', maxWidth: '450px' }}>
    <span>✅</span><span style={{ flex: 1 }}>{message}</span><button type="button" onClick={() => setMessage('')} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px' }}>×</button>
  </div>
)}
</section>;
}
