import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import User from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import Category from '../models/Category.js';
import { DEFAULT_CATEGORIES } from '../constants/stock.js';
const required = ['INITIAL_ADMIN_NAME', 'INITIAL_ADMIN_USERNAME', 'INITIAL_ADMIN_PASSWORD', 'INITIAL_ADMIN_PHONE'];
if (required.some((key) => !process.env[key])) throw new Error(`Missing: ${required.filter((key) => !process.env[key]).join(', ')}`);
await connectDatabase();
const username = process.env.INITIAL_ADMIN_USERNAME.toLowerCase();
const existing = await User.findOne({ username });
if (existing) console.log('Initial administrator already exists.');
else { await User.create({ fullName: process.env.INITIAL_ADMIN_NAME, username, password: process.env.INITIAL_ADMIN_PASSWORD, phone: process.env.INITIAL_ADMIN_PHONE, role: ROLES.ADMIN, status: 'Active' }); console.log('Initial administrator created. Change its password after first login.'); }
await Category.bulkWrite(DEFAULT_CATEGORIES.map((name) => ({ updateOne: { filter: { name }, update: { $setOnInsert: { name, status: 'Active' } }, upsert: true } })));
console.log('Default stock categories are available.');
await mongoose.disconnect();
