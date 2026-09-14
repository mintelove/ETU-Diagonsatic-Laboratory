import { useEffect, useMemo, useState } from 'react';
import { api, isSilentNetworkError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { printLabReport } from '../utils/printLabReport.js';
import { buildPublicReportUrl } from '../utils/publicUrlHelper.js';

import ReportPreview, { getReportTestTypes } from '../components/ReportPreview.jsx';
import { FlagBadge } from '../utils/flagHelper.jsx';

import { useScrollLock } from '../utils/useScrollLock.js';
import ModalPortal from '../components/ModalPortal.jsx';

const today = value => new Date(value).toDateString() === new Date().toDateString();
function Card({ label, value, tone }) { return <article className={`enterprise-card ${tone}`}><small>{label}</small><strong>{value}</strong></article>; }

export default function ExtraRequestsPage() {
  const { token, user } = useAuth();
  const isAdmin = user.role === 'Admin';
  const isSubAdmin = user.role === 'Sub Admin' || (user.role && user.role.toLowerCase().includes('sub admin'));
  const canApproveReports = isAdmin || isSubAdmin || user.role === 'Approver';
  const { subscribe, unsubscribe } = useRealtime();
  const [requests, setRequests] = useState([]); const [reports, setReports] = useState([]); const [reportHistory, setReportHistory] = useState([]);
  const [tab, setTab] = useState('stock'); const [stockStatus, setStockStatus] = useState('Pending'); const [reportStatus, setReportStatus] = useState('Pending'); const [query, setQuery] = useState('');
  const [comments, setComments] = useState({}); const [selected, setSelected] = useState(null); const [reason, setReason] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [showReportFooter, setShowReportFooter] = useState(true);
  const [reportStampType, setReportStampType] = useState(null);
  useScrollLock(!!selected);
  const load = async () => { try { const calls = [api('/extra-requests', { token })]; if (canApproveReports) calls.push(api('/report-approvals/pending', { token }), api('/report-approvals/history', { token })); const [stock, pending = { reports: [] }, history = { reports: [] }] = await Promise.all(calls); setRequests(stock.requests); setReports(pending.reports); setReportHistory(history.reports); } catch (e) { if (!isSilentNetworkError(e)) setError(e.message); } };
  useEffect(() => { load(); }, [token, canApproveReports]);
  useEffect(() => {
    subscribe('extraRequests:change', load);
    subscribe('reports:change', load);
    return () => { unsubscribe('extraRequests:change', load); unsubscribe('reports:change', load); };
  }, [subscribe, unsubscribe]);
  const reviewStock = async (id, decision) => { setBusy(true); setError(''); try { const result = await api(`/extra-requests/${id}/review`, { token, method: 'PATCH', body: JSON.stringify({ status: decision, comments: comments[id] || '' }) }); setMessage(result.message); load(); } catch (e) { if (!isSilentNetworkError(e)) setError(e.message); } finally { setBusy(false); } };
  const decideReport = async status => {
    if (!selected || busy) return;
    if (status === 'Rejected' && !reason.trim()) { setError('A reason for rejection is required.'); return; }
    setBusy(true); setError('');
    try {
      await api(`/report-approvals/${selected._id}`, { token, method: 'PATCH', body: JSON.stringify({ status, comments: reason, stampType: reportStampType }) });
      setMessage(`Report ${status.toLowerCase()}.`);
      setSelected(null);
      setReason('');
      load();
    } catch (e) {
      if (!isSilentNetworkError(e)) setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const handleUpdateStampType = async (newType) => {
    setReportStampType(newType);
    if (selected?._id) {
      setSelected(prev => prev ? { ...prev, stampType: newType } : prev);
      setReports(prev => prev.map(r => r._id === selected._id ? { ...r, stampType: newType } : r));
      setReportHistory(prev => prev.map(r => r._id === selected._id ? { ...r, stampType: newType } : r));
      try {
        await api(`/reception/reports/${selected._id}/stamp`, {
          token,
          method: 'PATCH',
          body: { stampType: newType }
        });
      } catch (err) {
        console.warn('Failed to save stamp type:', err);
      }
    }
  };
  const visibleStock = requests.filter(r => !stockStatus || r.status === stockStatus);
  const visibleReports = useMemo(() => [...reports, ...reportHistory].filter((r, index, all) => all.findIndex(x => x._id === r._id) === index).filter(r => { const status = r.status === 'Submitted' ? 'Pending' : r.status; const haystack = `${r.patient?.name || ''} ${r.patient?.patientId || ''} ${r.patient?.barcode || ''} ${r.technician?.fullName || ''}`.toLowerCase(); return (!reportStatus || status === reportStatus) && (!query || haystack.includes(query.toLowerCase())); }), [reports, reportHistory, reportStatus, query]);
  const approvedToday = reportHistory.filter(r => r.status === 'Approved' && today(r.approvedDate)); const rejectedToday = reportHistory.filter(r => r.status === 'Rejected' && today(r.rejectedDate));
  return <section className="page approval-center"><header className="page-title"><div><p className="eyebrow">Controlled laboratory decisions</p><h1>{isAdmin || isSubAdmin ? 'Approval Center' : 'Extra Item Approvals'}</h1><p className="intro">Review stock exceptions and laboratory reports from one secure workspace.</p></div></header>
    {(isAdmin || isSubAdmin) && <div className="enterprise-grid"><Card label="Pending Stock Requests" value={requests.filter(x => x.status === 'Pending').length} tone="blue"/><Card label="Approved Stock Requests" value={requests.filter(x => x.status === 'Approved').length} tone="green"/><Card label="Rejected Stock Requests" value={requests.filter(x => x.status === 'Rejected').length} tone="orange"/><Card label="Pending Report Approvals" value={reports.length} tone="purple"/><Card label="Approved Reports Today" value={approvedToday.length} tone="teal"/><Card label="Rejected Reports Today" value={rejectedToday.length} tone="orange"/></div>}
    {error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}
    <div className="reception-tabs"><button type="button" className={tab === 'stock' ? 'active' : ''} onClick={() => setTab('stock')}>Extra Stock Requests</button>{canApproveReports && <button type="button" className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>Laboratory Report Approval</button>}</div>
    {tab === 'stock' && <><div className="table-title"><h2>Extra Stock &amp; Stock Edit Requests</h2><select value={stockStatus} onChange={e => setStockStatus(e.target.value)}><option value="">All requests</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></div><section className="table-card">{visibleStock.length ? <table><thead><tr><th>Request # / Type</th><th>Requester / Role / Branch</th><th>Stock item</th><th>Current qty</th><th>Requested edit / qty</th><th>Reason</th><th>Date &amp; Time</th><th>Status</th><th>{isAdmin ? 'Decision' : 'Review Note'}</th></tr></thead><tbody>{visibleStock.map(r => <tr key={r._id}><td><strong>{r.requestNumber}</strong><span className="stock-badge" style={{ marginTop: '4px', background: r.requestType === 'Stock Edit' ? 'rgba(7, 92, 145, 0.15)' : 'rgba(14, 116, 144, 0.15)', color: 'var(--color-primary)' }}>{r.requestType || 'Extra Stock'}</span></td><td><strong>{r.requestedBy?.fullName || '—'}</strong><small style={{ display: 'block', color: 'var(--text-secondary)' }}><span className="role-tag" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{r.requestedBy?.role || 'Staff'}</span> · @{r.requestedBy?.username || 'user'} · <b>📍 {r.requestedBy?.branchName || 'Main'}</b></small></td><td><strong>{r.item?.itemName}</strong><small style={{ display: 'block', color: 'var(--text-secondary)' }}>{r.item?.itemCode}</small></td><td><strong>{r.currentQuantity !== undefined ? r.currentQuantity : (r.item ? r.item.currentQuantity - r.item.usedQuantity : '—')}</strong></td><td><strong>{r.requestType === 'Stock Edit' ? (r.requestedEdit || (r.quantity ? `Set qty to ${r.quantity}` : 'Stock edit permission')) : `${r.quantity} ${r.item?.unit || ''}`}</strong>{r.patient && <small style={{ display: 'block', color: 'var(--text-secondary)' }}>Patient: {r.patient.name} ({r.patient.patientId})</small>}</td><td>{r.reason}</td><td>{new Date(r.createdDate).toLocaleDateString()} <small style={{ display: 'block', color: 'var(--text-secondary)' }}>{new Date(r.createdDate).toLocaleTimeString()}</small></td><td><span className={`status ${r.status === 'Approved' ? 'active' : r.status === 'Rejected' ? 'inactive' : 'pending'}`}>{r.status}</span>{r.reviewedBy && <small style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '2px' }}>By: {r.reviewedBy.fullName}</small>}</td><td>{isAdmin ? (r.status === 'Pending' ? <div className="review-actions" style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}><input value={comments[r._id] || ''} onChange={e => setComments({ ...comments, [r._id]: e.target.value })} placeholder="Optional note" style={{ padding: '0.35rem', fontSize: '0.8rem' }}/><div style={{ display: 'flex', gap: '6px' }}><button type="button" className="primary" disabled={busy} onClick={() => reviewStock(r._id, 'Approved')}>Approve</button><button type="button" className="secondary danger" disabled={busy} onClick={() => reviewStock(r._id, 'Rejected')}>Reject</button></div></div> : (r.comments ? <small style={{ fontStyle: 'italic' }}>{r.comments}</small> : '—')) : (r.status === 'Pending' ? <span style={{ color: '#d97706', fontSize: '0.82rem', fontWeight: 600 }}>⏳ Waiting for Admin</span> : (r.comments ? <small style={{ fontStyle: 'italic' }}>{r.comments}</small> : '—'))}</td></tr>)}</tbody></table> : <p className="empty">No stock requests match this filter.</p>}</section></>}
    {tab === 'reports' && <><div className="table-title"><h2>Laboratory report approvals</h2><div className="form-actions"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search patient, ID, barcode or collector"/><select value={reportStatus} onChange={e => setReportStatus(e.target.value)}><option value="">All reports</option><option value="Pending">Pending</option><option>Approved</option><option>Rejected</option></select></div></div><section className="table-card">{visibleReports.length ? <table><thead><tr><th>Patient</th><th>Barcode</th><th>Age / Sex</th><th>Laboratory test types</th><th>Collector</th><th>Submitted</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleReports.map(r => { const testTypes = getReportTestTypes(r).formattedNames; return <tr key={r._id}><td>{r.patient?.name}<span>{r.patient?.patientId}</span></td><td>{r.patient?.barcode || r.patient?.patientId}</td><td>{r.patient?.age || '—'} / {r.patient?.sex || '—'}</td><td><strong style={{ color: 'var(--color-primary)' }}>{testTypes}</strong></td><td>{r.technician?.fullName || '—'}</td><td>{new Date(r.submittedDate || r.updatedDate).toLocaleString()}</td><td>{r.priority || 'Routine'}</td><td>{r.status === 'Submitted' ? 'Pending Approval' : r.status}</td><td><button type="button" className="secondary" onClick={() => { setSelected(r); setReportStampType(r.stampType || null); setReason(r.rejectionReason || ''); }}>View Report</button>{['Submitted', 'Pending'].includes(r.status) && <><button type="button" className="primary" disabled={busy} onClick={() => { setSelected(r); setReportStampType(r.stampType || null); setReason(''); }}>Approve / Reject</button></>}</td></tr>; })}</tbody></table> : <p className="empty">No laboratory reports match this filter.</p>}</section></>}
    <ModalPortal isOpen={!!selected} onClose={() => setSelected(null)}>
      <div className="modal-content" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
        <header className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>Laboratory Report</h2>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <input
                type="checkbox"
                checked={showReportFooter}
                onChange={e => setShowReportFooter(e.target.checked)}
              />
              Show Logo &amp; Footer
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: reportStampType === 'lab' ? '#0284c7' : '#334155', cursor: 'pointer', background: reportStampType === 'lab' ? '#e0f2fe' : '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${reportStampType === 'lab' ? '#0284c7' : '#cbd5e1'}` }}>
              <input
                type="checkbox"
                checked={reportStampType === 'lab'}
                onChange={() => handleUpdateStampType(reportStampType === 'lab' ? null : 'lab')}
              />
              Add Stamp for Lab
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: reportStampType === 'clinic' ? '#0284c7' : '#334155', cursor: 'pointer', background: reportStampType === 'clinic' ? '#e0f2fe' : '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${reportStampType === 'clinic' ? '#0284c7' : '#cbd5e1'}` }}>
              <input
                type="checkbox"
                checked={reportStampType === 'clinic'}
                onChange={() => handleUpdateStampType(reportStampType === 'clinic' ? null : 'clinic')}
              />
              Add Stamp for Clinic
            </label>
          </div>
          <button type="button" className="close-button" onClick={() => setSelected(null)}>×</button>
        </header>
        <div className="modal-body">
          <ReportPreview report={selected} showFooter={showReportFooter} stampType={reportStampType}/>
        </div>
        <div className="form-actions" style={{ padding: '14px 24px', borderTop: '1px solid var(--color-outline-variant, #e2e8f0)', marginTop: 0, display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                try {
                  if (selected?._id) {
                    api(`/reception/reports/${selected._id}/print`, {
                      token,
                      method: 'PATCH',
                      body: { stampType: reportStampType }
                    }).catch(e => console.warn('Print log warning (silent):', e));
                  }
                  printLabReport(selected, token, user, showReportFooter, reportStampType);
                } catch (e) {
                  if (!isSilentNetworkError(e)) setError(e.message);
                }
              }}
            >
              🖨 Print Preview
            </button>
            {['Approved', 'Ready for Printing'].includes(selected?.status) && (
              <button
                type="button"
                className="primary"
                onClick={async () => {
                  let tok = selected?.publicReport?.token;
                  if (!tok && selected?._id) {
                    try {
                      const res = await api(`/final-reports/${selected._id}/public-link`, { token });
                      if (res?.token) tok = res.token;
                    } catch (err) {}
                  }
                  if (tok) {
                    const link = buildPublicReportUrl(tok, reportStampType);
                    navigator.clipboard.writeText(link);
                    setMessage('Public report link copied to clipboard!');
                  }
                }}
              >
                📋 Copy Share Link
              </button>
            )}
          </div>
          <button type="button" className="secondary" onClick={() => setSelected(null)}>Close</button>
        </div>
        {['Submitted', 'Pending'].includes(selected?.status) && (
          <div className="form-actions" style={{ padding: '12px 24px 18px', borderTop: '1px dashed var(--color-outline-variant, #e2e8f0)', marginTop: 0 }}>
            <label className="wide">Reason for rejection (required)
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe the correction required"/>
            </label>
            <button type="button" className="primary" disabled={busy} onClick={() => decideReport('Approved')}>{busy ? 'Saving…' : 'Approve Report'}</button>
            <button type="button" className="secondary danger" disabled={busy} onClick={() => decideReport('Rejected')}>Reject Report</button>
          </div>
        )}
      </div>
    </ModalPortal>
  </section>;
}

