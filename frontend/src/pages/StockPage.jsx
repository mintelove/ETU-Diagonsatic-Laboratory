import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, isSilentNetworkError } from '../api/client.js';
import { download } from '../api/download.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import StockForm from '../components/StockForm.jsx';

const cls = { Healthy: 'healthy', Moderate: 'moderate', Low: 'low', Critical: 'critical', 'Critical Emergency': 'emergency', 'Out of Stock': 'out' };

const sameDay = (a, b) => {
  if (!a || !b) return false;
  const d1 = new Date(a), d2 = new Date(b);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
};

function formatCountdown(targetDate, now) {
  if (!targetDate) return null;
  const editDate = new Date(targetDate);
  if (isNaN(editDate.getTime())) return null;

  const endOfDay = new Date(editDate);
  endOfDay.setHours(24, 0, 0, 0);
  const diffMs = endOfDay.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const pad = n => String(n).padStart(2, '0');
  return {
    short: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    full: `${hours} Hours ${minutes} Minutes ${seconds} Seconds`
  };
}

export default function StockPage() {
  const { token, user } = useAuth();
  const admin = user?.role === 'Admin';
  const isReception = user?.role === 'Reception' || user?.role === 'Receptionist' || (user?.role && user.role.toLowerCase().includes('reception'));
  const canManage = admin || isReception;
  const { subscribe, unsubscribe } = useRealtime();
  const [params] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [meta, setMeta] = useState({});
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState({ category: '', level: '', sort: 'newest' });
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState('');
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [stockManagementMode, setStockManagementMode] = useState('Smart');
  
  // Real-time ticker for live countdowns
  const [now, setNow] = useState(() => new Date());

  // Modal State for Request Admin Approval
  const [requestModalItem, setRequestModalItem] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [requestedQty, setRequestedQty] = useState('');

  const query = useMemo(() => new URLSearchParams({ page, limit: 15, search: q, ...Object.fromEntries(Object.entries(filter).filter(([, v]) => v)) }).toString(), [page, q, filter]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = () => {
    api(`/stock?${query}`, { token }).then(x => { setItems(x.items); setMeta(x.pagination); }).catch(e => {
      if (!isSilentNetworkError(e)) setError(e.message);
    });
    if (canManage) {
      api('/extra-requests', { token }).then(x => setRequests(x.requests || [])).catch(() => {});
    }
  };

  useEffect(() => {
    api('/categories', { token }).then(x => setCategories(x.categories)).catch(() => {});
    api('/laboratory-tests/settings', { token }).then(x => setStockManagementMode(x.settings?.stockManagementMode || 'Smart')).catch(() => {});
    load();
  }, [query]);

  useEffect(() => {
    if (params.get('item')) api(`/stock/${params.get('item')}`, { token }).then(x => { setSelected(x.item); setMode('history'); }).catch(() => {});
  }, [params]);

  useEffect(() => {
    const cb = () => load();
    subscribe('stock:change', cb);
    subscribe('categories:change', cb);
    subscribe('extraRequests:change', cb);
    return () => {
      unsubscribe('stock:change', cb);
      unsubscribe('categories:change', cb);
      unsubscribe('extraRequests:change', cb);
    };
  }, [subscribe, unsubscribe]);

  async function updateMode(newMode) {
    try {
      await api('/laboratory-tests/settings', { token, method: 'PUT', body: JSON.stringify({ stockManagementMode: newMode }) });
      setStockManagementMode(newMode);
      setMessage(`Stock management mode changed to ${newMode} Stock Management.`);
    } catch (e) {
      if (!isSilentNetworkError(e)) setError(e.message);
    }
  }

  const openApprovalModal = (item) => {
    setRequestModalItem(item);
    setRequestReason('');
    setRequestedQty(item.remainingQuantity ?? item.currentQuantity);
  };

  const submitRequestApproval = async (e) => {
    e.preventDefault();
    if (!requestModalItem || !requestReason.trim()) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/stock/${requestModalItem._id}/edit-permission-requests`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          requestedQuantity: requestedQty !== '' ? Number(requestedQty) : requestModalItem.remainingQuantity,
          reason: requestReason.trim(),
          requestedEdit: `Quantity request: ${requestedQty !== '' ? requestedQty : 'Modify item details'}`
        })
      });
      setMessage(`Request Admin Approval for ${requestModalItem.itemName} submitted to Admin Approval Center.`);
      setRequestModalItem(null);
      setRequestReason('');
      setRequestedQty('');
      load();
    } catch (err) {
      if (!isSilentNetworkError(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  async function save(f) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(selected ? `/stock/${selected._id}` : '/stock', { token, method: selected ? 'PATCH' : 'POST', body: JSON.stringify(f) });
      setMessage('Stock item saved successfully.');
      setMode('');
      setSelected(null);
      load();
    } catch (e) {
      if (!isSilentNetworkError(e)) {
        setError(e.message);
        if (isReception && e.message.includes('Administrator approval is required') && selected) {
          openApprovalModal(selected);
        }
      }
    } finally { setBusy(false); }
  }

  async function remove(i) {
    if (!confirm(`Delete ${i.itemName}?`)) return;
    try {
      await api(`/stock/${i._id}`, { token, method: 'DELETE' });
      setMessage('Stock item deleted.');
      load();
    } catch (e) {
      if (!isSilentNetworkError(e)) setError(e.message);
    }
  }

  async function quantity(i) {
    setError('');
    setMessage('');
    const addQuantity = prompt(`Add stock quantity for ${i.itemName}:`, 0);
    if (addQuantity === null) return;
    const reason = prompt('Reason for this stock addition:');
    if (!reason) return;
    try {
      await api(`/stock/${i._id}/quantity`, { token, method: 'PATCH', body: JSON.stringify({ addQuantity: Number(addQuantity), reason }) });
      setMessage('Stock quantity updated successfully.');
      load();
    } catch (e) {
      if (!isSilentNetworkError(e)) {
        setError(e.message);
        if (isReception && e.message.includes('Administrator approval is required')) {
          openApprovalModal(i);
        }
      }
    }
  }

  async function showHistory(i) {
    setSelected(i);
    setHistory((await api(`/stock/${i._id}/history`, { token })).history);
    setMode('history');
  }

  // Partition items into editable vs locked for Receptionist
  const { editableItems, lockedItems } = useMemo(() => {
    if (!isReception) return { editableItems: items, lockedItems: [] };
    const ed = [];
    const lo = [];
    items.forEach(i => {
      const itemReq = requests.find(r => r.requestType === 'Stock Edit' && (r.item?._id === i._id || r.item === i._id));
      const isEditedToday = i.receptionEditedOn && sameDay(i.receptionEditedOn, now);
      const hasApprovedEdit = itemReq?.status === 'Approved' || i.receptionExtraEditGranted;
      if (isEditedToday && !hasApprovedEdit) {
        lo.push(i);
      } else {
        ed.push(i);
      }
    });
    return { editableItems: ed, lockedItems: lo };
  }, [items, isReception, requests, now]);

  const renderCard = (i, isLocked) => {
    const itemReq = isReception ? requests.find(r => r.requestType === 'Stock Edit' && (r.item?._id === i._id || r.item === i._id)) : null;
    const countdown = isLocked ? formatCountdown(i.receptionEditedOn, now) : null;

    return (
      <article key={i._id} className="stock-card" style={isLocked ? { border: '2px solid rgba(245, 158, 11, 0.45)', background: 'var(--card-bg, #fff)' } : {}}>
        <div className="stock-head">
          <div>
            <small>{i.itemCode}</small>
            <h2>{i.itemName}</h2>
            <p>{i.category?.name} · {i.unit}</p>
          </div>
          <span className={`stock-badge ${cls[i.stockLevel.key]}`}>{i.stockLevel.label}</span>
        </div>

        <div className="progress"><i className={cls[i.stockLevel.key]} style={{ width: `${i.stockLevel.percentage}%` }} /></div>
        
        <div className="stock-numbers">
          <strong>{i.stockLevel.percentage}%</strong>
          <span className={i.remainingQuantity < 0 ? 'negative-stock' : ''}>{i.remainingQuantity} remaining of {i.currentQuantity}</span>
          <span>{i.usedQuantity} used</span>
        </div>

        {isReception && (
          <div style={{ margin: '10px 0 4px 0' }}>
            {isLocked && countdown && (
              <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontSize: '0.82rem', color: '#b45309', fontWeight: 700 }}>
                  <span>🔒 Already Edited Today</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', background: 'rgba(245, 158, 11, 0.2)', padding: '2px 8px', borderRadius: '6px', color: '#92400e' }}>
                    {countdown.short}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #475569)', marginTop: '6px', textAlign: 'center', fontWeight: 600 }}>
                  ⏳ Available again in: <span style={{ color: '#b45309' }}>{countdown.full}</span>
                </div>
                {i.receptionEditedOn && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary, #64748b)', textAlign: 'center', marginTop: '4px' }}>
                    Last edited today at {new Date(i.receptionEditedOn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            )}

            {itemReq && (
              <div style={{ marginTop: '6px' }}>
                {itemReq.status === 'Pending' && (
                  <div style={{ fontSize: '0.8rem', color: '#b45309', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.35)', padding: '9px 12px', borderRadius: '10px', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                      <span>⏳ Approval Pending</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #475569)', marginTop: '2px' }}>
                      Waiting for Admin approval
                    </div>
                  </div>
                )}
                {itemReq.status === 'Approved' && (
                  <div style={{ fontSize: '0.8rem', color: '#15803d', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.35)', padding: '9px 12px', borderRadius: '10px', fontWeight: 700 }}>
                    <div>✓ Admin Approved</div>
                    <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 500, marginTop: '2px' }}>
                      You can now edit this item.
                    </div>
                  </div>
                )}
                {itemReq.status === 'Rejected' && (
                  <div style={{ fontSize: '0.8rem', color: '#b91c1c', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '9px 12px', borderRadius: '10px', fontWeight: 600 }}>
                    <div style={{ fontWeight: 700 }}>✕ Request Rejected</div>
                    <div style={{ fontSize: '0.76rem', marginTop: '2px' }}>
                      Your request to edit this item was rejected by the Admin.
                    </div>
                    {itemReq.comments && (
                      <div style={{ fontSize: '0.74rem', marginTop: '4px', fontStyle: 'italic', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                        Reason: {itemReq.comments}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="card-footer">
          <span>KES {Number(i.purchasePrice).toLocaleString()}</span>
          <div className="actions" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="text-action" onClick={() => showHistory(i)}>History</button>
            {canManage && (
              <>
                {isLocked ? (
                  itemReq?.status === 'Pending' ? (
                    <button className="secondary" disabled style={{ opacity: 0.8, fontSize: '0.78rem', padding: '6px 12px', cursor: 'not-allowed', background: 'rgba(234, 179, 8, 0.15)', color: '#d97706', border: '1px solid rgba(234, 179, 8, 0.4)', borderRadius: '8px', fontWeight: 600 }}>
                      Request Pending
                    </button>
                  ) : (
                    <button className="secondary" style={{ background: 'var(--color-primary-container, rgba(2, 132, 199, 0.15))', color: 'var(--color-primary, #0284c7)', borderColor: 'var(--color-primary)', fontWeight: 700, fontSize: '0.78rem', padding: '6px 12px', borderRadius: '8px' }} onClick={() => openApprovalModal(i)}>
                      🔐 Request Admin Approval
                    </button>
                  )
                ) : (
                  <>
                    <button className="text-action" onClick={() => { setSelected(i); setMode('form'); }}>Edit Stock</button>
                    <button className="text-action" onClick={() => quantity(i)}>Add stock</button>
                  </>
                )}
                {admin && <button className="text-action danger" onClick={() => remove(i)}>Delete</button>}
              </>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className="page stock-page">
      <div className="page-title">
        <div>
          <p className="eyebrow">Stock management</p>
          <h1>Laboratory supplies</h1>
          <p className="intro">Monitor stock quantities and availability in real time.</p>
        </div>
        {canManage && <button className="fab" onClick={() => { setSelected(null); setMode('form'); }}>＋ Add stock</button>}
      </div>

      {admin && (
        <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--card-border, #d7e5eb)', borderRadius: '12px', padding: '12px 18px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div>
            <strong style={{ display: 'block', fontSize: '14px', color: 'var(--color-primary, #075c91)' }}>Stock Management Mode</strong>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary, #607985)' }}>Choose between automatic smart consumable deduction or manual receptionist stock updates.</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: stockManagementMode === 'Smart' ? 700 : 400, cursor: 'pointer' }}>
              <input type="radio" name="stockMode" checked={stockManagementMode === 'Smart'} onChange={() => updateMode('Smart')} /> ⚡ Smart Stock Management (Default)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: stockManagementMode === 'Manual' ? 700 : 400, cursor: 'pointer' }}>
              <input type="radio" name="stockMode" checked={stockManagementMode === 'Manual'} onChange={() => updateMode('Manual')} /> 📝 Manual Stock Management
            </label>
          </div>
        </div>
      )}

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {mode === 'form' && <StockForm item={selected} categories={categories} onSave={save} onCancel={() => { setMode(''); setSelected(null); }} busy={busy} />}

      {/* ═══ STOCK HISTORY GLASSMORPHISM MODAL ═══ */}
      {mode === 'history' && selected && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setMode(''); setSelected(null); } }}>
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <header className="modal-header">
              <h2 style={{ fontSize: '1.2rem', color: 'var(--color-primary, #075c91)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📜</span> Stock History — {selected.itemName}
              </h2>
              <button className="close-button" onClick={() => { setMode(''); setSelected(null); }}>&times;</button>
            </header>
            
            <div style={{ background: 'var(--color-primary-light, rgba(7, 92, 145, 0.08))', border: '1px solid rgba(7, 92, 145, 0.18)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.85rem' }}>
              <strong>Item Code:</strong> {selected.itemCode} · <strong>Category:</strong> {selected.category?.name || 'General'} · <strong>Current Stock:</strong> {selected.remainingQuantity} {selected.unit}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '55vh', paddingRight: '4px' }}>
              {history.length ? history.map(h => (
                <div key={h._id} style={{ background: 'var(--color-surface-bright, #fff)', border: '1px solid var(--color-outline-variant, rgba(0, 0, 0, 0.08))', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ color: 'var(--color-primary, #075c91)', fontSize: '0.88rem' }}>{h.action}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{new Date(h.createdDate).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--color-on-surface)', marginBottom: '4px' }}>
                    Quantity change: <strong>{h.previousQuantity ?? '—'}</strong> → <strong>{h.newQuantity ?? '—'}</strong>
                    {h.reason && <span> · <em>Reason: {h.reason}</em></span>}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--color-on-surface-variant)' }}>
                    Updated by: <strong>{h.user?.fullName || 'System'}</strong> (@{h.user?.username || 'user'}) · Branch: <strong>{h.user?.branchName || 'Main'}</strong>
                  </div>
                </div>
              )) : <p className="empty">No stock transaction history recorded for this supply item.</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: '10px' }}>
              <button className="secondary" onClick={() => { setMode(''); setSelected(null); }}>Close History</button>
            </div>
          </div>
        </div>
      )}

      <div className="stock-tools">
        <input className="search" placeholder="Search item, code or category" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
        <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filter.level} onChange={e => setFilter({ ...filter, level: e.target.value })}>
          <option value="">All stock levels</option>
          {['Healthy', 'Low', 'Critical', 'Critical Emergency', 'Out of Stock'].map(x => <option key={x}>{x}</option>)}
        </select>
        <select value={filter.sort} onChange={e => setFilter({ ...filter, sort: e.target.value })}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Item name</option>
          <option value="remaining">Remaining quantity</option>
          <option value="price">Price</option>
        </select>
        {admin && (
          <div className="export-buttons">
            <button onClick={() => download('/reports/stock.csv', token)}>CSV</button>
            <button onClick={() => download('/reports/stock.xlsx', token)}>Excel</button>
            <button onClick={() => download('/reports/stock.pdf', token)}>PDF</button>
          </div>
        )}
      </div>

      {/* Editable Supplies Grid */}
      <div className="stock-grid">
        {editableItems.map(i => renderCard(i, false))}
      </div>

      {/* Recently Edited / Locked Items Section */}
      {isReception && lockedItems.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <div style={{ borderTop: '2px dashed var(--card-border, #cbd5e1)', paddingTop: '20px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span>🔒</span> Recently Edited / Locked Items ({lockedItems.length})
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              These stock items were edited today and are restricted under daily limits. You can request Admin approval for additional edits.
            </p>
          </div>

          <div className="stock-grid">
            {lockedItems.map(i => renderCard(i, true))}
          </div>
        </div>
      )}

      {!items.length && (
        <div className="empty-state">
          <h2>No stock items found</h2>
          <p>{canManage ? 'Add the first supply item to begin tracking stock.' : 'No stock items match your search.'}</p>
        </div>
      )}

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {meta.page || 1} of {meta.pages || 1}</span>
        <button disabled={page >= meta.pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>

      {/* Request Admin Approval Glassmorphism Center-Screen Modal */}
      {requestModalItem && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRequestModalItem(null);
          }}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '540px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '20px',
              background: 'var(--card-bg, rgba(255, 255, 255, 0.96))',
              border: '1px solid var(--card-border, #e2e8f0)',
              padding: '24px',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4)',
              color: 'var(--text-primary, #0f172a)'
            }}
          >
            <header className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--card-border, #e2e8f0)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-primary, #075c91)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔐</span> Request Admin Approval
              </h2>
              <button className="close-button" onClick={() => setRequestModalItem(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--color-surface-bright, rgba(14, 116, 144, 0.06))', padding: '14px 16px', borderRadius: '14px', marginBottom: '18px', border: '1px solid var(--card-border, #cbd5e1)' }}>
              <div>
                <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Stock Item</small>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary, #0f172a)' }}>{requestModalItem.itemName}</strong>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Code: {requestModalItem.itemCode}</span>
              </div>

              <div>
                <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Current Quantity</small>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{requestModalItem.remainingQuantity} {requestModalItem.unit}</strong>
              </div>

              <div>
                <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Requested Action</small>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-primary, #075c91)' }}>Edit Stock</span>
              </div>

              <div>
                <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Branch</small>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.branchName || requestModalItem.branchName || 'Main'}</span>
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed var(--card-border, #cbd5e1)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Your Daily Edit Limit</small>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309' }}>🔒 Already Used Today</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Available Again In</small>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--color-primary, #0284c7)', fontFamily: 'monospace' }}>
                    {formatCountdown(requestModalItem.receptionEditedOn, now)?.short || 'Tomorrow'}
                  </strong>
                </div>
              </div>
            </div>

            <form onSubmit={submitRequestApproval} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Reason for Request (Required) *
                <textarea required value={requestReason} onChange={e => setRequestReason(e.target.value)} placeholder="Enter detailed reason for requesting additional edit permission..." rows={3} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--input-border, #cbd5e1)', background: 'var(--input-bg, #fff)', color: 'var(--input-color, #000)', fontSize: '0.9rem' }} />
              </label>

              <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="secondary" onClick={() => setRequestModalItem(null)} style={{ padding: '9px 20px', borderRadius: '10px', fontWeight: 600 }}>Cancel</button>
                <button type="submit" className="primary" disabled={busy || !requestReason.trim()} style={{ padding: '9px 24px', borderRadius: '10px', fontWeight: 700 }}>
                  {busy ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
