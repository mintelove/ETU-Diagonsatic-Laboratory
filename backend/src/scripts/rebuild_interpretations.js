import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import ClinicalInterpretation from '../models/ClinicalInterpretation.js';
import { SEED_INTERPRETATIONS, seedIfNeeded } from '../controllers/clinicalInterpretationController.js';

async function rebuild() {
  try {
    await connectDatabase();
    console.log('Connected to MongoDB.');

    console.log('Deleting all old interpretations from MongoDB...');
    const delResult = await ClinicalInterpretation.deleteMany({});
    console.log(`Removed ${delResult.deletedCount} old interpretation records.`);

    console.log(`Seeding clean ${SEED_INTERPRETATIONS.length} interpretations strictly from supplied document...`);
    await seedIfNeeded(true);

    const afterList = await ClinicalInterpretation.find().select('categoryName title laboratoryTestName');
    console.log(`\n✅ Database rebuild complete! Exact total: ${afterList.length} master interpretations:`);
    afterList.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.categoryName}] ${item.title} (${item.laboratoryTestName})`);
    });
  } catch (err) {
    console.error('Error rebuilding interpretations:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

rebuild();
