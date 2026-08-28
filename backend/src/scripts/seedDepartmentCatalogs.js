import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import LaboratoryTest from '../models/LaboratoryTest.js';

const MONGO_URI = process.env.MONGODB_URI_FALLBACK?.trim() || process.env.MONGODB_URI?.trim() || 'mongodb://localhost:27017/etu_diagnostic';

export async function seedDepartmentCatalogs() {
  const isDirect = mongoose.connection.readyState !== 1;
  if (isDirect) {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for department catalogs seed.');
  }

  // ── 1. Seed PATHOLOGY ────────────────────────────────────────────────────────
  let pathCat = await LaboratoryTestCategory.findOne({ name: /^PATHOLOGY$/i });
  if (!pathCat) {
    pathCat = await LaboratoryTestCategory.create({
      name: 'PATHOLOGY',
      description: 'Anatomic pathology, cytology and morphological examinations',
      displayOrder: 14,
      status: 'Active',
      hidden: false
    });
    console.log('Created PATHOLOGY category.');
  } else {
    pathCat.name = 'PATHOLOGY';
    pathCat.status = 'Active';
    pathCat.hidden = false;
    pathCat.displayOrder = 14;
    await pathCat.save();
  }

  const pathologyTests = [
    { name: 'Biopsy', subcategory: 'Biopsy', price: 2000, description: 'Surgical tissue pathology biopsy examination (20-day reporting)' },
    { name: 'FNAC', subcategory: 'FNAC', price: 1000, description: 'Fine Needle Aspiration Cytology (24-hour reporting)' },
    { name: 'Peripheral Morphology', subcategory: 'Peripheral Morphology', price: 800, description: 'Peripheral blood film morphology examination (24-hour reporting)' }
  ];

  for (const t of pathologyTests) {
    let test = await LaboratoryTest.findOne({ name: t.name, category: pathCat._id });
    if (!test) {
      await LaboratoryTest.create({
        ...t,
        category: pathCat._id,
        status: 'Active',
        displayOrder: 1
      });
      console.log(`Created Pathology test: ${t.name} (${t.price} ETB)`);
    } else {
      test.status = 'Active';
      test.category = pathCat._id;
      if (test.price === undefined || test.price === null) test.price = t.price;
      await test.save();
    }
  }

  // ── 2. Seed RADIOLOGY ────────────────────────────────────────────────────────
  let radCat = await LaboratoryTestCategory.findOne({ name: /^RADIOLOGY$/i });
  if (!radCat) {
    radCat = await LaboratoryTestCategory.create({
      name: 'RADIOLOGY',
      description: 'Diagnostic medical imaging, radiography and ultrasonography',
      displayOrder: 15,
      status: 'Active',
      hidden: false
    });
    console.log('Created RADIOLOGY category.');
  } else {
    radCat.name = 'RADIOLOGY';
    radCat.status = 'Active';
    radCat.hidden = false;
    radCat.displayOrder = 15;
    await radCat.save();
  }

  const radiologyTests = [
    { name: 'CT Scan', subcategory: 'CT Scan', price: 800, description: 'Computed tomography scan imaging examination' },
    { name: 'X-Ray', subcategory: 'X-Ray', price: 250, description: 'Digital projection radiography examination' },
    { name: 'Ultrasound - Abdominal', subcategory: 'Ultrasound', price: 800, description: 'Transabdominal comprehensive ultrasound examination' },
    { name: 'Ultrasound - MSS', subcategory: 'Ultrasound', price: 800, description: 'Musculoskeletal system ultrasound examination' },
    { name: 'Ultrasound - Doppler', subcategory: 'Ultrasound', price: 800, description: 'Vascular Doppler ultrasound examination' },
    { name: 'Ultrasound - Echo', subcategory: 'Ultrasound', price: 800, description: 'Echocardiography diagnostic ultrasound examination' },
    { name: 'Ultrasound - Other', subcategory: 'Ultrasound', price: 800, description: 'Custom ultrasonography examination' }
  ];

  for (const t of radiologyTests) {
    let test = await LaboratoryTest.findOne({ name: t.name, category: radCat._id });
    if (!test) {
      await LaboratoryTest.create({
        ...t,
        category: radCat._id,
        status: 'Active',
        displayOrder: 1
      });
      console.log(`Created Radiology test: ${t.name} (${t.price} ETB)`);
    } else {
      test.status = 'Active';
      test.category = radCat._id;
      if (test.price === undefined || test.price === null) test.price = t.price;
      await test.save();
    }
  }

  console.log('Department catalogs verified & seeded successfully.');
  if (isDirect) {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seedDepartmentCatalogs.js')) {
  seedDepartmentCatalogs()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error seeding department catalogs:', err);
      process.exit(1);
    });
}
