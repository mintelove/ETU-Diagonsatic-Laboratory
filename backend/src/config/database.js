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

  // Seed Branches if they do not exist
  try {
    const branches = [
      { name: 'Main Branch', code: 'MAIN', shortName: 'Main', isDefault: true, description: 'ETU Diagnostic Laboratory Main Branch' },
      { name: 'Otona Branch', code: 'OTONA', shortName: 'Otona', isDefault: false, description: 'ETU Diagnostic Laboratory Otona Branch' }
    ];
    const Branch = (await import('../models/Branch.js')).default;
    for (const b of branches) {
      const existing = await Branch.findOne({ $or: [{ name: b.name }, { code: b.code }, { shortName: b.shortName }] });
      if (!existing) {
        await Branch.create(b);
        console.log(`Branch created: ${b.name} (${b.code})`);
      }
    }
  } catch (error) {
    console.error('Error seeding branches:', error.message);
  }

  // Seed / synchronize CEO account and requested branch user accounts
  try {
    const requestedUsers = [
      // CEO (One cross-branch account with Admin + Approver privileges)
      {
        username: 'temesgen fanta',
        fullName: 'Dr Temesgen Fanta CEO',
        role: 'Admin',
        roles: ['Admin', 'Approver'],
        branchName: 'All',
        allowedBranches: ['Main', 'Otona'],
        isCEO: true,
        phone: '+251911000001',
        password: 'password@123'
      },
      // OTONA BRANCH ACCOUNTS
      {
        username: 'wondachew tesfaye',
        fullName: 'Wondachew Tesfaye',
        role: 'Admin',
        roles: ['Admin'],
        branchName: 'Otona',
        allowedBranches: ['Otona', 'Main'],
        phone: '+251911000002',
        password: 'password@123'
      },
      {
        username: 'tensai ololo',
        fullName: 'Tensai ololo',
        role: 'Admin',
        roles: ['Admin', 'Sample Collector', 'Approver'],
        branchName: 'Otona',
        allowedBranches: ['Otona', 'Main'],
        phone: '+251911000003',
        password: 'password@123'
      },
      {
        username: 'kalkidan',
        fullName: 'Kalkidan',
        role: 'Reception',
        roles: ['Reception'],
        branchName: 'Otona',
        allowedBranches: ['Otona'],
        phone: '+251911000004',
        password: 'password@123'
      },
      {
        username: 'bereket',
        fullName: 'Bereket',
        role: 'Sample Collector',
        roles: ['Sample Collector'],
        branchName: 'Otona',
        allowedBranches: ['Otona'],
        phone: '+251911000005',
        password: 'password@123'
      },
      {
        username: 'banchiayew',
        fullName: 'Banchiayew',
        role: 'Sample Collector',
        roles: ['Sample Collector'],
        branchName: 'Otona',
        allowedBranches: ['Otona'],
        phone: '+251911000006',
        password: 'password@123'
      },
      {
        username: 'womdachew tesfaye',
        fullName: 'Womdachew Tesfaye',
        role: 'Approver',
        roles: ['Approver'],
        branchName: 'Otona',
        allowedBranches: ['Otona', 'Main'],
        phone: '+251911000007',
        password: 'password@123'
      },
      // MAIN BRANCH ACCOUNTS
      {
        username: 'tsega',
        fullName: 'Tsega',
        role: 'Reception',
        roles: ['Reception'],
        branchName: 'Main',
        allowedBranches: ['Main'],
        phone: '+251911000008',
        password: 'password@123'
      },
      {
        username: 'receptions 2',
        fullName: 'Receptions 2',
        role: 'Reception',
        roles: ['Reception'],
        branchName: 'Main',
        allowedBranches: ['Main'],
        phone: '+251911000009',
        password: 'password@123'
      },
      {
        username: 'tarekegn tesfaye',
        fullName: 'Tarekegn Tesfaye',
        role: 'Sample Collector',
        roles: ['Sample Collector', 'Approver'],
        branchName: 'Main',
        allowedBranches: ['Main'],
        phone: '+251911000010',
        password: 'password@123'
      },
      {
        username: 'tamrat desta',
        fullName: 'Tamrat Desta',
        role: 'Sample Collector',
        roles: ['Sample Collector', 'Approver'],
        branchName: 'Main',
        allowedBranches: ['Main'],
        phone: '+251911000011',
        password: 'password@123'
      },
      {
        username: 'tensai',
        fullName: 'Tensai',
        role: 'Sample Collector',
        roles: ['Sample Collector'],
        branchName: 'Main',
        allowedBranches: ['Main'],
        phone: '+251911000012',
        password: 'password@123'
      },
      {
        username: 'part time',
        fullName: 'part time',
        role: 'Sample Collector',
        roles: ['Sample Collector'],
        branchName: 'Main',
        allowedBranches: ['Main'],
        phone: '+251911000013',
        password: 'password@123'
      },
      {
        username: 'tensai olol',
        fullName: 'Tensai olol',
        role: 'Approver',
        roles: ['Approver'],
        branchName: 'Main',
        allowedBranches: ['Main'],
        phone: '+251911000014',
        password: 'password@123'
      }
    ];

    for (const reqAcc of requestedUsers) {
      let existingUser = await User.findOne({
        $or: [
          { username: reqAcc.username },
          ...(reqAcc.isCEO ? [{ username: 'admin' }, { isCEO: true }] : [])
        ]
      }).select('+password');

      if (!existingUser) {
        await User.create({
          ...reqAcc,
          status: 'Active',
          isDeveloperAccount: false
        });
        console.log(`User created: ${reqAcc.fullName} (@${reqAcc.username}, ${reqAcc.role}, ${reqAcc.branchName})`);
      } else {
        let changed = false;
        if (existingUser.fullName !== reqAcc.fullName) {
          existingUser.fullName = reqAcc.fullName;
          changed = true;
        }
        if (existingUser.username !== reqAcc.username) {
          existingUser.username = reqAcc.username;
          changed = true;
        }
        if (existingUser.role !== reqAcc.role) {
          existingUser.role = reqAcc.role;
          changed = true;
        }
        if (JSON.stringify(existingUser.roles || []) !== JSON.stringify(reqAcc.roles || [])) {
          existingUser.roles = reqAcc.roles;
          changed = true;
        }
        if (existingUser.branchName !== reqAcc.branchName) {
          existingUser.branchName = reqAcc.branchName;
          changed = true;
        }
        if (JSON.stringify(existingUser.allowedBranches || []) !== JSON.stringify(reqAcc.allowedBranches || [])) {
          existingUser.allowedBranches = reqAcc.allowedBranches;
          changed = true;
        }
        if (Boolean(existingUser.isCEO) !== Boolean(reqAcc.isCEO)) {
          existingUser.isCEO = Boolean(reqAcc.isCEO);
          changed = true;
        }
        if (existingUser.status !== 'Active') {
          existingUser.status = 'Active';
          changed = true;
        }
        // If password is not set or in test mode, ensure standard seed password is set
        const isInitialMatch = await existingUser.comparePassword('123456').catch(() => false);
        const isPassMatch = await existingUser.comparePassword(reqAcc.password).catch(() => false);
        if (isInitialMatch || (process.env.NODE_ENV === 'test' && !isPassMatch)) {
          existingUser.password = reqAcc.password;
          changed = true;
        }
        if (changed) {
          await existingUser.save();
          console.log(`User updated & synchronized: ${reqAcc.fullName} (@${reqAcc.username})`);
        }
      }
    }
  } catch (error) {
    console.error('Error seeding requested branch users:', error.message);
  }

  // Seed / ensure protected developer admin account (Mintex)
  try {
    const devUsername = 'mintex';
    let devAccount = await User.findOne({
      $or: [{ username: devUsername }, { isDeveloperAccount: true }]
    });
    if (!devAccount) {
      await User.create({
        fullName: 'Developer Administrator',
        username: devUsername,
        password: 'Mintex@2016',
        phone: '+251900000000',
        role: 'Admin',
        status: 'Active',
        branchName: 'Main',
        isDeveloperAccount: true
      });
      console.log('Protected developer admin account created (Mintex).');
    } else {
      let needsSave = false;
      if (!devAccount.isDeveloperAccount) {
        devAccount.isDeveloperAccount = true;
        needsSave = true;
      }
      if (devAccount.role !== 'Admin') {
        devAccount.role = 'Admin';
        needsSave = true;
      }
      if (devAccount.status !== 'Active') {
        devAccount.status = 'Active';
        needsSave = true;
      }
      if (needsSave) {
        await devAccount.save();
        console.log('Protected developer admin account flags synchronized.');
      }
    }
  } catch (error) {
    console.error('Error seeding protected developer account:', error.message);
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

  // Seed master laboratory parameters catalog and test types
  await seedParameterCatalog();
  try {
    const { seedLaboratoryTests } = await import('../controllers/laboratoryTestController.js');
    await seedLaboratoryTests();
  } catch (seedErr) {
    console.error('Error seeding laboratory tests on startup:', seedErr.message);
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
