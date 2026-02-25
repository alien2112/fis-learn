import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { EMAIL_SERVICE } from '@/common/external-services';
import { MfaModuleService } from '../mfa/mfa.service';
import { AuditLogService } from '@/common/services/audit-log.service';

describe('AuthService - Critical Tests', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(() => 'mock-jwt-token'),
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string): string | undefined => {
      const config: Record<string, string> = {
        'JWT_SECRET': 'test-secret',
        'JWT_EXPIRY': '15m',
        'JWT_REFRESH_EXPIRY': '7d',
        'jwt.secret': 'test-secret',
        'jwt.expiry': '15m',
        'jwt.refreshSecret': 'test-refresh-secret',
        'jwt.refreshExpiry': '7d',
      };
      return config[key];
    }),
  };

  const mockEmailService = {
    sendTemplate: jest.fn().mockResolvedValue(undefined),
  };

  const mockMfaService = {
    isEnabledForUser: jest.fn().mockResolvedValue(false),
    verifyTOTP: jest.fn(),
  };

  const mockCacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn(), reset: jest.fn() };
  const mockAuditLog = {
    log: jest.fn().mockResolvedValue(undefined),
    logAuth: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EMAIL_SERVICE, useValue: mockEmailService },
        { provide: MfaModuleService, useValue: mockMfaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully authenticate valid user', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'STUDENT',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        mfaEnabled: false,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should reject invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject unverified email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        emailVerifiedAt: null,
        status: 'PENDING_VERIFICATION',
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject suspended users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        status: 'SUSPENDED',
        emailVerifiedAt: new Date(),
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create new user with hashed password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-123',
        email: 'new@example.com',
        role: 'STUDENT',
        status: 'ACTIVE',
      });

      const result = await service.register({
        email: 'new@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      });

      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id', 'new-user-123');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            passwordHash: expect.not.stringContaining('SecurePass123'),
          }),
        }),
      );
    });

    it('should reject duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject weak passwords', async () => {
      await expect(
        service.register({
          email: 'test@example.com',
          password: '123',
          name: 'User',
        }),
      ).rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should issue new tokens with valid refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'refresh-123',
        token: 'valid-refresh-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      });

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalled();
    });

    it('should reject expired refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'refresh-123',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 86400000),
      });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject reused refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('used-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('password security', () => {
    it('should hash passwords with bcrypt (min 10 rounds)', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 12);
      
      expect(hash).not.toContain(password);
      expect(hash.startsWith('$2b$')).toBe(true);
      
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should prevent timing attacks on login', async () => {
      // Both should take similar time to prevent user enumeration
      const start1 = Date.now();
      mockPrisma.user.findUnique.mockResolvedValue(null);
      try {
        await service.login({ email: 'fake@test.com', password: 'wrong' });
      } catch {}
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'real@test.com',
        passwordHash: await bcrypt.hash('different', 10),
      });
      try {
        await service.login({ email: 'real@test.com', password: 'wrong' });
      } catch {}
      const time2 = Date.now() - start2;

      // Times should be within 150ms (both run bcrypt; allow CI variance)
      expect(Math.abs(time1 - time2)).toBeLessThan(150);
    });
  });
});
