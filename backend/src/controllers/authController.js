import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { signToken } from '../utils/token.js';
import { recordActivity } from '../services/activityService.js';
export async function login(req, res, next) { try { const user = await User.findOne({ username: req.body.username }).select('+password'); if (!user || !(await user.comparePassword(req.body.password))) { await recordActivity(null,'Failed login','Authentication',null,req.body.username,{ipAddress:req.ip}); throw new AppError('Invalid username or password.', 401); } if (user.status !== 'Active') throw new AppError('Your account is inactive. Contact an administrator.', 403); user.lastLogin = new Date(); await user.save(); await recordActivity(user.id,'Login','Authentication',user.id,'Successful login',{role:user.role,ipAddress:req.ip});res.json({ token: signToken(user.id), user: user.toSafeObject() }); } catch (error) { next(error); } }
export function me(req, res) { res.json({ user: req.user.toSafeObject() }); }
