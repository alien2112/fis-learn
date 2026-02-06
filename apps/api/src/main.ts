import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create app with raw body for webhook signature verification
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // ============ SECURITY HEADERS (Helmet) ============
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
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
  const allowedOrigins = [
    process.env.ADMIN_URL || 'http://localhost:3000',
    process.env.WEB_URL || 'http://localhost:3002',
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
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production') {
        // Allow any origin in development
        callback(null, true);
      } else {
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

  // ============ COOKIE PARSER ============
  app.use(cookieParser());

  // ============ CSRF PROTECTION ============
  // Configure cookies to be secure with SameSite protection
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  };

  // Store cookie options for use in auth controller
  (app as any).cookieOptions = cookieOptions;
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Detailed error messages in development
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // ============ SWAGGER DOCUMENTATION ============
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
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
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log('Swagger documentation enabled at /api/docs');
  }

  // ============ START SERVER ============
  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`API is running on http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
  }
}

bootstrap();

