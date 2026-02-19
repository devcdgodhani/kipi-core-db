import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { SYSTEM_CONSTANTS } from './common/constants/system.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    cors: false, // handled below
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const corsOrigins = configService
    .get<string>('app.corsOrigins', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // ── Security ──────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
    }),
  );

  // ── Compression ───────────────────────────────────────────
  app.use(compression());

  // ── HTTP Logger ───────────────────────────────────────────
  if (nodeEnv !== 'test') {
    app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  // ── CORS ──────────────────────────────────────────────────
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Org-Id', 'X-Request-Id'],
  });

  // ── API Versioning ────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix(SYSTEM_CONSTANTS.API_PREFIX);

  // ── Global Validation ─────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  // ── Global Filters & Interceptors ─────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  // ── WebSocket ─────────────────────────────────────────────
  app.useWebSocketAdapter(new IoAdapter(app));

  // ── Swagger (non-production) ──────────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('JusticeLynk API')
      .setDescription('Global Legal-Tech SaaS Platform API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'accessToken')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'refreshToken')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Org-Id' }, 'orgId')
      .addTag('Auth', 'Authentication & MFA')
      .addTag('Users', 'User management')
      .addTag('Organizations', 'Organization & team management')
      .addTag('Professionals', 'Advocate & Detective profiles')
      .addTag('Cases', 'Case management')
      .addTag('Roles & Permissions', 'RBAC management')
      .addTag('Subscriptions', 'Billing & plans')
      .addTag('Payments', 'Payment processing')
      .addTag('Chat', 'Real-time messaging')
      .addTag('Notifications', 'Notification center')
      .addTag('Audit', 'Audit logs')
      .addTag('Admin', 'Super admin operations')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${SYSTEM_CONSTANTS.API_PREFIX}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);

  console.log(`
╔══════════════════════════════════════════════════════╗
║          JusticeLynk Backend is RUNNING              ║
╠══════════════════════════════════════════════════════╣
║  Environment : ${nodeEnv.padEnd(36)}║
║  HTTP API    : http://localhost:${String(port).padEnd(22)}║
║  Swagger     : http://localhost:${port}/api/v1/docs${' '.padEnd(10)}║
║  WebSocket   : ws://localhost:${String(port).padEnd(24)}║
╚══════════════════════════════════════════════════════╝
  `);
}

bootstrap().catch((err) => {
  console.error('Failed to start JusticeLynk backend', err);
  process.exit(1);
});
