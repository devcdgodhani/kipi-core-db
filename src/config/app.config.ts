import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  name: process.env.APP_NAME || 'JusticeLynk',
  url: process.env.APP_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000',
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:4000',
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-32-char-key-change-in-prod',
  throttleTtl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
}));
