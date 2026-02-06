/**
 * MFA (Multi-Factor Authentication) Service Interface
 *
 * Provider-agnostic interface for MFA/2FA operations.
 * Implement this interface for any MFA method (TOTP, SMS, Email OTP, etc.)
 *
 * To add a new provider:
 * 1. Create a new file: totp.mfa.ts, twilio-sms.mfa.ts, etc.
 * 2. Implement the MfaService interface
 * 3. Register it in the MfaModule with the MFA_SERVICE token
 */

export interface GenerateSecretData {
  userId: string;
  userEmail: string;
  issuer?: string; // App name shown in authenticator apps
}

export interface SecretResult {
  secret: string; // The raw secret (to be encrypted before storing)
  otpauthUrl: string; // URL for QR code generation
  qrCodeDataUrl?: string; // Base64 QR code image (if generated)
}

export interface VerifyTokenData {
  secret: string; // Decrypted secret
  token: string; // User-provided OTP code
  window?: number; // Time window tolerance (default: 1)
}

export interface GenerateBackupCodesData {
  count?: number; // Number of codes to generate (default: 10)
  length?: number; // Length of each code (default: 8)
}

export interface BackupCodesResult {
  codes: string[]; // Plain text codes (hash before storing)
  hashedCodes: string[]; // Hashed codes for storage
}

export interface VerifyBackupCodeData {
  code: string; // User-provided backup code
  hashedCodes: string[]; // Stored hashed codes
}

export interface BackupCodeVerificationResult {
  valid: boolean;
  usedCodeHash?: string; // The hash of the used code (to mark as used)
  remainingCodes: number;
}

/**
 * MFA Service Interface
 *
 * All MFA providers must implement this interface.
 * The implementation handles provider-specific logic internally.
 */
export interface MfaService {
  /**
   * Provider/method identifier (e.g., 'totp', 'sms', 'email')
   */
  readonly providerName: string;

  /**
   * Generate a new MFA secret for a user
   * Returns the secret and QR code URL for authenticator apps
   */
  generateSecret(data: GenerateSecretData): Promise<SecretResult>;

  /**
   * Verify a TOTP/OTP token against a secret
   */
  verifyToken(data: VerifyTokenData): Promise<boolean>;

  /**
   * Generate a QR code data URL from an otpauth URL
   */
  generateQrCode(otpauthUrl: string): Promise<string>;

  /**
   * Generate backup codes for account recovery
   */
  generateBackupCodes(data?: GenerateBackupCodesData): Promise<BackupCodesResult>;

  /**
   * Verify a backup code against stored hashed codes
   */
  verifyBackupCode(data: VerifyBackupCodeData): Promise<BackupCodeVerificationResult>;

  /**
   * Hash a backup code for storage
   */
  hashBackupCode(code: string): Promise<string>;
}

/**
 * Injection token for the MFA service
 */
export const MFA_SERVICE = Symbol('MFA_SERVICE');

// ============ MFA CONFIGURATION ============

export interface MfaConfig {
  // TOTP settings
  totpWindow: number; // Time window tolerance (default: 1 = 30 seconds before/after)
  totpAlgorithm: 'SHA1' | 'SHA256' | 'SHA512';
  totpDigits: 6 | 8;
  totpPeriod: number; // Seconds per token (default: 30)

  // Backup codes settings
  backupCodeCount: number;
  backupCodeLength: number;

  // Issuer name (shown in authenticator apps)
  issuer: string;
}

export const DEFAULT_MFA_CONFIG: MfaConfig = {
  totpWindow: 1,
  totpAlgorithm: 'SHA1',
  totpDigits: 6,
  totpPeriod: 30,
  backupCodeCount: 10,
  backupCodeLength: 8,
  issuer: 'FIS Learn',
};
