import { z } from 'zod';
import { ROLE_VALUES } from '../constants/roles.js';
const phone = z.string().trim().regex(/^\+?[0-9]{7,15}$/, 'Provide a valid phone number.');
const password = z.string().min(10, 'Password must have at least 10 characters.').max(128).regex(/[A-Z]/, 'Password must contain an uppercase letter.').regex(/[a-z]/, 'Password must contain a lowercase letter.').regex(/[0-9]/, 'Password must contain a number.');
const email = z.string().trim().toLowerCase().email('Provide a valid email address.').max(255).optional().or(z.literal(''));
const base = {
  fullName: z.string().trim().min(2).max(100),
  username: z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9._\s-]+$/, 'Username may contain lowercase letters, numbers, spaces, dots, hyphens and underscores only.'),
  phone,
  email,
  role: z.enum(ROLE_VALUES),
  roles: z.array(z.enum(ROLE_VALUES)).optional(),
  branchName: z.enum(['Main', 'Otona', 'All']).default('Main'),
  allowedBranches: z.array(z.enum(['Main', 'Otona', 'All'])).optional(),
  isCEO: z.boolean().optional()
};
export const loginSchema = z.object({ username: z.string().trim().toLowerCase().min(1), password: z.string().min(1) });
export const createUserSchema = z.object({ ...base, password });
export const updateUserSchema = z.object(base);
export const resetPasswordSchema = z.object({ password });
export const statusSchema = z.object({ status: z.enum(['Active', 'Inactive']) });
export const changeUsernameSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newUsername: z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9._\s-]+$/, 'Username may contain lowercase letters, numbers, spaces, dots, hyphens and underscores only.').optional(),
  newFullName: z.string().trim().min(2).max(100).optional()
}).refine(data => data.newUsername || data.newFullName, {
  message: 'Please provide a new username or full name.'
});
export const changeProfileSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newFullName: z.string().trim().min(2).max(100).optional(),
  newUsername: z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9._\s-]+$/, 'Username may contain lowercase letters, numbers, spaces, dots, hyphens and underscores only.').optional(),
  phone: phone.optional(),
  email: email.optional()
}).refine(data => data.newFullName || data.newUsername || data.phone || data.email, {
  message: 'At least one field to update must be provided.'
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: password,
  confirmPassword: z.string().min(1, 'Password confirmation is required.')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New password and confirmation do not match.',
  path: ['confirmPassword']
});

