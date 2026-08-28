/**
 * ETU Diagnostic Laboratory — Admin Pathology Department Configuration Page
 *
 * Allows Main Admin to view and configure Pathology tests, subcategories, and prices.
 * Provides strict Read-Only mode for Sub Admin users.
 */

import { useState, useEffect, useCallback } from 'react';
import api, { isSilentNetworkError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatETB } from '../utils/currencyHelper.js';
import ModalPortal from '../components/ModalPortal.jsx';

export default function AdminPathologyPage() {
  const { user, token } = useAuth();
  const isSubAdmin = user?.role === 'Sub Admin';

  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(null);
  const [tests, setTests] = useState([]);
  const [toast, setToast] = useState(null);

  // Edit / Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [formName, setFormName] = useState('');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api('/pathology/catalog', { token });
      setCategory(data.category);
      setTests(data.tests || []);
    } catch (e) {
      if (!isSilentNetworkError(e)) {
        setToast({ message: e.message || 'Failed to load pathology configuration.', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreateModal = () => {
    if (isSubAdmin) return;
    setEditingTest(null);
    setFormName('');
    setFormSubcategory('');
    setFormPrice('800');
    setFormDescription('');
    setFormStatus('Active');
    setModalOpen(true);
  };

  const openEditModal = (t) => {
    if (isSubAdmin) return;
    setEditingTest(t);
    setFormName(t.name);
    setFormSubcategory(t.subcategory || t.name);
    setFormPrice(String(t.price));
    setFormDescription(t.description || '');
    setFormStatus(t.status || 'Active');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubAdmin) return;
    if (!formName.trim()) {
      showToast('Please enter a test name.', 'error');
      return;
    }
    const numPrice = Number(formPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      showToast('Please enter a valid price in ETB.', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingTest) {
        // Update price & description
        await api(`/pathology/catalog/${editingTest._id}/price`, {
          token,
          method: 'PUT',
          body: JSON.stringify({
            price: numPrice,
            description: formDescription,
            status: formStatus
          })
        });
        showToast(`Updated ${editingTest.name} successfully.`);
      } else {
        // Create new test
        await api('/pathology/catalog', {
          token,
          method: 'POST',
          body: JSON.stringify({
            name: formName,
            subcategory: formSubcategory || formName,
            price: numPrice,
            description: formDescription
          })
        });
        showToast('Created new Pathology test successfully.');
      }
      setModalOpen(false);
      loadData();
    } catch (e) {
      showToast(e.message || 'Failed to save changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (isSubAdmin) return;
    if (!window.confirm(`Are you sure you want to delete the Pathology test "${t.name}"?`)) return;
    try {
      await api(`/pathology/catalog/${t._id}`, { token, method: 'DELETE' });
      showToast(`Deleted ${t.name} successfully.`);
      loadData();
    } catch (e) {
      showToast(e.message || 'Failed to delete test.', 'error');
    }
  };

  return (
    <section className="page admin-pathology-page">
      {/* Toast feedback */}
      {toast && (
        <div
          className={`toast-message ${toast.type === 'error' ? 'error' : 'success'}`}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '12px 24px',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            zIndex: 2000,
            background: toast.type === 'error' ? 'var(--color-error, #b71c1c)' : 'var(--color-success, #2e7d32)',
            boxShadow: 'var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.2))',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}
        >
          <span>{toast.type === 'error' ? '❌' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="dash-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="eyebrow">Department Configuration</p>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🔬</span> Pathology Management
            </h1>
            <p className="intro">Manage anatomical pathology examinations, reporting turnarounds, and ETB pricing.</p>
          </div>
          {!isSubAdmin && (
            <button className="primary-button" onClick={openCreateModal} style={{ padding: '0.6rem 1.2rem' }}>
              ＋ Add Pathology Subcategory
            </button>
          )}
        </div>
      </header>

      {/* Sub Admin Read-Only Notice */}
      {isSubAdmin && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 18px', marginBottom: '1.5rem', color: '#166534', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>🔒</span>
          <div>
            <strong>Read-Only Mode:</strong> Sub Admin accounts can view Pathology categories and examination fees, but cannot edit prices or modify tests.
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <article className="stat-card blue">
          <small>Active Tests</small>
          <strong>{tests.length}</strong>
        </article>
        <article className="stat-card purple">
          <small>Biopsy Reporting</small>
          <strong>20 Days</strong>
        </article>
        <article className="stat-card green">
          <small>FNAC / Morphology</small>
          <strong>24 Hours</strong>
        </article>
      </div>

      {/* Test Catalog Table */}
      <section className="table-card" style={{ background: 'var(--color-surface,#fff)', borderRadius: '12px', border: '1px solid var(--color-border,#e2ecef)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--color-border,#e2ecef)', background: 'var(--color-background,#f8fafc)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--color-primary,#075c91)' }}>
            Pathology Examinations & Prices (ETB)
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏳</div>
            Loading pathology catalog…
          </div>
        ) : tests.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            No pathology examinations found. Click "Add Pathology Subcategory" to create one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'var(--color-background,#f8fafc)', borderBottom: '2px solid var(--color-border,#e2ecef)', color: 'var(--color-primary,#075c91)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Examination Name</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Subcategory</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Turnaround / Deadline</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Price (ETB)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                  {!isSubAdmin && <th style={{ padding: '10px 14px', textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {tests.map((t, idx) => {
                  const isBiopsy = /biopsy/i.test(t.name || t.subcategory);
                  return (
                    <tr key={t._id} style={{ borderBottom: '1px solid var(--color-border,#edf2f7)' }}>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--color-primary,#075c91)' }}>
                        {t.name}
                        {t.description && (
                          <small style={{ display: 'block', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>
                            {t.description}
                          </small>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                          {t.subcategory || 'Pathology'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', background: isBiopsy ? '#fef3c7' : '#e0e7ff', color: isBiopsy ? '#92400e' : '#3730a3', fontWeight: 600 }}>
                          ⏱️ {isBiopsy ? '20 Days' : '24 Hours'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#15803d', fontSize: '14px' }}>
                        {formatETB(t.price)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: t.status === 'Active' ? '#dcfce7' : '#fee2e2', color: t.status === 'Active' ? '#166534' : '#991b1b', fontWeight: 600 }}>
                          {t.status || 'Active'}
                        </span>
                      </td>
                      {!isSubAdmin && (
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="filter-chip"
                              style={{ padding: '4px 10px', fontSize: '11.5px', fontWeight: 600, border: '1px solid var(--color-primary,#075c91)', color: 'var(--color-primary,#075c91)' }}
                              onClick={() => openEditModal(t)}
                            >
                              ✏️ Edit Price
                            </button>
                            <button
                              className="filter-chip"
                              style={{ padding: '4px 8px', fontSize: '11.5px', fontWeight: 600, border: '1px solid #ef4444', color: '#ef4444' }}
                              onClick={() => handleDelete(t)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit / Create Modal */}
      <ModalPortal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
          <header className="modal-header">
            <h2 style={{ fontSize: '1.15rem', color: 'var(--color-primary, #075c91)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{editingTest ? '✏️' : '＋'}</span> {editingTest ? `Edit ${editingTest.name}` : 'Add Pathology Subcategory'}
            </h2>
            <button className="close-button" onClick={() => setModalOpen(false)}>&times;</button>
          </header>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Examination Name *</label>
              <input
                type="text"
                required
                className="global-input"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                disabled={Boolean(editingTest)}
                placeholder="e.g. Biopsy, FNAC, Peripheral Morphology"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Subcategory</label>
              <input
                type="text"
                className="global-input"
                value={formSubcategory}
                onChange={e => setFormSubcategory(e.target.value)}
                placeholder="e.g. Biopsy"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Price (ETB) *</label>
              <input
                type="number"
                required
                min="0"
                step="1"
                className="global-input"
                value={formPrice}
                onChange={e => setFormPrice(e.target.value)}
                placeholder="e.g. 2000"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Description / Clinical Notes</label>
              <textarea
                className="global-input"
                rows={2}
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Optional description"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Status</label>
              <select
                className="global-input"
                value={formStatus}
                onChange={e => setFormStatus(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>
    </section>
  );
}
