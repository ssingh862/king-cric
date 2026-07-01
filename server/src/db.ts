import mongoose from 'mongoose';
import { config } from './config';

export async function connectDb() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', (err as Error).message);
    console.error('Set MONGODB_URI in Railway Variables (MongoDB Atlas connection string).');
    throw err;
  }
}
