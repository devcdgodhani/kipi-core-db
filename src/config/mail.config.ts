import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'JusticeLynk <noreply@justicelynk.com>',
  appName: process.env.APP_NAME || 'JusticeLynk',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
}));
