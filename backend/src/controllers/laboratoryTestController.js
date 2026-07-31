import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';import LaboratoryTest from '../models/LaboratoryTest.js';import LaboratorySettings from '../models/LaboratorySettings.js';import SampleType from '../models/SampleType.js';import StockItem from '../models/StockItem.js';import {AppError} from '../utils/appError.js';import {emit} from '../services/sseService.js';
const catalog=[['HEMATOLOGY',['Complete Blood Count with Differential Count','Peripheral Morphology','Reticulocyte Count','Coagulation Profile (PT, aPTT, INR, D-Dimer, Fibrinogen, Bleeding Time, Clotting Time)','ESR'],'Whole Blood'],['CLINICAL CHEMISTRY and IMMUNOASSAY TESTS',['Renal Function Test','Lipid Profile','Liver Function Test','Uric Acid','Serum Electrolyte','Cardiac Tests','Oncology Tests / Tumor Markers','Fertility Tests','Thyroid Function Tests','Diabetic Tests','Quantitative Protein Tests','CSF & 24 Hour Urine Protein'],'Serum'],['URINE AND BODY FLUID ANALYSIS',['Urine Microscopy','Urine Chemical Test','Body Fluid Analysis'],'Urine'],['PARASITOLOGY',['Stool Examination','Hemoparasite','Filarial Parasite Identification','Modified Acid Fast Stain'],'Stool'],['MICROBIOLOGY',['Bacterial Culture & DST','Fungal Culture','Tuberculosis Culture & DST','Gram Stain','AFB Stain','Indian Ink'],'Body Fluids'],['SEROLOGY AND IMMUNOHEMATOLOGY',['Widal Test (Typhoid)','Weli Flex (Typhus)','ASO Titer (Tonsillitis)','HIV Test','HBsAg','Rheumatoid Factor (RF)','H. pylori Antigen','H. pylori Antibody','Blood Group & RH Type','Direct Coombs Test','Indirect Coombs Test','Crossmatch','RPR','CRP','Beta HCG','ANA','Fecal Occult Blood','HCV Test'],'Serum'],['REFERRAL TESTS',[],'Serum'],['OTHER TESTS',['Viral Load Tests','COVID-19 RT-PCR','Serum Electrophoresis','OGTT','Semen Analysis','Drug Test'],'Serum']];
const referralTests=[['CA-125',2000],['CA-19',2000],['ANTI MULLERIAN HORMONE',4124],['ANA Titer 1100',2750],['Anti dsDNA',2755],['ANTI CYCLIC CITRULLINATATED PEPTIDE 2000',3100],['CA 15-3',2000],['CD4',4800],['Cortisol Serum',2200],['Ferratin or Folate',1680],['HBV Viral Load',4180],['HCV Viral Load',3880],['HCV Genotype',8100],['Hepatitis C Screen',1430],['HIV Viral Load',3360],['HIV 1 RNA Quantitative',3360],['Lipase',1700],['PTH',2000],['Testosterone',2000],['Vitamin B12',2000],['Female Cancer Markers',4400],['Male Cancer Marker',6000],['Vit B12 & Folate',2900],['Hepatitis B Surface Quantitative (10 Days)',5405]];
const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
async function seedReferralTests(){const category=await LaboratoryTestCategory.findOne({name:/referral/i});if(!category)return;await LaboratoryTest.bulkWrite(referralTests.map(([name,price],displayOrder)=>({updateOne:{filter:{category:category._id,name:new RegExp(`^${escapeRegex(name)}$`,'i')},update:{$set:{price},$setOnInsert:{name,category:category._id,displayOrder,status:'Active',description:'',requiredSampleTypes:[]}},upsert:true}})),{ordered:true});}
async function seed(){
  try {
    const samples=await SampleType.find({});
    const serumSample = samples.find(x => x.name.toLowerCase() === 'serum')?.id;
    const bloodSample = samples.find(x => x.name.toLowerCase() === 'whole blood')?.id;

    if(!await LaboratoryTestCategory.exists()){
      for(let i=0;i<catalog.length;i++){
        const [name,tests,sampleName]=catalog[i],category=await LaboratoryTestCategory.create({name,displayOrder:i});
        let sample=samples.find(x=>x.name.toLowerCase()===sampleName.toLowerCase());
        if(name==='URINE AND BODY FLUID ANALYSIS')sample=samples.find(x=>x.name.toLowerCase()==='urine');
        await LaboratoryTest.insertMany(tests.map((test,displayOrder)=>({name:test,category:category.id,requiredSampleTypes:sample?[sample.id]:[],displayOrder,price:600,status:'Active'})));
      }
      await LaboratorySettings.findOneAndUpdate({key:'default'},{$setOnInsert:{key:'default'}},{upsert:true});
    }

    // ── Merge SEROLOGY and IMMUNOHEMATOLOGY into ONE single category ──
    const existingCats = await LaboratoryTestCategory.find({ name: /serolog|immuno/i }).sort({ displayOrder: 1 });
    let targetCat;
    if (existingCats.length > 0) {
      targetCat = existingCats[0];
      targetCat.name = 'SEROLOGY AND IMMUNOHEMATOLOGY';
      targetCat.displayOrder = 5;
      await targetCat.save();

      // If secondary categories exist (e.g. separate IMMUNOHEMATOLOGY category), move tests to targetCat and remove secondary category
      if (existingCats.length > 1) {
        for (let j = 1; j < existingCats.length; j++) {
          const secCat = existingCats[j];
          await LaboratoryTest.updateMany({ category: secCat._id }, { $set: { category: targetCat._id } });
          await LaboratoryTestCategory.findByIdAndDelete(secCat._id);
        }
      }
    } else {
      targetCat = await LaboratoryTestCategory.create({ name: 'SEROLOGY AND IMMUNOHEMATOLOGY', displayOrder: 5 });
    }

    const mergedTests = [
      { name: 'Widal Test (Typhoid)', aliases: [/widal/i], sample: serumSample },
      { name: 'Weli Flex (Typhus)', aliases: [/weli|weil/i], sample: serumSample },
      { name: 'ASO Titer (Tonsillitis)', aliases: [/aso/i], sample: serumSample },
      { name: 'HIV Test', aliases: [/hiv/i], sample: serumSample },
      { name: 'HBsAg', aliases: [/hbsag/i], sample: serumSample },
      { name: 'Rheumatoid Factor (RF)', aliases: [/rheumatoid|\brf\b/i], sample: serumSample },
      { name: 'H. pylori Antigen', aliases: [/h\.?\s*pylori.*ag|antigen/i], sample: serumSample },
      { name: 'H. pylori Antibody', aliases: [/h\.?\s*pylori.*ab|antibody/i], sample: serumSample },
      { name: 'Blood Group & RH Type', aliases: [/blood group/i], sample: bloodSample },
      { name: 'Direct Coombs Test', aliases: [/direct coomb/i], sample: bloodSample },
      { name: 'Crossmatch', aliases: [/crossmatch/i], sample: serumSample },
      { name: 'ANTINUCLEAR ANTIBODY (ANA) SCREEN TEST', aliases: [/\bana\b.*screen|antinuclear.*antibody.*screen|ana.*screen/i], sample: serumSample }
    ];

    for (let i = 0; i < mergedTests.length; i++) {
      const item = mergedTests[i];
      const searchFilters = [{ name: item.name }, ...item.aliases.map(a => ({ name: a }))];
      const matches = await LaboratoryTest.find({ $or: searchFilters });

      if (matches.length > 0) {
        const primaryTest = matches[0];
        primaryTest.name = item.name;
        primaryTest.category = targetCat._id;
        if (item.sample && (!primaryTest.requiredSampleTypes || !primaryTest.requiredSampleTypes.length)) {
          primaryTest.requiredSampleTypes = [item.sample];
        }
        primaryTest.displayOrder = i + 1;
        await primaryTest.save();

        // Delete any duplicate test records matching the same filter
        if (matches.length > 1) {
          for (let k = 1; k < matches.length; k++) {
            await LaboratoryTest.findByIdAndDelete(matches[k]._id);
          }
        }
      } else {
        await LaboratoryTest.create({
          name: item.name,
          category: targetCat._id,
          requiredSampleTypes: item.sample ? [item.sample] : [],
          displayOrder: i + 1,
          price: 600,
          status: 'Active',
          description: 'Serology and Immunohematology laboratory investigation'
        });
      }
    }

    await seedReferralTests();

    // ── Ensure Diabetic / Blood Sugar Category & Tests exist ──
    const diabeticCategoryName = 'BLOOD SUGAR TEST (RBS/FBS) / DIABETIC (DM) CHECKUP';
    let diabeticCat = await LaboratoryTestCategory.findOne({ name: new RegExp(`^${escapeRegex(diabeticCategoryName)}$`, 'i') });
    if (!diabeticCat) {
      diabeticCat = await LaboratoryTestCategory.findOne({ name: /diabetic|blood sugar/i });
      if (diabeticCat) {
        diabeticCat.name = diabeticCategoryName;
        diabeticCat.displayOrder = 6;
        await diabeticCat.save();
      } else {
        diabeticCat = await LaboratoryTestCategory.create({ name: diabeticCategoryName, displayOrder: 6 });
      }
    }

    const diabeticTests = [
      { name: 'HbA1c', aliases: [/hba1c/i], sample: serumSample },
      { name: 'Fasting Blood Glucose (FBS)', aliases: [/fbs|fasting blood/i], sample: serumSample },
      { name: 'Random Blood Sugar (RBS)', aliases: [/rbs|random blood/i], sample: serumSample }
    ];

    for (let i = 0; i < diabeticTests.length; i++) {
      const item = diabeticTests[i];
      const searchFilters = [{ name: item.name }, ...item.aliases.map(a => ({ name: a }))];
      const matches = await LaboratoryTest.find({ $or: searchFilters });

      if (matches.length > 0) {
        const primaryTest = matches[0];
        primaryTest.name = item.name;
        primaryTest.category = diabeticCat._id;
        if (item.sample && (!primaryTest.requiredSampleTypes || !primaryTest.requiredSampleTypes.length)) {
          primaryTest.requiredSampleTypes = [item.sample];
        }
        primaryTest.displayOrder = i + 1;
        await primaryTest.save();

        if (matches.length > 1) {
          for (let k = 1; k < matches.length; k++) {
            await LaboratoryTest.findByIdAndDelete(matches[k]._id);
          }
        }
      } else {
        await LaboratoryTest.create({
          name: item.name,
          category: diabeticCat._id,
          requiredSampleTypes: item.sample ? [item.sample] : [],
          displayOrder: i + 1,
          price: 600,
          status: 'Active',
          description: 'Diabetic blood glucose investigation'
        });
      }
    }
    // ── Ensure Clinical Chemistry Category & 4 Subcategory Tests exist ──
    const chemCat = await LaboratoryTestCategory.findOne({ name: /clinical chemistry/i }) || await LaboratoryTestCategory.create({ name: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS', displayOrder: 1 });
    chemCat.name = 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS';
    await chemCat.save();

    const chemTests = [
      { name: 'Lipid Profile', subcategory: 'LIPID PROFILE', aliases: [/lipid/i], sample: serumSample },
      { name: 'Renal Function Tests', subcategory: 'RENAL FUNCTION TESTS', aliases: [/renal|rft/i], sample: serumSample },
      { name: 'Liver Function Test', subcategory: 'LIVER FUNCTION TEST', aliases: [/liver|lft/i], sample: serumSample },
      { name: 'Other Chemistry Tests', subcategory: 'OTHER CHEMISTRY TESTS', aliases: [/other chemistry|cardiac|pancreatic|electrolyte/i], sample: serumSample }
    ];

    for (let i = 0; i < chemTests.length; i++) {
      const item = chemTests[i];
      const searchFilters = [{ name: item.name }, ...item.aliases.map(a => ({ name: a }))];
      const matches = await LaboratoryTest.find({ $or: searchFilters });

      if (matches.length > 0) {
        const primaryTest = matches[0];
        primaryTest.name = item.name;
        primaryTest.category = chemCat._id;
        primaryTest.subcategory = item.subcategory;
        if (item.sample && (!primaryTest.requiredSampleTypes || !primaryTest.requiredSampleTypes.length)) {
          primaryTest.requiredSampleTypes = [item.sample];
        }
        primaryTest.displayOrder = i + 1;
        await primaryTest.save();

        if (matches.length > 1) {
          for (let k = 1; k < matches.length; k++) {
            await LaboratoryTest.findByIdAndDelete(matches[k]._id);
          }
        }
      } else {
        await LaboratoryTest.create({
          name: item.name,
          category: chemCat._id,
          subcategory: item.subcategory,
          requiredSampleTypes: item.sample ? [item.sample] : [],
          displayOrder: i + 1,
          price: 600,
          status: 'Active',
          description: 'Clinical chemistry investigation'
        });
      }
    }

    // ── Ensure STOOL EXAMINATION Category & OVA & PARASITE EXAM Test exist ──
    const stoolSample = samples.find(x => x.name.toLowerCase() === 'stool')?.id;
    let stoolCat = await LaboratoryTestCategory.findOne({ name: new RegExp(`^${escapeRegex('STOOL EXAMINATION')}$`, 'i') });
    if (!stoolCat) {
      stoolCat = await LaboratoryTestCategory.create({ name: 'STOOL EXAMINATION', displayOrder: 8 });
    }

    const stoolTests = [
      { name: 'OVA & PARASITE EXAM', aliases: [/ova.*parasite/i, /o\/?p\s*exam/i, /ova.*\$.*parasite/i], sample: stoolSample }
    ];

    for (let i = 0; i < stoolTests.length; i++) {
      const item = stoolTests[i];
      const searchFilters = [{ name: item.name }, ...item.aliases.map(a => ({ name: a }))];
      const matches = await LaboratoryTest.find({ $or: searchFilters });

      if (matches.length > 0) {
        const primaryTest = matches[0];
        primaryTest.name = item.name;
        primaryTest.category = stoolCat._id;
        if (item.sample && (!primaryTest.requiredSampleTypes || !primaryTest.requiredSampleTypes.length)) {
          primaryTest.requiredSampleTypes = [item.sample];
        }
        primaryTest.displayOrder = i + 1;
        await primaryTest.save();

        if (matches.length > 1) {
          for (let k = 1; k < matches.length; k++) {
            await LaboratoryTest.findByIdAndDelete(matches[k]._id);
          }
        }
      } else {
        await LaboratoryTest.create({
          name: item.name,
          category: stoolCat._id,
          requiredSampleTypes: item.sample ? [item.sample] : [],
          displayOrder: i + 1,
          price: 600,
          status: 'Active',
          description: 'Stool examination for ova and parasites'
        });
      }
    }

    // ── Ensure URINE AND BODY FLUID ANALYSIS Category & 24 Hour Urine Protein Test exist ──
    const urineSample = samples.find(x => x.name.toLowerCase() === 'urine')?.id;
    let urineCat = await LaboratoryTestCategory.findOne({ name: /urine.*body.*fluid|urine.*fluid.*analysis/i });
    if (!urineCat) {
      // Fall back to the standard name from the initial catalog seed
      urineCat = await LaboratoryTestCategory.findOne({ name: new RegExp(`^URINE AND BODY FLUID ANALYSIS$`, 'i') });
    }
    if (!urineCat) {
      urineCat = await LaboratoryTestCategory.create({ name: 'URINE AND BODY FLUID ANALYSIS', displayOrder: 2 });
    }

    const urineProteinTests = [
      {
        name: '24 HOUR URINE PROTEIN TEST',
        aliases: [/24.?hour.*urine.*protein|24.?hr.*urine.*protein|urine.*protein.*24/i],
        sample: urineSample
      },
      {
        name: 'KNEE JOINT FLUID ANALYSIS',
        aliases: [/knee.*joint.*fluid|joint.*fluid.*analysis/i],
        sample: urineSample
      },
      {
        name: 'PLEURAL FLUID ANALYSIS',
        aliases: [/pleural.*fluid.*analysis|pleural.*fluid/i],
        sample: urineSample
      },
      {
        name: 'PERITONEAL FLUID ANALYSIS',
        aliases: [/peritoneal.*fluid.*analysis|peritoneal.*fluid|ascitic.*fluid/i],
        sample: urineSample
      }
    ];

    for (let i = 0; i < urineProteinTests.length; i++) {
      const item = urineProteinTests[i];
      const searchFilters = [{ name: item.name }, ...item.aliases.map(a => ({ name: a }))];
      const matches = await LaboratoryTest.find({ $or: searchFilters });

      if (matches.length > 0) {
        const primaryTest = matches[0];
        primaryTest.name = item.name;
        primaryTest.category = urineCat._id;
        if (item.sample && (!primaryTest.requiredSampleTypes || !primaryTest.requiredSampleTypes.length)) {
          primaryTest.requiredSampleTypes = [item.sample];
        }
        primaryTest.displayOrder = i + 1;
        await primaryTest.save();

        if (matches.length > 1) {
          for (let k = 1; k < matches.length; k++) {
            await LaboratoryTest.findByIdAndDelete(matches[k]._id);
          }
        }
      } else {
        await LaboratoryTest.create({
          name: item.name,
          category: urineCat._id,
          requiredSampleTypes: item.sample ? [item.sample] : [],
          displayOrder: i + 1,
          price: 600,
          status: 'Active',
          description: 'Urine & Body fluid examination'
        });
      }
    }

    // ── Ensure Indirect Coombs Test exists under PARASITOLOGY category ──
    let paraCat = await LaboratoryTestCategory.findOne({ name: /^PARASITOLOGY$/i }) || await LaboratoryTestCategory.findOne({ name: /parasitol/i });
    if (!paraCat) {
      paraCat = await LaboratoryTestCategory.create({ name: 'PARASITOLOGY', displayOrder: 3 });
    }
    const coombsMatches = await LaboratoryTest.find({ name: /indirect.*coomb|indirect.*antiglobulin|\biat\b/i });
    if (coombsMatches.length > 0) {
      const primaryCoombs = coombsMatches[0];
      primaryCoombs.name = 'Indirect Coombs Test';
      primaryCoombs.category = paraCat._id;
      primaryCoombs.status = 'Active';
      await primaryCoombs.save();
      if (coombsMatches.length > 1) {
        for (let k = 1; k < coombsMatches.length; k++) {
          await LaboratoryTest.findByIdAndDelete(coombsMatches[k]._id);
        }
      }
    } else {
      await LaboratoryTest.create({
        name: 'Indirect Coombs Test',
        category: paraCat._id,
        requiredSampleTypes: serumSample ? [serumSample] : [],
        displayOrder: 10,
        price: 600,
        status: 'Active',
        description: 'Indirect antiglobulin / Coombs Test'
      });
    }

    // ── Deactivate obsolete separate BODY FLUID ANALYSIS category documents and move tests ──
    const obsCats = await LaboratoryTestCategory.find({ _id: { $ne: urineCat._id }, name: /^BODY FLUID ANALYSIS$/i });
    for (const obs of obsCats) {
      await LaboratoryTest.updateMany({ category: obs._id }, { $set: { category: urineCat._id } });
      obs.status = 'Inactive';
      obs.hidden = true;
      await obs.save();
    }
  } catch (err) {
    console.error('Error during laboratory tests seeding:', err.message);
  }
}
export async function publicCatalog(req,res,next){try{await seed();const [categories,settings]=await Promise.all([LaboratoryTestCategory.find({status:'Active',hidden:false}).sort({displayOrder:1}),LaboratorySettings.findOne({key:'default'})]);const tests=await LaboratoryTest.find({status:'Active',category:{$in:categories.map(x=>x.id)}}).populate('requiredSampleTypes','name').sort({displayOrder:1});res.json({categories:categories.map(c=>({...c.toObject(),tests:tests.filter(t=>String(t.category)===String(c.id))})),settings})}catch(e){next(e)}}
export async function adminCatalog(req,res,next){try{await seed();const [categories,tests,settings,samples,stockItems]=await Promise.all([LaboratoryTestCategory.find().sort({displayOrder:1}),LaboratoryTest.find().populate('category','name').populate('requiredSampleTypes','name').populate('consumables.item','itemName unit').sort({displayOrder:1}),LaboratorySettings.findOne({key:'default'}),SampleType.find().select('name'),StockItem.find({status:'Active'}).select('itemName unit').sort({itemName:1})]);res.json({categories,tests,settings,samples,stockItems})}catch(e){next(e)}}
export async function createCategory(req,res,next){try{const category=await LaboratoryTestCategory.create(req.body);emit('laboratory-tests:change',{});res.status(201).json({category})}catch(e){next(e)}}
export async function updateCategory(req,res,next){try{const category=await LaboratoryTestCategory.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!category)throw new AppError('Category not found.',404);emit('laboratory-tests:change',{});res.json({category})}catch(e){next(e)}}
export async function deleteCategory(req,res,next){try{if(await LaboratoryTest.exists({category:req.params.id}))throw new AppError('Delete or move its tests first.',422);await LaboratoryTestCategory.findByIdAndDelete(req.params.id);emit('laboratory-tests:change',{});res.status(204).send()}catch(e){next(e)}}
export async function createTest(req,res,next){try{const {name,category}=req.body;if(name?.trim()&&category){const existing=await LaboratoryTest.findOne({category,name:new RegExp(`^${escapeRegex(name.trim())}$`,'i')});if(existing){Object.assign(existing,req.body);await existing.save();emit('laboratory-tests:change',{});return res.status(200).json({test:existing})}}const test=await LaboratoryTest.create(req.body);emit('laboratory-tests:change',{});res.status(201).json({test})}catch(e){next(e)}}
export async function updateTest(req,res,next){try{const test=await LaboratoryTest.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!test)throw new AppError('Laboratory test not found.',404);emit('laboratory-tests:change',{});res.json({test})}catch(e){next(e)}}
export async function deleteTest(req,res,next){try{await LaboratoryTest.findByIdAndDelete(req.params.id);emit('laboratory-tests:change',{});res.status(204).send()}catch(e){next(e)}}
export async function getSettings(req,res,next){try{const settings=await LaboratorySettings.findOne({key:'default'});res.json({settings:settings||{}})}catch(e){next(e)}}
export async function updateSettings(req,res,next){try{const settings=await LaboratorySettings.findOneAndUpdate({key:'default'},req.body,{new:true,upsert:true,runValidators:true});emit('laboratory-tests:change',{});res.json({settings})}catch(e){next(e)}}
