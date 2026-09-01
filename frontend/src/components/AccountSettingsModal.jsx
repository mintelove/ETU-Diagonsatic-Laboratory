import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, isSilentNetworkError } from '../api/client.js';
import { ModalPortal } from './ModalPortal.jsx';

export default function AccountSettingsModal({ isOpen, onClose }) {
  const { user, token, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState('username'); // 'username' | 'password'

  // Username form state
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Feedback states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Visibility toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  if (!isOpen || !user) return null;

  const clearFeedback = () => {
    setError('');
    setSuccess('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    clearFeedback();
  };

  const handleChangeUsername = async (e) => {
    e.preventDefault();
    clearFeedback();

    const trimmedUsername = newUsername.trim().toLowerCase();
    if (!trimmedUsername) {
      setError('Please enter a new username.');
      return;
    }
    if (trimmedUsername === user.username?.toLowerCase()) {
      setError('New username must be different from your current username.');
      return;
    }
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      setError('Username must be between 3 and 50 characters.');
      return;
    }
    if (!/^[a-z0-9._\s-]+$/.test(trimmedUsername)) {
      setError('Username may contain lowercase letters, numbers, spaces, dots, hyphens, and underscores only.');
      return;
    }
    if (!usernamePassword) {
      setError('Please enter your current password for security verification.');
      return;
    }

    setUsernameLoading(true);
    try {
      const res = await api('/auth/change-username', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          newUsername: trimmedUsername,
          currentPassword: usernamePassword
        })
      });

      if (res?.user) {
        updateUser(res.user, res.token || token);
        setSuccess(`Username successfully updated to "${res.user.username}".`);
        setNewUsername('');
        setUsernamePassword('');
      } else {
        setSuccess('Username updated successfully.');
      }
    } catch (err) {
      if (!isSilentNetworkError(err)) {
        setError(err.message || 'Failed to update username.');
      }
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 10) {
      setError('New password must be at least 10 characters long.');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('New password must contain at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api('/auth/change-password', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      if (res?.user) {
        updateUser(res.user, res.token || token);
      }
      setSuccess('Password successfully changed. Your active session is up to date.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (!isSilentNetworkError(err)) {
        setError(err.message || 'Failed to update password.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <style>{`
        .account-settings-modal-wrap {
          max-width: 520px;
          width: 100%;
          padding: 0;
          background: var(--modal-bg, var(--card-bg, #111A2C));
          color: var(--text-primary, #F8FAFC);
          border: 1.5px solid var(--card-border, #24344D);
          border-radius: 16px;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
          overflow: hidden;
          font-family: inherit;
        }
        .account-settings-header {
          padding: 18px 24px;
          border-bottom: 1.5px solid var(--card-border, #24344D);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--color-surface-dim, #0D1626);
        }
        .account-settings-title {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-primary, #38BDF8);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .account-settings-sub {
          color: var(--text-secondary, #CBD5E1);
          font-size: 0.8rem;
          margin-top: 2px;
          display: block;
        }
        .account-settings-close {
          background: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-muted, #94A3B8);
          line-height: 1;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.15s ease;
        }
        .account-settings-close:hover {
          color: var(--text-primary, #F8FAFC);
        }
        .account-settings-tabs {
          display: flex;
          border-bottom: 1.5px solid var(--card-border, #24344D);
          background: var(--color-surface-dim, #0D1626);
        }
        .account-settings-tab-btn {
          flex: 1;
          padding: 12px 16px;
          border: none;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
        }
        .account-settings-tab-btn.active {
          background: var(--modal-bg, var(--card-bg, #111A2C));
          color: var(--color-primary, #38BDF8);
          border-bottom: 2.5px solid var(--color-primary, #38BDF8);
          font-weight: 700;
        }
        .account-settings-tab-btn:not(.active) {
          background: transparent;
          color: var(--text-muted, #94A3B8);
          border-bottom: 2.5px solid transparent;
        }
        .account-settings-tab-btn:not(.active):hover {
          color: var(--text-primary, #F8FAFC);
          background: rgba(255, 255, 255, 0.03);
        }
        .account-settings-body {
          padding: 22px 24px;
          background: var(--modal-bg, var(--card-bg, #111A2C));
        }
        .account-settings-label {
          display: block;
          font-size: 0.84rem;
          font-weight: 600;
          margin-bottom: 6px;
          color: var(--text-secondary, #CBD5E1);
        }
        .account-settings-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1.5px solid var(--input-border, #2D3E5B);
          background: var(--input-bg, #0D1626);
          color: var(--input-color, #FFFFFF);
          font-size: 0.92rem;
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .account-settings-input::placeholder {
          color: var(--input-placeholder, #94A3B8);
          opacity: 0.8;
        }
        .account-settings-input:focus {
          outline: none;
          border-color: var(--color-primary, #38BDF8);
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25);
        }
        .account-settings-input.disabled {
          background: var(--color-surface-dim, #0D1626);
          color: var(--text-muted, #94A3B8);
          border: 1.5px dashed var(--input-border, #2D3E5B);
          font-weight: 600;
          cursor: not-allowed;
        }
        .account-settings-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 15px;
          color: var(--text-muted, #94A3B8);
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .account-settings-eye-btn:hover {
          color: var(--text-primary, #F8FAFC);
        }
        .account-settings-hint {
          display: block;
          margin-top: 5px;
          font-size: 0.75rem;
          color: var(--text-muted, #94A3B8);
        }
        .account-settings-alert-error {
          margin-bottom: 18px;
          padding: 10px 14px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.16);
          color: #FCA5A5;
          border: 1px solid rgba(239, 68, 68, 0.35);
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .account-settings-alert-success {
          margin-bottom: 18px;
          padding: 10px 14px;
          border-radius: 8px;
          background: rgba(34, 197, 94, 0.16);
          color: #86EFAC;
          border: 1px solid rgba(34, 197, 94, 0.35);
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .account-settings-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 14px;
        }
        .account-settings-btn-cancel {
          padding: 9px 18px;
          border-radius: 8px;
          border: 1.5px solid var(--card-border, #2D3E5B);
          background: var(--color-surface-dim, #131E32);
          color: var(--text-primary, #F8FAFC);
          font-weight: 600;
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .account-settings-btn-cancel:hover {
          background: var(--color-surface-container-high, #1E2D48);
          border-color: var(--color-primary, #38BDF8);
        }
        .account-settings-btn-submit {
          padding: 9px 22px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: var(--button-primary-bg, #0284C7);
          color: #FFFFFF;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3);
        }
        .account-settings-btn-submit:hover:not(:disabled) {
          background: var(--color-primary-hover, #38BDF8);
        }
        .account-settings-btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <div
        className="account-settings-modal-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="account-settings-header">
          <div>
            <h2 className="account-settings-title">
              <span>⚙️</span> Account Settings
            </h2>
            <span className="account-settings-sub">
              Manage your credentials ({user.fullName} • 📍 {user.branchName === 'All' ? 'Otona + Main Branches' : `${user.branchName || 'Main'} Branch`})
            </span>
          </div>
          <button
            type="button"
            className="account-settings-close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="account-settings-tabs">
          <button
            type="button"
            onClick={() => handleTabChange('username')}
            className={`account-settings-tab-btn ${activeTab === 'username' ? 'active' : ''}`}
          >
            <span>👤</span> Change Username
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('password')}
            className={`account-settings-tab-btn ${activeTab === 'password' ? 'active' : ''}`}
          >
            <span>🔒</span> Change Password
          </button>
        </div>

        {/* Content Body */}
        <div className="account-settings-body">
          {error && (
            <div className="account-settings-alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="account-settings-alert-success">
              <span>✅</span>
              <span>{success}</span>
            </div>
          )}

          {/* TAB 1: CHANGE USERNAME */}
          {activeTab === 'username' && (
            <form onSubmit={handleChangeUsername}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="account-settings-label">
                    Current Username
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.username}
                    className="account-settings-input disabled"
                  />
                </div>

                <div>
                  <label className="account-settings-label">
                    New Username <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. temesgen_fanta"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                    className="account-settings-input"
                  />
                  <span className="account-settings-hint">
                    Lowercase letters, numbers, spaces, dots, hyphens, and underscores only (3–50 characters).
                  </span>
                </div>

                <div>
                  <label className="account-settings-label">
                    Current Password (Verification) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      placeholder="Enter your current password"
                      value={usernamePassword}
                      onChange={(e) => setUsernamePassword(e.target.value)}
                      className="account-settings-input"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="account-settings-eye-btn"
                      title={showCurrentPass ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="account-settings-actions">
                  <button
                    type="button"
                    className="account-settings-btn-cancel"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={usernameLoading}
                    className="account-settings-btn-submit"
                  >
                    {usernameLoading ? 'Saving...' : 'Update Username'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="account-settings-label">
                    Current Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="account-settings-input"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="account-settings-eye-btn"
                      title={showCurrentPass ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="account-settings-label">
                    New Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      placeholder="At least 10 chars (uppercase, lowercase, number)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="account-settings-input"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="account-settings-eye-btn"
                      title={showNewPass ? 'Hide password' : 'Show password'}
                    >
                      {showNewPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <span className="account-settings-hint">
                    Must be at least 10 characters with an uppercase letter, a lowercase letter, and a number.
                  </span>
                </div>

                <div>
                  <label className="account-settings-label">
                    Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="account-settings-input"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="account-settings-eye-btn"
                      title={showConfirmPass ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="account-settings-actions">
                  <button
                    type="button"
                    className="account-settings-btn-cancel"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="account-settings-btn-submit"
                  >
                    {passwordLoading ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
