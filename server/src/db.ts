import mongoose from 'mongoose';
import { config } from './config';

export async function connectDb() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    const error = err as Error & { code?: string };
    console.error('MongoDB connection failed:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error(
        'That MongoDB host does not exist. Use a current Atlas connection string, or local MongoDB: mongodb://127.0.0.1:27017/king-cric'
      );
    } else {
      console.error('Check MONGODB_URI in server/.env (local) or your host environment variables.');
    }
    throw err;
  }
}
