import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MFA_SERVICE,
  MfaService as IMfaService,
  EMAIL_SERVICE,
  EmailService,
  EmailTemplateType,
} from '../../common/external-services';
import { MfaMethod, TokenType } from '@prisma/client';
import { VerifyMfaSetupDto, DisableMfaDto } from './dto';

// Encryption for MFA secrets - must be set via environment variable
const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY) {
  throw new Error('MFA_ENCRYPTION_KEY environment variable is required. Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

/**
 * MFA Module Service
 *
 * Handles MFA setup, verification, and management.
 * Uses the provider-agnostic MfaService interface.
 */
@Injectable()
export class MfaModuleService {
  private readonly logger = new Logger(MfaModuleService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MFA_SERVICE) private readonly mfaService: IMfaService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
  ) {}

  /**
   * Get MFA status for a user
   */
  async getMfaStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaMethod: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Count remaining backup codes
    const backupCodesCount = await this.prisma.mfaBackupCode.count({
      where: {
        userId,
        usedAt: null,
      },
    });

    return {
      enabled: user.mfaEnabled,
      method: user.mfaMethod,
      backupCodesRemaining: backupCodesCount,
    };
  }

  /**
   * Initiate MFA setup - generates secret and QR code
   */
  async initiateMfaSetup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mfaEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Generate new secret
    const result = await this.mfaService.generateSecret({
      userId,
      userEmail: user.email,
      issuer: process.env.APP_NAME || 'FIS Learn',
    });

    // Store pending setup (encrypted) with expiration
    const encryptedSecret = this.encryptSecret(result.secret);

    await this.prisma.verificationToken.create({
      data: {
        userId,
        token: encryptedSecret,
        type: TokenType.MFA_SETUP,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    this.logger.log(`MFA setup initiated for user ${userId}`);

    return {
      qrCodeDataUrl: result.qrCodeDataUrl,
      secret: result.secret, // Show to user for manual entry
      manualEntryKey: result.secret,
    };
  }

  /**
   * Complete MFA setup by verifying the first code
   */
  async completeMfaSetup(userId: string, dto: VerifyMfaSetupDto) {
    // Get pending setup token
    const setupToken = await this.prisma.verificationToken.findFirst({
      where: {
        userId,
        type: TokenType.MFA_SETUP,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!setupToken) {
      throw new BadRequestException('MFA setup not initiated or expired. Please start again.');
    }

    // Decrypt the secret
    const secret = this.decryptSecret(setupToken.token);

    // Verify the code
    const isValid = await this.mfaService.verifyToken({
      secret,
      token: dto.code,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Generate backup codes
    const backupCodesResult = await this.mfaService.generateBackupCodes();

    // Enable MFA and store encrypted secret
    const encryptedSecret = this.encryptSecret(secret);

    await this.prisma.$transaction([
      // Update user
      this.prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaSecret: encryptedSecret,
          mfaMethod: MfaMethod.TOTP,
        },
      }),

      // Delete setup token
      this.prisma.verificationToken.update({
        where: { id: setupToken.id },
        data: { usedAt: new Date() },
      }),

      // Store backup codes
      this.prisma.mfaBackupCode.createMany({
        data: backupCodesResult.hashedCodes.map((codeHash) => ({
          userId,
          codeHash,
        })),
      }),
    ]);

    // Send confirmation email
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.emailService.sendTemplateEmail({
        to: user.email,
        templateId: EmailTemplateType.MFA_ENABLED,
        templateData: {
          userName: user.name,
          userEmail: user.email,
          appName: process.env.APP_NAME || 'FIS Learn',
          appUrl: process.env.APP_URL || '',
        },
      }).catch((err) => this.logger.error('Failed to send MFA enabled email', err));
    }

    this.logger.log(`MFA enabled for user ${userId}`);

    return {
      codes: backupCodesResult.codes,
      message: 'Save these backup codes in a safe place. You will not see them again.',
    };
  }

  /**
   * Verify MFA code during login
   */
  async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaSecret: true,
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return true; // MFA not enabled, allow
    }

    // Check if it's a backup code (format: XXXX-XXXX)
    if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return this.verifyBackupCode(userId, code);
    }

    // Verify TOTP code
    const secret = this.decryptSecret(user.mfaSecret);
    const isValid = await this.mfaService.verifyToken({
      secret,
      token: code,
    });

    if (!isValid) {
      this.logger.warn(`Invalid MFA code attempt for user ${userId}`);
    }

    return isValid;
  }

  /**
   * Verify a backup code
   */
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    // Get all unused backup codes
    const backupCodes = await this.prisma.mfaBackupCode.findMany({
      where: {
        userId,
        usedAt: null,
      },
    });

    const hashedCodes = backupCodes.map((bc) => bc.codeHash);

    const result = await this.mfaService.verifyBackupCode({
      code,
      hashedCodes,
    });

    if (result.valid && result.usedCodeHash) {
      // Mark the code as used
      const usedCode = backupCodes.find((bc) => bc.codeHash === result.usedCodeHash);
      if (usedCode) {
        await this.prisma.mfaBackupCode.update({
          where: { id: usedCode.id },
          data: { usedAt: new Date() },
        });
      }

      this.logger.log(
        `Backup code used for user ${userId}. Remaining: ${result.remainingCodes}`,
      );

      // Warn if running low on backup codes
      if (result.remainingCodes <= 2) {
        this.logger.warn(`User ${userId} has only ${result.remainingCodes} backup codes left`);
      }
    }

    return result.valid;
  }

  /**
   * Disable MFA
   */
  async disableMfa(userId: string, dto: DisableMfaDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        passwordHash: true,
        mfaEnabled: true,
        mfaSecret: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify MFA code
    const codeValid = await this.verifyMfaCode(userId, dto.code);
    if (!codeValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Disable MFA
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaMethod: null,
        },
      }),

      // Delete all backup codes
      this.prisma.mfaBackupCode.deleteMany({
        where: { userId },
      }),
    ]);

    // Send confirmation email
    await this.emailService.sendTemplateEmail({
      to: user.email,
      templateId: EmailTemplateType.MFA_DISABLED,
      templateData: {
        userName: user.name,
        userEmail: user.email,
        appName: process.env.APP_NAME || 'FIS Learn',
        appUrl: process.env.APP_URL || '',
      },
    }).catch((err) => this.logger.error('Failed to send MFA disabled email', err));

    this.logger.log(`MFA disabled for user ${userId}`);

    return { success: true };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, code: string) {
    // Verify current MFA code first
    const codeValid = await this.verifyMfaCode(userId, code);
    if (!codeValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Generate new backup codes
    const backupCodesResult = await this.mfaService.generateBackupCodes();

    // Replace old codes with new ones
    await this.prisma.$transaction([
      this.prisma.mfaBackupCode.deleteMany({
        where: { userId },
      }),
      this.prisma.mfaBackupCode.createMany({
        data: backupCodesResult.hashedCodes.map((codeHash) => ({
          userId,
          codeHash,
        })),
      }),
    ]);

    this.logger.log(`Backup codes regenerated for user ${userId}`);

    return {
      codes: backupCodesResult.codes,
      message: 'Save these new backup codes. Your old codes are no longer valid.',
    };
  }

  // ============ ENCRYPTION HELPERS ============

  private encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY!, 'hex');
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decryptSecret(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY!, 'hex');

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
