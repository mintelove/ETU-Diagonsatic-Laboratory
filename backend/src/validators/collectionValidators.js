import {z}from'zod';
const id=z.string().regex(/^[a-f\d]{24}$/i,'Invalid identifier.');
export const requestSchema=z.object({patient:id,item:id,quantity:z.coerce.number().int().min(1).max(1000),reason:z.string().trim().min(3).max(500),priority:z.enum(['Routine','Urgent','Critical']).default('Routine')});
export const reviewRequestSchema=z.object({status:z.enum(['Approved','Rejected']),comments:z.string().trim().max(500).optional().default('')});
export const reportSchema=z.object({equipment:z.array(z.string().trim().min(2).max(200)).min(1).max(6),results:z.array(z.object({sampleName:z.string().trim().min(1).max(120),result:z.string().trim().min(1).max(120),unit:z.string().trim().max(40).optional().default(''),referenceValue:z.string().trim().max(120).optional().default(''),flag:z.enum(['','N','L','H']).optional().default(''),remarks:z.string().trim().max(500).optional().default('')})).min(1).max(100),comments:z.string().trim().max(2000).optional().default('')});
