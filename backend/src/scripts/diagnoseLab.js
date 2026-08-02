/**
 * Diagnostic script — checks MongoDB state for laboratory test types
 * Run: node --experimental-vm-modules src/scripts/diagnoseLab.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Inline schemas (avoid circular imports)
const LaboratoryTestCategorySchema = new mongoose.Schema({
  name: String, description: String, displayOrder: Number,
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  hidden: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false });

const LaboratoryTestSchema = new mongoose.Schema({
  name: String, description: String, price: Number,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'LaboratoryTestCategory' },
  subcategory: String,
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  displayOrder: Number
}, { timestamps: true, versionKey: false });

const LaboratoryTestCategory = mongoose.model('LaboratoryTestCategory', LaboratoryTestCategorySchema);
const LaboratoryTest = mongoose.model('LaboratoryTest', LaboratoryTestSchema);

async function run() {
  console.log('\n========================================');
  console.log('ETU LAB — DATABASE DIAGNOSTIC REPORT');
  console.log('========================================\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas\n');

  // 1. Categories
  const allCats = await LaboratoryTestCategory.find({}).sort({ displayOrder: 1 });
  const activeCats = allCats.filter(c => c.status === 'Active' && !c.hidden);
  const inactiveCats = allCats.filter(c => c.status === 'Inactive');
  const hiddenCats = allCats.filter(c => c.hidden);

  console.log(`LABORATORY TEST CATEGORIES`);
  console.log(`  Total:                ${allCats.length}`);
  console.log(`  Active (non-hidden):  ${activeCats.length}`);
  console.log(`  Inactive:             ${inactiveCats.length}`);
  console.log(`  Hidden:               ${hiddenCats.length}`);
  console.log(`\n  All categories:`);
  allCats.forEach(c => {
    console.log(`    [${c.status}${c.hidden ? ' HIDDEN' : ''}] "${c.name}" (displayOrder: ${c.displayOrder})`);
  });

  // 2. Tests
  const allTests = await LaboratoryTest.find({}).populate('category', 'name');
  const activeTests = allTests.filter(t => t.status === 'Active');
  const inactiveTests = allTests.filter(t => t.status === 'Inactive');

  console.log(`\nLABORATORY TESTS`);
  console.log(`  Total:    ${allTests.length}`);
  console.log(`  Active:   ${activeTests.length}`);
  console.log(`  Inactive: ${inactiveTests.length}`);

  // 3. publicCatalog simulation (what the API returns to Receptionist/SampleCollector)
  const catIds = activeCats.map(c => c._id);
  const publicTests = await LaboratoryTest.find({
    status: 'Active',
    category: { $in: catIds }
  }).populate('category', 'name').sort({ displayOrder: 1 });

  console.log(`\nPUBLIC CATALOG (what /laboratory-tests/catalog returns)`);
  console.log(`  Categories returned: ${activeCats.length}`);
  console.log(`  Tests returned:      ${publicTests.length}`);

  if (activeCats.length === 0) {
    console.log('\n⚠️  PROBLEM FOUND: No active non-hidden categories!');
    console.log('   This means /laboratory-tests/catalog returns an EMPTY array.');
    if (hiddenCats.length > 0) {
      console.log(`   ${hiddenCats.length} categories are hidden.`);
    }
    if (inactiveCats.length > 0) {
      console.log(`   ${inactiveCats.length} categories are inactive.`);
    }
  }

  // 4. adminCatalog simulation (no filter)
  console.log(`\nADMIN CATALOG (what /laboratory-tests/admin returns)`);
  console.log(`  Categories returned: ${allCats.length}`);
  console.log(`  Tests returned:      ${allTests.length}`);

  if (allTests.length === 0) {
    console.log('\n⚠️  PROBLEM FOUND: LaboratoryTest collection is EMPTY!');
    console.log('   The seed() function may be failing or was never run successfully.');
  }
  if (allCats.length === 0) {
    console.log('\n⚠️  PROBLEM FOUND: LaboratoryTestCategory collection is EMPTY!');
  }

  // 5. Tests with NULL/missing category reference
  const orphanedTests = allTests.filter(t => !t.category);
  if (orphanedTests.length > 0) {
    console.log(`\n⚠️  ORPHANED TESTS (no category reference): ${orphanedTests.length}`);
    orphanedTests.slice(0, 5).forEach(t => console.log(`    - "${t.name}"`));
  }

  // 6. Show subcategories
  const subcats = [...new Set(allTests.filter(t => t.subcategory).map(t => t.subcategory))];
  if (subcats.length > 0) {
    console.log(`\n  Subcategories found (${subcats.length}):`);
    subcats.slice(0, 20).forEach(s => console.log(`    - ${s}`));
  }

  // 7. Tests per category
  if (allCats.length > 0 && allTests.length > 0) {
    console.log(`\n  Tests per category (Admin view):`);
    allCats.forEach(cat => {
      const count = allTests.filter(t => String(t.category?._id || t.category) === String(cat._id)).length;
      const activeCount = allTests.filter(t => String(t.category?._id || t.category) === String(cat._id) && t.status === 'Active').length;
      console.log(`    [${cat.status}${cat.hidden ? ' HIDDEN' : ''}] "${cat.name}": ${count} total / ${activeCount} active`);
    });
  }

  console.log('\n========================================');
  console.log('ROOT CAUSE ANALYSIS');
  console.log('========================================');

  if (allCats.length === 0 && allTests.length === 0) {
    console.log('ROOT CAUSE: Database collections are COMPLETELY EMPTY.');
    console.log('ACTION: The seed() function needs to be run. Call /laboratory-tests/admin once logged in as admin.');
  } else if (allCats.length > 0 && allTests.length === 0) {
    console.log('ROOT CAUSE: Categories exist but NO tests. seed() may have failed to create tests.');
  } else if (activeCats.length === 0 && allCats.length > 0) {
    console.log('ROOT CAUSE: All categories are INACTIVE or HIDDEN — publicCatalog returns [].');
    console.log('ACTION: Categories need to be set to status=Active and hidden=false.');
  } else if (activeCats.length > 0 && publicTests.length === 0) {
    console.log('ROOT CAUSE: Active categories exist but ALL tests are Inactive or orphaned.');
  } else {
    console.log('Database appears healthy. Check API routes or frontend rendering.');
  }

  console.log('\n');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Diagnostic script error:', err.message);
  process.exit(1);
});
