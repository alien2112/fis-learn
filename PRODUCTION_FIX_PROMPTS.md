# FIS-Learn Production Fix Prompts for Kimi 2.5

> **How to use**: Execute each phase in order. Each prompt is self-contained with exact file paths, current code snippets, and expected output. Copy-paste each prompt into Kimi 2.5 as a separate conversation. Do NOT skip phases — later phases depend on earlier ones.

---

## Phase 0: Prerequisites Check

Before starting, run this in the project root to confirm the codebase is in a buildable state:

```bash
cd E:\fis-learn
pnpm install
cd apps/api && npx prisma generate
```

---

## PHASE 1: CRITICAL SECURITY FIXES (P0 — Fix Before Launch)

---

### Prompt 1.1: Fix Password Change Validation Bypass in Users Controller

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
The file `src/modules/users/users.controller.ts` has a `changePassword` endpoint at line ~58 that uses an INLINE type instead of a class-validator DTO:

```typescript
async changePassword(
  @CurrentUser() user: AuthUser,
  @Body() dto: { currentPassword: string; newPassword: string },
)
```

This bypasses NestJS's global ValidationPipe entirely. A user can set a 1-character password.

A proper `ChangePasswordDto` ALREADY EXISTS at `src/modules/auth/dto/reset-password.dto.ts` with full validation:

```typescript
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;
}
```

TASK:
1. In `src/modules/users/users.controller.ts`, import `ChangePasswordDto` from `@/modules/auth/dto/reset-password.dto` (or from `@/modules/auth/dto`)
2. Replace the inline type `{ currentPassword: string; newPassword: string }` with `ChangePasswordDto` in the `changePassword` method parameter
3. In `src/modules/users/users.service.ts`, update the `changePassword` method signature from `dto: { currentPassword: string; newPassword: string }` to `dto: ChangePasswordDto` and add the import

DO NOT:
- Create a new DTO — reuse the existing one
- Change any other methods
- Modify the ChangePasswordDto itself
- Touch the auth controller (it already uses the correct DTO)

VERIFY: After changes, both `@Body() dto: ChangePasswordDto` should be used in the users controller's changePassword method. The service should accept the same type.
```

---

### Prompt 1.2: Add Brute-Force Protection on Login + MFA Attempt Limiting

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
The login endpoint has NO brute-force protection. An attacker can try unlimited password combinations. Also, the MFA verification has no attempt limiting — a 6-digit TOTP code can be brute-forced within the 5-minute pending token window.

CURRENT CODE in `src/modules/auth/auth.service.ts`:

The `login()` method simply checks the password and returns tokens. No failed attempt tracking.
The `verifyMfaLogin()` method verifies the code with no attempt counter.

The project already has an in-memory cache module registered globally in `src/app.module.ts`:
```typescript
CacheModule.registerAsync({
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    ttl: 60 * 1000,
    max: 1000,
  }),
}),
```

TASK:
1. In `src/modules/auth/auth.service.ts`:

   a. Add imports:
   ```typescript
   import { CACHE_MANAGER } from '@nestjs/cache-manager';
   import { Cache } from 'cache-manager';
   ```

   b. Inject the cache manager in the constructor:
   ```typescript
   @Inject(CACHE_MANAGER) private cacheManager: Cache,
   ```

   c. Add a private helper method for login attempt tracking:
   ```typescript
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
   ```

   d. In the `login()` method, add brute-force checks:
   - Call `await this.checkLoginAttempts(normalizedEmail);` BEFORE the password check
   - After `if (!isPasswordValid)`, call `await this.recordFailedLogin(normalizedEmail);` BEFORE throwing
   - After successful login (before generating tokens), call `await this.clearLoginAttempts(normalizedEmail);`

   e. Add MFA attempt limiting:
   ```typescript
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
   ```

   f. In `verifyMfaLogin()`:
   - After extracting `payload.sub`, call `await this.checkMfaAttempts(payload.sub);`
   - If `!isValid`, call `await this.recordFailedMfa(payload.sub);` before throwing
   - On success, call `await this.clearMfaAttempts(payload.sub);`

DO NOT:
- Install any new packages (cache-manager is already available)
- Change the global cache module configuration
- Add Redis — use the existing in-memory cache (Redis migration is a separate task)
- Change any method signatures or return types
- Modify the auth controller

VERIFY: The login method should: check attempts -> verify password -> record failure OR clear attempts. The MFA method should: check attempts -> verify code -> record failure OR clear attempts.
```

---

### Prompt 1.3: Wire Up AuditLogService Across All Critical Services

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
`AuditLogService` exists at `src/common/services/audit-log.service.ts` with full implementations of `log()`, `logAuth()`, `logDataChange()`, `logSecurity()`, and `queryLogs()`. However, it is NEVER injected or called anywhere. Role changes, status changes, user deletions, course approvals — none are audited.

The AuditLog model already exists in the Prisma schema:
```prisma
model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  action     String
  entityType String
  entityId   String?
  oldValues  Json?
  newValues  Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
  @@map("audit_logs")
}
```

TASK:

**Step 1**: Make AuditLogService available globally.

Create a common module file at `src/common/common.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './services/audit-log.service';

@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class CommonModule {}
```

Then in `src/app.module.ts`, add `CommonModule` to the imports array (import from `./common/common.module`).

**Step 2**: Wire into `src/modules/users/users.service.ts`

Add to constructor:
```typescript
private auditLog: AuditLogService,
```

Add import:
```typescript
import { AuditLogService } from '@/common/services/audit-log.service';
```

Add audit logging to these methods (add AFTER the operation succeeds):

a. `updateStatus()` — after the Prisma update and token invalidation:
```typescript
await this.auditLog.logDataChange(
  'system', // TODO: pass admin userId from controller
  'USER_STATUS_CHANGE',
  'USER',
  id,
  { old: { status: user.status }, new: { status: dto.status } },
);
```

b. `updateRole()` — after the Prisma update:
```typescript
await this.auditLog.logDataChange(
  'system', // TODO: pass admin userId from controller
  'USER_ROLE_CHANGE',
  'USER',
  id,
  { old: { role: user.role }, new: { role: dto.role } },
);
```

c. `delete()` — before the Prisma delete:
```typescript
await this.auditLog.logDataChange(
  'system', // TODO: pass admin userId from controller
  'USER_DELETE',
  'USER',
  id,
  { old: { email: user.email, role: user.role, name: user.name } },
);
```

**Step 3**: Wire into `src/modules/courses/courses.service.ts`

Same pattern — inject `AuditLogService` in constructor, add import.

Add audit logging to:

a. After `approve()` updates status:
```typescript
await this.auditLog.logDataChange(
  'system',
  'COURSE_APPROVE',
  'COURSE',
  id,
  { old: { status: 'PENDING_REVIEW' }, new: { status: 'PUBLISHED' } },
);
```

b. After `reject()` updates status:
```typescript
await this.auditLog.logDataChange(
  'system',
  'COURSE_REJECT',
  'COURSE',
  id,
  { old: { status: 'PENDING_REVIEW' }, new: { status: 'REJECTED', feedback } },
);
```

c. Before `delete()`:
```typescript
await this.auditLog.logDataChange(
  'system',
  'COURSE_DELETE',
  'COURSE',
  id,
  { old: { title: course.title, slug: course.slug } },
);
```

**Step 4**: Wire into `src/modules/auth/auth.service.ts`

Inject `AuditLogService`. Add after successful login (after `generateTokens`):
```typescript
await this.auditLog.logAuth(user.id, 'LOGIN_SUCCESS');
```

Add after failed password check (before throwing):
```typescript
await this.auditLog.logAuth(user.id, 'LOGIN_FAILED');
```

DO NOT:
- Change the AuditLogService implementation
- Change the Prisma schema
- Change any method return types
- Remove any existing code
- Add audit logging to read-only operations (findAll, findOne, etc.)

VERIFY: After changes, `AuditLogService` should be injected in: UsersService, CoursesService, AuthService. The CommonModule should be imported in AppModule.
```

---

### Prompt 1.4: Invalidate Tokens on Role Demotion

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
In `src/modules/users/users.service.ts`, when a user's role is demoted (e.g., ADMIN -> STUDENT), their existing JWT continues to carry the old elevated role until it expires (15 minutes). The `updateStatus()` method already invalidates tokens on suspend/ban, but `updateRole()` does not.

CURRENT CODE in `updateRole()` method (around line 305-340):
```typescript
const updatedUser = await this.prisma.user.update({
  where: { id },
  data: { role: dto.role },
  ...
});

// Create instructor profile if promoting to instructor
if (dto.role === Role.INSTRUCTOR && user.role !== Role.INSTRUCTOR) {
  ...
}

return updatedUser;
```

TASK:
In `src/modules/users/users.service.ts`, in the `updateRole()` method, add refresh token invalidation AFTER the Prisma update and BEFORE the return:

```typescript
// Invalidate all refresh tokens to force re-authentication with new role
await this.prisma.refreshToken.deleteMany({
  where: { userId: id },
});
```

Place this right after the `prisma.user.update` call, before the instructor profile creation check.

DO NOT:
- Change any other method
- Change the method signature or return type
- Add any new imports (PrismaService is already injected)
```

---

### Prompt 1.5: Fix Draft Course Data Leakage

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
In `src/modules/courses/courses.service.ts`, the `findBySlug()` method returns course data regardless of status. A public user who discovers or guesses a slug can view draft/rejected course content including full section and lesson structure.

Similarly, `findOne()` (by ID) returns any course to any authenticated user.

TASK:

1. In `src/modules/courses/courses.service.ts`, find the `findBySlug()` method. It currently queries:
```typescript
const course = await this.prisma.course.findUnique({
  where: { slug },
  include: { ... }
});
```

Change it to accept an optional `userId` and `userRole` parameter. If the user is not an admin/super_admin and not the course creator, only return PUBLISHED courses:

```typescript
async findBySlug(slug: string, userId?: string, userRole?: string) {
```

After fetching the course, add this check before returning:
```typescript
if (!course) {
  throw new NotFoundException('Course not found');
}

// Only admins, super admins, and course creator can see non-published courses
if (course.status !== 'PUBLISHED') {
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const isCreator = userId && course.createdById === userId;
  if (!isAdmin && !isCreator) {
    throw new NotFoundException('Course not found');
  }
}
```

2. Apply the same pattern to `findOne()` (find by ID). Add the same status check after fetching.

3. In `src/modules/courses/courses.controller.ts`, update the calls to `findBySlug` and `findOne` to pass the user context. The controller methods that call these should extract `@CurrentUser()` and pass `user.id` and `user.role`. For public endpoints where user might not exist, pass `undefined`.

Look at the controller — the `findBySlug` and `findOne` endpoints likely use `@ApiBearerAuth()`. Update them to:
```typescript
async findBySlug(@Param('slug') slug: string, @CurrentUser() user?: AuthUser) {
  return this.coursesService.findBySlug(slug, user?.id, user?.role);
}
```

DO NOT:
- Change the course list/search endpoints (those already filter by PUBLISHED)
- Remove any existing includes in the findBySlug query
- Change the Prisma schema
- Modify any DTOs
```

---

### Prompt 1.6: Add Course Ownership Check on Section/Lesson CRUD

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
In `src/modules/courses/courses.controller.ts`, the section and lesson CRUD endpoints (createSection, updateSection, deleteSection, createLesson, updateLesson, deleteLesson) only check the INSTRUCTOR role but do NOT verify the user is an instructor of THAT SPECIFIC COURSE. This means Instructor A can create sections in Instructor B's course.

TASK:

1. In `src/modules/courses/courses.service.ts`, add a private helper method:

```typescript
private async verifyCourseOwnership(courseId: string, userId: string, userRole: string): Promise<void> {
  // Admins and super admins can modify any course
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    return;
  }

  const course = await this.prisma.course.findUnique({
    where: { id: courseId },
    select: {
      createdById: true,
      instructors: { select: { instructorId: true } },
    },
  });

  if (!course) {
    throw new NotFoundException('Course not found');
  }

  const isCreator = course.createdById === userId;
  const isInstructor = course.instructors.some(i => i.instructorId === userId);

  if (!isCreator && !isInstructor) {
    throw new ForbiddenException('You do not have permission to modify this course');
  }
}
```

Add `ForbiddenException` to the imports from `@nestjs/common` if not already there.

2. Call `await this.verifyCourseOwnership(courseId, userId, userRole)` at the beginning of these methods:
   - `createSection(courseId, dto, userId, userRole)`
   - `updateSection(courseId, sectionId, dto, userId, userRole)`
   - `deleteSection(courseId, sectionId, userId, userRole)`
   - `createLesson(courseId, sectionId, dto, userId, userRole)`
   - `updateLesson(courseId, sectionId, lessonId, dto, userId, userRole)`
   - `deleteLesson(courseId, sectionId, lessonId, userId, userRole)`

   You'll need to add `userId: string` and `userRole: string` parameters to each of these methods.

3. In `src/modules/courses/courses.controller.ts`, update the section/lesson controller methods to pass user context:
   - Add `@CurrentUser() user: AuthUser` parameter to each
   - Pass `user.id` and `user.role` to the service method calls

For example, if the controller currently has:
```typescript
async createSection(@Param('id') courseId: string, @Body() dto: CreateSectionDto) {
  return this.coursesService.createSection(courseId, dto);
}
```

Change to:
```typescript
async createSection(
  @Param('id') courseId: string,
  @Body() dto: CreateSectionDto,
  @CurrentUser() user: AuthUser,
) {
  return this.coursesService.createSection(courseId, dto, user.id, user.role);
}
```

DO NOT:
- Change the @Roles decorators (keep INSTRUCTOR requirement)
- Modify the section/lesson data operations themselves
- Change DTOs
- Add ownership checks to read operations (findBySlug, etc.)
```

---

## PHASE 2: DATA INTEGRITY FIXES (P1 — Fix Before Scale)

---

### Prompt 2.1: Add Soft Delete to User and Course Models

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
User and Course deletion is HARD DELETE with cascading. Deleting a user destroys their enrollment history, payment transactions, community messages, and audit trails. This violates financial record-keeping requirements and makes recovery impossible.

TASK:

**Step 1: Prisma Schema Migration**

In `prisma/schema.prisma`, add a `deletedAt` field to the `User` model:
```prisma
deletedAt   DateTime?   @map("deleted_at")
```
Add it after the `updatedAt` field.

Add the same field to the `Course` model:
```prisma
deletedAt   DateTime?   @map("deleted_at")
```

Then create and apply the migration:
```bash
cd apps/api
npx prisma migrate dev --name add_soft_delete_fields
```

**Step 2: Update UsersService**

In `src/modules/users/users.service.ts`:

a. In the `delete()` method, replace:
```typescript
await this.prisma.user.delete({
  where: { id },
});
```
With:
```typescript
await this.prisma.user.update({
  where: { id },
  data: { deletedAt: new Date(), status: UserStatus.BANNED },
});

// Invalidate all refresh tokens
await this.prisma.refreshToken.deleteMany({
  where: { userId: id },
});
```

b. In ALL query methods (`findAll`, `findStudents`, `findInstructors`, `findAdmins`, `findOne`, `findMe`), add `deletedAt: null` to the `where` clause. For example, in `findAll`:
```typescript
const where: Prisma.UserWhereInput = { deletedAt: null };
```

In `findOne` and `findMe`, change:
```typescript
const user = await this.prisma.user.findUnique({
  where: { id },
```
To:
```typescript
const user = await this.prisma.user.findFirst({
  where: { id, deletedAt: null },
```
(Note: `findUnique` doesn't support non-unique fields in where, so use `findFirst`)

c. In `create()`, when checking email uniqueness, also exclude soft-deleted:
```typescript
const existingUser = await this.prisma.user.findFirst({
  where: { email: dto.email.toLowerCase(), deletedAt: null },
});
```

**Step 3: Update CoursesService**

In `src/modules/courses/courses.service.ts`:

a. In the `delete()` method, replace `this.prisma.course.delete(...)` with:
```typescript
await this.prisma.course.update({
  where: { id },
  data: { deletedAt: new Date(), status: CourseStatus.ARCHIVED },
});
```

b. In all public query methods that list courses, add `deletedAt: null` to the where clause.

DO NOT:
- Change the Prisma schema relations or cascade rules
- Add deletedAt to other models (keep scope minimal)
- Modify DTOs
- Remove existing status checks
- Change method signatures or return types

VERIFY: After migration, `deletedAt` column should exist in users and courses tables. Delete operations should set deletedAt instead of removing rows. All list/find queries should exclude soft-deleted records.
```

---

### Prompt 2.2: Add Missing Database Indexes

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
15+ frequently queried columns lack indexes. As the dataset grows, queries filtering by User.role, User.status, Course.status, Enrollment.userId, etc. will degrade to full table scans.

TASK:

In `prisma/schema.prisma`, add `@@index` directives to the following models. Place them before the `@@map` directive in each model:

**User model** — add:
```prisma
@@index([role])
@@index([status])
@@index([lastLoginAt])
@@index([deletedAt])
```

**Course model** — add:
```prisma
@@index([status])
@@index([categoryId])
@@index([createdById])
@@index([deletedAt])
```

**Enrollment model** — add:
```prisma
@@index([userId])
@@index([courseId])
@@index([status])
```

**Subscription model** — add:
```prisma
@@index([userId])
@@index([externalId])
@@index([status])
```

**PaymentTransaction model** — add:
```prisma
@@index([userId])
@@index([subscriptionId])
```

**AuditLog model** — add:
```prisma
@@index([userId])
@@index([entityType])
@@index([createdAt])
@@index([entityType, entityId])
```

**AccessCode model** — add:
```prisma
@@index([status])
@@index([courseId])
@@index([createdById])
```

**CommunityMessage model** — add (if not already present):
```prisma
@@index([channelId])
@@index([authorId])
```

**StudentActivityEvent model** — add:
```prisma
@@index([studentId])
@@index([courseId])
@@index([eventTimestamp])
```

After adding all indexes, run:
```bash
cd apps/api
npx prisma migrate dev --name add_missing_indexes
```

DO NOT:
- Change any column types or relations
- Add unique constraints (only indexes)
- Modify any model fields
- Remove existing indexes or unique constraints

VERIFY: The migration should create only index additions. Run `npx prisma migrate status` to confirm.
```

---

### Prompt 2.3: Fix Float Currency to Int (Cents)

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
`Course.price`, `SubscriptionPlan.price`, and `PaymentTransaction.amount` use `Float` type for currency. This causes floating-point precision errors (e.g., 9.99 stored as 9.989999999...). Currency should be stored as `Int` representing cents (999 = $9.99).

TASK:

**Step 1: Schema Changes**

In `prisma/schema.prisma`, change these fields:

In the `Course` model:
```prisma
price       Int         @default(0)   // Price in cents
```
(was: `Float @default(0)`)

In the `SubscriptionPlan` model:
```prisma
price       Int         // Price in cents
```
(was: `Float`)

In the `PaymentTransaction` model:
```prisma
amount      Int         // Amount in cents
```
(was: `Float`)

**Step 2: Migration with data conversion**

Create a custom migration:
```bash
cd apps/api
npx prisma migrate dev --name convert_price_to_cents --create-only
```

This creates the migration folder without applying it. Edit the generated SQL file to convert existing data:

```sql
-- Convert existing float prices to cents (multiply by 100)
UPDATE courses SET price = ROUND(price * 100) WHERE price > 0;
UPDATE subscription_plans SET price = ROUND(price * 100) WHERE price > 0;
UPDATE payment_transactions SET amount = ROUND(amount * 100) WHERE amount > 0;

-- Now alter columns to integer
ALTER TABLE "courses" ALTER COLUMN "price" SET DATA TYPE INTEGER USING ROUND(price)::INTEGER;
ALTER TABLE "courses" ALTER COLUMN "price" SET DEFAULT 0;
ALTER TABLE "subscription_plans" ALTER COLUMN "price" SET DATA TYPE INTEGER USING ROUND(price)::INTEGER;
ALTER TABLE "payment_transactions" ALTER COLUMN "amount" SET DATA TYPE INTEGER USING ROUND(amount)::INTEGER;
```

Then apply:
```bash
npx prisma migrate dev
```

**Step 3: Update DTOs**

In `src/modules/courses/dto/create-course.dto.ts`, the price field:
```typescript
@ApiPropertyOptional({ example: 9999, description: 'Price in cents (9999 = $99.99)' })
@IsOptional()
@IsNumber()
@IsInt()
@Min(0)
price?: number;
```

Add `IsInt` to the imports from `class-validator`.

**Step 4: Update Service Logic**

Search all service files for any price/amount calculations that assume dollars (division by 100, multiplication by 100). Common locations:
- `src/modules/courses/courses.service.ts` — any price comparisons
- `src/modules/subscriptions/subscriptions.service.ts` — checkout session creation
- `src/modules/access-codes/access-codes.service.ts` — if it checks pricing

If any service passes `price` to an external payment API (Stripe), verify whether the API expects cents (Stripe does, so no conversion needed after this change).

DO NOT:
- Change any unrelated fields
- Modify the payment gateway interface
- Change frontend display logic (that's a separate task)

VERIFY: After migration, `SELECT price FROM courses LIMIT 5` should show integer values in cents. The DTO should reject non-integer prices.
```

---

### Prompt 2.4: Fix Access Code Redemption Race Condition

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
In `src/modules/access-codes/access-codes.service.ts`, the `redeem()` method has a check-then-increment race condition. Two simultaneous redemptions both pass the `currentRedemptions >= maxRedemptions` check before either increments the counter, allowing over-redemption.

CURRENT CODE (simplified):
```typescript
// Check max redemptions
if (accessCode.currentRedemptions >= accessCode.maxRedemptions) {
  throw new BadRequestException('Access code has reached maximum redemptions');
}

// ... later in $transaction:
this.prisma.accessCode.update({
  where: { id: accessCode.id },
  data: {
    currentRedemptions: { increment: 1 },
    ...
  },
}),
```

The `$transaction([...])` array form does NOT provide serializable isolation.

TASK:

Replace the redemption logic in the `redeem()` method with an interactive transaction that uses `SELECT FOR UPDATE` semantics. Replace everything from "Check max redemptions" through the end of the $transaction with:

```typescript
// Use interactive transaction for atomicity
const result = await this.prisma.$transaction(async (tx) => {
  // Re-fetch with lock to prevent race conditions
  const lockedCode = await tx.accessCode.findUnique({
    where: { id: accessCode.id },
  });

  if (!lockedCode) {
    throw new BadRequestException('Access code not found');
  }

  if (lockedCode.currentRedemptions >= lockedCode.maxRedemptions) {
    throw new BadRequestException('Access code has reached maximum redemptions');
  }

  // Process redemption based on type
  if (lockedCode.type === AccessCodeType.COURSE && accessCode.courseId) {
    const existingEnrollment = await tx.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId: accessCode.courseId },
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('You are already enrolled in this course');
    }

    await tx.enrollment.create({
      data: {
        userId,
        courseId: accessCode.courseId,
        paymentStatus: PaymentStatus.CODE_REDEEMED,
      },
    });
  }

  // Record usage and increment atomically
  const usage = await tx.accessCodeUsage.create({
    data: {
      codeId: lockedCode.id,
      userId,
    },
  });

  const shouldExpire =
    lockedCode.isSingleUse ||
    lockedCode.currentRedemptions + 1 >= lockedCode.maxRedemptions;

  await tx.accessCode.update({
    where: { id: lockedCode.id },
    data: {
      currentRedemptions: { increment: 1 },
      status: shouldExpire ? AccessCodeStatus.EXPIRED : AccessCodeStatus.ACTIVE,
    },
  });

  return usage;
});
```

Remove the old separate enrollment creation and `$transaction([...])` array that was before this section.

Make sure the method still returns:
```typescript
return {
  message: 'Code redeemed successfully',
  type: accessCode.type,
  course: accessCode.course,
  material: accessCode.material,
};
```

DO NOT:
- Change the method signature
- Change the validation logic before the transaction (status check, expiry check, user-already-redeemed check)
- Modify other methods in this service

VERIFY: The redemption now happens inside a single `$transaction(async (tx) => { ... })` with all checks and writes using the `tx` client.
```

---

### Prompt 2.5: Add Webhook Idempotency for Subscriptions

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
In `src/modules/subscriptions/subscriptions.service.ts`, webhook events are processed without idempotency checks. If a payment provider retries a webhook, the same event creates duplicate transactions or subscriptions.

TASK:

**Step 1: Add WebhookEvent model to schema**

In `prisma/schema.prisma`, add:
```prisma
model WebhookEvent {
  id          String   @id @default(uuid())
  provider    String
  externalId  String   // Provider's event ID
  eventType   String
  payload     Json
  processedAt DateTime @default(now())

  @@unique([provider, externalId])
  @@index([provider])
  @@index([processedAt])
  @@map("webhook_events")
}
```

Run migration:
```bash
cd apps/api
npx prisma migrate dev --name add_webhook_events
```

**Step 2: Add idempotency check in SubscriptionsService**

In `src/modules/subscriptions/subscriptions.service.ts`, add a private helper:

```typescript
private async isWebhookProcessed(provider: string, eventId: string): Promise<boolean> {
  if (!eventId) return false;
  const existing = await this.prisma.webhookEvent.findUnique({
    where: { provider_externalId: { provider, externalId: eventId } },
  });
  return !!existing;
}

private async recordWebhookEvent(provider: string, eventId: string, eventType: string, payload: any): Promise<void> {
  if (!eventId) return;
  await this.prisma.webhookEvent.create({
    data: {
      provider,
      externalId: eventId,
      eventType,
      payload: payload as any,
    },
  });
}
```

**Step 3: Update webhook handler**

Find the method that handles incoming webhooks (likely `handleWebhook` or `processWebhookEvent`). At the very beginning of that method, before any processing:

```typescript
// Idempotency check
const eventId = payload.id || payload.eventId || '';
const provider = this.paymentGateway.providerName;

if (await this.isWebhookProcessed(provider, eventId)) {
  this.logger.log(`Webhook event ${eventId} already processed, skipping`);
  return { received: true, duplicate: true };
}
```

At the END of successful processing (before the final return):
```typescript
await this.recordWebhookEvent(provider, eventId, eventType, payload);
```

DO NOT:
- Change the webhook verification logic
- Modify payment processing logic
- Change the response format for non-duplicate webhooks
- Add retry logic (that's the provider's job)

VERIFY: Sending the same webhook payload twice should process it once and return `{ received: true, duplicate: true }` on the second call.
```

---

## PHASE 3: VALIDATION & DTO HARDENING (P2)

---

### Prompt 3.1: Fix Analytics TrackEventDto — Convert Interface to Validated Class

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
The file `src/modules/analytics/dto/track-event.dto.ts` defines TrackEventDto as a plain TypeScript interface:
```typescript
export interface TrackEventDto {
  eventType: string;
  timestamp: string;
  sessionId: string;
  courseId?: string;
  lessonId?: string;
  payload?: Record<string, any>;
}
```

This has ZERO validation. An attacker can submit fabricated events with invalid types, future timestamps, and huge payloads.

TASK:

Replace the entire file `src/modules/analytics/dto/track-event.dto.ts` with:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsObject,
  MaxLength,
} from 'class-validator';
import { AnalyticsEventType } from '@prisma/client';

export class TrackEventDto {
  @ApiProperty({ enum: AnalyticsEventType, example: 'LESSON_COMPLETE' })
  @IsEnum(AnalyticsEventType, { message: 'Invalid event type' })
  eventType: AnalyticsEventType;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString({}, { message: 'Timestamp must be a valid ISO 8601 date string' })
  timestamp: string;

  @ApiProperty({ example: 'session-uuid-here' })
  @IsString()
  @MaxLength(100)
  sessionId: string;

  @ApiPropertyOptional({ example: 'course-uuid-here' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ example: 'lesson-uuid-here' })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiPropertyOptional({ example: { timeSpent: 120 } })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
```

Then in `src/modules/analytics/analytics.service.ts`, update the `trackEvents` method signature. It currently accepts:
```typescript
async trackEvents(events: TrackEventDto[], ...)
```

Since `TrackEventDto` is now a class (not interface), this should continue to work. But verify that the analytics controller uses `@Body()` with proper validation. Check `src/modules/analytics/analytics.controller.ts` — the body parameter should use:
```typescript
@Body() dto: { events: TrackEventDto[] }
```
or a wrapper DTO. If it uses a plain object, create a wrapper:

```typescript
// In track-event.dto.ts, add:
export class TrackEventsDto {
  @ApiProperty({ type: [TrackEventDto] })
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  events: TrackEventDto[];
}
```

Add imports: `ValidateNested` from `class-validator` and `Type` from `class-transformer`.

DO NOT:
- Change the analytics service logic (event handling, progress updates)
- Modify the Prisma schema
- Change how events are stored

VERIFY: After changes, submitting `{ eventType: "INVALID_TYPE" }` should return a 400 validation error. The DTO should be a class, not an interface.
```

---

### Prompt 3.2: Add Slug Format Validation and MaxLength to Course DTOs

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
In `src/modules/courses/dto/create-course.dto.ts`, the `slug` field has no format validation. A slug like `"../admin"` or `"slug with spaces"` would be accepted, which breaks routing or enables path traversal.

Also, `RejectCourseDto` in `src/modules/courses/dto/course-action.dto.ts` has no `@MaxLength` on `feedback`, allowing megabyte-sized strings.

TASK:

1. In `src/modules/courses/dto/create-course.dto.ts`:

Add `Matches` to the class-validator imports:
```typescript
import { ..., Matches } from 'class-validator';
```

Update the `slug` field:
```typescript
@ApiPropertyOptional({ example: 'introduction-to-web-development' })
@IsOptional()
@IsString()
@MaxLength(200)
@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  message: 'Slug must contain only lowercase letters, numbers, and hyphens',
})
slug?: string;
```

2. In `src/modules/courses/dto/course-action.dto.ts`:

Add `MaxLength` to imports if not already there.

Update `RejectCourseDto`:
```typescript
export class RejectCourseDto {
  @ApiProperty({ example: 'Course content needs more detail in section 2' })
  @IsString()
  @MaxLength(2000, { message: 'Feedback must not exceed 2000 characters' })
  feedback: string;
}
```

Add `@MaxLength(500)` to `CreateSectionDto.title`, `CreateSectionDto.description`:
```typescript
@IsString()
@MaxLength(200)
title: string;

@IsOptional()
@IsString()
@MaxLength(2000)
description?: string;
```

Same for `CreateLessonDto.title` and `CreateLessonDto.description`.

3. Add `@IsBoolean()` decorator to `CreateLessonDto.isFreePreview` and `UpdateLessonDto.isFreePreview`:
```typescript
@ApiPropertyOptional({ example: false, default: false })
@IsOptional()
@IsBoolean()
isFreePreview?: boolean;
```

Add `IsBoolean` to imports.

DO NOT:
- Change any field types
- Add or remove fields
- Modify service logic
```

---

### Prompt 3.3: Fix HTML Injection in Notification Emails

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
In `src/modules/notifications/notifications.service.ts`, the `sendEmailNotification` method inserts the `body` parameter directly into HTML:
```typescript
`<p>Hello ${user.name || 'there'},</p><p>${body}</p>`
```

If `body` contains user-generated content (e.g., community mention text), this is an XSS vector in email clients.

TASK:

In `src/modules/notifications/notifications.service.ts`, find the `sendEmailNotification` method (or whatever method builds the email HTML).

Add a simple HTML escape helper at the top of the file (or as a private method):

```typescript
private escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

Then update the HTML construction to escape both `user.name` and `body`:
```typescript
const safeName = this.escapeHtml(user.name || 'there');
const safeBody = this.escapeHtml(body);
// ... use safeName and safeBody in the HTML template
```

Find every place in this file where user-supplied strings are interpolated into HTML and apply `this.escapeHtml()`.

DO NOT:
- Install any new packages (no need for a full sanitization library for emails)
- Change the notification creation logic
- Modify the notification preferences system
- Change method signatures
```

---

### Prompt 3.4: Fix CSV Injection in Access Code Export

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
In `src/modules/access-codes/access-codes.service.ts`, the `export()` method creates CSV data where the `target` field (which is `course.title` or `material.title`) is user-controlled. A course title like `=cmd|'/C calc'!A0` becomes a formula injection in Excel.

TASK:

In `src/modules/access-codes/access-codes.service.ts`, find the `export()` method. Add a CSV sanitization helper as a private method:

```typescript
private sanitizeCsvField(value: string): string {
  if (!value) return value;
  // Prefix with single quote if the value starts with a formula character
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}
```

Then in the `export()` method, sanitize the `target` field:
```typescript
const csvData = codes.map((code) => ({
  code: code.code,
  type: code.type,
  target: this.sanitizeCsvField(code.course?.title || code.material?.title || 'N/A'),
  status: code.status,
  maxRedemptions: code.maxRedemptions,
  currentRedemptions: code.currentRedemptions,
  expiresAt: code.expiresAt?.toISOString() || 'Never',
  createdAt: code.createdAt.toISOString(),
}));
```

DO NOT:
- Change the export format or fields
- Modify other methods
- Change the controller
```

---

## PHASE 4: MISSING FEATURES — COURSE LIFECYCLE (P2)

---

### Prompt 4.1: Add Course Archive and Unpublish Endpoints

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
The `CourseStatus` enum includes `ARCHIVED`, but there is no endpoint to archive or unpublish a course. Once published, a course is stuck in PUBLISHED state forever.

The current status transitions are:
- DRAFT -> PENDING_REVIEW (via submit)
- PENDING_REVIEW -> PUBLISHED (via approve)
- PENDING_REVIEW -> REJECTED (via reject)
Missing: PUBLISHED -> ARCHIVED, PUBLISHED -> DRAFT

TASK:

**Step 1: Add service methods**

In `src/modules/courses/courses.service.ts`, add two new methods:

```typescript
async archive(id: string) {
  const course = await this.prisma.course.findUnique({ where: { id } });

  if (!course) {
    throw new NotFoundException('Course not found');
  }

  if (course.status !== CourseStatus.PUBLISHED) {
    throw new BadRequestException('Only published courses can be archived');
  }

  const updated = await this.prisma.course.update({
    where: { id },
    data: { status: CourseStatus.ARCHIVED },
  });

  return updated;
}

async unpublish(id: string) {
  const course = await this.prisma.course.findUnique({ where: { id } });

  if (!course) {
    throw new NotFoundException('Course not found');
  }

  if (course.status !== CourseStatus.PUBLISHED && course.status !== CourseStatus.ARCHIVED) {
    throw new BadRequestException('Only published or archived courses can be unpublished');
  }

  const updated = await this.prisma.course.update({
    where: { id },
    data: { status: CourseStatus.DRAFT },
  });

  return updated;
}
```

Make sure `CourseStatus` is imported from `@prisma/client`. Make sure `BadRequestException` is imported from `@nestjs/common`.

**Step 2: Add controller endpoints**

In `src/modules/courses/courses.controller.ts`, add:

```typescript
@Put(':id/archive')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@ApiOperation({ summary: 'Archive a published course' })
@ApiResponse({ status: 200, description: 'Course archived' })
async archive(@Param('id') id: string) {
  return this.coursesService.archive(id);
}

@Put(':id/unpublish')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@ApiOperation({ summary: 'Unpublish course back to draft' })
@ApiResponse({ status: 200, description: 'Course unpublished' })
async unpublish(@Param('id') id: string) {
  return this.coursesService.unpublish(id);
}
```

Make sure `Role` is imported from `@prisma/client` and `Roles` is imported from `@/common/decorators`.

DO NOT:
- Change existing status transitions
- Modify the approval workflow
- Add frontend changes
- Change DTOs
```

---

### Prompt 4.2: Persist Course Rejection Feedback and Approval Tracking

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
When a course is rejected, the feedback is returned in the HTTP response but NEVER saved to the database. When approved, there's no record of which admin approved it. This makes the review process un-auditable.

TASK:

**Step 1: Schema changes**

In `prisma/schema.prisma`, add these fields to the `Course` model (after `status`):

```prisma
rejectionFeedback String?   @map("rejection_feedback")
reviewedById      String?   @map("reviewed_by_id")
reviewedAt        DateTime? @map("reviewed_at")
```

Add a relation for `reviewedBy`:
```prisma
reviewedBy    User?   @relation("CourseReviewer", fields: [reviewedById], references: [id])
```

In the `User` model, add the reverse relation:
```prisma
coursesReviewed   Course[]  @relation("CourseReviewer")
```

Run migration:
```bash
cd apps/api
npx prisma migrate dev --name add_course_review_tracking
```

**Step 2: Update service methods**

In `src/modules/courses/courses.service.ts`:

Update `approve()` to accept `reviewerId: string`:
```typescript
async approve(id: string, reviewerId: string) {
```

In the Prisma update inside `approve()`, add:
```typescript
data: {
  status: CourseStatus.PUBLISHED,
  reviewedById: reviewerId,
  reviewedAt: new Date(),
  rejectionFeedback: null, // Clear any previous rejection feedback
},
```

Update `reject()` to accept `reviewerId: string`:
```typescript
async reject(id: string, feedback: string, reviewerId: string) {
```

In the Prisma update inside `reject()`, add:
```typescript
data: {
  status: CourseStatus.REJECTED,
  rejectionFeedback: feedback,
  reviewedById: reviewerId,
  reviewedAt: new Date(),
},
```

**Step 3: Update controller**

In `src/modules/courses/courses.controller.ts`:

Update the `approve` and `reject` endpoints to pass user ID:

```typescript
async approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
  return this.coursesService.approve(id, user.id);
}

async reject(
  @Param('id') id: string,
  @Body() dto: RejectCourseDto,
  @CurrentUser() user: AuthUser,
) {
  return this.coursesService.reject(id, dto.feedback, user.id);
}
```

Add `@CurrentUser() user: AuthUser` parameter and the `CurrentUser` import if not already present.

DO NOT:
- Change the status transition logic
- Remove existing functionality
- Modify unrelated course fields
```

---

## PHASE 5: OPERATIONAL FEATURES (P2-P3)

---

### Prompt 5.1: Add Dashboard Caching and Fix N+1 Trend Queries

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
In `src/modules/dashboard/dashboard.service.ts`, every dashboard request fires 10+ parallel DB queries with no caching. The trend methods (`getEnrollmentTrend`, `getUserGrowthTrend`) execute one query per month in a loop (N+1).

TASK:

**Step 1: Inject cache**

Add to imports:
```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
```

Add to constructor:
```typescript
@Inject(CACHE_MANAGER) private cacheManager: Cache,
```

**Step 2: Add caching to KPIs**

Wrap the `getKPIs()` method with cache:
```typescript
async getKPIs() {
  const cacheKey = 'dashboard:kpis';
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return cached;

  // ... existing KPI logic ...

  const result = { /* existing return object */ };
  await this.cacheManager.set(cacheKey, result, 5 * 60 * 1000); // 5 min TTL
  return result;
}
```

**Step 3: Fix N+1 trend queries**

Find the `getEnrollmentTrend()` method. It currently loops month-by-month with individual queries. Replace it with a single aggregate query:

```typescript
async getEnrollmentTrend(months: number = 6) {
  const cacheKey = `dashboard:enrollment_trend:${months}`;
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return cached;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const results = await this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') as month,
      COUNT(*) as count
    FROM enrollments
    WHERE created_at >= ${startDate}
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month ASC
  `;

  const trend = results.map(r => ({
    month: r.month,
    count: Number(r.count),
  }));

  await this.cacheManager.set(cacheKey, trend, 5 * 60 * 1000);
  return trend;
}
```

Apply the same pattern to `getUserGrowthTrend()`:

```typescript
async getUserGrowthTrend(months: number = 6) {
  const cacheKey = `dashboard:user_trend:${months}`;
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return cached;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const results = await this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') as month,
      COUNT(*) as count
    FROM users
    WHERE created_at >= ${startDate}
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month ASC
  `;

  const trend = results.map(r => ({
    month: r.month,
    count: Number(r.count),
  }));

  await this.cacheManager.set(cacheKey, trend, 5 * 60 * 1000);
  return trend;
}
```

DO NOT:
- Change the dashboard controller
- Modify the response format (keep the same shape)
- Add Redis (use existing in-memory cache)
- Change other dashboard methods that don't have performance issues

VERIFY: The trend methods should now make exactly 1 DB query each instead of N. Repeated dashboard loads within 5 minutes should return cached data.
```

---

### Prompt 5.2: Add Expired Token Cleanup Cron Job

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
Expired refresh tokens and verification tokens accumulate in the database indefinitely. There is no background job to purge them.

The project already has `@nestjs/schedule` imported and `ScheduleModule.forRoot()` registered in `src/app.module.ts`.

TASK:

Create a new file `src/modules/auth/auth-cleanup.cron.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AuthCleanupCron {
  private readonly logger = new Logger(AuthCleanupCron.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Clean up expired refresh tokens every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupExpiredRefreshTokens() {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired refresh tokens', error);
    }
  }

  /**
   * Clean up expired/used verification tokens every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredVerificationTokens() {
    try {
      const result = await this.prisma.verificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { usedAt: { not: null } },
          ],
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired/used verification tokens`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup verification tokens', error);
    }
  }

  /**
   * Clean up old notifications (older than 90 days) every week
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldNotifications() {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const result = await this.prisma.notification.deleteMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
          isRead: true,
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} old read notifications`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old notifications', error);
    }
  }
}
```

Then register it in the auth module. Open `src/modules/auth/auth.module.ts` and add `AuthCleanupCron` to the `providers` array:

```typescript
import { AuthCleanupCron } from './auth-cleanup.cron';

@Module({
  // ...
  providers: [AuthService, JwtStrategy, AuthCleanupCron],
})
```

DO NOT:
- Change the ScheduleModule configuration
- Modify the AppModule
- Delete non-expired tokens
- Change existing service methods
```

---

### Prompt 5.3: Add Stream Enrollment Check in joinStream

```
You are working on a NestJS API at: E:\fis-learn\apps\api

PROBLEM:
In `src/modules/streaming/streaming.service.ts`, the `joinStream()` method has NO enrollment check. Any authenticated user can join any stream by ID. The `getStream()` method checks enrollment, but `joinStream()` does not.

CURRENT CODE:
```typescript
async joinStream(streamId: string, userId: string) {
  const existingViewer = await this.prisma.streamViewer.findFirst({
    where: { streamId, userId },
  });
  // ... creates viewer record without any access check
```

TASK:

In `src/modules/streaming/streaming.service.ts`, update `joinStream()` to verify enrollment:

```typescript
async joinStream(streamId: string, userId: string) {
  // Verify stream exists and get course info
  const stream = await this.prisma.courseStream.findUnique({
    where: { id: streamId },
    select: { id: true, courseId: true, instructorId: true, status: true },
  });

  if (!stream) {
    throw new NotFoundException('Stream not found');
  }

  if (stream.status === 'ENDED') {
    throw new BadRequestException('This stream has ended');
  }

  // Instructors can always join their own streams
  if (stream.instructorId !== userId && stream.courseId) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: stream.courseId,
        status: 'ACTIVE',
      },
    });

    if (!enrollment) {
      throw new UnauthorizedException('You must be enrolled in this course to join the stream');
    }
  }

  // Check if already joined
  const existingViewer = await this.prisma.streamViewer.findFirst({
    where: { streamId, userId },
  });

  if (existingViewer) {
    return this.prisma.streamViewer.update({
      where: { id: existingViewer.id },
      data: { rejoinedAt: new Date() },
    });
  }

  return this.prisma.streamViewer.create({
    data: { streamId, userId },
  });
}
```

Add `BadRequestException` to the imports from `@nestjs/common` if not already there.

DO NOT:
- Change `getStream()`, `leaveStream()`, or other methods
- Modify the streaming controller
- Change the Prisma schema
```

---

## PHASE 6: VERIFICATION CHECKLIST

After all phases are complete, run these verification steps:

```
Prompt for Kimi 2.5:

You are working on a NestJS API at: E:\fis-learn\apps\api

Run the following verification checklist. For each item, report PASS or FAIL:

1. Build check:
   ```bash
   npx prisma generate && npx tsc --noEmit
   ```
   Expected: No compilation errors

2. Migration check:
   ```bash
   npx prisma migrate status
   ```
   Expected: All migrations applied, no pending

3. Verify AuditLogService is wired:
   - Check that `CommonModule` exists at `src/common/common.module.ts`
   - Check that `CommonModule` is imported in `src/app.module.ts`
   - Check that `AuditLogService` is injected in `UsersService`, `CoursesService`, `AuthService`

4. Verify password validation:
   - Check that `src/modules/users/users.controller.ts` `changePassword` uses `ChangePasswordDto` (not inline type)

5. Verify soft delete:
   - Check that `User` and `Course` models have `deletedAt` field in schema
   - Check that `users.service.ts` `delete()` uses `.update()` not `.delete()`
   - Check that `findAll()` includes `deletedAt: null` in where clause

6. Verify login brute-force protection:
   - Check that `auth.service.ts` has `checkLoginAttempts`, `recordFailedLogin`, `clearLoginAttempts` methods
   - Check that `login()` calls them in correct order

7. Verify course ownership:
   - Check that `courses.service.ts` has `verifyCourseOwnership` method
   - Check that section/lesson CRUD methods call it

8. Verify draft course protection:
   - Check that `findBySlug()` has status check for non-admin users

Report each check as PASS/FAIL with a one-line explanation if FAIL.
```

---

## Execution Order Summary

| Phase | Prompts | Priority | Estimated Scope |
|-------|---------|----------|-----------------|
| **Phase 1** | 1.1 - 1.6 | P0 Critical | Auth, Users, Courses services + controllers |
| **Phase 2** | 2.1 - 2.5 | P1 High | Schema migrations, Services |
| **Phase 3** | 3.1 - 3.4 | P2 Medium | DTOs, Notifications, Access Codes |
| **Phase 4** | 4.1 - 4.2 | P2 Medium | Course lifecycle endpoints |
| **Phase 5** | 5.1 - 5.3 | P2-P3 | Dashboard, Cron, Streaming |
| **Phase 6** | Verification | - | Build + functional checks |

> **Important**: Run Phase 1 prompts in order (1.1 -> 1.2 -> ... -> 1.6). Phase 2 depends on Phase 1 completing (especially 2.1 soft delete depends on 1.3 audit logging being wired). Phases 3-5 can run in parallel after Phase 2.
