import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { printLabReport } from '../utils/printLabReport.js';

import ReportPreview from '../components/ReportPreview.jsx';
import { FlagBadge } from '../utils/flagHelper.jsx';

export default function ReportApprovalsPage() {
  const { token, user } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();
  const [reports, setReports] = useState([]); const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('pending'); const [selected, setSelected] = useState(null);
  const [branchFilter, setBranchFilter] = useState('All');
  const [reason, setReason] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = async () => { try { const query = user?.role === 'Admin' && branchFilter !== 'All' ? `?branchName=${branchFilter}` : ''; const [pending, prior] = await Promise.all([api(`/report-approvals/pending${query}`, { token }), api(`/report-approvals/history${query}`, { token })]); setReports(pending.reports); setHistory(prior.reports); } catch (e) { setError(e.message); } };
  useEffect(() => { load(); }, [token, branchFilter]);
  useEffect(() => { subscribe('reports:change', load); return () => unsubscribe('reports:change', load); }, [subscribe, unsubscribe]);
  const decide = async status => {
    if (!selected || busy) return;
    if (status === 'Rejected' && !reason.trim()) { setError('A reason for rejection is required.'); return; }
    setBusy(true); setError('');
    try { await api(`/report-approvals/${selected._id}`, { token, method: 'PATCH', body: JSON.stringify({ status, comments: reason }) }); setMessage(`Report ${status.toLowerCase()}.`); setSelected(null); setReason(''); load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const list = tab === 'pending' ? reports : history;
  return <section className="page approval-workspace"><header className="page-title"><div><p className="eyebrow">Laboratory quality control</p><h1>Pending Laboratory Reports <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: '#e0f2fe', color: '#075c91', marginLeft: '10px' }}>📍 Branch: {user?.branchName || 'Main'}</span></h1><p className="intro">Review results before releasing approved reports to Reception.</p></div></header>
    {error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}
    <div className="reception-tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>Pending ({reports.length})</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Review history</button>
      </div>
      {user?.role === 'Admin' && (
        <div style={{ display: 'flex', gap: '6px' }}>
          {['All', 'Main', 'Otona'].map((b) => (
            <button key={b} className={branchFilter === b ? 'active' : ''} onClick={() => setBranchFilter(b)}>
              {b === 'All' ? 'All Branches' : `${b} Branch`}
            </button>
          ))}
        </div>
      )}
    </div>
    <section className="table-card">{list.length ? <table><thead><tr><th>Patient</th><th>Barcode</th><th>Branch</th><th>Collector</th><th>Ordered Tests</th><th>Submitted</th><th>Priority</th><th>Status</th><th /></tr></thead><tbody>{list.map(report => {
      const tests = (report.patient?.laboratoryTests || []).map(x => x?.name).filter(Boolean);
      const specimens = (report.patient?.sampleTypes || []).map(x => x?.name).filter(Boolean);
      const displayText = tests.length ? tests.join(', ') : (specimens.join(', ') || '—');
      return <tr key={report._id}><td>{report.patient?.name}<span>{report.patient?.patientId}</span></td><td>{report.patient?.barcode || report.patient?.patientId}</td><td><strong>📍 {report.branchName || report.patient?.branchName || 'Main'}</strong></td><td>{report.technician?.fullName || '—'}</td><td>{displayText}</td><td>{new Date(report.submittedDate || report.updatedDate).toLocaleString()}</td><td>{report.priority || 'Routine'}</td><td>{report.status === 'Submitted' ? 'Pending Approval' : report.status}</td><td><button className="primary" onClick={() => { setSelected(report); setReason(report.rejectionReason || ''); }}>Review</button></td></tr>;
    })}</tbody></table> : <p className="empty">No reports in this view.</p>}</section>
    {selected && <div className="modal-backdrop"><div className="modal-content" style={{ maxWidth: 900 }}><header className="modal-header"><h2>Report Review</h2><button className="close-button" onClick={() => setSelected(null)}>×</button></header><ReportPreview report={selected} /><div className="form-actions"><button className="secondary" onClick={()=>{try{printLabReport(selected,user)}catch(e){setError(e.message)}}}>Print Preview</button></div>{['Pending', 'Submitted'].includes(selected.status) && <div className="form-actions"><label className="wide">Reason for rejection (required to return to collector)<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength="2000" placeholder="Describe the correction required" /></label><button className="primary" disabled={busy} onClick={() => decide('Approved')}>{busy ? 'Saving…' : 'Approve Report'}</button><button className="secondary danger" disabled={busy} onClick={() => decide('Rejected')}>Return to Collector</button></div>}</div></div>}
  </section>;
}
