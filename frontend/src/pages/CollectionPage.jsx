import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, isSilentNetworkError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { useLocation } from 'react-router-dom';
import LaboratoryResultEditor from '../components/LaboratoryResultEditor.jsx';
import InternalMedicineEditor from '../components/InternalMedicineEditor.jsx';
import ReportPreview from '../components/ReportPreview.jsx';
import EtuHeroBanner from '../components/EtuHeroBanner.jsx';
import { useScrollLock } from '../utils/useScrollLock.js';
import ModalPortal from '../components/ModalPortal.jsx';
import {
  createTransfer,
  getTransfers,
  receiveTransfer,
  startInvestigation,
  getTransferAudit,
  sendResultBack,
  clearTransfer
} from '../services/transferService.js';
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
  allocationByTest,
  transferStatusByTest = {}
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
          const tId = idOf(test);
          const trf = transferStatusByTest?.[tId] || transferStatusByTest?.[test.name?.toUpperCase()];
          let transferBadge = null;
          if (trf) {
            if (['COMPLETED', 'APPROVED', 'RESULT_READY'].includes(trf.status)) {
              transferBadge = (
                <span className="transfer-badge received-badge" style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px' }}>
                  📥 RECEIVED FROM {trf.destinationBranch?.toUpperCase()}
                </span>
              );
            } else {
              transferBadge = (
                <span className={`transfer-badge sent-from-${(trf.sourceBranch || 'main').toLowerCase()}`} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px' }}>
                  🚀 SENT TO {trf.destinationBranch?.toUpperCase()} ({trf.status.replace('_', ' ')})
                </span>
              );
            }
          } else {
            transferBadge = (
              <span className="transfer-badge local-badge" style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: '#64748b', color: '#fff' }}>
                📍 LOCAL
              </span>
            );
          }

          return (
            <article className="collector-test-card" key={test._id}>
              <span>✓</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <strong>{test.name}</strong>
                  {transferBadge}
                </div>
                <small>{test.requiredSampleTypes?.map(sample => sample.name).join(', ') || 'Specimen assigned automatically'}</small>
              </div>
            </article>
          );
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
    [confirmSubmit, setConfirmSubmit] = useState(false),
    [receivedTransfers, setReceivedTransfers] = useState([]),
    [transferSearch, setTransferSearch] = useState(''),
    [transferPeriod, setTransferPeriod] = useState('today'),
    [transferStatusFilter, setTransferStatusFilter] = useState('All'),
    [transferModal, setTransferModal] = useState(null),
    [auditModal, setAuditModal] = useState(null),
    [auditLoading, setAuditLoading] = useState(false),
    [clearModal, setClearModal] = useState({ open: false, transfer: null, busy: false, reason: '', error: '' }),
    [sendBackModal, setSendBackModal] = useState({ open: false, transfer: null, busy: false, error: '' }),
    [queuePeriod, setQueuePeriod] = useState('today'),
    [queueSearch, setQueueSearch] = useState('');

  const userBranch = user?.branchName || 'Main';
  const otherBranch = userBranch === 'Main' ? 'Otona' : 'Main';

  useScrollLock(previewOpen || confirmSubmit || Boolean(transferModal?.open) || Boolean(auditModal?.open) || Boolean(clearModal?.open) || Boolean(sendBackModal?.open));
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
  const filteredQueue = useMemo(() => {
    return safeQueue.filter(x => {
      if (!x || !x.patient) return false;
      if (queueSearch.trim()) {
        const s = queueSearch.trim().toLowerCase();
        const p = x.patient;
        const match =
          (p.name && p.name.toLowerCase().includes(s)) ||
          (p.patientId && p.patientId.toLowerCase().includes(s)) ||
          (p.barcode && p.barcode.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  }, [safeQueue, queueSearch]);
  const queuedList = useMemo(() => filteredQueue.filter(x => x.collection?.status === 'Queued'), [filteredQueue]);
  const unfinishedList = useMemo(() => filteredQueue.filter(x => x.collection?.status === 'In Progress'), [filteredQueue]);

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

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (user?.role === 'Admin' && branchFilter !== 'All') {
        params.append('branchName', branchFilter);
      }
      if (queuePeriod && queuePeriod !== 'all') {
        params.append('period', queuePeriod);
      }
      if (queueSearch.trim()) {
        params.append('q', queueSearch.trim());
      }
      const qParam = params.toString() ? `?${params.toString()}` : '';
      const dashParam = user?.role === 'Admin' && branchFilter !== 'All' ? `?branchName=${branchFilter}` : '';
      const [d, q, e, s, tests, pCat] = await Promise.all([
        api(`/collection/dashboard${dashParam}`, { token }).catch(() => null),
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
  }, [token, branchFilter, queuePeriod, queueSearch, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    subscribe('collection:change', load);
    return () => unsubscribe('collection:change', load);
  }, [subscribe, unsubscribe, load]);

  const loadTransfers = useCallback(async () => {
    try {
      const params = { type: 'received' };
      if (transferPeriod && transferPeriod !== 'all') {
        params.period = transferPeriod;
      }
      if (transferSearch.trim()) {
        params.q = transferSearch.trim();
      }
      const res = await getTransfers(params, token);
      setReceivedTransfers(Array.isArray(res?.transfers) ? res.transfers : []);
    } catch (e) {
      if (!isSilentNetworkError(e)) {
        console.warn('Transfers load error:', e);
      }
    }
  }, [token, transferPeriod, transferSearch]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  useEffect(() => {
    subscribe('transfers:change', loadTransfers);
    return () => unsubscribe('transfers:change', loadTransfers);
  }, [subscribe, unsubscribe, loadTransfers]);

  const openTransferModal = (patient, transferStatusByTest = {}) => {
    const tests = Array.isArray(patient?.laboratoryTests) ? patient.laboratoryTests : [];
    const availableTests = tests.filter(t => {
      const tId = idOf(t);
      const st = transferStatusByTest?.[tId] || transferStatusByTest?.[t.name?.toUpperCase()];
      const isActive = st && ['PENDING_TRANSFER', 'RECEIVED', 'UNDER_INVESTIGATION', 'RESULT_READY'].includes(st.status);
      const isDone = st && ['COMPLETED', 'APPROVED'].includes(st.status);
      return !isActive && !isDone;
    });

    const initialSelection = availableTests.length ? [idOf(availableTests[0])] : [];

    setTransferModal({
      open: true,
      patient,
      tests,
      transferStatusByTest,
      selectedTestIds: initialSelection,
      priority: 'Routine',
      notes: '',
      busy: false,
      error: ''
    });
  };

  const handleExecuteTransfer = async () => {
    if (!transferModal?.patient?._id || !transferModal?.selectedTestIds?.length) return;
    setTransferModal(m => ({ ...m, busy: true, error: '' }));
    try {
      await createTransfer({
        patientId: transferModal.patient._id,
        testIds: transferModal.selectedTestIds,
        priority: transferModal.priority,
        notes: transferModal.notes
      }, token);
      const count = transferModal.selectedTestIds.length;
      setTransferModal(null);
      setMessage(`✅ ${count} test${count > 1 ? 's' : ''} successfully transferred to ${otherBranch}.`);
      load();
      loadTransfers();
    } catch (e) {
      setTransferModal(m => ({ ...m, busy: false, error: e.message || 'Failed to transfer sample(s).' }));
    }
  };

  const handleReceiveTransfer = async transferId => {
    try {
      setBusy(true);
      await receiveTransfer(transferId, token);
      setMessage('✅ Sample marked as received at this branch.');
      loadTransfers();
    } catch (e) {
      setError(e.message || 'Failed to receive transfer.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenInvestigation = async transfer => {
    try {
      setBusy(true);
      const res = await startInvestigation(transfer._id, token);
      if (res.report) {
        const testObj = transfer.laboratoryTest || { _id: transfer.laboratoryTest, name: transfer.testName, category: transfer.testCategory };
        setSelected({
          ...transfer.patient,
          laboratoryTests: [testObj],
          transferredTestId: idOf(testObj),
          transferredTestName: transfer.testName,
          transferredCategory: transfer.testCategory,
          sourceBranch: transfer.sourceBranch,
          isTransferMode: true
        });
        setReport({
          ...emptyReport,
          ...res.report,
          patient: transfer.patient,
          isCrossBranchTransfer: true,
          originalBranch: transfer.sourceBranch,
          performingBranch: transfer.destinationBranch,
          transfer: transfer._id
        });
        setTab('report');
        setMessage(`Investigation opened directly for transferred test: ${transfer.testName}.`);
        loadTransfers();
      }
    } catch (e) {
      setError(e.message || 'Failed to start investigation for transferred sample.');
    } finally {
      setBusy(false);
    }
  };

  const handleViewAudit = async transfer => {
    setAuditModal({ open: true, transfer });
    setAuditLoading(true);
    try {
      const res = await getTransferAudit(transfer._id, token);
      if (res.transfer) {
        setAuditModal({ open: true, transfer: res.transfer });
      }
    } catch (e) {
      console.warn('Failed to load audit history:', e);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleClearTransfer = async () => {
    if (!clearModal.transfer?._id) return;
    setClearModal(m => ({ ...m, busy: true, error: '' }));
    try {
      await clearTransfer(clearModal.transfer._id, clearModal.reason, token);
      setClearModal({ open: false, transfer: null, busy: false, reason: '', error: '' });
      setMessage('✅ Transfer cleared from active list and preserved in Report Management.');
      loadTransfers();
    } catch (e) {
      setClearModal(m => ({ ...m, busy: false, error: e.message || 'Failed to clear transfer.' }));
    }
  };

  const handleSendBackTransfer = async () => {
    if (!sendBackModal.transfer?._id) return;
    setSendBackModal(m => ({ ...m, busy: true, error: '' }));
    try {
      await sendResultBack(sendBackModal.transfer._id, {}, token);
      const src = sendBackModal.transfer.sourceBranch;
      setSendBackModal({ open: false, transfer: null, busy: false, error: '' });
      setMessage(`🚀 Results successfully sent back to ${src}.`);
      loadTransfers();
    } catch (e) {
      setSendBackModal(m => ({ ...m, busy: false, error: e.message || 'Failed to send results back.' }));
    }
  };

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
  const isMain = userBranch === 'Main';
  const isOtona = userBranch === 'Otona';
  const isAdmin = user?.role === 'Admin' || user?.isCEO || userBranch === 'All';

  const countOtona = receivedTransfers.filter(t => t.sourceBranch === 'Otona').length;
  const countMain = receivedTransfers.filter(t => t.sourceBranch === 'Main').length;

  const tabsList = [
    ['queue', `Patient queue (${queuedList.length})`]
  ];

  if (isMain || isAdmin) {
    tabsList.push(['received_otona', `Received From Otona (${countOtona})`]);
  }
  if (isOtona || (isAdmin && !isMain)) {
    tabsList.push(['received_main', `Received From Main (${countMain})`]);
  }

  tabsList.push(
    ['unfinished', `Unfinished collections (${unfinishedList.length})`],
    ['report', 'Result entry'],
    ['stock', 'Available stock']
  );

  return <section className="page collection-page collector-page"><EtuHeroBanner /><header className="dash-header"><div><p className="eyebrow">Laboratory technician workspace</p><h1>Welcome, {user.fullName} <span className="collector-paid" style={{ marginLeft: '10px', fontSize: '0.85rem' }}>📍 Branch: {user.branchName || 'Main'}</span></h1><p className="intro">Review orders, collect samples, and produce accurate laboratory reports.</p></div></header>{error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}<div className="reception-tabs">{tabsList.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
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
<section className="collector-queue">
  <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
    <div>
      <p className="eyebrow">Sample collection queue</p>
      <h2>Patients awaiting laboratory work</h2>
    </div>
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="search"
        placeholder="Search patient name or ID..."
        value={queueSearch}
        onChange={e => setQueueSearch(e.target.value)}
        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-outline-variant, #cbd5e1)', minWidth: '240px', fontSize: '0.85rem' }}
      />
    </div>
  </header>

  {/* Queue period filter pills: Today's (default), Last Week, Last Month, All */}
  <div style={{ display: 'flex', gap: '8px', margin: '12px 0 16px', flexWrap: 'wrap', alignItems: 'center' }}>
    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-on-surface-variant, #64748b)', marginRight: '4px' }}>
      Period:
    </span>
    {[
      ['today', "Today's"],
      ['lastWeek', 'Last Week'],
      ['lastMonth', 'Last Month'],
      ['all', 'All']
    ].map(([p, label]) => (
      <button
        key={p}
        type="button"
        className={queuePeriod === p ? 'primary' : 'secondary'}
        onClick={() => setQueuePeriod(p)}
        style={{ fontSize: '0.8rem', padding: '5px 14px', borderRadius: '20px' }}
      >
        {label}
      </button>
    ))}
  </div>

  <div className="collector-queue-list">
    {queuedList.length ? queuedList.map(row => (
      <article className="collector-patient-card" key={row.patient._id}>
        <div className="collector-patient-summary">
          <div className="collector-patient-avatar">{row.patient.name?.[0]}</div>
          <div className="collector-patient-main">
            <h3>{row.patient.name}</h3>
            <p>{row.patient.patientId} · {row.patient.age} · {row.patient.sex} · {row.patient.phone}{(row.patient.systolicBP || row.patient.diastolicBP) ? ` · 🫀 BP: ${row.patient.systolicBP || '—'}/${row.patient.diastolicBP || '—'} mmHg` : ''}</p>
          </div>
          <aside style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="collector-paid">{row.patient.paymentStatus === 'Paid' ? 'Ready for Sample Collection' : 'Counseling'}</span>
            <button type="button" className="secondary transfer-action-btn" disabled={busy} onClick={() => openTransferModal(row.patient, row.transferStatusByTest || {})} title={`Send sample/test for ${row.patient.name} to ${otherBranch}`}>⇄ Send to {otherBranch}</button>
            <button className="primary" disabled={busy || row.collection.status === 'Completed'} onClick={() => start(row)}>{row.collection.status === 'In Progress' ? 'Continue Collection' : 'Start collection'}</button>
          </aside>
        </div>
        <OrderedTests patient={row.patient} catalog={catalog} allocationByTest={row.allocationByTest || {}} transferStatusByTest={row.transferStatusByTest || {}} />
      </article>
    )) : <p className="empty">No queued patients awaiting sample collection.</p>}
  </div>
</section>
</>}
{(tab === 'received_otona' || tab === 'received_main') && (() => {
  const activeSource = tab === 'received_otona' ? 'Otona' : 'Main';
  const list = receivedTransfers.filter(t => {
    if (t.sourceBranch !== activeSource) return false;
    if (transferStatusFilter !== 'All' && t.status !== transferStatusFilter) return false;
    if (transferSearch) {
      const s = transferSearch.toLowerCase();
      const p = t.patient || {};
      const match = (p.name && p.name.toLowerCase().includes(s)) ||
        (p.patientId && p.patientId.toLowerCase().includes(s)) ||
        (t.testName && t.testName.toLowerCase().includes(s)) ||
        (t.transferId && t.transferId.toLowerCase().includes(s));
      if (!match) return false;
    }
    return true;
  });

  const countPending = receivedTransfers.filter(t => t.sourceBranch === activeSource && t.status === 'PENDING_TRANSFER').length;
  const countReceived = receivedTransfers.filter(t => t.sourceBranch === activeSource && t.status === 'RECEIVED').length;
  const countInvestigating = receivedTransfers.filter(t => t.sourceBranch === activeSource && t.status === 'UNDER_INVESTIGATION').length;
  const countReady = receivedTransfers.filter(t => t.sourceBranch === activeSource && t.status === 'RESULT_READY').length;
  const countCompleted = receivedTransfers.filter(t => t.sourceBranch === activeSource && ['COMPLETED', 'APPROVED'].includes(t.status)).length;

  return (
    <section className="collector-queue">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p className="eyebrow">Cross-branch transferred queue</p>
          <h2>Samples Received From {activeSource}</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search patient name or ID..."
            value={transferSearch}
            onChange={e => setTransferSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-outline-variant, #cbd5e1)', minWidth: '240px', fontSize: '0.85rem' }}
          />
        </div>
      </header>

      {/* Time period filter pills: Today's (default), Last Week, Last Month, All */}
      <div style={{ display: 'flex', gap: '8px', margin: '12px 0 8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-on-surface-variant, #64748b)', marginRight: '4px' }}>
          Period:
        </span>
        {[
          ['today', "Today's"],
          ['lastWeek', 'Last Week'],
          ['lastMonth', 'Last Month'],
          ['all', 'All']
        ].map(([p, label]) => (
          <button
            key={p}
            type="button"
            className={transferPeriod === p ? 'primary' : 'secondary'}
            onClick={() => setTransferPeriod(p)}
            style={{ fontSize: '0.8rem', padding: '5px 14px', borderRadius: '20px' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filter status pills */}
      <div style={{ display: 'flex', gap: '8px', margin: '8px 0 16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-on-surface-variant, #64748b)', marginRight: '4px' }}>
          Status:
        </span>
        {[
          ['All', `All (${receivedTransfers.filter(t => t.sourceBranch === activeSource).length})`],
          ['PENDING_TRANSFER', `Pending (${countPending})`],
          ['RECEIVED', `Received (${countReceived})`],
          ['UNDER_INVESTIGATION', `Under Investigation (${countInvestigating})`],
          ['RESULT_READY', `Result Ready (${countReady})`],
          ['COMPLETED', `Completed (${countCompleted})`]
        ].map(([val, label]) => (
          <button
            key={val}
            type="button"
            className={transferStatusFilter === val ? 'primary' : 'secondary'}
            onClick={() => setTransferStatusFilter(val)}
            style={{ fontSize: '0.8rem', padding: '5px 12px', borderRadius: '20px' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="collector-queue-list">
        {list.length ? list.map(transfer => (
          <article className="collector-patient-card transfer-card" key={transfer._id}>
            <div className="collector-patient-summary">
              <div className="collector-patient-avatar transfer-avatar" style={{ background: '#0284c7', color: '#fff' }}>
                {transfer.patient?.name?.[0] || 'T'}
              </div>
              <div className="collector-patient-main">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <h3>{transfer.patient?.name}</h3>
                  <span className={`transfer-badge sent-from-${transfer.sourceBranch.toLowerCase()}`}>
                    SENT FROM {transfer.sourceBranch.toUpperCase()}
                  </span>
                  <span className="transfer-badge received-badge">
                    RECEIVED FROM {transfer.sourceBranch.toUpperCase()}
                  </span>
                  <span className={`transfer-status-badge status-${transfer.status.toLowerCase()}`}>
                    {transfer.status.replace('_', ' ')}
                  </span>
                </div>
                <p>
                  <strong>ID:</strong> {transfer.patient?.patientId} · <strong>Sex/Age:</strong> {transfer.patient?.sex} / {transfer.patient?.age} YRS · <strong>Phone:</strong> {transfer.patient?.phone || '—'}
                  {(transfer.patient?.systolicBP || transfer.patient?.diastolicBP) ? ` · 🫀 BP: ${transfer.patient.systolicBP || '—'}/${transfer.patient.diastolicBP || '—'} mmHg` : ''}
                </p>
                <p style={{ marginTop: '4px', color: 'var(--color-primary, #075c91)', fontWeight: 600 }}>
                  🧪 Requested Test: <strong style={{ color: 'var(--color-on-surface, #0f172a)' }}>{transfer.testName}</strong>
                  {transfer.testCategory && <small style={{ opacity: 0.8, marginLeft: '6px' }}>({transfer.testCategory})</small>}
                  <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>
                    📅 Sent: {new Date(transfer.sentAt).toLocaleString()} by {transfer.sentBy?.fullName || 'Technician'}
                  </span>
                </p>
                {transfer.notes && (
                  <p style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                    Notes: {transfer.notes}
                  </p>
                )}
              </div>
              <aside style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', justifyContent: 'center' }}>
                {transfer.status === 'PENDING_TRANSFER' && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => handleReceiveTransfer(transfer._id)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    📥 Mark Received
                  </button>
                )}
                {['PENDING_TRANSFER', 'RECEIVED', 'UNDER_INVESTIGATION'].includes(transfer.status) && (
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => handleOpenInvestigation(transfer)}
                  >
                    🔬 Open Investigation
                  </button>
                )}
                {['RESULT_READY', 'COMPLETED', 'APPROVED'].includes(transfer.status) && (
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => handleOpenInvestigation(transfer)}
                  >
                    📋 View / Edit Results
                  </button>
                )}
                {transfer.status === 'READY_TO_RETURN' && (
                  <button
                    type="button"
                    className="primary"
                    style={{ background: '#16a34a', borderColor: '#15803d', color: '#fff', fontWeight: 700 }}
                    disabled={busy}
                    onClick={() => setSendBackModal({ open: true, transfer, busy: false, error: '' })}
                    title={`Send approved results back to ${transfer.sourceBranch}`}
                  >
                    🚀 Send Back to {transfer.sourceBranch}
                  </button>
                )}
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={() => handleViewAudit(transfer)}
                  >
                    📜 History
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => setClearModal({ open: true, transfer, reason: '', busy: false, error: '' })}
                    title="Clear this received test from active list while preserving in Report Management"
                  >
                    🗑 Clear Data
                  </button>
                </div>
              </aside>
            </div>
          </article>
        )) : (
          <div className="empty-state" style={{ padding: '32px', textAlign: 'center' }}>
            <p className="empty">No transferred samples match the selected filter.</p>
          </div>
        )}
      </div>
    </section>
  );
})()}
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

{transferModal?.open && (
  <ModalPortal isOpen={true} onClose={() => !transferModal.busy && setTransferModal(null)}>
    <div className="transfer-modal" onClick={e => e.stopPropagation()}>
      <header className="transfer-modal-header">
        <h3>Send Sample to {otherBranch}?</h3>
        <button type="button" className="close-button" disabled={transferModal.busy} onClick={() => setTransferModal(null)}>×</button>
      </header>
      
      <div className="transfer-modal-body">
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary, #cbd5e1)' }}>
          The sample/test will be sent to the <strong>{otherBranch}</strong> branch for investigation and approval.
        </p>

        <div className="transfer-info-box">
          <div><strong>Patient:</strong> <span>{transferModal.patient?.name}</span></div>
          <div><strong>Patient ID:</strong> <span>{transferModal.patient?.patientId}</span></div>
          <div><strong>Age / Sex:</strong> <span>{transferModal.patient?.age} YRS / {transferModal.patient?.sex}</span></div>
          <div><strong>From:</strong> <span>📍 {userBranch}</span></div>
          <div><strong>To:</strong> <span>📍 {otherBranch}</span></div>
          {(transferModal.patient?.systolicBP || transferModal.patient?.diastolicBP) && (
            <div><strong>Blood Pressure:</strong> <span>{transferModal.patient.systolicBP || '—'}/{transferModal.patient.diastolicBP || '—'} mmHg</span></div>
          )}
        </div>

        <div className="transfer-form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ margin: 0 }}><strong>Select Test(s) to Send to {otherBranch}:</strong></label>
            {transferModal.tests.length > 1 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="link-button"
                  style={{ fontSize: '0.8rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-primary, #38bdf8)', textDecoration: 'underline' }}
                  onClick={() => {
                    const allAvailable = transferModal.tests
                      .filter(t => {
                        const tId = idOf(t);
                        const st = transferModal.transferStatusByTest?.[tId] || transferModal.transferStatusByTest?.[t.name?.toUpperCase()];
                        const isActive = st && ['PENDING_TRANSFER', 'RECEIVED', 'UNDER_INVESTIGATION', 'RESULT_READY'].includes(st.status);
                        const isDone = st && ['COMPLETED', 'APPROVED'].includes(st.status);
                        return !isActive && !isDone;
                      })
                      .map(t => idOf(t));
                    setTransferModal(m => ({ ...m, selectedTestIds: allAvailable, error: '' }));
                  }}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="link-button"
                  style={{ fontSize: '0.8rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', textDecoration: 'underline' }}
                  onClick={() => setTransferModal(m => ({ ...m, selectedTestIds: [], error: '' }))}
                >
                  Deselect all
                </button>
              </div>
            )}
          </div>

          <div className="transfer-test-options">
            {transferModal.tests.map(t => {
              const tId = idOf(t);
              const tName = typeof t === 'string' ? t : t.name;
              const tCat = t.category?.name || t.category || '';
              const st = transferModal.transferStatusByTest?.[tId] || transferModal.transferStatusByTest?.[tName?.toUpperCase()];
              const isActive = st && ['PENDING_TRANSFER', 'RECEIVED', 'UNDER_INVESTIGATION', 'RESULT_READY'].includes(st.status);
              const isDone = st && ['COMPLETED', 'APPROVED'].includes(st.status);
              const isDisabled = isActive || isDone;
              const isChecked = !isDisabled && transferModal.selectedTestIds?.includes(tId);

              return (
                <label
                  key={tId}
                  className={`transfer-test-choice ${isChecked ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                  style={{ opacity: isDisabled ? 0.6 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                >
                  <input
                    type="checkbox"
                    name="transferTest"
                    value={tId}
                    disabled={isDisabled}
                    checked={!!isChecked}
                    onChange={() => {
                      if (isDisabled) return;
                      setTransferModal(m => {
                        const current = m.selectedTestIds || [];
                        const next = current.includes(tId)
                          ? current.filter(id => id !== tId)
                          : [...current, tId];
                        return { ...m, selectedTestIds: next, error: '' };
                      });
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span>
                      <strong>{tCat ? `${tCat} — ` : ''}{tName}</strong>
                    </span>
                    {isActive && (
                      <span className="transfer-badge badge-transferred" style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'rgba(2, 132, 199, 0.25)', color: 'var(--color-primary, #38bdf8)', borderRadius: '4px', border: '1px solid rgba(2, 132, 199, 0.4)' }}>
                        Active Transfer ({st.status.replace('_', ' ')})
                      </span>
                    )}
                    {isDone && (
                      <span className="transfer-badge" style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                        Already Completed
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="transfer-form-group">
          <label><strong>Priority:</strong></label>
          <select
            value={transferModal.priority}
            onChange={e => setTransferModal(m => ({ ...m, priority: e.target.value }))}
          >
            <option value="Routine">Routine</option>
            <option value="Urgent">Urgent</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="transfer-form-group">
          <label><strong>Clinical Notes / Reason for Transfer (optional):</strong></label>
          <textarea
            rows="2"
            placeholder="e.g. Test analyzer only available at destination branch..."
            value={transferModal.notes}
            onChange={e => setTransferModal(m => ({ ...m, notes: e.target.value }))}
          />
        </div>

        {transferModal.error && (
          <div className="alert error" style={{ margin: '4px 0 0' }}>
            {transferModal.error}
          </div>
        )}
      </div>

      <footer className="transfer-modal-footer">
        <button type="button" className="secondary" disabled={transferModal.busy} onClick={() => setTransferModal(null)}>
          Cancel
        </button>
        <button
          type="button"
          className="primary"
          disabled={transferModal.busy || !transferModal.selectedTestIds?.length}
          onClick={handleExecuteTransfer}
        >
          {transferModal.busy
            ? 'Sending...'
            : `Send Selected Test${(transferModal.selectedTestIds?.length || 0) > 1 ? 's' : ''} (${transferModal.selectedTestIds?.length || 0}) to ${otherBranch}`}
        </button>
      </footer>
    </div>
  </ModalPortal>
)}

{auditModal?.open && (
  <ModalPortal isOpen={true} onClose={() => setAuditModal(null)}>
    <div className="transfer-modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
      <header className="transfer-modal-header">
        <div>
          <h3>Cross-Branch Transfer History</h3>
          <small style={{ color: '#64748b' }}>Transfer ID: {auditModal.transfer?.transferId}</small>
        </div>
        <button type="button" className="close-button" onClick={() => setAuditModal(null)}>×</button>
      </header>

      <div className="transfer-modal-body">
        <div className="transfer-info-box">
          <div><strong>Patient:</strong> <span>{auditModal.transfer?.patient?.name}</span></div>
          <div><strong>Patient ID:</strong> <span>{auditModal.transfer?.patient?.patientId}</span></div>
          <div><strong>Test:</strong> <span>{auditModal.transfer?.testName}</span></div>
          <div><strong>Status:</strong> <span className={`transfer-status-badge status-${(auditModal.transfer?.status || '').toLowerCase()}`}>{auditModal.transfer?.status}</span></div>
          <div><strong>Sending Branch:</strong> <span>📍 {auditModal.transfer?.sourceBranch}</span></div>
          <div><strong>Receiving Branch:</strong> <span>📍 {auditModal.transfer?.destinationBranch}</span></div>
        </div>

        <h4 style={{ margin: '14px 0 6px', fontSize: '0.95rem' }}>Audit Trail &amp; Lifecycle Timeline</h4>
        {auditLoading ? (
          <p style={{ color: '#64748b', fontStyle: 'italic' }}>Loading transfer history...</p>
        ) : (
          <div className="transfer-audit-timeline">
            {(auditModal.transfer?.transferHistory || []).map((step, idx) => (
              <div className="transfer-audit-item" key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#075c91' }}>{step.action}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {step.timestamp ? new Date(step.timestamp).toLocaleString() : ''}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                  By: {step.performedBy?.fullName || step.performedBy?.username || 'Authorized User'}
                </div>
                {step.notes && (
                  <p style={{ fontSize: '0.8rem', fontStyle: 'italic', margin: '2px 0 0', color: '#64748b' }}>
                    "{step.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="transfer-modal-footer">
        <button type="button" className="secondary" onClick={() => setAuditModal(null)}>
          Close History
        </button>
      </footer>
    </div>
  </ModalPortal>
)}

{clearModal?.open && (
  <ModalPortal isOpen={true} onClose={() => !clearModal.busy && setClearModal(m => ({ ...m, open: false }))}>
    <div className="transfer-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
      <header className="transfer-modal-header" style={{ borderBottom: '1px solid #fee2e2' }}>
        <div>
          <h3 style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🗑</span> Clear Received Test Data
          </h3>
          <small style={{ color: '#64748b' }}>Transfer ID: {clearModal.transfer?.transferId}</small>
        </div>
        <button type="button" className="close-button" disabled={clearModal.busy} onClick={() => setClearModal(m => ({ ...m, open: false }))}>×</button>
      </header>
      <div className="transfer-modal-body">
        <p style={{ fontSize: '0.95rem', color: '#1e293b', lineHeight: 1.5, marginTop: 0 }}>
          Clear this received test? This will remove the test from the Received list, but the information will be preserved in <strong>Sample Collector Report Management</strong> and can be restored later.
        </p>

        <div className="transfer-info-box" style={{ background: '#f8fafc', margin: '14px 0' }}>
          <div><strong>Patient:</strong> <span>{clearModal.transfer?.patient?.name}</span></div>
          <div><strong>Patient ID:</strong> <span>{clearModal.transfer?.patient?.patientId}</span></div>
          <div><strong>Test:</strong> <span>{clearModal.transfer?.testName}</span></div>
          <div><strong>Sent From:</strong> <span>📍 {clearModal.transfer?.sourceBranch}</span></div>
          <div><strong>Current Status:</strong> <span className={`transfer-status-badge status-${(clearModal.transfer?.status || '').toLowerCase()}`}>{clearModal.transfer?.status?.replace('_', ' ')}</span></div>
        </div>

        <div className="transfer-form-group">
          <label><strong>Reason for Clearing (optional):</strong></label>
          <input
            type="text"
            placeholder="e.g. Cleared by technician, test postponed, or queue clean-up"
            value={clearModal.reason}
            onChange={e => setClearModal(m => ({ ...m, reason: e.target.value }))}
            disabled={clearModal.busy}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        {clearModal.error && (
          <div className="alert error" style={{ margin: '8px 0 0' }}>{clearModal.error}</div>
        )}
      </div>
      <footer className="transfer-modal-footer">
        <button type="button" className="secondary" disabled={clearModal.busy} onClick={() => setClearModal(m => ({ ...m, open: false }))}>
          Cancel
        </button>
        <button
          type="button"
          className="secondary danger"
          style={{ background: '#dc2626', color: '#ffffff', borderColor: '#b91c1c', fontWeight: 600 }}
          disabled={clearModal.busy}
          onClick={handleClearTransfer}
        >
          {clearModal.busy ? 'Clearing...' : 'Clear Data'}
        </button>
      </footer>
    </div>
  </ModalPortal>
)}

{sendBackModal?.open && (
  <ModalPortal isOpen={true} onClose={() => !sendBackModal.busy && setSendBackModal(m => ({ ...m, open: false }))}>
    <div className="transfer-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
      <header className="transfer-modal-header" style={{ borderBottom: '1px solid #bbf7d0' }}>
        <div>
          <h3 style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🚀</span> Send Approved Results Back
          </h3>
          <small style={{ color: '#64748b' }}>Transfer ID: {sendBackModal.transfer?.transferId}</small>
        </div>
        <button type="button" className="close-button" disabled={sendBackModal.busy} onClick={() => setSendBackModal(m => ({ ...m, open: false }))}>×</button>
      </header>
      <div className="transfer-modal-body">
        <p style={{ fontSize: '0.95rem', color: '#1e293b', lineHeight: 1.5, marginTop: 0 }}>
          Send this approved test result back to <strong>{sendBackModal.transfer?.sourceBranch}</strong>? The results will automatically merge into the patient's original order and complete this transfer.
        </p>

        <div className="transfer-info-box" style={{ background: '#f0fdf4', margin: '14px 0', border: '1px solid #bbf7d0' }}>
          <div><strong>Patient:</strong> <span>{sendBackModal.transfer?.patient?.name}</span></div>
          <div><strong>Patient ID:</strong> <span>{sendBackModal.transfer?.patient?.patientId}</span></div>
          <div><strong>Test:</strong> <span>{sendBackModal.transfer?.testName}</span></div>
          <div><strong>Destination:</strong> <span>📍 {sendBackModal.transfer?.sourceBranch} (Origin)</span></div>
          <div><strong>Return Method:</strong> <span style={{ color: '#15803d', fontWeight: 700 }}>With Receiving-Branch Approval</span></div>
        </div>

        {sendBackModal.error && (
          <div className="alert error" style={{ margin: '8px 0 0' }}>{sendBackModal.error}</div>
        )}
      </div>
      <footer className="transfer-modal-footer">
        <button type="button" className="secondary" disabled={sendBackModal.busy} onClick={() => setSendBackModal(m => ({ ...m, open: false }))}>
          Cancel
        </button>
        <button
          type="button"
          className="primary"
          style={{ background: '#16a34a', borderColor: '#15803d', color: '#ffffff', fontWeight: 700 }}
          disabled={sendBackModal.busy}
          onClick={handleSendBackTransfer}
        >
          {sendBackModal.busy ? 'Sending...' : `Send Back to ${sendBackModal.transfer?.sourceBranch}`}
        </button>
      </footer>
    </div>
  </ModalPortal>
)}
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
