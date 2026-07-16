/**
 * ETU Diagnostic Laboratory — User Management Controller
 *
 * Handles CRUD operations for staff accounts, profile photo management,
 * and password resets. All endpoints are Admin-only.
 */

import fs from 'node:fs';
import path from 'node:path';
import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { recordActivity } from '../services/activityService.js';
import { emit } from '../services/sseService.js';

/**
 * GET /api/users — List all users, sorted newest first.
 */
export async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdDate: -1 });
    res.json({ users: users.map((user) => user.toSafeObject()) });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:id — Get a single user by ID.
 */
export async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found.', 404);
    res.json({ user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/users — Create a new staff account.
 */
export async function createUser(req, res, next) {
  try {
    const user = await User.create(req.body);
    await recordActivity(req.user.id, 'User creation', 'User', user.id, user.username, {
      role: req.user.role,
      ipAddress: req.ip,
    });
    res.status(201).json({ user: user.toSafeObject() });
    emit('users:change', { action: 'created' });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/users/:id — Update user profile details.
 */
export async function updateUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!user) throw new AppError('User not found.', 404);
    await recordActivity(req.user.id, 'User modification', 'User', user.id, user.username, {
      role: req.user.role,
      ipAddress: req.ip,
    });
    res.json({ user: user.toSafeObject() });
    emit('users:change', { action: 'updated' });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/users/:id/status — Activate or deactivate a user account.
 */
export async function updateStatus(req, res, next) {
  try {
    if (req.params.id === req.user.id)
      throw new AppError('You cannot change your own account status.', 422);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!user) throw new AppError('User not found.', 404);
    await recordActivity(
      req.user.id,
      `User ${req.body.status === 'Active' ? 'activation' : 'deactivation'}`,
      'User',
      user.id,
      user.username,
      { role: req.user.role, ipAddress: req.ip }
    );
    res.json({ user: user.toSafeObject() });
    emit('users:change', { action: 'status' });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/users/:id/password — Reset a user's password.
 */
export async function resetPassword(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select('+password');
    if (!user) throw new AppError('User not found.', 404);
    user.password = req.body.password;
    await user.save();
    await recordActivity(req.user.id, 'Password reset', 'User', user.id, user.username, {
      role: req.user.role,
      ipAddress: req.ip,
    });
    res.json({ message: 'Password reset successfully.' });
    emit('users:change', { action: 'password' });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/:id — Permanently delete a user account.
 */
export async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id)
      throw new AppError('You cannot delete your own account.', 422);
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new AppError('User not found.', 404);

    // Remove profile photo file from disk if it exists
    if (user.profilePhoto) {
      const photoPath = path.join(process.cwd(), user.profilePhoto);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }

    await recordActivity(req.user.id, 'User deletion', 'User', null, user.username, {
      role: req.user.role,
      ipAddress: req.ip,
    });
    res.status(204).send();
    emit('users:change', { action: 'deleted' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/users/:id/photo — Upload or replace a user's profile photo.
 */
export async function uploadProfilePhoto(req, res, next) {
  try {
    if (!req.file) throw new AppError('No photo file was provided.', 422);

    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found.', 404);

    // Remove previous photo file if it exists
    if (user.profilePhoto) {
      const oldPath = path.join(process.cwd(), user.profilePhoto);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    // Store relative path: uploads/photos/photo-xxx.jpg
    const relativePath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
    user.profilePhoto = relativePath;
    await user.save();

    await recordActivity(req.user.id, 'Photo upload', 'User', user.id, user.username, {
      role: req.user.role,
      ipAddress: req.ip,
    });
    res.json({ user: user.toSafeObject() });
    emit('users:change', { action: 'photo' });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/:id/photo — Remove a user's profile photo.
 */
export async function removeProfilePhoto(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found.', 404);

    if (user.profilePhoto) {
      const photoPath = path.join(process.cwd(), user.profilePhoto);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }

    user.profilePhoto = '';
    await user.save();

    await recordActivity(req.user.id, 'Photo removal', 'User', user.id, user.username, {
      role: req.user.role,
      ipAddress: req.ip,
    });
    res.json({ user: user.toSafeObject() });
    emit('users:change', { action: 'photo-removed' });
  } catch (error) {
    next(error);
  }
}
