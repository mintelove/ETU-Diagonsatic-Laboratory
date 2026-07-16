import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { printLabReport } from '../utils/printLabReport.js';

function ReportPreview({ report }) {
  const patient = report.patient || {};
  return <section className="table-card" style={{ marginTop: 0 }}>
    <p className="eyebrow">Laboratory report review</p><h2>ETU Diagnostic Laboratory</h2>
    <div className="form-grid"><p><strong>Patient:</strong> {patient.name}</p><p><strong>Patient ID:</strong> {patient.patientId}</p><p><strong>Barcode:</strong> {patient.barcode || patient.patientId}</p><p><strong>Collector:</strong> {report.technician?.fullName || '—'}</p><p><strong>Samples:</strong> {patient.sampleTypes?.map(x => x.name).join(', ') || '—'}</p><p><strong>Submitted:</strong> {new Date(report.submittedDate || report.updatedDate).toLocaleString()}</p></div>
    <p><strong>Equipment:</strong> {report.equipment?.join(', ') || '—'}</p>
    <table><thead><tr><th>Parameter</th><th>Result</th><th>Reference value</th></tr></thead><tbody>{report.results?.map((row, index) => <tr key={`${row.sampleName}-${index}`}><td>{row.sampleName}</td><td>{row.result}</td><td>{row.referenceValue || '—'}</td></tr>)}</tbody></table>
    {report.comments && <p><strong>Collector comments:</strong> {report.comments}</p>}
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
    <section className="table-card">{list.length ? <table><thead><tr><th>Patient</th><th>Barcode</th><th>Collector</th><th>Samples</th><th>Submitted</th><th>Priority</th><th>Status</th><th /></tr></thead><tbody>{list.map(report => <tr key={report._id}><td>{report.patient?.name}<span>{report.patient?.patientId}</span></td><td>{report.patient?.barcode || report.patient?.patientId}</td><td>{report.technician?.fullName || '—'}</td><td>{report.patient?.sampleTypes?.map(x => x.name).join(', ') || '—'}</td><td>{new Date(report.submittedDate || report.updatedDate).toLocaleString()}</td><td>{report.priority || 'Routine'}</td><td>{report.status === 'Submitted' ? 'Pending Approval' : report.status}</td><td><button className="primary" onClick={() => { setSelected(report); setReason(report.rejectionReason || ''); }}>Review</button></td></tr>)}</tbody></table> : <p className="empty">No reports in this view.</p>}</section>
    {selected && <div className="modal-backdrop"><div className="modal-content" style={{ maxWidth: 900 }}><header className="modal-header"><h2>Report Review</h2><button className="close-button" onClick={() => setSelected(null)}>×</button></header><ReportPreview report={selected} /><div className="form-actions"><button className="secondary" onClick={()=>{try{printLabReport(selected,user)}catch(e){setError(e.message)}}}>Print Preview</button></div>{['Pending', 'Submitted'].includes(selected.status) && <div className="form-actions"><label className="wide">Reason for rejection (required to return to collector)<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength="2000" placeholder="Describe the correction required" /></label><button className="primary" disabled={busy} onClick={() => decide('Approved')}>{busy ? 'Saving…' : 'Approve Report'}</button><button className="secondary danger" disabled={busy} onClick={() => decide('Rejected')}>Return to Collector</button></div>}</div></div>}
  </section>;
}
