import mongoose from 'mongoose';
import { config } from '../config/index.js';

export async function connectDB(): Promise<void> {
  mongoose.connection.on('connected', () => console.log('  → MongoDB connected'));
  mongoose.connection.on('error', (err) => console.error('[MongoDB]', err.message));
  mongoose.connection.on('disconnected', () => {
    if (config.isProd) console.warn('[MongoDB] Disconnected — retrying...');
  });

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
}
