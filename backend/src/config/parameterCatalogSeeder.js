import LabTestParameter from '../models/LabTestParameter.js';

export const MASTER_LAB_CATEGORIES = [
  // 1. HEMATOLOGY
  {
    category: 'HEMATOLOGY',
    subcategory: 'CBC',
    parameters: [
      { parameterName: 'RED BLOOD CELL COUNT (RBC)', unit: 'x10^6/µL', referenceValue: 'Male: 4.73 – 5.49 | Female: 4.20 – 5.40', normalMin: 4.20, normalMax: 5.49, displayOrder: 1, defaultPrice: 500, aliases: ['RBC', 'Red Blood Cell Count'] },
      { parameterName: 'HEMOGLOBIN (HGB)', unit: 'g/dL', referenceValue: 'Male: 14.4 – 16.6 | Female: 12.0 – 15.0', normalMin: 12.0, normalMax: 16.6, displayOrder: 2, defaultPrice: 500, aliases: ['HGB', 'Hemoglobin'] },
      { parameterName: 'HEMATOCRIT (HCT)', unit: '%', referenceValue: 'Male: 42.9 – 49.9 | Female: 36 – 46', normalMin: 36.0, normalMax: 49.9, displayOrder: 3, defaultPrice: 500, aliases: ['HCT', 'Hematocrit'] },
      { parameterName: 'MCV', unit: 'fL', referenceValue: '80 – 100', normalMin: 80.0, normalMax: 100.0, displayOrder: 4, defaultPrice: 500 },
      { parameterName: 'MCH', unit: 'pg', referenceValue: '25 – 36', normalMin: 25.0, normalMax: 36.0, displayOrder: 5, defaultPrice: 500 },
      { parameterName: 'MCHC', unit: 'g/dL', referenceValue: '31 – 37', normalMin: 31.0, normalMax: 37.0, displayOrder: 6, defaultPrice: 500 },
      { parameterName: 'PLATELET COUNT', unit: 'x10^3/µL', referenceValue: '140 – 415', normalMin: 140.0, normalMax: 415.0, displayOrder: 7, defaultPrice: 500, aliases: ['Platelet Count', 'PLT'] },
      { parameterName: 'NEUTROPHILS', unit: '%', referenceValue: '40 – 74', normalMin: 40.0, normalMax: 74.0, displayOrder: 8, defaultPrice: 500 },
      { parameterName: 'LYMPHOCYTES', unit: '%', referenceValue: '14 – 46', normalMin: 14.0, normalMax: 46.0, displayOrder: 9, defaultPrice: 500 },
      { parameterName: 'MONOCYTES', unit: '%', referenceValue: '4 – 13', normalMin: 4.0, normalMax: 13.0, displayOrder: 10, defaultPrice: 500 },
      { parameterName: 'EOSINOPHILS', unit: '%', referenceValue: '0 – 7', normalMin: 0.0, normalMax: 7.0, displayOrder: 11, defaultPrice: 500 },
      { parameterName: 'BASOPHILS', unit: '%', referenceValue: '0 – 3', normalMin: 0.0, normalMax: 3.0, displayOrder: 12, defaultPrice: 500 },
      { parameterName: 'NEUTROPHIL ABSOLUTE', unit: 'x10^3/µL', referenceValue: '1.8 – 7.8', normalMin: 1.8, normalMax: 7.8, displayOrder: 13, defaultPrice: 500 },
      { parameterName: 'LYMPHOCYTE ABSOLUTE', unit: 'x10^3/µL', referenceValue: '0.7 – 4.5', normalMin: 0.7, normalMax: 4.5, displayOrder: 14, defaultPrice: 500 },
      { parameterName: 'MONOCYTE ABSOLUTE', unit: 'x10^3/µL', referenceValue: '0.1 – 1.0', normalMin: 0.1, normalMax: 1.0, displayOrder: 15, defaultPrice: 500 },
      { parameterName: 'EOSINOPHIL ABSOLUTE', unit: 'x10^3/µL', referenceValue: '0.0 – 0.4', normalMin: 0.0, normalMax: 0.4, displayOrder: 16, defaultPrice: 500 },
      { parameterName: 'BASOPHIL ABSOLUTE', unit: 'x10^3/µL', referenceValue: '0.0 – 0.2', normalMin: 0.0, normalMax: 0.2, displayOrder: 17, defaultPrice: 500 }
    ]
  },

  // 2. CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS
  {
    category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
    subcategory: 'LIPID PROFILE',
    parameters: [
      { parameterName: 'Total Cholesterol', unit: 'mg/dL', referenceValue: '0–200', normalMin: 0, normalMax: 200, displayOrder: 1, defaultPrice: 500, aliases: ['TOTAL CHOLESTEROL', 'Cholesterol'] },
      { parameterName: 'HDL Cholesterol', unit: 'mg/dL', referenceValue: '40–60', normalMin: 40, normalMax: 60, displayOrder: 2, defaultPrice: 500, aliases: ['HDL', 'HDL CHOLESTEROL'] },
      { parameterName: 'LDL Cholesterol', unit: 'mg/dL', referenceValue: '0–130', normalMin: 0, normalMax: 130, displayOrder: 3, defaultPrice: 500, aliases: ['LDL', 'LDL CHOLESTEROL'] },
      { parameterName: 'Triglycerides', unit: 'mg/dL', referenceValue: '0–150', normalMin: 0, normalMax: 150, displayOrder: 4, defaultPrice: 500, aliases: ['Triglyceride', 'TRIGLYCERIDES'] },
      { parameterName: 'LDL/HDL Ratio', unit: 'Ratio', referenceValue: '0.0–3.5', normalMin: 0, normalMax: 3.5, displayOrder: 5, defaultPrice: 500, aliases: ['LDL/HDL RATIO'] },
      { parameterName: 'VLDL Cholesterol', unit: 'mg/dL', referenceValue: '2–30', normalMin: 2, normalMax: 30, displayOrder: 6, defaultPrice: 500, aliases: ['VLDL', 'VLDL CHOLESTEROL'] },
      { parameterName: 'Total Cholesterol / HDL Ratio', unit: 'Ratio', referenceValue: '0.0–5.0', normalMin: 0, normalMax: 5.0, displayOrder: 7, defaultPrice: 500, aliases: ['Total Cholesterol/HDL Ratio', 'TOTAL CHOLESTEROL / HDL RATIO'] },
      { parameterName: 'Non-HDL Cholesterol', unit: 'mg/dL', referenceValue: '0–130', normalMin: 0, normalMax: 130, displayOrder: 8, defaultPrice: 500, aliases: ['NON-HDL CHOLESTEROL'] }
    ]
  },
  {
    category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
    subcategory: 'RENAL FUNCTION TESTS',
    parameters: [
      { parameterName: 'Urea', unit: 'mg/dL', referenceValue: '15–45', normalMin: 15, normalMax: 45, displayOrder: 9, defaultPrice: 200, aliases: ['UREA', 'BUN / Urea', 'BUN/Urea'] },
      { parameterName: 'Creatinine, Serum', unit: 'mg/dL', referenceValue: '0.7–1.20', normalMin: 0.7, normalMax: 1.20, displayOrder: 10, defaultPrice: 300, aliases: ['Creatinine', 'CREATININE, SERUM', 'Serum Creatinine', 'CREATININE'] },
      { parameterName: 'eGFR', unit: 'mL/min/1.73m²', referenceValue: '90–120', normalMin: 90, normalMax: 120, displayOrder: 11, defaultPrice: 300, aliases: ['eGFR'] },
      { parameterName: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', referenceValue: '7–20', normalMin: 7, normalMax: 20, displayOrder: 12, defaultPrice: 200, aliases: ['BUN', 'BLOOD UREA NITROGEN (BUN)', 'BUN / Urea'] },
      { parameterName: 'BUN/Creatinine Ratio', unit: 'Ratio', referenceValue: '10–20', normalMin: 10, normalMax: 20, displayOrder: 13, defaultPrice: 300, aliases: ['BUN/CREATININE RATIO'] },
      { parameterName: 'Uric Acid', unit: 'mg/dL', referenceValue: '3.5–7.2', normalMin: 3.5, normalMax: 7.2, displayOrder: 14, defaultPrice: 400, aliases: ['URIC ACID'] },
      { parameterName: 'Sodium (Na+)', unit: 'mmol/L', referenceValue: '135–145', normalMin: 135, normalMax: 145, displayOrder: 15, defaultPrice: 400, aliases: ['Sodium', 'Na+', 'SODIUM (Na+)'] },
      { parameterName: 'Potassium (K+)', unit: 'mmol/L', referenceValue: '3.5–5.1', normalMin: 3.5, normalMax: 5.1, displayOrder: 16, defaultPrice: 400, aliases: ['Potassium', 'K+', 'POTASSIUM (K+)'] },
      { parameterName: 'Chloride (Cl−)', unit: 'mmol/L', referenceValue: '98–107', normalMin: 98, normalMax: 107, displayOrder: 17, defaultPrice: 400, aliases: ['Chloride', 'Cl-', 'CHLORIDE (Cl−)'] },
      { parameterName: 'Calcium', unit: 'mg/dL', referenceValue: '8.5–10.5', normalMin: 8.5, normalMax: 10.5, displayOrder: 18, defaultPrice: 400, aliases: ['Total Calcium', 'CALCIUM'] },
      { parameterName: 'Phosphorus', unit: 'mg/dL', referenceValue: '2.5–4.5', normalMin: 2.5, normalMax: 4.5, displayOrder: 19, defaultPrice: 700, aliases: ['Phosphate', 'PHOSPHORUS', 'Phosphite', 'Phosphores'] }
    ]
  },
  {
    category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
    subcategory: 'LIVER FUNCTION TEST',
    parameters: [
      { parameterName: 'Total Protein', unit: 'g/dL', referenceValue: '6.0–8.0', normalMin: 6.0, normalMax: 8.0, displayOrder: 20, defaultPrice: 400, aliases: ['TOTAL PROTEIN'] },
      { parameterName: 'Albumin', unit: 'g/dL', referenceValue: '3.8–4.2', normalMin: 3.8, normalMax: 4.2, displayOrder: 21, defaultPrice: 400, aliases: ['ALBUMIN'] },
      { parameterName: 'Globulin', unit: 'g/dL', referenceValue: '2.0–3.2', normalMin: 2.0, normalMax: 3.2, displayOrder: 22, defaultPrice: 400, aliases: ['GLOBULIN'] },
      { parameterName: 'A/G Ratio', unit: 'Ratio', referenceValue: '1.1–2.2', normalMin: 1.1, normalMax: 2.2, displayOrder: 23, defaultPrice: 400, aliases: ['Albumin/Globulin Ratio (A/G Ratio)', 'A/G RATIO'] },
      { parameterName: 'Total Bilirubin', unit: 'mg/dL', referenceValue: '0.2–1.0', normalMin: 0.2, normalMax: 1.0, displayOrder: 24, defaultPrice: 500, aliases: ['TOTAL BILIRUBIN', 'β-Total', 'Beta-Total', 'B-Total'] },
      { parameterName: 'Direct Bilirubin', unit: 'mg/dL', referenceValue: '0.0–0.3', normalMin: 0.0, normalMax: 0.3, displayOrder: 25, defaultPrice: 500, aliases: ['DIRECT BILIRUBIN', 'β-Direct', 'Beta-Direct', 'B-Direct'] },
      { parameterName: 'Indirect Bilirubin', unit: 'mg/dL', referenceValue: '0.2–0.8', normalMin: 0.2, normalMax: 0.8, displayOrder: 26, defaultPrice: 500, aliases: ['INDIRECT BILIRUBIN'] },
      { parameterName: 'Alkaline Phosphatase (ALP)', unit: 'IU/L', referenceValue: '30–120', normalMin: 30, normalMax: 120, displayOrder: 27, defaultPrice: 350, aliases: ['ALP', 'ALKALINE PHOSPHATASE (ALP)'] },
      { parameterName: 'AST (SGOT)', unit: 'IU/L', referenceValue: '0–37', normalMin: 0, normalMax: 37, displayOrder: 28, defaultPrice: 350, aliases: ['AST/GOT', 'GOT', 'AST', 'AST (SGOT)', 'SGOT'] },
      { parameterName: 'ALT (SGPT)', unit: 'IU/L', referenceValue: '0–55', normalMin: 0, normalMax: 55, displayOrder: 29, defaultPrice: 350, aliases: ['ALT/GPT', 'GPT', 'ALT', 'ALT (SGPT)', 'SGPT'] },
      { parameterName: 'Gamma GT (GGT)', unit: 'IU/L', referenceValue: '9–48', normalMin: 9, normalMax: 48, displayOrder: 30, defaultPrice: 350, aliases: ['GGT', 'GAMMA GT (GGT)'] }
    ]
  },
  {
    category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
    subcategory: 'OTHER CHEMISTRY TESTS',
    parameters: [
      { parameterName: 'Lactate Dehydrogenase (LDH)', unit: 'U/L', referenceValue: '125–220', normalMin: 125, normalMax: 220, displayOrder: 31, defaultPrice: 700, aliases: ['LDH', 'LACTATE DEHYDROGENASE (LDH)'] },
      { parameterName: 'Phosphate', unit: 'mg/dL', referenceValue: '2.5–4.5', normalMin: 2.5, normalMax: 4.5, displayOrder: 32, defaultPrice: 700, aliases: ['PHOSPHATE', 'Phosphite', 'Phosphorus'] },
      { parameterName: 'Amylase', unit: 'U/L', referenceValue: '30–110', normalMin: 30, normalMax: 110, displayOrder: 33, defaultPrice: 600, aliases: ['AMYLASE'] },
      { parameterName: 'Lipase', unit: 'U/L', referenceValue: '10–140', normalMin: 10, normalMax: 140, displayOrder: 34, defaultPrice: 600, aliases: ['LIPASE'] },
      { parameterName: 'CK (Creatine Kinase)', unit: 'U/L', referenceValue: '24–195', normalMin: 24, normalMax: 195, displayOrder: 35, defaultPrice: 600, aliases: ['CK', 'CK (CREATINE KINASE)'] },
      { parameterName: 'CK-MB', unit: 'U/L', referenceValue: '0–25', normalMin: 0, normalMax: 25, displayOrder: 36, defaultPrice: 1300, aliases: ['CK-MB'] },
      { parameterName: 'Troponin I', unit: 'ng/mL', referenceValue: '0.00–0.04', normalMin: 0.0, normalMax: 0.04, displayOrder: 37, defaultPrice: 1300, aliases: ['Troponin', 'TROPONIN I'] },
      { parameterName: 'Magnesium', unit: 'mg/dL', referenceValue: '1.6 - 2.6', normalMin: 1.6, normalMax: 2.6, displayOrder: 38, defaultPrice: 1000, aliases: ['MAGNESIUM', 'Mg', 'Magnesium (Mg)', 'MAGNESIUM (Mg)'] }
    ]
  },

  // 3. COAGULATION TEST
  {
    category: 'COAGULATION TEST',
    subcategory: '',
    parameters: [
      { parameterName: 'PT / PTT / INR', unit: 'seconds / ratio', referenceValue: 'PT: 11.0–13.5s | INR: 0.8–1.2 | APTT: 25.0–35.0s', normalMin: null, normalMax: null, displayOrder: 1, defaultPrice: 1200, aliases: ['PT / PTT / INR', 'PT/PTT/INR', 'PT / INR / PTT', 'Coagulation Profile', 'PT', 'PT/INR'] },
      { parameterName: 'PT', unit: 'seconds', referenceValue: '11.0–13.5', normalMin: 11.0, normalMax: 13.5, displayOrder: 2, defaultPrice: 1200 },
      { parameterName: 'INR', unit: '', referenceValue: '0.8–1.2', normalMin: 0.8, normalMax: 1.2, displayOrder: 3, defaultPrice: 1200 },
      { parameterName: 'APTT', unit: 'seconds', referenceValue: '25.0–35.0', normalMin: 25.0, normalMax: 35.0, displayOrder: 4, defaultPrice: 1200, aliases: ['PTT', 'APTT'] },
      { parameterName: 'Bleeding Time', unit: 'minutes', referenceValue: '2.0–7.0', normalMin: 2.0, normalMax: 7.0, displayOrder: 5, defaultPrice: 400 }
    ]
  },

  // 4. SERUM ELECTROLYTE
  {
    category: 'SERUM ELECTROLYTE',
    subcategory: '',
    parameters: [
      { parameterName: 'Serum Electrolyte (K-Lyte 8)', unit: 'mmol/L', referenceValue: 'Na: 135–145 | K: 3.5–5.5 | Cl: 96–106', normalMin: null, normalMax: null, displayOrder: 1, defaultPrice: 1000, aliases: ['Electrolyte', 'ELECTROLYTE', 'Serum Electrolyte', 'Serum Electrolytes', 'Electrolytes'] },
      { parameterName: 'SODIUM', unit: 'mmol/L', referenceValue: '135–145', normalMin: 135, normalMax: 145, displayOrder: 2, defaultPrice: 1000, aliases: ['SODIUM', 'Na+', 'Sodium (Na+)', 'Sodium'] },
      { parameterName: 'POTASSIUM', unit: 'mmol/L', referenceValue: '3.5–5.5', normalMin: 3.5, normalMax: 5.5, displayOrder: 3, defaultPrice: 1000, aliases: ['POTASSIUM', 'K+', 'Potassium (K+)', 'Potassium'] },
      { parameterName: 'CHLORIDE', unit: 'mmol/L', referenceValue: '96–106', normalMin: 96, normalMax: 106, displayOrder: 4, defaultPrice: 1000, aliases: ['CHLORIDE', 'Cl-', 'Chloride (Cl−)', 'Chloride'] },
      { parameterName: 'T. CALCIUM', unit: 'mmol/L', referenceValue: '2.1–2.6', normalMin: 2.1, normalMax: 2.6, displayOrder: 5, defaultPrice: 1000, aliases: ['T.CALCIUM', 'T. CALCIUM', 'TOTAL CALCIUM', 'Total Calcium'] },
      { parameterName: 'CALCIUM ION++', unit: 'mmol/L', referenceValue: '1.1–1.35', normalMin: 1.1, normalMax: 1.35, displayOrder: 6, defaultPrice: 1000, aliases: ['CALCIUM ION++', 'Ionized Calcium'] },
      { parameterName: 'nCALCIUM', unit: 'mmol/L', referenceValue: '1.0–1.28', normalMin: 1.0, normalMax: 1.28, displayOrder: 7, defaultPrice: 1000 },
      { parameterName: 'PHOSPHORUS', unit: 'mg/dL', referenceValue: '2.7–4.5', normalMin: 2.7, normalMax: 4.5, displayOrder: 8, defaultPrice: 1000, aliases: ['PHOSPHORUS', 'Phosphate', 'Phosphorus'] },
      { parameterName: 'pH', unit: '', referenceValue: '7.35–7.45', normalMin: 7.35, normalMax: 7.45, displayOrder: 9, defaultPrice: 1000 }
    ]
  },

  // 5. HORMONE
  {
    category: 'HORMONE',
    subcategory: '',
    parameters: [
      { parameterName: 'FSH', unit: 'mIU/mL', referenceValue: 'Male: 1.5–12.4 | Female: 3.5–12.5', normalMin: 1.5, normalMax: 12.5, displayOrder: 1, defaultPrice: 1500, aliases: ['FSH', 'Follicle-Stimulating Hormone', 'Follicle Stimulating Hormone'] },
      { parameterName: 'TSH', unit: 'mIU/L', referenceValue: '0.40–4.00', normalMin: 0.4, normalMax: 4.0, displayOrder: 2, defaultPrice: 1500, aliases: ['TSH', 'Thyroid Stimulating Hormone'] },
      { parameterName: 'T3', unit: 'nmol/L', referenceValue: '1.20–2.80', normalMin: 1.2, normalMax: 2.8, displayOrder: 3, defaultPrice: 1300, aliases: ['T3', 'Triiodothyronine'] },
      { parameterName: 'T4', unit: 'pmol/L', referenceValue: '12.0–22.0', normalMin: 12.0, normalMax: 22.0, displayOrder: 4, defaultPrice: 1300, aliases: ['T4', 'Thyroxine'] },
      { parameterName: 'fT3 — Free Triiodothyronine', unit: 'pmol/L', referenceValue: '3–7', normalMin: 3.0, normalMax: 7.0, displayOrder: 5, defaultPrice: 1300, aliases: ['fT3', 'FT3', 'Free Triiodothyronine', 'FREE TRIIODOTHYRONINE', 'FT3 — FREE TRIIODOTHYRONINE', 'fT3 (Free Triiodothyronine)', 'FT3 - FREE TRIIODOTHYRONINE'] },
      { parameterName: 'fT4 — Free Thyroxine', unit: 'pmol/L', referenceValue: '12–22', normalMin: 12.0, normalMax: 22.0, displayOrder: 6, defaultPrice: 1300, aliases: ['fT4', 'FT4', 'Free Thyroxine', 'FREE THYROXINE', 'FT4 — FREE THYROXINE', 'fT4 (Free Thyroxine)', 'FT4 - FREE THYROXINE'] },
      { parameterName: 'Troponin', unit: 'ng/mL', referenceValue: '0.00–0.04', normalMin: 0.0, normalMax: 0.04, displayOrder: 7, defaultPrice: 1300, aliases: ['Troponin', 'Troponin I', 'Troponin T'] },
      { parameterName: 'CK-MB', unit: 'U/L', referenceValue: '0.0–25.0', normalMin: 0, normalMax: 25, displayOrder: 8, defaultPrice: 1300, aliases: ['CK-MB', 'CKMB'] },
      { parameterName: 'HbA1C', unit: '%', referenceValue: '4.0–5.6', normalMin: 4.0, normalMax: 5.6, displayOrder: 9, defaultPrice: 1300, aliases: ['HbA1C', 'HgbA1C', 'HbA1c', 'Glycated Hemoglobin'] },
      { parameterName: 'PSA', unit: 'ng/mL', referenceValue: '0.0–4.0', normalMin: 0, normalMax: 4.0, displayOrder: 10, defaultPrice: 1300, aliases: ['PSA', 'Prostate-Specific Antigen'] },
      { parameterName: 'CEA', unit: 'ng/mL', referenceValue: '0.0–5.0', normalMin: 0, normalMax: 5.0, displayOrder: 11, defaultPrice: 1300, aliases: ['CEA', 'Carcinoembryonic Antigen'] },
      { parameterName: 'AFP', unit: 'ng/mL', referenceValue: '0.0–10.0', normalMin: 0, normalMax: 10.0, displayOrder: 12, defaultPrice: 1500, aliases: ['AFP', 'Alpha-Fetoprotein'] },
      { parameterName: 'CRP, QUANT', unit: 'mg/dL', referenceValue: '0.0–0.50', normalMin: 0.0, normalMax: 0.50, displayOrder: 13, defaultPrice: 1300, aliases: ['CRP', 'CRP, QUANT', 'CRP QUANT', 'CRP (C-REACTIVE PROTEIN)', 'C-Reactive Protein'] },
      { parameterName: 'β-HCG', unit: 'mIU/mL', referenceValue: 'Non-pregnant: < 5.0', normalMin: null, normalMax: 5.0, displayOrder: 14, defaultPrice: 1500, aliases: ['β-HCG', 'Beta-HCG', 'HCG', 'B-HCG', 'Beta HCG', 'β HCG'] },
      { parameterName: 'VIT-D', unit: 'ng/mL', referenceValue: '30–100', normalMin: 30, normalMax: 100, displayOrder: 15, defaultPrice: 1500, aliases: ['VIT-D', 'Vitamin D', 'VIT D', '25-OH Vitamin D', 'Vitamin D (25-OH)'] },
      { parameterName: 'ANA', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 16, defaultPrice: 1400, aliases: ['ANA', 'ANA Screen', 'Antinuclear Antibody'] }
    ]
  },

  // 6. SEROLOGY AND IMMUNOHEMATOLOGY
  {
    category: 'SEROLOGY AND IMMUNOHEMATOLOGY',
    subcategory: '',
    parameters: [
      { parameterName: 'HBsAg', unit: '', referenceValue: 'Non-Reactive', normalMin: null, normalMax: null, displayOrder: 1, defaultPrice: 350, aliases: ['HBs', 'HBsAg', 'HBsAg Test', 'Hepatitis B Surface Antigen'] },
      { parameterName: 'HCV', unit: '', referenceValue: 'Non-Reactive', normalMin: null, normalMax: null, displayOrder: 2, defaultPrice: 350, aliases: ['HCV', 'Anti-HCV', 'Hepatitis C Virus', 'HCV Ab'] },
      { parameterName: 'Rheumatoid Factor (RF)', unit: 'IU/mL', referenceValue: 'Negative (< 20)', normalMin: null, normalMax: null, displayOrder: 3, defaultPrice: 300, aliases: ['RF', 'Rheumatoid Factor', 'RF Test'] },
      { parameterName: 'HIV Test', unit: '', referenceValue: 'Non-Reactive', normalMin: null, normalMax: null, displayOrder: 4, defaultPrice: 300, aliases: ['HIV', 'HIV 1&2', 'HIV I & II', 'HIV Test'] },
      { parameterName: 'RPR / VDRL (Syphilis)', unit: '', referenceValue: 'Non-Reactive', normalMin: null, normalMax: null, displayOrder: 5, defaultPrice: 300, aliases: ['RPR / VDRL', 'VDRL', 'RPR', 'Syphilis', 'VDRL/RPR'] },
      { parameterName: 'ASO Titer (Tonsillitis)', unit: 'IU/mL', referenceValue: 'Negative (< 200)', normalMin: null, normalMax: null, displayOrder: 6, defaultPrice: 300, aliases: ['ASO', 'ASO Test', 'ASO Titer', 'Antistreptolysin O'] },
      { parameterName: 'Widal Test (Typhoid)', unit: '', referenceValue: 'Negative (< 1:80)', normalMin: null, normalMax: null, displayOrder: 7, defaultPrice: 250, aliases: ['Widal', 'Widal / H/O', 'Widal Test (H & O)', 'Widal Test', 'Widal-Weil Felix'] },
      { parameterName: 'Weil-Felix Test (Ox19)', unit: '', referenceValue: 'Negative (< 1:80)', normalMin: null, normalMax: null, displayOrder: 8, defaultPrice: 250, aliases: ['Weil-Felix 0x19', 'Weil-Felix Ox19', 'Weil Felix', 'Weli Flex (Typhus)', 'Weil-Felix'] },
      { parameterName: 'H. pylori Antibody', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 9, defaultPrice: 300, aliases: ['H. pylori Ab (Serum)', 'H. pylori Ab, serum', 'H. pylori Ab'] },
      { parameterName: 'H. pylori Antigen', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 10, defaultPrice: 300, aliases: ['H. pylori Ag (Stool)', 'H. pylori Ag stool', 'H. pylori Ag', 'H. Pylori Test'] },
      { parameterName: 'Direct Coombs Test', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 11, defaultPrice: 1300, aliases: ["Coomb's Test", 'Direct Coombs', 'DIRECT COOMBS', 'Direct Coombs Test'] },
      { parameterName: 'Indirect Coombs Test', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 12, defaultPrice: 1500, aliases: ['Indirect Coombs', 'Indirect Coombs Test', 'INDIRECT COOMBS TEST', 'INDIRECT ANTIGLOBULIN TEST', 'IAT'] },
      { parameterName: 'ANA SCREEN, IFA', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 13, defaultPrice: 1400, aliases: ['ANA', 'ANA SCREEN IFA', 'ANA SCREEN', 'ANA IFA', 'ANTINUCLEAR ANTIBODY SCREEN', 'ANA SCREEN TEST'] },
      { parameterName: 'C-Reactive Protein (CRP)', unit: 'mg/L', referenceValue: '0–10', normalMin: 0, normalMax: 10, displayOrder: 14, defaultPrice: 1300, aliases: ['CRP', 'C-REACTIVE PROTEIN', 'CRP Test'] }
    ]
  },

  // 7. BLOOD GROUP (Dedicated Category as requested in Section 12)
  {
    category: 'BLOOD GROUP',
    subcategory: '',
    parameters: [
      { parameterName: 'Blood Group & RH Type', unit: '', referenceValue: 'A/B/AB/O (Rh +/-)', normalMin: null, normalMax: null, displayOrder: 1, defaultPrice: 200, aliases: ['Blood Group', 'B/GROUP', 'BLOOD GROUP', 'Blood Group and RH', 'Blood Group & Rh Type', 'ABO & RH', 'ABO & Rh'] },
      { parameterName: 'Direct Coombs Test', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 2, defaultPrice: 1300, aliases: ["Coomb's Test", 'Direct Coombs', 'DIRECT COOMBS'] },
      { parameterName: 'Indirect Coombs Test', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 3, defaultPrice: 1500, aliases: ['Indirect Coombs', 'INDIRECT COOMBS TEST', 'IAT'] },
      { parameterName: 'Crossmatch', unit: '', referenceValue: 'Compatible', normalMin: null, normalMax: null, displayOrder: 4, defaultPrice: 500, aliases: ['Cross Matching', 'CROSSMATCH'] }
    ]
  },

  // 8. BLOOD SUGAR TEST (RBS/FBS) / DIABETIC (DM) CHECKUP
  {
    category: 'BLOOD SUGAR TEST (RBS/FBS) / DIABETIC (DM) CHECKUP',
    subcategory: '',
    parameters: [
      { parameterName: 'HbA1c', unit: '%', referenceValue: '0.0 – 6.5', normalMin: 0.0, normalMax: 6.5, displayOrder: 1, defaultPrice: 1300, aliases: ['HbA1C', 'HgbA1C', 'HbA1c (Glycated Hemoglobin)'] },
      { parameterName: 'Fasting Blood Glucose (FBS)', unit: 'mg/dL', referenceValue: '70 – 126', normalMin: 70.0, normalMax: 126.0, displayOrder: 2, defaultPrice: 150, aliases: ['FBS', 'Fasting Blood Glucose'] },
      { parameterName: 'Random Blood Sugar (RBS)', unit: 'mg/dL', referenceValue: '70 – 140', normalMin: 70.0, normalMax: 140.0, displayOrder: 3, defaultPrice: 150, aliases: ['RBS', 'Random Blood Sugar'] }
    ]
  },

  // 9. URINALYSIS
  {
    category: 'URINALYSIS',
    subcategory: 'Chemical Analysis',
    parameters: [
      { parameterName: 'Chemical Analysis', unit: '', referenceValue: 'Normal', normalMin: null, normalMax: null, displayOrder: 1, defaultPrice: 300, isBundle: true, billableIndividually: true, aliases: ['Urinalysis (Routine)', 'Urinalysis', 'Routine Urinalysis', 'Urine Analysis', 'URINALYSIS', 'Chemical Analysis', 'Routine Urine', 'Routine Urine Examination'] },
      { parameterName: 'Specific Gravity', unit: '', referenceValue: '1.005–1.030', normalMin: 1.005, normalMax: 1.030, displayOrder: 2, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Chemical Analysis' },
      { parameterName: 'Leukocyte Esterase', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 3, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Chemical Analysis' },
      { parameterName: 'pH', unit: '', referenceValue: '5.0–8.0', normalMin: 5.0, normalMax: 8.0, displayOrder: 4, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Chemical Analysis' },
      { parameterName: 'Nitrite', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 5, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Chemical Analysis' },
      { parameterName: 'Glucose', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 6, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Chemical Analysis' },
      { parameterName: 'Protein', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 7, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Chemical Analysis' },
      { parameterName: 'Blood', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 8, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Chemical Analysis' },
      { parameterName: 'Ketone', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 9, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Chemical Analysis' },
      { parameterName: 'Bilirubin', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 10, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Chemical Analysis' },
      { parameterName: 'Urobilinogen', unit: '', referenceValue: 'Normal (0.2–1.0 mg/dL)', normalMin: 0.2, normalMax: 1.0, displayOrder: 11, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Chemical Analysis' }
    ]
  },
  {
    category: 'URINALYSIS',
    subcategory: 'Pregnancy Test [HCG]',
    parameters: [
      { parameterName: 'Pregnancy Test (HCG)', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 12, defaultPrice: 200, isBundle: false, billableIndividually: true, includedInBundle: false, aliases: ['Pregnancy Test', 'Pregnancy Test (HCG)', 'Pregnancy Test [HCG]', 'HCG', 'Urine HCG', 'Urine Pregnancy Test', 'HCG (Urine)'] }
    ]
  },
  {
    category: 'URINALYSIS',
    subcategory: 'Urine Microscopy',
    parameters: [
      { parameterName: 'Urine Microscopy', unit: '', referenceValue: 'Normal', normalMin: null, normalMax: null, displayOrder: 13, defaultPrice: 300, isBundle: true, billableIndividually: true, aliases: ['Microscopy', 'Urine Microscopy', 'Microscopic Examination', 'Microscopic Exam'] },
      { parameterName: 'WBC', unit: 'HPF', referenceValue: '0–5 /HPF', normalMin: 0, normalMax: 5, displayOrder: 14, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Urine Microscopy' },
      { parameterName: 'RBC', unit: 'HPF', referenceValue: '0–2 /HPF', normalMin: 0, normalMax: 2, displayOrder: 15, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Urine Microscopy' },
      { parameterName: 'Epithelial Cells', unit: '/HPF', referenceValue: '0–5', normalMin: 0, normalMax: 5, displayOrder: 16, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Urine Microscopy' },
      { parameterName: 'WBC Casts', unit: '/LPF', referenceValue: 'None seen', normalMin: null, normalMax: null, displayOrder: 17, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Urine Microscopy' },
      { parameterName: 'RBC Casts', unit: '/LPF', referenceValue: 'None seen', normalMin: null, normalMax: null, displayOrder: 18, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Urine Microscopy' },
      { parameterName: 'Granular Casts', unit: '/LPF', referenceValue: 'None seen', normalMin: null, normalMax: null, displayOrder: 19, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Urine Microscopy' },
      { parameterName: 'Amorphous Phosphate Crystal', unit: '', referenceValue: 'None to Few', normalMin: null, normalMax: null, displayOrder: 20, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Urine Microscopy' },
      { parameterName: 'Amorphous Urate Crystal', unit: '', referenceValue: 'None to Few', normalMin: null, normalMax: null, displayOrder: 21, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Urine Microscopy' },
      { parameterName: 'Calcium Oxalate Crystal', unit: '', referenceValue: 'None to Few', normalMin: null, normalMax: null, displayOrder: 22, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Urine Microscopy' },
      { parameterName: 'Triple Phosphate Crystal', unit: '', referenceValue: 'None to Few', normalMin: null, normalMax: null, displayOrder: 23, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Urine Microscopy' },
      { parameterName: 'Bacteria', unit: '', referenceValue: 'None to Few', normalMin: null, normalMax: null, displayOrder: 24, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Urine Microscopy' },
      { parameterName: 'Others', unit: '', referenceValue: '—', normalMin: null, normalMax: null, displayOrder: 25, defaultPrice: 0, isBundle: false, billableIndividually: false, includedInBundle: true, parentBundle: 'Urine Microscopy' }
    ]
  },

  // 10. BACTERIOLOGY / PARASITOLOGY
  {
    category: 'BACTERIOLOGY / PARASITOLOGY',
    subcategory: '',
    parameters: [
      { parameterName: 'Gram Stain', unit: '', referenceValue: 'Normal Flora / No organisms', normalMin: null, normalMax: null, displayOrder: 1, defaultPrice: 200 },
      { parameterName: 'AFB (Sputum)', unit: '', referenceValue: 'Negative for AFB', normalMin: null, normalMax: null, displayOrder: 2, defaultPrice: 200 },
      { parameterName: 'KOH', unit: '', referenceValue: 'No fungal elements seen', normalMin: null, normalMax: null, displayOrder: 3, defaultPrice: 200 },
      { parameterName: 'Wet Mount', unit: '', referenceValue: 'No parasites seen', normalMin: null, normalMax: null, displayOrder: 4, defaultPrice: 200 },
      { parameterName: 'Stool Exam', unit: '', referenceValue: 'No ova/parasites seen', normalMin: null, normalMax: null, displayOrder: 5, defaultPrice: 300, aliases: ['Stool Examination', 'Routine Stool Exam'] },
      { parameterName: 'Blood Film', unit: '', referenceValue: 'No blood parasites seen', normalMin: null, normalMax: null, displayOrder: 6, defaultPrice: 200, aliases: ['Blood Film (Malaria)', 'Malaria Test', 'BF'] },
      { parameterName: 'H. pylori Ag (Stool)', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 7, defaultPrice: 300, aliases: ['H. pylori Ag stool', 'H. pylori Antigen', 'H. Pylori Stool'] }
    ]
  },

  // 11. SEMEN ANALYSIS
  {
    category: 'SEMEN ANALYSIS',
    subcategory: 'Physical Examination',
    parameters: [
      { parameterName: 'Semen Analysis (Complete)', unit: '', referenceValue: 'Normal', normalMin: null, normalMax: null, displayOrder: 1, defaultPrice: 500, aliases: ['Semen Analysis', 'Complete Semen Analysis'] },
      { parameterName: 'TIME OF COLLECTION', unit: '', referenceValue: 'Morning collection time if applicable', normalMin: null, normalMax: null, displayOrder: 2, defaultPrice: 500 },
      { parameterName: 'ABSTINENCE TIME (DAY)', unit: 'days', referenceValue: '2 – 7 days', normalMin: 2, normalMax: 7, displayOrder: 3, defaultPrice: 500 },
      { parameterName: 'Volume', unit: 'mL', referenceValue: '≥ 1.5', normalMin: 1.5, normalMax: null, displayOrder: 4, defaultPrice: 500 },
      { parameterName: 'COLOUR', unit: '', referenceValue: 'Homogenous grey opalescent', normalMin: null, normalMax: null, displayOrder: 5, defaultPrice: 500 },
      { parameterName: 'Viscosity', unit: '', referenceValue: 'Normal (< 2 cm thread)', normalMin: null, normalMax: null, displayOrder: 6, defaultPrice: 500 },
      { parameterName: 'LIQUEFACTION', unit: 'minutes', referenceValue: '<= 60 MINUTES', normalMin: null, normalMax: 60, displayOrder: 7, defaultPrice: 500 }
    ]
  },
  {
    category: 'SEMEN ANALYSIS',
    subcategory: 'BIOCHEMICAL Examination',
    parameters: [
      { parameterName: 'REACTION / PH', unit: 'pH', referenceValue: '7.2 – 8.2', normalMin: 7.2, normalMax: 8.2, displayOrder: 8, defaultPrice: 500 },
      { parameterName: 'SEMEN PROTEIN', unit: '', referenceValue: 'PRESENT', normalMin: null, normalMax: null, displayOrder: 9, defaultPrice: 500 }
    ]
  },
  {
    category: 'SEMEN ANALYSIS',
    subcategory: 'Microscopic Examination',
    parameters: [
      { parameterName: 'Sperm Count', unit: 'M/mL', referenceValue: '≥ 15', normalMin: 15, normalMax: null, displayOrder: 10, defaultPrice: 500 },
      { parameterName: 'AGGLUTINATION', unit: '', referenceValue: 'ABSENT', normalMin: null, normalMax: null, displayOrder: 11, defaultPrice: 500 },
      { parameterName: 'Motility', unit: '%', referenceValue: '≥ 40', normalMin: 40, normalMax: null, displayOrder: 12, defaultPrice: 500 },
      { parameterName: 'PROGRESSIVE MOTILITY', unit: '%', referenceValue: '>=32%', normalMin: 32, normalMax: null, displayOrder: 13, defaultPrice: 500 },
      { parameterName: 'NON-PROGRESSIVE MOTILITY', unit: '%', referenceValue: '>=40%', normalMin: 40, normalMax: null, displayOrder: 14, defaultPrice: 500 },
      { parameterName: 'TOTAL MOTILITY (P + NP)', unit: '%', referenceValue: '>40%', normalMin: 40, normalMax: null, displayOrder: 15, defaultPrice: 500 },
      { parameterName: 'NON-MOTILITY', unit: '%', referenceValue: '<40%', normalMin: null, normalMax: 40, displayOrder: 16, defaultPrice: 500 },
      { parameterName: 'Morphology', unit: '% Normal', referenceValue: '≥ 4', normalMin: 4, normalMax: null, displayOrder: 17, defaultPrice: 500 },
      { parameterName: 'NORMAL FORMS', unit: '%', referenceValue: '>=4%', normalMin: 4, normalMax: null, displayOrder: 18, defaultPrice: 500 },
      { parameterName: 'ABNORMAL FORMS', unit: '%', referenceValue: '', normalMin: null, normalMax: null, displayOrder: 19, defaultPrice: 500 },
      { parameterName: 'SPERM VITALITY', unit: '%', referenceValue: '>=58%', normalMin: 58, normalMax: null, displayOrder: 20, defaultPrice: 500 }
    ]
  },
  {
    category: 'SEMEN ANALYSIS',
    subcategory: 'Other findings',
    parameters: [
      { parameterName: 'PUS CELLS', unit: '', referenceValue: '1 – 2', normalMin: 1, normalMax: 2, displayOrder: 21, defaultPrice: 500 },
      { parameterName: 'EPITHELIAL CELLS', unit: '/HPF', referenceValue: '1 – 2 /HPF', normalMin: 1, normalMax: 2, displayOrder: 22, defaultPrice: 500 },
      { parameterName: 'RBC', unit: '', referenceValue: '0 - 2', normalMin: 0, normalMax: 2, displayOrder: 23, defaultPrice: 500 }
    ]
  },

  // 12. STOOL EXAMINATION
  {
    category: 'STOOL EXAMINATION',
    subcategory: '',
    parameters: [
      { parameterName: 'Routine Stool Examination', unit: '', referenceValue: 'No ova or parasite seen', normalMin: null, normalMax: null, displayOrder: 1, defaultPrice: 300, aliases: ['Stool Examination', 'Routine Stool Exam', 'Stool Exam'] },
      { parameterName: 'CONSISTENCY', unit: '', referenceValue: '', normalMin: null, normalMax: null, displayOrder: 2, defaultPrice: 300, aliases: ['CONSISTENCY', 'Consistency', 'Stool Consistency'] },
      { parameterName: 'OVA & PARASITE EXAM — NOTE', unit: '', referenceValue: '', normalMin: null, normalMax: null, displayOrder: 3, defaultPrice: 300, aliases: ['OVA & PARASITE EXAM — NOTE', 'OVA & PARASITE EXAM - NOTE', 'OVA & PARASITE NOTE'] }
    ]
  },

  // 13. URINE AND BODY FLUID ANALYSIS
  {
    category: 'URINE AND BODY FLUID ANALYSIS',
    subcategory: 'PHYSICAL EXAMINATION',
    parameters: [
      { parameterName: 'Body Fluid Analysis (BF)', unit: '', referenceValue: 'CLEAR', normalMin: null, normalMax: null, displayOrder: 1, defaultPrice: 300, aliases: ['BF', 'Body Fluid', 'BF / Body Fluid', 'Body Fluid Analysis', 'Fluid Analysis'] },
      { parameterName: '24 HR PROTEIN', unit: 'mg/24 hr', referenceValue: 'AT REST <= 80 mg/24 hours', normalMin: null, normalMax: 80, displayOrder: 2, defaultPrice: 1400, aliases: ['24hr Urine Protein', '24 HR PROTEIN', '24 HOUR PROTEIN', '24-HOUR PROTEIN', 'URINE PROTEIN 24 HOUR', '24H PROTEIN', '24-HR PROTEIN'] },
      { parameterName: 'APPEARANCE', unit: '', referenceValue: 'CLEAR', normalMin: null, normalMax: null, displayOrder: 3, defaultPrice: 300 },
      { parameterName: 'VOLUME OVER 24 HOUR (V)', unit: 'liter', referenceValue: '>= 1.5 liter', normalMin: 1.5, normalMax: null, displayOrder: 4, defaultPrice: 1400 },
      { parameterName: 'COLOUR', unit: '', referenceValue: 'CLEAR', normalMin: null, normalMax: null, displayOrder: 5, defaultPrice: 300 },
      { parameterName: 'VISCOSITY', unit: '', referenceValue: 'NORMAL', normalMin: null, normalMax: null, displayOrder: 6, defaultPrice: 300 }
    ]
  },
  {
    category: 'URINE AND BODY FLUID ANALYSIS',
    subcategory: 'BIOCHEMICAL EXAMINATION',
    parameters: [
      { parameterName: 'PROTEIN', unit: 'g/dL', referenceValue: '0.3 – 4.0 g/dL', normalMin: 0.3, normalMax: 4.0, displayOrder: 7, defaultPrice: 300 },
      { parameterName: 'GLUCOSE', unit: 'mg/dL', referenceValue: '33 – 140 mg/dL', normalMin: 33, normalMax: 140, displayOrder: 8, defaultPrice: 300 },
      { parameterName: 'LDH', unit: 'U/L', referenceValue: '< 0.6 U/L', normalMin: null, normalMax: 0.6, displayOrder: 9, defaultPrice: 700 },
      { parameterName: 'TPC', unit: 'mg/dL', referenceValue: '5.3 – 8.9', normalMin: 5.3, normalMax: 8.9, displayOrder: 10, defaultPrice: 300 },
      { parameterName: 'TWBC', unit: '/µL', referenceValue: '0–200', normalMin: 0, normalMax: 200, displayOrder: 11, defaultPrice: 300 },
      { parameterName: 'Lymphocyte %', unit: '%', referenceValue: '40–80', normalMin: 40, normalMax: 80, displayOrder: 12, defaultPrice: 300 },
      { parameterName: 'Neutrophil %', unit: '%', referenceValue: '0–25', normalMin: 0, normalMax: 25, displayOrder: 13, defaultPrice: 300 }
    ]
  },
  {
    category: 'URINE AND BODY FLUID ANALYSIS',
    subcategory: 'OTHER',
    parameters: [
      { parameterName: 'WBC CELL COUNT', unit: 'cells/microL', referenceValue: '<250 cells/microL', normalMin: null, normalMax: 250, displayOrder: 14, defaultPrice: 300 },
      { parameterName: 'NEUTROPHIL %', unit: '%', referenceValue: '', normalMin: null, normalMax: null, displayOrder: 15, defaultPrice: 300 },
      { parameterName: 'LYMPHOCYTE %', unit: '%', referenceValue: '', normalMin: null, normalMax: null, displayOrder: 16, defaultPrice: 300 },
      { parameterName: 'MID %', unit: '%', referenceValue: '', normalMin: null, normalMax: null, displayOrder: 17, defaultPrice: 300 },
      { parameterName: 'GRAM STAINING', unit: '', referenceValue: 'NO GRAM REACTION', normalMin: null, normalMax: null, displayOrder: 18, defaultPrice: 200 },
      { parameterName: 'AFB', unit: '', referenceValue: 'Negative for AFB', normalMin: null, normalMax: null, displayOrder: 19, defaultPrice: 200 }
    ]
  },

  // 14. REFERRAL
  {
    category: 'REFERRAL',
    subcategory: '',
    parameters: [
      { parameterName: 'CA-125', unit: 'U/mL', referenceValue: '0 – 35', normalMin: 0, normalMax: 35, displayOrder: 1, defaultPrice: 1500 },
      { parameterName: 'CA-19-9', unit: 'U/mL', referenceValue: '0 – 37', normalMin: 0, normalMax: 37, displayOrder: 2, defaultPrice: 1500, aliases: ['CA-19', 'CA 19-9'] },
      { parameterName: 'ANTI MULLERIAN HORMONE', unit: 'ng/mL', referenceValue: '1.0 – 4.0', normalMin: 1.0, normalMax: 4.0, displayOrder: 3, defaultPrice: 2000, aliases: ['AMH', 'Anti-Mullerian Hormone'] },
      { parameterName: 'ANA Titer 1100', unit: 'Titer', referenceValue: '< 1:160', normalMin: null, normalMax: null, displayOrder: 4, defaultPrice: 1400, aliases: ['ANA Titer', 'ANA Titer 1:100'] },
      { parameterName: 'Anti dsDNA', unit: 'IU/mL', referenceValue: '< 30', normalMin: null, normalMax: 30, displayOrder: 5, defaultPrice: 1500, aliases: ['Anti-dsDNA', 'dsDNA'] },
      { parameterName: 'ANTI CYCLIC CITRULLINATATED PEPTIDE 2000', unit: 'U/mL', referenceValue: '< 20', normalMin: null, normalMax: 20, displayOrder: 6, defaultPrice: 2000, aliases: ['Anti-CCP', 'Anti CCP'] },
      { parameterName: 'CA 15-3', unit: 'U/mL', referenceValue: '0 – 30', normalMin: 0, normalMax: 30, displayOrder: 7, defaultPrice: 1500, aliases: ['CA 15.3', 'CA-15-3'] },
      { parameterName: 'CD4', unit: 'cells/µL', referenceValue: '500 – 1500', normalMin: 500, normalMax: 1500, displayOrder: 8, defaultPrice: 1000, aliases: ['CD4 Count'] },
      { parameterName: 'Cortisol Serum', unit: 'µg/dL', referenceValue: '6.0 – 23.0', normalMin: 6.0, normalMax: 23.0, displayOrder: 9, defaultPrice: 1500, aliases: ['Serum Cortisol', 'Cortisol'] },
      { parameterName: 'Ferratin or Folate', unit: 'ng/mL', referenceValue: '12 – 300', normalMin: 12, normalMax: 300, displayOrder: 10, defaultPrice: 1200, aliases: ['Ferritin', 'Folate', 'Ferratin'] },
      { parameterName: 'HBV Viral Load', unit: 'IU/mL', referenceValue: 'Undetectable (< 20)', normalMin: null, normalMax: 20, displayOrder: 11, defaultPrice: 3500, aliases: ['HBV DNA Quantitative', 'HBV DNA'] },
      { parameterName: 'HCV Viral Load', unit: 'IU/mL', referenceValue: 'Undetectable (< 15)', normalMin: null, normalMax: 15, displayOrder: 12, defaultPrice: 3500, aliases: ['HCV RNA Quantitative', 'HCV RNA'] },
      { parameterName: 'HCV Genotype', unit: '', referenceValue: 'Reported by Genotype (1-6)', normalMin: null, normalMax: null, displayOrder: 13, defaultPrice: 4000 },
      { parameterName: 'Hepatitis C Screen', unit: '', referenceValue: 'Non-Reactive', normalMin: null, normalMax: null, displayOrder: 14, defaultPrice: 350, aliases: ['HCV Screen', 'Anti-HCV'] },
      { parameterName: 'HIV Viral Load', unit: 'copies/mL', referenceValue: 'Undetectable (< 20)', normalMin: null, normalMax: 20, displayOrder: 15, defaultPrice: 3500, aliases: ['HIV-1 Viral Load', 'HIV RNA'] },
      { parameterName: 'HIV 1 RNA Quantitative', unit: 'copies/mL', referenceValue: 'Undetectable (< 20)', normalMin: null, normalMax: 20, displayOrder: 16, defaultPrice: 3500, aliases: ['HIV 1 RNA'] },
      { parameterName: 'PTH', unit: 'pg/mL', referenceValue: '15 – 65', normalMin: 15, normalMax: 65, displayOrder: 17, defaultPrice: 2000, aliases: ['Parathyroid Hormone', 'PTH Serum'] },
      { parameterName: 'Testosterone', unit: 'ng/dL', referenceValue: 'Male: 300 – 1000 | Female: 15 – 70', normalMin: 15, normalMax: 1000, displayOrder: 18, defaultPrice: 1500 },
      { parameterName: 'Vitamin B12', unit: 'pg/mL', referenceValue: '200 – 900', normalMin: 200, normalMax: 900, displayOrder: 19, defaultPrice: 1500, aliases: ['Vit B12', 'B12'] }
    ]
  }
];

export async function seedParameterCatalog(force = false) {
  try {
    if (!force) {
      const referralCount = await LabTestParameter.countDocuments({ category: { $in: ['REFERRAL', 'REFERRAL TESTS'] } });
      const ft3Exists = await LabTestParameter.findOne({ category: 'HORMONE', parameterName: /ft3/i });
      const ft4Exists = await LabTestParameter.findOne({ category: 'HORMONE', parameterName: /ft4/i });
      const fshExists = await LabTestParameter.findOne({ category: 'HORMONE', parameterName: /^FSH$/i });
      const bloodGroupExists = await LabTestParameter.findOne({ category: 'BLOOD GROUP' });
      const magnesiumExists = await LabTestParameter.findOne({
        category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
        parameterName: /^magnesium$/i
      });
      const urineHcgExists = await LabTestParameter.findOne({
        category: 'URINALYSIS',
        parameterName: /pregnancy test/i,
        subcategory: 'Pregnancy Test [HCG]'
      });
      const totalCount = await LabTestParameter.countDocuments();
      if (totalCount > 0 && referralCount > 0 && ft3Exists && ft4Exists && fshExists && bloodGroupExists && magnesiumExists && urineHcgExists) return;
    }
    let count = 0;
    let fallbackOrder = 1;

    // Migrate old category fields in DB
    await LabTestParameter.updateMany(
      { category: { $in: ['SEROLOGY', 'IMMUNOHEMATOLOGY', 'SEROLOGY & IMMUNOHEMATOLOGY', 'SEROLOGICAL TESTS'] } },
      { $set: { category: 'SEROLOGY AND IMMUNOHEMATOLOGY' } }
    );
    await LabTestParameter.updateMany(
      { category: { $in: ['CLINICAL CHEMISTRY', 'CLINICAL CHEMISTRY TESTS', 'CHEMISTRY'] } },
      { $set: { category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS' } }
    );
    await LabTestParameter.updateMany(
      { category: { $in: ['BODY FLUID ANALYSIS', 'BODY FLUID'] } },
      { $set: { category: 'URINE AND BODY FLUID ANALYSIS' } }
    );

    // Update Pregnancy Test (HCG) in URINALYSIS to subcategory 'Pregnancy Test [HCG]' and price 200
    await LabTestParameter.updateMany(
      { category: 'URINALYSIS', parameterName: /pregnancy test/i },
      {
        $set: {
          subcategory: 'Pregnancy Test [HCG]',
          defaultPrice: 200
        }
      }
    );

    // Update any Urine Microscopy parameters incorrectly set to 800 to 300 ETB
    await LabTestParameter.updateMany(
      {
        $or: [
          { category: 'URINALYSIS', parameterName: { $not: /pregnancy test/i } },
          { subcategory: /urine microscopy|microscopy/i },
          { parameterName: /urine microscopy|microscopic/i }
        ],
        defaultPrice: { $in: [800, '800'] }
      },
      { $set: { defaultPrice: 300 } }
    );

    // Update any existing Magnesium parameter in any category to Clinical Chemistry with reference range 1.6 - 2.6
    await LabTestParameter.updateMany(
      { parameterName: new RegExp('^magnesium$', 'i') },
      {
        $set: {
          category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
          subcategory: 'OTHER CHEMISTRY TESTS',
          referenceValue: '1.6 - 2.6',
          normalMin: 1.6,
          normalMax: 2.6,
          displayOrder: 38
        }
      }
    );

    for (const catGroup of MASTER_LAB_CATEGORIES) {
      if (['HEMATOLOGY', 'SEROLOGY AND IMMUNOHEMATOLOGY', 'BLOOD SUGAR TEST (RBS/FBS) / DIABETIC (DM) CHECKUP', 'SERUM ELECTROLYTE', 'STOOL EXAMINATION', 'HORMONE', 'BLOOD GROUP'].includes(catGroup.category)) {
        const validNames = catGroup.parameters.map(p => p.parameterName);
        await LabTestParameter.deleteMany({
          category: catGroup.category,
          parameterName: { $nin: validNames }
        });
      }

      for (const p of catGroup.parameters) {
        const order = p.displayOrder || fallbackOrder++;
        const searchNames = [p.parameterName, ...(p.aliases || [])];
        const targetSubcat = catGroup.subcategory || p.subcategory || '';
        const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        let existing = await LabTestParameter.findOne({
          category: catGroup.category,
          $or: searchNames.map(n => ({ parameterName: new RegExp(`^${escapeRegex(n)}$`, 'i') }))
        });

        if (!existing) {
          existing = await LabTestParameter.findOne({
            $or: searchNames.map(n => ({ parameterName: new RegExp(`^${escapeRegex(n)}$`, 'i') }))
          });
        }

        if (existing) {
          existing.parameterName = p.parameterName;
          existing.category = catGroup.category;
          existing.subcategory = targetSubcat;
          existing.unit = p.unit || '';
          if (!existing.referenceValue || force || p.parameterName === 'Magnesium') existing.referenceValue = p.referenceValue || '';
          if (existing.normalMin === null || force || p.parameterName === 'Magnesium') existing.normalMin = p.normalMin ?? null;
          if (existing.normalMax === null || force || p.parameterName === 'Magnesium') existing.normalMax = p.normalMax ?? null;
          existing.displayOrder = order;
          existing.editable = true;
          existing.status = 'Active';
          await existing.save();
        } else {
          await LabTestParameter.create({
            parameterName: p.parameterName,
            category: catGroup.category,
            subcategory: targetSubcat,
            unit: p.unit || '',
            referenceValue: p.referenceValue || '',
            normalMin: p.normalMin ?? null,
            normalMax: p.normalMax ?? null,
            displayOrder: order,
            editable: true,
            status: 'Active'
          });
        }
        count++;
      }
    }

    if (count > 0) {
      console.log(`Seeded/updated ${count} master laboratory parameters into MongoDB catalog.`);
    }
  } catch (error) {
    console.error('Error seeding LabTestParameter catalog:', error.message);
  }
}
