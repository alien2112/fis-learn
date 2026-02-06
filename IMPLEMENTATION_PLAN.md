# FIS-Learn: Complete Implementation Plan

> **Purpose:** Detailed, prompt-ready plan for completing all missing features.
> Each phase has context, file paths, and a copy-paste prompt for AI execution.
>
> **Codebase:** NestJS API + Next.js admin + Next.js web (pnpm monorepo with Turbo)
> **Database:** PostgreSQL via Prisma ORM
> **Auth:** JWT in httpOnly cookies
> **Real-time:** Socket.IO
> **Payments:** Stripe

---

## Table of Contents

1. [Phase 1: Code Editor — Wire Frontend to Backend](#phase-1)
2. [Phase 2: Socket.IO Redis Adapter](#phase-2)
3. [Phase 3: Video Upload & Player Components](#phase-3)
4. [Phase 4: Live Streaming Backend Module](#phase-4)
5. [Phase 5: Notification System (Full Build)](#phase-5)
6. [Phase 6: Course Lifecycle Emails](#phase-6)
7. [Phase 7: AI Chatbot — Public Pages](#phase-7)
8. [Phase 8: AI Chatbot — Student Guide](#phase-8)
9. [Phase 9: Remaining Fixes & Polish](#phase-9)

---

<a name="phase-1"></a>
## Phase 1: Code Editor — Wire Frontend to Backend

### Context
The backend has a complete Judge0 integration with 15+ endpoints for code execution and exercise management. The frontend has a beautiful `LiveCodeEditor` component with line numbers, syntax highlighting, output tabs, and fullscreen mode — but **the lesson page uses a plain `<textarea>` instead**. The editor component is never imported. No frontend code calls the execution API.

### Files to Modify
- `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx` — replace textarea with LiveCodeEditor
- `apps/web/src/components/code-editor/LiveCodeEditor.tsx` — may need minor API response mapping
- `apps/web/src/components/code-editor/index.tsx` — barrel export

### Files to Read First (for context)
- `apps/api/src/modules/code-execution/code-execution.controller.ts` — execution endpoints
- `apps/api/src/modules/code-execution/code-exercise.controller.ts` — exercise/submission endpoints
- `apps/api/src/modules/code-execution/dto/index.ts` — request/response shapes
- `apps/web/src/components/code-editor/LiveCodeEditor.tsx` — existing component API (props: `onRun`, `onSubmit`, `language`, `initialCode`, etc.)

### Prompt

```
You are working on E:\fis-learn, a pnpm monorepo with a NestJS API and Next.js web app.

TASK: Wire the code editor frontend to the backend execution API.

CONTEXT:
- The backend at `apps/api/src/modules/code-execution/` has full Judge0 integration
- Key endpoints (all require auth via httpOnly cookies):
  - POST /api/v1/code-execution/execute — body: { languageId, sourceCode, stdin? } → returns { id, status, stdout, stderr, executionTime, memoryUsed }
  - POST /api/v1/code-exercises/:exerciseId/submit — body: { code } → returns { status, testsPassed, testsTotal, pointsEarned, stdout, stderr }
  - GET /api/v1/code-exercises/lesson/:lessonId — returns exercises for a lesson
  - GET /api/v1/code-exercises/:id/my-submissions — returns submission history
  - GET /api/v1/code-execution/languages — returns supported languages
- The frontend has `LiveCodeEditor` component at `apps/web/src/components/code-editor/LiveCodeEditor.tsx` with props:
  - `initialCode: string`
  - `language: string`
  - `onRun: (code: string) => Promise<{ output: string; error?: string; executionTime?: number }>`
  - `onSubmit?: (code: string) => Promise<void>`
  - `readOnly?: boolean`
- The lesson page at `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx` currently uses a plain <textarea> for code exercises

STEPS:
1. Read the lesson page file completely to understand current structure
2. Read the LiveCodeEditor component to understand its prop interface
3. Read the code-execution controller to understand API response shapes
4. Modify the lesson page to:
   a. Import LiveCodeEditor from '@/components/code-editor'
   b. Replace the plain <textarea> with <LiveCodeEditor>
   c. Implement the `onRun` callback that calls POST /api/v1/code-execution/execute with credentials: 'include', mapping the response to { output: stdout || stderr, error: stderr, executionTime }
   d. Implement the `onSubmit` callback that calls POST /api/v1/code-exercises/{exerciseId}/submit with credentials: 'include', then refreshes the submission result display
   e. Pass the exercise's starterCode as initialCode and languageId as language
5. Add a submission history section below the editor that fetches from GET /api/v1/code-exercises/{exerciseId}/my-submissions and displays past submissions with status, score, and timestamp
6. Add test case display — fetch exercise details which include testCases (non-hidden ones) and show input/expected output
7. Add "Next Lesson" / "Previous Lesson" navigation buttons at the bottom of the page

IMPORTANT:
- All fetch calls must include `credentials: 'include'` (auth is via httpOnly cookies)
- The API wraps responses in { success: true, data: ... } format
- Do NOT create new files unless absolutely necessary — edit existing files
- Keep the existing lesson content rendering (video, PDF) — only enhance the code exercise section
```

---

<a name="phase-2"></a>
## Phase 2: Socket.IO Redis Adapter

### Context
The community chat gateway uses in-memory message buckets for rate limiting. This means if you run 2+ API server instances, messages won't broadcast across servers and rate limits won't be shared. Need to install `@socket.io/redis-adapter` and wire it.

### Files to Modify
- `apps/api/src/modules/community/community.gateway.ts` — add Redis adapter
- `apps/api/src/modules/community/community.module.ts` — inject Redis

### Prompt

```
You are working on E:\fis-learn, a pnpm monorepo with a NestJS API.

TASK: Add Socket.IO Redis adapter to the community chat gateway for multi-instance scaling.

CONTEXT:
- The community gateway is at `apps/api/src/modules/community/community.gateway.ts`
- It uses Socket.IO namespace `/community` with CORS configured
- Current rate limiting uses an in-memory Map (`messageBuckets`)
- Redis is already configured in the project:
  - RedisService at `apps/api/src/common/redis/redis.service.ts` uses ioredis
  - Redis URL from config: `this.configService.get<string>('redis.url')`
  - Redis is available in docker-compose
- The gateway currently has: @WebSocketGateway({ namespace: '/community', cors: { ... } })

STEPS:
1. Install the Redis adapter: run `pnpm --filter api add @socket.io/redis-adapter`
2. Read the current community.gateway.ts and community.module.ts
3. Modify community.module.ts to:
   a. Import IoRedisAdapter from '@socket.io/redis-adapter'
   b. Import Redis from 'ioredis'
   c. Create a provider that creates pub/sub Redis clients
4. Modify community.gateway.ts to:
   a. Inject ConfigService
   b. In afterInit(server: Server), create Redis pub/sub clients and call `server.adapter(createAdapter(pubClient, subClient))`
   c. Replace the in-memory `messageBuckets` Map with Redis-based rate limiting:
     - Use INCR + EXPIRE pattern: key = `rate:community:${userId}`, TTL = 10 seconds, limit = 6
     - This ensures rate limits are shared across instances
5. Make sure the gateway still works with the existing handleConnection/handleDisconnect lifecycle

IMPORTANT:
- Use ioredis (already a dependency) not the 'redis' package
- The Redis URL comes from ConfigService: `this.configService.get<string>('redis.url')` which defaults to redis://localhost:6379
- Don't break existing functionality — rate limit behavior should be identical (6 messages per 10 seconds per user)
```

---

<a name="phase-3"></a>
## Phase 3: Video Upload & Player Components

### Context
The backend has a complete Mux integration (`apps/api/src/modules/video/video.service.ts` — 655 lines) supporting direct upload, URL upload, DRM, watermarking, signed playback URLs, subtitles, and analytics. BUT there are **zero frontend components** for video upload or playback. Lessons that have video content show a basic iframe for YouTube or a placeholder for video assets.

### Files to Create
- `apps/web/src/components/video/VideoPlayer.tsx` — Mux player component
- `apps/web/src/components/video/VideoUpload.tsx` — upload component (for admin/instructor use)
- `apps/web/src/components/video/index.ts` — barrel export

### Files to Modify
- `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx` — use VideoPlayer for video lessons
- `apps/admin/src/app/(admin)/courses/[id]/page.tsx` — add video upload in lesson editor

### Prompt

```
You are working on E:\fis-learn, a pnpm monorepo with NestJS API + Next.js web + Next.js admin.

TASK: Build video player and upload components, integrate them into lessons and admin.

CONTEXT:
- Backend video service at `apps/api/src/modules/video/video.service.ts` has:
  - POST /api/v1/video/upload/direct — returns { uploadUrl, assetId } for client-side upload to Mux
  - POST /api/v1/video/upload/url — body: { url, title } for server-side upload
  - GET /api/v1/video/assets/:id/playback — returns { playbackUrl, token, expiresAt } (signed URL, 1hr expiry)
  - GET /api/v1/video/assets/:id — returns asset metadata
  - POST /api/v1/video/assets/:id/subtitles — returns available subtitles
  - GET /api/v1/video/assets — list all video assets
- Video controller at `apps/api/src/modules/video/video.controller.ts`
- Mux uses HLS streaming. Playback URLs look like: `https://stream.mux.com/{playbackId}.m3u8?token={jwt}`
- The lesson page currently shows an iframe for YouTube URLs or a "Secure video asset" placeholder
- Material model has: contentType (VIDEO/PDF/QUIZ/ASSIGNMENT), youtubeUrl, videoAssetId, fileUrl
- All API calls use httpOnly cookies (credentials: 'include')

STEPS:
1. Install Mux player: run `pnpm --filter web add @mux/mux-player-react`

2. Create `apps/web/src/components/video/VideoPlayer.tsx`:
   - Props: { assetId: string; title?: string; onProgress?: (percent: number) => void }
   - On mount, fetch playback URL from GET /api/v1/video/assets/{assetId}/playback (credentials: 'include')
   - Use @mux/mux-player-react's MuxPlayer component with the playback token
   - Handle loading state with skeleton
   - Handle error state (expired token, asset not ready)
   - Track video progress — call onProgress callback at 25%, 50%, 75%, 90% marks
   - Support subtitles if available

3. Create `apps/web/src/components/video/VideoUpload.tsx`:
   - Props: { onUploadComplete: (assetId: string) => void; courseId: string }
   - Two upload modes:
     a. Direct upload: Call POST /api/v1/video/upload/direct to get upload URL, then use fetch to PUT the file directly to Mux's URL, show progress bar
     b. URL import: Text input for YouTube/video URL, calls POST /api/v1/video/upload/url
   - Show upload progress with a progress bar
   - Show status: Uploading → Processing → Ready
   - Display thumbnail when ready

4. Create barrel export `apps/web/src/components/video/index.ts`

5. Modify the lesson page (`apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx`):
   - Import VideoPlayer
   - In the VIDEO content section, check if material has videoAssetId → render <VideoPlayer assetId={material.videoAssetId} />
   - If material has youtubeUrl instead → keep existing iframe
   - If neither → show "Video not available" message

6. Modify the admin course editor (`apps/admin/src/app/(admin)/courses/[id]/page.tsx`):
   - Read this file first to understand the lesson editing UI
   - In the lesson editor dialog/form, add a VideoUpload component for VIDEO type lessons
   - When upload completes, save the assetId to the lesson's material via PUT /api/v1/courses/{courseId}/lessons/{lessonId}

IMPORTANT:
- All API calls must use credentials: 'include'
- Mux player needs the playback token passed as `playback-id` and `tokens.playback` props
- The video service returns signed URLs that expire in 1 hour — handle token refresh if user watches longer
- Use 'use client' directive for all new components
```

---

<a name="phase-4"></a>
## Phase 4: Live Streaming Backend Module

### Context
The streaming module is **commented out** in app.module.ts (line 78: "TODO: Add back after prisma migrate"). The Prisma schema already has `LiveClass`, `LiveClassAttendee`, `CourseStream`, `StreamViewer` models. The frontend has a ZegoCloud component (`ZegoStreamingRoom.tsx`) that works but uses **hardcoded fake tokens** — a security risk. Need to build the backend module and secure token generation.

### Files to Create
- `apps/api/src/modules/streaming/streaming.module.ts`
- `apps/api/src/modules/streaming/streaming.service.ts`
- `apps/api/src/modules/streaming/streaming.controller.ts`
- `apps/api/src/modules/streaming/dto/` — DTOs

### Files to Modify
- `apps/api/src/app.module.ts` — uncomment/add StreamingModule
- `apps/web/src/components/streaming/ZegoStreamingRoom.tsx` — use real tokens
- `.env.example` — add ZEGO env vars

### Prompt

```
You are working on E:\fis-learn, a pnpm monorepo with NestJS API + Next.js web.

TASK: Build the live streaming backend module and secure the frontend with real tokens.

CONTEXT:
- Prisma schema has these models (already migrated, tables exist):
  - LiveClass: { id, title, description, courseId?, instructorId, startAt, durationMinutes, timezone, status (UPCOMING/LIVE/ENDED/CANCELLED), capacity, streamProvider, providerStreamId, streamKey, rtmpUrl, playbackHlsUrl, meetingUrl, recordingUrl, peakViewers, totalViewers, actualStartAt, actualEndAt }
  - LiveClassAttendee: { id, liveClassId, userId, joinedAt, leftAt }
  - CourseStream: { id, roomId (unique), courseId, instructorId, title, status (SCHEDULED/LIVE/ENDED), scheduledAt, startedAt, endedAt, viewerCount, streamId }
  - StreamViewer: { id, streamId, userId, joinedAt, rejoinedAt?, leftAt? }
- Environment vars available: ZEGO_APP_ID, ZEGO_SERVER_SECRET
- Frontend component at `apps/web/src/components/streaming/ZegoStreamingRoom.tsx` currently hardcodes:
  - appID: 1765136310
  - server: 'wss://webliveroom1765136310-api.zego.im/ws'
  - token: 'token-' + Date.now() (FAKE — security risk)
- The StreamingModule import is commented out in app.module.ts

STEPS:
1. Create `apps/api/src/modules/streaming/dto/` with these DTOs:
   - CreateLiveClassDto: { title, description?, courseId?, startAt (ISO string), durationMinutes?, capacity? }
   - UpdateLiveClassDto: Partial<CreateLiveClassDto> + { status? }
   - JoinStreamDto: { roomId }

2. Create `apps/api/src/modules/streaming/streaming.service.ts`:
   - Inject PrismaService, ConfigService
   - createLiveClass(instructorId, dto): Create LiveClass record + create CourseStream with unique roomId (use cuid)
   - getLiveClasses(courseId?): List upcoming/live classes
   - getLiveClass(id): Get single class with attendee count
   - startStream(classId, instructorId): Update status to LIVE, set actualStartAt, create/update CourseStream
   - endStream(classId, instructorId): Update status to ENDED, set actualEndAt, update CourseStream
   - joinStream(roomId, userId): Create StreamViewer record, increment CourseStream.viewerCount, create LiveClassAttendee
   - leaveStream(roomId, userId): Set leftAt on StreamViewer, decrement viewerCount
   - generateZegoToken(userId, roomId): Generate a ZegoCloud token using the server secret
     - ZegoCloud token generation: Use the @zegocloud/zego-server-assistant npm package
     - Call generateToken04(appId, odId, serverSecret, effectiveTimeInSeconds, payload)
     - effectiveTimeInSeconds = 3600 (1 hour)
   - cancelLiveClass(classId, instructorId): Set status to CANCELLED

3. Create `apps/api/src/modules/streaming/streaming.controller.ts`:
   - POST /streaming/classes — createLiveClass (INSTRUCTOR/ADMIN only)
   - GET /streaming/classes — listLiveClasses (any authenticated user)
   - GET /streaming/classes/:id — getLiveClass
   - POST /streaming/classes/:id/start — startStream (INSTRUCTOR only)
   - POST /streaming/classes/:id/end — endStream (INSTRUCTOR only)
   - DELETE /streaming/classes/:id — cancelLiveClass (INSTRUCTOR only)
   - POST /streaming/join — joinStream, returns { token, roomId, server }
   - POST /streaming/leave — leaveStream
   - Use @ApiBearerAuth(), @Roles() decorators, @CurrentUser() for user extraction

4. Create `apps/api/src/modules/streaming/streaming.module.ts`:
   - Import PrismaModule, JwtModule
   - Provide StreamingService
   - Export StreamingController

5. Modify `apps/api/src/app.module.ts`:
   - Import StreamingModule (replace the commented-out line)

6. Install Zego server helper: run `pnpm --filter api add @zegocloud/zego-server-assistant`

7. Add to .env.example:
   - ZEGO_APP_ID=your_app_id
   - ZEGO_SERVER_SECRET=your_server_secret

8. Add to `apps/api/src/config/configuration.ts`:
   - zego: { appId: parseInt(process.env.ZEGO_APP_ID), serverSecret: process.env.ZEGO_SERVER_SECRET }

9. Modify `apps/web/src/components/streaming/ZegoStreamingRoom.tsx`:
   - Remove hardcoded appID, server, and token
   - Add props: { roomId: string; token: string; appId: number; server: string; userId: string; userName: string; role: 'Host' | 'Cohost' | 'Audience' }
   - Use props instead of hardcoded values

10. Create or modify a stream page at `apps/web/src/app/[locale]/stream/[roomId]/page.tsx`:
    - On mount, call POST /api/v1/streaming/join { roomId } with credentials: 'include'
    - Receive { token, roomId, server, appId }
    - Pass to ZegoStreamingRoom component
    - On unmount/close, call POST /api/v1/streaming/leave

IMPORTANT:
- Use Roles decorator from '@/common/decorators' for authorization
- Use CurrentUser decorator to get user from JWT
- All API calls from frontend use credentials: 'include'
- The Prisma models already exist — do NOT modify the schema, just use the existing models
```

---

<a name="phase-5"></a>
## Phase 5: Notification System (Full Build)

### Context
There is **no notification system** at all. No database model, no API, no UI. The email service exists and works for auth/payment emails, but there are no in-app notifications. This phase builds the complete system: database model, backend service with real-time delivery via Socket.IO, REST API, and frontend notification center with bell icon.

### Files to Create
**Backend:**
- `apps/api/prisma/migrations/[timestamp]_add_notifications/migration.sql` (via prisma migrate)
- `apps/api/src/modules/notifications/notifications.module.ts`
- `apps/api/src/modules/notifications/notifications.service.ts`
- `apps/api/src/modules/notifications/notifications.controller.ts`
- `apps/api/src/modules/notifications/notifications.gateway.ts` (Socket.IO for real-time)
- `apps/api/src/modules/notifications/dto/`

**Frontend (Web):**
- `apps/web/src/components/notifications/NotificationBell.tsx`
- `apps/web/src/components/notifications/NotificationCenter.tsx`
- `apps/web/src/components/notifications/NotificationItem.tsx`
- `apps/web/src/lib/realtime/notification-socket.ts`

**Frontend (Admin):**
- `apps/admin/src/components/notifications/NotificationBell.tsx`
- `apps/admin/src/components/notifications/NotificationCenter.tsx`

### Prompt

```
You are working on E:\fis-learn, a pnpm monorepo with NestJS API + Next.js admin + Next.js web.

TASK: Build a complete in-app notification system with real-time delivery.

CONTEXT:
- Database: PostgreSQL via Prisma ORM. Schema at apps/api/prisma/schema.prisma
- Real-time: Socket.IO already used for community chat (namespace /community)
- Auth: JWT in httpOnly cookies. Use @CurrentUser() decorator to get authenticated user
- Existing models: User (id, email, name, role), Course, Enrollment, Lesson, LiveClass
- There is NO notification model, service, or UI currently
- The community gateway pattern at apps/api/src/modules/community/community.gateway.ts is a good reference for Socket.IO implementation
- Response format: All API responses are wrapped in { success: true, data: ... } by TransformInterceptor

STEPS:

### Step 1: Database Schema

Add this model to the Prisma schema at `apps/api/prisma/schema.prisma`:

model Notification {
  id          String             @id @default(cuid())
  userId      String             @map("user_id")
  type        NotificationType
  title       String
  body        String
  data        Json?              // Arbitrary payload (courseId, lessonId, etc.)
  isRead      Boolean            @default(false) @map("is_read")
  readAt      DateTime?          @map("read_at")
  createdAt   DateTime           @default(now()) @map("created_at")

  user        User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("notifications")
}

model NotificationPreference {
  id              String   @id @default(cuid())
  userId          String   @unique @map("user_id")
  emailEnabled    Boolean  @default(true) @map("email_enabled")
  pushEnabled     Boolean  @default(true) @map("push_enabled")
  inAppEnabled    Boolean  @default(true) @map("in_app_enabled")
  // Granular controls
  courseUpdates   Boolean  @default(true) @map("course_updates")
  communityReplies Boolean @default(true) @map("community_replies")
  liveClassAlerts Boolean  @default(true) @map("live_class_alerts")
  promotions      Boolean  @default(true) @map("promotions")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notification_preferences")
}

Add this enum:

enum NotificationType {
  // Course
  COURSE_ENROLLED
  COURSE_COMPLETED
  COURSE_UPDATED
  LESSON_REMINDER
  // Community
  COMMUNITY_REPLY
  COMMUNITY_MENTION
  MESSAGE_PINNED
  // Live
  LIVE_CLASS_STARTING
  LIVE_CLASS_REMINDER
  // Submissions
  SUBMISSION_GRADED
  ASSIGNMENT_FEEDBACK
  // System
  SYSTEM_ANNOUNCEMENT
  ACHIEVEMENT_UNLOCKED
  STREAK_MILESTONE
}

Add relations to the User model:
  notifications          Notification[]
  notificationPreference NotificationPreference?

Then run: pnpm --filter api exec prisma migrate dev --name add_notifications

### Step 2: Backend Service

Create `apps/api/src/modules/notifications/notifications.service.ts`:

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(EMAIL_SERVICE) private emailService: EmailService,
  ) {}

  // Create notification and trigger real-time delivery
  async create(userId: string, type: NotificationType, title: string, body: string, data?: any): Promise<Notification>
    - Insert into DB
    - Check NotificationPreference for this user (default: all enabled)
    - If inAppEnabled: emit to Socket.IO room `user:{userId}` via the NotificationsGateway
    - If emailEnabled: send email via emailService (non-blocking, catch errors)
    - Return the notification

  // Create notification for multiple users at once
  async createBulk(userIds: string[], type: NotificationType, title: string, body: string, data?: any): Promise<void>
    - Use createMany for DB insert
    - Emit to each user's Socket.IO room

  // Get paginated notifications for a user
  async getNotifications(userId: string, page: number, limit: number, unreadOnly?: boolean): Promise<{ notifications: Notification[], total: number, unreadCount: number }>

  // Get unread count
  async getUnreadCount(userId: string): Promise<number>

  // Mark single notification as read
  async markAsRead(userId: string, notificationId: string): Promise<void>

  // Mark all as read
  async markAllAsRead(userId: string): Promise<void>

  // Delete a notification
  async delete(userId: string, notificationId: string): Promise<void>

  // Get/update preferences
  async getPreferences(userId: string): Promise<NotificationPreference>
  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<NotificationPreference>
    - Upsert pattern (create if not exists)
}

### Step 3: Socket.IO Gateway

Create `apps/api/src/modules/notifications/notifications.gateway.ts`:

@WebSocketGateway({ namespace: '/notifications', cors: { origin: [...], credentials: true } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // On connection: authenticate via cookie (same pattern as community gateway), join room `user:{userId}`
  async handleConnection(client: Socket) {
    - Extract JWT from cookie or auth header (same as community gateway)
    - Verify JWT
    - client.join(`user:${payload.sub}`)
    - client.data.userId = payload.sub
  }

  // Public method for NotificationsService to call
  sendToUser(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  sendUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('notification:count', { count });
  }
}

### Step 4: Controller

Create `apps/api/src/modules/notifications/notifications.controller.ts`:

@Controller({ path: 'notifications', version: '1' })
- GET /notifications — getNotifications(page, limit, unreadOnly) — paginated list
- GET /notifications/unread-count — getUnreadCount
- PATCH /notifications/:id/read — markAsRead
- POST /notifications/read-all — markAllAsRead
- DELETE /notifications/:id — delete
- GET /notifications/preferences — getPreferences
- PUT /notifications/preferences — updatePreferences

### Step 5: Module

Create `apps/api/src/modules/notifications/notifications.module.ts`:
- Import PrismaModule, JwtModule, forwardRef(() => CommunityModule) if needed
- Provide NotificationsService, NotificationsGateway
- Export NotificationsService (so other modules can inject it to send notifications)
- Register in app.module.ts

### Step 6: Frontend — Notification Socket

Create `apps/web/src/lib/realtime/notification-socket.ts`:
- Connect to /notifications namespace with { withCredentials: true, transports: ['websocket'] }
- Export createNotificationSocket() function

### Step 7: Frontend — NotificationBell Component

Create `apps/web/src/components/notifications/NotificationBell.tsx`:
- 'use client'
- Show bell icon (use lucide-react Bell icon)
- Display unread count badge (red circle with number)
- On mount: fetch GET /api/v1/notifications/unread-count (credentials: 'include')
- Connect to notification socket, listen for 'notification:count' to update badge
- Listen for 'notification:new' to show a toast/popup
- On click: toggle NotificationCenter dropdown

### Step 8: Frontend — NotificationCenter Component

Create `apps/web/src/components/notifications/NotificationCenter.tsx`:
- Dropdown panel (absolute positioned, 380px wide, max-height 480px with scroll)
- Header: "Notifications" title + "Mark all as read" button
- Fetch GET /api/v1/notifications?page=1&limit=20 (credentials: 'include')
- Render NotificationItem for each notification
- "Load more" button for pagination
- Empty state: "No notifications yet"

### Step 9: Frontend — NotificationItem Component

Create `apps/web/src/components/notifications/NotificationItem.tsx`:
- Show: icon (based on type), title, body (truncated), time ago
- Unread items have blue dot + slightly different background
- Click: mark as read (PATCH /api/v1/notifications/{id}/read), navigate to relevant page using data (e.g., data.courseSlug → /courses/{slug})
- Swipe/button to delete

### Step 10: Integrate into Layout

Modify `apps/web/src/components/layout/header.tsx`:
- Import NotificationBell
- Add it to the header navigation bar (next to user avatar/menu)
- Only show when user is authenticated

Do the same for `apps/admin/src/components/layout/header.tsx`

IMPORTANT:
- All API calls use credentials: 'include' (httpOnly cookie auth)
- Export NotificationsService from the module so other modules (courses, community, streaming) can inject it to send notifications
- Socket.IO gateway must authenticate via httpOnly cookie (same pattern as community.gateway.ts)
- Notification types should use an enum matching the Prisma enum
- The gateway should be resilient — if no socket connection, notifications still persist in DB
```

---

<a name="phase-6"></a>
## Phase 6: Course Lifecycle Emails & Notification Triggers

### Context
Now that the notification system exists (Phase 5), wire it into course events, community replies, and live class reminders. Also fix the missing instructor rejection feedback email.

### Files to Modify
- `apps/api/src/modules/courses/courses.service.ts` — add notification triggers
- `apps/api/src/modules/courses/courses.module.ts` — inject NotificationsService
- `apps/api/src/modules/community/community.service.ts` — notify on reply
- `apps/api/src/modules/analytics/analytics-cron.service.ts` — add live class reminder cron
- `apps/api/src/modules/streaming/streaming.service.ts` — notify on stream start

### Prompt

```
You are working on E:\fis-learn, a pnpm monorepo with NestJS API.

TASK: Wire the notification system into course, community, and streaming events.

PREREQUISITES: Phase 5 (Notification System) must be complete. The NotificationsService is injectable and exported from NotificationsModule.

CONTEXT:
- NotificationsService has: create(userId, type, title, body, data?), createBulk(userIds[], type, title, body, data?)
- NotificationType enum includes: COURSE_ENROLLED, COURSE_COMPLETED, COURSE_UPDATED, COMMUNITY_REPLY, COMMUNITY_MENTION, LIVE_CLASS_STARTING, LIVE_CLASS_REMINDER, SUBMISSION_GRADED, SYSTEM_ANNOUNCEMENT
- Courses service at apps/api/src/modules/courses/courses.service.ts has:
  - enrollStudent() method — currently returns enrollment without notification
  - checkCourseCompletion() or updateEnrollmentProgress() — marks course COMPLETED
  - rejectCourse(courseId, feedback) — has TODO comment for sending notification to instructor
  - submitForReview() — submits course for admin review
- Community service at apps/api/src/modules/community/community.service.ts has:
  - createMessage() — creates messages/replies
- Analytics cron at apps/api/src/modules/analytics/analytics-cron.service.ts has scheduled jobs
- Email service has templates: COURSE_ENROLLED, LIVE_CLASS_REMINDER (defined in EmailTemplateType)

STEPS:

### Step 1: Courses Module

Read and modify `apps/api/src/modules/courses/courses.module.ts`:
- Import NotificationsModule
- The service needs NotificationsService injected

Read and modify `apps/api/src/modules/courses/courses.service.ts`:
- Inject NotificationsService in constructor

a) After successful enrollment (in the method that creates Enrollment):
   await this.notificationsService.create(
     userId,
     'COURSE_ENROLLED',
     'Enrolled Successfully',
     `You've been enrolled in "${course.title}". Start learning now!`,
     { courseId: course.id, courseSlug: course.slug }
   );

b) After course completion (where enrollment status is set to COMPLETED):
   await this.notificationsService.create(
     userId,
     'COURSE_COMPLETED',
     'Course Completed!',
     `Congratulations! You've completed "${course.title}".`,
     { courseId: course.id, courseSlug: course.slug }
   );

c) In the course rejection method (find the TODO comment):
   - Replace the TODO with:
   await this.notificationsService.create(
     course.createdById,
     'COURSE_UPDATED',
     'Course Review Feedback',
     `Your course "${course.title}" needs revisions: ${feedback}`,
     { courseId: course.id }
   );

d) When a course is submitted for review, notify admins:
   const admins = await this.prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { id: true } });
   await this.notificationsService.createBulk(
     admins.map(a => a.id),
     'SYSTEM_ANNOUNCEMENT',
     'Course Pending Review',
     `"${course.title}" has been submitted for review.`,
     { courseId: course.id }
   );

e) When a course is approved/published, notify enrolled students:
   const enrollments = await this.prisma.enrollment.findMany({ where: { courseId }, select: { userId: true } });
   // Only if course was previously published and got updated content
   // For initial publish, no students are enrolled yet

### Step 2: Community Module

Read and modify `apps/api/src/modules/community/community.module.ts`:
- Import NotificationsModule

Read and modify `apps/api/src/modules/community/community.service.ts`:
- Inject NotificationsService

In createMessage():
- If the message is a reply (has parentId):
  - Look up the parent message's authorId
  - If the reply author !== parent author:
    await this.notificationsService.create(
      parentMessage.authorId,
      'COMMUNITY_REPLY',
      'New Reply',
      `${replyAuthor.name} replied to your message in ${channel.name}`,
      { channelId: message.channelId, messageId: message.id, courseId: channel.courseId }
    );

### Step 3: Live Class Reminder Cron

Read and modify `apps/api/src/modules/analytics/analytics-cron.service.ts`:
- Inject NotificationsService and PrismaService

Add a new cron job (runs every 15 minutes):
@Cron('0 */15 * * * *')
async sendLiveClassReminders() {
  // Find live classes starting in the next 30 minutes that haven't been reminded
  const now = new Date();
  const thirtyMinFromNow = new Date(now.getTime() + 30 * 60000);

  const upcomingClasses = await this.prisma.liveClass.findMany({
    where: {
      startAt: { gte: now, lte: thirtyMinFromNow },
      status: 'UPCOMING',
    },
    include: {
      course: {
        include: {
          enrollments: { select: { userId: true }, where: { status: 'ACTIVE' } }
        }
      }
    }
  });

  for (const liveClass of upcomingClasses) {
    const userIds = liveClass.course?.enrollments.map(e => e.userId) || [];
    if (userIds.length > 0) {
      await this.notificationsService.createBulk(
        userIds,
        'LIVE_CLASS_REMINDER',
        'Live Class Starting Soon',
        `"${liveClass.title}" starts in 30 minutes!`,
        { liveClassId: liveClass.id, courseId: liveClass.courseId }
      );
    }
    // Mark as reminded to avoid duplicates (add a field or use a Set in memory)
  }
}

### Step 4: Streaming Module

If Phase 4 (streaming) is complete, modify `apps/api/src/modules/streaming/streaming.service.ts`:
- Inject NotificationsService

In startStream():
  - Notify enrolled students:
  await this.notificationsService.createBulk(
    enrolledUserIds,
    'LIVE_CLASS_STARTING',
    'Live Class Started!',
    `"${liveClass.title}" is live now. Join the session!`,
    { liveClassId: liveClass.id, roomId: courseStream.roomId }
  );

IMPORTANT:
- All notification.create() calls should be fire-and-forget (don't await in the critical path, or wrap in try/catch)
- Use .catch(err => this.logger.error(...)) pattern to prevent notification failures from breaking core functionality
- Don't send notifications to the user who performed the action (e.g., don't notify an instructor about their own course submission)
```

---

<a name="phase-7"></a>
## Phase 7: AI Chatbot — Public Pages

### Context
Build an AI chatbot for public (unauthenticated) pages. It answers questions about the platform, courses, pricing, and how to get started. Uses the Anthropic Claude API (or OpenAI — your choice). Appears as a floating chat bubble on public pages.

### Files to Create
**Backend:**
- `apps/api/src/modules/chatbot/chatbot.module.ts`
- `apps/api/src/modules/chatbot/chatbot.service.ts`
- `apps/api/src/modules/chatbot/chatbot.controller.ts`
- `apps/api/src/modules/chatbot/dto/chat-message.dto.ts`

**Frontend:**
- `apps/web/src/components/chatbot/ChatBubble.tsx`
- `apps/web/src/components/chatbot/ChatWindow.tsx`
- `apps/web/src/components/chatbot/ChatMessage.tsx`
- `apps/web/src/components/chatbot/index.ts`

### Prompt

```
You are working on E:\fis-learn, a pnpm monorepo with NestJS API + Next.js web app.

TASK: Build an AI chatbot for public pages that answers platform questions.

CONTEXT:
- This is an e-learning platform called "FIS Learn" (or "FIS Academy")
- Public pages: home, courses listing, course detail, about, contact, blog, pricing
- The chatbot should answer: What courses are available? How much does it cost? How do I sign up? What programming languages can I learn? How does the code editor work? What's included in each subscription tier?
- The chatbot should NOT have access to student data (that's Phase 8)
- Use the Anthropic Claude API (claude-sonnet-4-5-20250929) for responses
- The chatbot should be grounded with platform data: course catalog, pricing, features

STEPS:

### Step 1: Install Anthropic SDK
Run: pnpm --filter api add @anthropic-ai/sdk

### Step 2: Add Environment Variables
Add to .env.example and config/configuration.ts:
- ANTHROPIC_API_KEY=your_api_key
- Add to config: ai: { anthropicApiKey: process.env.ANTHROPIC_API_KEY }

### Step 3: Backend Service

Create `apps/api/src/modules/chatbot/chatbot.service.ts`:

@Injectable()
export class ChatbotService {
  private anthropic: Anthropic;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ai.anthropicApiKey'),
    });
  }

  // Build system prompt with live platform data
  private async buildPublicSystemPrompt(): Promise<string> {
    // Fetch current course catalog
    const courses = await this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      select: { title: true, description: true, level: true, pricingModel: true, price: true, category: { select: { name: true } } },
      take: 50,
    });

    // Fetch subscription plans
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      select: { name: true, tier: true, price: true, billingCycle: true, features: true },
    });

    return `You are FIS Learn's helpful assistant on the public website.

ROLE: Answer questions about FIS Learn, an e-learning platform for programming and technology courses.

PLATFORM INFO:
- FIS Learn offers interactive coding courses with a built-in code editor
- Features: video lessons, interactive code exercises with real-time execution, community chat per course, live streaming classes, skill trees, progress tracking
- Languages supported: Python, JavaScript, Java, C++, Go, Rust, and more
- Code exercises run in a secure sandbox (Judge0) with automated test cases

CURRENT COURSES:
${courses.map(c => `- ${c.title} (${c.level}, ${c.pricingModel}${c.price ? ` $${c.price}` : ''}) — ${c.category?.name || 'General'}: ${c.description?.slice(0, 100) || 'No description'}`).join('\n')}

SUBSCRIPTION PLANS:
${plans.map(p => `- ${p.name} (${p.tier}): $${p.price}/${p.billingCycle} — Features: ${JSON.stringify(p.features)}`).join('\n')}

RULES:
- Be friendly, concise, and helpful
- If asked about specific student data, grades, or progress, say "Please log in to access your personal dashboard, or ask me once you're signed in!"
- If asked something you don't know, say "I'm not sure about that. You can contact our support team at support@fis-learn.com"
- Encourage users to sign up for free to explore the platform
- Keep responses under 200 words
- You can respond in Arabic or English based on the user's language`;
  }

  async chatPublic(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    const systemPrompt = await this.buildPublicSystemPrompt();

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages,
    });

    return response.content[0].type === 'text' ? response.content[0].text : 'Sorry, I could not generate a response.';
  }
}

### Step 4: Controller

Create `apps/api/src/modules/chatbot/chatbot.controller.ts`:

@ApiTags('Chatbot')
@Controller({ path: 'chatbot', version: '1' })
export class ChatbotController {
  @Public()  // No auth required for public chatbot
  @Post('public')
  @HttpCode(HttpStatus.OK)
  async publicChat(@Body() dto: ChatMessageDto) {
    // dto.messages: Array<{ role: 'user' | 'assistant'; content: string }>
    const reply = await this.chatbotService.chatPublic(dto.messages);
    return { reply };
  }
}

Create `apps/api/src/modules/chatbot/dto/chat-message.dto.ts`:
- ChatMessageDto with messages array validated using class-validator
- Each message: { role: IsIn(['user', 'assistant']), content: IsString, MaxLength(2000) }
- messages: IsArray, ArrayMaxSize(20) to prevent abuse

### Step 5: Rate Limiting
Add rate limiting to the public chatbot endpoint:
- Use @Throttle(10, 60) — max 10 requests per minute per IP
- This prevents abuse of the AI API

### Step 6: Module

Create `apps/api/src/modules/chatbot/chatbot.module.ts`:
- Import PrismaModule
- Provide ChatbotService
- Register in app.module.ts

### Step 7: Frontend — ChatBubble

Create `apps/web/src/components/chatbot/ChatBubble.tsx`:
- 'use client'
- Floating button in bottom-right corner (fixed position)
- MessageCircle icon from lucide-react
- Pulse animation when not yet opened
- Click toggles ChatWindow
- Z-index: 50

### Step 8: Frontend — ChatWindow

Create `apps/web/src/components/chatbot/ChatWindow.tsx`:
- 'use client'
- Fixed position panel (bottom-right, 380px wide, 520px tall on desktop, full-screen on mobile)
- Header: "FIS Learn Assistant" with close button
- Messages area with scroll
- Input field + send button
- State: messages array, isLoading
- On send:
  - Add user message to state
  - POST /api/v1/chatbot/public with { messages } (credentials: 'include' for consistency, though endpoint is public)
  - Add assistant reply to state
- Show typing indicator while loading
- Initial greeting message: "Hi! I'm FIS Learn's assistant. Ask me about our courses, pricing, or features!"
- Persist conversation in sessionStorage (clear on tab close)

### Step 9: Frontend — ChatMessage

Create `apps/web/src/components/chatbot/ChatMessage.tsx`:
- Render user messages (right-aligned, primary color)
- Render assistant messages (left-aligned, muted background)
- Support markdown in assistant messages (use a simple markdown renderer or just preserve line breaks)
- Show timestamp

### Step 10: Integrate into Layout

Modify `apps/web/src/app/[locale]/layout.tsx`:
- Import ChatBubble
- Add <ChatBubble /> at the bottom of the layout (outside main content)
- It should appear on ALL public pages

IMPORTANT:
- The @Public() decorator at apps/api/src/common/decorators/public.decorator.ts skips JWT auth
- Rate limit the endpoint aggressively — AI API calls are expensive
- Cache the system prompt (courses + plans) for 5 minutes to avoid DB queries on every message
- Messages array sent to API should include full conversation history (for context)
- Do NOT store conversations in the database (privacy) — keep them in sessionStorage only
```

---

<a name="phase-8"></a>
## Phase 8: AI Chatbot — Student Guide

### Context
Build a personalized AI chatbot for authenticated students. Unlike the public chatbot, this one has access to the student's data: enrollments, progress, grades, submission history, upcoming live classes. It acts as a learning guide — suggesting next lessons, explaining concepts, motivating students, tracking their goals.

### Files to Create/Modify
**Backend:**
- `apps/api/src/modules/chatbot/chatbot.service.ts` — add `chatStudent()` method
- `apps/api/src/modules/chatbot/chatbot.controller.ts` — add authenticated endpoint

**Frontend:**
- `apps/web/src/components/chatbot/StudentChatBubble.tsx` — different from public bubble
- Modify `apps/web/src/components/chatbot/ChatWindow.tsx` — support student mode

### Prompt

```
You are working on E:\fis-learn, a pnpm monorepo with NestJS API + Next.js web app.

TASK: Build a personalized AI chatbot for authenticated students that has access to their learning data.

PREREQUISITES: Phase 7 (Public Chatbot) must be complete. The ChatbotService and Anthropic SDK are already set up.

CONTEXT:
- The public chatbot is at POST /api/v1/chatbot/public (no auth)
- Student chatbot needs auth — uses JWT from httpOnly cookie
- Student data available via Prisma:
  - Enrollment: { courseId, status, progressPercent, enrolledAt, completedAt } — linked to Course { title, slug, level }
  - LessonProgress: { lessonId, completedAt } — linked to Lesson { title, sortOrder } → CourseSection { title }
  - CodeSubmission: { exerciseId, status, testsPassed, testsTotal, pointsEarned, createdAt } — linked to CodeExercise { title, difficulty }
  - StudentProgress: { courseId, completionPct, lessonsCompleted, totalLessons, timeSpentSeconds, currentStreakDays, longestStreakDays }
  - LiveClass: { title, courseId, startAt, status } — upcoming classes for enrolled courses
- The chatbot should:
  - Know the student's name, enrolled courses, progress in each
  - Suggest what to study next (next incomplete lesson)
  - Celebrate achievements (completion, streaks)
  - Help with course content questions
  - Show upcoming live classes
  - Motivate students who haven't been active

STEPS:

### Step 1: Backend — Student Context Builder

Add to `apps/api/src/modules/chatbot/chatbot.service.ts`:

private async buildStudentContext(userId: string): Promise<string> {
  // Fetch student profile
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true, createdAt: true },
  });

  // Fetch enrollments with progress
  const enrollments = await this.prisma.enrollment.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      course: {
        select: {
          title: true, slug: true, level: true,
          sections: {
            select: {
              title: true,
              lessons: {
                select: { id: true, title: true, sortOrder: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  // Fetch completed lessons
  const completedLessons = await this.prisma.lessonProgress.findMany({
    where: { userId },
    select: { lessonId: true },
  });
  const completedLessonIds = new Set(completedLessons.map(l => l.lessonId));

  // Fetch student progress stats
  const progressStats = await this.prisma.studentProgress.findMany({
    where: { studentId: userId },
    select: { courseId: true, completionPct: true, lessonsCompleted: true, totalLessons: true, timeSpentSeconds: true, currentStreakDays: true, longestStreakDays: true },
  });

  // Fetch recent code submissions
  const recentSubmissions = await this.prisma.codeSubmission.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      status: true, testsPassed: true, testsTotal: true, pointsEarned: true, createdAt: true,
      exercise: { select: { title: true, difficulty: true } },
    },
  });

  // Fetch upcoming live classes for enrolled courses
  const courseIds = enrollments.map(e => e.course).map(c => c.slug); // Need courseId
  const enrolledCourseIds = enrollments.map(e => e.courseId || '');
  const upcomingClasses = await this.prisma.liveClass.findMany({
    where: {
      courseId: { in: enrolledCourseIds },
      startAt: { gte: new Date() },
      status: 'UPCOMING',
    },
    orderBy: { startAt: 'asc' },
    take: 5,
    select: { title: true, startAt: true, durationMinutes: true },
  });

  // Build next lesson suggestions
  const courseProgress = enrollments.map(enrollment => {
    const allLessons = enrollment.course.sections.flatMap(s =>
      s.lessons.map(l => ({ ...l, sectionTitle: s.title }))
    );
    const nextLesson = allLessons.find(l => !completedLessonIds.has(l.id));
    const stats = progressStats.find(p => p.courseId === enrollment.courseId);

    return {
      courseTitle: enrollment.course.title,
      level: enrollment.course.level,
      progress: enrollment.progressPercent,
      lessonsCompleted: stats?.lessonsCompleted || 0,
      totalLessons: stats?.totalLessons || allLessons.length,
      timeSpent: stats?.timeSpentSeconds || 0,
      currentStreak: stats?.currentStreakDays || 0,
      nextLesson: nextLesson ? `${nextLesson.sectionTitle} → ${nextLesson.title}` : 'All lessons complete!',
    };
  });

  return `
STUDENT PROFILE:
- Name: ${user?.name}
- Member since: ${user?.createdAt?.toLocaleDateString()}
- Current streak: ${progressStats[0]?.currentStreakDays || 0} days (longest: ${progressStats[0]?.longestStreakDays || 0})

ENROLLED COURSES:
${courseProgress.map(c => `- "${c.courseTitle}" (${c.level}): ${c.progress.toFixed(1)}% complete (${c.lessonsCompleted}/${c.totalLessons} lessons, ${Math.round(c.timeSpent / 3600)}h spent)
  Next: ${c.nextLesson}`).join('\n')}

RECENT CODE SUBMISSIONS (last 10):
${recentSubmissions.map(s => `- ${s.exercise.title} (${s.exercise.difficulty}): ${s.status} — ${s.testsPassed}/${s.testsTotal} tests, ${s.pointsEarned} pts (${s.createdAt.toLocaleDateString()})`).join('\n') || 'No submissions yet'}

UPCOMING LIVE CLASSES:
${upcomingClasses.map(c => `- "${c.title}" on ${c.startAt.toLocaleDateString()} at ${c.startAt.toLocaleTimeString()} (${c.durationMinutes} min)`).join('\n') || 'No upcoming classes'}
`;
}

### Step 2: Backend — Student Chat Method

Add to ChatbotService:

async chatStudent(userId: string, messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  const studentContext = await this.buildStudentContext(userId);
  const publicSystemPrompt = await this.buildPublicSystemPrompt(); // Reuse course/plan info

  const systemPrompt = `${publicSystemPrompt}

---

You are now in STUDENT MODE. You have access to this student's personal learning data.

${studentContext}

STUDENT MODE RULES:
- Address the student by their first name
- If they ask "what should I study next?" → suggest their next incomplete lesson
- If they ask about their progress → give specific numbers from their data
- If they seem stuck on code exercises → offer hints, explain concepts, encourage
- If they have a streak going → celebrate it! If streak is 0, gently encourage daily practice
- If they have upcoming live classes → remind them
- If they ask about code errors → help debug conceptually (don't write full solutions)
- If they ask about a topic covered in their enrolled courses → explain it
- Track their emotional state — if frustrated, be extra encouraging
- Suggest setting learning goals if they seem aimless
- Keep responses conversational and motivating, under 250 words
- You can respond in Arabic or English based on the student's language`;

  const response = await this.anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 600,
    system: systemPrompt,
    messages: messages,
  });

  return response.content[0].type === 'text' ? response.content[0].text : 'Sorry, I could not generate a response.';
}

### Step 3: Backend — Authenticated Endpoint

Add to `apps/api/src/modules/chatbot/chatbot.controller.ts`:

@Post('student')
@HttpCode(HttpStatus.OK)
@ApiBearerAuth()
@ApiOperation({ summary: 'Chat with AI student guide (authenticated)' })
async studentChat(
  @CurrentUser() user: AuthUser,
  @Body() dto: ChatMessageDto,
) {
  const reply = await this.chatbotService.chatStudent(user.id, dto.messages);
  return { reply };
}

### Step 4: Frontend — Student Chat Mode

Modify `apps/web/src/components/chatbot/ChatWindow.tsx`:
- Add prop: `mode: 'public' | 'student'`
- If mode === 'student':
  - Call POST /api/v1/chatbot/student instead of /api/v1/chatbot/public
  - Show different header: "Your Learning Guide"
  - Different greeting: "Hi {userName}! I'm your personal learning guide. Ask me about your courses, what to study next, or any concept you're working on!"
  - Show quick action buttons: "What should I study?", "Show my progress", "Upcoming classes"

Modify `apps/web/src/components/chatbot/ChatBubble.tsx`:
- Import useAuth from '@/contexts/auth-context'
- If user is authenticated → render StudentChatBubble (different icon/color, uses 'student' mode)
- If not authenticated → render public chat bubble (uses 'public' mode)
- The student version should have a GraduationCap icon (lucide-react) instead of MessageCircle
- Different accent color to distinguish from public bot

### Step 5: Quick Action Buttons

In ChatWindow, when mode === 'student', show 3 clickable suggestion chips above the input:
- "What should I study next?" → sends this as user message
- "Show my progress" → sends "Show me my progress across all courses"
- "Upcoming classes" → sends "Do I have any upcoming live classes?"

These auto-send the message when clicked.

### Step 6: Cache Student Context

The buildStudentContext method does many DB queries. Cache the result:
- Use Redis or in-memory cache with 2-minute TTL per userId
- Key: `student-context:${userId}`
- Invalidate on: lesson completion, new enrollment, code submission

IMPORTANT:
- The student endpoint MUST require authentication (no @Public() decorator)
- Cache the student context to avoid DB overload
- Rate limit: @Throttle(20, 60) — 20 requests/minute per user (more generous than public)
- Messages array includes full conversation (the frontend sends all prior messages)
- Student context is injected into the system prompt, NOT into the user messages
- Never expose raw student data (like user IDs) in the chatbot response
```

---

<a name="phase-9"></a>
## Phase 9: Remaining Fixes & Polish

### Prompt

```
You are working on E:\fis-learn, a pnpm monorepo.

TASK: Fix remaining production issues.

DO THESE IN ORDER:

1. CONFIGURE JUDGE0 ENVIRONMENT
   - Add to .env.example:
     CODE_EXECUTION_PROVIDER=judge0
     JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
     JUDGE0_API_KEY=your_rapidapi_key
     JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
   - Add to apps/api/src/config/configuration.ts under a codeExecution key:
     codeExecution: {
       provider: process.env.CODE_EXECUTION_PROVIDER || 'judge0',
       judge0: {
         apiUrl: process.env.JUDGE0_API_URL,
         apiKey: process.env.JUDGE0_API_KEY,
         apiHost: process.env.JUDGE0_API_HOST,
       }
     }

2. REMOVE eval() SECURITY RISK
   - File: apps/web/src/app/[locale]/code-test/page.tsx
   - This page uses eval() to run JavaScript locally — XSS risk
   - Replace the mock execution with a call to the real API endpoint POST /api/v1/code-execution/execute
   - Or remove the page entirely if it was just for testing

3. FIX .env CREDENTIAL ROTATION
   - The .env file contains real Supabase credentials
   - Add a WARNING comment at the top of .env.example:
     # WARNING: Never commit .env files. Rotate all credentials before deploying to production.
     # The values below are EXAMPLES ONLY.

4. ADD NOTIFICATION PREFERENCES PAGE
   - Create apps/web/src/app/[locale]/settings/notifications/page.tsx
   - Fetch GET /api/v1/notifications/preferences (credentials: 'include')
   - Show toggles for: emailEnabled, pushEnabled, inAppEnabled, courseUpdates, communityReplies, liveClassAlerts, promotions
   - Save via PUT /api/v1/notifications/preferences
   - Link to it from the existing settings page at apps/web/src/app/[locale]/settings/page.tsx

5. ADD ZEGO ENVIRONMENT VARIABLES TO CONFIG
   - Read apps/web/src/components/streaming/ZegoStreamingRoom.tsx
   - The appID is hardcoded as 1765136310
   - Move to environment: NEXT_PUBLIC_ZEGO_APP_ID
   - The server URL should be derived from the appID or configurable: NEXT_PUBLIC_ZEGO_SERVER_URL

6. WIRE AUDIT LOG SERVICE
   - apps/api/src/common/services/audit-log.service.ts exists but is never injected
   - Import it into app.module.ts as a global provider
   - Add audit logging to: user role changes, course approval/rejection, account suspension/ban
   - Each audit log: { action, actorId, targetId, targetType, metadata, ipAddress, createdAt }

7. UPDATE PRODUCTION_READINESS_PLAN.md
   - Read the current file
   - Update the "Still Open" section to reflect all changes from Phases 1-9
   - Update the overall status
   - Add a new Change Log entry
```

---

## Execution Order & Dependencies

```
Phase 1 (Code Editor)      ← Independent, can start immediately
Phase 2 (Redis Adapter)    ← Independent, can start immediately
Phase 3 (Video Components) ← Independent, can start immediately
Phase 4 (Streaming Module) ← Independent, can start immediately
Phase 5 (Notifications)    ← Independent, can start immediately
Phase 6 (Event Triggers)   ← Depends on Phase 5
Phase 7 (Public Chatbot)   ← Independent, can start immediately
Phase 8 (Student Chatbot)  ← Depends on Phase 7
Phase 9 (Fixes & Polish)   ← Do last, after all other phases
```

**Parallel tracks:**
- Track A: Phase 1 → Phase 3 → Phase 4 (editor → video → streaming)
- Track B: Phase 5 → Phase 6 (notifications → triggers)
- Track C: Phase 7 → Phase 8 (public chatbot → student chatbot)
- Track D: Phase 2 (Redis adapter — quick, do anytime)
- Final: Phase 9 (polish)

---

## Environment Variables Summary (All New)

```bash
# AI Chatbot (Phase 7-8)
ANTHROPIC_API_KEY=sk-ant-...

# Code Execution (Phase 1/9)
CODE_EXECUTION_PROVIDER=judge0
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_key
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com

# ZegoCloud (Phase 4)
ZEGO_APP_ID=your_app_id
ZEGO_SERVER_SECRET=your_secret
NEXT_PUBLIC_ZEGO_APP_ID=your_app_id
NEXT_PUBLIC_ZEGO_SERVER_URL=wss://...
```
