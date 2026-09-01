import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { signToken } from '../utils/token.js';
import { recordActivity } from '../services/activityService.js';

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
    const { currentPassword, newUsername } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!user) throw new AppError('User not found.', 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    const normalized = newUsername.trim().toLowerCase();
    if (normalized === user.username) {
      return res.json({
        message: 'Username is unchanged.',
        user: user.toSafeObject(),
        token: signToken(user.id)
      });
    }

    const existing = await User.findOne({ username: normalized, _id: { $ne: user._id } });
    if (existing || (normalized === 'mintex' && !user.isDeveloperAccount)) {
      throw new AppError('This username is already taken.', 409);
    }

    const oldUsername = user.username;
    user.username = normalized;
    await user.save();

    await recordActivity(
      user.id,
      'Self username change',
      'User',
      user.id,
      `Username updated from ${oldUsername} to ${normalized}`,
      { role: user.role, ipAddress: req.ip }
    );

    res.json({
      message: 'Username updated successfully.',
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
