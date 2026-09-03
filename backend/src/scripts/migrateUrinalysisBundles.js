import { connectDatabase } from '../config/database.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import SampleType from '../models/SampleType.js';
import LaboratorySettings from '../models/LaboratorySettings.js';

async function migrate() {
  try {
    await connectDatabase();

    const urineCat = await LaboratoryTestCategory.findOne({ name: /^URIN/i });
    console.log('Category found:', urineCat?.name, urineCat?._id);
    if (!urineCat) throw new Error('Urinalysis category not found');

    const urineSample = (await SampleType.findOne({ name: /^urine$/i }))?._id;

    // 1. Parent Bundle: Urine Microscopy (300 ETB, isBundle: true, billableIndividually: true)
    const microBundle = await LaboratoryTest.findOneAndUpdate(
      { category: urineCat._id, name: 'Urine Microscopy' },
      {
        $set: {
          category: urineCat._id,
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
    console.log('Urine Microscopy bundle:', microBundle._id, microBundle.name, microBundle.price, microBundle.isBundle);

    // 2. Child parameters of Urine Microscopy (price: 0, isBundle: false, billableIndividually: false, includedInBundle: true)
    const microChildrenRes = await LaboratoryTest.updateMany(
      {
        category: urineCat._id,
        name: { $ne: 'Urine Microscopy' },
        $or: [
          { subcategory: /urine microscopy|microscopy/i },
          { name: { $in: ['WBC', 'RBC', 'Epithelial Cells', 'WBC Casts', 'RBC Casts', 'Granular Casts', 'Amorphous Phosphate Crystal', 'Amorphous Urate Crystal', 'Calcium Oxalate Crystal', 'Triple Phosphate Crystal', 'Bacteria', 'Others'] } }
        ]
      },
      {
        $set: {
          subcategory: 'Urine Microscopy',
          price: 0,
          isBundle: false,
          billableIndividually: false,
          includedInBundle: true,
          parentBundle: 'Urine Microscopy'
        }
      }
    );
    console.log('Microscopy child tests updated:', microChildrenRes.modifiedCount);

    // 3. Parent Bundle: Chemical Analysis (300 ETB, isBundle: true, billableIndividually: true)
    const chemBundle = await LaboratoryTest.findOneAndUpdate(
      { category: urineCat._id, name: 'Chemical Analysis' },
      {
        $set: {
          category: urineCat._id,
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
    console.log('Chemical Analysis bundle:', chemBundle._id, chemBundle.name, chemBundle.price, chemBundle.isBundle);

    // 4. Child parameters of Chemical Analysis (price: 0, isBundle: false, billableIndividually: false, includedInBundle: true)
    const chemChildrenRes = await LaboratoryTest.updateMany(
      {
        category: urineCat._id,
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
    console.log('Chemical child tests updated:', chemChildrenRes.modifiedCount);

    // 5. Independent Pregnancy Test [HCG] (200 ETB, billableIndividually: true, isBundle: false)
    const hcgRes = await LaboratoryTest.updateMany(
      {
        category: urineCat._id,
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
    console.log('HCG test updated:', hcgRes.modifiedCount);

    // 6. Settings
    await LaboratorySettings.findOneAndUpdate(
      { key: 'default' },
      { $set: { urineChemicalPrice: 300, urineMicroscopyPrice: 300 } },
      { upsert: true }
    );

    // 7. Verify all Urinalysis tests
    const allTests = await LaboratoryTest.find({ category: urineCat._id }).sort({ displayOrder: 1, name: 1 });
    console.log('\n--- ALL URINALYSIS TESTS IN DATABASE ---');
    allTests.forEach(t => {
      console.log(`${t.name.padEnd(30)} | sub: ${t.subcategory.padEnd(22)} | price: ${String(t.price).padStart(3)} ETB | isBundle: ${String(t.isBundle).padEnd(5)} | billableIndividually: ${String(t.billableIndividually).padEnd(5)} | includedInBundle: ${String(t.includedInBundle).padEnd(5)} | parent: ${t.parentBundle}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
