import LabTestParameter from '../models/LabTestParameter.js';

export const MASTER_LAB_CATEGORIES = [
  {
    category: 'HEMATOLOGY',
    subcategory: 'CBC',
    parameters: [
      { parameterName: 'RED BLOOD CELL COUNT (RBC)', unit: 'x10^6/µL', referenceValue: 'Male: 4.73 – 5.49 | Female: 4.20 – 5.40', normalMin: 4.20, normalMax: 5.49, displayOrder: 1 },
      { parameterName: 'HEMOGLOBIN (HGB)', unit: 'g/dL', referenceValue: 'Male: 14.4 – 16.6 | Female: 12.0 – 15.0', normalMin: 12.0, normalMax: 16.6, displayOrder: 2 },
      { parameterName: 'HEMATOCRIT (HCT)', unit: '%', referenceValue: 'Male: 42.9 – 49.9 | Female: 36 – 46', normalMin: 36.0, normalMax: 49.9, displayOrder: 3 },
      { parameterName: 'MCV', unit: 'fL', referenceValue: '80 – 100', normalMin: 80.0, normalMax: 100.0, displayOrder: 4 },
      { parameterName: 'MCH', unit: 'pg', referenceValue: '25 – 36', normalMin: 25.0, normalMax: 36.0, displayOrder: 5 },
      { parameterName: 'MCHC', unit: 'g/dL', referenceValue: '31 – 37', normalMin: 31.0, normalMax: 37.0, displayOrder: 6 },
      { parameterName: 'PLATELET COUNT', unit: 'x10^3/µL', referenceValue: '140 – 415', normalMin: 140.0, normalMax: 415.0, displayOrder: 7 },
      { parameterName: 'NEUTROPHILS', unit: '%', referenceValue: '40 – 74', normalMin: 40.0, normalMax: 74.0, displayOrder: 8 },
      { parameterName: 'LYMPHOCYTES', unit: '%', referenceValue: '14 – 46', normalMin: 14.0, normalMax: 46.0, displayOrder: 9 },
      { parameterName: 'MONOCYTES', unit: '%', referenceValue: '4 – 13', normalMin: 4.0, normalMax: 13.0, displayOrder: 10 },
      { parameterName: 'EOSINOPHILS', unit: '%', referenceValue: '0 – 7', normalMin: 0.0, normalMax: 7.0, displayOrder: 11 },
      { parameterName: 'BASOPHILS', unit: '%', referenceValue: '0 – 3', normalMin: 0.0, normalMax: 3.0, displayOrder: 12 },
      { parameterName: 'NEUTROPHIL ABSOLUTE', unit: 'x10^3/µL', referenceValue: '1.8 – 7.8', normalMin: 1.8, normalMax: 7.8, displayOrder: 13 },
      { parameterName: 'LYMPHOCYTE ABSOLUTE', unit: 'x10^3/µL', referenceValue: '0.7 – 4.5', normalMin: 0.7, normalMax: 4.5, displayOrder: 14 },
      { parameterName: 'MONOCYTE ABSOLUTE', unit: 'x10^3/µL', referenceValue: '0.1 – 1.0', normalMin: 0.1, normalMax: 1.0, displayOrder: 15 },
      { parameterName: 'EOSINOPHIL ABSOLUTE', unit: 'x10^3/µL', referenceValue: '0.0 – 0.4', normalMin: 0.0, normalMax: 0.4, displayOrder: 16 },
      { parameterName: 'BASOPHIL ABSOLUTE', unit: 'x10^3/µL', referenceValue: '0.0 – 0.2', normalMin: 0.0, normalMax: 0.2, displayOrder: 17 }
    ]
  },
  {
    category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
    subcategory: 'LIPID PROFILE',
    parameters: [
      { parameterName: 'Total Cholesterol', unit: 'mg/dL', referenceValue: '0–200', normalMin: 0, normalMax: 200, displayOrder: 1, aliases: ['TOTAL CHOLESTEROL'] },
      { parameterName: 'HDL Cholesterol', unit: 'mg/dL', referenceValue: '40–60', normalMin: 40, normalMax: 60, displayOrder: 2, aliases: ['HDL', 'HDL CHOLESTEROL'] },
      { parameterName: 'LDL Cholesterol', unit: 'mg/dL', referenceValue: '0–130', normalMin: 0, normalMax: 130, displayOrder: 3, aliases: ['LDL', 'LDL CHOLESTEROL'] },
      { parameterName: 'Triglycerides', unit: 'mg/dL', referenceValue: '0–150', normalMin: 0, normalMax: 150, displayOrder: 4, aliases: ['Triglyceride', 'TRIGLYCERIDES'] },
      { parameterName: 'LDL/HDL Ratio', unit: 'Ratio', referenceValue: '0.0–3.5', normalMin: 0, normalMax: 3.5, displayOrder: 5, aliases: ['LDL/HDL RATIO'] },
      { parameterName: 'VLDL Cholesterol', unit: 'mg/dL', referenceValue: '2–30', normalMin: 2, normalMax: 30, displayOrder: 6, aliases: ['VLDL', 'VLDL CHOLESTEROL'] },
      { parameterName: 'Total Cholesterol / HDL Ratio', unit: 'Ratio', referenceValue: '0.0–5.0', normalMin: 0, normalMax: 5.0, displayOrder: 7, aliases: ['Total Cholesterol/HDL Ratio', 'TOTAL CHOLESTEROL / HDL RATIO'] },
      { parameterName: 'Non-HDL Cholesterol', unit: 'mg/dL', referenceValue: '0–130', normalMin: 0, normalMax: 130, displayOrder: 8, aliases: ['NON-HDL CHOLESTEROL'] }
    ]
  },
  {
    category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
    subcategory: 'RENAL FUNCTION TESTS',
    parameters: [
      { parameterName: 'Urea', unit: 'mg/dL', referenceValue: '15–45', normalMin: 15, normalMax: 45, displayOrder: 9, aliases: ['UREA'] },
      { parameterName: 'Creatinine, Serum', unit: 'mg/dL', referenceValue: '0.7–1.20', normalMin: 0.7, normalMax: 1.20, displayOrder: 10, aliases: ['Creatinine', 'CREATININE, SERUM', 'Serum Creatinine'] },
      { parameterName: 'eGFR', unit: 'mL/min/1.73m²', referenceValue: '90–120', normalMin: 90, normalMax: 120, displayOrder: 11, aliases: ['eGFR'] },
      { parameterName: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', referenceValue: '7–20', normalMin: 7, normalMax: 20, displayOrder: 12, aliases: ['BUN', 'BLOOD UREA NITROGEN (BUN)'] },
      { parameterName: 'BUN/Creatinine Ratio', unit: 'Ratio', referenceValue: '10–20', normalMin: 10, normalMax: 20, displayOrder: 13, aliases: ['BUN/CREATININE RATIO'] },
      { parameterName: 'Sodium (Na+)', unit: 'mmol/L', referenceValue: '135–145', normalMin: 135, normalMax: 145, displayOrder: 14, aliases: ['Sodium', 'Na+', 'SODIUM (Na+)'] },
      { parameterName: 'Potassium (K+)', unit: 'mmol/L', referenceValue: '3.5–5.1', normalMin: 3.5, normalMax: 5.1, displayOrder: 15, aliases: ['Potassium', 'K+', 'POTASSIUM (K+)'] },
      { parameterName: 'Chloride (Cl−)', unit: 'mmol/L', referenceValue: '98–107', normalMin: 98, normalMax: 107, displayOrder: 16, aliases: ['Chloride', 'Cl-', 'CHLORIDE (Cl−)'] },
      { parameterName: 'Bicarbonate (HCO3−)', unit: 'mmol/L', referenceValue: '22–29', normalMin: 22, normalMax: 29, displayOrder: 17, aliases: ['Bicarbonate', 'HCO3-', 'BICARBONATE (HCO3−)'] },
      { parameterName: 'Calcium', unit: 'mg/dL', referenceValue: '8.5–10.5', normalMin: 8.5, normalMax: 10.5, displayOrder: 18, aliases: ['Total Calcium', 'CALCIUM'] },
      { parameterName: 'Phosphorus', unit: 'mg/dL', referenceValue: '2.5–4.5', normalMin: 2.5, normalMax: 4.5, displayOrder: 19, aliases: ['Phosphate', 'PHOSPHORUS'] }
    ]
  },
  {
    category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
    subcategory: 'LIVER FUNCTION TEST',
    parameters: [
      { parameterName: 'Total Protein', unit: 'g/dL', referenceValue: '6.0–8.0', normalMin: 6.0, normalMax: 8.0, displayOrder: 20, aliases: ['TOTAL PROTEIN'] },
      { parameterName: 'Albumin', unit: 'g/dL', referenceValue: '3.8–4.2', normalMin: 3.8, normalMax: 4.2, displayOrder: 21, aliases: ['ALBUMIN'] },
      { parameterName: 'Globulin', unit: 'g/dL', referenceValue: '2.0–3.2', normalMin: 2.0, normalMax: 3.2, displayOrder: 22, aliases: ['GLOBULIN'] },
      { parameterName: 'A/G Ratio', unit: 'Ratio', referenceValue: '1.1–2.2', normalMin: 1.1, normalMax: 2.2, displayOrder: 23, aliases: ['Albumin/Globulin Ratio (A/G Ratio)', 'A/G RATIO'] },
      { parameterName: 'Total Bilirubin', unit: 'mg/dL', referenceValue: '0.2–1.0', normalMin: 0.2, normalMax: 1.0, displayOrder: 24, aliases: ['TOTAL BILIRUBIN'] },
      { parameterName: 'Direct Bilirubin', unit: 'mg/dL', referenceValue: '0.0–0.3', normalMin: 0.0, normalMax: 0.3, displayOrder: 25, aliases: ['DIRECT BILIRUBIN'] },
      { parameterName: 'Indirect Bilirubin', unit: 'mg/dL', referenceValue: '0.2–0.8', normalMin: 0.2, normalMax: 0.8, displayOrder: 26, aliases: ['INDIRECT BILIRUBIN'] },
      { parameterName: 'Alkaline Phosphatase (ALP)', unit: 'IU/L', referenceValue: '30–120', normalMin: 30, normalMax: 120, displayOrder: 27, aliases: ['ALP', 'ALKALINE PHOSPHATASE (ALP)'] },
      { parameterName: 'AST (SGOT)', unit: 'IU/L', referenceValue: '0–37', normalMin: 0, normalMax: 37, displayOrder: 28, aliases: ['AST/GOT', 'GOT', 'AST', 'AST (SGOT)'] },
      { parameterName: 'ALT (SGPT)', unit: 'IU/L', referenceValue: '0–55', normalMin: 0, normalMax: 55, displayOrder: 29, aliases: ['ALT/GPT', 'GPT', 'ALT', 'ALT (SGPT)'] },
      { parameterName: 'Gamma GT (GGT)', unit: 'IU/L', referenceValue: '9–48', normalMin: 9, normalMax: 48, displayOrder: 30, aliases: ['GGT', 'GAMMA GT (GGT)'] },
      { parameterName: 'GOT', unit: 'IU/L', referenceValue: '12–64', normalMin: 12, normalMax: 64, displayOrder: 31, aliases: ['GOT'] }
    ]
  },
  {
    category: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
    subcategory: 'OTHER CHEMISTRY TESTS',
    parameters: [
      { parameterName: 'Lactate Dehydrogenase (LDH)', unit: 'U/L', referenceValue: '125–220', normalMin: 125, normalMax: 220, displayOrder: 32, aliases: ['LDH', 'LACTATE DEHYDROGENASE (LDH)'] },
      { parameterName: 'Uric Acid', unit: 'mg/dL', referenceValue: '3.5–7.2', normalMin: 3.5, normalMax: 7.2, displayOrder: 33, aliases: ['URIC ACID'] },
      { parameterName: 'Iron', unit: 'µg/dL', referenceValue: '59–158', normalMin: 59, normalMax: 158, displayOrder: 34, aliases: ['IRON'] },
      { parameterName: 'Ferritin', unit: 'ng/mL', referenceValue: '12–300', normalMin: 12, normalMax: 300, displayOrder: 35, aliases: ['FERRITIN'] },
      { parameterName: 'Total Iron Binding Capacity (TIBC)', unit: 'µg/dL', referenceValue: '240–450', normalMin: 240, normalMax: 450, displayOrder: 36, aliases: ['TIBC', 'TOTAL IRON BINDING CAPACITY (TIBC)'] },
      { parameterName: 'Unsaturated Iron Binding Capacity (UIBC)', unit: 'µg/dL', referenceValue: '110–370', normalMin: 110, normalMax: 370, displayOrder: 37, aliases: ['UIBC', 'UNSATURATED IRON BINDING CAPACITY (UIBC)'] },
      { parameterName: 'Transferrin Saturation', unit: '%', referenceValue: '20–50', normalMin: 20, normalMax: 50, displayOrder: 38, aliases: ['TRANSFERRIN SATURATION'] },
      { parameterName: 'Amylase', unit: 'U/L', referenceValue: '30–110', normalMin: 30, normalMax: 110, displayOrder: 39, aliases: ['AMYLASE'] },
      { parameterName: 'Lipase', unit: 'U/L', referenceValue: '10–140', normalMin: 10, normalMax: 140, displayOrder: 40, aliases: ['LIPASE'] },
      { parameterName: 'CK (Creatine Kinase)', unit: 'U/L', referenceValue: '24–195', normalMin: 24, normalMax: 195, displayOrder: 41, aliases: ['CK', 'CK (CREATINE KINASE)'] },
      { parameterName: 'CK-MB', unit: 'U/L', referenceValue: '0–25', normalMin: 0, normalMax: 25, displayOrder: 42, aliases: ['CK-MB'] },
      { parameterName: 'Troponin I', unit: 'ng/mL', referenceValue: '0.00–0.04', normalMin: 0.0, normalMax: 0.04, displayOrder: 43, aliases: ['Troponin', 'TROPONIN I'] },
      { parameterName: 'Troponin T', unit: 'ng/mL', referenceValue: '0.00–0.01', normalMin: 0.0, normalMax: 0.01, displayOrder: 44, aliases: ['TROPONIN T'] },
      { parameterName: 'Magnesium', unit: 'mg/dL', referenceValue: '1.7–2.2', normalMin: 1.7, normalMax: 2.2, displayOrder: 45, aliases: ['MAGNESIUM'] },
      { parameterName: 'Phosphate', unit: 'mg/dL', referenceValue: '2.5–4.5', normalMin: 2.5, normalMax: 4.5, displayOrder: 46, aliases: ['PHOSPHATE'] },
      { parameterName: 'C-Reactive Protein (CRP)', unit: 'mg/L', referenceValue: '0–5', normalMin: 0, normalMax: 5, displayOrder: 47, aliases: ['CRP', 'C-REACTIVE PROTEIN (CRP)'] },
      { parameterName: 'High-Sensitivity CRP (hs-CRP)', unit: 'mg/L', referenceValue: '0.0–3.0', normalMin: 0.0, normalMax: 3.0, displayOrder: 48, aliases: ['hs-CRP', 'HIGH-SENSITIVITY CRP (hs-CRP)'] }
    ]
  },
  {
    category: 'COAGULATION TEST',
    subcategory: '',
    parameters: [
      { parameterName: 'PT', unit: 'seconds', referenceValue: '11.0–13.5', normalMin: 11.0, normalMax: 13.5 },
      { parameterName: 'INR', unit: '', referenceValue: '0.8–1.2', normalMin: 0.8, normalMax: 1.2 },
      { parameterName: 'APTT', unit: 'seconds', referenceValue: '25.0–35.0', normalMin: 25.0, normalMax: 35.0 },
      { parameterName: 'Bleeding Time', unit: 'minutes', referenceValue: '2.0–7.0', normalMin: 2.0, normalMax: 7.0 },
      { parameterName: 'Others', unit: '', referenceValue: '—', normalMin: null, normalMax: null }
    ]
  },
  {
    category: 'SERUM ELECTROLYTE',
    subcategory: '',
    parameters: [
      { parameterName: 'T. CALCIUM', unit: 'mmol/L', referenceValue: '2.1–2.6', normalMin: 2.1, normalMax: 2.6, displayOrder: 1, aliases: ['T.CALCIUM', 'T. CALCIUM', 'TOTAL CALCIUM', 'TOTAL CALCIUM (T.CALCIUM)', 'Total Calcium'] },
      { parameterName: 'CALCIUM ION++', unit: 'mmol/L', referenceValue: '1.1–1.35', normalMin: 1.1, normalMax: 1.35, displayOrder: 2, aliases: ['CALCIUM ION++', 'CALCIUM ION', 'IONIZED CALCIUM', 'IONIZED CALCIUM++', 'Ionized Calcium'] },
      { parameterName: 'nCALCIUM', unit: 'mmol/L', referenceValue: '1.0–1.28', normalMin: 1.0, normalMax: 1.28, displayOrder: 3, aliases: ['nCALCIUM', 'NCALCIUM', 'N CALCIUM'] },
      { parameterName: 'PHOSPHORUS', unit: 'mg/dL', referenceValue: '2.7–4.5', normalMin: 2.7, normalMax: 4.5, displayOrder: 4, aliases: ['PHOSPHORUS', 'Phosphate', 'Phosphorus'] },
      { parameterName: 'MAGNESIUM', unit: 'mg/dL', referenceValue: '1.7–2.2', normalMin: 1.7, normalMax: 2.2, displayOrder: 5, aliases: ['MAGNESIUM', 'MAGNISUM', 'Mg', 'MAGNESIUM (Mg)', 'Magnesium'] },
      { parameterName: 'CHLORIDE', unit: 'mmol/L', referenceValue: '96–106', normalMin: 96, normalMax: 106, displayOrder: 6, aliases: ['CHLORIDE', 'Cl-', 'Chloride (Cl−)', 'Chloride'] },
      { parameterName: 'POTASSIUM', unit: 'mmol/L', referenceValue: '3.5–5.5', normalMin: 3.5, normalMax: 5.5, displayOrder: 7, aliases: ['POTASSIUM', 'K+', 'Potassium (K+)', 'Potassium'] },
      { parameterName: 'SODIUM', unit: 'mmol/L', referenceValue: '135–145', normalMin: 135, normalMax: 145, displayOrder: 8, aliases: ['SODIUM', 'Na+', 'Sodium (Na+)', 'Sodium'] },
      { parameterName: 'pH', unit: '', referenceValue: '7.35–7.45', normalMin: 7.35, normalMax: 7.45, displayOrder: 9, aliases: ['pH', 'PH'] }
    ]
  },
  {
    category: 'HORMONE',
    subcategory: '',
    parameters: [
      { parameterName: 'TSH', unit: 'mIU/L', referenceValue: '0.40–4.00', normalMin: 0.4, normalMax: 4.0, displayOrder: 1 },
      { parameterName: 'T3', unit: 'nmol/L', referenceValue: '1.20–2.80', normalMin: 1.2, normalMax: 2.8, displayOrder: 2 },
      { parameterName: 'T4', unit: 'pmol/L', referenceValue: '12.0–22.0', normalMin: 12.0, normalMax: 22.0, displayOrder: 3 },
      { parameterName: 'Troponin', unit: 'ng/mL', referenceValue: '0.00–0.04', normalMin: 0.0, normalMax: 0.04, displayOrder: 4 },
      { parameterName: 'CK-MB', unit: 'U/L', referenceValue: '0.0–25.0', normalMin: 0, normalMax: 25, displayOrder: 5 },
      { parameterName: 'CRP, QUANT', unit: 'mg/dL', referenceValue: '0.0–0.50', normalMin: 0.0, normalMax: 0.50, displayOrder: 6, aliases: ['CRP, QUANT', 'CRP', 'CRP QUANT', 'CRP (C-REACTIVE PROTEIN)'] },
      { parameterName: 'C-REACTIVE PROTEIN QUANTITATIVE', unit: 'mg/L', referenceValue: '0–10', normalMin: 0, normalMax: 10, displayOrder: 7, aliases: ['C-REACTIVE PROTEIN QUANTITATIVE', 'C-REACTIVE PROTEIN', 'C-Reactive Protein'] },
      { parameterName: 'Hs-CRP', unit: 'mg/L', referenceValue: '0–1', normalMin: 0, normalMax: 1, displayOrder: 8, aliases: ['Hs-CRP', 'HS-CRP', 'HIGH SENSITIVITY CRP', 'HIGH-SENSITIVITY CRP', 'High-Sensitivity CRP (hs-CRP)', 'hs-CRP'] },
      { parameterName: 'AFP', unit: 'ng/mL', referenceValue: '0.0–10.0', normalMin: 0, normalMax: 10.0, displayOrder: 9 },
      { parameterName: 'PSA', unit: 'ng/mL', referenceValue: '0.0–4.0', normalMin: 0, normalMax: 4.0, displayOrder: 10 },
      { parameterName: 'HbA1C', unit: '%', referenceValue: '4.0–5.6', normalMin: 4.0, normalMax: 5.6, displayOrder: 11 }
    ]
  },
  {
    category: 'SEROLOGY AND IMMUNOHEMATOLOGY',
    subcategory: '',
    parameters: [
      { parameterName: 'Widal Test (Typhoid)', unit: '', referenceValue: 'Negative (< 1:80)', normalMin: null, normalMax: null, displayOrder: 1, aliases: ['Widal Test (H & O)', 'Widal-Weil Felix', 'Widal Test'] },
      { parameterName: 'Weli Flex (Typhus)', unit: '', referenceValue: 'Negative (< 1:80)', normalMin: null, normalMax: null, displayOrder: 2, aliases: ['Weil-Felix Test (Ox19)', 'Weli Flex', 'Weil Felix'] },
      { parameterName: 'ASO Titer (Tonsillitis)', unit: 'IU/mL', referenceValue: 'Negative (< 200)', normalMin: null, normalMax: null, displayOrder: 3, aliases: ['ASO Titer', 'ASO'] },
      { parameterName: 'HIV Test', unit: '', referenceValue: 'Non-Reactive', normalMin: null, normalMax: null, displayOrder: 4, aliases: ['HIV'] },
      { parameterName: 'HBsAg', unit: '', referenceValue: 'Non-Reactive', normalMin: null, normalMax: null, displayOrder: 5, aliases: ['HBsAg Test'] },
      { parameterName: 'Rheumatoid Factor (RF)', unit: 'IU/mL', referenceValue: 'Negative (< 20)', normalMin: null, normalMax: null, displayOrder: 6, aliases: ['RF', 'Rheumatoid Factor'] },
      { parameterName: 'H. pylori Antigen', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 7, aliases: ['H. pylori Ag (Stool)', 'H. Pylori Test'] },
      { parameterName: 'H. pylori Antibody', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 8, aliases: ['H. pylori Ab (Serum)'] },
      { parameterName: 'Blood Group & RH Type', unit: '', referenceValue: 'A/B/AB/O (Rh +/-)', normalMin: null, normalMax: null, displayOrder: 9, aliases: ['Blood Group and RH'] },
      { parameterName: 'Direct Coombs Test', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 10, aliases: ["Coomb's Test", 'Direct Coombs'] },
      { parameterName: 'Indirect Coombs Test', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 11, aliases: ['Indirect Coombs', 'INDIRECT COOMBS TEST', 'INDIRECT ANTIGLOBULIN TEST', 'IAT', 'INDIRECT ANTIGLOBULIN / COOMBS TEST'] },
      { parameterName: 'Crossmatch', unit: '', referenceValue: 'Compatible', normalMin: null, normalMax: null, displayOrder: 12, aliases: ['Cross Matching'] },
      { parameterName: 'ANA SCREEN, IFA', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 13, aliases: ['ANA SCREEN IFA', 'ANA SCREEN', 'ANA IFA', 'ANTINUCLEAR ANTIBODY SCREEN', 'ANA', 'ANA SCREEN TEST'] }
    ]
  },
  {
    category: 'BLOOD SUGAR TEST (RBS/FBS) / DIABETIC (DM) CHECKUP',
    subcategory: '',
    parameters: [
      { parameterName: 'HbA1c', unit: '%', referenceValue: '0.0 – 6.5', normalMin: 0.0, normalMax: 6.5, displayOrder: 1, aliases: ['HbA1C', 'HbA1c (Glycated Hemoglobin)'] },
      { parameterName: 'Fasting Blood Glucose (FBS)', unit: 'mg/dL', referenceValue: '70 – 126', normalMin: 70.0, normalMax: 126.0, displayOrder: 2, aliases: ['FBS', 'Fasting Blood Glucose'] },
      { parameterName: 'Random Blood Sugar (RBS)', unit: 'mg/dL', referenceValue: '70 – 140', normalMin: 70.0, normalMax: 140.0, displayOrder: 3, aliases: ['RBS', 'Random Blood Sugar'] }
    ]
  },
  {
    category: 'URINALYSIS',
    subcategory: 'Chemical Analysis',
    parameters: [
      { parameterName: 'Specific Gravity', unit: '', referenceValue: '1.005–1.030', normalMin: 1.005, normalMax: 1.030 },
      { parameterName: 'Leukocyte Esterase', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null },
      { parameterName: 'pH', unit: '', referenceValue: '5.0–8.0', normalMin: 5.0, normalMax: 8.0 },
      { parameterName: 'Nitrite', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null },
      { parameterName: 'Glucose', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null },
      { parameterName: 'Protein', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null },
      { parameterName: 'Blood', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null },
      { parameterName: 'Ketone', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null },
      { parameterName: 'Bilirubin', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null },
      { parameterName: 'Urobilinogen', unit: '', referenceValue: 'Normal (0.2–1.0 mg/dL)', normalMin: 0.2, normalMax: 1.0 },
      { parameterName: 'Pregnancy Test (HCG)', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null }
    ]
  },
  {
    category: 'URINALYSIS',
    subcategory: 'Urine Microscopy',
    parameters: [
      { parameterName: 'WBC', unit: '/HPF', referenceValue: '0–5', normalMin: 0, normalMax: 5 },
      { parameterName: 'RBC', unit: '/HPF', referenceValue: '0–3', normalMin: 0, normalMax: 3 },
      { parameterName: 'Epithelial Cells', unit: '/HPF', referenceValue: '0–5', normalMin: 0, normalMax: 5 },
      { parameterName: 'WBC Casts', unit: '/LPF', referenceValue: 'None seen', normalMin: null, normalMax: null },
      { parameterName: 'RBC Casts', unit: '/LPF', referenceValue: 'None seen', normalMin: null, normalMax: null },
      { parameterName: 'Granular Casts', unit: '/LPF', referenceValue: 'None seen', normalMin: null, normalMax: null },
      { parameterName: 'Amorphous Phosphate Crystal', unit: '', referenceValue: 'None to Few', normalMin: null, normalMax: null },
      { parameterName: 'Amorphous Urate Crystal', unit: '', referenceValue: 'None to Few', normalMin: null, normalMax: null },
      { parameterName: 'Calcium Oxalate Crystal', unit: '', referenceValue: 'None to Few', normalMin: null, normalMax: null },
      { parameterName: 'Triple Phosphate Crystal', unit: '', referenceValue: 'None to Few', normalMin: null, normalMax: null },
      { parameterName: 'Bacteria', unit: '', referenceValue: 'None to Few', normalMin: null, normalMax: null },
      { parameterName: 'Others', unit: '', referenceValue: '—', normalMin: null, normalMax: null }
    ]
  },
  {
    category: 'BACTERIOLOGY / PARASITOLOGY',
    subcategory: '',
    parameters: [
      { parameterName: 'Gram Stain', unit: '', referenceValue: 'Normal Flora / No organisms', normalMin: null, normalMax: null },
      { parameterName: 'AFB (Sputum)', unit: '', referenceValue: 'Negative for AFB', normalMin: null, normalMax: null },
      { parameterName: 'KOH', unit: '', referenceValue: 'No fungal elements seen', normalMin: null, normalMax: null },
      { parameterName: 'Wet Mount', unit: '', referenceValue: 'No parasites seen', normalMin: null, normalMax: null },
      { parameterName: 'Stool Exam', unit: '', referenceValue: 'No ova/parasites seen', normalMin: null, normalMax: null },
      { parameterName: 'Blood Film', unit: '', referenceValue: 'No blood parasites seen', normalMin: null, normalMax: null },
      { parameterName: 'Indirect Coombs Test', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, aliases: ['Indirect Coombs Test', 'Indirect Coombs', 'INDIRECT COOMBS TEST', 'INDIRECT ANTIGLOBULIN TEST', 'IAT'] }
    ]
  },
  {
    category: 'SEMEN ANALYSIS',
    subcategory: 'Physical Examination',
    parameters: [
      { parameterName: 'TIME OF COLLECTION', unit: '', referenceValue: 'Morning collection time if applicable', normalMin: null, normalMax: null, displayOrder: 1, aliases: ['TIME OF COLLECTION', 'Time of Collection', 'Collection Time'] },
      { parameterName: 'ABSTINENCE TIME (DAY)', unit: 'days', referenceValue: '2 – 7 days', normalMin: 2, normalMax: 7, displayOrder: 2, aliases: ['ABSTINENCE TIME (DAY)', 'ABSTINENCE TIME', 'Abstinence Time (Day)', 'Abstinence Time'] },
      { parameterName: 'Volume', unit: 'mL', referenceValue: '≥ 1.5', normalMin: 1.5, normalMax: null, displayOrder: 3, aliases: ['Volume', 'VOLUME'] },
      { parameterName: 'COLOUR', unit: '', referenceValue: 'Homogenous grey opalescent', normalMin: null, normalMax: null, displayOrder: 4, aliases: ['COLOUR', 'COLOR', 'Colour', 'Color'] },
      { parameterName: 'Viscosity', unit: '', referenceValue: 'Normal (< 2 cm thread)', normalMin: null, normalMax: null, displayOrder: 5, aliases: ['Viscosity', 'VISCOSITY'] },
      { parameterName: 'LIQUEFACTION', unit: 'minutes', referenceValue: '<= 60 MINUTES', normalMin: null, normalMax: 60, displayOrder: 6, aliases: ['LIQUEFACTION', 'Liquefaction'] }
    ]
  },
  {
    category: 'SEMEN ANALYSIS',
    subcategory: 'BIOCHEMICAL Examination',
    parameters: [
      { parameterName: 'REACTION / PH', unit: 'pH', referenceValue: '7.2 – 8.2', normalMin: 7.2, normalMax: 8.2, displayOrder: 7, aliases: ['REACTION / PH', 'REACTION/PH', 'Reaction / pH', 'pH', 'PH'] },
      { parameterName: 'SEMEN PROTEIN', unit: '', referenceValue: 'PRESENT', normalMin: null, normalMax: null, displayOrder: 8, aliases: ['SEMEN PROTEIN', 'Semen Protein'] }
    ]
  },
  {
    category: 'SEMEN ANALYSIS',
    subcategory: 'Microscopic Examination',
    parameters: [
      { parameterName: 'Sperm Count', unit: 'M/mL', referenceValue: '≥ 15', normalMin: 15, normalMax: null, displayOrder: 9, aliases: ['Sperm Count', 'SPERM CONCENTRATION', 'Sperm Concentration', 'SPERM COUNT'] },
      { parameterName: 'AGGLUTINATION', unit: '', referenceValue: 'ABSENT', normalMin: null, normalMax: null, displayOrder: 10, aliases: ['AGGLUTINATION', 'Agglutination'] },
      { parameterName: 'Motility', unit: '%', referenceValue: '≥ 40', normalMin: 40, normalMax: null, displayOrder: 11, aliases: ['Motility', 'MOTILITY'] },
      { parameterName: 'PROGRESSIVE MOTILITY', unit: '%', referenceValue: '>=32%', normalMin: 32, normalMax: null, displayOrder: 12, aliases: ['PROGRESSIVE MOTILITY', 'Progressive Motility'] },
      { parameterName: 'NON-PROGRESSIVE MOTILITY', unit: '%', referenceValue: '>=40%', normalMin: 40, normalMax: null, displayOrder: 13, aliases: ['NON-PROGRESSIVE MOTILITY', 'Non-Progressive Motility'] },
      { parameterName: 'TOTAL MOTILITY (P + NP)', unit: '%', referenceValue: '>40%', normalMin: 40, normalMax: null, displayOrder: 14, aliases: ['TOTAL MOTILITY (P + NP)', 'TOTAL MOTILITY', 'Total Motility'] },
      { parameterName: 'NON-MOTILITY', unit: '%', referenceValue: '<40%', normalMin: null, normalMax: 40, displayOrder: 15, aliases: ['NON-MOTILITY', 'Non-Motility', 'Immotile'] },
      { parameterName: 'Morphology', unit: '% Normal', referenceValue: '≥ 4', normalMin: 4, normalMax: null, displayOrder: 16, aliases: ['Morphology', 'MORPHOLOGY'] },
      { parameterName: 'NORMAL FORMS', unit: '%', referenceValue: '>=4%', normalMin: 4, normalMax: null, displayOrder: 17, aliases: ['NORMAL FORMS', 'Normal Forms'] },
      { parameterName: 'ABNORMAL FORMS', unit: '%', referenceValue: '', normalMin: null, normalMax: null, displayOrder: 18, aliases: ['ABNORMAL FORMS', 'Abnormal Forms'] },
      { parameterName: 'SPERM VITALITY', unit: '%', referenceValue: '>=58%', normalMin: 58, normalMax: null, displayOrder: 19, aliases: ['SPERM VITALITY', 'Sperm Vitality'] }
    ]
  },
  {
    category: 'SEMEN ANALYSIS',
    subcategory: 'Other findings',
    parameters: [
      { parameterName: 'PUS CELLS', unit: '', referenceValue: '1 – 2', normalMin: 1, normalMax: 2, displayOrder: 20, aliases: ['PUS CELLS', 'Pus Cells'] },
      { parameterName: 'EPITHELIAL CELLS', unit: '/HPF', referenceValue: '1 – 2 /HPF', normalMin: 1, normalMax: 2, displayOrder: 21, aliases: ['EPITHELIAL CELLS', 'Epithelial Cells'] },
      { parameterName: 'RBC', unit: '', referenceValue: '0 - 2', normalMin: 0, normalMax: 2, displayOrder: 22, aliases: ['RBC', 'Red Blood Cells'] }
    ]
  },
  {
    category: 'STOOL EXAMINATION',
    subcategory: '',
    parameters: [
      { parameterName: 'CONSISTENCY', unit: '', referenceValue: '', normalMin: null, normalMax: null, displayOrder: 1, aliases: ['CONSISTENCY', 'Consistency', 'Stool Consistency'] },
      { parameterName: 'OVA & PARASITE EXAM — NOTE', unit: '', referenceValue: '', normalMin: null, normalMax: null, displayOrder: 2, aliases: ['OVA & PARASITE EXAM — NOTE', 'OVA & PARASITE EXAM - NOTE', 'OVA & PARASITE NOTE', 'OVA $ PARASITE EXAM — NOTE', 'O/P Note', 'O/P Exam Note'] }
    ]
  },
  {
    category: 'URINE AND BODY FLUID ANALYSIS',
    subcategory: 'PHYSICAL EXAMINATION',
    parameters: [
      { parameterName: 'APPEARANCE', unit: '', referenceValue: 'CLEAR', normalMin: null, normalMax: null, displayOrder: 1, aliases: ['APPEARANCE', 'Appearance'] },
      { parameterName: 'VOLUME OVER 24 HOUR (V)', unit: 'liter', referenceValue: '>= 1.5 liter', normalMin: 1.5, normalMax: null, displayOrder: 2, aliases: ['VOLUME OVER 24 HOUR', 'VOLUME OVER 24 HR', '24 HOUR VOLUME', '24 HR VOLUME', 'VOLUME (V)'] },
      { parameterName: 'COLOUR', unit: '', referenceValue: 'CLEAR', normalMin: null, normalMax: null, displayOrder: 3, aliases: ['COLOR', 'COLOUR', 'Colour', 'Color'] },
      { parameterName: 'VISCOSITY', unit: '', referenceValue: 'NORMAL', normalMin: null, normalMax: null, displayOrder: 4, aliases: ['VISCOSITY', 'Viscosity'] }
    ]
  },
  {
    category: 'URINE AND BODY FLUID ANALYSIS',
    subcategory: 'BIOCHEMICAL EXAMINATION',
    parameters: [
      { parameterName: 'PROTEIN', unit: 'g/dL', referenceValue: '0.3 – 4.0 g/dL', normalMin: 0.3, normalMax: 4.0, displayOrder: 5, aliases: ['PROTEIN', 'Protein', 'Fluid Protein'] },
      { parameterName: 'GLUCOSE', unit: 'mg/dL', referenceValue: '33 – 140 mg/dL', normalMin: 33, normalMax: 140, displayOrder: 6, aliases: ['GLUCOSE', 'Glucose', 'Fluid Glucose'] },
      { parameterName: 'LDH', unit: 'U/L', referenceValue: '< 0.6 U/L', normalMin: null, normalMax: 0.6, displayOrder: 7, aliases: ['LDH', 'Lactate Dehydrogenase'] },
      { parameterName: 'TPC', unit: 'mg/dL', referenceValue: '5.3 – 8.9', normalMin: 5.3, normalMax: 8.9, displayOrder: 8, aliases: ['TPC', 'Total Protein Concentration'] },
      { parameterName: '24 HR PROTEIN', unit: 'mg/24 hr', referenceValue: 'AT REST <= 80 mg/24 hours', normalMin: null, normalMax: 80, displayOrder: 9, aliases: ['24 HR PROTEIN', '24 HOUR PROTEIN', '24-HOUR PROTEIN', 'URINE PROTEIN 24 HOUR', '24H PROTEIN', '24-HR PROTEIN'] },
      { parameterName: 'TWBC', unit: '/µL', referenceValue: '0–200', normalMin: 0, normalMax: 200, displayOrder: 10 },
      { parameterName: 'Lymphocyte %', unit: '%', referenceValue: '40–80', normalMin: 40, normalMax: 80, displayOrder: 11 },
      { parameterName: 'Neutrophil %', unit: '%', referenceValue: '0–25', normalMin: 0, normalMax: 25, displayOrder: 12 }
    ]
  },
  {
    category: 'URINE AND BODY FLUID ANALYSIS',
    subcategory: 'OTHER',
    parameters: [
      { parameterName: 'WBC CELL COUNT', unit: 'cells/microL', referenceValue: '<250 cells/microL', normalMin: null, normalMax: 250, displayOrder: 13, aliases: ['WBC CELL COUNT', 'WBC Cell Count', 'Cell Count'] },
      { parameterName: 'NEUTROPHIL %', unit: '%', referenceValue: '', normalMin: null, normalMax: null, displayOrder: 14, aliases: ['NEUTROPHIL %', 'Neutrophil %'] },
      { parameterName: 'LYMPHOCYTE %', unit: '%', referenceValue: '', normalMin: null, normalMax: null, displayOrder: 15, aliases: ['LYMPHOCYTE %', 'Lymphocyte %'] },
      { parameterName: 'MID %', unit: '%', referenceValue: '', normalMin: null, normalMax: null, displayOrder: 16, aliases: ['MID %', 'Mid %'] },
      { parameterName: 'GRAM STAINING', unit: '', referenceValue: 'NO GRAM REACTION', normalMin: null, normalMax: null, displayOrder: 17, aliases: ['GRAM STAINING', 'Gram Staining'] },
      { parameterName: 'GRAM STAIN', unit: '', referenceValue: 'NO GRAM REACTION', normalMin: null, normalMax: null, displayOrder: 18, aliases: ['GRAM STAIN', 'Gram Stain'] },
      { parameterName: 'AFB', unit: '', referenceValue: 'Negative for AFB', normalMin: null, normalMax: null, displayOrder: 19 }
    ]
  },
  {
    category: 'REFERRAL',
    subcategory: '',
    parameters: [
      { parameterName: 'CA-125', unit: 'U/mL', referenceValue: '0 – 35', normalMin: 0, normalMax: 35, displayOrder: 1 },
      { parameterName: 'CA-19', unit: 'U/mL', referenceValue: '0 – 37', normalMin: 0, normalMax: 37, displayOrder: 2, aliases: ['CA-19-9', 'CA 19-9'] },
      { parameterName: 'ANTI MULLERIAN HORMONE', unit: 'ng/mL', referenceValue: '1.0 – 4.0', normalMin: 1.0, normalMax: 4.0, displayOrder: 3, aliases: ['AMH', 'Anti-Mullerian Hormone'] },
      { parameterName: 'ANA Titer 1100', unit: 'Titer', referenceValue: '< 1:160', normalMin: null, normalMax: null, displayOrder: 4, aliases: ['ANA Titer', 'ANA Titer 1:100'] },
      { parameterName: 'Anti dsDNA', unit: 'IU/mL', referenceValue: '< 30', normalMin: null, normalMax: 30, displayOrder: 5, aliases: ['Anti-dsDNA', 'dsDNA'] },
      { parameterName: 'ANTI CYCLIC CITRULLINATATED PEPTIDE 2000', unit: 'U/mL', referenceValue: '< 20', normalMin: null, normalMax: 20, displayOrder: 6, aliases: ['Anti-CCP', 'Anti CCP'] },
      { parameterName: 'CA 15-3', unit: 'U/mL', referenceValue: '0 – 30', normalMin: 0, normalMax: 30, displayOrder: 7, aliases: ['CA 15.3', 'CA-15-3'] },
      { parameterName: 'CD4', unit: 'cells/µL', referenceValue: '500 – 1500', normalMin: 500, normalMax: 1500, displayOrder: 8, aliases: ['CD4 Count'] },
      { parameterName: 'Cortisol Serum', unit: 'µg/dL', referenceValue: '6.0 – 23.0', normalMin: 6.0, normalMax: 23.0, displayOrder: 9, aliases: ['Serum Cortisol', 'Cortisol'] },
      { parameterName: 'Ferratin or Folate', unit: 'ng/mL', referenceValue: '12 – 300', normalMin: 12, normalMax: 300, displayOrder: 10, aliases: ['Ferritin', 'Folate', 'Ferratin'] },
      { parameterName: 'HBV Viral Load', unit: 'IU/mL', referenceValue: 'Undetectable (< 20)', normalMin: null, normalMax: 20, displayOrder: 11, aliases: ['HBV DNA Quantitative', 'HBV DNA'] },
      { parameterName: 'HCV Viral Load', unit: 'IU/mL', referenceValue: 'Undetectable (< 15)', normalMin: null, normalMax: 15, displayOrder: 12, aliases: ['HCV RNA Quantitative', 'HCV RNA'] },
      { parameterName: 'HCV Genotype', unit: '', referenceValue: 'Reported by Genotype (1-6)', normalMin: null, normalMax: null, displayOrder: 13 },
      { parameterName: 'Hepatitis C Screen', unit: '', referenceValue: 'Non-Reactive', normalMin: null, normalMax: null, displayOrder: 14, aliases: ['HCV Screen', 'Anti-HCV'] },
      { parameterName: 'HIV Viral Load', unit: 'copies/mL', referenceValue: 'Undetectable (< 20)', normalMin: null, normalMax: 20, displayOrder: 15, aliases: ['HIV-1 Viral Load', 'HIV RNA'] },
      { parameterName: 'HIV 1 RNA Quantitative', unit: 'copies/mL', referenceValue: 'Undetectable (< 20)', normalMin: null, normalMax: 20, displayOrder: 16, aliases: ['HIV 1 RNA'] },
      { parameterName: 'Lipase', unit: 'U/L', referenceValue: '10 – 140', normalMin: 10, normalMax: 140, displayOrder: 17 },
      { parameterName: 'PTH', unit: 'pg/mL', referenceValue: '15 – 65', normalMin: 15, normalMax: 65, displayOrder: 18, aliases: ['Parathyroid Hormone', 'PTH Serum'] },
      { parameterName: 'Testosterone', unit: 'ng/dL', referenceValue: 'Male: 300 – 1000 | Female: 15 – 70', normalMin: 15, normalMax: 1000, displayOrder: 19 },
      { parameterName: 'Vitamin B12', unit: 'pg/mL', referenceValue: '200 – 900', normalMin: 200, normalMax: 900, displayOrder: 20, aliases: ['Vit B12', 'B12'] },
      { parameterName: 'Female Cancer Markers', unit: '', referenceValue: 'Negative / Normal Panel', normalMin: null, normalMax: null, displayOrder: 21 },
      { parameterName: 'Male Cancer Marker', unit: '', referenceValue: 'Negative / Normal Panel', normalMin: null, normalMax: null, displayOrder: 22 },
      { parameterName: 'Vit B12 & Folate', unit: '', referenceValue: 'B12: 200–900 pg/mL | Folate: > 3.0 ng/mL', normalMin: null, normalMax: null, displayOrder: 23 },
      { parameterName: 'Hepatitis B Surface Quantitative (10 Days)', unit: 'IU/mL', referenceValue: '< 0.05', normalMin: null, normalMax: 0.05, displayOrder: 24, aliases: ['HBsAg Quantitative'] }
    ]
  }
];

export async function seedParameterCatalog(force = false) {
  try {
    if (!force) {
      const referralCount = await LabTestParameter.countDocuments({ category: { $in: ['REFERRAL', 'REFERRAL TESTS'] } });
      const totalCount = await LabTestParameter.countDocuments();
      if (totalCount > 0 && referralCount > 0) return;
    }
    let count = 0;
    let fallbackOrder = 1;

    // Migrate old Serology/Immunohematology, Clinical Chemistry & Body Fluid parameter category fields in DB
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

    for (const catGroup of MASTER_LAB_CATEGORIES) {
      if (['HEMATOLOGY', 'SEROLOGY AND IMMUNOHEMATOLOGY', 'BLOOD SUGAR TEST (RBS/FBS) / DIABETIC (DM) CHECKUP', 'SERUM ELECTROLYTE', 'STOOL EXAMINATION', 'HORMONE'].includes(catGroup.category)) {
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

        const existing = await LabTestParameter.findOne({
          category: catGroup.category,
          $or: searchNames.map(n => ({ parameterName: new RegExp(`^${escapeRegex(n)}$`, 'i') }))
        });

        if (existing) {
          existing.parameterName = p.parameterName;
          existing.category = catGroup.category;
          existing.subcategory = targetSubcat;
          existing.unit = p.unit || '';
          existing.referenceValue = p.referenceValue || '';
          existing.normalMin = p.normalMin ?? null;
          existing.normalMax = p.normalMax ?? null;
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

