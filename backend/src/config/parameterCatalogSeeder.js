import LabTestParameter from '../models/LabTestParameter.js';

export const DEFAULT_PARAMETERS = [
  // 1. HEMATOLOGY
  { category: 'HEMATOLOGY', subcategory: 'CBC', parameterName: 'WBC', unit: '×10³/µL', referenceValue: '4.0–11.0', normalMin: 4.0, normalMax: 11.0, displayOrder: 1 },
  { category: 'HEMATOLOGY', subcategory: 'CBC', parameterName: 'LYM%', unit: '%', referenceValue: '20–45', normalMin: 20, normalMax: 45, displayOrder: 2 },
  { category: 'HEMATOLOGY', subcategory: 'CBC', parameterName: 'MID%', unit: '%', referenceValue: '2–12', normalMin: 2, normalMax: 12, displayOrder: 3 },
  { category: 'HEMATOLOGY', subcategory: 'CBC', parameterName: 'Neut%', unit: '%', referenceValue: '45–75', normalMin: 45, normalMax: 75, displayOrder: 4 },
  { category: 'HEMATOLOGY', subcategory: 'CBC', parameterName: 'RBC', unit: '×10⁶/µL', referenceValue: '4.0–5.9', normalMin: 4.0, normalMax: 5.9, displayOrder: 5 },
  { category: 'HEMATOLOGY', subcategory: 'CBC', parameterName: 'HGB', unit: 'g/dL', referenceValue: '12.0–17.0', normalMin: 12.0, normalMax: 17.0, displayOrder: 6 },
  { category: 'HEMATOLOGY', subcategory: 'CBC', parameterName: 'HCT', unit: '%', referenceValue: '36.0–52.0', normalMin: 36.0, normalMax: 52.0, displayOrder: 7 },
  { category: 'HEMATOLOGY', subcategory: 'CBC', parameterName: 'MCHC', unit: 'g/dL', referenceValue: '32.0–36.0', normalMin: 32.0, normalMax: 36.0, displayOrder: 8 },
  { category: 'HEMATOLOGY', subcategory: 'CBC', parameterName: 'MCH', unit: 'pg', referenceValue: '27.0–33.0', normalMin: 27.0, normalMax: 33.0, displayOrder: 9 },
  { category: 'HEMATOLOGY', subcategory: 'CBC', parameterName: 'MCV', unit: 'fL', referenceValue: '80.0–100.0', normalMin: 80.0, normalMax: 100.0, displayOrder: 10 },
  { category: 'HEMATOLOGY', subcategory: 'CBC', parameterName: 'PLT', unit: '×10³/µL', referenceValue: '150–450', normalMin: 150, normalMax: 450, displayOrder: 11 },
  { category: 'HEMATOLOGY', subcategory: 'CBC', parameterName: 'ESR', unit: 'mm/hr', referenceValue: '0–20', normalMin: 0, normalMax: 20, displayOrder: 12 },

  // 2. CLINICAL CHEMISTRY
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'ALT/GPT', unit: 'U/L', referenceValue: '0–41', normalMin: 0, normalMax: 41, displayOrder: 1 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'AST/GOT', unit: 'U/L', referenceValue: '0–40', normalMin: 0, normalMax: 40, displayOrder: 2 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'ALP', unit: 'U/L', referenceValue: '44–147', normalMin: 44, normalMax: 147, displayOrder: 3 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'Total Protein', unit: 'g/L', referenceValue: '60–80', normalMin: 60, normalMax: 80, displayOrder: 4 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'Albumin', unit: 'g/L', referenceValue: '35–50', normalMin: 35, normalMax: 50, displayOrder: 5 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'Direct Bilirubin', unit: 'µmol/L', referenceValue: '0–5', normalMin: 0, normalMax: 5, displayOrder: 6 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'Total Bilirubin', unit: 'µmol/L', referenceValue: '5–21', normalMin: 5, normalMax: 21, displayOrder: 7 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'Indirect Bilirubin', unit: 'µmol/L', referenceValue: '2–16', normalMin: 2, normalMax: 16, displayOrder: 8 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'Glucose', unit: 'mmol/L', referenceValue: '3.9–7.8', normalMin: 3.9, normalMax: 7.8, displayOrder: 9 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'Creatinine', unit: 'µmol/L', referenceValue: '53–115', normalMin: 53, normalMax: 115, displayOrder: 10 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'Urea', unit: 'mmol/L', referenceValue: '2.5–7.8', normalMin: 2.5, normalMax: 7.8, displayOrder: 11 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'Triglyceride', unit: 'mmol/L', referenceValue: '0–1.7', normalMin: 0, normalMax: 1.7, displayOrder: 12 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'Total Cholesterol', unit: 'mmol/L', referenceValue: '0–5.2', normalMin: 0, normalMax: 5.2, displayOrder: 13 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'LDL', unit: 'mmol/L', referenceValue: '0–3.4', normalMin: 0, normalMax: 3.4, displayOrder: 14 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'HDL', unit: 'mmol/L', referenceValue: '1.0–2.2', normalMin: 1.0, normalMax: 2.2, displayOrder: 15 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'Uric Acid', unit: 'µmol/L', referenceValue: '210–420', normalMin: 210, normalMax: 420, displayOrder: 16 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'FBS', unit: 'mg/dL', referenceValue: '70–110', normalMin: 70, normalMax: 110, displayOrder: 17 },
  { category: 'CLINICAL CHEMISTRY', subcategory: '', parameterName: 'RBS', unit: 'mg/dL', referenceValue: '70–140', normalMin: 70, normalMax: 140, displayOrder: 18 },

  // 3. COAGULATION TEST
  { category: 'COAGULATION TEST', subcategory: '', parameterName: 'PT', unit: 'seconds', referenceValue: '11.0–13.5', normalMin: 11.0, normalMax: 13.5, displayOrder: 1 },
  { category: 'COAGULATION TEST', subcategory: '', parameterName: 'INR', unit: '', referenceValue: '0.8–1.2', normalMin: 0.8, normalMax: 1.2, displayOrder: 2 },
  { category: 'COAGULATION TEST', subcategory: '', parameterName: 'APTT', unit: 'seconds', referenceValue: '25.0–35.0', normalMin: 25.0, normalMax: 35.0, displayOrder: 3 },
  { category: 'COAGULATION TEST', subcategory: '', parameterName: 'Bleeding Time', unit: 'minutes', referenceValue: '2–7', normalMin: 2, normalMax: 7, displayOrder: 4 },
  { category: 'COAGULATION TEST', subcategory: '', parameterName: 'Others', unit: '', referenceValue: 'Normal', normalMin: null, normalMax: null, displayOrder: 5 },

  // 4. SERUM ELECTROLYTE
  { category: 'SERUM ELECTROLYTE', subcategory: '', parameterName: 'K+', unit: 'mmol/L', referenceValue: '3.5–5.1', normalMin: 3.5, normalMax: 5.1, displayOrder: 1 },
  { category: 'SERUM ELECTROLYTE', subcategory: '', parameterName: 'Na+', unit: 'mmol/L', referenceValue: '135–145', normalMin: 135, normalMax: 145, displayOrder: 2 },
  { category: 'SERUM ELECTROLYTE', subcategory: '', parameterName: 'Cl-', unit: 'mmol/L', referenceValue: '98–107', normalMin: 98, normalMax: 107, displayOrder: 3 },
  { category: 'SERUM ELECTROLYTE', subcategory: '', parameterName: 'Ionized Calcium', unit: 'mmol/L', referenceValue: '1.15–1.35', normalMin: 1.15, normalMax: 1.35, displayOrder: 4 },
  { category: 'SERUM ELECTROLYTE', subcategory: '', parameterName: 'Total Calcium', unit: 'mmol/L', referenceValue: '2.15–2.55', normalMin: 2.15, normalMax: 2.55, displayOrder: 5 },
  { category: 'SERUM ELECTROLYTE', subcategory: '', parameterName: 'pH', unit: 'pH units', referenceValue: '7.35–7.45', normalMin: 7.35, normalMax: 7.45, displayOrder: 6 },

  // 5. HORMONE
  { category: 'HORMONE', subcategory: '', parameterName: 'TSH', unit: 'mIU/L', referenceValue: '0.4–4.0', normalMin: 0.4, normalMax: 4.0, displayOrder: 1 },
  { category: 'HORMONE', subcategory: '', parameterName: 'T3', unit: 'nmol/L', referenceValue: '1.2–2.8', normalMin: 1.2, normalMax: 2.8, displayOrder: 2 },
  { category: 'HORMONE', subcategory: '', parameterName: 'T4', unit: 'pmol/L', referenceValue: '12.0–22.0', normalMin: 12.0, normalMax: 22.0, displayOrder: 3 },
  { category: 'HORMONE', subcategory: '', parameterName: 'Troponin', unit: 'ng/mL', referenceValue: '0.0–0.04', normalMin: 0.0, normalMax: 0.04, displayOrder: 4 },
  { category: 'HORMONE', subcategory: '', parameterName: 'CK-MB', unit: 'U/L', referenceValue: '0–25', normalMin: 0, normalMax: 25, displayOrder: 5 },
  { category: 'HORMONE', subcategory: '', parameterName: 'CRP', unit: 'mg/L', referenceValue: '0–5', normalMin: 0, normalMax: 5, displayOrder: 6 },
  { category: 'HORMONE', subcategory: '', parameterName: 'AFP', unit: 'ng/mL', referenceValue: '0–10', normalMin: 0, normalMax: 10, displayOrder: 7 },
  { category: 'HORMONE', subcategory: '', parameterName: 'PSA', unit: 'ng/mL', referenceValue: '0–4.0', normalMin: 0, normalMax: 4.0, displayOrder: 8 },
  { category: 'HORMONE', subcategory: '', parameterName: 'HbA1C', unit: '%', referenceValue: '4.0–5.6', normalMin: 4.0, normalMax: 5.6, displayOrder: 9 },

  // 6. SEROLOGY & IMMUNOHEMATOLOGY
  { category: 'SEROLOGY & IMMUNOHEMATOLOGY', subcategory: '', parameterName: 'H. pylori Ag (Stool)', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 1 },
  { category: 'SEROLOGY & IMMUNOHEMATOLOGY', subcategory: '', parameterName: 'Widal Test (H & O)', unit: 'Titer', referenceValue: '< 1:160', normalMin: null, normalMax: null, displayOrder: 2 },
  { category: 'SEROLOGY & IMMUNOHEMATOLOGY', subcategory: '', parameterName: 'Weil-Felix Test (Ox19)', unit: 'Titer', referenceValue: '< 1:160', normalMin: null, normalMax: null, displayOrder: 3 },
  { category: 'SEROLOGY & IMMUNOHEMATOLOGY', subcategory: '', parameterName: 'ASO Titer', unit: 'IU/mL', referenceValue: '< 200', normalMin: null, normalMax: null, displayOrder: 4 },
  { category: 'SEROLOGY & IMMUNOHEMATOLOGY', subcategory: '', parameterName: 'RPR (VDRL)', unit: '', referenceValue: 'Non-Reactive', normalMin: null, normalMax: null, displayOrder: 5 },
  { category: 'SEROLOGY & IMMUNOHEMATOLOGY', subcategory: '', parameterName: 'HIV Test', unit: '', referenceValue: 'Non-Reactive', normalMin: null, normalMax: null, displayOrder: 6 },
  { category: 'SEROLOGY & IMMUNOHEMATOLOGY', subcategory: '', parameterName: 'HBsAg', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 7 },
  { category: 'SEROLOGY & IMMUNOHEMATOLOGY', subcategory: '', parameterName: 'HCV', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 8 },
  { category: 'SEROLOGY & IMMUNOHEMATOLOGY', subcategory: '', parameterName: 'RF', unit: 'IU/mL', referenceValue: '< 20', normalMin: null, normalMax: null, displayOrder: 9 },
  { category: 'SEROLOGY & IMMUNOHEMATOLOGY', subcategory: '', parameterName: 'H. pylori Ab (Serum)', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 10 },
  { category: 'SEROLOGY & IMMUNOHEMATOLOGY', subcategory: '', parameterName: 'Blood Group & RH Type', unit: '', referenceValue: 'Record', normalMin: null, normalMax: null, displayOrder: 11 },

  // 7. URINALYSIS - Chemical Analysis
  { category: 'URINALYSIS', subcategory: 'Chemical Analysis', parameterName: 'Specific Gravity', unit: '', referenceValue: '1.005–1.030', normalMin: 1.005, normalMax: 1.030, displayOrder: 1 },
  { category: 'URINALYSIS', subcategory: 'Chemical Analysis', parameterName: 'Leukocyte Esterase', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 2 },
  { category: 'URINALYSIS', subcategory: 'Chemical Analysis', parameterName: 'pH', unit: 'pH units', referenceValue: '4.6–8.0', normalMin: 4.6, normalMax: 8.0, displayOrder: 3 },
  { category: 'URINALYSIS', subcategory: 'Chemical Analysis', parameterName: 'Nitrite', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 4 },
  { category: 'URINALYSIS', subcategory: 'Chemical Analysis', parameterName: 'Glucose', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 5 },
  { category: 'URINALYSIS', subcategory: 'Chemical Analysis', parameterName: 'Protein', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 6 },
  { category: 'URINALYSIS', subcategory: 'Chemical Analysis', parameterName: 'Blood', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 7 },
  { category: 'URINALYSIS', subcategory: 'Chemical Analysis', parameterName: 'Ketone', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 8 },
  { category: 'URINALYSIS', subcategory: 'Chemical Analysis', parameterName: 'Bilirubin', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 9 },
  { category: 'URINALYSIS', subcategory: 'Chemical Analysis', parameterName: 'Urobilinogen', unit: 'mg/dL', referenceValue: '0.2–1.0', normalMin: 0.2, normalMax: 1.0, displayOrder: 10 },
  { category: 'URINALYSIS', subcategory: 'Chemical Analysis', parameterName: 'Pregnancy Test (HCG)', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 11 },

  // 7. URINALYSIS - Urine Microscopy
  { category: 'URINALYSIS', subcategory: 'Urine Microscopy', parameterName: 'WBC', unit: '/HPF', referenceValue: '0–5', normalMin: 0, normalMax: 5, displayOrder: 12 },
  { category: 'URINALYSIS', subcategory: 'Urine Microscopy', parameterName: 'RBC', unit: '/HPF', referenceValue: '0–2', normalMin: 0, normalMax: 2, displayOrder: 13 },
  { category: 'URINALYSIS', subcategory: 'Urine Microscopy', parameterName: 'Epithelial Cells', unit: '/HPF', referenceValue: 'Few', normalMin: null, normalMax: null, displayOrder: 14 },
  { category: 'URINALYSIS', subcategory: 'Urine Microscopy', parameterName: 'WBC Casts', unit: '/LPF', referenceValue: 'Nil', normalMin: null, normalMax: null, displayOrder: 15 },
  { category: 'URINALYSIS', subcategory: 'Urine Microscopy', parameterName: 'RBC Casts', unit: '/LPF', referenceValue: 'Nil', normalMin: null, normalMax: null, displayOrder: 16 },
  { category: 'URINALYSIS', subcategory: 'Urine Microscopy', parameterName: 'Granular Casts', unit: '/LPF', referenceValue: 'Nil', normalMin: null, normalMax: null, displayOrder: 17 },
  { category: 'URINALYSIS', subcategory: 'Urine Microscopy', parameterName: 'Amorphous Phosphate Crystal', unit: '', referenceValue: 'Nil', normalMin: null, normalMax: null, displayOrder: 18 },
  { category: 'URINALYSIS', subcategory: 'Urine Microscopy', parameterName: 'Amorphous Urate Crystal', unit: '', referenceValue: 'Nil', normalMin: null, normalMax: null, displayOrder: 19 },
  { category: 'URINALYSIS', subcategory: 'Urine Microscopy', parameterName: 'Calcium Oxalate Crystal', unit: '', referenceValue: 'Nil', normalMin: null, normalMax: null, displayOrder: 20 },
  { category: 'URINALYSIS', subcategory: 'Urine Microscopy', parameterName: 'Triple Phosphate Crystal', unit: '', referenceValue: 'Nil', normalMin: null, normalMax: null, displayOrder: 21 },
  { category: 'URINALYSIS', subcategory: 'Urine Microscopy', parameterName: 'Bacteria', unit: '', referenceValue: 'Nil', normalMin: null, normalMax: null, displayOrder: 22 },
  { category: 'URINALYSIS', subcategory: 'Urine Microscopy', parameterName: 'Others', unit: '', referenceValue: 'Nil', normalMin: null, normalMax: null, displayOrder: 23 },

  // 8. BACTERIOLOGY / PARASITOLOGY
  { category: 'BACTERIOLOGY / PARASITOLOGY', subcategory: '', parameterName: 'Gram Stain', unit: '', referenceValue: 'No Organisms Seen', normalMin: null, normalMax: null, displayOrder: 1 },
  { category: 'BACTERIOLOGY / PARASITOLOGY', subcategory: '', parameterName: 'AFB (Sputum)', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 2 },
  { category: 'BACTERIOLOGY / PARASITOLOGY', subcategory: '', parameterName: 'KOH', unit: '', referenceValue: 'No Fungal Elements', normalMin: null, normalMax: null, displayOrder: 3 },
  { category: 'BACTERIOLOGY / PARASITOLOGY', subcategory: '', parameterName: 'Wet Mount', unit: '', referenceValue: 'Normal', normalMin: null, normalMax: null, displayOrder: 4 },
  { category: 'BACTERIOLOGY / PARASITOLOGY', subcategory: '', parameterName: 'Stool Exam', unit: '', referenceValue: 'No Parasite Seen', normalMin: null, normalMax: null, displayOrder: 5 },
  { category: 'BACTERIOLOGY / PARASITOLOGY', subcategory: '', parameterName: 'Blood Film', unit: '', referenceValue: 'No Hemoparasite Seen', normalMin: null, normalMax: null, displayOrder: 6 },

  // 9. BODY FLUID ANALYSIS
  { category: 'BODY FLUID ANALYSIS', subcategory: '', parameterName: 'Appearance', unit: '', referenceValue: 'Clear / Straw', normalMin: null, normalMax: null, displayOrder: 1 },
  { category: 'BODY FLUID ANALYSIS', subcategory: '', parameterName: 'TWBC', unit: '/mm³', referenceValue: '< 500', normalMin: null, normalMax: null, displayOrder: 2 },
  { category: 'BODY FLUID ANALYSIS', subcategory: '', parameterName: 'Lymphocyte %', unit: '%', referenceValue: '> 50%', normalMin: null, normalMax: null, displayOrder: 3 },
  { category: 'BODY FLUID ANALYSIS', subcategory: '', parameterName: 'Neutrophil %', unit: '%', referenceValue: '< 50%', normalMin: null, normalMax: null, displayOrder: 4 },
  { category: 'BODY FLUID ANALYSIS', subcategory: '', parameterName: 'Gram Stain', unit: '', referenceValue: 'No Organisms Seen', normalMin: null, normalMax: null, displayOrder: 5 },
  { category: 'BODY FLUID ANALYSIS', subcategory: '', parameterName: 'AFB', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null, displayOrder: 6 },

  // 10. SEMEN ANALYSIS
  { category: 'SEMEN ANALYSIS', subcategory: '', parameterName: 'Volume', unit: 'mL', referenceValue: '1.5–5.0', normalMin: 1.5, normalMax: 5.0, displayOrder: 1 },
  { category: 'SEMEN ANALYSIS', subcategory: '', parameterName: 'Viscosity', unit: '', referenceValue: 'Normal', normalMin: null, normalMax: null, displayOrder: 2 },
  { category: 'SEMEN ANALYSIS', subcategory: '', parameterName: 'Motility', unit: '%', referenceValue: '> 40%', normalMin: null, normalMax: null, displayOrder: 3 },
  { category: 'SEMEN ANALYSIS', subcategory: '', parameterName: 'Sperm Count', unit: 'million/mL', referenceValue: '> 15.0', normalMin: null, normalMax: null, displayOrder: 4 },
  { category: 'SEMEN ANALYSIS', subcategory: '', parameterName: 'Morphology', unit: '%', referenceValue: '> 4%', normalMin: null, normalMax: null, displayOrder: 5 }
];

export async function seedParameterCatalog() {
  try {
    const count = await LabTestParameter.countDocuments();
    if (count === 0) {
      console.log('Seeding default Laboratory Parameter Catalog into MongoDB...');
      await LabTestParameter.insertMany(DEFAULT_PARAMETERS);
      console.log(`Successfully seeded ${DEFAULT_PARAMETERS.length} master laboratory parameters across 10 categories.`);
    }
  } catch (error) {
    console.error('Error seeding Laboratory Parameter Catalog:', error.message);
  }
}
