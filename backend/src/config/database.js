import mongoose from 'mongoose';
import User from '../models/User.js';
import Category from '../models/Category.js';
import SampleType from '../models/SampleType.js';
import LabReport from '../models/LabReport.js';
import LaboratorySettings from '../models/LaboratorySettings.js';
import { seedParameterCatalog } from './parameterCatalogSeeder.js';

import dns from 'node:dns';

const MAX_CONNECTION_ATTEMPTS = Math.max(1, Number(process.env.MONGODB_CONNECT_RETRIES || 3));
const RETRY_DELAY_MS = Math.max(0, Number(process.env.MONGODB_CONNECT_RETRY_DELAY_MS || 3000));
let connectionEventsRegistered = false;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function registerConnectionEvents() {
  if (connectionEventsRegistered) return;
  connectionEventsRegistered = true;

  mongoose.connection.on('connected', () => console.log('MongoDB connection status: CONNECTED'));
  mongoose.connection.on('error', (error) => console.error('MongoDB runtime error:', error.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB connection status: DISCONNECTED'));
}

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI is not configured.');
  const fallbackUri = process.env.MONGODB_URI_FALLBACK?.trim();
  const connectionUris = [{ label: 'primary URI', uri }];
  if (fallbackUri && fallbackUri !== uri) connectionUris.push({ label: 'fallback URI', uri: fallbackUri });

  mongoose.set('strictQuery', true);
  registerConnectionEvents();

  let lastError;
  for (const connectionUri of connectionUris) {
    const isPrimary = connectionUri.label === 'primary URI';
    const attemptsCount = isPrimary && fallbackUri ? 1 : MAX_CONNECTION_ATTEMPTS;
    for (let attempt = 1; attempt <= attemptsCount; attempt += 1) {
      try {
        console.log(`MongoDB ${connectionUri.label} connection attempt ${attempt}/${attemptsCount}.`);
        await mongoose.connect(connectionUri.uri, {
          dbName: 'ETU_Diagonstic_Labratory',
          maxPoolSize: 10,
          minPoolSize: 1,
          maxIdleTimeMS: 60000,
          serverSelectionTimeoutMS: isPrimary ? 4000 : 10000,
          connectTimeoutMS: isPrimary ? 4000 : 10000,
          retryWrites: true
        });
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        console.error(`MongoDB ${connectionUri.label} connection attempt ${attempt}/${attemptsCount} failed:`, error.message);
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
        
        if (isPrimary && fallbackUri) {
          console.warn('Primary connection URI failed or SRV lookup refused; switching to fallback connection URI immediately.');
          break;
        }

        if (attempt < attemptsCount) {
          console.log(`Retrying MongoDB connection in ${RETRY_DELAY_MS / 1000} seconds.`);
          await wait(RETRY_DELAY_MS);
        }
      }
    }
    if (!lastError) break;
  }

  if (lastError) {
    const networkHint = /querySrv|ETIMEOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|server selection/i.test(lastError.message);
    if (networkHint) console.error('MongoDB Atlas Network Access may be blocking this machine, or DNS/network access to Atlas is unavailable.');
    if (/querySrv|ETIMEOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED/i.test(lastError.message) && !fallbackUri) {
      console.error('If this network blocks Node.js SRV DNS lookups, set MONGODB_URI_FALLBACK to the standard (non-SRV) connection string copied from MongoDB Atlas.');
    }
    throw lastError;
  }

  console.log(`MongoDB connected (${mongoose.connection.name}).`);

  // Ensure Category collection exists and migrate legacy categories
  try {
    await Category.createCollection();
    const legacyCategories = await mongoose.connection.db.collection('categories').find({
      $or: [
        { categoryName: { $exists: false } },
        { categoryCode: { $exists: false } },
        { categoryName: null },
        { categoryCode: null }
      ]
    }).toArray();

    if (legacyCategories.length > 0) {
      console.log(`Found ${legacyCategories.length} legacy categories to migrate.`);
      for (const cat of legacyCategories) {
        const categoryName = cat.name || `Category ${cat._id}`;
        let categoryCode = cat.categoryCode;
        if (!categoryCode) {
          const prefix = categoryName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
          categoryCode = `CAT-${prefix || 'GEN'}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        await mongoose.connection.db.collection('categories').updateOne(
          { _id: cat._id },
          {
            $set: {
              categoryName,
              categoryCode,
              description: cat.description || '',
              status: cat.status || 'Active'
            }
          }
        );
      }
      console.log('Legacy categories migration completed.');
    }
  } catch (error) {
    console.error('Error during Category collection initialization/migration:', error.message);
  }

  // Seed default admin if no administrator exists
  try {
    const adminExists = await User.findOne({ $or: [{ username: 'admin' }, { role: 'Admin' }] });
    if (!adminExists) {
      await User.create({
        fullName: 'System Administrator',
        username: 'admin',
        password: '123456',
        phone: '+251900000000',
        role: 'Admin',
        status: 'Active'
      });
      console.log('Default administrator account created (admin/123456).');
    }
  } catch (error) {
    console.error('Error seeding default admin account:', error.message);
  }

  // Seed default sample types if they do not exist
  try {
    const defaultTypes = [
      { name: 'Serum', category: 'Blood', price: 500, description: 'Serum sample type' },
      { name: 'Whole Blood', category: 'Blood', price: 500, description: 'Whole blood sample type' },
      { name: 'Urine', category: 'Urine', price: 300, description: 'Urine sample type' },
      { name: 'Stool', category: 'Stool', price: 300, description: 'Stool sample type' },
      { name: 'Bodily Fluids', category: 'Body Fluid', price: 1000, description: 'Bodily Fluids (Semen, Peritoneal, Pleural, CSF, Synovial, Ascitic, Amniotic, etc.)' }
    ];

    const SampleType = mongoose.model('SampleType');
    for (let i = 0; i < defaultTypes.length; i++) {
      const def = defaultTypes[i];
      const existing = await SampleType.findOne({ name: def.name });
      if (!existing) {
        const prefix = def.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
        const code = `SMP-${prefix || 'GEN'}-${Math.floor(100 + Math.random() * 900)}`;
        await SampleType.create({
          name: def.name,
          sampleCode: code,
          category: def.category,
          price: def.price,
          description: def.description,
          status: 'Active',
          available: true
        });
        console.log(`Seeded default sample type: ${def.name} (${code})`);
      }
    }
  } catch (error) {
    console.error('Error seeding default sample types:', error.message);
  }

  // Automatic token backfill migration for existing approved reports
  try {
    const labSettings = await LaboratorySettings.findOne({ key: 'default' }).lean();
    const expiryDays = labSettings?.publicReportSharing?.defaultExpiryDays || 30;

    const existingApproved = await LabReport.find({
      status: { $in: ['Approved', 'Ready for Printing'] },
      $or: [
        { 'publicReport.token': { $exists: false } },
        { 'publicReport.token': null },
        { 'publicReport.token': '' }
      ]
    });

    if (existingApproved.length > 0) {
      console.log(`Found ${existingApproved.length} approved report(s) without public share token. Migrating...`);
      for (const report of existingApproved) {
        report.generatePublicToken(expiryDays);
        await report.save();
      }
      console.log(`Successfully generated public sharing tokens for ${existingApproved.length} existing approved report(s).`);
    }
  } catch (error) {
    console.error('Error during public sharing token migration for existing approved reports:', error.message);
  }

  // Seed master laboratory parameters catalog
  await seedParameterCatalog();
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
