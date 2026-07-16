/**
 * ETU Diagnostic Laboratory — Sample Type Validators
 *
 * Zod validation schemas for Sample Type Management endpoints.
 */

import { z } from 'zod';

export const createSampleTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Sample name is required (min 2 characters).')
    .max(120, 'Sample name must be at most 120 characters.'),
  price: z
    .coerce.number({ invalid_type_error: 'Price must be a number.' })
    .min(0.01, 'Price must be greater than zero.'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be at most 500 characters.')
    .optional()
    .default(''),
  category: z
    .enum(['Blood', 'Urine', 'Stool', 'Body Fluid', 'Other'])
    .optional()
    .default('Other'),
  status: z
    .enum(['Active', 'Inactive'])
    .optional()
    .default('Active'),
});

export const updateSampleTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Sample name is required (min 2 characters).')
    .max(120, 'Sample name must be at most 120 characters.'),
  price: z
    .coerce.number({ invalid_type_error: 'Price must be a number.' })
    .min(0.01, 'Price must be greater than zero.'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be at most 500 characters.')
    .optional()
    .default(''),
  category: z
    .enum(['Blood', 'Urine', 'Stool', 'Body Fluid', 'Other'])
    .optional()
    .default('Other'),
});

export const sampleTypeStatusSchema = z.object({
  status: z.enum(['Active', 'Inactive']),
});
