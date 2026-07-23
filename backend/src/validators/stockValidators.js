import { z } from 'zod'; import { UNITS } from '../constants/stock.js';
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
export const categorySchema = z.object({ name: z.string().trim().min(2, 'Category name is required.').max(80) }); export const statusSchema = z.object({ status: z.enum(['Active', 'Inactive']) });
const fields = { itemName: z.string().trim().min(2).max(120), category: objectId, description: z.string().trim().max(500).optional().default(''), unit: z.enum(UNITS), purchasePrice: z.coerce.number().min(0), currentQuantity: z.coerce.number().int().min(0), usedQuantity: z.coerce.number().int().min(0).default(0), minimumThreshold: z.coerce.number().int().min(0), status: z.enum(['Active', 'Inactive']).default('Active') };
export const createItemSchema = z.object(fields); export const updateItemSchema = z.object(fields); export const quantitySchema = z.object({ addQuantity: z.coerce.number().int().positive(), reason: z.string().trim().min(3).max(300) });
export const editRequestSchema=z.object({requestedQuantity:z.coerce.number().int(),reason:z.string().trim().min(3).max(300),additionalNotes:z.string().trim().max(500).optional().default('')});
