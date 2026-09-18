import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';

async function run() {
  await connectDatabase();
  const elecCat = await mongoose.connection.collection('laboratorytestcategories').findOne({
    name: 'SERUM ELECTROLYTE'
  });
  console.log('Serum Electrolyte Category:', elecCat);
  const tests = await mongoose.connection.collection('laboratorytests').find({
    category: elecCat._id
  }).toArray();
  console.log('\nAll tests under SERUM ELECTROLYTE category:');
  tests.forEach(t => console.log(JSON.stringify({
    id: t._id,
    name: t.name,
    price: t.price,
    isBundle: t.isBundle,
    parentBundle: t.parentBundle,
    billableIndividually: t.billableIndividually,
    includedInBundle: t.includedInBundle
  })));

  const chemCat = await mongoose.connection.collection('laboratorytestcategories').findOne({
    name: 'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS'
  });
  console.log('\nAll tests under CLINICAL CHEMISTRY category matching mag/phos:');
  const chemTests = await mongoose.connection.collection('laboratorytests').find({
    category: chemCat._id,
    name: { $regex: 'magnesium|phosphor|phosphat', $options: 'i' }
  }).toArray();
  chemTests.forEach(t => console.log(JSON.stringify({
    id: t._id,
    name: t.name,
    price: t.price,
    isBundle: t.isBundle,
    parentBundle: t.parentBundle,
    billableIndividually: t.billableIndividually,
    includedInBundle: t.includedInBundle
  })));

  await mongoose.disconnect();
}
run();
