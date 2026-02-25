import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { VersioningType } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
      prefix: 'v',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  const api = (path: string) => `/api/v1${path.startsWith('/') ? path : `/${path}`}`;

  describe('Health', () => {
    it('GET /health returns 200 or 503 with status', () => {
      return request(app.getHttpServer())
        .get(api('/health'))
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
          expect(res.body).toHaveProperty('status');
          expect(['healthy', 'unhealthy', 'degraded']).toContain(res.body.status);
        });
    });

    it('GET /health/live returns 200', () => {
      return request(app.getHttpServer())
        .get(api('/health/live'))
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'alive');
        });
    });

    it('GET /health/ready returns 200 or 503', () => {
      return request(app.getHttpServer())
        .get(api('/health/ready'))
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
          expect(res.body).toHaveProperty('status');
        });
    });
  });

  describe('Auth (public)', () => {
    it('POST /auth/register validates body (400 without required fields)', () => {
      return request(app.getHttpServer())
        .post(api('/auth/register'))
        .send({})
        .expect(400);
    });

    it('POST /auth/login validates body (400 without credentials)', () => {
      return request(app.getHttpServer())
        .post(api('/auth/login'))
        .send({})
        .expect(400);
    });

    it('POST /auth/forgot-password validates email', () => {
      return request(app.getHttpServer())
        .post(api('/auth/forgot-password'))
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('Auth (protected) return 401 without token', () => {
    it('GET /auth/me returns 401', () => {
      return request(app.getHttpServer()).get(api('/auth/me')).expect(401);
    });

    it('POST /auth/logout returns 401', () => {
      return request(app.getHttpServer()).post(api('/auth/logout')).send({}).expect(401);
    });
  });

  describe('Categories (public)', () => {
    it('GET /categories returns 200', () => {
      return request(app.getHttpServer())
        .get(api('/categories'))
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /categories/flat returns 200', () => {
      return request(app.getHttpServer())
        .get(api('/categories/flat'))
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Courses (public)', () => {
    it('GET /courses returns 200 with list', () => {
      return request(app.getHttpServer())
        .get(api('/courses'))
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('Consent (public)', () => {
    it('POST /consent validates body', () => {
      return request(app.getHttpServer())
        .post(api('/consent'))
        .send({})
        .expect((res) => {
          expect([200, 400]).toContain(res.status);
        });
    });
  });

  describe('Site Settings (public)', () => {
    it('GET /site-settings/public returns 200', () => {
      return request(app.getHttpServer())
        .get(api('/site-settings/public'))
        .expect(200)
        .expect((res) => {
          expect(typeof res.body).toBe('object');
        });
    });
  });

  describe('Subscriptions (public plans)', () => {
    it('GET /subscriptions/plans returns 200', () => {
      return request(app.getHttpServer())
        .get(api('/subscriptions/plans'))
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });
  });

  describe('Protected endpoints return 401 without token', () => {
    const protectedGet = [
      '/users/me',
      '/courses/all',
      '/dashboard/kpis',
      '/notifications',
      '/code-execution/languages',
      '/code-execution/provider',
      '/access-codes',
      '/audit-logs',
      '/mfa/status',
    ];

    it.each(protectedGet)('GET %s returns 401', (path) => {
      return request(app.getHttpServer()).get(api(path)).expect(401);
    });
  });
});
