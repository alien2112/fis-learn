import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { validateEnvironment } from './common/config/env.validation';

async function bootstrap() {
  validateEnvironment();
  const logger = new Logger('Bootstrap');

  // Create app with raw body for webhook signature verification
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // ============ SECURITY HEADERS (Helmet) ============
  const swaggerEnabled = process.env.DISABLE_SWAGGER !== 'true';
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: swaggerEnabled ? ["'self'", "'unsafe-inline'"] : ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          // Swagger UI bundle needs 'unsafe-eval' to run (otherwise blank white screen)
          scriptSrc: swaggerEnabled
            ? ["'self'", "'unsafe-eval'"]
            : ["'self'"],
        },
      },
      // Prevent clickjacking
      frameguard: { action: 'deny' },
      // HSTS - only in production
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 31536000, includeSubDomains: true, preload: true }
          : false,
      // Prevent MIME sniffing
      noSniff: true,
      // XSS protection
      xssFilter: true,
      // Referrer policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // Hide X-Powered-By
      hidePoweredBy: true,
    }),
  );

  // ============ API VERSIONING ============
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // ============ COMPRESSION (GZIP) ============
  app.use(
    compression({
      filter: (req: Request, res: Response) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6, // balanced compression/speed
    }),
  );

  // ============ CORS CONFIGURATION ============
  // CORS_ORIGINS: comma-separated list of additional allowed origins (e.g. nginx proxy URL)
  const extraOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const allowedOrigins = [
    process.env.ADMIN_URL || 'http://localhost:3000',
    process.env.WEB_URL || 'http://localhost:3002',
    ...extraOrigins,
  ];

  // Add development origins
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3010',
      'http://localhost:5173',
    );
  }

  app.enableCors({
    origin: (origin, callback) => {
      // In production, strictly enforce origin allowlist
      // In development, allow listed localhost origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        if (process.env.NODE_ENV === 'production') {
          logger.warn(`CORS rejection: ${origin}`);
        }
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Request-ID',
      'X-Client-Version',
      'Accept-Language',
      'X-Requested-With',
      'X-CSRF-Token',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    credentials: true,
    maxAge: 3600,
  });

  // ============ BODY SIZE LIMIT ============
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // ============ COOKIE PARSER ============
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Always return field-level validation messages so clients can show meaningful errors
      disableErrorMessages: false,
    }),
  );

  // ============ SWAGGER DOCUMENTATION ============
  // Enabled by default; set DISABLE_SWAGGER=true to hide /docs in production.
  if (process.env.DISABLE_SWAGGER !== 'true') {
    const config = new DocumentBuilder()
      .setTitle('FIS Learn API')
      .setDescription(
        `
## E-Learning Platform API

### Authentication
All endpoints (except public ones) require a valid JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <token>
\`\`\`

### Rate Limiting
Rate limits are enforced per user and vary by subscription tier.
Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Maximum requests per window
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: Unix timestamp when the window resets

### Subscription Tiers
- **Free**: Limited features, 5 code executions/day
- **Basic**: Full chat access, 100 executions/day
- **Pro**: Unlimited executions, priority support
- **Enterprise**: Custom limits, dedicated support

### Error Codes
Errors follow a consistent format with machine-readable codes:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": []
  }
}
\`\`\`
      `.trim(),
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Authentication and authorization')
      .addTag('Users', 'User management')
      .addTag('Courses', 'Course operations')
      .addTag('Subscriptions', 'Subscription and billing')
      .addTag('MFA', 'Multi-factor authentication')
      .addTag('Categories', 'Course categories')
      .addTag('Access Codes', 'Access code management')
      .addTag('Health', 'Health check and readiness probes')
      .addTag('Site Settings', 'Public and admin site configuration')
      .addTag('Community', 'Course channels and messages')
      .addTag('Admin - Skill Trees', 'Skill tree CRUD and publishing')
      .addTag('Video', 'Video upload and asset management')
      .addTag('Streaming', 'Live streaming sessions')
      .addTag('Notifications', 'User notifications and preferences')
      .addTag('Code Execution', 'Execute code and get languages')
      .addTag('Code Exercises', 'Code exercises and submissions')
      .addTag('Chatbot', 'AI chat (public and authenticated)')
      .addTag('Consent', 'Cookie/consent recording')
      .addTag('Audit Logs', 'Admin audit log query')
      .addTag('Analytics', 'Events and dashboard analytics')
      .addTag('Dashboard', 'Admin dashboard KPIs and stats')
      .addTag('Maintenance', 'Maintenance mode (if present)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    // Serve only the OpenAPI JSON/YAML at /api/docs-json; UI is served via CDN (avoids static 404s).
    SwaggerModule.setup('docs', app, document, {
      useGlobalPrefix: true,
      swaggerUiEnabled: false,
    });

    // Serve Swagger UI HTML at /api/docs (under global prefix so route is registered with the app).
    const SWAGGER_UI_CDN = 'https://unpkg.com/swagger-ui-dist@5.17.14';
    const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FIS Learn API – Swagger UI</title>
  <link rel="stylesheet" href="${SWAGGER_UI_CDN}/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI_CDN}/swagger-ui-bundle.js"></script>
  <script src="${SWAGGER_UI_CDN}/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '/api/docs-json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;

    const httpAdapter = app.getHttpAdapter();
    const sendHtml = (_req: unknown, res: any) => {
      res.type('text/html');
      res.send(swaggerHtml);
    };
    httpAdapter.get('/api/docs', sendHtml);
    httpAdapter.get('/api/docs/', sendHtml);

    logger.log('Swagger documentation enabled at /api/docs (UI from CDN)');
  }

  // ============ START SERVER ============
  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`API is running on http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  if (process.env.DISABLE_SWAGGER !== 'true') {
    logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
  }

  // ============ GRACEFUL SHUTDOWN ============
  app.enableShutdownHooks();

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Starting graceful shutdown...`);

    // Give in-flight requests 10 seconds to complete
    const timeout = setTimeout(() => {
      logger.warn('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10000);

    try {
      await app.close();
      clearTimeout(timeout);
      logger.log('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', err);
      clearTimeout(timeout);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
