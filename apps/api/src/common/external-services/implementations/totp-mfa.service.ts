import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  MfaService,
  GenerateSecretData,
  SecretResult,
  VerifyTokenData,
  GenerateBackupCodesData,
  BackupCodesResult,
  VerifyBackupCodeData,
  BackupCodeVerificationResult,
  MfaConfig,
  DEFAULT_MFA_CONFIG,
} from '../mfa-service.interface';

/**
 * TOTP MFA Service Implementation
 *
 * Uses standard TOTP (Time-based One-Time Password) algorithm.
 * Compatible with any authenticator app:
 * - Google Authenticator
 * - Authy
 * - Microsoft Authenticator
 * - 1Password
 * - etc.
 *
 * This is a pure implementation without external TOTP libraries.
 * For production, consider using 'otplib' or 'speakeasy' for battle-tested code.
 */
@Injectable()
export class TotpMfaService implements MfaService {
  readonly providerName = 'totp';
  private readonly config: MfaConfig;

  constructor(config?: Partial<MfaConfig>) {
    this.config = { ...DEFAULT_MFA_CONFIG, ...config };
  }

  async generateSecret(data: GenerateSecretData): Promise<SecretResult> {
    // Generate a random secret (20 bytes = 160 bits, base32 encoded)
    const secretBuffer = crypto.randomBytes(20);
    const secret = this.base32Encode(secretBuffer);

    // Build the otpauth URL for QR code
    const issuer = encodeURIComponent(data.issuer || this.config.issuer);
    const accountName = encodeURIComponent(data.userEmail);
    const otpauthUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=${this.config.totpAlgorithm}&digits=${this.config.totpDigits}&period=${this.config.totpPeriod}`;

    // Generate QR code
    const qrCodeDataUrl = await this.generateQrCode(otpauthUrl);

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    };
  }

  async verifyToken(data: VerifyTokenData): Promise<boolean> {
    const { secret, token, window = this.config.totpWindow } = data;

    // Validate token format
    if (!/^\d{6,8}$/.test(token)) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeStep = this.config.totpPeriod;

    // Check tokens within the time window
    for (let i = -window; i <= window; i++) {
      const counter = Math.floor((now + i * timeStep) / timeStep);
      const expectedToken = this.generateTOTP(secret, counter);

      if (this.timingSafeEqual(token, expectedToken)) {
        return true;
      }
    }

    return false;
  }

  async generateQrCode(otpauthUrl: string): Promise<string> {
    // Simple QR code generation using a public API
    // For production, use a library like 'qrcode' to generate locally
    // This is a placeholder that returns a data URL format

    // Using qrcode library would be:
    // const QRCode = require('qrcode');
    // return await QRCode.toDataURL(otpauthUrl);

    // For now, return a placeholder that indicates QR should be generated client-side
    // or use a server-side library
    return `qr:${Buffer.from(otpauthUrl).toString('base64')}`;
  }

  async generateBackupCodes(data?: GenerateBackupCodesData): Promise<BackupCodesResult> {
    const count = data?.count || this.config.backupCodeCount;
    const length = data?.length || this.config.backupCodeLength;

    const codes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      // Generate random alphanumeric code (no ambiguous characters)
      const code = this.generateRandomCode(length);
      codes.push(code);
      hashedCodes.push(await this.hashBackupCode(code));
    }

    return { codes, hashedCodes };
  }

  async verifyBackupCode(data: VerifyBackupCodeData): Promise<BackupCodeVerificationResult> {
    const { code, hashedCodes } = data;
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

    for (const hashedCode of hashedCodes) {
      const isValid = await bcrypt.compare(normalizedCode, hashedCode);
      if (isValid) {
        return {
          valid: true,
          usedCodeHash: hashedCode,
          remainingCodes: hashedCodes.length - 1,
        };
      }
    }

    return {
      valid: false,
      remainingCodes: hashedCodes.length,
    };
  }

  async hashBackupCode(code: string): Promise<string> {
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return bcrypt.hash(normalizedCode, 10);
  }

  // ============ PRIVATE HELPERS ============

  private generateTOTP(secret: string, counter: number): string {
    const secretBuffer = this.base32Decode(secret);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac(
      this.config.totpAlgorithm.toLowerCase(),
      secretBuffer,
    );
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    // Dynamic truncation
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, this.config.totpDigits);
    return otp.toString().padStart(this.config.totpDigits, '0');
  }

  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }

  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanedInput = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');

    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (const char of cleanedInput) {
      const index = alphabet.indexOf(char);
      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return crypto.timingSafeEqual(bufA, bufB);
  }

  private generateRandomCode(length: number): string {
    // Use unambiguous characters (no 0/O, 1/I/L)
    const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      code += charset[randomIndex];
    }

    // Format as XXXX-XXXX for readability
    if (length === 8) {
      return `${code.slice(0, 4)}-${code.slice(4)}`;
    }

    return code;
  }
}
