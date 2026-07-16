import { z } from 'zod';
import { AppError } from '../utils/appError.js';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const customTheme = z.object({ primary:color, secondary:color, sidebar:color, header:color, card:color, button:color, background:color, textAccent:color });
export const preferenceSchema = z.object({ theme: z.enum(['light','dark']).optional(), language: z.enum(['en','am']).optional(), timeFormat: z.enum(['12','24']).optional(), dateFormat: z.enum(['locale','iso']).optional(), notifications: z.boolean().optional(), sidebarCollapsed: z.boolean().optional(), customTheme: customTheme.nullable().optional() }).refine(value => Object.keys(value).length > 0, 'Choose at least one preference.');
export async function updatePreferences(req,res,next) { try {
  const current = req.user.preferences?.toObject?.() || req.user.preferences || {};
  const preferences = { ...current, ...req.body };
  req.user.preferences = preferences; await req.user.save();
  res.json({ preferences: req.user.toSafeObject().preferences });
} catch (error) { next(error); } }
