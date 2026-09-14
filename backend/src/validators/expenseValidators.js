import { z } from 'zod';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS, EXPENSE_TYPES } from '../constants/expense.js';

export const createExpenseSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    expenseName: z.string().trim().max(200).optional(),
    category: z.string().trim().refine((cat) => EXPENSE_CATEGORIES.includes(cat), {
      message: 'Please select a valid expense category'
    }),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    date: z.coerce.date().optional().default(() => new Date()),
    description: z.string().trim().max(500).optional().default(''),
    receiptNumber: z.string().trim().max(100).optional().default(''),
    paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).default('Cash'),
    branchName: z.enum(['Main', 'Otona']).optional(),
    stockItem: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid stock identifier').optional().nullable(),
    stockItemName: z.string().trim().max(200).optional(),
    stockQuantity: z.coerce.number().positive().optional().nullable(),
    stockUnitPrice: z.coerce.number().min(0).optional().nullable(),
    type: z.enum(EXPENSE_TYPES).optional().default('MANUAL')
  })
  .superRefine((data, ctx) => {
    const isOther = data.category === 'Other Expenses';
    const effectiveName = (data.expenseName || data.title || '').trim();
    if (isOther && effectiveName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expense Name / Description is required for Other Expenses (minimum 2 characters).',
        path: ['expenseName']
      });
    }
  });

export const updateExpenseSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  expenseName: z.string().trim().max(200).optional(),
  category: z.string().trim().optional(),
  amount: z.coerce.number().positive('Amount must be greater than 0').optional(),
  date: z.coerce.date().optional(),
  description: z.string().trim().max(500).optional(),
  receiptNumber: z.string().trim().max(100).optional(),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).optional(),
  branchName: z.enum(['Main', 'Otona']).optional(),
  stockItem: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid stock identifier').optional().nullable(),
  stockItemName: z.string().trim().max(200).optional(),
  stockQuantity: z.coerce.number().positive().optional().nullable(),
  stockUnitPrice: z.coerce.number().min(0).optional().nullable()
});

export const voidExpenseSchema = z.object({
  voidReason: z.string().trim().min(2, 'Please provide a reason for voiding this expense.').max(500)
});
