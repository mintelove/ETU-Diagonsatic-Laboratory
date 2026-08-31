import {z}from'zod';
const id=z.string().regex(/^[a-f\d]{24}$/i,'Invalid identifier.');
export const requestSchema=z.object({patient:id,item:id,quantity:z.coerce.number().int().min(1).max(1000),reason:z.string().trim().min(3).max(500),priority:z.enum(['Routine','Urgent','Critical']).default('Routine')});
export const reviewRequestSchema=z.object({status:z.enum(['Approved','Rejected']),comments:z.string().trim().max(500).optional().default('')});
export const reportSchema = z.object({
  equipment: z.array(z.string().trim().max(200)).optional().default([]),
  results: z.array(z.object({
    sampleName: z.string().trim().min(1).max(120),
    result: z.string().trim().max(120).optional().default(''),
    unit: z.string().trim().max(40).optional().default(''),
    referenceValue: z.string().trim().max(120).optional().default(''),
    flag: z.enum(['', 'N', 'L', 'H', 'High', 'Low', 'Normal', 'CL', 'CH', 'Critical Low', 'Critical High']).optional().default(''),
    remarks: z.string().trim().max(500).optional().default(''),
    category: z.string().trim().optional().default(''),
    subcategory: z.string().trim().optional().default('')
  })).optional().default([]),
  comments: z.string().trim().max(2000).optional().default(''),
  sampleCollectorComments: z.array(z.object({
    mainCategory: z.string().trim().min(1).max(200),
    subcategory: z.string().trim().max(200).nullable().optional().default(null),
    comment: z.string().trim().max(2000).optional().default('')
  })).optional().default([]),
  testInterpretations: z.array(z.object({
    laboratoryTest: id.nullable().optional(),
    testName: z.string().trim().min(1).max(200),
    subcategory: z.string().trim().optional().default(''),
    interpretations: z.array(z.object({
      interpretationId: z.string().optional().default(''),
      title: z.string().trim().min(1).max(300),
      interpretation: z.string().trim().min(1).max(3000)
    })).optional().default([])
  })).optional().default([]),
  isInternalMedicineForm: z.boolean().optional().default(false),
  internalMedicineReport: z.any().optional(),
  systolicBP: z.coerce.number().min(50).max(300).nullable().optional(),
  diastolicBP: z.coerce.number().min(30).max(200).nullable().optional()
}).passthrough();


