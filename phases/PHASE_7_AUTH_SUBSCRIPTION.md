# Phase 7: Authentication & Subscription Access Control

## Executive Summary

This phase defines the authentication system, authorization framework, and subscription-based access control that secures all platform features including the Code Runner IDE and Community Chat system.

---

## 1. Authentication

### 1.1 Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  USER                                                                           │
│    │                                                                             │
│    │  Login Request (email/password OR OAuth)                                   │
│    ▼                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                      AUTHENTICATION SERVICE                              │    │
│  │                                                                          │    │
│  │   ┌────────────────────────────────────────────────────────────────┐    │    │
│  │   │                    AUTH PROVIDERS                               │    │    │
│  │   │                                                                 │    │    │
│  │   │   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │    │    │
│  │   │   │  Email/  │   │  Google  │   │  GitHub  │   │  Apple   │  │    │    │
│  │   │   │ Password │   │  OAuth   │   │  OAuth   │   │  OAuth   │  │    │    │
│  │   │   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘  │    │    │
│  │   │        │              │              │              │         │    │    │
│  │   │        └──────────────┴──────────────┴──────────────┘         │    │    │
│  │   │                              │                                 │    │    │
│  │   └──────────────────────────────┼─────────────────────────────────┘    │    │
│  │                                  │                                       │    │
│  │                                  ▼                                       │    │
│  │   ┌────────────────────────────────────────────────────────────────┐    │    │
│  │   │                  IDENTITY VERIFICATION                          │    │    │
│  │   │                                                                 │    │    │
│  │   │   • Validate credentials                                       │    │    │
│  │   │   • Check account status (active, suspended, etc.)             │    │    │
│  │   │   • Verify email if required                                   │    │    │
│  │   │   • Check MFA if enabled                                       │    │    │
│  │   │                                                                 │    │    │
│  │   └──────────────────────────────┬─────────────────────────────────┘    │    │
│  │                                  │                                       │    │
│  │                                  ▼                                       │    │
│  │   ┌────────────────────────────────────────────────────────────────┐    │    │
│  │   │                    TOKEN GENERATION                             │    │    │
│  │   │                                                                 │    │    │
│  │   │   ┌─────────────────┐        ┌─────────────────┐               │    │    │
│  │   │   │  Access Token   │        │  Refresh Token  │               │    │    │
│  │   │   │  (JWT, 15min)   │        │  (Opaque, 7d)   │               │    │    │
│  │   │   └─────────────────┘        └─────────────────┘               │    │    │
│  │   │                                                                 │    │    │
│  │   └────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                  │                                              │
│                                  ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         TOKEN STORAGE                                    │   │
│  │                                                                          │   │
│  │   Access Token:  Memory / httpOnly cookie (same-site)                   │   │
│  │   Refresh Token: httpOnly cookie (secure, same-site)                    │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Auth Provider Selection

| Provider | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Auth0** | Feature-rich, great docs, social logins | Cost at scale | **Recommended for MVP** |
| **AWS Cognito** | AWS integration, cost-effective | Less flexible | Good for AWS-heavy stack |
| **Keycloak** | Open source, self-hosted | Ops overhead | For full control |
| **Custom** | Full control | Development time | Not recommended initially |

**Recommendation: Auth0 for initial launch, evaluate migration path for scale**

### 1.3 JWT Structure and Claims

```typescript
// Access Token Claims
interface AccessTokenPayload {
  // Standard claims
  iss: string;           // Issuer (e.g., "https://auth.platform.com")
  sub: string;           // Subject (user ID)
  aud: string[];         // Audience (allowed APIs)
  exp: number;           // Expiration time
  iat: number;           // Issued at
  jti: string;           // JWT ID (for revocation)

  // Custom claims
  email: string;
  email_verified: boolean;
  role: UserRole;
  subscription: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    expiresAt: string;
  };
  permissions: string[];
  metadata: {
    displayName: string;
    avatarUrl?: string;
  };
}

// Example token payload
const exampleToken: AccessTokenPayload = {
  iss: "https://auth.fislearn.com",
  sub: "user_abc123",
  aud: ["api.fislearn.com", "ws.fislearn.com"],
  exp: 1705312800,
  iat: 1705311900,
  jti: "token_xyz789",

  email: "student@example.com",
  email_verified: true,
  role: "subscriber",
  subscription: {
    tier: "pro",
    status: "active",
    expiresAt: "2024-12-31T23:59:59Z"
  },
  permissions: [
    "code:execute",
    "chat:send",
    "chat:dm",
    "files:upload"
  ],
  metadata: {
    displayName: "John Student",
    avatarUrl: "https://cdn.fislearn.com/avatars/abc123.jpg"
  }
};
```

### 1.4 Token Refresh Strategy

```typescript
// Token refresh flow
class TokenService {
  private readonly ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly REFRESH_THRESHOLD = 5 * 60; // 5 minutes before expiry

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // 1. Validate refresh token
    const storedToken = await this.redis.get(`refresh:${refreshToken}`);
    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const tokenData = JSON.parse(storedToken);

    // 2. Check if token is expired
    if (Date.now() > tokenData.expiresAt) {
      await this.redis.del(`refresh:${refreshToken}`);
      throw new UnauthorizedError('Refresh token expired');
    }

    // 3. Check if user is still valid
    const user = await this.userService.getById(tokenData.userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('User account is not active');
    }

    // 4. Get current subscription status
    const subscription = await this.subscriptionService.getStatus(user.id);

    // 5. Generate new tokens
    const newAccessToken = this.generateAccessToken(user, subscription);
    const newRefreshToken = this.generateRefreshToken();

    // 6. Rotate refresh token (invalidate old, store new)
    await this.redis.del(`refresh:${refreshToken}`);
    await this.redis.setex(
      `refresh:${newRefreshToken}`,
      this.REFRESH_TOKEN_TTL,
      JSON.stringify({
        userId: user.id,
        expiresAt: Date.now() + this.REFRESH_TOKEN_TTL * 1000,
        createdAt: Date.now(),
      })
    );

    // 7. Track refresh for security monitoring
    await this.auditLog.log({
      action: 'auth.token_refresh',
      actorId: user.id,
      metadata: {
        oldTokenId: tokenData.tokenId,
        newTokenId: newRefreshToken.slice(0, 8),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.ACCESS_TOKEN_TTL,
    };
  }

  private generateAccessToken(user: User, subscription: Subscription): string {
    const payload: AccessTokenPayload = {
      iss: process.env.JWT_ISSUER,
      sub: user.id,
      aud: [process.env.API_AUDIENCE],
      exp: Math.floor(Date.now() / 1000) + this.ACCESS_TOKEN_TTL,
      iat: Math.floor(Date.now() / 1000),
      jti: generateUUID(),

      email: user.email,
      email_verified: user.emailVerified,
      role: user.role,
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        expiresAt: subscription.expiresAt?.toISOString(),
      },
      permissions: this.getPermissions(user.role, subscription.tier),
      metadata: {
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: 'RS256',
    });
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Client-side token management
class ClientTokenManager {
  private refreshPromise: Promise<TokenPair> | null = null;

  async getAccessToken(): Promise<string> {
    const token = this.getStoredAccessToken();

    if (!token) {
      throw new Error('No access token');
    }

    // Check if token needs refresh
    const payload = this.decodeToken(token);
    const expiresIn = payload.exp * 1000 - Date.now();

    if (expiresIn < 5 * 60 * 1000) { // Less than 5 minutes
      // Refresh in background, return current token
      this.refreshInBackground();
    }

    if (expiresIn < 0) {
      // Token expired, must refresh
      return this.refresh();
    }

    return token;
  }

  private async refreshInBackground(): Promise<void> {
    if (this.refreshPromise) return;

    this.refreshPromise = this.refresh()
      .finally(() => {
        this.refreshPromise = null;
      });
  }

  private async refresh(): Promise<string> {
    if (this.refreshPromise) {
      const result = await this.refreshPromise;
      return result.accessToken;
    }

    this.refreshPromise = api.post('/auth/refresh', {
      refreshToken: this.getStoredRefreshToken(),
    });

    try {
      const tokens = await this.refreshPromise;
      this.storeTokens(tokens);
      return tokens.accessToken;
    } finally {
      this.refreshPromise = null;
    }
  }
}
```

### 1.5 Session Management

```typescript
// Session tracking for security
class SessionManager {
  async createSession(userId: string, metadata: SessionMetadata): Promise<Session> {
    const sessionId = generateUUID();

    const session: Session = {
      id: sessionId,
      userId,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        device: this.parseDevice(metadata.userAgent),
        location: await this.geolocate(metadata.ipAddress),
      },
    };

    // Store session
    await this.redis.setex(
      `session:${sessionId}`,
      7 * 24 * 60 * 60,
      JSON.stringify(session)
    );

    // Track user's sessions
    await this.redis.sadd(`user:${userId}:sessions`, sessionId);

    return session;
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);

    const sessions: Session[] = [];
    for (const sessionId of sessionIds) {
      const sessionData = await this.redis.get(`session:${sessionId}`);
      if (sessionData) {
        sessions.push(JSON.parse(sessionData));
      } else {
        // Clean up stale reference
        await this.redis.srem(`user:${userId}:sessions`, sessionId);
      }
    }

    return sessions.sort((a, b) =>
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    );
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    // Verify session belongs to user
    const isMember = await this.redis.sismember(`user:${userId}:sessions`, sessionId);
    if (!isMember) {
      throw new NotFoundError('Session not found');
    }

    // Delete session
    await this.redis.del(`session:${sessionId}`);
    await this.redis.srem(`user:${userId}:sessions`, sessionId);

    // Invalidate associated refresh tokens
    const refreshTokens = await this.redis.smembers(`session:${sessionId}:tokens`);
    for (const token of refreshTokens) {
      await this.redis.del(`refresh:${token}`);
    }

    // Audit log
    await this.auditLog.log({
      action: 'auth.session_revoked',
      actorId: userId,
      metadata: { sessionId },
    });
  }

  async revokeAllSessions(userId: string, exceptCurrent?: string): Promise<number> {
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);

    let revokedCount = 0;
    for (const sessionId of sessionIds) {
      if (sessionId !== exceptCurrent) {
        await this.revokeSession(userId, sessionId);
        revokedCount++;
      }
    }

    return revokedCount;
  }

  // Called on password change
  async invalidateAllSessionsOnPasswordChange(userId: string): Promise<void> {
    await this.revokeAllSessions(userId);

    // Also invalidate all refresh tokens
    const pattern = `refresh:*`;
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const tokenData = JSON.parse(data);
        if (tokenData.userId === userId) {
          await this.redis.del(key);
        }
      }
    }
  }
}
```

### 1.6 MFA Implementation

```typescript
// Multi-factor authentication
class MFAService {
  private readonly TOTP_WINDOW = 1; // Allow 1 step before/after

  async enableMFA(userId: string): Promise<MFASetupResponse> {
    // Generate secret
    const secret = authenticator.generateSecret();

    // Store pending setup (not active yet)
    await this.redis.setex(
      `mfa:setup:${userId}`,
      600, // 10 minutes to complete setup
      JSON.stringify({ secret, createdAt: Date.now() })
    );

    // Generate QR code URL
    const user = await this.userService.getById(userId);
    const otpauthUrl = authenticator.keyuri(
      user.email,
      'FIS Learn',
      secret
    );

    return {
      secret,
      qrCodeUrl: await this.generateQRCode(otpauthUrl),
      manualEntryKey: secret,
    };
  }

  async verifyAndActivateMFA(userId: string, code: string): Promise<string[]> {
    // Get pending setup
    const setupData = await this.redis.get(`mfa:setup:${userId}`);
    if (!setupData) {
      throw new BadRequestError('MFA setup not initiated or expired');
    }

    const { secret } = JSON.parse(setupData);

    // Verify code
    const isValid = authenticator.verify({
      token: code,
      secret,
    });

    if (!isValid) {
      throw new BadRequestError('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Activate MFA
    await this.db.users.update(userId, {
      mfaEnabled: true,
      mfaSecret: this.encrypt(secret),
      mfaBackupCodes: backupCodes.map(c => this.hashBackupCode(c)),
    });

    // Clean up setup
    await this.redis.del(`mfa:setup:${userId}`);

    // Audit log
    await this.auditLog.log({
      action: 'auth.mfa_enabled',
      actorId: userId,
    });

    return backupCodes;
  }

  async verifyMFA(userId: string, code: string): Promise<boolean> {
    const user = await this.userService.getById(userId);

    if (!user.mfaEnabled) {
      return true; // MFA not enabled, skip
    }

    // Check if it's a backup code
    if (code.length === 8) {
      return this.verifyBackupCode(userId, code);
    }

    // Verify TOTP
    const secret = this.decrypt(user.mfaSecret);
    const isValid = authenticator.verify({
      token: code,
      secret,
    });

    if (!isValid) {
      // Track failed attempts
      await this.trackFailedAttempt(userId);
      return false;
    }

    return true;
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.userService.getById(userId);
    const hashedCode = this.hashBackupCode(code);

    const index = user.mfaBackupCodes.indexOf(hashedCode);
    if (index === -1) {
      return false;
    }

    // Remove used backup code
    const updatedCodes = [...user.mfaBackupCodes];
    updatedCodes.splice(index, 1);

    await this.db.users.update(userId, {
      mfaBackupCodes: updatedCodes,
    });

    // Audit log
    await this.auditLog.log({
      action: 'auth.mfa_backup_code_used',
      actorId: userId,
      metadata: { remainingCodes: updatedCodes.length },
    });

    return true;
  }
}
```

---

## 2. Authorization

### 2.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ROLE HIERARCHY                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                           ┌─────────────────┐                                   │
│                           │  PLATFORM ADMIN │                                   │
│                           │                 │                                   │
│                           │  • Full access  │                                   │
│                           │  • User mgmt    │                                   │
│                           │  • System config│                                   │
│                           └────────┬────────┘                                   │
│                                    │                                            │
│                    ┌───────────────┴───────────────┐                           │
│                    │                               │                           │
│                    ▼                               ▼                           │
│           ┌─────────────────┐           ┌─────────────────┐                    │
│           │   INSTRUCTOR    │           │    MODERATOR    │                    │
│           │                 │           │    (Global)     │                    │
│           │  • Create cours │           │                 │                    │
│           │  • Manage own   │           │  • Moderate all │                    │
│           │    channels     │           │    channels     │                    │
│           │  • Grade/assess │           │  • User actions │                    │
│           └────────┬────────┘           └─────────────────┘                    │
│                    │                                                            │
│                    ▼                                                            │
│           ┌─────────────────┐                                                   │
│           │   SUBSCRIBER    │                                                   │
│           │                 │                                                   │
│           │  • Full feature │◄─────── Subscription Required                    │
│           │    access       │                                                   │
│           │  • IDE access   │                                                   │
│           │  • Chat access  │                                                   │
│           │  • DM access    │                                                   │
│           └────────┬────────┘                                                   │
│                    │                                                            │
│                    ▼                                                            │
│           ┌─────────────────┐                                                   │
│           │    FREE USER    │                                                   │
│           │                 │                                                   │
│           │  • Limited IDE  │                                                   │
│           │  • Read chat    │                                                   │
│           │  • No DMs       │                                                   │
│           │  • No files     │                                                   │
│           └─────────────────┘                                                   │
│                                                                                  │
│  SUBSCRIPTION TIERS:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   FREE        BASIC           PRO            ENTERPRISE                 │   │
│  │   ────        ─────           ───            ──────────                 │   │
│  │   $0/mo       $19/mo          $49/mo         Custom                     │   │
│  │                                                                          │   │
│  │   • 5 runs    • 100 runs      • Unlimited    • Unlimited                │   │
│  │     /day        /day            runs           runs                      │   │
│  │   • No chat   • Chat access   • Chat access  • Chat access              │   │
│  │   • No DMs    • DMs           • DMs          • DMs                      │   │
│  │   • No files  • 100MB files   • 1GB files    • 10GB files               │   │
│  │              • Basic support  • Priority     • Dedicated                │   │
│  │                                 support        support                   │   │
│  │                               • API access   • API access               │   │
│  │                                              • SSO/SAML                 │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Permission Model (RBAC + ABAC)

```typescript
// Combined RBAC + ABAC permission model
enum Permission {
  // Code Runner permissions
  CODE_EXECUTE = 'code:execute',
  CODE_EXECUTE_UNLIMITED = 'code:execute:unlimited',
  CODE_LANGUAGES_ALL = 'code:languages:all',

  // Chat permissions
  CHAT_READ = 'chat:read',
  CHAT_SEND = 'chat:send',
  CHAT_DM = 'chat:dm',
  CHAT_FILES = 'chat:files',
  CHAT_MODERATE = 'chat:moderate',

  // Course permissions
  COURSE_VIEW = 'course:view',
  COURSE_CREATE = 'course:create',
  COURSE_MANAGE = 'course:manage',

  // Admin permissions
  ADMIN_USERS = 'admin:users',
  ADMIN_SETTINGS = 'admin:settings',
  ADMIN_BILLING = 'admin:billing',
}

// Role-based permissions
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: Object.values(Permission),

  instructor: [
    Permission.CODE_EXECUTE,
    Permission.CODE_EXECUTE_UNLIMITED,
    Permission.CODE_LANGUAGES_ALL,
    Permission.CHAT_READ,
    Permission.CHAT_SEND,
    Permission.CHAT_DM,
    Permission.CHAT_FILES,
    Permission.CHAT_MODERATE,
    Permission.COURSE_VIEW,
    Permission.COURSE_CREATE,
    Permission.COURSE_MANAGE,
  ],

  moderator: [
    Permission.CODE_EXECUTE,
    Permission.CHAT_READ,
    Permission.CHAT_SEND,
    Permission.CHAT_DM,
    Permission.CHAT_FILES,
    Permission.CHAT_MODERATE,
    Permission.COURSE_VIEW,
  ],

  subscriber: [
    Permission.CODE_EXECUTE,
    Permission.CHAT_READ,
    Permission.CHAT_SEND,
    Permission.CHAT_DM,
    Permission.CHAT_FILES,
    Permission.COURSE_VIEW,
  ],

  free_user: [
    Permission.CODE_EXECUTE, // Limited by subscription
    Permission.CHAT_READ,
    Permission.COURSE_VIEW, // Free courses only
  ],
};

// Subscription-based permission modifiers
const SUBSCRIPTION_PERMISSIONS: Record<SubscriptionTier, PermissionModifier[]> = {
  free: [
    { permission: Permission.CODE_EXECUTE, limit: 5, period: 'day' },
    { permission: Permission.CHAT_SEND, enabled: false },
  ],

  basic: [
    { permission: Permission.CODE_EXECUTE, limit: 100, period: 'day' },
    { permission: Permission.CHAT_FILES, maxSize: 10 * 1024 * 1024 }, // 10MB
  ],

  pro: [
    { permission: Permission.CODE_EXECUTE, limit: null }, // Unlimited
    { permission: Permission.CODE_EXECUTE_UNLIMITED, enabled: true },
    { permission: Permission.CHAT_FILES, maxSize: 100 * 1024 * 1024 }, // 100MB
  ],

  enterprise: [
    { permission: Permission.CODE_EXECUTE, limit: null },
    { permission: Permission.CODE_EXECUTE_UNLIMITED, enabled: true },
    { permission: Permission.CODE_LANGUAGES_ALL, enabled: true },
    { permission: Permission.CHAT_FILES, maxSize: 500 * 1024 * 1024 }, // 500MB
  ],
};

// Authorization service
class AuthorizationService {
  async checkPermission(
    userId: string,
    permission: Permission,
    context?: PermissionContext
  ): Promise<AuthorizationResult> {
    // 1. Get user with role and subscription
    const user = await this.userService.getWithSubscription(userId);

    // 2. Check role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    if (!rolePermissions.includes(permission)) {
      return {
        allowed: false,
        reason: 'Permission not granted for role',
      };
    }

    // 3. Check subscription-based modifiers
    const subscriptionResult = await this.checkSubscriptionPermission(
      user.subscription,
      permission,
      context
    );
    if (!subscriptionResult.allowed) {
      return subscriptionResult;
    }

    // 4. Check resource-specific permissions (ABAC)
    if (context?.resourceId) {
      const resourceResult = await this.checkResourcePermission(
        userId,
        permission,
        context
      );
      if (!resourceResult.allowed) {
        return resourceResult;
      }
    }

    return { allowed: true };
  }

  private async checkSubscriptionPermission(
    subscription: Subscription,
    permission: Permission,
    context?: PermissionContext
  ): Promise<AuthorizationResult> {
    const modifiers = SUBSCRIPTION_PERMISSIONS[subscription.tier] || [];
    const modifier = modifiers.find(m => m.permission === permission);

    if (!modifier) {
      return { allowed: true };
    }

    // Check if permission is disabled for this tier
    if (modifier.enabled === false) {
      return {
        allowed: false,
        reason: 'Feature not available in your subscription',
        upgradeRequired: true,
      };
    }

    // Check rate limits
    if (modifier.limit !== null && modifier.limit !== undefined) {
      const usage = await this.getUsage(
        context?.userId,
        permission,
        modifier.period
      );

      if (usage >= modifier.limit) {
        return {
          allowed: false,
          reason: `Daily limit of ${modifier.limit} reached`,
          upgradeRequired: true,
          resetAt: this.getResetTime(modifier.period),
        };
      }
    }

    // Check size limits
    if (modifier.maxSize && context?.fileSize) {
      if (context.fileSize > modifier.maxSize) {
        return {
          allowed: false,
          reason: `File size exceeds limit of ${modifier.maxSize / 1024 / 1024}MB`,
          upgradeRequired: true,
        };
      }
    }

    return { allowed: true };
  }

  private async checkResourcePermission(
    userId: string,
    permission: Permission,
    context: PermissionContext
  ): Promise<AuthorizationResult> {
    // Check course-specific permissions
    if (context.courseId) {
      const enrollment = await this.enrollmentService.get(userId, context.courseId);

      if (!enrollment) {
        return {
          allowed: false,
          reason: 'Not enrolled in this course',
        };
      }
    }

    // Check channel-specific permissions
    if (context.channelId) {
      const membership = await this.channelService.getMembership(
        userId,
        context.channelId
      );

      if (!membership) {
        return {
          allowed: false,
          reason: 'Not a member of this channel',
        };
      }
    }

    return { allowed: true };
  }
}
```

### 2.3 Subscription Tiers and Feature Flags

```typescript
// Subscription tier configuration
interface SubscriptionTierConfig {
  id: SubscriptionTier;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: FeatureConfig[];
  limits: LimitConfig[];
}

const SUBSCRIPTION_TIERS: SubscriptionTierConfig[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      { key: 'code_execution', enabled: true },
      { key: 'chat_read', enabled: true },
      { key: 'chat_send', enabled: false },
      { key: 'direct_messages', enabled: false },
      { key: 'file_uploads', enabled: false },
      { key: 'api_access', enabled: false },
    ],
    limits: [
      { key: 'executions_per_day', value: 5 },
      { key: 'execution_timeout', value: 10 }, // seconds
      { key: 'execution_memory', value: 128 }, // MB
      { key: 'courses_enrolled', value: 2 },
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 19,
    interval: 'month',
    features: [
      { key: 'code_execution', enabled: true },
      { key: 'chat_read', enabled: true },
      { key: 'chat_send', enabled: true },
      { key: 'direct_messages', enabled: true },
      { key: 'file_uploads', enabled: true },
      { key: 'api_access', enabled: false },
    ],
    limits: [
      { key: 'executions_per_day', value: 100 },
      { key: 'execution_timeout', value: 30 },
      { key: 'execution_memory', value: 256 },
      { key: 'file_storage', value: 100 }, // MB
      { key: 'courses_enrolled', value: 10 },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    interval: 'month',
    features: [
      { key: 'code_execution', enabled: true },
      { key: 'chat_read', enabled: true },
      { key: 'chat_send', enabled: true },
      { key: 'direct_messages', enabled: true },
      { key: 'file_uploads', enabled: true },
      { key: 'api_access', enabled: true },
      { key: 'priority_support', enabled: true },
    ],
    limits: [
      { key: 'executions_per_day', value: -1 }, // Unlimited
      { key: 'execution_timeout', value: 60 },
      { key: 'execution_memory', value: 512 },
      { key: 'file_storage', value: 1024 }, // 1GB
      { key: 'courses_enrolled', value: -1 }, // Unlimited
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0, // Custom pricing
    interval: 'month',
    features: [
      { key: 'code_execution', enabled: true },
      { key: 'chat_read', enabled: true },
      { key: 'chat_send', enabled: true },
      { key: 'direct_messages', enabled: true },
      { key: 'file_uploads', enabled: true },
      { key: 'api_access', enabled: true },
      { key: 'priority_support', enabled: true },
      { key: 'sso_saml', enabled: true },
      { key: 'dedicated_support', enabled: true },
      { key: 'custom_branding', enabled: true },
    ],
    limits: [
      { key: 'executions_per_day', value: -1 },
      { key: 'execution_timeout', value: 120 },
      { key: 'execution_memory', value: 1024 },
      { key: 'file_storage', value: 10240 }, // 10GB
      { key: 'courses_enrolled', value: -1 },
      { key: 'team_members', value: -1 },
    ],
  },
];

// Feature flag service
class FeatureFlagService {
  async isEnabled(userId: string, featureKey: string): Promise<boolean> {
    const user = await this.userService.getWithSubscription(userId);
    const tierConfig = SUBSCRIPTION_TIERS.find(t => t.id === user.subscription.tier);

    if (!tierConfig) {
      return false;
    }

    const feature = tierConfig.features.find(f => f.key === featureKey);
    return feature?.enabled ?? false;
  }

  async getLimit(userId: string, limitKey: string): Promise<number> {
    const user = await this.userService.getWithSubscription(userId);
    const tierConfig = SUBSCRIPTION_TIERS.find(t => t.id === user.subscription.tier);

    if (!tierConfig) {
      return 0;
    }

    const limit = tierConfig.limits.find(l => l.key === limitKey);
    return limit?.value ?? 0;
  }

  async checkLimit(userId: string, limitKey: string): Promise<LimitCheckResult> {
    const limit = await this.getLimit(userId, limitKey);

    if (limit === -1) {
      return { allowed: true, unlimited: true };
    }

    const usage = await this.usageService.getUsage(userId, limitKey);

    return {
      allowed: usage < limit,
      unlimited: false,
      current: usage,
      limit,
      remaining: Math.max(0, limit - usage),
    };
  }
}
```

---

## 3. Entitlement Verification

### 3.1 Verification Points

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      ENTITLEMENT VERIFICATION POINTS                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          FRONTEND LAYER                                  │   │
│  │                                                                          │   │
│  │   Purpose: UX optimization (hide unavailable features)                  │   │
│  │   NOT for security - easily bypassed                                    │   │
│  │                                                                          │   │
│  │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │   │
│  │   │  Route Guards  │  │  UI Feature    │  │  Button        │           │   │
│  │   │                │  │  Flags         │  │  Disabling     │           │   │
│  │   │  • Redirect if │  │                │  │                │           │   │
│  │   │    no access   │  │  • Show/hide   │  │  • Disable +   │           │   │
│  │   │  • Show upgrade│  │    features    │  │    upgrade CTA │           │   │
│  │   │    prompt      │  │  • Limit       │  │                │           │   │
│  │   │                │  │    indicators  │  │                │           │   │
│  │   └────────────────┘  └────────────────┘  └────────────────┘           │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          API GATEWAY LAYER                               │   │
│  │                                                                          │   │
│  │   Purpose: First line of defense - fast rejection                       │   │
│  │                                                                          │   │
│  │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │   │
│  │   │  JWT Validation│  │  Subscription  │  │  Rate Limiting │           │   │
│  │   │                │  │  Check (claims)│  │                │           │   │
│  │   │  • Signature   │  │                │  │  • Per-user    │           │   │
│  │   │  • Expiration  │  │  • Active sub? │  │  • Per-tier    │           │   │
│  │   │  • Audience    │  │  • Tier check  │  │  • Per-endpoint│           │   │
│  │   │                │  │                │  │                │           │   │
│  │   └────────────────┘  └────────────────┘  └────────────────┘           │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          BACKEND SERVICE LAYER                           │   │
│  │                                                                          │   │
│  │   Purpose: Authoritative checks - source of truth                       │   │
│  │                                                                          │   │
│  │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │   │
│  │   │  Permission    │  │  Database      │  │  Usage         │           │   │
│  │   │  Service       │  │  Lookup        │  │  Tracking      │           │   │
│  │   │                │  │                │  │                │           │   │
│  │   │  • RBAC check  │  │  • Fresh sub   │  │  • Increment   │           │   │
│  │   │  • ABAC check  │  │    status      │  │    counters    │           │   │
│  │   │  • Context     │  │  • Real-time   │  │  • Check       │           │   │
│  │   │    validation  │  │    entitlement │  │    limits      │           │   │
│  │   └────────────────┘  └────────────────┘  └────────────────┘           │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         WEBSOCKET LAYER                                  │   │
│  │                                                                          │   │
│  │   Purpose: Real-time access control                                     │   │
│  │                                                                          │   │
│  │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │   │
│  │   │  Connection    │  │  Message-time  │  │  Subscription  │           │   │
│  │   │  Auth          │  │  Checks        │  │  Events        │           │   │
│  │   │                │  │                │  │                │           │   │
│  │   │  • Validate    │  │  • Each action │  │  • Upgrade:    │           │   │
│  │   │    on connect  │  │    verified    │  │    unlock      │           │   │
│  │   │  • Periodic    │  │  • Channel     │  │  • Downgrade:  │           │   │
│  │   │    revalidation│  │    membership  │  │    restrict    │           │   │
│  │   │                │  │                │  │  • Expired:    │           │   │
│  │   │                │  │                │  │    disconnect  │           │   │
│  │   └────────────────┘  └────────────────┘  └────────────────┘           │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       CODE RUNNER LAYER                                  │   │
│  │                                                                          │   │
│  │   Purpose: Pre-execution validation                                     │   │
│  │                                                                          │   │
│  │   ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │   │  Before Each Execution:                                          │   │   │
│  │   │                                                                  │   │   │
│  │   │  1. Verify user has CODE_EXECUTE permission                     │   │   │
│  │   │  2. Check daily execution limit not exceeded                    │   │   │
│  │   │  3. Verify language is allowed for tier                         │   │   │
│  │   │  4. Apply tier-specific resource limits                         │   │   │
│  │   │  5. Track execution for billing/usage                           │   │   │
│  │   │                                                                  │   │   │
│  │   └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Frontend Entitlement Checks

```typescript
// React hooks for entitlement checking
function useEntitlements() {
  const { user } = useAuth();

  const hasFeature = useCallback((feature: string): boolean => {
    if (!user?.subscription) return false;
    return user.subscription.features.includes(feature);
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
  }, [user]);

  const getLimit = useCallback((limitKey: string): number => {
    if (!user?.subscription?.limits) return 0;
    return user.subscription.limits[limitKey] ?? 0;
  }, [user]);

  const checkLimit = useCallback(async (limitKey: string): Promise<LimitStatus> => {
    const response = await api.get(`/entitlements/limits/${limitKey}`);
    return response.data;
  }, []);

  return {
    hasFeature,
    hasPermission,
    getLimit,
    checkLimit,
    subscription: user?.subscription,
    role: user?.role,
  };
}

// Route guard component
function ProtectedRoute({
  children,
  requiredFeature,
  requiredPermission,
  requiredTier,
  fallback,
}: ProtectedRouteProps) {
  const { hasFeature, hasPermission, subscription } = useEntitlements();
  const navigate = useNavigate();

  // Check feature access
  if (requiredFeature && !hasFeature(requiredFeature)) {
    if (fallback) return fallback;
    return <UpgradePrompt feature={requiredFeature} />;
  }

  // Check permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDenied />;
  }

  // Check tier
  if (requiredTier) {
    const tierOrder = ['free', 'basic', 'pro', 'enterprise'];
    const currentTierIndex = tierOrder.indexOf(subscription?.tier || 'free');
    const requiredTierIndex = tierOrder.indexOf(requiredTier);

    if (currentTierIndex < requiredTierIndex) {
      return <UpgradePrompt requiredTier={requiredTier} />;
    }
  }

  return children;
}

// Usage example
function CodeRunnerPage() {
  return (
    <ProtectedRoute
      requiredFeature="code_execution"
      requiredPermission="code:execute"
    >
      <CodeRunner />
    </ProtectedRoute>
  );
}

// Feature flag component
function FeatureGate({
  feature,
  children,
  fallback,
}: FeatureGateProps) {
  const { hasFeature } = useEntitlements();

  if (!hasFeature(feature)) {
    return fallback || null;
  }

  return children;
}

// Usage
function ChatInterface() {
  return (
    <div>
      {/* Everyone can see messages */}
      <MessageList />

      {/* Only subscribers can send */}
      <FeatureGate
        feature="chat_send"
        fallback={<UpgradeBanner message="Upgrade to send messages" />}
      >
        <MessageInput />
      </FeatureGate>

      {/* Only with file upload feature */}
      <FeatureGate feature="file_uploads">
        <FileUploadButton />
      </FeatureGate>
    </div>
  );
}
```

### 3.3 Backend Middleware

```typescript
// Express middleware for entitlement checking
function requireSubscription(minTier?: SubscriptionTier) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get fresh subscription status
    const subscription = await subscriptionService.getStatus(user.id);

    if (!subscription || subscription.status !== 'active') {
      return res.status(403).json({
        error: 'Subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        upgradeUrl: '/pricing',
      });
    }

    if (minTier) {
      const tierOrder = ['free', 'basic', 'pro', 'enterprise'];
      const currentTierIndex = tierOrder.indexOf(subscription.tier);
      const requiredTierIndex = tierOrder.indexOf(minTier);

      if (currentTierIndex < requiredTierIndex) {
        return res.status(403).json({
          error: 'Upgrade required',
          code: 'UPGRADE_REQUIRED',
          currentTier: subscription.tier,
          requiredTier: minTier,
          upgradeUrl: '/pricing',
        });
      }
    }

    // Attach subscription to request for downstream use
    req.subscription = subscription;
    next();
  };
}

// Feature-specific middleware
function requireFeature(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    const hasFeature = await featureFlagService.isEnabled(user.id, feature);

    if (!hasFeature) {
      return res.status(403).json({
        error: 'Feature not available',
        code: 'FEATURE_NOT_AVAILABLE',
        feature,
        upgradeUrl: '/pricing',
      });
    }

    next();
  };
}

// Limit checking middleware
function checkLimit(limitKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    const limitCheck = await featureFlagService.checkLimit(user.id, limitKey);

    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: 'Limit exceeded',
        code: 'LIMIT_EXCEEDED',
        limit: limitCheck.limit,
        current: limitCheck.current,
        resetAt: limitCheck.resetAt,
        upgradeUrl: '/pricing',
      });
    }

    // Attach limit info for response headers
    req.limitInfo = limitCheck;
    next();
  };
}

// Usage in routes
router.post(
  '/api/v1/execute',
  authenticate,
  requireSubscription('basic'),
  requireFeature('code_execution'),
  checkLimit('executions_per_day'),
  executeCode
);

router.post(
  '/api/v1/chat/messages',
  authenticate,
  requireSubscription('basic'),
  requireFeature('chat_send'),
  checkLimit('messages_per_minute'),
  sendMessage
);

router.post(
  '/api/v1/upload',
  authenticate,
  requireSubscription('basic'),
  requireFeature('file_uploads'),
  checkLimit('file_storage'),
  uploadFile
);
```

### 3.4 WebSocket Entitlement Checks

```typescript
// WebSocket authentication and entitlement
class WebSocketAuthMiddleware {
  async authenticate(socket: Socket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        throw new Error('No token provided');
      }

      // Verify JWT
      const payload = await this.verifyToken(token);

      // Check subscription status
      const subscription = await this.subscriptionService.getStatus(payload.sub);

      if (!subscription || subscription.status !== 'active') {
        throw new Error('Active subscription required');
      }

      // Check if user has chat access
      if (!subscription.features.includes('chat_read')) {
        throw new Error('Chat access not available');
      }

      // Attach user data to socket
      socket.data.user = {
        id: payload.sub,
        role: payload.role,
        subscription: {
          tier: subscription.tier,
          features: subscription.features,
        },
      };

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  }
}

// Message-time entitlement checks
class ChatHandler {
  async handleSendMessage(socket: Socket, data: SendMessageData) {
    const user = socket.data.user;

    // Check send permission
    if (!user.subscription.features.includes('chat_send')) {
      return socket.emit('error', {
        code: 'FEATURE_NOT_AVAILABLE',
        message: 'Upgrade to send messages',
      });
    }

    // Check rate limit
    const rateLimitKey = `ratelimit:chat:${user.id}`;
    const count = await this.redis.incr(rateLimitKey);
    if (count === 1) {
      await this.redis.expire(rateLimitKey, 60);
    }

    const limit = this.getMessageLimit(user.subscription.tier);
    if (count > limit) {
      return socket.emit('error', {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Message limit of ${limit}/minute exceeded`,
      });
    }

    // Process message
    await this.processMessage(socket, data);
  }

  async handleFileUpload(socket: Socket, data: FileUploadData) {
    const user = socket.data.user;

    // Check file upload feature
    if (!user.subscription.features.includes('file_uploads')) {
      return socket.emit('error', {
        code: 'FEATURE_NOT_AVAILABLE',
        message: 'File uploads require a paid subscription',
      });
    }

    // Check file size limit
    const maxSize = this.getFileSizeLimit(user.subscription.tier);
    if (data.size > maxSize) {
      return socket.emit('error', {
        code: 'FILE_TOO_LARGE',
        message: `Maximum file size is ${maxSize / 1024 / 1024}MB`,
      });
    }

    // Process upload
    await this.processFileUpload(socket, data);
  }
}

// Subscription change handling
class SubscriptionEventHandler {
  async handleSubscriptionChange(event: SubscriptionEvent) {
    const userId = event.userId;

    // Find all active sockets for user
    const sockets = await this.findUserSockets(userId);

    switch (event.type) {
      case 'upgraded':
        // Notify client of new features
        for (const socket of sockets) {
          socket.emit('subscription:updated', {
            tier: event.newTier,
            features: event.newFeatures,
            message: 'Your subscription has been upgraded!',
          });

          // Update socket data
          socket.data.user.subscription = {
            tier: event.newTier,
            features: event.newFeatures,
          };
        }
        break;

      case 'downgraded':
        // Notify and restrict
        for (const socket of sockets) {
          socket.emit('subscription:updated', {
            tier: event.newTier,
            features: event.newFeatures,
            message: 'Your subscription has been changed',
          });

          socket.data.user.subscription = {
            tier: event.newTier,
            features: event.newFeatures,
          };
        }
        break;

      case 'expired':
      case 'cancelled':
        // Disconnect from premium features
        for (const socket of sockets) {
          socket.emit('subscription:expired', {
            message: 'Your subscription has expired',
          });

          // Leave premium channels
          const rooms = Array.from(socket.rooms);
          for (const room of rooms) {
            if (room.startsWith('premium:')) {
              socket.leave(room);
            }
          }

          // Update socket data
          socket.data.user.subscription = {
            tier: 'free',
            features: ['chat_read'],
          };
        }
        break;
    }
  }
}
```

---

## 4. Subscription Integration

### 4.1 Payment Provider Integration (Stripe)

```typescript
// Stripe integration service
class StripeSubscriptionService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    const user = await this.userService.getById(userId);

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      await this.userService.update(userId, {
        stripeCustomerId: customerId,
      });
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
      allow_promotion_codes: true,
    });

    return session;
  }

  async createBillingPortalSession(userId: string): Promise<string> {
    const user = await this.userService.getById(userId);

    if (!user.stripeCustomerId) {
      throw new BadRequestError('No billing information found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.APP_URL}/settings/billing`,
    });

    return session.url;
  }

  async handleWebhook(
    payload: Buffer,
    signature: string
  ): Promise<void> {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
    }
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription
  ): Promise<void> {
    const userId = subscription.metadata.userId;

    // Determine tier from price
    const priceId = subscription.items.data[0].price.id;
    const tier = this.getTierFromPriceId(priceId);

    // Update subscription in database
    await this.db.subscriptions.upsert({
      userId,
      stripeSubscriptionId: subscription.id,
      tier,
      status: this.mapStripeStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    // Emit event for real-time updates
    await this.eventBus.emit('subscription:updated', {
      userId,
      newTier: tier,
      status: subscription.status,
    });

    // Audit log
    await this.auditLog.log({
      action: 'subscription.updated',
      actorId: 'system',
      actorType: 'system',
      targetId: userId,
      metadata: {
        tier,
        status: subscription.status,
        stripeSubscriptionId: subscription.id,
      },
    });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const user = await this.userService.findByStripeCustomerId(customerId);

    if (!user) return;

    // Send payment failed notification
    await this.notificationService.send(user.id, {
      type: 'payment_failed',
      title: 'Payment Failed',
      message: 'We were unable to process your payment. Please update your payment method.',
      actions: [
        {
          label: 'Update Payment Method',
          url: '/settings/billing',
        },
      ],
    });

    // Send email
    await this.emailService.send(user.email, {
      template: 'payment_failed',
      data: {
        userName: user.displayName,
        amount: invoice.amount_due / 100,
        currency: invoice.currency.toUpperCase(),
        nextAttempt: invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000)
          : null,
      },
    });
  }

  private getTierFromPriceId(priceId: string): SubscriptionTier {
    const priceToTier: Record<string, SubscriptionTier> = {
      [process.env.STRIPE_PRICE_BASIC_MONTHLY]: 'basic',
      [process.env.STRIPE_PRICE_BASIC_YEARLY]: 'basic',
      [process.env.STRIPE_PRICE_PRO_MONTHLY]: 'pro',
      [process.env.STRIPE_PRICE_PRO_YEARLY]: 'pro',
    };

    return priceToTier[priceId] || 'basic';
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      active: 'active',
      past_due: 'past_due',
      unpaid: 'unpaid',
      canceled: 'cancelled',
      incomplete: 'incomplete',
      incomplete_expired: 'expired',
      trialing: 'trialing',
      paused: 'paused',
    };

    return statusMap[status] || 'unknown';
  }
}
```

### 4.2 Subscription State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SUBSCRIPTION STATE MACHINE                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                              ┌─────────────┐                                    │
│                              │   NO_SUB    │                                    │
│                              │   (free)    │                                    │
│                              └──────┬──────┘                                    │
│                                     │                                           │
│                          checkout_completed                                     │
│                                     │                                           │
│                                     ▼                                           │
│  ┌──────────────┐           ┌─────────────┐           ┌──────────────┐         │
│  │   TRIALING   │◄──────────│   ACTIVE    │──────────►│  PAST_DUE    │         │
│  │              │  upgrade  │             │  payment  │              │         │
│  │  (if trial)  │           │             │  failed   │  (grace      │         │
│  └──────┬───────┘           └──────┬──────┘           │   period)    │         │
│         │                          │                  └──────┬───────┘         │
│         │ trial_ended              │                         │                  │
│         │ (payment)                │                         │ payment_        │
│         │                          │                         │ succeeded       │
│         └──────────────────────────┤                         │                  │
│                                    │◄────────────────────────┘                  │
│                                    │                                            │
│                         ┌──────────┴──────────┐                                │
│                         │                     │                                │
│             cancel_at_period_end        payment_failed                         │
│             (user requested)            (after retries)                        │
│                         │                     │                                │
│                         ▼                     ▼                                │
│                  ┌─────────────┐       ┌─────────────┐                         │
│                  │  CANCELLING │       │   UNPAID    │                         │
│                  │             │       │             │                         │
│                  │ (until end  │       │  (access    │                         │
│                  │  of period) │       │   revoked)  │                         │
│                  └──────┬──────┘       └──────┬──────┘                         │
│                         │                     │                                │
│              period_ended │        payment_succeeded                           │
│                         │        or manual_cancel                              │
│                         │                     │                                │
│                         ▼                     ▼                                │
│                  ┌─────────────┐       ┌─────────────┐                         │
│                  │  CANCELLED  │       │  CANCELLED  │                         │
│                  │             │       │             │                         │
│                  │ (downgrade  │       │ (reactivate │                         │
│                  │  to free)   │       │  available) │                         │
│                  └─────────────┘       └─────────────┘                         │
│                                                                                  │
│  ACCESS RIGHTS BY STATE:                                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │  State         │ Features              │ Grace Period │ Can Reactivate │    │
│  │  ─────────────────────────────────────────────────────────────────────  │    │
│  │  active        │ Full tier access      │ N/A          │ N/A            │    │
│  │  trialing      │ Full tier access      │ N/A          │ N/A            │    │
│  │  past_due      │ Full tier access      │ 7 days       │ Yes            │    │
│  │  cancelling    │ Full tier access      │ Until end    │ Yes            │    │
│  │  unpaid        │ Free tier only        │ N/A          │ Yes            │    │
│  │  cancelled     │ Free tier only        │ N/A          │ Yes (new sub)  │    │
│  │  expired       │ Free tier only        │ N/A          │ Yes (new sub)  │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Grace Period and Dunning

```typescript
// Grace period and dunning management
class DunningService {
  private readonly GRACE_PERIOD_DAYS = 7;
  private readonly RETRY_SCHEDULE = [1, 3, 5, 7]; // Days after first failure

  async handlePaymentFailure(userId: string, invoiceId: string): Promise<void> {
    const subscription = await this.subscriptionService.getByUserId(userId);

    if (subscription.status === 'active') {
      // First failure - start grace period
      await this.startGracePeriod(userId, subscription.id);
    }

    // Schedule retry notifications
    await this.scheduleRetryNotifications(userId, invoiceId);

    // Update subscription status
    await this.subscriptionService.update(subscription.id, {
      status: 'past_due',
      gracePeriodEndsAt: new Date(
        Date.now() + this.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
      ),
    });
  }

  private async startGracePeriod(
    userId: string,
    subscriptionId: string
  ): Promise<void> {
    const gracePeriodEnd = new Date(
      Date.now() + this.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
    );

    // Schedule grace period end job
    await this.queue.add(
      'grace_period_end',
      { userId, subscriptionId },
      { delay: this.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000 }
    );

    // Send initial notification
    await this.notificationService.send(userId, {
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `We couldn't process your payment. You have ${this.GRACE_PERIOD_DAYS} days to update your payment method.`,
      actions: [
        { label: 'Update Payment', url: '/settings/billing' },
      ],
    });
  }

  private async scheduleRetryNotifications(
    userId: string,
    invoiceId: string
  ): Promise<void> {
    for (const dayOffset of this.RETRY_SCHEDULE) {
      await this.queue.add(
        'payment_reminder',
        { userId, invoiceId, attempt: dayOffset },
        { delay: dayOffset * 24 * 60 * 60 * 1000 }
      );
    }
  }

  async handleGracePeriodEnd(
    userId: string,
    subscriptionId: string
  ): Promise<void> {
    const subscription = await this.subscriptionService.getById(subscriptionId);

    // Check if payment was made
    if (subscription.status === 'active') {
      return; // Payment successful, nothing to do
    }

    // Revoke access
    await this.subscriptionService.update(subscriptionId, {
      status: 'unpaid',
      tier: 'free',
    });

    // Emit event for real-time updates
    await this.eventBus.emit('subscription:expired', {
      userId,
      previousTier: subscription.tier,
    });

    // Final notification
    await this.notificationService.send(userId, {
      type: 'subscription_expired',
      title: 'Subscription Expired',
      message: 'Your subscription has been downgraded to the free plan due to payment issues.',
      actions: [
        { label: 'Reactivate', url: '/pricing' },
      ],
    });

    // Audit log
    await this.auditLog.log({
      action: 'subscription.expired',
      actorId: 'system',
      actorType: 'system',
      targetId: userId,
      metadata: {
        reason: 'payment_failed',
        previousTier: subscription.tier,
      },
    });
  }
}
```

---

## 5. Security Measures

### 5.1 Security Checklist

```yaml
authentication_security:
  token_security:
    - item: "Use RS256 for JWT signing"
      status: required
      reason: "Asymmetric signing prevents token forgery"

    - item: "Short access token lifetime (15 min)"
      status: required
      reason: "Limits exposure window if token is compromised"

    - item: "Secure refresh token storage"
      status: required
      reason: "httpOnly, secure, sameSite cookies"

    - item: "Token rotation on refresh"
      status: required
      reason: "Prevents refresh token reuse attacks"

    - item: "Maintain token blacklist for revocation"
      status: required
      reason: "Enables immediate session termination"

  password_security:
    - item: "bcrypt/argon2 for password hashing"
      status: required
      reason: "Resistant to brute force attacks"

    - item: "Minimum password requirements"
      status: required
      config:
        min_length: 12
        require_uppercase: true
        require_lowercase: true
        require_number: true
        require_special: false

    - item: "Check against breached password databases"
      status: recommended
      reason: "Prevents use of known compromised passwords"

    - item: "Invalidate sessions on password change"
      status: required
      reason: "Ensures old sessions can't be used"

  session_security:
    - item: "Track active sessions per user"
      status: required
      reason: "Enables session management and monitoring"

    - item: "Device fingerprinting for anomaly detection"
      status: recommended
      reason: "Detect session hijacking attempts"

    - item: "Geographic anomaly detection"
      status: recommended
      reason: "Alert on logins from unusual locations"

    - item: "Concurrent session limits"
      status: optional
      config:
        max_sessions: 5

  mfa_security:
    - item: "TOTP-based MFA"
      status: required
      reason: "Second factor authentication"

    - item: "Backup codes for account recovery"
      status: required
      reason: "Prevent lockout if device lost"

    - item: "MFA required for admins"
      status: required
      reason: "Protect privileged accounts"

  api_security:
    - item: "Rate limiting on auth endpoints"
      status: required
      config:
        login: "5 per minute per IP"
        register: "3 per minute per IP"
        password_reset: "3 per hour per email"

    - item: "CSRF protection for cookie-based auth"
      status: required
      reason: "Prevent cross-site request forgery"

    - item: "Timing-safe comparison for secrets"
      status: required
      reason: "Prevent timing attacks"

    - item: "Account lockout after failed attempts"
      status: required
      config:
        max_attempts: 5
        lockout_duration: 15m
```

### 5.2 Brute Force Protection

```typescript
// Brute force protection service
class BruteForceProtection {
  private redis: Redis;

  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60; // 15 minutes
  private readonly ATTEMPT_WINDOW = 60 * 60; // 1 hour

  async checkAndRecord(
    identifier: string,
    type: 'login' | 'password_reset' | 'mfa'
  ): Promise<BruteForceCheckResult> {
    const key = `bruteforce:${type}:${identifier}`;

    // Get current attempts
    const attempts = await this.redis.get(key);
    const attemptCount = parseInt(attempts || '0');

    // Check if locked out
    const lockoutKey = `lockout:${type}:${identifier}`;
    const isLockedOut = await this.redis.exists(lockoutKey);

    if (isLockedOut) {
      const ttl = await this.redis.ttl(lockoutKey);
      return {
        allowed: false,
        lockedOut: true,
        remainingLockoutSeconds: ttl,
        message: `Account locked. Try again in ${Math.ceil(ttl / 60)} minutes.`,
      };
    }

    // Record attempt
    await this.redis.incr(key);
    await this.redis.expire(key, this.ATTEMPT_WINDOW);

    // Check if should lock out
    if (attemptCount + 1 >= this.MAX_ATTEMPTS) {
      await this.lockout(identifier, type);
      return {
        allowed: false,
        lockedOut: true,
        remainingLockoutSeconds: this.LOCKOUT_DURATION,
        message: `Too many attempts. Account locked for ${this.LOCKOUT_DURATION / 60} minutes.`,
      };
    }

    return {
      allowed: true,
      lockedOut: false,
      remainingAttempts: this.MAX_ATTEMPTS - attemptCount - 1,
    };
  }

  async recordSuccess(identifier: string, type: string): Promise<void> {
    // Clear attempts on successful auth
    await this.redis.del(`bruteforce:${type}:${identifier}`);
  }

  private async lockout(identifier: string, type: string): Promise<void> {
    const lockoutKey = `lockout:${type}:${identifier}`;
    await this.redis.setex(lockoutKey, this.LOCKOUT_DURATION, '1');

    // Clear attempt counter
    await this.redis.del(`bruteforce:${type}:${identifier}`);

    // Log security event
    await this.auditLog.log({
      action: 'security.lockout',
      actorType: 'system',
      metadata: {
        identifier,
        type,
        duration: this.LOCKOUT_DURATION,
      },
    });
  }
}
```

---

## 6. Entitlement Check Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ENTITLEMENT CHECK MATRIX                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  TOUCHPOINT              │ CHECK TYPE        │ ENFORCEMENT   │ FALLBACK                    │
│  ─────────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                              │
│  FRONTEND                                                                                    │
│  ─────────────────────────────────────────────────────────────────────────────────────────  │
│  Route navigation        │ JWT claims        │ Soft (UX)     │ Redirect to upgrade         │
│  Feature visibility      │ JWT claims        │ Soft (UX)     │ Hide/disable                │
│  Button states           │ JWT claims        │ Soft (UX)     │ Disable + tooltip           │
│  Form submission         │ JWT claims        │ Soft (UX)     │ Show upgrade modal          │
│                                                                                              │
│  API GATEWAY                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────────────────  │
│  All requests            │ JWT validation    │ Hard (401)    │ Require re-auth             │
│  Protected endpoints     │ JWT sub check     │ Hard (403)    │ Subscription required       │
│  Rate limits             │ Tier-based        │ Hard (429)    │ Upgrade for higher limits   │
│                                                                                              │
│  BACKEND SERVICES                                                                            │
│  ─────────────────────────────────────────────────────────────────────────────────────────  │
│  Code execution          │ DB + limit check  │ Hard (403)    │ Show limit exceeded         │
│  File upload             │ DB + size check   │ Hard (403)    │ Show size limit             │
│  Chat send               │ DB feature check  │ Hard (403)    │ Upgrade required            │
│  DM send                 │ DB feature check  │ Hard (403)    │ Upgrade required            │
│  Course access           │ Enrollment check  │ Hard (403)    │ Enroll required             │
│                                                                                              │
│  WEBSOCKET                                                                                   │
│  ─────────────────────────────────────────────────────────────────────────────────────────  │
│  Connection              │ JWT validation    │ Hard (close)  │ Reconnect with valid token  │
│  Join channel            │ Membership check  │ Hard (error)  │ Not a member                │
│  Send message            │ Feature + rate    │ Hard (error)  │ Upgrade / wait              │
│  Upload file             │ Feature + size    │ Hard (error)  │ Upgrade                     │
│  @everyone               │ Role check        │ Hard (error)  │ Permission denied           │
│                                                                                              │
│  CODE RUNNER                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────────────────  │
│  Execute request         │ Full entitlement  │ Hard (403)    │ Show specific limit         │
│  Language selection      │ Tier check        │ Hard (403)    │ Language not available      │
│  Resource allocation     │ Tier limits       │ Enforced      │ Lower limits applied        │
│  Timeout                 │ Tier limits       │ Enforced      │ Execution terminated        │
│                                                                                              │
│  BILLING                                                                                     │
│  ─────────────────────────────────────────────────────────────────────────────────────────  │
│  View invoices           │ Customer check    │ Hard (403)    │ No billing history          │
│  Update payment          │ Customer check    │ Hard (403)    │ No payment method           │
│  Change plan             │ Active sub check  │ Soft          │ Start new subscription      │
│  Cancel plan             │ Active sub check  │ Hard (400)    │ No active subscription      │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Deliverables Summary

| Deliverable | Status | Location |
|-------------|--------|----------|
| Auth Flow Diagrams | ✅ Complete | Section 1.1 |
| JWT Claims Specification | ✅ Complete | Section 1.3 |
| Entitlement Check Matrix | ✅ Complete | Section 6 |
| Subscription State Machine | ✅ Complete | Section 4.2 |
| Role/Permission Model | ✅ Complete | Section 2.2 |
| Security Checklist | ✅ Complete | Section 5.1 |
| Payment Integration | ✅ Complete | Section 4.1 |
| MFA Implementation | ✅ Complete | Section 1.6 |
