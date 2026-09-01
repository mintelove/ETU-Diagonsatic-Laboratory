import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLE_VALUES, ROLES } from '../constants/roles.js';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  username: { type: String, required: true, trim: true, lowercase: true, unique: true, minlength: 3, maxlength: 50, match: /^[a-z0-9._\s-]+$/ },
  password: { type: String, required: true, select: false },
  phone: { type: String, required: true, trim: true, match: /^\+?[0-9]{7,15}$/ },
  email: { type: String, trim: true, lowercase: true, sparse: true, unique: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  role: { type: String, enum: ROLE_VALUES, required: true, default: ROLES.RECEPTION },
  roles: [{ type: String, enum: ROLE_VALUES }],
  branchName: { type: String, enum: ['Main', 'Otona', 'All'], default: 'Main', required: true },
  allowedBranches: [{ type: String, enum: ['Main', 'Otona', 'All'] }],
  isCEO: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  lastLogin: { type: Date, default: null },
  profilePhoto: { type: String, default: '' },
  isDeveloperAccount: { type: Boolean, default: false, index: true },
  preferences: { theme: { type: String, enum: ['light', 'dark'], default: 'dark' }, language: { type: String, enum: ['en', 'am'], default: 'en' }, timeFormat: { type: String, enum: ['12', '24'], default: '24' }, dateFormat: { type: String, enum: ['locale', 'iso'], default: 'locale' }, notifications: { type: Boolean, default: true }, sidebarCollapsed: { type: Boolean, default: false }, customTheme: { type: mongoose.Schema.Types.Mixed, default: null } }
}, { timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' }, versionKey: false });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = function (candidate) { return bcrypt.compare(candidate, this.password); };
userSchema.methods.toSafeObject = function () {
  const isCeo = Boolean(this.isCEO || this.username === 'temesgen fanta' || this.username === 'admin');
  const userRoles = this.roles && this.roles.length > 0 ? this.roles : [this.role];
  const userBranches = this.allowedBranches && this.allowedBranches.length > 0
    ? this.allowedBranches
    : (this.branchName === 'All' || isCeo ? ['Main', 'Otona'] : [this.branchName || 'Main']);

  return {
    id: this._id,
    fullName: this.fullName,
    username: this.username,
    phone: this.phone,
    email: this.email || '',
    role: this.role,
    roles: userRoles,
    branchName: this.branchName || (isCeo ? 'All' : 'Main'),
    allowedBranches: userBranches,
    isCEO: isCeo,
    status: this.status,
    lastLogin: this.lastLogin,
    profilePhoto: this.profilePhoto || '',
    isDeveloperAccount: Boolean(this.isDeveloperAccount),
    preferences: this.preferences || {},
    createdDate: this.createdDate,
    updatedDate: this.updatedDate
  };
};
export default mongoose.model('User', userSchema);
