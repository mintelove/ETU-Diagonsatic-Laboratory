import LabTestParameter from '../models/LabTestParameter.js';

export const MASTER_LAB_CATEGORIES = [
  {
    category: 'HEMATOLOGY',
    subcategory: 'CBC',
    parameters: [
      { parameterName: 'WBC', unit: '×10³/µL', referenceValue: '4.0–11.0', normalMin: 4.0, normalMax: 11.0 },
      { parameterName: 'LYM%', unit: '%', referenceValue: '20–45', normalMin: 20, normalMax: 45 },
      { parameterName: 'MID%', unit: '%', referenceValue: '2–12', normalMin: 2, normalMax: 12 },
      { parameterName: 'Neut%', unit: '%', referenceValue: '45–75', normalMin: 45, normalMax: 75 },
      { parameterName: 'RBC', unit: '×10⁶/µL', referenceValue: '4.0–5.9', normalMin: 4.0, normalMax: 5.9 },
      { parameterName: 'HGB', unit: 'g/dL', referenceValue: '12.0–17.0', normalMin: 12.0, normalMax: 17.0 },
      { parameterName: 'HCT', unit: '%', referenceValue: '36.0–52.0', normalMin: 36.0, normalMax: 52.0 },
      { parameterName: 'MCHC', unit: 'g/dL', referenceValue: '32.0–36.0', normalMin: 32.0, normalMax: 36.0 },
      { parameterName: 'MCH', unit: 'pg', referenceValue: '27.0–33.0', normalMin: 27.0, normalMax: 33.0 },
      { parameterName: 'MCV', unit: 'fL', referenceValue: '80.0–100.0', normalMin: 80.0, normalMax: 100.0 },
      { parameterName: 'PLT', unit: '×10³/µL', referenceValue: '150–450', normalMin: 150, normalMax: 450 },
      { parameterName: 'ESR', unit: 'mm/hr', referenceValue: '0–20', normalMin: 0, normalMax: 20 }
    ]
  },
  {
    category: 'CLINICAL CHEMISTRY',
    subcategory: '',
    parameters: [
      { parameterName: 'ALT/GPT', unit: 'U/L', referenceValue: '0–41', normalMin: 0, normalMax: 41 },
      { parameterName: 'AST/GOT', unit: 'U/L', referenceValue: '0–40', normalMin: 0, normalMax: 40 },
      { parameterName: 'ALP', unit: 'U/L', referenceValue: '44–147', normalMin: 44, normalMax: 147 },
      { parameterName: 'Total Protein', unit: 'g/L', referenceValue: '60–80', normalMin: 60, normalMax: 80 },
      { parameterName: 'Albumin', unit: 'g/L', referenceValue: '35–50', normalMin: 35, normalMax: 50 },
      { parameterName: 'Direct Bilirubin', unit: 'µmol/L', referenceValue: '0–5', normalMin: 0, normalMax: 5 },
      { parameterName: 'Total Bilirubin', unit: 'µmol/L', referenceValue: '5–21', normalMin: 5, normalMax: 21 },
      { parameterName: 'Indirect Bilirubin', unit: 'µmol/L', referenceValue: '0–16', normalMin: 0, normalMax: 16 },
      { parameterName: 'Glucose', unit: 'mmol/L', referenceValue: '3.9–7.8', normalMin: 3.9, normalMax: 7.8 },
      { parameterName: 'Creatinine', unit: 'µmol/L', referenceValue: '53–115', normalMin: 53, normalMax: 115 },
      { parameterName: 'Urea', unit: 'mmol/L', referenceValue: '2.5–7.8', normalMin: 2.5, normalMax: 7.8 },
      { parameterName: 'Triglyceride', unit: 'mmol/L', referenceValue: '0–1.7', normalMin: 0, normalMax: 1.7 },
      { parameterName: 'Total Cholesterol', unit: 'mmol/L', referenceValue: '0–5.2', normalMin: 0, normalMax: 5.2 },
      { parameterName: 'LDL', unit: 'mmol/L', referenceValue: '0–3.4', normalMin: 0, normalMax: 3.4 },
      { parameterName: 'HDL', unit: 'mmol/L', referenceValue: '1.0–2.2', normalMin: 1.0, normalMax: 2.2 },
      { parameterName: 'Uric Acid', unit: 'µmol/L', referenceValue: '210–420', normalMin: 210, normalMax: 420 },
      { parameterName: 'FBS', unit: 'mg/dL', referenceValue: '70–100', normalMin: 70, normalMax: 100 },
      { parameterName: 'RBS', unit: 'mg/dL', referenceValue: '70–140', normalMin: 70, normalMax: 140 }
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
      { parameterName: 'K+', unit: 'mmol/L', referenceValue: '3.5–5.1', normalMin: 3.5, normalMax: 5.1 },
      { parameterName: 'Na+', unit: 'mmol/L', referenceValue: '135–145', normalMin: 135, normalMax: 145 },
      { parameterName: 'Cl-', unit: 'mmol/L', referenceValue: '98–107', normalMin: 98, normalMax: 107 },
      { parameterName: 'Ionized Calcium', unit: 'mmol/L', referenceValue: '1.10–1.35', normalMin: 1.10, normalMax: 1.35 },
      { parameterName: 'Total Calcium', unit: 'mmol/L', referenceValue: '2.15–2.55', normalMin: 2.15, normalMax: 2.55 },
      { parameterName: 'pH', unit: '', referenceValue: '7.35–7.45', normalMin: 7.35, normalMax: 7.45 }
    ]
  },
  {
    category: 'HORMONE',
    subcategory: '',
    parameters: [
      { parameterName: 'TSH', unit: 'mIU/L', referenceValue: '0.40–4.00', normalMin: 0.4, normalMax: 4.0 },
      { parameterName: 'T3', unit: 'nmol/L', referenceValue: '1.20–2.80', normalMin: 1.2, normalMax: 2.8 },
      { parameterName: 'T4', unit: 'pmol/L', referenceValue: '12.0–22.0', normalMin: 12.0, normalMax: 22.0 },
      { parameterName: 'Troponin', unit: 'ng/mL', referenceValue: '0.00–0.04', normalMin: 0.0, normalMax: 0.04 },
      { parameterName: 'CK-MB', unit: 'U/L', referenceValue: '0.0–25.0', normalMin: 0, normalMax: 25 },
      { parameterName: 'CRP', unit: 'mg/L', referenceValue: '0.0–5.0', normalMin: 0, normalMax: 5.0 },
      { parameterName: 'AFP', unit: 'ng/mL', referenceValue: '0.0–10.0', normalMin: 0, normalMax: 10.0 },
      { parameterName: 'PSA', unit: 'ng/mL', referenceValue: '0.0–4.0', normalMin: 0, normalMax: 4.0 },
      { parameterName: 'HbA1C', unit: '%', referenceValue: '4.0–5.6', normalMin: 4.0, normalMax: 5.6 }
    ]
  },
  {
    category: 'SEROLOGY & IMMUNOHEMATOLOGY',
    subcategory: '',
    parameters: [
      { parameterName: 'H. pylori Ag (Stool)', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null },
      { parameterName: 'Widal Test (H & O)', unit: '', referenceValue: 'Negative (< 1:80)', normalMin: null, normalMax: null },
      { parameterName: 'Weil-Felix Test (Ox19)', unit: '', referenceValue: 'Negative (< 1:80)', normalMin: null, normalMax: null },
      { parameterName: 'ASO Titer', unit: 'IU/mL', referenceValue: 'Negative (< 200)', normalMin: null, normalMax: null },
      { parameterName: 'RPR (VDRL)', unit: '', referenceValue: 'Non-Reactive', normalMin: null, normalMax: null },
      { parameterName: 'HIV Test', unit: '', referenceValue: 'Non-Reactive', normalMin: null, normalMax: null },
      { parameterName: 'HBsAg', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null },
      { parameterName: 'HCV', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null },
      { parameterName: 'RF', unit: 'IU/mL', referenceValue: 'Negative (< 20)', normalMin: null, normalMax: null },
      { parameterName: 'H. pylori Ab (Serum)', unit: '', referenceValue: 'Negative', normalMin: null, normalMax: null },
      { parameterName: 'Blood Group & RH Type', unit: '', referenceValue: 'A/B/AB/O (Rh +/-)', normalMin: null, normalMax: null }
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
      { parameterName: 'Blood Film', unit: '', referenceValue: 'No blood parasites seen', normalMin: null, normalMax: null }
    ]
  },
  {
    category: 'BODY FLUID ANALYSIS',
    subcategory: '',
    parameters: [
      { parameterName: 'Appearance', unit: '', referenceValue: 'Clear / Straw-colored', normalMin: null, normalMax: null },
      { parameterName: 'TWBC', unit: '/µL', referenceValue: '0–200', normalMin: 0, normalMax: 200 },
      { parameterName: 'Lymphocyte %', unit: '%', referenceValue: '40–80', normalMin: 40, normalMax: 80 },
      { parameterName: 'Neutrophil %', unit: '%', referenceValue: '0–25', normalMin: 0, normalMax: 25 },
      { parameterName: 'Gram Stain', unit: '', referenceValue: 'No organisms seen', normalMin: null, normalMax: null },
      { parameterName: 'AFB', unit: '', referenceValue: 'Negative for AFB', normalMin: null, normalMax: null }
    ]
  },
  {
    category: 'SEMEN ANALYSIS',
    subcategory: '',
    parameters: [
      { parameterName: 'Volume', unit: 'mL', referenceValue: '≥ 1.5', normalMin: 1.5, normalMax: null },
      { parameterName: 'Viscosity', unit: '', referenceValue: 'Normal (< 2 cm thread)', normalMin: null, normalMax: null },
      { parameterName: 'Motility', unit: '%', referenceValue: '≥ 40', normalMin: 40, normalMax: null },
      { parameterName: 'Sperm Count', unit: 'M/mL', referenceValue: '≥ 15', normalMin: 15, normalMax: null },
      { parameterName: 'Morphology', unit: '% Normal', referenceValue: '≥ 4', normalMin: 4, normalMax: null }
    ]
  }
];

export async function seedParameterCatalog() {
  try {
    let count = 0;
    let orderIndex = 1;

    for (const catGroup of MASTER_LAB_CATEGORIES) {
      for (const p of catGroup.parameters) {
        const existing = await LabTestParameter.findOne({
          parameterName: p.parameterName,
          category: catGroup.category,
          subcategory: catGroup.subcategory || ''
        });

        if (!existing) {
          await LabTestParameter.create({
            parameterName: p.parameterName,
            category: catGroup.category,
            subcategory: catGroup.subcategory || '',
            unit: p.unit || '',
            referenceValue: p.referenceValue || '',
            normalMin: p.normalMin,
            normalMax: p.normalMax,
            displayOrder: orderIndex++,
            editable: true,
            status: 'Active'
          });
          count++;
        }
      }
    }

    if (count > 0) {
      console.log(`Seeded ${count} master laboratory parameters into MongoDB catalog.`);
    }
  } catch (error) {
    console.error('Error seeding LabTestParameter catalog:', error.message);
  }
}
