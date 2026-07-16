import LabReport from '../models/LabReport.js';
import { AppError } from '../utils/appError.js';

const equipment={
  'Mindray BS120 Chemistry Analyzer':[['ALT','0–41 U/L'],['AST','0–40 U/L'],['ALP','44–147 U/L'],['Creatinine','53–115 µmol/L'],['Urea','2.5–7.8 mmol/L'],['Glucose','3.9–7.8 mmol/L'],['Cholesterol','<5.2 mmol/L'],['Triglycerides','<1.7 mmol/L'],['Bilirubin','5–21 µmol/L'],['Albumin','35–50 g/L'],['Total Protein','60–80 g/L']],
  'BC3000 Plus Hematology Analyzer':[['Hemoglobin','12–17 g/dL'],['WBC','4–11 ×10⁹/L'],['Platelets','150–450 ×10⁹/L'],['RBC','4.0–5.9 ×10¹²/L'],['Hematocrit','36–52%']],
  'K-Lite 8 Electrolyte Analyzer':[['Sodium','135–145 mmol/L'],['Potassium','3.5–5.1 mmol/L'],['Chloride','98–107 mmol/L']],
  'Finecare HbA1c Reader':[['HbA1c','4.0–5.6%']],
  'Semi Automatic 2-Part Coagulation Analyzer':[['PT','11–13.5 sec'],['INR','0.8–1.2'],['APTT','25–35 sec']]
};
export function parameters(req,res){res.json({equipment:Object.keys(equipment),parameters:Object.fromEntries(Object.entries(equipment).map(([name,items])=>[name,items.map(([sampleName,referenceValue])=>({sampleName,referenceValue}))]))});}
export async function draft(req,res,next){try{const report=await LabReport.findOne({patient:req.params.patientId,technician:req.user.id,status:{$in:['Draft','Rejected']}});res.json({report});}catch(error){next(error)}}
export async function generate(req,res,next){try{const report=await LabReport.findOne({patient:req.params.patientId,technician:req.user.id,status:'Draft'}).populate('patient','patientId barcode name age sex phone sampleTypes').populate('patient.sampleTypes','name').populate('technician','fullName');if(!report)throw new AppError('Save a draft before generating the laboratory report.',422);res.json({report});}catch(error){next(error)}}
