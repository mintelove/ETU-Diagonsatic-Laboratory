import ClinicalInterpretation from '../models/ClinicalInterpretation.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import { AppError } from '../utils/appError.js';

/**
 * Clean 15 Master Interpretations derived STRICTLY from the supplied document:
 * "etu lab test list (2).docx" / "7788.docx"
 */
export const SEED_INTERPRETATIONS = [
  // 1. Complete Blood Count (CBC)
  {
    testNames: ['Complete Blood Count', 'CBC', 'COMPLETE BLOOD COUNT', 'Hematology', 'Hemoglobin', 'WBC', 'RBC', 'Platelets'],
    category: 'HEMATOLOGY',
    title: 'Complete Blood Count (CBC)',
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
    testNames: ['Liver Function Tests', 'Liver Function Test', 'LFT', 'LIVER FUNCTION TEST', 'ALT', 'AST', 'SGPT', 'SGOT', 'Bilirubin', 'Alkaline Phosphatase', 'Albumin', 'Total Protein'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Liver Function Tests (LFT)',
    interpretation: `These are biochemical tests that will show you how well the liver is working. Some of the results may be outside the "normal ranges" but looking at them in context of you as an individual, alongside the tests, they could be nothing to worry about. But it is always advisable to consult your physician for anything that turns out abnormal.`
  },

  // 3. Renal Function Tests (RFT / eGFR)
  {
    testNames: ['Renal Function Tests', 'Renal Function Test', 'RFT', 'RENAL FUNCTION TESTS', 'Kidney Function Test', 'eGFR', 'Creatinine', 'Urea', 'BUN'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Renal Function Tests (RFT / eGFR)',
    interpretation: `The kidney tests allow you to know if the filtration of the kidney is normal. The eGFR can help to detect early chronic kidney disease and is more sensitive than measuring creatinine alone. In addition, testing for electrolytes also indicates whether the kidneys are maintaining normal salt and water balance.`
  },

  // 4. Lipid Profile
  {
    testNames: ['Lipid Profile', 'LIPID PROFILE', 'Lipid Panel', 'Cholesterol', 'Triglycerides', 'HDL', 'LDL'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Lipid Profile',
    interpretation: `These tests help to assess the risk for blood vessel disease (thickening of artery walls) and subsequent risk of heart disease and strokes. The level of your blood cholesterol is determined by a combination of genetic and dietary factors.

Cholesterol is essential to life and is used in the production of important hormones and cellular parts. Excess cholesterol is a significant contributor to the development of heart disease and therefore lowering the level is beneficial.`
  },

  // 5. Electrolytes
  {
    testNames: ['Electrolytes', 'ELECTROLYTES', 'Electrolyte Panel', 'Electolayte', 'Sodium', 'Potassium', 'Chloride'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Electrolytes',
    interpretation: `Electrolytes are minerals, such as sodium and potassium that are found in the body. They keep your body’s fluids in balance and help keep your body working normally, including your heart rhythm, muscle contraction, and brain function. If a patient has a single electrolyte that is high or low, such as sodium or potassium, the doctor may repeat testing of that individual electrolyte, monitoring the imbalance until it resolves.`
  },

  // 6. Calcium & Phosphorus
  {
    testNames: ['Calcium', 'Phosphorus', 'Calcium & Phosphorus', 'T. Calcium', 'Total Calcium', 'Phosphate'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Calcium & Phosphorus',
    interpretation: `Calcium and phosphate levels may be increased or decreased in a variety of diseases and are also used in assessing kidney function.`
  },

  // 7. Diabetic Checkup (HbA1c & Fasting Glucose)
  {
    testNames: ['HbA1c', 'FBS', 'RBS', 'Blood Sugar', 'Diabetic Checkup', 'Diabetic Profile', 'Fasting Blood Sugar', 'Random Blood Sugar', 'HgA1C', 'Blood suger test(rbs/fbs)'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Diabetic Checkup (HbA1c & Blood Glucose)',
    interpretation: `The A1C test is a common blood test used to diagnose type 1 and type 2 diabetes and then to gauge how well you are managing.`
  },

  // 8. Uric Acid
  {
    testNames: ['Uric Acid', 'URIC ACID', 'Serum Uric Acid'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Uric Acid',
    interpretation: `Uric acid is the substance which causes gout. Increased levels are seen in several illnesses as well as gout. Low levels are not significant.`
  },

  // 9. Iron Studies
  {
    testNames: ['Iron', 'IRON', 'Serum Iron', 'Iron Studies'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Iron Studies',
    interpretation: `The test is used to detect and diagnose iron deficiency or iron overload. In people with anemia, the test can help determine whether the condition is due to iron deficiency or another cause, such as chronic blood loss or some other illness. Early iron deficiency often goes unnoticed. If a person is otherwise healthy, symptoms seldom emerge before the hemoglobin in the blood drops below a certain level (about 10 g per deciliter).`
  },

  // 10. Lactate Dehydrogenase (LDH)
  {
    testNames: ['Lactate Dehydrogenase', 'LDH', 'LACTAT DEHYDROGENASE', 'LDE'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Lactate Dehydrogenase (LDH)',
    interpretation: `Lactate dehydrogenase (LDH) is an enzyme that helps facilitate turning sugar into energy for your cells to use. LDH is present in many kinds of organs and tissues throughout the body, including the liver, heart, pancreas, kidneys, skeletal muscles, brain, and blood cells. When illness or injury damages your cells, LDH may be released into the bloodstream, causing the level of LDH in your blood to rise. High levels of LDH in the blood indicate acute or chronic cell damage, but additional tests will be necessary to discover its cause. Abnormally low LDH levels occur rarely and are not usually harmful.`
  },

  // 11. Urinalysis
  {
    testNames: ['Urinalysis', 'URINALYSIS', 'Urine Routine', 'Urine Analysis', 'Routine Urinalysis', 'Urine microscopy', 'Urine analysis'],
    category: 'URINALYSIS',
    title: 'Routine Urinalysis',
    interpretation: `Urinalysis involves examining the appearance, concentration and content of urine. It can reveal diseases that have gone unnoticed because they do not produce striking signs or symptoms. Examples include diabetes mellitus, various forms of glomerulonephritis, and chronic urinary tract infections.`
  },

  // 12. C-Reactive Protein (CRP / hs-CRP)
  {
    testNames: ['CRP', 'CRP, QUANT', 'C-Reactive Protein', 'Hs-CRP', 'C – REACTIVE PROTIEN QUANTITATIVE'],
    category: 'IMMUNOLOGY / INFLAMMATION',
    title: 'C-Reactive Protein (CRP / hs-CRP)',
    interpretation: `C-reactive protein (CRP) is a protein that the liver makes when there is inflammation in the body. It’s also called a marker of inflammation, and can be measured with an hs-CRP (high sensitive C-reactive protein) test. Inflammation is a way for the body to protect itself from injuries or infections, and inflammation can be caused by smoking, high blood pressure, and high blood sugar. Excessive inflammation has been linked to heart disease. hs-CRP testing is used to predict the risk of developing heart diseases and its complications, such as heart attacks, strokes, peripheral arterial disease and sudden cardiac death. Higher hs-CRP levels are linked to higher risk of these problems. The American Heart Association and U.S. Centers for Disease Control and Prevention defined risk groups as follows:
- Low risk: less than 1.0 mg/L
- Average risk: 1.0 to 3.0 mg/L
- High risk: above 3.0 mg/L
These values are only a part of the total evaluation for cardiovascular diseases. Additional risk factors to be considered are elevated levels of cholesterol, LDL-C, and glucose. In addition, smoking, high blood pressure (hypertension) and diabetes also increase the risk level.`
  },

  // 13. Indirect Coombs Test
  {
    testNames: ['Indirect Coombs Test', 'INDIRECT COOMBS TEST', 'Coombs Test', 'INDIRECT COOMBS TEST ( NEGATIVE )'],
    category: 'IMMUNOLOGY / INFLAMMATION',
    title: 'Indirect Coombs Test',
    interpretation: `Coombs test is used in prenatal testing of pregnant women and in testing prior to a blood transfusion. The test detects antibodies against foreign red blood cells.`
  },

  // 14. 24 Hour Urine Protein Test
  {
    testNames: ['24 Hour Urine Protein Test', '24 HOUR URINE PROTEIN TEST', '24 Hr Urine Protein'],
    category: 'CLINICAL CHEMISTRY',
    title: '24-Hour Urine Protein Test',
    interpretation: `24 Hour Urine Protein test is used to check how much protein is being spilled into the urine, which can help to diagnose kidney disease or other problems.`
  },

  // 15. Antinuclear Antibody (ANA) Screen Test
  {
    testNames: ['ANA Screen Test', 'ANTINUCLEAR ANTIBODY(ANA) SCREEN TEST', 'ANA', 'ANA Test', 'Ana test'],
    category: 'IMMUNOLOGY / INFLAMMATION',
    title: 'Antinuclear Antibody (ANA) Screen Test',
    interpretation: `ANA screen test is done for lupus panel measurement for SLE. ANA IFA screen suggests the presence of autoimmune disease, and will reflex to titer and pattern if positive result.`
  }
];

export async function seedIfNeeded(forceReset = false) {
  const count = await ClinicalInterpretation.countDocuments();

  // If forceReset is requested or if count !== 15, completely clear and rebuild
  if (forceReset || count !== SEED_INTERPRETATIONS.length) {
    console.log(`[ClinicalInterpretation] Resetting master library. Current count: ${count} -> Target: ${SEED_INTERPRETATIONS.length}`);
    await ClinicalInterpretation.deleteMany({});

    const docsToCreate = [];
    for (const item of SEED_INTERPRETATIONS) {
      const primaryTest = item.testNames[0];
      const foundTest = await LaboratoryTest.findOne({
        name: new RegExp(`^${primaryTest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      }).select('_id name');

      docsToCreate.push({
        laboratoryTest: foundTest ? foundTest._id : null,
        laboratoryTestName: primaryTest.toUpperCase(),
        categoryName: item.category,
        title: item.title,
        interpretation: item.interpretation,
        active: true
      });
    }

    if (docsToCreate.length) {
      await ClinicalInterpretation.insertMany(docsToCreate);
    }
  }
}

export async function getInterpretationsForTest(req, res, next) {
  try {
    await seedIfNeeded();
    const { testName, testId, category, search } = req.query;

    const filter = { active: true };

    if (category && category !== 'ALL') {
      filter.categoryName = new RegExp(`^${category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    }

    if (search && search.trim()) {
      const s = search.trim();
      const regex = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { title: regex },
        { interpretation: regex },
        { laboratoryTestName: regex },
        { categoryName: regex }
      ];
    } else if (testName) {
      const norm = testName.trim().toUpperCase();
      const regex = new RegExp(testName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      filter.$or = [
        { laboratoryTestName: regex },
        { laboratoryTestName: { $regex: norm, $options: 'i' } },
        { title: { $regex: norm, $options: 'i' } },
        { categoryName: { $regex: norm, $options: 'i' } }
      ];
    } else if (testId) {
      filter.laboratoryTest = testId;
    }

    let list = await ClinicalInterpretation.find(filter).sort({ categoryName: 1, title: 1 }).lean();

    // Fallback: If filtered returned nothing, return all active 15 interpretations
    if (!list.length && (testName || category)) {
      list = await ClinicalInterpretation.find({ active: true }).sort({ categoryName: 1, title: 1 }).lean();
    }

    res.json({ interpretations: list });
  } catch (error) { next(error); }
}

export async function adminListInterpretations(req, res, next) {
  try {
    await seedIfNeeded();
    const list = await ClinicalInterpretation.find()
      .populate('laboratoryTest', 'name category')
      .sort({ categoryName: 1, title: 1 })
      .lean();
    res.json({ interpretations: list });
  } catch (error) { next(error); }
}

export async function createInterpretation(req, res, next) {
  try {
    const { laboratoryTestId, laboratoryTestName, categoryName, title, interpretation } = req.body;
    if (!title?.trim() || !interpretation?.trim()) {
      throw new AppError('Title and Interpretation body are required.', 422);
    }
    const testName = laboratoryTestName ? laboratoryTestName.trim().toUpperCase() : 'GENERAL';

    const created = await ClinicalInterpretation.create({
      laboratoryTest: laboratoryTestId || null,
      laboratoryTestName: testName,
      categoryName: categoryName ? categoryName.trim().toUpperCase() : 'GENERAL',
      title: title.trim(),
      interpretation: interpretation.trim(),
      active: true
    });
    res.status(201).json({ interpretation: created });
  } catch (error) { next(error); }
}

export async function updateInterpretation(req, res, next) {
  try {
    const { title, interpretation, active, laboratoryTestName, categoryName } = req.body;
    const update = {};
    if (title) update.title = title.trim();
    if (interpretation) update.interpretation = interpretation.trim();
    if (active !== undefined) update.active = Boolean(active);
    if (laboratoryTestName) update.laboratoryTestName = laboratoryTestName.trim().toUpperCase();
    if (categoryName) update.categoryName = categoryName.trim().toUpperCase();

    const updated = await ClinicalInterpretation.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!updated) throw new AppError('Interpretation template not found.', 404);
    res.json({ interpretation: updated });
  } catch (error) { next(error); }
}

export async function deleteInterpretation(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await ClinicalInterpretation.findByIdAndDelete(id);
    if (!deleted) throw new AppError('Interpretation template not found.', 404);
    res.json({ success: true, message: 'Interpretation deleted successfully.' });
  } catch (error) { next(error); }
}

export async function resetLibrary(req, res, next) {
  try {
    await seedIfNeeded(true);
    const list = await ClinicalInterpretation.find().sort({ categoryName: 1, title: 1 }).lean();
    res.json({ success: true, message: 'Clinical interpretation library reset strictly to supplied document.', count: list.length, interpretations: list });
  } catch (error) { next(error); }
}
