# Integration Fix Prompts — FIS Learn E-Learning Platform

> **How to use:** Copy-paste each prompt into any AI coding assistant (Claude, ChatGPT, Cursor, Copilot, etc.) with access to the codebase. Each prompt is fully self-contained — no prior context needed. Execute them in order (Prompt 1 first, as later prompts depend on its schema migration).

---

## PROMPT 1: Unify Progress Tracking — Auto-Complete Lessons from Video, Code & Quiz

```
You are working on an e-learning platform monorepo (NestJS backend + Next.js frontend + Prisma ORM + PostgreSQL).

## PROBLEM

There are THREE separate progress tracking systems that never synchronize:

1. `LessonProgress` table — only populated when user clicks "Mark Complete" button via `POST /courses/:courseId/lessons/:lessonId/complete`
2. `StudentProgress` table — populated by analytics events (LESSON_COMPLETE, VIDEO_COMPLETE) but never syncs back to LessonProgress
3. `Enrollment.progressPercent` — recalculated only when `completeLessonForUser()` is called

This means: a student can watch 100% of a video, pass all code exercises, and submit quizzes — but their dashboard shows 0% progress because nothing auto-creates a LessonProgress row.

## WHAT TO CHANGE

### Step 1: Backend — Make `completeLessonForUser()` callable from other services

File: `apps/api/src/modules/courses/courses.service.ts`

The existing method at line 882:
```typescript
async completeLessonForUser(courseId: string, lessonId: string, userId: string) {
  // validates lesson exists, enrollment active
  // upserts LessonProgress
  // calls updateEnrollmentProgress()
  // calls checkCourseCompletion()
}
```

This method is the ONLY correct place that updates all three systems. Other services need to call it.

**Action:** Export `CoursesService` from `CoursesModule` so other modules can inject it.

File: `apps/api/src/modules/courses/courses.module.ts`
- Ensure `exports: [CoursesService]` is present.

### Step 2: Auto-complete lesson when VIDEO_COMPLETE event fires

File: `apps/api/src/modules/analytics/analytics.service.ts`

The current `handleVideoComplete()` method (line 132-164) only updates `StudentVideoProgress` — it never marks the lesson as complete.

**Action:** Inject `CoursesService` into `AnalyticsService`. After updating `StudentVideoProgress`, call `completeLessonForUser()`:

```typescript
// In handleVideoComplete(), AFTER the existing prisma.studentVideoProgress.upsert:
if (event.lessonId && event.courseId) {
  try {
    await this.coursesService.completeLessonForUser(
      event.courseId,
      event.lessonId,
      studentId,
    );
  } catch (error) {
    // Silently ignore — user may have already completed or isn't enrolled
    this.logger.debug(`Auto-complete skipped for lesson ${event.lessonId}: ${error.message}`);
  }
}
```

Add `Logger` import and create a logger instance:
```typescript
private readonly logger = new Logger(AnalyticsService.name);
```

Update the module file `apps/api/src/modules/analytics/analytics.module.ts` to import `CoursesModule`.

### Step 3: Auto-complete lesson when all required code exercises pass

File: `apps/api/src/modules/code-execution/code-exercise.service.ts`

The `submitCode()` method (line 280-426) grades code and updates `CodeSubmission` status but never touches lesson progress.

**Action:** After the submission is graded as ACCEPTED (line 385-408), check if ALL required exercises for that lesson are now accepted. If yes, auto-complete the lesson.

Add this logic after line 410 (`await this.codeExecutionService.trackExecution(userId);`):

```typescript
// Auto-complete lesson if all required exercises are now passing
if (overallStatus === 'ACCEPTED') {
  await this.checkAndCompleteLessonFromExercises(userId, exercise);
}
```

Add this new private method:

```typescript
private async checkAndCompleteLessonFromExercises(userId: string, exercise: any) {
  // Get the lesson and its required exercises
  const lesson = await this.prisma.lesson.findUnique({
    where: { id: exercise.lessonId },
    include: {
      section: { select: { courseId: true } },
      codeExercises: {
        where: { isRequired: true },
        select: { id: true },
      },
    },
  });

  if (!lesson || !lesson.section?.courseId) return;

  const requiredExerciseIds = lesson.codeExercises.map(e => e.id);
  if (requiredExerciseIds.length === 0) return;

  // Check if every required exercise has at least one ACCEPTED submission
  const acceptedSubmissions = await this.prisma.codeSubmission.findMany({
    where: {
      userId,
      exerciseId: { in: requiredExerciseIds },
      status: 'ACCEPTED',
    },
    select: { exerciseId: true },
    distinct: ['exerciseId'],
  });

  if (acceptedSubmissions.length === requiredExerciseIds.length) {
    try {
      await this.coursesService.completeLessonForUser(
        lesson.section.courseId,
        lesson.id,
        userId,
      );
    } catch (error) {
      // Silently ignore
    }
  }
}
```

Inject `CoursesService` into `CodeExerciseService` constructor. Update the module file to import `CoursesModule`.

### Step 4: Auto-complete lesson when quiz passes

File: `apps/api/src/modules/analytics/analytics.service.ts`

The `handleQuizSubmit()` method (line 166-189) creates an `AssessmentAttempt` but doesn't touch lesson progress.

**Action:** After creating the `AssessmentAttempt`, if `event.payload.isPassed === true` and `event.lessonId` exists, call `completeLessonForUser()`:

```typescript
// After prisma.assessmentAttempt.create:
if (event.payload?.isPassed && event.lessonId && event.courseId) {
  try {
    await this.coursesService.completeLessonForUser(
      event.courseId,
      event.lessonId,
      studentId,
    );
  } catch (error) {
    this.logger.debug(`Auto-complete skipped for quiz lesson ${event.lessonId}: ${error.message}`);
  }
}
```

### Step 5: Wire up streaks to all completion types

In the same `handleVideoComplete()` method, after auto-completing, also update the streak:

```typescript
// Update lastActivity and streak for video completion too
if (event.courseId) {
  const existing = await this.prisma.studentProgress.findUnique({
    where: { studentId_courseId: { studentId, courseId: event.courseId } },
  });
  if (existing) {
    await this.prisma.studentProgress.update({
      where: { studentId_courseId: { studentId, courseId: event.courseId } },
      data: {
        lastActivityAt: now,
        ...this.calculateStreak(existing, now),
      },
    });
  }
}
```

### Step 6: Remove manual "Mark Complete" for VIDEO lessons on frontend

File: `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx`

Currently at line 342, there's a "Mark Complete" button that the user must click. For VIDEO lessons, the auto-complete at 90% should handle it (line 380-384 already does this for Mux videos).

**Action:** Keep the "Mark Complete" button visible but only for PDF and ASSIGNMENT lesson types. For VIDEO and QUIZ lessons, show it as a fallback but indicate that completion is automatic:
- If `lesson.contentType === 'VIDEO'` and not yet completed, show a muted helper text: "Completion is tracked automatically at 90% video watch"
- If `lesson.contentType === 'QUIZ'`, show: "Completion is tracked automatically when you pass"
- Keep the manual button for PDF and ASSIGNMENT types

## FILES TO MODIFY

1. `apps/api/src/modules/courses/courses.module.ts` — add `exports: [CoursesService]`
2. `apps/api/src/modules/analytics/analytics.module.ts` — import `CoursesModule`, inject `CoursesService`
3. `apps/api/src/modules/analytics/analytics.service.ts` — add auto-complete logic to `handleVideoComplete()` and `handleQuizSubmit()`
4. `apps/api/src/modules/code-execution/code-exercise.service.ts` — add `checkAndCompleteLessonFromExercises()` after ACCEPTED submission
5. `apps/api/src/modules/code-execution/code-execution.module.ts` — import `CoursesModule`
6. `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx` — conditional "Mark Complete" button text

## IMPORTANT CONSTRAINTS

- `completeLessonForUser()` already uses `upsert` so calling it multiple times is safe (idempotent)
- Wrap all auto-complete calls in try/catch — don't let progress tracking failures break the primary action (video playing, code grading, etc.)
- Don't modify the `completeLessonForUser()` method itself — it's already correct
- Don't create new tables or migrations — use existing schema only
- Make sure there are no circular dependency issues between modules (use `forwardRef` if needed)
```

---

## PROMPT 2: Make AI Chatbot Context-Aware for Authenticated Users

```
You are working on an e-learning platform monorepo (NestJS backend + Next.js frontend).

## PROBLEM

The AI chatbot is a public-only marketing assistant. It has ONE endpoint (`POST /api/v1/chatbot/public`) with no authentication, and its system prompt only contains generic course catalog info and subscription plans. It cannot:
- Help with the course/lesson a student is currently viewing
- Reference the student's progress or enrolled courses
- Assist with code exercises the student is stuck on
- Provide personalized learning guidance

## CURRENT ARCHITECTURE

Backend:
- `apps/api/src/modules/chatbot/chatbot.service.ts` — has `chatPublic()` method with `buildPublicSystemPrompt()`
- `apps/api/src/modules/chatbot/chatbot.controller.ts` — single `@Public()` POST endpoint
- `apps/api/src/modules/chatbot/chatbot.module.ts` — imports PrismaModule only
- `apps/api/src/modules/chatbot/interfaces/ai-provider.interface.ts` — `AIProvider` interface with `chat(messages[], systemPrompt?)` method
- `apps/api/src/modules/chatbot/dto/chat-message.dto.ts` — validates messages array (max 20 messages, max 2000 chars each)

Frontend:
- `apps/web/src/components/chatbot/ChatWindow.tsx` — sends to `/api/v1/chatbot/public` via fetch()
- `apps/web/src/components/chatbot/ChatBubble.tsx` — floating button, bottom-right corner
- Mounted globally in `apps/web/src/app/[locale]/layout.tsx`
- Messages stored in `sessionStorage` only (lost on browser close)

## WHAT TO BUILD

### Step 1: Create authenticated chatbot endpoint

File: `apps/api/src/modules/chatbot/chatbot.controller.ts`

Add a new endpoint alongside the existing public one:

```typescript
@Post('chat')
@HttpCode(HttpStatus.OK)
@Throttle({ default: { limit: 20, ttl: 60000 } })
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Chat with AI assistant (authenticated, context-aware)' })
async authenticatedChat(
  @Body() dto: AuthenticatedChatMessageDto,
  @CurrentUser() user: JwtPayload,
) {
  const reply = await this.chatbotService.chatAuthenticated(
    dto.messages,
    user.sub,
    {
      courseId: dto.courseId,
      lessonId: dto.lessonId,
      exerciseId: dto.exerciseId,
    },
  );
  return { reply };
}
```

Import the `JwtAuthGuard` from `@/common/guards/jwt-auth.guard` and `CurrentUser` decorator from `@/common/decorators`.

### Step 2: Create the DTO for authenticated chat

Create file: `apps/api/src/modules/chatbot/dto/authenticated-chat-message.dto.ts`

```typescript
import { IsArray, IsOptional, IsString, MaxLength, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MessageItem {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000)
  content: string;
}

export class AuthenticatedChatMessageDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MessageItem)
  messages: MessageItem[];

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  exerciseId?: string;
}
```

### Step 3: Build context-aware system prompt

File: `apps/api/src/modules/chatbot/chatbot.service.ts`

Add a new method `chatAuthenticated()` and a private `buildAuthenticatedSystemPrompt()`:

```typescript
async chatAuthenticated(
  messages: { role: 'user' | 'assistant'; content: string }[],
  userId: string,
  context: { courseId?: string; lessonId?: string; exerciseId?: string },
): Promise<string> {
  if (!this.aiProvider) {
    return 'Sorry, the chatbot is currently unavailable. Please try again later.';
  }

  const systemPrompt = await this.buildAuthenticatedSystemPrompt(userId, context);

  try {
    return await this.aiProvider.chat(messages, systemPrompt);
  } catch (error) {
    this.logger.error(`Authenticated chat error: ${error.message}`, error.stack);
    return 'Sorry, I encountered an error. Please try again later.';
  }
}
```

The `buildAuthenticatedSystemPrompt()` should query and include:

1. **User info**: name, enrolled courses (from `Enrollment` table where userId matches, status ACTIVE)
2. **Current course context** (if `courseId` provided): course title, description, sections with lesson titles
3. **Current lesson context** (if `lessonId` provided): lesson title, description, contentType, material description
4. **Current exercise context** (if `exerciseId` provided): exercise title, description, language, starter code, test case names (NOT hidden test expected outputs), hints
5. **User progress**: enrollment progress %, completed lessons count, total lessons

Build the prompt like this:

```typescript
private async buildAuthenticatedSystemPrompt(
  userId: string,
  context: { courseId?: string; lessonId?: string; exerciseId?: string },
): Promise<string> {
  // Fetch user with enrollments
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      enrollments: {
        where: { status: 'ACTIVE' },
        select: {
          progressPercent: true,
          course: { select: { id: true, title: true } },
        },
        take: 10,
      },
    },
  });

  let courseContext = '';
  let lessonContext = '';
  let exerciseContext = '';

  // Fetch current course details
  if (context.courseId) {
    const course = await this.prisma.course.findUnique({
      where: { id: context.courseId },
      select: {
        title: true,
        description: true,
        level: true,
        sections: {
          select: {
            title: true,
            lessons: { select: { id: true, title: true, contentType: true }, orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (course) {
      courseContext = `\n\nCURRENT COURSE: "${course.title}" (${course.level})\nDescription: ${course.description?.slice(0, 300) || 'N/A'}\nSections:\n${course.sections.map(s => `- ${s.title}: ${s.lessons.map(l => l.title).join(', ')}`).join('\n')}`;
    }
  }

  // Fetch current lesson details
  if (context.lessonId) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: context.lessonId },
      select: { title: true, description: true, contentType: true },
    });
    if (lesson) {
      lessonContext = `\n\nCURRENT LESSON: "${lesson.title}" (${lesson.contentType})\nDescription: ${lesson.description || 'N/A'}`;
    }
  }

  // Fetch current exercise details
  if (context.exerciseId) {
    const exercise = await this.prisma.codeExercise.findUnique({
      where: { id: context.exerciseId },
      select: {
        title: true,
        description: true,
        languageId: true,
        difficulty: true,
        hints: true,
        starterCode: true,
        testCases: {
          where: { isHidden: false },
          select: { name: true, input: true, expected: true },
          take: 5,
        },
      },
    });
    if (exercise) {
      exerciseContext = `\n\nCURRENT CODE EXERCISE: "${exercise.title}" (${exercise.languageId}, ${exercise.difficulty})\nDescription: ${exercise.description}\nStarter Code:\n\`\`\`\n${exercise.starterCode || 'None'}\n\`\`\`\nPublic Test Cases:\n${exercise.testCases.map(tc => `- ${tc.name || 'Test'}: input="${tc.input}" → expected="${tc.expected}"`).join('\n')}\nHints: ${exercise.hints?.join(', ') || 'None'}`;
    }
  }

  return `You are FIS Learn's AI learning assistant helping an authenticated student.

STUDENT: ${user?.name || 'Student'}
ENROLLED COURSES: ${user?.enrollments.map(e => `${e.course.title} (${Math.round(e.progressPercent)}% complete)`).join(', ') || 'None'}
${courseContext}${lessonContext}${exerciseContext}

RULES:
- Help the student understand concepts, don't give direct answers to exercises
- For code exercises: guide them with hints, explain the approach, point out likely errors — but do NOT write the full solution
- Reference their current lesson/course context when relevant
- Be encouraging and supportive
- If they're stuck on code, ask them to share their current attempt and what error they see
- Keep responses under 300 words
- You can respond in Arabic or English based on the student's language
- NEVER reveal hidden test case expected outputs
- NEVER share other students' solutions`;
}
```

### Step 4: Update the module to import Prisma relations

File: `apps/api/src/modules/chatbot/chatbot.module.ts`

No changes needed — it already imports PrismaModule. But verify the Prisma schema has the relations needed (it does: User → Enrollment → Course, CodeExercise → testCases).

### Step 5: Update frontend ChatWindow to send context

File: `apps/web/src/components/chatbot/ChatWindow.tsx`

Currently the component calls `fetch('/api/v1/chatbot/public', ...)` directly.

**Action:**
1. Import `useAuth` from `@/contexts/auth-context` (or wherever auth context is exported)
2. Accept optional props: `courseId?: string`, `lessonId?: string`, `exerciseId?: string`
3. If user is authenticated, call `POST /api/v1/chatbot/chat` with the auth token and context fields
4. If user is NOT authenticated, keep calling `POST /api/v1/chatbot/public` (existing behavior)

```typescript
// Determine endpoint based on auth status
const endpoint = user
  ? `${API_URL}/api/v1/chatbot/chat`
  : `${API_URL}/api/v1/chatbot/public`;

const body = user
  ? { messages: conversationMessages, courseId, lessonId, exerciseId }
  : { messages: conversationMessages };

const headers: Record<string, string> = { 'Content-Type': 'application/json' };
if (user?.token) {
  headers['Authorization'] = `Bearer ${user.token}`;
}
```

### Step 6: Pass context from lesson page to ChatBubble

File: `apps/web/src/components/chatbot/ChatBubble.tsx`

Add props to ChatBubble: `courseId?: string`, `lessonId?: string`, `exerciseId?: string`. Pass these through to ChatWindow.

File: `apps/web/src/app/[locale]/layout.tsx`

The ChatBubble is mounted here globally. Don't change the global mount — it won't have context by default, which is fine (falls back to general assistant).

File: `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx`

Add a ChatBubble (or pass context to a global state/context) with the current `courseId`, `lessonId`, and `selectedExerciseId`. The simplest approach: create a React context `ChatContextProvider` that lesson pages can populate, and ChatBubble reads from it.

Create: `apps/web/src/contexts/chat-context.tsx`

```typescript
'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContext {
  courseId?: string;
  lessonId?: string;
  exerciseId?: string;
  setChatContext: (ctx: { courseId?: string; lessonId?: string; exerciseId?: string }) => void;
}

const ChatCtx = createContext<ChatContext>({ setChatContext: () => {} });

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<Omit<ChatContext, 'setChatContext'>>({});
  return (
    <ChatCtx.Provider value={{ ...ctx, setChatContext: setCtx }}>
      {children}
    </ChatCtx.Provider>
  );
}

export const useChatContext = () => useContext(ChatCtx);
```

Wrap the layout with `<ChatContextProvider>`. In the lesson page, call `setChatContext({ courseId, lessonId, exerciseId })` via useEffect. In ChatBubble, read from `useChatContext()`.

### Step 7: Add "Ask AI" button in code exercise section

File: `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx`

Next to the code editor (around line 487-496), add a small button:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => {
    setChatContext({ courseId, lessonId, exerciseId: selectedExerciseId });
    // Open chatbot
    document.dispatchEvent(new CustomEvent('open-chatbot'));
  }}
>
  <MessageCircle className="h-4 w-4 mr-1" /> Ask AI for help
</Button>
```

In ChatBubble, listen for this custom event to auto-open:
```typescript
useEffect(() => {
  const handler = () => setIsOpen(true);
  document.addEventListener('open-chatbot', handler);
  return () => document.removeEventListener('open-chatbot', handler);
}, []);
```

## FILES TO CREATE
1. `apps/api/src/modules/chatbot/dto/authenticated-chat-message.dto.ts`
2. `apps/web/src/contexts/chat-context.tsx`

## FILES TO MODIFY
1. `apps/api/src/modules/chatbot/chatbot.controller.ts` — add authenticated endpoint
2. `apps/api/src/modules/chatbot/chatbot.service.ts` — add `chatAuthenticated()` + `buildAuthenticatedSystemPrompt()`
3. `apps/web/src/components/chatbot/ChatWindow.tsx` — auth-aware endpoint selection + context props
4. `apps/web/src/components/chatbot/ChatBubble.tsx` — accept context props, listen for open event
5. `apps/web/src/app/[locale]/layout.tsx` — wrap with ChatContextProvider
6. `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx` — set chat context + "Ask AI" button

## IMPORTANT CONSTRAINTS
- Keep the existing public endpoint working exactly as-is — don't break it
- Never expose hidden test case expected outputs in the system prompt
- Never include user passwords or sensitive data in the prompt
- The system prompt should be concise — don't dump entire lesson content, just titles and descriptions
- Rate limit the authenticated endpoint at 20 req/min (more generous than the public 10 req/min)
- Increase maxTokens to 800 for authenticated responses (vs 500 for public)
```

---

## PROMPT 3: Fix YouTube Video Progress Tracking

```
You are working on an e-learning platform with Next.js frontend and NestJS backend.

## PROBLEM

YouTube videos embedded in lessons have ZERO progress tracking. They render as plain iframes:

File: `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx`, lines 367-375:
```tsx
{lesson.material.youtubeUrl ? (
  <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
    <iframe
      src={lesson.material.youtubeUrl.replace('watch?v=', 'embed/')}
      title={lesson.material.title}
      className="w-full h-full"
      allowFullScreen
    />
  </div>
```

Meanwhile, Mux-hosted videos use a `<VideoPlayer>` component (line 377-386) that tracks progress milestones (25%, 50%, 75%, 90%) and auto-completes the lesson at 90%.

YouTube lessons can NEVER auto-complete because there's no progress callback.

## WHAT TO BUILD

### Step 1: Create a YouTube player wrapper component

Create: `apps/web/src/components/video/YouTubePlayer.tsx`

This component wraps the YouTube IFrame Player API to detect playback state changes and estimate progress.

```typescript
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

interface YouTubePlayerProps {
  videoUrl: string;
  title?: string;
  onProgress?: (percent: number) => void;
}

export function YouTubePlayer({ videoUrl, title, onProgress }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const reportedMilestones = useRef<number[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Extract video ID from YouTube URL
  const videoId = extractYouTubeId(videoUrl);

  // Load YouTube IFrame API script
  useEffect(() => {
    if ((window as any).YT) {
      initPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    (window as any).onYouTubeIframeAPIReady = () => initPlayer();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy?.();
    };
  }, [videoId]);

  function initPlayer() {
    if (!containerRef.current || !videoId) return;

    playerRef.current = new (window as any).YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => setIsReady(true),
        onStateChange: handleStateChange,
      },
    });
  }

  function handleStateChange(event: any) {
    const PLAYING = 1;
    const PAUSED = 2;
    const ENDED = 0;

    if (event.data === PLAYING) {
      // Start polling progress every 3 seconds
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(checkProgress, 3000);
    } else if (event.data === PAUSED || event.data === ENDED) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (event.data === ENDED) {
        onProgress?.(100);
      }
    }
  }

  const checkProgress = useCallback(() => {
    if (!playerRef.current?.getCurrentTime || !playerRef.current?.getDuration) return;

    const current = playerRef.current.getCurrentTime();
    const duration = playerRef.current.getDuration();
    if (duration <= 0) return;

    const percent = (current / duration) * 100;
    const milestones = [25, 50, 75, 90];

    milestones.forEach((milestone) => {
      if (percent >= milestone && !reportedMilestones.current.includes(milestone)) {
        reportedMilestones.current.push(milestone);
        onProgress?.(milestone);
      }
    });
  }, [onProgress]);

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
```

### Step 2: Replace the iframe with the new component

File: `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx`

Replace lines 367-375:

FROM:
```tsx
{lesson.material.youtubeUrl ? (
  <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
    <iframe
      src={lesson.material.youtubeUrl.replace('watch?v=', 'embed/')}
      title={lesson.material.title}
      className="w-full h-full"
      allowFullScreen
    />
  </div>
```

TO:
```tsx
{lesson.material.youtubeUrl ? (
  <YouTubePlayer
    videoUrl={lesson.material.youtubeUrl}
    title={lesson.material.title}
    onProgress={(percent) => {
      // Auto-mark complete at 90% watched (same behavior as Mux)
      if (percent >= 90 && !isCompleted) {
        handleMarkComplete();
      }
    }}
  />
```

Add the import at the top of the file:
```typescript
import { YouTubePlayer } from '@/components/video/YouTubePlayer';
```

## FILES TO CREATE
1. `apps/web/src/components/video/YouTubePlayer.tsx`

## FILES TO MODIFY
1. `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx` — replace iframe with YouTubePlayer

## IMPORTANT CONSTRAINTS
- The YouTube IFrame API script must only be loaded once even if component remounts
- Handle the case where the YouTube API fails to load (show the plain iframe as fallback)
- Use `origin` parameter in player config for security
- The milestone reporting (25/50/75/90%) should match the Mux VideoPlayer behavior exactly
- Polling at 3-second intervals is sufficient — don't poll more frequently
- Clean up the interval on unmount
- The `onProgress` callback at 90% triggers `handleMarkComplete()` which is already idempotent
- If Prompt 1 has been implemented, the backend will handle the rest. If not, the manual `handleMarkComplete()` call still works
```

---

## PROMPT 4: Connect Code Exercise Completion to Lesson Progress (Frontend Feedback)

```
You are working on an e-learning platform with Next.js frontend and NestJS backend.

## PROBLEM

When a student gets all test cases accepted on a code exercise, the UI shows "Accepted" status but gives no feedback about lesson completion. The student doesn't know their lesson/course progress was updated (if Prompt 1 was implemented) or that they should click "Mark Complete" (if it wasn't).

Also, the `NotificationType.SUBMISSION_GRADED` enum value exists in the Prisma schema but is never emitted.

## WHAT TO BUILD

### Step 1: Show lesson completion feedback after ACCEPTED submission

File: `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx`

In the submission result display (lines 498-533), when `submissionResult.status === 'ACCEPTED'`, add a visual celebration:

After the existing "Accepted" text (line 514-515), add:

```tsx
{submissionResult.status === 'ACCEPTED' && (
  <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-100 rounded-md p-2">
    <CheckCircle className="h-4 w-4" />
    <span className="text-sm font-medium">
      All tests passed! Your lesson progress has been updated.
    </span>
  </div>
)}
```

Also, after a successful ACCEPTED submission, refresh the completion status so the top bar badge updates:

In the `handleSubmitCode` function, after receiving a successful ACCEPTED result, re-fetch the lesson completion status:

```typescript
// After setting submissionResult:
if (result.status === 'ACCEPTED') {
  setIsCompleted(true); // Optimistic update
}
```

### Step 2: Emit SUBMISSION_GRADED notification from backend

File: `apps/api/src/modules/code-execution/code-exercise.service.ts`

After the submission is graded (after line 410), emit a notification:

```typescript
// After trackExecution, if status is ACCEPTED
if (overallStatus === 'ACCEPTED') {
  // Emit notification (fire and forget)
  this.notificationsService.createNotification({
    userId,
    type: 'SUBMISSION_GRADED',
    title: 'Code Exercise Accepted',
    body: `Your submission for "${exercise.title}" passed all tests!`,
    data: {
      exerciseId: exercise.id,
      lessonId: exercise.lessonId,
      submissionId: submission.id,
    },
  }).catch(() => {}); // Don't block on notification failure
}
```

Inject `NotificationsService` into `CodeExerciseService`. Update the module to import `NotificationsModule`.

Check `apps/api/src/modules/notifications/notifications.service.ts` for the `createNotification` method signature and adjust the call accordingly. The notification service likely accepts a DTO — match its interface.

### Step 3: Show exercise completion indicators in the exercise tab list

File: `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx`

In the exercise tab buttons (lines 423-438), add a checkmark for exercises that have been accepted:

```tsx
{lesson.codeExercises.map((exercise) => {
  const hasAccepted = submissions.some(
    s => s.exerciseId === exercise.id && s.status === 'ACCEPTED'
  );
  return (
    <button
      key={exercise.id}
      onClick={() => handleExerciseSelect(exercise)}
      className={`px-3 py-1 rounded-md text-sm border transition-colors flex items-center gap-1 ${
        selectedExerciseId === exercise.id
          ? 'bg-primary text-primary-foreground border-primary'
          : hasAccepted
            ? 'border-green-500 bg-green-50 text-green-700'
            : 'border-muted hover:bg-muted'
      }`}
    >
      {hasAccepted && <CheckCircle className="h-3 w-3" />}
      {exercise.title}
    </button>
  );
})}
```

For this to work, you need submissions to include `exerciseId`. Check that the submissions state already has this field from the API response (it should — `CodeSubmission` model has `exerciseId`).

## FILES TO MODIFY
1. `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx` — ACCEPTED celebration, completion status update, exercise tab indicators
2. `apps/api/src/modules/code-execution/code-exercise.service.ts` — emit SUBMISSION_GRADED notification
3. `apps/api/src/modules/code-execution/code-execution.module.ts` — import NotificationsModule

## IMPORTANT CONSTRAINTS
- Don't block code grading on notification failure — use fire-and-forget
- The notification should only fire for ACCEPTED, not other statuses
- Check the actual NotificationsService method signature before calling it
- Keep the celebration UI subtle — a small green banner, not a modal or confetti
```

---

## PROMPT 5: Add Lesson-Level Community Discussion Threads

```
You are working on an e-learning platform monorepo (NestJS backend + Next.js frontend + Prisma ORM + PostgreSQL).

## PROBLEM

The community forum is course-level only. The `CommunityMessage` model has `courseId` and `channelId` but NO `lessonId`. Students can't discuss specific lessons or exercises — all discussion is mixed together in a single Q&A channel per course. This makes it hard to find relevant help and creates a noisy experience.

## CURRENT SCHEMA

```prisma
model CommunityMessage {
  id        String                 @id @default(cuid())
  courseId  String                 @map("course_id")
  channelId String                 @map("channel_id")
  authorId  String                 @map("author_id")
  parentId  String?                @map("parent_id")
  body      String
  status    CommunityMessageStatus @default(ACTIVE)
  isPinned  Boolean                @default(false)
  isAnswer  Boolean                @default(false)
  isLocked  Boolean                @default(false)
  clientId  String?                @map("client_id")
  createdAt DateTime               @default(now())
  updatedAt DateTime               @updatedAt

  // Relations...
  @@index([courseId, channelId, createdAt])
  @@index([parentId, createdAt])
  @@map("community_messages")
}
```

The community service is at: `apps/api/src/modules/community/community.service.ts`
The community gateway (WebSocket) is at: `apps/api/src/modules/community/community.gateway.ts`
The community frontend page is at: `apps/web/src/app/[locale]/courses/[slug]/community/page.tsx`
The community API client is at: `apps/web/src/lib/api/community.ts`

## WHAT TO BUILD

### Step 1: Add `lessonId` to CommunityMessage schema

File: `apps/api/prisma/schema.prisma`

Add an optional `lessonId` field to `CommunityMessage`:

```prisma
model CommunityMessage {
  // ... existing fields ...
  lessonId  String?                @map("lesson_id")  // ADD THIS

  // Add relation
  lesson    Lesson?                @relation(fields: [lessonId], references: [id])

  // Update the existing index to include lessonId for filtering
  @@index([courseId, channelId, lessonId, createdAt])  // REPLACE existing index
}
```

Also add the reverse relation on the `Lesson` model:
```prisma
model Lesson {
  // ... existing fields ...
  communityMessages CommunityMessage[]  // ADD THIS
}
```

Run migration: `npx prisma migrate dev --name add_lesson_id_to_community_messages`

### Step 2: Update community service to support lessonId filtering

File: `apps/api/src/modules/community/community.service.ts`

Find the method that lists messages for a channel (likely `getMessages` or `listMessages`). Add an optional `lessonId` filter parameter:

```typescript
async getMessages(
  channelId: string,
  user: AuthUser,
  options: {
    cursor?: string;
    limit?: number;
    lessonId?: string;  // ADD THIS
  },
) {
  // In the Prisma query's `where` clause, add:
  // ...(options.lessonId && { lessonId: options.lessonId }),
}
```

Also update the `createMessage` method to accept an optional `lessonId`:

```typescript
// In the message creation data:
data: {
  // ...existing fields...
  lessonId: dto.lessonId || null,  // ADD THIS
}
```

### Step 3: Update the create message DTO

Find the create message DTO (likely in `apps/api/src/modules/community/dto/`). Add:

```typescript
@IsOptional()
@IsString()
lessonId?: string;
```

### Step 4: Update the WebSocket gateway

File: `apps/api/src/modules/community/community.gateway.ts`

When broadcasting new messages via WebSocket, include `lessonId` in the payload so clients can filter in real-time.

### Step 5: Add lesson discussion section to lesson page

File: `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx`

After the code exercises section (after line 596), add a collapsible discussion section:

```tsx
{/* Lesson Discussion */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-base">
      <MessageSquare className="h-5 w-5 text-primary" />
      Lesson Discussion
      {discussionCount > 0 && (
        <Badge variant="secondary">{discussionCount}</Badge>
      )}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <LessonDiscussion
      courseId={courseId}
      lessonId={lessonId}
    />
  </CardContent>
</Card>
```

### Step 6: Create LessonDiscussion component

Create: `apps/web/src/components/community/LessonDiscussion.tsx`

This is a simplified version of the full community page, scoped to the current lesson:

- Fetches messages from the course's Q&A channel filtered by `lessonId`
- Shows a compact message list (3-5 recent messages)
- Has a "Post a question" text input
- Has a "View all in community" link to the full community page with lesson filter
- Uses the existing community API client functions — just add `lessonId` as a query parameter

### Step 7: Update community API client

File: `apps/web/src/lib/api/community.ts`

Add `lessonId` as an optional parameter to the message fetching functions:

```typescript
export async function getChannelMessages(
  channelId: string,
  options?: { cursor?: string; limit?: number; lessonId?: string },
) {
  const params = new URLSearchParams();
  if (options?.cursor) params.set('cursor', options.cursor);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.lessonId) params.set('lessonId', options.lessonId);
  // ...
}
```

### Step 8: Add lesson filter to community page

File: `apps/web/src/app/[locale]/courses/[slug]/community/page.tsx`

Add a dropdown or sidebar that lets users filter messages by lesson. This requires fetching the course sections/lessons for the filter options.

## FILES TO CREATE
1. `apps/web/src/components/community/LessonDiscussion.tsx`
2. Prisma migration (auto-generated)

## FILES TO MODIFY
1. `apps/api/prisma/schema.prisma` — add lessonId to CommunityMessage, add relation on Lesson
2. `apps/api/src/modules/community/community.service.ts` — add lessonId filter to getMessages, add lessonId to createMessage
3. `apps/api/src/modules/community/community.gateway.ts` — include lessonId in WebSocket payload
4. Community DTO file — add optional lessonId field
5. `apps/web/src/lib/api/community.ts` — add lessonId parameter
6. `apps/web/src/app/[locale]/courses/[slug]/lessons/[lessonId]/page.tsx` — add LessonDiscussion section
7. `apps/web/src/app/[locale]/courses/[slug]/community/page.tsx` — add lesson filter dropdown

## IMPORTANT CONSTRAINTS
- `lessonId` must be OPTIONAL (nullable) — existing messages without lessonId should still work
- Don't break the existing community page — it should show ALL messages by default, with lesson filtering as an optional feature
- The WebSocket room structure (by channel) should not change — just add lessonId to the message payload
- Run the Prisma migration to add the column
- Keep the LessonDiscussion component lightweight — lazy load it, show max 5 recent messages with a "load more" link
```

---

## PROMPT 6: Complete Live Streaming Pipeline (Recordings + Course Page Visibility)

```
You are working on an e-learning platform monorepo (NestJS backend + Next.js frontend + Prisma ORM + PostgreSQL).

## PROBLEM

Live streaming sessions (via ZegoCloud) have two gaps:

1. **Recordings are not automated**: The `LiveClass` model has `recordingAssetId` and `recordingUrl` fields, but there's no automated pipeline to convert a completed stream's recording into a `VideoAsset` that can be played back. Admins must manually do this.

2. **Upcoming live classes are invisible on course pages**: Students enrolled in a course have no way to see upcoming live sessions from the course detail page. They'd have to know the stream URL.

3. **Attendance doesn't count toward engagement**: `LiveClassAttendee` records exist but the analytics system (`StudentActivityEvent`) has no event type for live class attendance. Streaks don't consider attendance.

## CURRENT SCHEMA

```prisma
model LiveClass {
  id               String          @id @default(cuid())
  title            String
  courseId         String?         @map("course_id")
  instructorId     String          @map("instructor_id")
  startAt          DateTime        @map("start_at")
  durationMinutes  Int             @default(60)
  status           LiveClassStatus @default(UPCOMING)
  recordingAssetId String?         @map("recording_asset_id")
  recordingUrl     String?         @map("recording_url")
  playbackHlsUrl   String?         @map("playback_hls_url")
  peakViewers      Int?
  totalViewers     Int?
  actualStartAt    DateTime?
  actualEndAt      DateTime?
  // ...
  course     Course?             @relation(...)
  instructor User                @relation(...)
  attendees  LiveClassAttendee[]
}

model LiveClassAttendee {
  id           String    @id @default(cuid())
  liveClassId  String
  userId       String
  joinedAt     DateTime?
  leftAt       DateTime?
  registeredAt DateTime  @default(now())
  @@unique([liveClassId, userId])
}

enum LiveClassStatus {
  UPCOMING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model CourseStream {
  id           String
  roomId       String       @unique
  courseId     String
  instructorId String
  title        String
  status       StreamStatus  // SCHEDULED, LIVE, ENDED
  scheduledAt  DateTime?
  startedAt    DateTime?
  endedAt      DateTime?
  viewerCount  Int
  streamId     String?
  course     Course
  instructor User
  viewers    StreamViewer[]
}
```

Streaming service: `apps/api/src/modules/streaming/streaming.service.ts`
Streaming controller: `apps/api/src/modules/streaming/streaming.controller.ts`
Course detail page: `apps/web/src/app/[locale]/courses/[slug]/page.tsx`
Course service: `apps/api/src/modules/courses/courses.service.ts`

## WHAT TO BUILD

### Step 1: Add LIVE_CLASS_ATTEND to analytics events

File: `apps/api/prisma/schema.prisma`

Add to the `AnalyticsEventType` enum:

```prisma
enum AnalyticsEventType {
  // ... existing values ...
  LIVE_CLASS_JOIN    // NEW
  LIVE_CLASS_LEAVE   // NEW
}
```

Run migration: `npx prisma migrate dev --name add_live_class_analytics_events`

### Step 2: Track live class attendance as analytics events

File: `apps/api/src/modules/streaming/streaming.service.ts`

In the `joinStream()` method (where `StreamViewer` or `LiveClassAttendee` records are created), also create a `StudentActivityEvent`:

```typescript
// After creating the viewer/attendee record:
await this.prisma.studentActivityEvent.create({
  data: {
    studentId: userId,
    courseId: stream.courseId,
    eventType: 'LIVE_CLASS_JOIN',
    sessionId: `live-${streamId}-${userId}`,
    eventData: {
      streamId,
      liveClassId: stream.liveClassId || null,
      title: stream.title,
    },
    eventTimestamp: new Date(),
  },
}).catch(() => {}); // Don't block stream join on analytics failure
```

Similarly in `leaveStream()`, create a `LIVE_CLASS_LEAVE` event.

### Step 3: Handle LIVE_CLASS_JOIN in analytics service for streaks

File: `apps/api/src/modules/analytics/analytics.service.ts`

In the `updateProgressFromEvent` switch statement (line 42-68), add:

```typescript
case 'LIVE_CLASS_JOIN':
  await this.updateLastActivity(studentId, event.courseId, now);
  break;
```

This ensures live class attendance counts toward streak calculation (via `lastActivityAt` update).

### Step 4: Add upcoming live classes to course detail API

File: `apps/api/src/modules/courses/courses.service.ts`

In the method that returns course details (find the `getCourseBySlug` or `getCourseById` method), add a query for upcoming live classes:

```typescript
// Alongside existing course data fetching:
const upcomingClasses = await this.prisma.liveClass.findMany({
  where: {
    courseId: course.id,
    status: { in: ['UPCOMING', 'IN_PROGRESS'] },
    startAt: { gte: new Date() },
  },
  select: {
    id: true,
    title: true,
    startAt: true,
    durationMinutes: true,
    status: true,
    instructor: {
      select: { id: true, name: true, avatarUrl: true },
    },
  },
  orderBy: { startAt: 'asc' },
  take: 5,
});

// Also fetch completed classes with recordings
const recordedClasses = await this.prisma.liveClass.findMany({
  where: {
    courseId: course.id,
    status: 'COMPLETED',
    recordingUrl: { not: null },
  },
  select: {
    id: true,
    title: true,
    startAt: true,
    recordingUrl: true,
    recordingAssetId: true,
    playbackHlsUrl: true,
  },
  orderBy: { startAt: 'desc' },
  take: 10,
});
```

Include `upcomingClasses` and `recordedClasses` in the response.

### Step 5: Display upcoming live classes on course detail page

File: `apps/web/src/app/[locale]/courses/[slug]/page.tsx`

After the course description/curriculum section, add an "Upcoming Live Sessions" section:

```tsx
{course.upcomingClasses?.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-red-500" />
        Upcoming Live Sessions
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {course.upcomingClasses.map((liveClass) => (
          <div
            key={liveClass.id}
            className="flex items-center justify-between p-3 rounded-lg border"
          >
            <div>
              <p className="font-medium">{liveClass.title}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(liveClass.startAt).toLocaleString()} ({liveClass.durationMinutes} min)
              </p>
              <p className="text-xs text-muted-foreground">
                Instructor: {liveClass.instructor.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {liveClass.status === 'IN_PROGRESS' ? (
                <Link href={`/stream/${liveClass.id}`}>
                  <Button size="sm" variant="destructive">
                    Join Live
                  </Button>
                </Link>
              ) : (
                <Badge variant="outline">
                  {formatDistanceToNow(new Date(liveClass.startAt), { addSuffix: true })}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

Also add a "Recorded Sessions" section if `course.recordedClasses` has items, with playback links.

### Step 6: Add endpoint to save recording after stream ends

File: `apps/api/src/modules/streaming/streaming.service.ts`

Add a method `saveRecording()` that creates or links a VideoAsset:

```typescript
async saveRecording(
  liveClassId: string,
  recordingData: { url: string; assetId?: string; hlsUrl?: string },
) {
  const liveClass = await this.prisma.liveClass.findUnique({
    where: { id: liveClassId },
  });

  if (!liveClass) throw new NotFoundException('Live class not found');

  // If we have a provider asset ID, create a VideoAsset record
  let recordingAssetId = recordingData.assetId;
  if (recordingData.url && !recordingAssetId) {
    const videoAsset = await this.prisma.videoAsset.create({
      data: {
        title: `Recording: ${liveClass.title}`,
        provider: 'recording',
        providerAssetId: `rec-${liveClass.id}`,
        status: 'READY',
        duration: liveClass.durationMinutes * 60,
        isPublic: false,
        uploadedById: liveClass.instructorId,
      },
    });
    recordingAssetId = videoAsset.id;
  }

  return this.prisma.liveClass.update({
    where: { id: liveClassId },
    data: {
      recordingUrl: recordingData.url,
      recordingAssetId,
      playbackHlsUrl: recordingData.hlsUrl,
    },
  });
}
```

Add a controller endpoint for this (admin/instructor only):

```typescript
@Post(':id/recording')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INSTRUCTOR, Role.ADMIN)
async saveRecording(
  @Param('id') id: string,
  @Body() body: { url: string; assetId?: string; hlsUrl?: string },
) {
  return this.streamingService.saveRecording(id, body);
}
```

This gives a clean API for saving recordings, whether triggered manually by an instructor or via a webhook from the streaming provider.

## FILES TO MODIFY
1. `apps/api/prisma/schema.prisma` — add LIVE_CLASS_JOIN, LIVE_CLASS_LEAVE to AnalyticsEventType enum
2. `apps/api/src/modules/streaming/streaming.service.ts` — track attendance analytics, add saveRecording()
3. `apps/api/src/modules/streaming/streaming.controller.ts` — add saveRecording endpoint
4. `apps/api/src/modules/analytics/analytics.service.ts` — handle LIVE_CLASS_JOIN in switch
5. `apps/api/src/modules/courses/courses.service.ts` — include upcoming/recorded classes in course detail
6. `apps/web/src/app/[locale]/courses/[slug]/page.tsx` — display upcoming and recorded sessions

## IMPORTANT CONSTRAINTS
- Never block the stream join/leave flow on analytics failures — always catch and ignore
- The recording save endpoint must be instructor/admin only
- `LiveClass.courseId` is OPTIONAL in the schema — handle the null case
- Don't change the ZegoCloud streaming integration itself — only add the data pipeline around it
- The analytics enum migration should be a simple ALTER TYPE ADD VALUE — Prisma handles this
- Keep existing CourseStream model working alongside LiveClass — they serve different purposes (CourseStream = ZegoCloud rooms, LiveClass = scheduled sessions)
```

---

## Execution Order

| Order | Prompt | Dependency | Estimated Scope |
|-------|--------|------------|-----------------|
| 1 | Unify Progress Tracking | None | 6 files modified |
| 2 | Context-Aware AI Chatbot | None | 6 files modified, 2 created |
| 3 | YouTube Progress Tracking | Prompt 1 (for auto-complete) | 1 file created, 1 modified |
| 4 | Code Exercise Feedback | Prompt 1 (for auto-progress) | 3 files modified |
| 5 | Lesson-Level Community | None (1 migration) | 7 files modified, 1 created |
| 6 | Live Streaming Pipeline | None (1 migration) | 6 files modified |

> Prompts 1, 2, 5, and 6 are independent and can be executed in parallel. Prompts 3 and 4 should run after Prompt 1.
