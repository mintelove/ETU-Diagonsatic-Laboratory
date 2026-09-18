/**
 * Clinical Interpretation Library — ETU Diagnostic Laboratory
 * Extracted STRICTLY from the supplied laboratory document:
 * "etu lab test list (2).docx" / "7788.docx"
 *
 * RULES:
 * - Exactly ONE clean master interpretation per supported test/section.
 * - No duplicates or repeated variations.
 * - No patient-specific example values (e.g. 150 mmHg, 125.0 mL/min, 0.9 mg/dL, 211 mg/dL).
 * - No AI-generated or invented outside clinical advice.
 */

export const CLINICAL_INTERPRETATION_CATEGORIES = [
  'ALL',
  'HEMATOLOGY',
  'CLINICAL CHEMISTRY',
  'IMMUNOLOGY / INFLAMMATION',
  'URINALYSIS'
];

export const CLINICAL_INTERPRETATIONS_LIBRARY = [
  // 1. Complete Blood Count (CBC)
  {
    id: 'cbc-master',
    category: 'HEMATOLOGY',
    testNames: ['Complete Blood Count', 'CBC', 'COMPLETE BLOOD COUNT', 'Hematology', 'Hemoglobin', 'WBC', 'RBC', 'Platelets'],
    title: 'Complete Blood Count (CBC)',
    keywords: ['cbc', 'complete blood count', 'bone marrow', 'oxygen', 'infection', 'clot', 'rbc', 'wbc', 'platelet', 'hemoglobin', 'hematocrit'],
    interpretation: `This indicates whether your bone marrow is making the right type of cells to carry oxygen, fight infection and help your blood to clot whenever the need arises. A complete blood count test evaluates several components and features of your blood, including:
* red blood cells, which carry oxygen
* white blood cells, which fight infection
* hemoglobin, the oxygen-carrying protein in red blood cells
* hematocrit, the proportion of red blood cells to the fluid component, or plasma, in your blood
* platelets, which help with blood clotting
Abnormal increases or decreases in cell counts as revealed in a complete blood count may indicate that you have an underlying medical condition that calls for further evaluation.`
  },

  // 2. Liver Function Tests (LFT)
  {
    id: 'lft-master',
    category: 'CLINICAL CHEMISTRY',
    testNames: ['Liver Function Tests', 'Liver Function Test', 'LFT', 'LIVER FUNCTION TEST', 'ALT', 'AST', 'SGPT', 'SGOT', 'Bilirubin', 'Alkaline Phosphatase', 'Albumin', 'Total Protein'],
    title: 'Liver Function Tests (LFT)',
    keywords: ['lft', 'liver', 'hepatic', 'ast', 'alt', 'sgot', 'sgpt', 'alkaline phosphatase', 'bilirubin', 'albumin', 'total protein'],
    interpretation: `These are biochemical tests that will show you how well the liver is working. Some of the results may be outside the "normal ranges" but looking at them in context of you as an individual, alongside the tests, they could be nothing to worry about. But it is always advisable to consult your physician for anything that turns out abnormal.`
  },

  // 3. Renal Function Tests (RFT / eGFR)
  {
    id: 'rft-master',
    category: 'CLINICAL CHEMISTRY',
    testNames: ['Renal Function Tests', 'Renal Function Test', 'RFT', 'RENAL FUNCTION TESTS', 'Kidney Function Test', 'eGFR', 'Creatinine', 'Urea', 'BUN'],
    title: 'Renal Function Tests (RFT / eGFR)',
    keywords: ['kidney', 'renal', 'rft', 'egfr', 'filtration', 'creatinine', 'urea', 'bun', 'salt and water balance'],
    interpretation: `The kidney tests allow you to know if the filtration of the kidney is normal. The eGFR can help to detect early chronic kidney disease and is more sensitive than measuring creatinine alone. In addition, testing for electrolytes also indicates whether the kidneys are maintaining normal salt and water balance.`
  },

  // 4. Lipid Profile
  {
    id: 'lipid-master',
    category: 'CLINICAL CHEMISTRY',
    testNames: ['Lipid Profile', 'LIPID PROFILE', 'Lipid Panel', 'Cholesterol', 'Triglycerides', 'HDL', 'LDL'],
    title: 'Lipid Profile',
    keywords: ['lipid', 'cholesterol', 'triglycerides', 'hdl', 'ldl', 'artery', 'heart disease', 'stroke'],
    interpretation: `These tests help to assess the risk for blood vessel disease (thickening of artery walls) and subsequent risk of heart disease and strokes. The level of your blood cholesterol is determined by a combination of genetic and dietary factors.

Cholesterol is essential to life and is used in the production of important hormones and cellular parts. Excess cholesterol is a significant contributor to the development of heart disease and therefore lowering the level is beneficial.`
  },

  // 5. Electrolytes
  {
    id: 'electrolytes-master',
    category: 'CLINICAL CHEMISTRY',
    testNames: ['Electrolytes', 'ELECTROLYTES', 'Electrolyte Panel', 'Electolayte', 'Sodium', 'Potassium', 'Chloride'],
    title: 'Electrolytes',
    keywords: ['electrolyte', 'electolayte', 'sodium', 'potassium', 'chloride', 'fluid balance', 'heart rhythm'],
    interpretation: `Electrolytes are minerals, such as sodium and potassium that are found in the body. They keep your body’s fluids in balance and help keep your body working normally, including your heart rhythm, muscle contraction, and brain function. If a patient has a single electrolyte that is high or low, such as sodium or potassium, the doctor may repeat testing of that individual electrolyte, monitoring the imbalance until it resolves.`
  },

  // 6. Calcium & Phosphorus
  {
    id: 'calcium-phosphorus-master',
    category: 'CLINICAL CHEMISTRY',
    testNames: ['Calcium', 'Phosphorus', 'Calcium & Phosphorus', 'T. Calcium', 'Total Calcium', 'Phosphate'],
    title: 'Calcium & Phosphorus',
    keywords: ['calcium', 'phosphorus', 'phosphate', 'minerals', 'kidney function'],
    interpretation: `Calcium and phosphate levels may be increased or decreased in a variety of diseases and are also used in assessing kidney function.`
  },

  // 7. Diabetic Checkup (HbA1c & Fasting Glucose)
  {
    id: 'diabetic-master',
    category: 'CLINICAL CHEMISTRY',
    testNames: ['HbA1c', 'FBS', 'RBS', 'Blood Sugar', 'Diabetic Checkup', 'Diabetic Profile', 'Fasting Blood Sugar', 'Random Blood Sugar', 'HgA1C', 'Blood suger test(rbs/fbs)'],
    title: 'Diabetic Checkup (HbA1c & Blood Glucose)',
    keywords: ['diabetes', 'hba1c', 'glucose', 'sugar', 'fbs', 'rbs', 'dm'],
    interpretation: `The A1C test is a common blood test used to diagnose type 1 and type 2 diabetes and then to gauge how well you are managing.`
  },

  // 8. Uric Acid
  {
    id: 'uric-acid-master',
    category: 'CLINICAL CHEMISTRY',
    testNames: ['Uric Acid', 'URIC ACID', 'Serum Uric Acid'],
    title: 'Uric Acid',
    keywords: ['uric acid', 'gout', 'joint'],
    interpretation: `Uric acid is the substance which causes gout. Increased levels are seen in several illnesses as well as gout. Low levels are not significant.`
  },

  // 9. Iron Studies
  {
    id: 'iron-master',
    category: 'CLINICAL CHEMISTRY',
    testNames: ['Iron', 'IRON', 'Serum Iron', 'Iron Studies'],
    title: 'Iron Studies',
    keywords: ['iron', 'anemia', 'deficiency', 'overload', 'hemoglobin', 'chronic blood loss'],
    interpretation: `The test is used to detect and diagnose iron deficiency or iron overload. In people with anemia, the test can help determine whether the condition is due to iron deficiency or another cause, such as chronic blood loss or some other illness. Early iron deficiency often goes unnoticed. If a person is otherwise healthy, symptoms seldom emerge before the hemoglobin in the blood drops below a certain level (about 10 g per deciliter).`
  },

  // 10. Lactate Dehydrogenase (LDH)
  {
    id: 'ldh-master',
    category: 'CLINICAL CHEMISTRY',
    testNames: ['Lactate Dehydrogenase', 'LDH', 'LACTAT DEHYDROGENASE', 'LDE'],
    title: 'Lactate Dehydrogenase (LDH)',
    keywords: ['ldh', 'lactate dehydrogenase', 'cell damage', 'enzyme'],
    interpretation: `Lactate dehydrogenase (LDH) is an enzyme that helps facilitate turning sugar into energy for your cells to use. LDH is present in many kinds of organs and tissues throughout the body, including the liver, heart, pancreas, kidneys, skeletal muscles, brain, and blood cells. When illness or injury damages your cells, LDH may be released into the bloodstream, causing the level of LDH in your blood to rise. High levels of LDH in the blood indicate acute or chronic cell damage, but additional tests will be necessary to discover its cause. Abnormally low LDH levels occur rarely and are not usually harmful.`
  },

  // 11. Urinalysis
  {
    id: 'urinalysis-master',
    category: 'URINALYSIS',
    testNames: ['Urinalysis', 'URINALYSIS', 'Urine Routine', 'Urine Analysis', 'Routine Urinalysis', 'Urine microscopy', 'Urine analysis'],
    title: 'Routine Urinalysis',
    keywords: ['urinalysis', 'urine', 'protein', 'glucose', 'nitrite', 'uti', 'glomerulonephritis'],
    interpretation: `Urinalysis involves examining the appearance, concentration and content of urine. It can reveal diseases that have gone unnoticed because they do not produce striking signs or symptoms. Examples include diabetes mellitus, various forms of glomerulonephritis, and chronic urinary tract infections.`
  },

  // 12. C-Reactive Protein (CRP / hs-CRP)
  {
    id: 'crp-master',
    category: 'IMMUNOLOGY / INFLAMMATION',
    testNames: ['CRP', 'CRP, QUANT', 'C-Reactive Protein', 'Hs-CRP', 'C – REACTIVE PROTIEN QUANTITATIVE'],
    title: 'C-Reactive Protein (CRP / hs-CRP)',
    keywords: ['crp', 'c-reactive protein', 'hs-crp', 'inflammation', 'cardiovascular', 'heart attack', 'stroke'],
    interpretation: `C-reactive protein (CRP) is a protein that the liver makes when there is inflammation in the body. It’s also called a marker of inflammation, and can be measured with an hs-CRP (high sensitive C-reactive protein) test. Inflammation is a way for the body to protect itself from injuries or infections, and inflammation can be caused by smoking, high blood pressure, and high blood sugar. Excessive inflammation has been linked to heart disease. hs-CRP testing is used to predict the risk of developing heart diseases and its complications, such as heart attacks, strokes, peripheral arterial disease and sudden cardiac death. Higher hs-CRP levels are linked to higher risk of these problems. The American Heart Association and U.S. Centers for Disease Control and Prevention defined risk groups as follows:
- Low risk: less than 1.0 mg/L
- Average risk: 1.0 to 3.0 mg/L
- High risk: above 3.0 mg/L
These values are only a part of the total evaluation for cardiovascular diseases. Additional risk factors to be considered are elevated levels of cholesterol, LDL-C, and glucose. In addition, smoking, high blood pressure (hypertension) and diabetes also increase the risk level.`
  },

  // 13. Indirect Coombs Test
  {
    id: 'coombs-master',
    category: 'IMMUNOLOGY / INFLAMMATION',
    testNames: ['Indirect Coombs Test', 'INDIRECT COOMBS TEST', 'Coombs Test', 'INDIRECT COOMBS TEST ( NEGATIVE )'],
    title: 'Indirect Coombs Test',
    keywords: ['coombs', 'indirect coombs', 'prenatal', 'pregnancy', 'blood transfusion', 'antibodies'],
    interpretation: `Coombs test is used in prenatal testing of pregnant women and in testing prior to a blood transfusion. The test detects antibodies against foreign red blood cells.`
  },

  // 14. 24 Hour Urine Protein Test
  {
    id: 'urine-protein-24hr-master',
    category: 'CLINICAL CHEMISTRY',
    testNames: ['24 Hour Urine Protein Test', '24 HOUR URINE PROTEIN TEST', '24 Hr Urine Protein'],
    title: '24-Hour Urine Protein Test',
    keywords: ['24 hour', 'urine protein', 'proteinuria', 'kidney disease'],
    interpretation: `24 Hour Urine Protein test is used to check how much protein is being spilled into the urine, which can help to diagnose kidney disease or other problems.`
  },

  // 15. Antinuclear Antibody (ANA) Screen Test
  {
    id: 'ana-master',
    category: 'IMMUNOLOGY / INFLAMMATION',
    testNames: ['ANA Screen Test', 'ANTINUCLEAR ANTIBODY(ANA) SCREEN TEST', 'ANA', 'ANA Test', 'Ana test'],
    title: 'Antinuclear Antibody (ANA) Screen Test',
    keywords: ['ana', 'antinuclear antibody', 'lupus', 'sle', 'autoimmune disease', 'ifa'],
    interpretation: `ANA screen test is done for lupus panel measurement for SLE. ANA IFA screen suggests the presence of autoimmune disease, and will reflex to titer and pattern if positive result.`
  }
];

/**
 * Finds the single authentic source interpretation matching a test or category name.
 * If no source interpretation exists for this test, returns null.
 */
export function findMatchingSourceInterpretation(testOrCategoryName = '') {
  if (!testOrCategoryName) return null;
  const q = testOrCategoryName.trim().toUpperCase();

  // 1. Exact or strong match against testNames
  for (const item of CLINICAL_INTERPRETATIONS_LIBRARY) {
    const match = item.testNames.some(t => {
      const u = t.toUpperCase();
      return u === q || (q.length > 2 && (u.startsWith(q) || q.startsWith(u)));
    });
    if (match) return item;
  }

  // 2. Category fallback (e.g. 'HEMATOLOGY' -> CBC, 'URINALYSIS' -> Urinalysis)
  if (q.includes('HEMAT') || q.includes('CBC')) {
    return CLINICAL_INTERPRETATIONS_LIBRARY.find(i => i.id === 'cbc-master') || null;
  }
  if (q.includes('URIN')) {
    return CLINICAL_INTERPRETATIONS_LIBRARY.find(i => i.id === 'urinalysis-master') || null;
  }

  return null;
}

/**
 * Returns prioritized interpretations for selector modal
 */
export function getRecommendedInterpretations(testOrCategoryName = '') {
  const match = findMatchingSourceInterpretation(testOrCategoryName);
  if (!match) return CLINICAL_INTERPRETATIONS_LIBRARY;

  return [match, ...CLINICAL_INTERPRETATIONS_LIBRARY.filter(i => i.id !== match.id)];
}
