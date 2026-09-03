import { connectDatabase } from '../config/database.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratorySettings from '../models/LaboratorySettings.js';
import { calculateSubtotalWithCbcGroup } from '../utils/cbcPricing.js';

async function testCases() {
  try {
    await connectDatabase();

    const urineCat = await LaboratoryTestCategory.findOne({ name: /^URIN/i });
    const settings = await LaboratorySettings.findOne({ key: 'default' });

    const microBundle = await LaboratoryTest.findOne({ category: urineCat._id, name: 'Urine Microscopy' });
    const wbc = await LaboratoryTest.findOne({ category: urineCat._id, name: 'WBC' });
    const rbc = await LaboratoryTest.findOne({ category: urineCat._id, name: 'RBC' });
    const chemBundle = await LaboratoryTest.findOne({ category: urineCat._id, name: 'Chemical Analysis' });
    const glucose = await LaboratoryTest.findOne({ category: urineCat._id, name: 'Glucose' });
    const hcg = await LaboratoryTest.findOne({ category: urineCat._id, name: /pregnancy test/i });
    const allMicroChildren = await LaboratoryTest.find({ category: urineCat._id, subcategory: 'Urine Microscopy', name: { $ne: 'Urine Microscopy' } });

    console.log('\n================== VERIFYING 7 URINALYSIS PRICING CASES ==================');

    // Case 1: Urine Microscopy bundle only (with all children)
    const case1Tests = [microBundle, ...allMicroChildren];
    const case1Subtotal = calculateSubtotalWithCbcGroup(case1Tests, settings);
    console.log('Case 1 (Urine Microscopy + all 12 children):', case1Subtotal, 'ETB', case1Subtotal === 300 ? '✅ PASS' : '❌ FAIL');

    // Case 2: Urine Microscopy and WBC
    const case2Tests = [microBundle, wbc];
    const case2Subtotal = calculateSubtotalWithCbcGroup(case2Tests, settings);
    console.log('Case 2 (Urine Microscopy + WBC):', case2Subtotal, 'ETB', case2Subtotal === 300 ? '✅ PASS' : '❌ FAIL');

    // Case 3: Chemical Analysis only
    const case3Tests = [chemBundle, glucose];
    const case3Subtotal = calculateSubtotalWithCbcGroup(case3Tests, settings);
    console.log('Case 3 (Chemical Analysis + Glucose):', case3Subtotal, 'ETB', case3Subtotal === 300 ? '✅ PASS' : '❌ FAIL');

    // Case 4: Pregnancy Test [HCG] only
    const case4Tests = [hcg];
    const case4Subtotal = calculateSubtotalWithCbcGroup(case4Tests, settings);
    console.log('Case 4 (Pregnancy Test [HCG]):', case4Subtotal, 'ETB', case4Subtotal === 200 ? '✅ PASS' : '❌ FAIL');

    // Case 5: Chemical Analysis + Urine Microscopy
    const case5Tests = [chemBundle, microBundle, wbc, rbc, glucose];
    const case5Subtotal = calculateSubtotalWithCbcGroup(case5Tests, settings);
    console.log('Case 5 (Chem + Micro):', case5Subtotal, 'ETB', case5Subtotal === 600 ? '✅ PASS' : '❌ FAIL');

    // Case 6: Urine Microscopy + Pregnancy Test [HCG]
    const case6Tests = [microBundle, wbc, hcg];
    const case6Subtotal = calculateSubtotalWithCbcGroup(case6Tests, settings);
    console.log('Case 6 (Micro + HCG):', case6Subtotal, 'ETB', case6Subtotal === 500 ? '✅ PASS' : '❌ FAIL');

    // Case 7: Chemical Analysis + Urine Microscopy + Pregnancy Test [HCG]
    const case7Tests = [chemBundle, microBundle, hcg, wbc, rbc, glucose];
    const case7Subtotal = calculateSubtotalWithCbcGroup(case7Tests, settings);
    console.log('Case 7 (Chem + Micro + HCG):', case7Subtotal, 'ETB', case7Subtotal === 800 ? '✅ PASS' : '❌ FAIL');

    // Case 8: WBC selected alone (WITHOUT parent bundle in array)
    const case8Tests = [wbc];
    const case8Subtotal = calculateSubtotalWithCbcGroup(case8Tests, settings);
    console.log('Case 8 (WBC selected alone):', case8Subtotal, 'ETB', case8Subtotal === 300 ? '✅ PASS' : '❌ FAIL');

    // Case 9: RBC selected alone (WITHOUT parent bundle in array)
    const case9Tests = [rbc];
    const case9Subtotal = calculateSubtotalWithCbcGroup(case9Tests, settings);
    console.log('Case 9 (RBC selected alone):', case9Subtotal, 'ETB', case9Subtotal === 300 ? '✅ PASS' : '❌ FAIL');

    // Case 10: WBC + RBC selected alone (WITHOUT parent bundle in array)
    const case10Tests = [wbc, rbc];
    const case10Subtotal = calculateSubtotalWithCbcGroup(case10Tests, settings);
    console.log('Case 10 (WBC + RBC selected alone):', case10Subtotal, 'ETB', case10Subtotal === 300 ? '✅ PASS' : '❌ FAIL');

    const allPassed =
      case1Subtotal === 300 &&
      case2Subtotal === 300 &&
      case3Subtotal === 300 &&
      case4Subtotal === 200 &&
      case5Subtotal === 600 &&
      case6Subtotal === 500 &&
      case7Subtotal === 800 &&
      case8Subtotal === 300 &&
      case9Subtotal === 300 &&
      case10Subtotal === 300;

    console.log('\n========================================================================');
    console.log('ALL 10 PRICING CASES PASSED:', allPassed ? '✅ YES' : '❌ NO');
    console.log('========================================================================\n');

    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('Error verifying cases:', err);
    process.exit(1);
  }
}

testCases();
