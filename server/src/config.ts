import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/king-cric',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
};
