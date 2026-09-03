import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';import LaboratoryTest from '../models/LaboratoryTest.js';import LaboratorySettings from '../models/LaboratorySettings.js';import SampleType from '../models/SampleType.js';import StockItem from '../models/StockItem.js';import {AppError} from '../utils/appError.js';import {emit} from '../services/sseService.js';
import { MASTER_LAB_CATEGORIES } from '../config/parameterCatalogSeeder.js';
import { seedDepartmentCatalogs } from '../scripts/seedDepartmentCatalogs.js';

const referralTests = [
  ['CA-125', 2000], ['CA-19', 2000], ['ANTI MULLERIAN HORMONE', 4124],
  ['ANA Titer 1100', 2750], ['Anti dsDNA', 2755], ['ANTI CYCLIC CITRULLINATATED PEPTIDE 2000', 3100],
  ['CA 15-3', 2000], ['CD4', 4800], ['Cortisol Serum', 2200], ['Ferratin or Folate', 1680],
  ['HBV Viral Load', 4180], ['HCV Viral Load', 3880], ['HCV Genotype', 8100],
  ['Hepatitis C Screen', 1430], ['HIV Viral Load', 3360], ['HIV 1 RNA Quantitative', 3360],
  ['Lipase', 1700], ['PTH', 2000], ['Testosterone', 2000], ['Vitamin B12', 2000],
  ['Female Cancer Markers', 4400], ['Male Cancer Marker', 6000], ['Vit B12 & Folate', 2900],
  ['Hepatitis B Surface Quantitative (10 Days)', 5405]
];

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function seedReferralTests() {
  let category = await LaboratoryTestCategory.findOne({ name: /referral/i });
  if (!category) {
    category = await LaboratoryTestCategory.create({ name: 'REFERRAL', displayOrder: 12, status: 'Active' });
  } else {
    category.name = 'REFERRAL';
    category.status = 'Active';
    category.hidden = false;
    category.displayOrder = 12;
    await category.save();
  }

  for (let i = 0; i < referralTests.length; i++) {
    const [name, defaultPrice] = referralTests[i];
    const existing = await LaboratoryTest.findOne({
      category: category._id,
      name: new RegExp(`^${escapeRegex(name)}$`, 'i')
    });

    if (existing) {
      existing.name = name;
      existing.category = category._id;
      existing.status = 'Active';
      existing.displayOrder = i + 1;
      if (existing.price === undefined || existing.price === null) {
        existing.price = defaultPrice;
      }
      await existing.save();
    } else {
      await LaboratoryTest.create({
        name,
        category: category._id,
        price: defaultPrice,
        displayOrder: i + 1,
        status: 'Active',
        description: 'Referral hospital laboratory investigation'
      });
    }
  }
}

export async function seedLaboratoryTests(force = false) {
  try {
    const hormoneCat = await LaboratoryTestCategory.findOne({ name: /^HORMONE/i });
    const bloodGroupCat = await LaboratoryTestCategory.findOne({ name: /^BLOOD GROUP$/i });
    const chemCat = await LaboratoryTestCategory.findOne({ name: /clinical chemistry/i });
    const urineCat = await LaboratoryTestCategory.findOne({ name: /^URINALYSIS/i });

    if (!force) {
      const fshExists = hormoneCat ? await LaboratoryTest.findOne({ category: hormoneCat._id, name: /^fsh$/i }) : false;
      const ft3Test = hormoneCat ? await LaboratoryTest.findOne({ category: hormoneCat._id, name: /ft3/i }) : false;
      const ft4Test = hormoneCat ? await LaboratoryTest.findOne({ category: hormoneCat._id, name: /ft4/i }) : false;
      const magnesiumTest = chemCat ? await LaboratoryTest.findOne({ category: chemCat._id, name: /^magnesium$/i }) : false;
      const urineHcgTest = urineCat ? await LaboratoryTest.findOne({ category: urineCat._id, name: /pregnancy test/i, price: 200 }) : false;
      const urineMicroBundle = urineCat ? await LaboratoryTest.findOne({ category: urineCat._id, name: 'Urine Microscopy', isBundle: true, price: 300 }) : false;
      const urineChemBundle = urineCat ? await LaboratoryTest.findOne({ category: urineCat._id, name: 'Chemical Analysis', isBundle: true, price: 300 }) : false;
      const invalidUrineChildExists = urineCat ? await LaboratoryTest.exists({
        category: urineCat._id,
        name: { $nin: ['Chemical Analysis', 'Urine Microscopy', 'Pregnancy Test (HCG)', 'Pregnancy Test [HCG]'] },
        $or: [
          { price: { $gt: 0 } },
          { billableIndividually: true },
          { includedInBundle: false }
        ]
      }) : true;
      const existingTestCount = await LaboratoryTest.countDocuments();
      if (existingTestCount > 0 && bloodGroupCat && fshExists && ft3Test && ft4Test && ft3Test.price === 1300 && ft4Test.price === 1300 && magnesiumTest && magnesiumTest.price === 1000 && urineHcgTest && urineMicroBundle && urineChemBundle && !invalidUrineChildExists) {
        return;
      }
    }
    const samples = await SampleType.find({});
    const serumSample = samples.find(x => x.name.toLowerCase() === 'serum')?.id;
    const bloodSample = samples.find(x => x.name.toLowerCase() === 'whole blood')?.id;
    const urineSample = samples.find(x => x.name.toLowerCase() === 'urine')?.id;
    const stoolSample = samples.find(x => x.name.toLowerCase() === 'stool')?.id;
    const bodyFluidSample = samples.find(x => x.name.toLowerCase() === 'bodily fluids' || x.name.toLowerCase() === 'body fluid')?.id;

    const mainCategories = [
      'HEMATOLOGY',
      'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
      'COAGULATION TEST',
      'SERUM ELECTROLYTE',
      'HORMONE',
      'SEROLOGY AND IMMUNOHEMATOLOGY',
      'BLOOD GROUP',
      'BLOOD SUGAR TEST (RBS/FBS) / DIABETIC (DM) CHECKUP',
      'URINALYSIS',
      'BACTERIOLOGY / PARASITOLOGY',
      'SEMEN ANALYSIS',
      'STOOL EXAMINATION',
      'URINE AND BODY FLUID ANALYSIS'
    ];

    const categoryMap = new Map();

    for (let catIdx = 0; catIdx < mainCategories.length; catIdx++) {
      const catName = mainCategories[catIdx];
      let catDoc = await LaboratoryTestCategory.findOne({
        name: new RegExp(`^${escapeRegex(catName)}$`, 'i')
      });

      if (!catDoc) {
        const aliasRegex = catName.includes('CLINICAL') ? /clinical chemistry/i
          : catName.includes('SEROLOGY') ? /serolog|immuno/i
          : catName.includes('BLOOD GROUP') ? /blood\s*group|b\/group/i
          : catName.includes('DIABETIC') ? /diabetic|blood sugar/i
          : catName.includes('URINE AND') ? /urine.*body.*fluid/i
          : catName.includes('BACTERIOLOGY') ? /bacteriol|parasitol/i
          : catName.includes('STOOL') ? /stool/i
          : null;

        if (aliasRegex) {
          catDoc = await LaboratoryTestCategory.findOne({ name: aliasRegex });
        }
      }

      if (catDoc) {
        catDoc.name = catName;
        catDoc.displayOrder = catIdx;
        catDoc.status = 'Active';
        catDoc.hidden = false;
        await catDoc.save();
      } else {
        catDoc = await LaboratoryTestCategory.create({
          name: catName,
          displayOrder: catIdx,
          status: 'Active',
          hidden: false
        });
      }
      categoryMap.set(catName, catDoc);
    }

    let testOrder = 1;

    for (const catGroup of MASTER_LAB_CATEGORIES) {
      const catDoc = categoryMap.get(catGroup.category);
      if (!catDoc) continue;

      const subcatName = catGroup.subcategory || '';

      let sampleId;
      if (catGroup.category === 'HEMATOLOGY' || catGroup.category === 'COAGULATION TEST' || catGroup.category === 'BLOOD GROUP') sampleId = bloodSample || serumSample;
      else if (catGroup.category === 'URINALYSIS') sampleId = urineSample;
      else if (catGroup.category === 'STOOL EXAMINATION') sampleId = stoolSample;
      else if (catGroup.category === 'URINE AND BODY FLUID ANALYSIS') sampleId = urineSample || bodyFluidSample;
      else sampleId = serumSample;

      for (const p of catGroup.parameters) {
        const testName = p.parameterName;
        const aliases = p.aliases || [];
        const expectedPrice = p.defaultPrice !== undefined ? Number(p.defaultPrice) : 600;
        const isBundle = Boolean(p.isBundle);
        const billableIndividually = p.billableIndividually !== false;
        const includedInBundle = Boolean(p.includedInBundle);
        const parentBundle = p.parentBundle || '';

        const categoryScopedQueries = [
          { category: catDoc._id, name: new RegExp(`^${escapeRegex(testName)}$`, 'i') },
          ...aliases.map(a => ({ category: catDoc._id, name: new RegExp(`^${escapeRegex(a)}$`, 'i') }))
        ];

        let matches = await LaboratoryTest.find({ $or: categoryScopedQueries });

        if (matches.length === 0) {
          const anyCategoryQueries = [
            { name: new RegExp(`^${escapeRegex(testName)}$`, 'i') },
            ...aliases.map(a => ({ name: new RegExp(`^${escapeRegex(a)}$`, 'i') }))
          ];
          matches = await LaboratoryTest.find({ $or: anyCategoryQueries });
        }

        if (matches.length > 0) {
          const primary = matches[0];
          primary.name = testName;
          primary.category = catDoc._id;
          primary.subcategory = subcatName;
          primary.status = 'Active';
          primary.displayOrder = testOrder++;
          primary.price = expectedPrice;
          primary.isBundle = isBundle;
          primary.billableIndividually = billableIndividually;
          primary.includedInBundle = includedInBundle;
          primary.parentBundle = parentBundle;
          if (sampleId && (!primary.requiredSampleTypes || !primary.requiredSampleTypes.length)) {
            primary.requiredSampleTypes = [sampleId];
          }
          await primary.save();

          if (matches.length > 1) {
            for (let d = 1; d < matches.length; d++) {
              await LaboratoryTest.findByIdAndDelete(matches[d]._id);
            }
          }
        } else {
          await LaboratoryTest.create({
            name: testName,
            category: catDoc._id,
            subcategory: subcatName,
            price: expectedPrice,
            isBundle,
            billableIndividually,
            includedInBundle,
            parentBundle,
            status: 'Active',
            displayOrder: testOrder++,
            description: `${catGroup.category} laboratory investigation`,
            requiredSampleTypes: sampleId ? [sampleId] : []
          });
        }
      }
    }

    // Explicitly enforce bundle structure and non-billable child parameters for Urinalysis
    const urineCatDoc = categoryMap.get('URINALYSIS') || await LaboratoryTestCategory.findOne({ name: /^URIN/i });
    if (urineCatDoc) {
      // 1. Ensure Urine Microscopy bundle parent (300 ETB, isBundle: true, billable: true)
      await LaboratoryTest.findOneAndUpdate(
        { category: urineCatDoc._id, name: 'Urine Microscopy' },
        {
          $set: {
            category: urineCatDoc._id,
            subcategory: 'Urine Microscopy',
            price: 300,
            isBundle: true,
            billableIndividually: true,
            includedInBundle: false,
            parentBundle: '',
            status: 'Active',
            description: 'Urine Microscopy complete examination bundle (300 ETB fixed price)'
          },
          $setOnInsert: {
            requiredSampleTypes: urineSample ? [urineSample] : [],
            displayOrder: 13
          }
        },
        { upsert: true, new: true }
      );

      // 2. Ensure all child parameters of Urine Microscopy exist and are marked as non-billable (price: 0, billableIndividually: false)
      const microscopyParams = [
        { name: 'WBC', displayOrder: 14 },
        { name: 'RBC', displayOrder: 15 },
        { name: 'Epithelial Cells', displayOrder: 16 },
        { name: 'WBC Casts', displayOrder: 17 },
        { name: 'RBC Casts', displayOrder: 18 },
        { name: 'Granular Casts', displayOrder: 19 },
        { name: 'Amorphous Phosphate Crystal', displayOrder: 20 },
        { name: 'Amorphous Urate Crystal', displayOrder: 21 },
        { name: 'Calcium Oxalate Crystal', displayOrder: 22 },
        { name: 'Triple Phosphate Crystal', displayOrder: 23 },
        { name: 'Bacteria', displayOrder: 24 },
        { name: 'Others', displayOrder: 25 }
      ];

      for (const p of microscopyParams) {
        await LaboratoryTest.findOneAndUpdate(
          { category: urineCatDoc._id, name: p.name },
          {
            $set: {
              category: urineCatDoc._id,
              subcategory: 'Urine Microscopy',
              price: 0,
              isBundle: false,
              billableIndividually: false,
              includedInBundle: true,
              parentBundle: 'Urine Microscopy',
              status: 'Active',
              description: 'URINALYSIS laboratory investigation'
            },
            $setOnInsert: {
              requiredSampleTypes: urineSample ? [urineSample] : [],
              displayOrder: p.displayOrder
            }
          },
          { upsert: true, new: true }
        );
      }

      // 3. Ensure Chemical Analysis bundle parent (300 ETB, isBundle: true, billable: true)
      await LaboratoryTest.findOneAndUpdate(
        { category: urineCatDoc._id, name: 'Chemical Analysis' },
        {
          $set: {
            category: urineCatDoc._id,
            subcategory: 'Chemical Analysis',
            price: 300,
            isBundle: true,
            billableIndividually: true,
            includedInBundle: false,
            parentBundle: '',
            status: 'Active',
            description: 'Chemical Analysis complete examination bundle (300 ETB fixed price)'
          },
          $setOnInsert: {
            requiredSampleTypes: urineSample ? [urineSample] : [],
            displayOrder: 1
          }
        },
        { upsert: true, new: true }
      );

      // 4. Mark all child parameters of Chemical Analysis as non-billable (price: 0, billableIndividually: false)
      await LaboratoryTest.updateMany(
        {
          category: urineCatDoc._id,
          name: { $nin: ['Chemical Analysis', 'Pregnancy Test (HCG)', 'Pregnancy Test [HCG]'] },
          $or: [
            { subcategory: /^chemical/i },
            { name: { $in: ['Specific Gravity', 'Leukocyte Esterase', 'pH', 'Nitrite', 'Glucose', 'Protein', 'Blood', 'Ketone', 'Bilirubin', 'Urobilinogen', 'Urinalysis (Routine)'] } }
          ]
        },
        {
          $set: {
            subcategory: 'Chemical Analysis',
            price: 0,
            isBundle: false,
            billableIndividually: false,
            includedInBundle: true,
            parentBundle: 'Chemical Analysis'
          }
        }
      );

      // 5. Ensure Pregnancy Test [HCG] is independent (200 ETB, billableIndividually: true, isBundle: false)
      await LaboratoryTest.updateMany(
        {
          category: urineCatDoc._id,
          name: /pregnancy test|hcg/i
        },
        {
          $set: {
            subcategory: 'Pregnancy Test [HCG]',
            price: 200,
            isBundle: false,
            billableIndividually: true,
            includedInBundle: false,
            parentBundle: ''
          }
        }
      );
    }

    await seedReferralTests();
    await seedDepartmentCatalogs();

    const validNames = [...mainCategories, 'REFERRAL', 'REFERRAL TESTS', 'PATHOLOGY', 'RADIOLOGY', 'Internal Medicine Speciality Examination Form'];
    const validCatDocs = await LaboratoryTestCategory.find({ name: { $in: validNames } });
    const validCatIds = validCatDocs.map(c => String(c._id));

    const obsoleteCategories = await LaboratoryTestCategory.find({ _id: { $nin: validCatIds } });
    for (const obs of obsoleteCategories) {
      obs.status = 'Inactive';
      obs.hidden = true;
      await obs.save();
    }

    await LaboratorySettings.findOneAndUpdate(
      { key: 'default' },
      {
        $setOnInsert: { key: 'default', cbcGroupPrice: 500, counselingPrice: 0 },
        $set: { urineChemicalPrice: 300, urineMicroscopyPrice: 300 }
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('Error during laboratory tests seed synchronization:', err.message);
  }
}
export async function publicCatalog(req,res,next){
  try{
    await seedLaboratoryTests();
    const [categories,settings]=await Promise.all([
      LaboratoryTestCategory.find({status:'Active',hidden:false}).sort({displayOrder:1}),
      LaboratorySettings.findOne({key:'default'})
    ]);
    const catIds = categories.map(x => x._id);
    const tests = await LaboratoryTest.find({
      status:'Active',
      category:{$in:catIds}
    }).populate('requiredSampleTypes','name').sort({displayOrder:1});

    const categoriesWithTests = categories.map(c => {
      const plainCat = c.toObject();
      const catIdStr = String(c._id);
      const catTests = tests.filter(t => String(t.category?._id || t.category) === catIdStr);
      return {
        ...plainCat,
        tests: catTests
      };
    });

    res.json({categories: categoriesWithTests, settings});
  }catch(e){next(e)}
}
export async function adminCatalog(req,res,next){try{await seedLaboratoryTests();const [categories,tests,settings,samples,stockItems]=await Promise.all([LaboratoryTestCategory.find().sort({displayOrder:1}),LaboratoryTest.find().populate('category','name').populate('requiredSampleTypes','name').populate('consumables.item','itemName unit').sort({displayOrder:1}),LaboratorySettings.findOne({key:'default'}),SampleType.find().select('name'),StockItem.find({status:'Active'}).select('itemName unit').sort({itemName:1})]);res.json({categories,tests,settings,samples,stockItems})}catch(e){next(e)}}
export async function createCategory(req,res,next){try{const category=await LaboratoryTestCategory.create(req.body);emit('laboratory-tests:change',{});res.status(201).json({category})}catch(e){next(e)}}
export async function updateCategory(req,res,next){try{const category=await LaboratoryTestCategory.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!category)throw new AppError('Category not found.',404);emit('laboratory-tests:change',{});res.json({category})}catch(e){next(e)}}
export async function deleteCategory(req,res,next){try{if(await LaboratoryTest.exists({category:req.params.id}))throw new AppError('Delete or move its tests first.',422);await LaboratoryTestCategory.findByIdAndDelete(req.params.id);emit('laboratory-tests:change',{});res.status(204).send()}catch(e){next(e)}}
export async function createTest(req,res,next){try{const {name,category}=req.body;if(name?.trim()&&category){const existing=await LaboratoryTest.findOne({category,name:new RegExp(`^${escapeRegex(name.trim())}$`,'i')});if(existing){Object.assign(existing,req.body);await existing.save();emit('laboratory-tests:change',{});return res.status(200).json({test:existing})}}const test=await LaboratoryTest.create(req.body);emit('laboratory-tests:change',{});res.status(201).json({test})}catch(e){next(e)}}
export async function updateTest(req,res,next){try{const test=await LaboratoryTest.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!test)throw new AppError('Laboratory test not found.',404);emit('laboratory-tests:change',{});res.json({test})}catch(e){next(e)}}
export async function deleteTest(req,res,next){try{await LaboratoryTest.findByIdAndDelete(req.params.id);emit('laboratory-tests:change',{});res.status(204).send()}catch(e){next(e)}}
export async function getSettings(req,res,next){try{const settings=await LaboratorySettings.findOne({key:'default'});res.json({settings:settings||{}})}catch(e){next(e)}}
export async function updateSettings(req,res,next){
  try{
    const settings=await LaboratorySettings.findOneAndUpdate({key:'default'},req.body,{new:true,upsert:true,runValidators:true});
    // Sync bundle prices to LaboratoryTest documents if updated
    if (req.body.urineMicroscopyPrice !== undefined) {
      const urineCat = await LaboratoryTestCategory.findOne({ name: /^URIN/i });
      if (urineCat) {
        await LaboratoryTest.updateMany({ category: urineCat._id, name: 'Urine Microscopy', isBundle: true }, { $set: { price: Number(req.body.urineMicroscopyPrice) } });
      }
    }
    if (req.body.urineChemicalPrice !== undefined) {
      const urineCat = await LaboratoryTestCategory.findOne({ name: /^URIN/i });
      if (urineCat) {
        await LaboratoryTest.updateMany({ category: urineCat._id, name: 'Chemical Analysis', isBundle: true }, { $set: { price: Number(req.body.urineChemicalPrice) } });
      }
    }
    emit('laboratory-tests:change',{});
    res.json({settings});
  }catch(e){next(e)}
}

