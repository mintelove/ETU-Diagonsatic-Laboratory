/**
 * ETU Diagnostic Laboratory — Redesigned Sample Types Page
 *
 * Full enterprise-grade settings dashboard for Laboratory Sample Types.
 * Restricts mutating endpoints strictly to Administrator roles.
 * Includes advanced search/filter, default sample cards, custom toasts,
 * action icons, and smooth saving states.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getSampleTypes,
  createSampleType,
  updateSampleType,
  updateSampleTypeStatus,
  deleteSampleType,
} from '../services/sampleTypeService.js';

// Map categories to visual emojis
function getCategoryIcon(category) {
  switch (category) {
    case 'Blood': return '🩸';
    case 'Urine': return '🧪';
    case 'Stool': return '💩';
    case 'Body Fluid': return '🧫';
    default: return '🔬';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const initialFormState = {
  name: '',
  price: '',
  category: 'Blood',
  description: '',
  status: 'Active',
};

export default function SampleTypesPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Admin';

  // Data states
  const [sampleTypes, setSampleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Search & advanced filters state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedSampleType, setSelectedSampleType] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Deletion confirm modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sampleTypeToDelete, setSampleTypeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Add toast helper
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Fetch sample types
  const loadSampleTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getSampleTypes();
      setSampleTypes(data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve sample types.');
      addToast(err.message || 'Failed to retrieve sample types.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadSampleTypes();
  }, [loadSampleTypes]);

  // Open modal to add sample type
  const openAddModal = () => {
    if (!isAdmin) return;
    setSelectedSampleType(null);
    setForm(initialFormState);
    setFormError('');
    setFormOpen(true);
  };

  // Open modal to edit sample type
  const openEditModal = (sampleType) => {
    if (!isAdmin) return;
    setSelectedSampleType(sampleType);
    setForm({
      name: sampleType.name,
      price: sampleType.price,
      category: sampleType.category || 'Other',
      description: sampleType.description || '',
      status: sampleType.status || 'Active',
    });
    setFormError('');
    setFormOpen(true);
  };

  // Open view detail modal
  const openViewModal = (sampleType) => {
    setSelectedSampleType(sampleType);
    setViewOpen(true);
  };

  // Submit Add/Edit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Sample Name is required.');
      return;
    }
    if (form.price === '' || Number(form.price) <= 0) {
      setFormError('Price is required and must be greater than zero.');
      return;
    }

    try {
      setFormSubmitting(true);
      if (selectedSampleType) {
        // Update sample type
        const updated = await updateSampleType(selectedSampleType._id, {
          name: form.name.trim(),
          price: Number(form.price),
          category: form.category,
          description: form.description,
        });

        // If status changed, update status separately
        if (form.status !== selectedSampleType.status) {
          const statusUpdated = await updateSampleTypeStatus(selectedSampleType._id, form.status);
          setSampleTypes((prev) =>
            prev.map((s) => (s._id === selectedSampleType._id ? statusUpdated : s))
          );
        } else {
          setSampleTypes((prev) =>
            prev.map((s) => (s._id === selectedSampleType._id ? updated : s))
          );
        }
        addToast('Sample Type Updated Successfully', 'success');
      } else {
        // Create sample type
        const created = await createSampleType({
          name: form.name.trim(),
          price: Number(form.price),
          category: form.category,
          description: form.description,
          status: form.status,
        });
        setSampleTypes((prev) => [...prev, created]);
        addToast('Sample Type Created Successfully', 'success');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving.');
      addToast(err.message || 'Failed to save sample type.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle status (Active / Inactive)
  const handleToggleStatus = async (sampleType) => {
    if (!isAdmin) return;
    const newStatus = sampleType.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const updated = await updateSampleTypeStatus(sampleType._id, newStatus);
      setSampleTypes((prev) =>
        prev.map((s) => (s._id === sampleType._id ? updated : s))
      );
      addToast(`Sample Type status updated to ${newStatus}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update sample type status.', 'error');
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (sampleType) => {
    if (!isAdmin) return;
    setSampleTypeToDelete(sampleType);
    setDeleteConfirmOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!isAdmin || !sampleTypeToDelete) return;
    try {
      setDeleting(true);
      await deleteSampleType(sampleTypeToDelete._id);
      setSampleTypes((prev) => prev.filter((s) => s._id !== sampleTypeToDelete._id));
      setDeleteConfirmOpen(false);
      addToast('Sample Type Deleted Successfully', 'success');
      setSampleTypeToDelete(null);
    } catch (err) {
      addToast(err.message || 'Failed to delete sample type.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Process search, filters, and sort options
  const processedSampleTypes = useMemo(() => {
    let result = [...sampleTypes];

    if (search.trim()) {
      const clean = search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(clean) ||
          s.sampleCode.toLowerCase().includes(clean) ||
          (s.description && s.description.toLowerCase().includes(clean))
      );
    }

    if (categoryFilter) {
      result = result.filter((s) => s.category === categoryFilter);
    }

    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (minPrice !== '') {
      result = result.filter((s) => s.price >= Number(minPrice));
    }

    if (maxPrice !== '') {
      result = result.filter((s) => s.price <= Number(maxPrice));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'date-desc': return new Date(b.createdDate) - new Date(a.createdDate);
        case 'date-asc': return new Date(a.createdDate) - new Date(b.createdDate);
        default: return 0;
      }
    });

    return result;
  }, [sampleTypes, search, categoryFilter, statusFilter, minPrice, maxPrice, sortBy]);

  // Derived stats
  const stats = useMemo(() => {
    const total = sampleTypes.length;
    const active = sampleTypes.filter((s) => s.status === 'Active').length;
    const inactive = total - active;
    const avgPrice = total
      ? Math.round(sampleTypes.reduce((sum, s) => sum + s.price, 0) / total)
      : 0;

    return { total, active, inactive, avgPrice };
  }, [sampleTypes]);

  // Default decorative sample cards list
  const defaultSampleTypesList = useMemo(() => {
    const defaults = ['Serum', 'Whole Blood', 'Urine', 'Stool', 'Bodily Fluids'];
    return sampleTypes.filter((s) => defaults.includes(s.name));
  }, [sampleTypes]);

  // Export to CSV
  const handleExportCSV = () => {
    if (processedSampleTypes.length === 0) return;
    const headers = ['Sample Name', 'Sample Code', 'Category', 'Price', 'Status', 'Created Date', 'Last Updated'];
    const csvContent = [
      headers.join(','),
      ...processedSampleTypes.map((s) =>
        [
          `"${s.name.replace(/"/g, '""')}"`,
          `"${s.sampleCode}"`,
          `"${s.category}"`,
          s.price,
          `"${s.status}"`,
          `"${formatDate(s.createdDate)}"`,
          `"${formatDate(s.updatedDate)}"`
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sample_types_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSV Exported Successfully', 'success');
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <section className="page sample-types-management">
      
      {/* ═══ TOP HEADER ═══ */}
      <header className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <p className="eyebrow">Laboratory Configurations</p>
          <h1>Sample Types Management</h1>
          <p className="intro">Manage laboratory sample types and pricing.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {isAdmin && (
            <button className="primary-button" onClick={openAddModal}>
              ＋ Add Sample Type
            </button>
          )}
          <button className="secondary-button" onClick={loadSampleTypes} title="Refresh list">
            🔄 Refresh
          </button>
          <button className="secondary-button" onClick={handleExportPDF}>
            📄 Export PDF
          </button>
          <button className="secondary-button" onClick={handleExportCSV}>
            📥 Export CSV
          </button>
        </div>
      </header>

      {/* ═══ TOAST NOTIFICATIONS ═══ */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-message ${toast.type}`}>
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* ═══ STATISTIC CARDS ═══ */}
      <div className="sample-types-stats">
        <article className="stat-card blue">
          <small>Total Sample Types</small>
          <strong>{stats.total}</strong>
          <span className="card-icon">🔬</span>
        </article>
        <article className="stat-card green">
          <small>Active Sample Types</small>
          <strong>{stats.active}</strong>
          <span className="card-icon">✅</span>
        </article>
        <article className="stat-card yellow">
          <small>Inactive Sample Types</small>
          <strong>{stats.inactive}</strong>
          <span className="card-icon">🚫</span>
        </article>
        <article className="stat-card teal">
          <small>Average Sample Price</small>
          <strong>{stats.avgPrice.toLocaleString()} ETB</strong>
          <span className="card-icon">💵</span>
        </article>
      </div>

      {/* ═══ DEFAULT DECORATIVE SAMPLE CARDS ═══ */}
      {defaultSampleTypesList.length > 0 && (
        <section className="default-types-section">
          <h2>Default Core Sample Types</h2>
          <div className="default-cards-grid">
            {defaultSampleTypesList.map((st) => (
              <div key={st._id} className="default-type-card">
                <div className="card-emoji">{getCategoryIcon(st.category)}</div>
                <h4>{st.name}</h4>
                <div className="card-price">{st.price.toLocaleString()} ETB</div>
                <div className={`card-status ${st.status.toLowerCase()}`}>
                  {st.status}
                </div>
                {isAdmin && (
                  <button className="edit-overlay-btn" onClick={() => openEditModal(st)}>
                    ✏️ Edit
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ SEARCH & FILTER SECTION ═══ */}
      <div className="search-filters-panel" style={{ marginTop: 'var(--space-6)' }}>
        <div className="search-filters-grid">
          <div className="filter-group">
            <label>Search by Name / Code</label>
            <input
              type="text"
              placeholder="Search sample name, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              <option value="Blood">Blood</option>
              <option value="Urine">Urine</option>
              <option value="Stool">Stool</option>
              <option value="Body Fluid">Body Fluid</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Price Range (ETB)</label>
            <div className="price-range-inputs">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--color-on-surface-variant)' }}>SORT BY</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '0.35rem 0.6rem', fontSize: 'var(--text-xs)' }}>
              <option value="name-asc">Name: A-Z</option>
              <option value="name-desc">Name: Z-A</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
            </select>
          </div>
          {(search || categoryFilter || statusFilter || minPrice || maxPrice) && (
            <button
              className="text-button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
                setStatusFilter('');
                setMinPrice('');
                setMaxPrice('');
              }}
              style={{ color: 'var(--color-error)', fontWeight: '600', cursor: 'pointer', background: 'none', border: 'none' }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* ═══ TABLE ═══ */}
      {loading ? (
        <div className="sample-types-empty" style={{ background: '#fff', border: '1px solid var(--color-outline-variant)' }}>
          <div className="empty-icon">⏳</div>
          <h3>Loading sample types list...</h3>
          <p>Connecting to database services.</p>
        </div>
      ) : processedSampleTypes.length === 0 ? (
        <div className="sample-types-empty">
          <div className="empty-icon">🔍</div>
          <h3>No sample types found</h3>
          <p>No sample types match your filters. Try clearing filters or add a new one.</p>
        </div>
      ) : (
        <div className="sample-types-table-wrapper">
          <table className="sample-types-table">
            <thead>
              <tr>
                <th>Icon</th>
                <th>Sample Name</th>
                <th>Sample Code</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedSampleTypes.map((st) => (
                <tr key={st._id}>
                  <td className="icon-cell">{getCategoryIcon(st.category)}</td>
                  <td>
                    <strong>{st.name}</strong>
                  </td>
                  <td>
                    <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{st.sampleCode}</code>
                  </td>
                  <td>{st.category}</td>
                  <td>
                    <strong>{st.price.toLocaleString()} ETB</strong>
                  </td>
                  <td>
                    <span className={`status-badge ${st.status.toLowerCase()}`}>
                      <span className="status-dot" />
                      {st.status}
                    </span>
                  </td>
                  <td>{formatDate(st.createdDate)}</td>
                  <td>{formatDate(st.updatedDate)}</td>
                  <td>
                    <button className="table-action-icon-btn" onClick={() => openViewModal(st)} title="View Details">
                      👁️
                    </button>
                    {isAdmin && (
                      <>
                        <button className="table-action-icon-btn" onClick={() => openEditModal(st)} title="Edit">
                          ✏️
                        </button>
                        <button
                          className="table-action-icon-btn"
                          onClick={() => handleToggleStatus(st)}
                          title={st.status === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {st.status === 'Active' ? '🚫' : '⚡'}
                        </button>
                        <button className="table-action-icon-btn danger" onClick={() => openDeleteModal(st)} title="Delete">
                          🗑️
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ VIEW DETAILS MODAL ═══ */}
      {viewOpen && selectedSampleType && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px', borderRadius: 'var(--radius-lg)' }}>
            <header className="modal-header">
              <h2>Sample Type Details</h2>
              <button className="close-button" onClick={() => setViewOpen(false)}>&times;</button>
            </header>
            <div className="modal-body" style={{ padding: 'var(--space-4) 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                  <span style={{ fontSize: '3rem' }}>{getCategoryIcon(selectedSampleType.category)}</span>
                  <div>
                    <h3 style={{ margin: 0 }}>{selectedSampleType.name}</h3>
                    <code style={{ fontFamily: 'var(--font-mono)' }}>{selectedSampleType.sampleCode}</code>
                  </div>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.08)' }} />
                <div>
                  <strong>Category:</strong> {selectedSampleType.category}
                </div>
                <div>
                  <strong>Price:</strong> {selectedSampleType.price.toLocaleString()} ETB
                </div>
                <div>
                  <strong>Status:</strong>{' '}
                  <span className={`status-badge ${selectedSampleType.status.toLowerCase()}`}>
                    <span className="status-dot" />
                    {selectedSampleType.status}
                  </span>
                </div>
                <div>
                  <strong>Created By:</strong> {selectedSampleType.createdBy?.fullName || 'System Seed'}
                </div>
                <div>
                  <strong>Created Date:</strong> {formatDate(selectedSampleType.createdDate)}
                </div>
                <div>
                  <strong>Last Updated:</strong> {formatDate(selectedSampleType.updatedDate)}
                </div>
                <div>
                  <strong>Description:</strong>
                  <p style={{ marginTop: '4px', color: 'var(--color-on-surface-variant)', background: 'var(--color-surface-container)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
                    {selectedSampleType.description || 'No description provided.'}
                  </p>
                </div>
              </div>
            </div>
            <footer className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
              <button className="secondary-button" onClick={() => setViewOpen(false)}>Close</button>
            </footer>
          </div>
        </div>
      )}

      {/* ═══ ADD / EDIT MODERN MODAL ═══ */}
      {formOpen && (
        <div className="modal-backdrop">
          <div className="modal-content large" style={{ maxWidth: '560px', borderRadius: 'var(--radius-lg)' }}>
            <header className="modal-header">
              <h2>{selectedSampleType ? '✏️ Edit Sample Type' : '＋ Add Sample Type'}</h2>
              <button className="close-button" onClick={() => setFormOpen(false)} disabled={formSubmitting}>
                &times;
              </button>
            </header>

            <form onSubmit={handleFormSubmit}>
              {formError && (
                <div className="form-error-banner" style={{ background: 'var(--color-error-container)', color: 'var(--color-error)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                  ⚠️ {formError}
                </div>
              )}

              {/* Basic Information section */}
              <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '4px', marginBottom: 'var(--space-3)' }}>
                Basic Information
              </h3>
              
              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label htmlFor="name" style={{ fontWeight: '600', fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>
                  Sample Name <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Whole Blood, Urine, Cerebrospinal Fluid"
                  required
                  disabled={formSubmitting}
                />
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                <div className="form-group">
                  <label htmlFor="category" style={{ fontWeight: '600', fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    disabled={formSubmitting}
                  >
                    <option value="Blood">Blood 🩸</option>
                    <option value="Urine">Urine 🧪</option>
                    <option value="Stool">Stool 💩</option>
                    <option value="Body Fluid">Body Fluid 🧫</option>
                    <option value="Other">Other 🔬</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="status" style={{ fontWeight: '600', fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    disabled={formSubmitting}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Pricing section */}
              <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '4px', marginBottom: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                Pricing
              </h3>
              
              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label htmlFor="price" style={{ fontWeight: '600', fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>
                  Price (ETB) <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. 500"
                  min="0.01"
                  step="0.01"
                  required
                  disabled={formSubmitting}
                />
              </div>

              {/* Description section */}
              <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '4px', marginBottom: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                Description
              </h3>
              
              <div className="form-group">
                <label htmlFor="description" style={{ fontWeight: '600', fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description or handling notes..."
                  rows="3"
                  disabled={formSubmitting}
                />
              </div>

              <footer className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: 'var(--space-5)' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setFormOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={formSubmitting}>
                  {formSubmitting ? '⌛ Saving...' : 'Save Changes'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ═══ DELETE DIALOG MODAL ═══ */}
      {deleteConfirmOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px', borderRadius: 'var(--radius-lg)' }}>
            <header className="modal-header">
              <h2>Confirm Deletion</h2>
              <button className="close-button" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
                &times;
              </button>
            </header>
            <div className="modal-body" style={{ padding: 'var(--space-4) 0' }}>
              <p>
                Are you sure you want to permanently delete the sample type{' '}
                <strong>{sampleTypeToDelete?.name}</strong> (Code: <code>{sampleTypeToDelete?.sampleCode}</code>)?
              </p>
              <p style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 'bold' }}>
                ⚠️ Warning: This action cannot be undone.
              </p>
            </div>
            <footer className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="secondary-button" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{ background: 'var(--color-error)' }}
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </footer>
          </div>
        </div>
      )}

    </section>
  );
}
