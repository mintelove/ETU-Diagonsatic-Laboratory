import {z}from'zod';
const id=z.string().regex(/^[a-f\d]{24}$/i,'Invalid identifier.');
const COUNSELLING_REASONS = ['Unavailable Test','Doctor Consultation','Future Appointment','Medical Advice'];
export const patientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  age: z.coerce.number().int().min(0).max(130),
  sex: z.enum(['Male', 'Female', 'Other']),
  phone: z.string().trim().regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number.'),
  address: z.string().trim().max(300).optional().default(''),
  nationality: z.string().trim().max(120).optional().default(''),
  dateOfBirth: z.union([z.coerce.date(), z.string().trim(), z.null()]).optional(),
  passportNumber: z.string().trim().max(120).optional().default(''),
  passportIssueDate: z.union([z.coerce.date(), z.string().trim(), z.null()]).optional(),
  maritalStatus: z.string().trim().max(60).optional().default(''),
  jobTitle: z.string().trim().max(150).optional().default(''),
  patientPhoto: z.string().optional().default(''),
  examinationFormType: z.string().trim().max(150).optional().default(''),
  customRadiologyExamName: z.string().trim().max(200).optional().default(''),
  registrationType: z.enum(['Self', 'Referral', 'Self Aware']),
  referralHospital: z.string().trim().max(120).optional().default(''),
  laboratoryTests: z.array(id).max(30).default([]),
  patientCategory: z.enum(['Regular Patient', 'Staff Member', 'Collaborator']).default('Regular Patient'),
  paymentMethod: z.enum(['Cash', 'Card', 'Mobile Payment']).default('Cash'),
  serviceType: z.enum(['Laboratory Test', 'Counseling Only']).default('Laboratory Test'),
  counsellingOnly: z.boolean().default(false),
  counsellingReason: z.string().trim().optional().default(''),
  counsellingNotes: z.string().trim().max(1000).optional().default(''),
  systolicBP: z.coerce.number().min(50).max(300).nullable().optional(),
  diastolicBP: z.coerce.number().min(30).max(200).nullable().optional()
}).passthrough().superRefine((x, c) => {
  const counseling = x.counsellingOnly || x.serviceType === 'Counseling Only';
  if (x.registrationType === 'Referral' && !x.referralHospital) c.addIssue({ code: 'custom', message: 'Referral hospital is required.', path: ['referralHospital'] });
  if (!counseling && x.registrationType !== 'Self Aware' && !x.laboratoryTests.length) c.addIssue({ code: 'custom', message: 'Select at least one laboratory test.', path: ['laboratoryTests'] });
});
export const sampleTypeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  price: z.coerce.number().min(0),
  description: z.string().trim().max(500).optional().default(''),
  estimatedProcessingTime: z.string().trim().max(100).optional().default(''),
  available: z.boolean().default(true)
}).passthrough();

