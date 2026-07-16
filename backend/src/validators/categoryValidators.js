/**
 * ETU Diagnostic Laboratory — Category Validators
 *
 * Zod validation schemas for Category Management.
 */

import { z } from 'zod';

export const createCategorySchema = z.object({
  categoryName: z.string().trim().min(2, 'Category name is required (min 2 characters).').max(80, 'Category name must be at most 80 characters.'),
  categoryCode: z
    .string()
    .trim()
    .max(30, 'Category code must be at most 30 characters.')
    .regex(/^[a-zA-Z0-9_-]*$/, 'Category code may contain letters, numbers, hyphens, and underscores only.')
    .optional()
    .or(z.literal('')),
  description: z.string().trim().max(500, 'Description must be at most 500 characters.').optional().default(''),
  status: z.enum(['Active', 'Inactive']).optional().default('Active'),
});

export const updateCategorySchema = z.object({
  categoryName: z.string().trim().min(2, 'Category name is required (min 2 characters).').max(80, 'Category name must be at most 80 characters.'),
  categoryCode: z
    .string()
    .trim()
    .min(2, 'Category code is required (min 2 characters).')
    .max(30, 'Category code must be at most 30 characters.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Category code may contain letters, numbers, hyphens, and underscores only.'),
  description: z.string().trim().max(500, 'Description must be at most 500 characters.').optional().default(''),
});

export const categoryStatusSchema = z.object({
  status: z.enum(['Active', 'Inactive']),
});
