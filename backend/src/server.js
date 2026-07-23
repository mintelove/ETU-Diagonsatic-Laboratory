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
let server;
async function shutdown(signal) { console.log(`${signal} received; closing API.`); server?.close(async () => { await disconnectDatabase(); process.exit(0); }); }
process.once('SIGINT', () => shutdown('SIGINT'));process.once('SIGTERM', () => shutdown('SIGTERM'));

async function start() {
  console.log(`MongoDB URI configured: ${process.env.MONGODB_URI?.trim() ? 'YES' : 'NO'}`);
  if (!process.env.MONGODB_URI?.trim()) throw new Error('MONGODB_URI is not configured.');
  if (!process.env.JWT_SECRET?.trim()) throw new Error('JWT_SECRET is not configured.');

  await connectDatabase();
  server = app.listen(port, () => console.log(`API listening on ${port}`));
}

start().catch((error) => {
  console.error('Database connection failed:', error.message);
  console.error('API was not started because MongoDB is unavailable.');
  process.exitCode = 1;
});
