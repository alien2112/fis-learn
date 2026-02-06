# Student Analytics System Design (Simplified)
## Production-Ready but Simple Architecture

---

## 1. Philosophy: Start Simple, Scale Later

**Current Approach (MVP):**
- Single PostgreSQL database (no separate analytics DB)
- Simple REST API for event tracking
- Cron jobs for aggregations
- Optional Redis for caching

**Future Expansion Path:**
- Add read replicas when read load grows
- Add ClickHouse later for complex analytics
- Add Kafka only if event volume exceeds 1M/day
- Keep schema compatible for easy migration

---

## 2. Simplified Data Model

### 2.1 Core Tables Only

#### StudentActivityEvents (Partitioned by Month)
```sql
-- Main events table - partitioned for easy cleanup
CREATE TABLE student_activity_events (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES users(id),
    course_id           UUID REFERENCES courses(id),
    lesson_id           UUID REFERENCES lessons(id),
    event_type          VARCHAR(50) NOT NULL,
    event_timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_id          UUID NOT NULL,
    event_data          JSONB DEFAULT '{}',
    device_type         VARCHAR(20),
    created_at          TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (event_timestamp);

-- Create monthly partitions
CREATE TABLE student_activity_events_2024_01 
    PARTITION OF student_activity_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes for common queries
CREATE INDEX idx_events_student_time 
    ON student_activity_events(student_id, event_timestamp DESC);
CREATE INDEX idx_events_course_time 
    ON student_activity_events(course_id, event_timestamp DESC);
CREATE INDEX idx_events_type_time 
    ON student_activity_events(event_type, event_timestamp DESC);
```

#### StudentProgress (Current State - Always Updated)
```sql
-- One row per student per course - always up to date
CREATE TABLE student_progress (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES users(id),
    course_id           UUID NOT NULL REFERENCES courses(id),
    
    -- Progress
    completion_pct      DECIMAL(5,2) DEFAULT 0,
    lessons_completed   INT DEFAULT 0,
    total_lessons       INT DEFAULT 0,
    
    -- Time tracking
    time_spent_seconds  INT DEFAULT 0,
    last_activity_at    TIMESTAMPTZ,
    
    -- Streak
    current_streak_days INT DEFAULT 0,
    longest_streak_days INT DEFAULT 0,
    last_streak_date    DATE,
    
    -- Status
    status              VARCHAR(20) DEFAULT 'active', -- active, completed, dropped
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, course_id)
);

-- Indexes
CREATE INDEX idx_progress_student ON student_progress(student_id, status);
CREATE INDEX idx_progress_course ON student_progress(course_id, status);
CREATE INDEX idx_progress_activity ON student_progress(last_activity_at);
```

#### StudentVideoProgress (Simple Video Tracking)
```sql
-- One row per video per student
CREATE TABLE student_video_progress (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL,
    video_id            UUID NOT NULL,
    course_id           UUID NOT NULL,
    lesson_id           UUID NOT NULL,
    
    watch_pct           DECIMAL(5,2) DEFAULT 0,
    seconds_watched     INT DEFAULT 0,
    video_duration      INT DEFAULT 0,
    completed           BOOLEAN DEFAULT FALSE,
    last_position       INT DEFAULT 0,
    
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, video_id)
);

CREATE INDEX idx_video_progress_student ON student_video_progress(student_id, course_id);
```

#### AssessmentAttempts (Quiz/Assignment Tracking)
```sql
CREATE TABLE assessment_attempts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL,
    assessment_id       UUID NOT NULL,
    assessment_type     VARCHAR(20) NOT NULL, -- quiz, assignment
    course_id           UUID NOT NULL,
    
    attempt_number      INT DEFAULT 1,
    score               DECIMAL(5,2),
    max_score           DECIMAL(5,2),
    is_passed           BOOLEAN,
    time_spent_seconds  INT,
    
    status              VARCHAR(20) DEFAULT 'submitted',
    submitted_at        TIMESTAMPTZ DEFAULT NOW(),
    graded_at           TIMESTAMPTZ,
    
    UNIQUE(student_id, assessment_id, attempt_number)
);

CREATE INDEX idx_attempts_student ON assessment_attempts(student_id, assessment_type);
CREATE INDEX idx_attempts_course ON assessment_attempts(course_id, submitted_at);
```

### 2.2 Aggregation Table (Daily Summary)

```sql
-- Pre-computed daily metrics - updated by cron job
CREATE TABLE student_daily_stats (
    id                  BIGSERIAL PRIMARY KEY,
    student_id          UUID NOT NULL,
    stat_date           DATE NOT NULL,
    
    -- Activity
    sessions_count      INT DEFAULT 0,
    total_time_seconds  INT DEFAULT 0,
    lessons_completed   INT DEFAULT 0,
    
    -- Engagement
    videos_watched      INT DEFAULT 0,
    quizzes_attempted   INT DEFAULT 0,
    
    -- Calculated
    was_active          BOOLEAN DEFAULT FALSE,
    
    UNIQUE(student_id, stat_date)
);

CREATE INDEX idx_daily_stats_student ON student_daily_stats(student_id, stat_date DESC);
CREATE INDEX idx_daily_stats_date ON student_daily_stats(stat_date) WHERE was_active = TRUE;
```

---

## 3. Simple Event Tracking (REST API)

### 3.1 Event Types (Minimal Set)

| Event | When to Send | Data |
|-------|--------------|------|
| `session_start` | User opens app | device_type |
| `lesson_start` | Opens lesson | lesson_id |
| `lesson_complete` | Finishes lesson | time_spent |
| `video_progress` | Every 10s while watching | current_time, duration |
| `quiz_submit` | Submits quiz | score, time_spent |
| `assignment_submit` | Submits assignment | - |

### 3.2 Simple Tracking API

```typescript
// POST /api/analytics/events
interface TrackEventDto {
  event_type: string;
  timestamp: string;  // ISO8601
  session_id: string;
  course_id?: string;
  lesson_id?: string;
  payload?: Record<string, any>;
}

// Response: { success: boolean, event_id: string }
```

### 3.3 Client Implementation

```typescript
class SimpleAnalytics {
  private sessionId: string;
  private buffer: AnalyticsEvent[] = [];
  
  constructor() {
    this.sessionId = generateUUID();
    this.startFlushInterval();
  }
  
  track(eventType: string, data: any = {}) {
    this.buffer.push({
      event_type: eventType,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      ...data
    });
    
    // Flush immediately for important events
    if (['quiz_submit', 'lesson_complete'].includes(eventType)) {
      this.flush();
    }
  }
  
  // Flush every 30 seconds or when buffer has 10 events
  private startFlushInterval() {
    setInterval(() => {
      if (this.buffer.length > 0) this.flush();
    }, 30000);
  }
  
  private async flush() {
    const events = [...this.buffer];
    this.buffer = [];
    
    await fetch('/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({ events })
    });
  }
}

// Usage
const analytics = new SimpleAnalytics();
analytics.track('lesson_start', { course_id: 'abc', lesson_id: 'xyz' });
```

---

## 4. Backend Implementation (NestJS)

### 4.1 Simple Event Service

```typescript
@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('analytics') private analyticsQueue: Queue, // Optional Bull queue
  ) {}

  // Batch insert events
  async trackEvents(events: AnalyticsEvent[], studentId: string) {
    // 1. Store raw events
    await this.prisma.studentActivityEvents.createMany({
      data: events.map(e => ({
        student_id: studentId,
        event_type: e.event_type,
        event_timestamp: new Date(e.timestamp),
        session_id: e.session_id,
        course_id: e.course_id,
        lesson_id: e.lesson_id,
        event_data: e.payload,
        device_type: e.device_type,
      })),
      skipDuplicates: true,
    });

    // 2. Update progress in real-time for key events
    for (const event of events) {
      await this.updateProgressFromEvent(studentId, event);
    }
  }

  private async updateProgressFromEvent(studentId: string, event: AnalyticsEvent) {
    switch (event.event_type) {
      case 'lesson_complete':
        await this.updateLessonProgress(studentId, event);
        break;
      case 'video_progress':
        await this.updateVideoProgress(studentId, event);
        break;
      case 'quiz_submit':
        await this.updateQuizProgress(studentId, event);
        break;
    }
  }

  private async updateLessonProgress(studentId: string, event: AnalyticsEvent) {
    const { course_id, lesson_id, payload } = event;
    
    // Get course stats
    const courseStats = await this.prisma.courseStats.findUnique({
      where: { course_id },
    });
    
    // Upsert progress
    await this.prisma.studentProgress.upsert({
      where: {
        student_id_course_id: { student_id: studentId, course_id },
      },
      create: {
        student_id: studentId,
        course_id,
        lessons_completed: 1,
        total_lessons: courseStats.total_lessons,
        completion_pct: (1 / courseStats.total_lessons) * 100,
        time_spent_seconds: payload.time_spent || 0,
        last_activity_at: new Date(),
      },
      update: {
        lessons_completed: { increment: 1 },
        completion_pct: {
          set: raw`
            (lessons_completed + 1)::decimal / ${courseStats.total_lessons} * 100
          `,
        },
        time_spent_seconds: { increment: payload.time_spent || 0 },
        last_activity_at: new Date(),
      },
    });
  }
}
```

### 4.2 Controller

```typescript
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post('events')
  async trackEvents(
    @Body() dto: TrackEventsDto,
    @CurrentUser() user: User,
  ) {
    await this.analyticsService.trackEvents(dto.events, user.id);
    return { success: true };
  }

  @Get('my-progress/:courseId')
  async getMyProgress(
    @Param('courseId') courseId: string,
    @CurrentUser() user: User,
  ) {
    return this.analyticsService.getStudentProgress(user.id, courseId);
  }

  @Get('my-stats')
  async getMyStats(@CurrentUser() user: User) {
    return this.analyticsService.getStudentStats(user.id);
  }
}
```

---

## 5. Aggregation (Simple Cron Job)

### 5.1 Daily Stats Aggregation

```typescript
// Run once per day at 2 AM
@Injectable()
export class AnalyticsAggregationService {
  constructor(private prisma: PrismaService) {}

  @Cron('0 2 * * *')
  async aggregateDailyStats() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    // Aggregate in raw SQL for performance
    await this.prisma.$executeRaw`
      INSERT INTO student_daily_stats (
        student_id, stat_date, sessions_count, total_time_seconds,
        lessons_completed, videos_watched, quizzes_attempted, was_active
      )
      SELECT 
        student_id,
        DATE(event_timestamp) as stat_date,
        COUNT(DISTINCT session_id) as sessions_count,
        COALESCE(SUM((event_data->>'time_spent')::int), 0) as total_time_seconds,
        COUNT(*) FILTER (WHERE event_type = 'lesson_complete') as lessons_completed,
        COUNT(*) FILTER (WHERE event_type = 'video_complete') as videos_watched,
        COUNT(*) FILTER (WHERE event_type = 'quiz_submit') as quizzes_attempted,
        TRUE as was_active
      FROM student_activity_events
      WHERE DATE(event_timestamp) = ${dateStr}
      GROUP BY student_id, DATE(event_timestamp)
      ON CONFLICT (student_id, stat_date) 
      DO UPDATE SET
        sessions_count = EXCLUDED.sessions_count,
        total_time_seconds = EXCLUDED.total_time_seconds,
        lessons_completed = EXCLUDED.lessons_completed,
        videos_watched = EXCLUDED.videos_watched,
        quizzes_attempted = EXCLUDED.quizzes_attempted,
        was_active = TRUE
    `;

    // Clean up old raw events (keep 90 days)
    await this.prisma.$executeRaw`
      DELETE FROM student_activity_events
      WHERE event_timestamp < NOW() - INTERVAL '90 days'
    `;
  }
}
```

---

## 6. Dashboard Data Queries

### 6.1 Student Dashboard

```typescript
async getStudentDashboard(studentId: string) {
  // Current courses progress
  const activeCourses = await this.prisma.studentProgress.findMany({
    where: { 
      student_id: studentId,
      status: { in: ['active', 'completed'] }
    },
    include: {
      course: {
        select: { title: true, thumbnail_url: true }
      }
    },
    orderBy: { last_activity_at: 'desc' },
    take: 5,
  });

  // Weekly activity
  const weeklyActivity = await this.prisma.studentDailyStats.findMany({
    where: {
      student_id: studentId,
      stat_date: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    },
    orderBy: { stat_date: 'asc' },
  });

  // Overall stats
  const overallStats = await this.prisma.studentProgress.aggregate({
    where: { student_id: studentId },
    _sum: {
      time_spent_seconds: true,
      lessons_completed: true,
    },
    _count: {
      course_id: true,
    }
  });

  return {
    activeCourses,
    weeklyActivity,
    overallStats: {
      totalCourses: overallStats._count.course_id,
      totalTimeHours: Math.round((overallStats._sum.time_spent_seconds || 0) / 3600),
      totalLessons: overallStats._sum.lessons_completed,
    }
  };
}
```

### 6.2 Instructor Dashboard

```typescript
async getCourseAnalytics(courseId: string, instructorId: string) {
  // Verify instructor owns course
  const course = await this.prisma.courses.findFirst({
    where: { id: courseId, instructor_id: instructorId }
  });
  if (!course) throw new ForbiddenException();

  // Enrollment stats
  const enrollmentStats = await this.prisma.studentProgress.aggregate({
    where: { course_id: courseId },
    _count: { student_id: true },
    _sum: { 
      lessons_completed: true,
      time_spent_seconds: true 
    },
  });

  // Completion rate
  const completed = await this.prisma.studentProgress.count({
    where: { course_id: courseId, status: 'completed' }
  });

  // At-risk students (no activity in 7 days)
  const atRisk = await this.prisma.studentProgress.count({
    where: {
      course_id: courseId,
      last_activity_at: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      status: 'active'
    }
  });

  // Recent activity trend
  const recentActivity = await this.prisma.$queryRaw`
    SELECT 
      DATE(last_activity_at) as date,
      COUNT(*) as active_students
    FROM student_progress
    WHERE course_id = ${courseId}
      AND last_activity_at > NOW() - INTERVAL '14 days'
    GROUP BY DATE(last_activity_at)
    ORDER BY date DESC
  `;

  return {
    totalStudents: enrollmentStats._count.student_id,
    completionRate: (completed / enrollmentStats._count.student_id) * 100,
    avgTimePerStudent: Math.round(
      (enrollmentStats._sum.time_spent_seconds || 0) / 
      enrollmentStats._count.student_id / 3600
    ),
    atRiskCount: atRisk,
    recentActivity,
  };
}
```

---

## 7. Scalability Path

### Current (Up to 100K students, 1M events/day)
```
Single PostgreSQL Instance
├── Partitioned events table (by month)
├── Simple indexes on foreign keys
└── Daily cron job for aggregations
```

### Phase 2 (100K-500K students, 5M events/day)
```
PostgreSQL Primary + Read Replica
├── Primary: Writes + real-time queries
├── Replica: Dashboard reads + aggregations
└── Redis: Cache for hot data (progress, stats)
```

### Phase 3 (500K+ students, 10M+ events/day)
```
PostgreSQL (Transactional) + ClickHouse (Analytics)
├── PostgreSQL: Current state (progress, users)
├── ClickHouse: Historical events, aggregations
└── Redis: Session cache, real-time counters
```

### Phase 4 (1M+ students, 50M+ events/day)
```
Add Kafka only if needed
├── Kafka: Event buffering during peaks
├── PostgreSQL: Same as Phase 3
├── ClickHouse: Same as Phase 3
└── Keep it simple until this is actually needed
```

---

## 8. Simple Tech Stack

| Component | Current | Future (if needed) |
|-----------|---------|-------------------|
| Database | PostgreSQL 16 | Add read replica |
| Cache | Optional Redis | Redis Cluster |
| Queue | In-memory/Bull | Redis-backed Bull |
| Scheduling | node-cron/Bull | Same |
| Analytics DB | PostgreSQL | ClickHouse |
| Event Streaming | REST API | Kafka (optional) |

---

## 9. Implementation Checklist

### Week 1: Database
- [ ] Create events table with monthly partitions
- [ ] Create progress table
- [ ] Create video progress table
- [ ] Create assessment attempts table
- [ ] Add indexes

### Week 2: Tracking API
- [ ] POST /analytics/events endpoint
- [ ] Event validation middleware
- [ ] Batch insert logic
- [ ] Real-time progress updates

### Week 3: Dashboard APIs
- [ ] GET /analytics/my-progress/:courseId
- [ ] GET /analytics/my-stats
- [ ] GET /analytics/course/:courseId (instructor)
- [ ] Basic aggregation queries

### Week 4: Cron & Cleanup
- [ ] Daily stats aggregation job
- [ ] Old events cleanup (90 days)
- [ ] Cache warming (optional)
- [ ] Basic monitoring

---

## 10. Key Metrics to Track

### Must Track (Day 1)
1. Lesson start/complete
2. Video progress (10-second intervals, store final %)
3. Quiz submissions
4. Assignment submissions
5. Session duration

### Calculate From Data
- Course completion %
- Time spent per course
- Streak days
- At-risk status (no activity 7 days)

### Keep It Simple
- Don't track every click
- Don't track mouse movements
- Don't track page views (unless needed)
- Batch events on client (send every 30s)

---

## Summary

This design gives you:
- ✅ Simple PostgreSQL-only architecture
- ✅ Easy to understand and maintain
- ✅ Can handle 100K students on single instance
- ✅ Clear upgrade path when you grow
- ✅ No Kafka, no Flink, no complexity
- ✅ Production-ready with partitioning
- ✅ GDPR compliant (easy data deletion)
