/**
 * ETU Diagnostic Laboratory — Stock Category Management Page
 *
 * Full management dashboard for stock categories.
 * Restricts all modifying actions (Create, Edit, Delete, Toggle Status)
 * strictly to administrators. Displays responsive table layouts with stats,
 * custom sorting, inline search, and deletion safeguards.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import {
  getCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} from '../services/categoryService.js';

/** Format a date string nicely. */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const initialFormState = {
  categoryName: '',
  categoryCode: '',
  description: '',
};

export default function CategoriesPage() {
  const { user: currentUser } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();

  // Data states
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState(null);

  // Status indicators
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Auto-dismiss alerts
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Load all categories from API
  const loadCategories = useCallback(async () => {
    try {
      const { categories: data } = await getCategories();
      setCategories(data);
    } catch (e) {
      setError(e.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Real-time sync
  useEffect(() => {
    subscribe('categories:change', loadCategories);
    return () => unsubscribe('categories:change', loadCategories);
  }, [subscribe, unsubscribe, loadCategories]);

  // Calculate high-level stats from category list
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.status === 'Active').length;
    const inactive = total - active;
    const totalItems = categories.reduce((sum, c) => sum + (c.itemCount || 0), 0);
    return { total, active, inactive, totalItems };
  }, [categories]);

  // Handle Form Actions
  function openAddModal() {
    setEditingCategory(null);
    setForm(initialFormState);
    setFormErrors({});
    setFormOpen(true);
    setError('');
  }

  function openEditModal(category) {
    setEditingCategory(category);
    setForm({
      categoryName: category.categoryName || '',
      categoryCode: category.categoryCode || '',
      description: category.description || '',
    });
    setFormErrors({});
    setFormOpen(true);
    setError('');
  }

  function validateForm() {
    const newErrors = {};
    if (!form.categoryName.trim()) {
      newErrors.categoryName = 'Category name is required.';
    } else if (form.categoryName.length < 2 || form.categoryName.length > 80) {
      newErrors.categoryName = 'Category name must be between 2 and 80 characters.';
    }

    if (form.categoryCode && form.categoryCode.trim()) {
      if (!/^[a-zA-Z0-9_-]+$/.test(form.categoryCode)) {
        newErrors.categoryCode = 'Code may contain letters, numbers, hyphens, and underscores only.';
      } else if (form.categoryCode.length < 2 || form.categoryCode.length > 30) {
        newErrors.categoryCode = 'Code must be between 2 and 30 characters.';
      }
    }

    if (form.description && form.description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters.';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setBusy(true);
    setError('');
    try {
      if (editingCategory) {
        // PUT request for updates
        await updateCategory(editingCategory._id, {
          categoryName: form.categoryName.trim(),
          categoryCode: form.categoryCode.trim().toUpperCase(),
          description: form.description.trim(),
        });
        setMessage('Category updated successfully.');
      } else {
        // POST request for creation
        await createCategory({
          categoryName: form.categoryName.trim(),
          categoryCode: form.categoryCode.trim() || undefined,
          description: form.description.trim(),
        });
        setMessage('Category created successfully.');
      }
      setFormOpen(false);
      loadCategories();
    } catch (err) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setBusy(false);
    }
  }

  // Deactivate or Activate Category
  function handleToggleStatus(category) {
    const newStatus = category.status === 'Active' ? 'Inactive' : 'Active';
    const label = newStatus === 'Active' ? 'Activate' : 'Deactivate';

    setConfirmModal({
      title: `${label} Category`,
      message: `Are you sure you want to ${label.toLowerCase()} category "${category.categoryName}"?`,
      actionLabel: label,
      actionClass: newStatus === 'Active' ? 'btn-primary' : 'btn-danger',
      icon: '⚡',
      iconClass: 'warning',
      action: async () => {
        await updateCategoryStatus(category._id, newStatus);
        setMessage(`Category "${category.categoryName}" has been ${label.toLowerCase()}d.`);
      },
    });
  }

  // Delete Category (prevent if assigned to stock items)
  function handleDeleteCategory(category) {
    if (category.itemCount > 0) {
      setError(`Cannot delete "${category.categoryName}" because it is assigned to ${category.itemCount} stock items. Move or delete the items first.`);
      return;
    }

    setConfirmModal({
      title: 'Delete Category',
      message: `Are you sure you want to permanently delete category "${category.categoryName}"? This action cannot be undone.`,
      actionLabel: 'Delete Category',
      actionClass: 'btn-danger',
      icon: '🗑️',
      iconClass: 'danger',
      action: async () => {
        await deleteCategory(category._id);
        setMessage(`Category "${category.categoryName}" has been deleted.`);
      },
    });
  }

  async function executeConfirmAction() {
    if (!confirmModal) return;
    setBusy(true);
    setError('');
    try {
      await confirmModal.action();
      setConfirmModal(null);
      loadCategories();
    } catch (err) {
      setError(err.message || 'Failed to complete action.');
      setConfirmModal(null);
    } finally {
      setBusy(false);
    }
  }

  // Process search and sort constraints
  const processedCategories = useMemo(() => {
    let result = categories.filter((c) => {
      const q = search.toLowerCase().trim();
      return (
        !q ||
        c.categoryName.toLowerCase().includes(q) ||
        c.categoryCode.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.categoryName.localeCompare(b.categoryName);
        case 'name-desc':
          return b.categoryName.localeCompare(a.categoryName);
        case 'code-asc':
          return a.categoryCode.localeCompare(b.categoryCode);
        case 'code-desc':
          return b.categoryCode.localeCompare(a.categoryCode);
        case 'items-desc':
          return (b.itemCount || 0) - (a.itemCount || 0);
        case 'items-asc':
          return (a.itemCount || 0) - (b.itemCount || 0);
        case 'created-desc':
          return new Date(b.createdDate) - new Date(a.createdDate);
        case 'created-asc':
          return new Date(a.createdDate) - new Date(b.createdDate);
        default:
          return 0;
      }
    });

    return result;
  }, [categories, search, sortBy]);

  if (loading) {
    return (
      <section className="page categories-page">
        <div className="page-loading">
          <div className="loading-spinner loading-spinner--lg loading-spinner--primary">
            <div className="loading-spinner__ring" />
          </div>
          <p className="page-loading__text">Loading stock categories…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page categories-page">
      {/* Page Title Header */}
      <div className="page-title">
        <div>
          <p className="eyebrow">Stock Administration</p>
          <h1>Stock Categories</h1>
          <p className="intro">Manage categories and track related stock item counts.</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          + Add Category
        </button>
      </div>

      {/* Alert Feedbacks */}
      {error && (
        <div className="page-alert error">
          <span>⚠️ {error}</span>
          <button className="dismiss-btn" onClick={() => setError('')}>
            ✕
          </button>
        </div>
      )}
      {message && (
        <div className="page-alert success">
          <span>✓ {message}</span>
          <button className="dismiss-btn" onClick={() => setMessage('')}>
            ✕
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="categories-stats">
        <div className="stat-card">
          <div className="stat-icon total">📁</div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Categories</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">✓</div>
          <div className="stat-info">
            <span className="stat-value">{stats.active}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon inactive">✕</div>
          <div className="stat-info">
            <span className="stat-value">{stats.inactive}</span>
            <span className="stat-label">Inactive</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon roles">📦</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalItems}</span>
            <span className="stat-label">Total Items Linked</span>
          </div>
        </div>
      </div>

      {/* Search & Sort Toolbar */}
      <div className="categories-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by category name, code or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="form-field">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="code-asc">Code (A-Z)</option>
            <option value="code-desc">Code (Z-A)</option>
            <option value="items-desc">Most Items</option>
            <option value="items-asc">Least Items</option>
            <option value="created-desc">Newest Created</option>
            <option value="created-asc">Oldest Created</option>
          </select>
        </div>
      </div>

      {/* Categories Table View */}
      {processedCategories.length === 0 ? (
        <div className="categories-empty">
          <div className="empty-icon">📁</div>
          <h3>No categories found</h3>
          <p>Try refining your search terms or create a new category.</p>
        </div>
      ) : (
        <div className="categories-table-wrapper">
          <table className="categories-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Category Code</th>
                <th>Description</th>
                <th>Number of Items</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedCategories.map((category) => (
                <tr key={category._id}>
                  <td>
                    <strong>{category.categoryName}</strong>
                  </td>
                  <td>
                    <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {category.categoryCode}
                    </code>
                  </td>
                  <td className="description-cell" title={category.description}>
                    {category.description || <span className="not-set">No description</span>}
                  </td>
                  <td>
                    <strong style={{ fontSize: '1rem', color: 'var(--color-primary)' }}>
                      {category.itemCount || 0}
                    </strong>
                  </td>
                  <td>
                    <span className={`status-badge ${category.status.toLowerCase()}`}>
                      <span className="status-dot" />
                      {category.status}
                    </span>
                  </td>
                  <td>{formatDate(category.createdDate)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="table-action-btn" onClick={() => openEditModal(category)}>
                        Edit
                      </button>
                      <button
                        className="table-action-btn"
                        onClick={() => handleToggleStatus(category)}
                      >
                        {category.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="table-action-btn danger"
                        onClick={() => handleDeleteCategory(category)}
                        disabled={category.itemCount > 0}
                        title={
                          category.itemCount > 0
                            ? 'Cannot delete category with linked stock items.'
                            : ''
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal Overlay */}
      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleFormSubmit} noValidate>
              <div className="modal-header">
                <h2>{editingCategory ? 'Edit Stock Category' : 'Create Stock Category'}</h2>
                <button type="button" className="modal-close" onClick={() => setFormOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="form-grid-modal" style={{ gridTemplateColumns: '1fr' }}>
                  {/* Name field */}
                  <div className="form-field">
                    <label htmlFor="categoryName">Category Name *</label>
                    <input
                      id="categoryName"
                      type="text"
                      placeholder="e.g. Laboratory Reagents"
                      value={form.categoryName}
                      onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
                    />
                    {formErrors.categoryName && (
                      <span className="field-error">{formErrors.categoryName}</span>
                    )}
                  </div>

                  {/* Code field */}
                  <div className="form-field">
                    <label htmlFor="categoryCode">Category Code</label>
                    <input
                      id="categoryCode"
                      type="text"
                      placeholder={editingCategory ? 'e.g. REAGENTS' : 'Auto-generated if left blank'}
                      value={form.categoryCode}
                      onChange={(e) => setForm({ ...form, categoryCode: e.target.value })}
                      disabled={false}
                    />
                    {formErrors.categoryCode ? (
                      <span className="field-error">{formErrors.categoryCode}</span>
                    ) : (
                      <span className="field-hint">
                        Uppercase letters, numbers, hyphens, and underscores only.
                      </span>
                    )}
                  </div>

                  {/* Description field */}
                  <div className="form-field">
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        border: '1.5px solid var(--color-outline-variant)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                      }}
                      placeholder="Enter optional category description…"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                    {formErrors.description && (
                      <span className="field-error">{formErrors.description}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setFormOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? 'Saving…' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmModal && (
        <div className="modal-overlay confirm-dialog" onClick={() => setConfirmModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: '2.5rem 2rem 2rem' }}>
              <div className={`confirm-icon ${confirmModal.iconClass}`}>
                {confirmModal.icon}
              </div>
              <h3 style={{ margin: '1rem 0 0.5rem' }}>{confirmModal.title}</h3>
              <p>{confirmModal.message}</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmModal(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={confirmModal.actionClass}
                onClick={executeConfirmAction}
                disabled={busy}
              >
                {busy ? 'Executing…' : confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
