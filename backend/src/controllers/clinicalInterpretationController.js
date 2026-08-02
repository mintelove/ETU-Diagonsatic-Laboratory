import ClinicalInterpretation from '../models/ClinicalInterpretation.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import { AppError } from '../utils/appError.js';

const SEED_INTERPRETATIONS = [
  // SEMEN ANALYSIS
  {
    testNames: ['Semen Analysis', 'SEMEN ANALYSIS', 'Semen Examination'],
    category: 'MICROBIOLOGY',
    title: 'Semen Analysis — Comprehensive Evaluation',
    interpretation: 'The semen analysis evaluates semen volume, sperm concentration, total sperm count, progressive motility, morphology, vitality, and microscopic findings according to WHO laboratory standards. Clinical correlation with history and repeat testing after 2–3 months is recommended when abnormal parameters are identified.'
  },
  {
    testNames: ['Semen Analysis', 'SEMEN ANALYSIS', 'Semen Examination'],
    category: 'MICROBIOLOGY',
    title: 'Semen Analysis — Oligozoospermia Note',
    interpretation: 'Decreased sperm concentration (< 15 million/mL) or total sperm count (< 39 million per ejaculate) observed. Clinical evaluation for hormonal, anatomical, or varicocele factors recommended.'
  },
  {
    testNames: ['Semen Analysis', 'SEMEN ANALYSIS', 'Semen Examination'],
    category: 'MICROBIOLOGY',
    title: 'Semen Analysis — Asthenozoospermia Note',
    interpretation: 'Reduced progressive sperm motility (< 32%) or total motility (< 40%) noted. Consideration of seminal plasma factors, varicocele, or abstinence duration is advised.'
  },

  // LIPID PROFILE / CHEMISTRY
  {
    testNames: ['Lipid Profile', 'LIPID PROFILE', 'Lipid Panel', 'Cholesterol Panel'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Lipid Profile — Cardiovascular Risk Assessment',
    interpretation: 'The lipid profile evaluates total cholesterol, HDL, LDL, VLDL, and triglycerides to assist in cardiovascular risk assessment. Results should be interpreted alongside blood pressure, smoking status, age, and clinical history.'
  },
  {
    testNames: ['Lipid Profile', 'LIPID PROFILE', 'Lipid Panel'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Lipid Profile — Elevated LDL Note',
    interpretation: 'Elevated LDL cholesterol levels identified. Elevated LDL is a primary target for lipid-lowering therapy and cardiovascular risk reduction.'
  },
  {
    testNames: ['Lipid Profile', 'LIPID PROFILE', 'Lipid Panel'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Lipid Profile — Hypertriglyceridemia Note',
    interpretation: 'Elevated triglyceride levels noted. Clinical assessment for metabolic syndrome, dietary factors, diabetes control, or alcohol intake recommended.'
  },

  // COMPLETE BLOOD COUNT / HEMATOLOGY
  {
    testNames: ['Complete Blood Count', 'CBC', 'COMPLETE BLOOD COUNT', 'Hematology Differential', 'Hemoglobin'],
    category: 'HEMATOLOGY',
    title: 'Complete Blood Count — Standard Evaluation',
    interpretation: 'Complete blood count assesses red blood cell indices, hemoglobin, hematocrit, white blood cell counts, differential, and platelet counts. Results reflect overall hematologic status and oxygen-carrying capacity.'
  },
  {
    testNames: ['Complete Blood Count', 'CBC', 'COMPLETE BLOOD COUNT', 'Hemoglobin'],
    category: 'HEMATOLOGY',
    title: 'CBC — Anemia Index Assessment',
    interpretation: 'Decreased hemoglobin and hematocrit levels observed. Microcytic, normocytic, or macrocytic RBC indices should be evaluated to identify potential iron deficiency, chronic disease, or nutritional deficiencies.'
  },
  {
    testNames: ['Complete Blood Count', 'CBC', 'COMPLETE BLOOD COUNT', 'WBC'],
    category: 'HEMATOLOGY',
    title: 'CBC — Leukocytosis Note',
    interpretation: 'Elevated white blood cell count noted. May reflect reactive physiological response, acute infection, inflammatory process, or tissue injury.'
  },

  // URINALYSIS / URINE & BODY FLUID ANALYSIS
  {
    testNames: ['Urinalysis', 'URINALYSIS', 'Urine Routine', 'Urine Analysis', '24 Hour Urine Protein'],
    category: 'URINE AND BODY FLUID ANALYSIS',
    title: 'Urinalysis — Standard Diagnostic Evaluation',
    interpretation: 'Physical, chemical, and microscopic examination of urine provides diagnostic insight into renal function, urinary tract conditions, metabolic status, and liver function.'
  },
  {
    testNames: ['Urinalysis', 'URINALYSIS', 'Urine Routine', 'Urine Analysis'],
    category: 'URINE AND BODY FLUID ANALYSIS',
    title: 'Urinalysis — Inflammatory / UTI Note',
    interpretation: 'Presence of leukocyte esterase, nitrites, or elevated WBCs per high-power field suggests potential urinary tract infection. Urine culture recommended if clinically indicated.'
  },

  // KNEE JOINT FLUID ANALYSIS / SYNOVIAL FLUID
  {
    testNames: ['Knee Joint Fluid Analysis', 'Synovial Fluid Analysis', 'Joint Fluid Analysis', 'PLEURAL FLUID ANALYSIS', 'PERITONEAL FLUID ANALYSIS'],
    category: 'URINE AND BODY FLUID ANALYSIS',
    title: 'Synovial / Joint Fluid Analysis',
    interpretation: 'Fluid analysis assesses appearance, viscosity, cell count, crystal presence, and bacterial status to differentiate inflammatory, non-inflammatory, crystal-induced, or septic joint disease.'
  },

  // LIVER FUNCTION TESTS (LFT)
  {
    testNames: ['Liver Function Test', 'Liver Function Tests', 'LFT', 'LIVER FUNCTION TEST'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Liver Function Tests — Hepatic Panel Interpretation',
    interpretation: 'Evaluates parenchymal hepatic injury (ALT/AST), biliary tract status (ALP, Bilirubin), and synthetic liver function (Albumin, Total Protein).'
  },

  // RENAL FUNCTION TESTS (RFT)
  {
    testNames: ['Renal Function Tests', 'Renal Function Test', 'RFT', 'RENAL FUNCTION TESTS'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Renal Function Tests — Kidney Assessment',
    interpretation: 'Assesses renal filtration and excretion capacity via Serum Creatinine, Blood Urea/BUN, and estimated GFR.'
  },

  // DIABETIC TESTS (HbA1c, FBS, RBS)
  {
    testNames: ['HbA1c', 'FBS', 'RBS', 'Blood Sugar', 'Diabetic Profile', 'Fasting Blood Sugar'],
    category: 'CLINICAL CHEMISTRY',
    title: 'Glycemic Control & HbA1c Assessment',
    interpretation: 'HbA1c reflects average blood glucose control over the preceding 2–3 months. Values ≥ 6.5% indicate glycemic status consistent with diabetes mellitus in appropriate clinical context.'
  },

  // SEROLOGY (Widal, HIV, HBsAg, Coombs, ANA, ASO, RF, H. pylori)
  {
    testNames: ['Widal Test', 'HIV Test', 'HBsAg', 'ASO Titer', 'Rheumatoid Factor', 'H. pylori', 'Coombs Test', 'ANA', 'Serology'],
    category: 'SEROLOGY AND IMMUNOHEMATOLOGY',
    title: 'Serological Assay Interpretation',
    interpretation: 'Serological assays detect specific antibodies or antigens. Results must be clinically correlated with patient symptoms, onset timing, and confirmation testing where indicated.'
  },

  // STOOL EXAMINATION / PARASITOLOGY
  {
    testNames: ['Stool Examination', 'STOOL EXAMINATION', 'Ova & Parasite Examination', 'Stool Routine'],
    category: 'PARASITOLOGY',
    title: 'Stool Examination & Parasitology',
    interpretation: 'Microscopic and physical examination of stool specimen evaluating for ova, parasites, cysts, trophozoites, occult blood, or microscopic cellular elements.'
  }
];

async function seedIfNeeded() {
  const count = await ClinicalInterpretation.countDocuments();
  if (count > 0) return;

  const docsToCreate = [];
  for (const item of SEED_INTERPRETATIONS) {
    for (const testName of item.testNames) {
      // Find matching LaboratoryTest in DB if exists
      const foundTest = await LaboratoryTest.findOne({ name: new RegExp(`^${testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).select('_id name');
      docsToCreate.push({
        laboratoryTest: foundTest ? foundTest._id : null,
        laboratoryTestName: testName.toUpperCase(),
        categoryName: item.category,
        title: item.title,
        interpretation: item.interpretation,
        active: true
      });
    }
  }

  if (docsToCreate.length) {
    await ClinicalInterpretation.insertMany(docsToCreate);
  }
}

export async function getInterpretationsForTest(req, res, next) {
  try {
    await seedIfNeeded();
    const { testName, testId } = req.query;

    const query = { active: true };
    if (testId) {
      query.$or = [{ laboratoryTest: testId }];
      if (testName) {
        query.$or.push({ laboratoryTestName: new RegExp(`^${testName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      }
    } else if (testName) {
      const norm = testName.trim().toUpperCase();
      query.$or = [
        { laboratoryTestName: new RegExp(`^${testName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { laboratoryTestName: { $regex: norm, $options: 'i' } }
      ];
    }

    let list = await ClinicalInterpretation.find(query).sort({ title: 1 }).lean();

    // Fallback: if no specific interpretation matched by test name, return matching category or general interpretations
    if (!list.length && testName) {
      const normName = testName.trim().toUpperCase();
      list = await ClinicalInterpretation.find({
        active: true,
        $or: [
          { laboratoryTestName: { $regex: normName, $options: 'i' } },
          { title: { $regex: normName, $options: 'i' } }
        ]
      }).sort({ title: 1 }).lean();
    }

    // If still empty, return all active interpretations so collector is never stuck empty
    if (!list.length) {
      list = await ClinicalInterpretation.find({ active: true }).limit(20).sort({ title: 1 }).lean();
    }

    res.json({ interpretations: list });
  } catch (error) { next(error); }
}

export async function adminListInterpretations(req, res, next) {
  try {
    await seedIfNeeded();
    const list = await ClinicalInterpretation.find().populate('laboratoryTest', 'name category').sort({ laboratoryTestName: 1, title: 1 }).lean();
    res.json({ interpretations: list });
  } catch (error) { next(error); }
}

export async function createInterpretation(req, res, next) {
  try {
    const { laboratoryTestId, laboratoryTestName, title, interpretation } = req.body;
    if (!title?.trim() || !interpretation?.trim()) {
      throw new AppError('Title and Interpretation body are required.', 422);
    }
    const testName = laboratoryTestName ? laboratoryTestName.trim().toUpperCase() : 'GENERAL';

    const created = await ClinicalInterpretation.create({
      laboratoryTest: laboratoryTestId || null,
      laboratoryTestName: testName,
      title: title.trim(),
      interpretation: interpretation.trim(),
      active: true
    });
    res.status(201).json({ interpretation: created });
  } catch (error) { next(error); }
}

export async function updateInterpretation(req, res, next) {
  try {
    const { title, interpretation, active, laboratoryTestName } = req.body;
    const update = {};
    if (title) update.title = title.trim();
    if (interpretation) update.interpretation = interpretation.trim();
    if (active !== undefined) update.active = Boolean(active);
    if (laboratoryTestName) update.laboratoryTestName = laboratoryTestName.trim().toUpperCase();

    const updated = await ClinicalInterpretation.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!updated) throw new AppError('Interpretation template not found.', 404);
    res.json({ interpretation: updated });
  } catch (error) { next(error); }
}
