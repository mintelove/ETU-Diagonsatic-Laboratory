/**
 * ETU Diagnostic Laboratory — User Management Page
 *
 * Complete user management dashboard for administrators.
 * Features: stats overview, search & filter, card/table views,
 * modal forms, profile photos, status toggling, and password resets.
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import UserForm from '../components/UserForm.jsx';
import {
  getUsers,
  updateUserStatus,
  resetUserPassword,
  deleteUser as deleteUserApi,
} from '../services/userService.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/** Get initials from a full name. */
function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Map role string to CSS class suffix. */
function roleClass(role) {
  switch (role) {
    case 'Admin':
      return 'admin';
    case 'Reception':
      return 'reception';
    case 'Sample Collector':
      return 'collector';
    case 'Approver':
      return 'approver';
    default:
      return '';
  }
}

/** Format a date string nicely. */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Format last login relative time. */
function formatLastLogin(dateStr) {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();

  // Data state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('cards');

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordModal, setPasswordModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // Feedback
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Password reset
  const [newPassword, setNewPassword] = useState('');
  const passwordInputRef = useRef(null);

  // Auto-dismiss messages
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

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      const { users: data } = await getUsers();
      setUsers(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Real-time sync
  useEffect(() => {
    subscribe('users:change', loadUsers);
    return () => unsubscribe('users:change', loadUsers);
  }, [subscribe, unsubscribe, loadUsers]);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'Active').length;
    const inactive = total - active;
    const roles = new Set(users.map((u) => u.role)).size;
    return { total, active, inactive, roles };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.fullName.toLowerCase().includes(search.toLowerCase()) ||
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.phone.includes(search) ||
        (user.email && user.email.toLowerCase().includes(search.toLowerCase()));

      const matchesRole = roleFilter === 'All' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Actions
  function openCreateForm() {
    setEditingUser(null);
    setFormOpen(true);
    setError('');
  }

  function openEditForm(user) {
    setEditingUser(user);
    setFormOpen(true);
    setError('');
  }

  function closeForm() {
    setFormOpen(false);
    setEditingUser(null);
  }

  function handleFormSuccess(msg) {
    closeForm();
    setMessage(msg);
    loadUsers();
  }

  function openPasswordModal(user) {
    setPasswordModal(user);
    setNewPassword('');
  }

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await resetUserPassword(passwordModal.id, newPassword);
      setMessage(`Password for ${passwordModal.fullName} has been reset.`);
      setPasswordModal(null);
      setNewPassword('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function openConfirm(config) {
    setConfirmModal(config);
  }

  async function handleConfirmAction() {
    if (!confirmModal) return;
    setBusy(true);
    setError('');
    try {
      await confirmModal.action();
      setMessage(confirmModal.successMessage);
      setConfirmModal(null);
      loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function handleToggleStatus(user) {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const actionWord = newStatus === 'Active' ? 'Activate' : 'Deactivate';
    openConfirm({
      title: `${actionWord} User`,
      message: `Are you sure you want to ${actionWord.toLowerCase()} ${user.fullName}?`,
      icon: '⚡',
      iconClass: 'warning',
      actionLabel: actionWord,
      actionClass: newStatus === 'Active' ? 'btn-primary' : 'btn-danger',
      successMessage: `${user.fullName} has been ${actionWord.toLowerCase()}d.`,
      action: () => updateUserStatus(user.id, newStatus),
    });
  }

  function handleDeleteUser(user) {
    openConfirm({
      title: 'Delete User',
      message: `Permanently delete ${user.fullName}? This action cannot be undone.`,
      icon: '🗑️',
      iconClass: 'danger',
      actionLabel: 'Delete permanently',
      actionClass: 'btn-danger',
      successMessage: `${user.fullName} has been deleted.`,
      action: () => deleteUserApi(user.id),
    });
  }

  // Avatar component
  function Avatar({ user, size = 'normal' }) {
    const photoUrl = user.profilePhoto
      ? `${API_BASE}/${user.profilePhoto}`
      : null;

    return (
      <div className={`user-avatar ${size === 'small' ? 'small' : ''}`}>
        {photoUrl ? (
          <img src={photoUrl} alt={user.fullName} />
        ) : (
          getInitials(user.fullName)
        )}
      </div>
    );
  }

  // Render user card (grid view)
  function renderCard(user) {
    const delay = filteredUsers.indexOf(user) * 40;
    return (
      <div
        key={user.id}
        className="user-card-item"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="user-card-header">
          <Avatar user={user} />
          <div className="user-card-name">
            <h3>{user.fullName}</h3>
            <span className="username-text">@{user.username}</span>
          </div>
          <span className={`role-badge ${roleClass(user.role)}`}>{user.role}</span>
        </div>

        <div className="user-card-details">
          <div className="detail-item">
            <span className="detail-label">Phone</span>
            <span className="detail-value">{user.phone}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Email</span>
            <span className="detail-value">
              {user.email || <span className="not-set">Not set</span>}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className={`status-badge ${user.status.toLowerCase()}`}>
              <span className="status-dot" />
              {user.status}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Login</span>
            <span className="detail-value">{formatLastLogin(user.lastLogin)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Created</span>
            <span className="detail-value">{formatDate(user.createdDate)}</span>
          </div>
        </div>

        <div className="user-card-actions">
          <button className="card-action-btn" onClick={() => openEditForm(user)}>
            ✏️ Edit
          </button>
          <button className="card-action-btn" onClick={() => handleToggleStatus(user)}>
            {user.status === 'Active' ? '🔒 Deactivate' : '🔓 Activate'}
          </button>
          <button
            className="card-action-btn"
            onClick={() => openPasswordModal(user)}
          >
            🔑 Reset Password
          </button>
          {user.id !== currentUser.id && (
            <button
              className="card-action-btn danger"
              onClick={() => handleDeleteUser(user)}
            >
              🗑️ Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render table view
  function renderTable() {
    return (
      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-cell">
                    <Avatar user={user} size="small" />
                    <div className="user-cell-info">
                      <strong>{user.fullName}</strong>
                      <span>@{user.username}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-badge ${roleClass(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.phone}</td>
                <td>{user.email || <span className="not-set">—</span>}</td>
                <td>
                  <span className={`status-badge ${user.status.toLowerCase()}`}>
                    <span className="status-dot" />
                    {user.status}
                  </span>
                </td>
                <td>{formatLastLogin(user.lastLogin)}</td>
                <td>{formatDate(user.createdDate)}</td>
                <td>
                  <div className="table-actions">
                    <button
                      className="table-action-btn"
                      onClick={() => openEditForm(user)}
                    >
                      Edit
                    </button>
                    <button
                      className="table-action-btn"
                      onClick={() => handleToggleStatus(user)}
                    >
                      {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="table-action-btn"
                      onClick={() => openPasswordModal(user)}
                    >
                      Reset
                    </button>
                    {user.id !== currentUser.id && (
                      <button
                        className="table-action-btn danger"
                        onClick={() => handleDeleteUser(user)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredUsers.length && (
          <p className="empty" style={{ padding: '2rem', textAlign: 'center' }}>
            No users match your filters.
          </p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <section className="page users-page">
        <div className="page-loading">
          <div className="loading-spinner loading-spinner--lg loading-spinner--primary">
            <div className="loading-spinner__ring" />
          </div>
          <p className="page-loading__text">Loading users…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page users-page">
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="page-title">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>User Management</h1>
          <p className="intro">Create and manage secure staff accounts.</p>
        </div>
        <button className="btn-primary" onClick={openCreateForm}>
          + Add New User
        </button>
      </div>

      {/* ── Alerts ───────────────────────────────────────── */}
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

      {/* ── Stats Cards ──────────────────────────────────── */}
      <div className="users-stats">
        <div className="stat-card">
          <div className="stat-icon total">👥</div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Users</span>
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
          <div className="stat-icon roles">🛡️</div>
          <div className="stat-info">
            <span className="stat-value">{stats.roles}</span>
            <span className="stat-label">Active Roles</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="users-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, username, phone or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {['All', 'Admin', 'Reception', 'Sample Collector', 'Approver'].map(
            (role) => (
              <button
                key={role}
                className={`filter-chip ${roleFilter === role ? 'active' : ''}`}
                onClick={() => setRoleFilter(role)}
              >
                {role}
              </button>
            )
          )}
        </div>

        <div className="filter-group">
          {['All', 'Active', 'Inactive'].map((status) => (
            <button
              key={status}
              className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="view-toggle">
          <button
            className={viewMode === 'cards' ? 'active' : ''}
            onClick={() => setViewMode('cards')}
            title="Card view"
          >
            ▦
          </button>
          <button
            className={viewMode === 'table' ? 'active' : ''}
            onClick={() => setViewMode('table')}
            title="Table view"
          >
            ☰
          </button>
        </div>
      </div>

      {/* ── User List ────────────────────────────────────── */}
      {filteredUsers.length === 0 && users.length === 0 ? (
        <div className="users-empty">
          <div className="empty-icon">👤</div>
          <h3>No users yet</h3>
          <p>Get started by adding your first staff member.</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="users-grid">
          {filteredUsers.map((user) => renderCard(user))}
        </div>
      ) : (
        renderTable()
      )}

      {filteredUsers.length === 0 && users.length > 0 && (
        <div className="users-empty">
          <div className="empty-icon">🔍</div>
          <h3>No matches found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      )}

      {/* ── User Create/Edit Modal ───────────────────────── */}
      {formOpen && (
        <UserForm
          user={editingUser}
          busy={busy}
          onSuccess={handleFormSuccess}
          onCancel={closeForm}
          onError={(msg) => setError(msg)}
        />
      )}

      {/* ── Password Reset Modal ─────────────────────────── */}
      {passwordModal && (
        <div className="modal-overlay password-modal" onClick={() => setPasswordModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button className="modal-close" onClick={() => setPasswordModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--color-on-surface-variant)', fontSize: 'var(--text-sm)' }}>
                Set a new password for <strong>{passwordModal.fullName}</strong>
              </p>
              <div className="form-field">
                <label>New Password</label>
                <input
                  ref={passwordInputRef}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength="10"
                  autoFocus
                />
              </div>
              <div className="password-requirements">
                <p>Password must contain:</p>
                <ul>
                  <li className={newPassword.length >= 10 ? 'met' : ''}>
                    At least 10 characters
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'met' : ''}>
                    One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? 'met' : ''}>
                    One lowercase letter
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'met' : ''}>
                    One number
                  </li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setPasswordModal(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={busy || newPassword.length < 10}
                onClick={handleResetPassword}
              >
                {busy ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Action Modal ─────────────────────────── */}
      {confirmModal && (
        <div className="modal-overlay confirm-dialog" onClick={() => setConfirmModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: '2rem' }}>
              <div className={`confirm-icon ${confirmModal.iconClass}`}>
                {confirmModal.icon}
              </div>
              <h3>{confirmModal.title}</h3>
              <p>{confirmModal.message}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button
                className={confirmModal.actionClass}
                disabled={busy}
                onClick={handleConfirmAction}
              >
                {busy ? 'Processing…' : confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
