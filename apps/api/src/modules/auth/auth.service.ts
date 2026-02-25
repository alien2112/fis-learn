import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { JwtPayload, TokenResponse, AuthUser } from './types/jwt-payload.interface';
import { Role, UserStatus, TokenType } from '@prisma/client';
import { EMAIL_SERVICE, EmailService, EmailTemplateType } from '../../common/external-services';
import { MfaModuleService } from '../mfa/mfa.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AuditLogService } from '@/common/services/audit-log.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(EMAIL_SERVICE) private emailService: EmailService,
    private mfaService: MfaModuleService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private auditLog: AuditLogService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultAdminUser();
  }

  private async ensureDefaultAdminUser() {
    const email = 'admin@fis-learn.com';
    try {
      const existing = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existing) {
        return;
      }

      const passwordHash = await bcrypt.hash('Admin123!', 12);
      await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name: 'Super Admin',
          role: Role.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
        select: { id: true },
      });

      this.logger.warn('Seeded dev super admin account: admin@fis-learn.com');
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to seed dev admin account', stack);
    }
  }

  // Brute-force protection helpers
  private async checkLoginAttempts(email: string): Promise<void> {
    const key = `login_attempts:${email.toLowerCase()}`;
    const attempts = (await this.cacheManager.get<number>(key)) || 0;
    if (attempts >= 5) {
      throw new UnauthorizedException(
        'Too many failed login attempts. Please try again in 15 minutes.',
      );
    }
  }

  private async recordFailedLogin(email: string): Promise<void> {
    const key = `login_attempts:${email.toLowerCase()}`;
    const attempts = (await this.cacheManager.get<number>(key)) || 0;
    await this.cacheManager.set(key, attempts + 1, 15 * 60 * 1000); // 15 min TTL
  }

  private async clearLoginAttempts(email: string): Promise<void> {
    const key = `login_attempts:${email.toLowerCase()}`;
    await this.cacheManager.del(key);
  }

  // MFA attempt limiting helpers
  private async checkMfaAttempts(userId: string): Promise<void> {
    const key = `mfa_attempts:${userId}`;
    const attempts = (await this.cacheManager.get<number>(key)) || 0;
    if (attempts >= 5) {
      throw new UnauthorizedException(
        'Too many failed MFA attempts. Please request a new login.',
      );
    }
  }

  private async recordFailedMfa(userId: string): Promise<void> {
    const key = `mfa_attempts:${userId}`;
    const attempts = (await this.cacheManager.get<number>(key)) || 0;
    await this.cacheManager.set(key, attempts + 1, 5 * 60 * 1000); // 5 min TTL
  }

  private async clearMfaAttempts(userId: string): Promise<void> {
    const key = `mfa_attempts:${userId}`;
    await this.cacheManager.del(key);
  }

  async register(dto: RegisterDto): Promise<{ user: AuthUser; message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Return generic message to prevent user enumeration attacks
      throw new ConflictException('Registration failed. Please try again or contact support if the problem persists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: dto.name,
        role: Role.STUDENT,
        status: UserStatus.PENDING_VERIFICATION,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        avatarUrl: true,
      },
    });

    // If email verification is disabled, auto-verify and let the user log in immediately
    const emailVerificationRequired = this.configService.get<boolean>('auth.emailVerificationRequired') ?? false;

    if (!emailVerificationRequired) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
      });
      this.logger.warn(`Email verification disabled — auto-verified user ${user.email}`);
      return {
        user: { ...user, status: UserStatus.ACTIVE },
        message: 'Registration successful. You can now log in.',
      };
    }

    // Generate verification token and send email
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt,
      },
    });

    const webUrl = this.configService.get<string>('urls.web') || 'http://localhost:3002';
    try {
      await this.emailService.sendTemplateEmail({
        to: user.email,
        templateId: EmailTemplateType.EMAIL_VERIFICATION,
        templateData: {
          userName: user.name,
          verificationUrl: `${webUrl}/verify-email?token=${token}`,
          expiresInHours: 24,
        },
      });
    } catch (emailError) {
      this.logger.error(`Failed to send verification email to ${user.email}: ${emailError.message}`);
      // Registration succeeded; user must verify email once SMTP is fixed
    }

    return {
      user,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: TokenResponse } | { mfaRequired: true; mfaPendingToken: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Check for brute-force protection
    await this.checkLoginAttempts(normalizedEmail);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      await this.recordFailedLogin(normalizedEmail);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      await this.recordFailedLogin(normalizedEmail);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      await this.recordFailedLogin(normalizedEmail);
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    if (user.status === UserStatus.SUSPENDED) {
      await this.recordFailedLogin(normalizedEmail);
      throw new UnauthorizedException('Your account has been suspended');
    }

    if (user.status === UserStatus.BANNED) {
      await this.recordFailedLogin(normalizedEmail);
      throw new UnauthorizedException('Your account has been banned');
    }

    // Clear failed attempts on successful password validation
    await this.clearLoginAttempts(normalizedEmail);

    // MFA gate — return short-lived pending token if MFA is enabled
    if (user.mfaEnabled) {
      const mfaPendingToken = this.jwtService.sign(
        { sub: user.id, pendingMfa: true },
        {
          secret: this.configService.get<string>('jwt.secret'),
          expiresIn: '5m',
        },
      );
      return { mfaRequired: true, mfaPendingToken };
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.status);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log successful login
    await this.auditLog.logAuth(user.id, 'LOGIN');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        locale: user.locale,
        timezone: user.timezone,
      },
      tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<TokenResponse> {
    // Find refresh token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Check user status
    if (storedToken.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Delete old refresh token (rotation)
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role,
      storedToken.user.status,
    );

    return tokens;
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    // Delete refresh token from database
    try {
      await this.prisma.refreshToken.delete({
        where: { token: refreshToken },
      });
    } catch (error) {
      // Token might not exist, that's okay
    }

    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        avatarUrl: true,
        locale: true,
        timezone: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account exists with this email, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: TokenType.PASSWORD_RESET,
        expiresAt,
      },
    });

    const webUrl = this.configService.get<string>('urls.web') || 'http://localhost:3002';
    await this.emailService.sendTemplateEmail({
      to: user.email,
      templateId: EmailTemplateType.PASSWORD_RESET,
      templateData: {
        userName: user.name,
        resetUrl: `${webUrl}/reset-password?token=${token}`,
        expiresInHours: 1,
      },
    });

    return { message: 'If an account exists with this email, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken || verificationToken.type !== TokenType.PASSWORD_RESET) {
      throw new BadRequestException('Invalid reset token');
    }

    if (verificationToken.usedAt) {
      throw new BadRequestException('Reset token has already been used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: { passwordHash },
    });

    await this.prisma.verificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });

    // Invalidate all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { userId: verificationToken.userId },
    });

    // Log password reset
    await this.auditLog.logAuth(verificationToken.userId, 'PASSWORD_RESET');

    return { message: 'Password has been reset successfully. You can now log in.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken || verificationToken.type !== TokenType.EMAIL_VERIFICATION) {
      throw new BadRequestException('Invalid verification token');
    }

    if (verificationToken.usedAt) {
      throw new BadRequestException('Verification token has already been used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: {
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    await this.prisma.verificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });

    // Log email verification
    await this.auditLog.logAuth(verificationToken.userId, 'EMAIL_VERIFIED');

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async verifyMfaLogin(mfaPendingToken: string, code: string): Promise<{ user: AuthUser; tokens: TokenResponse }> {
    let payload: { sub: string; pendingMfa?: boolean };
    try {
      payload = this.jwtService.verify(mfaPendingToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA pending token');
    }

    if (!payload.pendingMfa) {
      throw new UnauthorizedException('Invalid MFA pending token');
    }

    // Check MFA attempt limiting
    await this.checkMfaAttempts(payload.sub);

    const isValid = await this.mfaService.verifyMfaCode(payload.sub, code);
    if (!isValid) {
      await this.recordFailedMfa(payload.sub);
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Clear MFA attempts on success
    await this.clearMfaAttempts(payload.sub);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.status);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log successful MFA login
    await this.auditLog.logAuth(user.id, 'LOGIN_MFA');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        locale: user.locale,
        timezone: user.timezone,
      },
      tokens,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // Log password change
    await this.auditLog.logAuth(userId, 'PASSWORD_CHANGE');

    return { message: 'Password changed successfully. Please log in again.' };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: Role,
    status: UserStatus,
  ): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      status,
    };

    const accessExpiry = this.configService.get<string>('jwt.expiry') || '3650d';
    const refreshExpiry = this.configService.get<string>('jwt.refreshExpiry') || '3650d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: accessExpiry,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiry,
      }),
    ]);

    // Calculate refresh token expiry (stored in DB)
    const expiresAt = this.calculateExpiryDate(refreshExpiry);

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private calculateExpiryDate(duration: string): Date {
    const now = new Date();
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      // Default to 7 days
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}
