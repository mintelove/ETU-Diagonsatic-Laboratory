import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../utils/appError.js';

export async function requireAuth(req, res, next) {
  try {
    // Accept token from Authorization header OR ?token= query param (needed for EventSource)
    const header = req.headers.authorization;
    const rawToken = header?.startsWith('Bearer ') ? header.slice(7) : (req.query.token || null);
    if (!rawToken) throw new AppError('Authentication is required.', 401);
    const payload = jwt.verify(rawToken, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'Active') throw new AppError('Your account is not active.', 401);
    req.user = user;
    next();
  } catch (error) { next(error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? new AppError('Your session is invalid or expired.', 401) : error); }
}

// Alias so SSE route and any future code can import 'authenticate'
export const authenticate = requireAuth;
export const allowRoles = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : next(new AppError('You do not have permission to perform this action.', 403));

