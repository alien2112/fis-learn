import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ChangePasswordDto,
  VerifyMfaLoginDto,
} from './dto';
import { Public, CurrentUser } from '@/common/decorators';
import { AuthUser, TokenResponse } from './types/jwt-payload.interface';

@ApiTags('Authentication')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  private readonly isProduction: boolean;

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private setAuthCookies(res: Response, tokens: TokenResponse) {
    // Force secure=false and sameSite=lax for IP-based HTTP access
    const isSecure = false;
    const sameSiteMode = 'lax';
    // 10 years in ms (tokens configured to not expire)
    const maxAgeMs = 10 * 365.25 * 24 * 60 * 60 * 1000;

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: sameSiteMode,
      maxAge: maxAgeMs,
      path: '/',
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: sameSiteMode,
      maxAge: maxAgeMs,
      path: '/api/v1/auth', // Only sent to auth endpoints
    });
    // CSRF double-submit cookie (readable by JS, NOT httpOnly)
    res.cookie('csrf-token', randomBytes(32).toString('hex'), {
      httpOnly: false,
      secure: isSecure,
      sameSite: sameSiteMode,
      maxAge: maxAgeMs,
      path: '/',
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.clearCookie('csrf-token', { path: '/' });
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    // If MFA is required, no tokens to set yet
    if ('mfaRequired' in result) {
      return result;
    }

    this.setAuthCookies(res, result.tokens);
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Accept refresh token from cookie if not in body
    const refreshTokenValue = dto.refreshToken || req.cookies?.refreshToken;
    const tokens = await this.authService.refreshToken({ refreshToken: refreshTokenValue });
    this.setAuthCookies(res, tokens);
    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenValue = dto.refreshToken || req.cookies?.refreshToken;
    const result = await this.authService.logout(refreshTokenValue);
    this.clearAuthCookies(res);
    return result;
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA code and complete login' })
  @ApiResponse({ status: 200, description: 'Login successful after MFA verification' })
  @ApiResponse({ status: 401, description: 'Invalid MFA code or token' })
  async verifyMfaLogin(
    @Body() dto: VerifyMfaLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyMfaLogin(dto.mfaPendingToken, dto.code);
    this.setAuthCookies(res, result.tokens);
    return result;
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for logged in user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    this.clearAuthCookies(res);
    return result;
  }
}
