import { IsString, Length, Matches } from 'class-validator';

export class EnableMfaDto {
  // No body needed - initiates MFA setup
}

export class VerifyMfaSetupDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

export class VerifyMfaDto {
  @IsString()
  @Matches(/^(\d{6}|[A-Z0-9]{4}-[A-Z0-9]{4})$/, {
    message: 'Code must be 6 digits or a backup code (XXXX-XXXX)',
  })
  code: string;
}

export class DisableMfaDto {
  @IsString()
  password: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

// Response DTOs
export class MfaSetupResponseDto {
  qrCodeDataUrl: string;
  secret: string; // Only shown once during setup
  manualEntryKey: string;
}

export class MfaStatusResponseDto {
  enabled: boolean;
  method: string | null;
  backupCodesRemaining: number;
}

export class BackupCodesResponseDto {
  codes: string[];
  message: string;
}
