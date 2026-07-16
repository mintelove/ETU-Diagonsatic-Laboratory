/**
 * ETU Diagnostic Laboratory — User Profile Form Component
 *
 * Provides a premium modal dialog to create or update staff accounts.
 * Includes drag-and-drop or click-to-upload profile photo with real-time preview,
 * and comprehensive input validation to match the backend schemas.
 */

import { useEffect, useState, useRef } from 'react';
import { createUser, updateUser, uploadUserPhoto, removeUserPhoto } from '../services/userService.js';

const initialFormState = {
  fullName: '',
  username: '',
  password: '',
  phone: '',
  email: '',
  role: 'Reception',
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function UserForm({ user, onSuccess, onCancel, onError, busy: parentBusy }) {
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  
  // Profile photo state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
  
  const fileInputRef = useRef(null);

  const isEditMode = Boolean(user);

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || '',
        username: user.username || '',
        password: '',
        phone: user.phone || '',
        email: user.email || '',
        role: user.role || 'Reception',
      });
      setPhotoPreview(user.profilePhoto ? `${API_BASE}/${user.profilePhoto}` : '');
      setPhotoFile(null);
      setIsPhotoRemoved(false);
    } else {
      setForm(initialFormState);
      setPhotoPreview('');
      setPhotoFile(null);
      setIsPhotoRemoved(false);
    }
    setErrors({});
  }, [user]);

  // Clean up ObjectURL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // Form Validation
  function validate() {
    const newErrors = {};
    if (!form.fullName.trim() || form.fullName.length < 2 || form.fullName.length > 100) {
      newErrors.fullName = 'Full name must be between 2 and 100 characters.';
    }

    if (!form.username.trim() || form.username.length < 3 || form.username.length > 30) {
      newErrors.username = 'Username must be between 3 and 30 characters.';
    } else if (!/^[a-z0-9._-]+$/.test(form.username)) {
      newErrors.username = 'Letters, numbers, dots, hyphens, and underscores only.';
    }

    if (!isEditMode) {
      if (!form.password) {
        newErrors.password = 'Password is required.';
      } else if (form.password.length < 10) {
        newErrors.password = 'Password must be at least 10 characters.';
      } else if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
        newErrors.password = 'Password must contain uppercase, lowercase, and a number.';
      }
    }

    if (!form.phone.trim() || !/^\+?[0-9]{7,15}$/.test(form.phone)) {
      newErrors.phone = 'Provide a valid phone number (7 to 15 digits).';
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Provide a valid email address.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Handle Photo Select
  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      onError('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    // Check size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      onError('Image size must be less than 2 MB.');
      return;
    }

    setPhotoFile(file);
    setIsPhotoRemoved(false);
    
    // Revoke old blob preview if any
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(URL.createObjectURL(file));
  }

  // Handle Remove Photo
  function handleRemovePhoto() {
    setPhotoFile(null);
    setPhotoPreview('');
    setIsPhotoRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setBusy(true);
    try {
      let savedUser;
      
      const payload = {
        fullName: form.fullName.trim(),
        username: form.username.trim().toLowerCase(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        role: form.role,
      };

      if (isEditMode) {
        const { user: updated } = await updateUser(user.id, payload);
        savedUser = updated;
      } else {
        payload.password = form.password;
        const { user: created } = await createUser(payload);
        savedUser = created;
      }

      // Handle photo upload/removal if needed
      if (isPhotoRemoved && isEditMode && user.profilePhoto) {
        await removeUserPhoto(savedUser.id);
      }
      
      if (photoFile) {
        await uploadUserPhoto(savedUser.id, photoFile);
      }

      onSuccess(isEditMode ? 'User details saved successfully.' : 'User created successfully.');
    } catch (e) {
      onError(e.message || 'An error occurred while saving user.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} noValidate>
          {/* Header */}
          <div className="modal-header">
            <h2>{isEditMode ? 'Edit User Profile' : 'Create Staff Account'}</h2>
            <button type="button" className="modal-close" onClick={onCancel}>
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Profile Photo Upload */}
            <div className="photo-upload-section">
              <div className="photo-preview" onClick={() => fileInputRef.current?.click()}>
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" />
                    <div className="photo-overlay">Change</div>
                  </>
                ) : (
                  <span>📷</span>
                )}
              </div>
              <div className="photo-actions">
                <span className="photo-label">Profile Photo</span>
                <span className="photo-hint">Accepted formats: JPG, PNG, WebP. Max size: 2MB.</span>
                <div className="photo-btns">
                  <button
                    type="button"
                    className="photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Photo
                  </button>
                  {photoPreview && (
                    <button
                      type="button"
                      className="photo-btn remove"
                      onClick={handleRemovePhoto}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handlePhotoChange}
                />
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="form-grid-modal">
              {/* Full Name */}
              <div className="form-field full-width">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
                {errors.fullName && <span className="field-error">{errors.fullName}</span>}
              </div>

              {/* Username */}
              <div className="form-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  placeholder="e.g. john.doe"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  disabled={isEditMode}
                />
                {errors.username && <span className="field-error">{errors.username}</span>}
              </div>

              {/* Role */}
              <div className="form-field">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="Admin">Admin</option>
                  <option value="Reception">Reception</option>
                  <option value="Sample Collector">Sample Collector</option>
                  <option value="Approver">Approver</option>
                </select>
              </div>

              {/* Password (Only on Create) */}
              {!isEditMode && (
                <div className="form-field full-width">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="At least 10 characters, upper/lower/number"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  {errors.password ? (
                    <span className="field-error">{errors.password}</span>
                  ) : (
                    <span className="field-hint">Must contain an uppercase letter, lowercase letter, and a number.</span>
                  )}
                </div>
              )}

              {/* Phone */}
              <div className="form-field">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="e.g. +254700000000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                {errors.phone && <span className="field-error">{errors.phone}</span>}
              </div>

              {/* Email */}
              <div className="form-field">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              disabled={busy || parentBusy}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={busy || parentBusy}
            >
              {busy ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
