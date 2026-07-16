import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import 'dotenv/config';
import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

// Setup process-level guards to keep server running
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error.stack || error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason.stack || reason);
});

const port = Number(process.env.PORT || 5000);
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error('MONGODB_URI and JWT_SECRET must be configured.');
let server;
async function shutdown(signal) { console.log(`${signal} received; closing API.`); server?.close(async () => { await disconnectDatabase(); process.exit(0); }); }
process.once('SIGINT', () => shutdown('SIGINT'));process.once('SIGTERM', () => shutdown('SIGTERM'));
connectDatabase().then(() => { server=app.listen(port, () => console.log(`API listening on ${port}`)); }).catch((error) => { console.error('Database connection failed:', error.message); process.exit(1); });
