import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { signToken } from '../utils/token.js';
import { recordActivity } from '../services/activityService.js';
import { emit } from '../services/sseService.js';

export async function login(req, res, next) {
  try {
    const rawUsername = String(req.body.username || '').trim().toLowerCase();
    let user = await User.findOne({ username: rawUsername }).select('+password');
    if (!user && (rawUsername === 'admin' || rawUsername === 'temesgen fanta' || rawUsername === 'dr temesgen fanta ceo')) {
      user = await User.findOne({
        $or: [{ username: 'temesgen fanta' }, { isCEO: true }, { username: 'admin' }]
      }).select('+password');
    }
    if (!user || !(await user.comparePassword(req.body.password))) {
      await recordActivity(null, 'Failed login', 'Authentication', null, req.body.username, { ipAddress: req.ip });
      throw new AppError('Invalid username or password.', 401);
    }
    if (user.status !== 'Active') throw new AppError('Your account is inactive. Contact an administrator.', 403);
    user.lastLogin = new Date();
    await user.save();
    await recordActivity(user.id, 'Login', 'Authentication', user.id, 'Successful login', { role: user.role, ipAddress: req.ip });
    res.json({ token: signToken(user.id), user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
}

export function me(req, res) {
  res.json({ user: req.user.toSafeObject() });
}

export async function changeUsername(req, res, next) {
  try {
    const { currentPassword, newUsername, newFullName, fullName } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!user) throw new AppError('User not found.', 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    let modified = false;
    const oldUsername = user.username;
    const oldFullName = user.fullName;

    if (newUsername) {
      const normalized = newUsername.trim().toLowerCase();
      if (normalized !== user.username) {
        const existing = await User.findOne({ username: normalized, _id: { $ne: user._id } });
        if (existing || (normalized === 'mintex' && !user.isDeveloperAccount)) {
          throw new AppError('This username is already taken.', 409);
        }
        user.username = normalized;
        modified = true;
      }
    }

    const targetFullName = newFullName || fullName;
    if (targetFullName && targetFullName.trim() && targetFullName.trim() !== user.fullName) {
      user.fullName = targetFullName.trim();
      modified = true;
    }

    if (modified) {
      await user.save();
      await recordActivity(
        user.id,
        'Self username/name change',
        'User',
        user.id,
        `Identity updated from (username: ${oldUsername}, name: ${oldFullName}) to (username: ${user.username}, name: ${user.fullName})`,
        { role: user.role, ipAddress: req.ip }
      );
      emit('users:change', { action: 'updated', userId: user.id });
    }

    res.json({
      message: 'Account details updated successfully.',
      user: user.toSafeObject(),
      token: signToken(user.id)
    });
  } catch (error) {
    next(error);
  }
}

export async function changeProfile(req, res, next) {
  try {
    const { currentPassword, newFullName, newUsername, phone, email } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!user) throw new AppError('User not found.', 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    let modified = false;
    const oldUsername = user.username;
    const oldFullName = user.fullName;

    if (newUsername) {
      const normalized = newUsername.trim().toLowerCase();
      if (normalized !== user.username) {
        const existing = await User.findOne({ username: normalized, _id: { $ne: user._id } });
        if (existing || (normalized === 'mintex' && !user.isDeveloperAccount)) {
          throw new AppError('This username is already taken.', 409);
        }
        user.username = normalized;
        modified = true;
      }
    }

    if (newFullName && newFullName.trim() && newFullName.trim() !== user.fullName) {
      user.fullName = newFullName.trim();
      modified = true;
    }

    if (phone && phone.trim() && phone.trim() !== user.phone) {
      user.phone = phone.trim();
      modified = true;
    }

    if (email !== undefined) {
      const normalizedEmail = email ? email.trim().toLowerCase() : '';
      if (normalizedEmail !== (user.email || '')) {
        if (normalizedEmail) {
          const existingEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
          if (existingEmail) throw new AppError('This email is already associated with another account.', 409);
        }
        user.email = normalizedEmail;
        modified = true;
      }
    }

    if (modified) {
      await user.save();
      await recordActivity(
        user.id,
        'Self profile change',
        'User',
        user.id,
        `Profile updated: ${oldUsername} -> ${user.username}, ${oldFullName} -> ${user.fullName}`,
        { role: user.role, ipAddress: req.ip }
      );
      emit('users:change', { action: 'updated', userId: user.id });
    }

    res.json({
      message: 'Profile updated successfully.',
      user: user.toSafeObject(),
      token: signToken(user.id)
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      throw new AppError('New password and confirmation do not match.', 400);
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) throw new AppError('User not found.', 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    user.password = newPassword;
    await user.save();

    await recordActivity(
      user.id,
      'Self password change',
      'User',
      user.id,
      'Password updated successfully',
      { role: user.role, ipAddress: req.ip }
    );

    res.json({
      message: 'Password updated successfully.',
      user: user.toSafeObject(),
      token: signToken(user.id)
    });
  } catch (error) {
    next(error);
  }
}
