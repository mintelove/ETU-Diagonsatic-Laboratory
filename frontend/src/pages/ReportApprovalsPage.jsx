import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { printLabReport } from '../utils/printLabReport.js';

function ReportPreview({ report }) {
  const patient = report.patient || {};
  const categoriesMap = new Map();
  (patient.laboratoryTests || []).forEach(t => {
    const catName = t?.category?.name || 'GENERAL LABORATORY';
    const testName = t?.name || (typeof t === 'string' && !t.match(/^[a-f0-9]{24}$/i) ? t : '');
    if (!testName) return;
    if (!categoriesMap.has(catName)) categoriesMap.set(catName, []);
    categoriesMap.get(catName).push(testName);
  });

  return <section className="table-card" style={{ marginTop: 0 }}>
    <p className="eyebrow">Laboratory report review</p><h2>ETU Diagnostic Laboratory</h2>
    <div className="form-grid"><p><strong>Patient Name:</strong> {patient.name}</p><p><strong>Patient ID:</strong> {patient.patientId}</p><p><strong>Collector:</strong> {report.technician?.fullName || '—'}</p><p><strong>Submitted:</strong> {new Date(report.submittedDate || report.updatedDate).toLocaleString()}</p>{patient.referralHospital && <><p><strong>Referral Hospital Name:</strong> {patient.referralHospital}</p><p><strong>Referral Hospital Address:</strong> {patient.address || '—'}</p></>}</div>
    
    <div style={{ margin: '14px 0' }}>
      <h4 style={{ margin: '0 0 6px', color: 'var(--color-primary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>REQUESTED LABORATORY TEST TYPES</h4>
      {categoriesMap.size > 0 ? Array.from(categoriesMap.entries()).map(([cat, tests]) => (
        <div key={cat} style={{ marginBottom: 8 }}>
          <strong style={{ display: 'block', fontSize: '0.8rem', color: '#516a75' }}>{cat}</strong>
          <ul style={{ margin: '2px 0 6px 18px', padding: 0 }}>{tests.map(tn => <li key={tn} style={{ fontWeight: 600 }}>{tn}</li>)}</ul>
        </div>
      )) : <p>No test types recorded.</p>}
    </div>

    <p><strong>Equipment:</strong> {report.equipment?.join(', ') || '—'}</p>
    <table><thead><tr><th>Parameter</th><th>Result</th><th>SI Unit</th><th>Reference value</th><th>Flag</th></tr></thead><tbody>{report.results?.map((row, index) => <tr key={`${row.sampleName}-${index}`}><td><strong>{row.sampleName}</strong></td><td>{row.result}</td><td>{row.unit || '—'}</td><td>{row.referenceValue || '—'}</td><td><span className={`flag-badge ${row.flag || 'blank'}`}>{row.flag || '—'}</span></td></tr>)}</tbody></table>
    {report.comments && <p style={{ marginTop: 12 }}><strong>Collector comments:</strong> {report.comments}</p>}
  </section>;
}

export default function ReportApprovalsPage() {
  const { token, user } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();
  const [reports, setReports] = useState([]); const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('pending'); const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = async () => { try { const [pending, prior] = await Promise.all([api('/report-approvals/pending', { token }), api('/report-approvals/history', { token })]); setReports(pending.reports); setHistory(prior.reports); } catch (e) { setError(e.message); } };
  useEffect(() => { load(); }, [token]);
  useEffect(() => { subscribe('reports:change', load); return () => unsubscribe('reports:change', load); }, [subscribe, unsubscribe]);
  const decide = async status => {
    if (!selected || busy) return;
    if (status === 'Rejected' && !reason.trim()) { setError('A reason for rejection is required.'); return; }
    setBusy(true); setError('');
    try { await api(`/report-approvals/${selected._id}`, { token, method: 'PATCH', body: JSON.stringify({ status, comments: reason }) }); setMessage(`Report ${status.toLowerCase()}.`); setSelected(null); setReason(''); load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const list = tab === 'pending' ? reports : history;
  return <section className="page approval-workspace"><header className="page-title"><div><p className="eyebrow">Laboratory quality control</p><h1>Pending Laboratory Reports</h1><p className="intro">Review results before releasing approved reports to Reception.</p></div></header>
    {error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}
    <div className="reception-tabs"><button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>Pending ({reports.length})</button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Review history</button></div>
    <section className="table-card">{list.length ? <table><thead><tr><th>Patient</th><th>Barcode</th><th>Collector</th><th>Ordered Tests</th><th>Submitted</th><th>Priority</th><th>Status</th><th /></tr></thead><tbody>{list.map(report => {
      const tests = (report.patient?.laboratoryTests || []).map(x => x?.name).filter(Boolean);
      const specimens = (report.patient?.sampleTypes || []).map(x => x?.name).filter(Boolean);
      const displayText = tests.length ? tests.join(', ') : (specimens.join(', ') || '—');
      return <tr key={report._id}><td>{report.patient?.name}<span>{report.patient?.patientId}</span></td><td>{report.patient?.barcode || report.patient?.patientId}</td><td>{report.technician?.fullName || '—'}</td><td>{displayText}</td><td>{new Date(report.submittedDate || report.updatedDate).toLocaleString()}</td><td>{report.priority || 'Routine'}</td><td>{report.status === 'Submitted' ? 'Pending Approval' : report.status}</td><td><button className="primary" onClick={() => { setSelected(report); setReason(report.rejectionReason || ''); }}>Review</button></td></tr>;
    })}</tbody></table> : <p className="empty">No reports in this view.</p>}</section>
    {selected && <div className="modal-backdrop"><div className="modal-content" style={{ maxWidth: 900 }}><header className="modal-header"><h2>Report Review</h2><button className="close-button" onClick={() => setSelected(null)}>×</button></header><ReportPreview report={selected} /><div className="form-actions"><button className="secondary" onClick={()=>{try{printLabReport(selected,user)}catch(e){setError(e.message)}}}>Print Preview</button></div>{['Pending', 'Submitted'].includes(selected.status) && <div className="form-actions"><label className="wide">Reason for rejection (required to return to collector)<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength="2000" placeholder="Describe the correction required" /></label><button className="primary" disabled={busy} onClick={() => decide('Approved')}>{busy ? 'Saving…' : 'Approve Report'}</button><button className="secondary danger" disabled={busy} onClick={() => decide('Rejected')}>Return to Collector</button></div>}</div></div>}
  </section>;
}
