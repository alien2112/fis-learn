# Student Analytics System Design
## Production-Ready E-Learning Platform Architecture

---

## 1. Executive Summary

This document outlines a comprehensive, scalable student analytics system designed for an enterprise e-learning platform serving 100K+ students with B2C/B2B hybrid model.

### Platform Context
- **Scale**: 100K+ students, 10K+ courses, 1K+ instructors
- **Content Types**: Video lessons, live sessions, quizzes, assignments, interactive content
- **Users**: Students, Instructors, Admins, Corporate Managers
- **Compliance**: GDPR, FERPA, SOC 2 Type II

---

## 2. Analytics Data Model

### 2.1 Core Fact Tables

#### StudentActivityEvents (Raw Events - Time-Series)
```sql
CREATE TABLE student_activity_events (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES users(id),
    course_id           UUID REFERENCES courses(id),
    lesson_id           UUID REFERENCES lessons(id),
    event_type          VARCHAR(50) NOT NULL,
    event_timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_id          UUID NOT NULL,
    event_data          JSONB,
    device_type         VARCHAR(20),
    browser             VARCHAR(50),
    os                  VARCHAR(50),
    ip_address          INET,
    country_code        CHAR(2),
    event_date          DATE GENERATED ALWAYS AS (DATE(event_timestamp)) STORED,
    event_hour          INT GENERATED ALWAYS AS (EXTRACT(HOUR FROM event_timestamp)) STORED
) PARTITION BY RANGE (event_date);
```

#### StudentCourseMetrics (Aggregated - Daily)
```sql
CREATE TABLE student_course_metrics (
    id                  BIGSERIAL PRIMARY KEY,
    student_id          UUID NOT NULL,
    course_id           UUID NOT NULL,
    metric_date         DATE NOT NULL,
    completion_pct      DECIMAL(5,2) DEFAULT 0,
    lessons_completed   INT DEFAULT 0,
    lessons_started     INT DEFAULT 0,
    total_lessons       INT DEFAULT 0,
    time_spent_total    INT DEFAULT 0,
    time_spent_video    INT DEFAULT 0,
    time_spent_reading  INT DEFAULT 0,
    time_spent_quiz     INT DEFAULT 0,
    sessions_count      INT DEFAULT 0,
    avg_session_duration INT DEFAULT 0,
    videos_watched      INT DEFAULT 0,
    video_watch_pct_avg DECIMAL(5,2) DEFAULT 0,
    quizzes_attempted   INT DEFAULT 0,
    quizzes_passed      INT DEFAULT 0,
    quiz_avg_score      DECIMAL(5,2) DEFAULT 0,
    assignments_submitted INT DEFAULT 0,
    last_activity_at    TIMESTAMPTZ,
    streak_days         INT DEFAULT 1,
    UNIQUE(student_id, course_id, metric_date)
);
```

#### StudentVideoEvents (Granular Video Analytics)
```sql
CREATE TABLE student_video_events (
    id                  BIGSERIAL PRIMARY KEY,
    student_id          UUID NOT NULL,
    video_id            UUID NOT NULL,
    course_id           UUID NOT NULL,
    lesson_id           UUID NOT NULL,
    session_id          UUID NOT NULL,
    event_type          VARCHAR(30) NOT NULL,
    event_timestamp     TIMESTAMPTZ NOT NULL,
    current_time        DECIMAL(10,2),
    video_duration      DECIMAL(10,2),
    playback_rate       DECIMAL(3,2) DEFAULT 1.0,
    video_quality       VARCHAR(10),
    buffer_health       INT
);
```

### 2.2 Dimension Tables

#### StudentAnalyticsProfile
```sql
CREATE TABLE student_analytics_profiles (
    student_id          UUID PRIMARY KEY REFERENCES users(id),
    first_enrollment_at TIMESTAMPTZ,
    total_enrollments   INT DEFAULT 0,
    active_enrollments  INT DEFAULT 0,
    completed_courses   INT DEFAULT 0,
    dropped_courses     INT DEFAULT 0,
    total_time_spent_hours DECIMAL(10,2) DEFAULT 0,
    avg_daily_minutes   INT DEFAULT 0,
    preferred_hour      INT,
    preferred_day       VARCHAR(10),
    avg_course_completion_days INT DEFAULT 0,
    learning_consistency_score DECIMAL(3,2),
    overall_avg_score   DECIMAL(5,2) DEFAULT 0,
    quiz_accuracy       DECIMAL(5,2) DEFAULT 0,
    at_risk_score       DECIMAL(3,2),
    last_activity_at    TIMESTAMPTZ,
    days_since_active   INT GENERATED ALWAYS AS 
                        (EXTRACT(DAY FROM NOW() - last_activity_at)) STORED,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Event Tracking Schema

### 3.1 Event Taxonomy

| Category | Event Name | Trigger | Priority |
|----------|-----------|---------|----------|
| **Session** | `session_start` | User opens platform | P0 |
| | `session_end` | User closes/30min inactive | P0 |
| **Course** | `course_enroll` | Enrollment confirmed | P0 |
| | `course_unenroll` | User drops course | P1 |
| | `course_complete` | 100% completion | P1 |
| **Lesson** | `lesson_start` | First interaction | P0 |
| | `lesson_complete` | Marked complete | P0 |
| **Video** | `video_play` | Play button clicked | P0 |
| | `video_pause` | Pause clicked | P1 |
| | `video_seek` | Scrubber moved | P2 |
| | `video_complete` | Watched 90%+ | P1 |
| **Quiz** | `quiz_start` | Begin attempt | P0 |
| | `quiz_answer` | Question answered | P2 |
| | `quiz_submit` | Submit attempt | P0 |
| **Assignment** | `assignment_start` | Open submission | P1 |
| | `assignment_submit` | File/text submitted | P0 |

### 3.2 Event Payload Schema
```typescript
interface AnalyticsEvent {
  event_id: string;
  event_type: string;
  timestamp: ISO8601String;
  student_id: string;
  session_id: string;
  context: {
    course_id?: string;
    lesson_id?: string;
    video_id?: string;
    assessment_id?: string;
  };
  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };
  payload: Record<string, unknown>;
}
```

---

## 4. Dashboard Architecture

### 4.1 Student Dashboard
- Overview: Learning streak, courses completed, total time
- Course Progress Cards with completion percentage
- Weekly Activity Heatmap
- Skills Mastery Radar Chart
- Quiz/Assessment Performance
- Recommended Next Steps

### 4.2 Instructor Dashboard
- Class Overview: Engagement, completion, performance metrics
- Student Risk Matrix (at-risk identification)
- Content Drop-off Analysis
- Assessment Performance Distribution
- Discussion Forum Activity
- Exportable Reports (CSV/PDF)

### 4.3 Admin Dashboard
- Platform Health: Active users, course completions, revenue
- Cohort Retention Analysis
- Top/Bottom Performing Courses
- Geographic Distribution
- System Performance Metrics

---

## 5. Real-Time vs Batch Processing

### 5.1 Real-Time (Sub-second)
- Session tracking
- Video progress updates
- Quiz scoring
- At-risk alerts

### 5.2 Near Real-Time (1-5 min)
- Leaderboards
- Course completion stats
- Instructor notifications

### 5.3 Batch (Hourly/Daily)
- Complex aggregations
- ML model training
- Compliance reports
- Data warehouse sync

---

## 6. Scalability Targets

| Metric | Current | 12-Month | 3-Year |
|--------|---------|----------|--------|
| Active Students | 100K | 500K | 2M |
| Daily Events | 10M | 50M | 200M |
| Data Ingestion | 5 GB/day | 25 GB/day | 100 GB/day |
| Storage | 2 TB | 10 TB | 50 TB |

---

## 7. Privacy & Compliance

### 7.1 GDPR
- Consent management for analytics tracking
- Right to be forgotten (data anonymization)
- Data export capability
- 90-day retention for raw events

### 7.2 FERPA
- Educational records access controls
- Audit logging for all data access
- Instructor legitimate interest validation
- 7-year retention for academic records

---

## 8. Technology Stack

| Component | Recommendation |
|-----------|---------------|
| Event Streaming | Apache Kafka |
| Stream Processing | Apache Flink |
| Raw Storage | PostgreSQL 16 (partitioned) |
| Analytics DB | ClickHouse |
| Cache | Redis Cluster |
| Orchestration | Apache Airflow |
| BI/Visualization | Apache Superset |
| ML Platform | MLflow + SageMaker |

---

## 9. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
- Event ingestion pipeline
- Core event tracking
- Basic student dashboard
- PostgreSQL with partitioning

### Phase 2: Enrichment (Weeks 5-8)
- Video analytics
- Engagement scoring
- Real-time session tracking
- ClickHouse aggregations

### Phase 3: Intelligence (Weeks 9-12)
- At-risk prediction
- Learning outcomes
- Cohort analysis
- Automated alerting

### Phase 4: Scale (Weeks 13-16)
- Performance optimization
- Compliance audit
- Advanced visualizations
- ML retraining pipeline

---

## 10. Must-Have vs Nice-to-Have

### Must-Have (Phase 1)
- Course enrollment count
- Lessons completed
- Time spent per course
- Course completion %
- Quiz scores
- Assignment status

### Important (Phase 2)
- Video watch percentage
- Drop-off points
- Session duration
- Daily activity
- At-risk detection

### Nice-to-Have (Phase 3)
- Playback speed usage
- Rewatch patterns
- ML at-risk prediction
- Learning style classification
- Knowledge gap identification

---

## 11. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Pipeline failure | Dead letter queues, auto-retry |
| Privacy violation | Consent gates, audit logs |
| Performance issues | Caching, read replicas |
| Data inaccuracy | Validation, idempotency |
| Scale overflow | Auto-scaling, throttling |
