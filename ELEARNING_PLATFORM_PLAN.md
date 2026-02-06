# E-Learning Platform - Complete System Design

## Table of Contents
1. [System Architecture](#1-system-architecture)
2. [Database Schema](#2-database-schema)
3. [User Flows](#3-user-flows)
4. [Tech Stack](#4-recommended-tech-stack)
5. [Security & Access Control](#5-security--access-control)
6. [API Structure](#6-api-structure)
7. [Future Improvements](#7-future-improvements)

---

## 1. System Architecture

### 1.1 High-Level Architecture Diagram (Textual)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────┬───────────────────────────────────────────┤
│       Web Application           │           Admin Panel                      │
│    (React/Next.js + TypeScript) │      (React + TypeScript)                 │
│    - Student Portal             │      - Dashboard                          │
│    - Instructor Portal          │      - User Management                    │
│    - Public Pages (Blog)        │      - Course Management                  │
│    - Community/Chat             │      - Reports & Analytics                │
└─────────────────────────────────┴───────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│                    (Rate Limiting, Auth, Load Balancing)                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVICES                                   │
├───────────────┬───────────────┬───────────────┬───────────────┬─────────────┤
│  Auth Service │ Course Service│ User Service  │ Chat Service  │Live Service │
│  - JWT/OAuth  │ - CRUD        │ - Profiles    │ - WebSocket   │- Scheduling │
│  - RBAC       │ - Progress    │ - Files       │ - Communities │- Links      │
│  - Codes      │ - Materials   │ - Follow-up   │ - Private DMs │- Attendance │
└───────────────┴───────────────┴───────────────┴───────────────┴─────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                        │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│   PostgreSQL        │      Redis          │        S3/MinIO                 │
│   - Primary DB      │   - Sessions        │   - Video Storage               │
│   - Relationships   │   - Cache           │   - Materials                   │
│   - Transactions    │   - Real-time       │   - Images                      │
└─────────────────────┴─────────────────────┴─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                    │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│   YouTube API       │   Email Service     │      CDN                        │
│   - Private Links   │   - SendGrid/SES    │   - CloudFlare                  │
│   - Embeds          │   - Notifications   │   - Video Delivery              │
└─────────────────────┴─────────────────────┴─────────────────────────────────┘
```

### 1.2 Module Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CORE MODULES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   AUTH       │  │   USERS      │  │   COURSES    │          │
│  │   MODULE     │  │   MODULE     │  │   MODULE     │          │
│  │              │  │              │  │              │          │
│  │ - Login      │  │ - Profiles   │  │ - CRUD       │          │
│  │ - Register   │  │ - Roles      │  │ - Categories │          │
│  │ - Access     │  │ - Files      │  │ - Materials  │          │
│  │   Codes      │  │ - Progress   │  │ - Videos     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   LIVE       │  │   FOLLOW-UP  │  │   COMMUNITY  │          │
│  │   MODULE     │  │   MODULE     │  │   MODULE     │          │
│  │              │  │              │  │              │          │
│  │ - Schedule   │  │ - Tracking   │  │ - Chat       │          │
│  │ - Rooms      │  │ - Reports    │  │ - Groups     │          │
│  │ - Attendance │  │ - Notes      │  │ - DMs        │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │   BLOG       │  │   REPORTS    │                             │
│  │   MODULE     │  │   MODULE     │                             │
│  │              │  │              │                             │
│  │ - Posts      │  │ - Analytics  │                             │
│  │ - Categories │  │ - Exports    │                             │
│  │ - Media      │  │ - Dashboard  │                             │
│  └──────────────┘  └──────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### 2.1 Core Tables

#### Users & Authentication

```sql
-- Users Table
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('admin', 'instructor', 'student') NOT NULL,
    status          ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login      TIMESTAMP,
    email_verified  BOOLEAN DEFAULT FALSE
);

-- User Profiles
CREATE TABLE user_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    avatar_url      VARCHAR(500),
    bio             TEXT,
    date_of_birth   DATE,
    address         TEXT,
    city            VARCHAR(100),
    country         VARCHAR(100),
    timezone        VARCHAR(50) DEFAULT 'UTC',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Extended Profile (Student File)
CREATE TABLE student_files (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    education_level     VARCHAR(100),
    enrollment_date     DATE,
    total_courses       INT DEFAULT 0,
    completed_courses   INT DEFAULT 0,
    total_watch_time    INT DEFAULT 0,  -- in minutes
    attendance_rate     DECIMAL(5,2) DEFAULT 0,
    overall_progress    DECIMAL(5,2) DEFAULT 0,
    notes               TEXT,
    assigned_instructor UUID REFERENCES users(id),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instructor Extended Profile
CREATE TABLE instructor_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    specialization  VARCHAR(255),
    qualification   TEXT,
    experience_years INT,
    rating          DECIMAL(3,2) DEFAULT 0,
    total_students  INT DEFAULT 0,
    total_courses   INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Access Codes

```sql
-- Course Access Codes
CREATE TABLE course_access_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(20) UNIQUE NOT NULL,
    course_id       UUID REFERENCES courses(id) ON DELETE CASCADE,
    type            ENUM('single_use', 'multi_use', 'unlimited') DEFAULT 'single_use',
    max_uses        INT,
    current_uses    INT DEFAULT 0,
    expires_at      TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Video Access Codes
CREATE TABLE video_access_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(20) UNIQUE NOT NULL,
    video_id        UUID REFERENCES course_videos(id) ON DELETE CASCADE,
    type            ENUM('single_use', 'multi_use', 'unlimited') DEFAULT 'single_use',
    max_uses        INT,
    current_uses    INT DEFAULT 0,
    expires_at      TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Code Redemptions Log
CREATE TABLE code_redemptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_id         UUID NOT NULL,
    code_type       ENUM('course', 'video') NOT NULL,
    user_id         UUID REFERENCES users(id),
    redeemed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address      VARCHAR(45)
);
```

#### Courses & Content

```sql
-- Course Categories
CREATE TABLE course_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    parent_id       UUID REFERENCES course_categories(id),
    icon            VARCHAR(100),
    sort_order      INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses
CREATE TABLE courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    description     TEXT,
    short_description VARCHAR(500),
    thumbnail_url   VARCHAR(500),
    category_id     UUID REFERENCES course_categories(id),
    instructor_id   UUID REFERENCES users(id),
    level           ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    language        VARCHAR(50) DEFAULT 'en',
    duration_hours  DECIMAL(5,2),
    price           DECIMAL(10,2) DEFAULT 0,
    is_free         BOOLEAN DEFAULT FALSE,
    is_published    BOOLEAN DEFAULT FALSE,
    requires_code   BOOLEAN DEFAULT TRUE,
    max_students    INT,
    total_enrolled  INT DEFAULT 0,
    rating          DECIMAL(3,2) DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at    TIMESTAMP
);

-- Course Sections/Chapters
CREATE TABLE course_sections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID REFERENCES courses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    sort_order      INT DEFAULT 0,
    is_published    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course Videos
CREATE TABLE course_videos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id      UUID REFERENCES course_sections(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    video_type      ENUM('youtube_private', 'server_upload', 'external') NOT NULL,
    video_url       VARCHAR(500),
    youtube_id      VARCHAR(50),
    storage_path    VARCHAR(500),
    duration_seconds INT,
    thumbnail_url   VARCHAR(500),
    sort_order      INT DEFAULT 0,
    is_preview      BOOLEAN DEFAULT FALSE,
    requires_code   BOOLEAN DEFAULT FALSE,
    is_published    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course Materials (PDFs, Documents, etc.)
CREATE TABLE course_materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID REFERENCES courses(id) ON DELETE CASCADE,
    section_id      UUID REFERENCES course_sections(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    file_type       VARCHAR(50),
    file_url        VARCHAR(500) NOT NULL,
    file_size       BIGINT,
    download_count  INT DEFAULT 0,
    sort_order      INT DEFAULT 0,
    is_downloadable BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Enrollments & Progress

```sql
-- Course Enrollments
CREATE TABLE course_enrollments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id       UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_code_id  UUID REFERENCES course_access_codes(id),
    status          ENUM('active', 'completed', 'dropped', 'expired') DEFAULT 'active',
    progress        DECIMAL(5,2) DEFAULT 0,
    completed_at    TIMESTAMP,
    certificate_id  UUID,
    UNIQUE(user_id, course_id)
);

-- Video Progress
CREATE TABLE video_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    video_id        UUID REFERENCES course_videos(id) ON DELETE CASCADE,
    watched_seconds INT DEFAULT 0,
    total_seconds   INT NOT NULL,
    is_completed    BOOLEAN DEFAULT FALSE,
    last_position   INT DEFAULT 0,
    completed_at    TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, video_id)
);
```

#### Live Classes

```sql
-- Live Classes
CREATE TABLE live_classes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID REFERENCES courses(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    instructor_id   UUID REFERENCES users(id) NOT NULL,
    scheduled_at    TIMESTAMP NOT NULL,
    duration_minutes INT DEFAULT 60,
    timezone        VARCHAR(50) DEFAULT 'UTC',
    meeting_url     VARCHAR(500),
    meeting_id      VARCHAR(100),
    meeting_password VARCHAR(100),
    platform        ENUM('zoom', 'meet', 'teams', 'custom') DEFAULT 'zoom',
    max_attendees   INT,
    status          ENUM('scheduled', 'live', 'completed', 'cancelled') DEFAULT 'scheduled',
    recording_url   VARCHAR(500),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Live Class Attendees
CREATE TABLE live_class_attendees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id   UUID REFERENCES live_classes(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    invited_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at       TIMESTAMP,
    left_at         TIMESTAMP,
    attendance_duration INT,  -- in minutes
    status          ENUM('invited', 'confirmed', 'attended', 'absent') DEFAULT 'invited',
    UNIQUE(live_class_id, user_id)
);
```

#### Follow-Up Department

```sql
-- Follow-Up Records
CREATE TABLE follow_up_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    instructor_id   UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id       UUID REFERENCES courses(id),
    status          ENUM('active', 'completed', 'on_hold') DEFAULT 'active',
    start_date      DATE,
    end_date        DATE,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Follow-Up Notes/Entries
CREATE TABLE follow_up_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follow_up_id    UUID REFERENCES follow_up_records(id) ON DELETE CASCADE,
    created_by      UUID REFERENCES users(id),
    entry_type      ENUM('note', 'progress', 'meeting', 'concern', 'achievement') NOT NULL,
    content         TEXT NOT NULL,
    attachments     JSONB,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Progress Reports
CREATE TABLE student_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    generated_by    UUID REFERENCES users(id),
    report_type     ENUM('weekly', 'monthly', 'course_completion', 'custom') NOT NULL,
    period_start    DATE,
    period_end      DATE,
    data            JSONB NOT NULL,
    summary         TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Blog

```sql
-- Blog Posts
CREATE TABLE blog_posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    excerpt         VARCHAR(500),  -- Brief article preview
    content         TEXT NOT NULL, -- Full article
    featured_image  VARCHAR(500),
    category        VARCHAR(100),
    tags            TEXT[],
    status          ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    views           INT DEFAULT 0,
    published_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blog Categories
CREATE TABLE blog_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Community & Chat

```sql
-- Communities
CREATE TABLE communities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    type            ENUM('programmers', 'designers', 'traders', 'admin', 'custom') NOT NULL,
    avatar_url      VARCHAR(500),
    is_private      BOOLEAN DEFAULT FALSE,
    max_members     INT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Community Members
CREATE TABLE community_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id    UUID REFERENCES communities(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    role            ENUM('member', 'moderator', 'admin') DEFAULT 'member',
    joined_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    muted_until     TIMESTAMP,
    UNIQUE(community_id, user_id)
);

-- Chat Messages (Community)
CREATE TABLE community_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id    UUID REFERENCES communities(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    message_type    ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
    attachments     JSONB,
    reply_to        UUID REFERENCES community_messages(id),
    is_pinned       BOOLEAN DEFAULT FALSE,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Private Conversations (Student <-> Instructor)
CREATE TABLE private_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_1   UUID REFERENCES users(id) ON DELETE CASCADE,
    participant_2   UUID REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(participant_1, participant_2)
);

-- Private Messages
CREATE TABLE private_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES private_conversations(id) ON DELETE CASCADE,
    sender_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    message_type    ENUM('text', 'image', 'file') DEFAULT 'text',
    attachments     JSONB,
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMP,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### System Settings

```sql
-- System Settings
CREATE TABLE system_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(100) UNIQUE NOT NULL,
    value           JSONB NOT NULL,
    description     TEXT,
    category        VARCHAR(50),
    is_public       BOOLEAN DEFAULT FALSE,
    updated_by      UUID REFERENCES users(id),
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    content         TEXT,
    data            JSONB,
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Entity Relationship Diagram (Textual)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY RELATIONSHIPS                               │
└─────────────────────────────────────────────────────────────────────────────┘

USERS (1) ────────────< (N) USER_PROFILES
  │
  ├──────────────────< (N) STUDENT_FILES
  │
  ├──────────────────< (N) INSTRUCTOR_PROFILES
  │
  ├──────────────────< (N) COURSES (as instructor)
  │
  ├──────────────────< (N) COURSE_ENROLLMENTS
  │
  ├──────────────────< (N) LIVE_CLASS_ATTENDEES
  │
  ├──────────────────< (N) FOLLOW_UP_RECORDS (as student/instructor)
  │
  ├──────────────────< (N) COMMUNITY_MEMBERS
  │
  ├──────────────────< (N) PRIVATE_CONVERSATIONS
  │
  └──────────────────< (N) NOTIFICATIONS


COURSES (1) ──────────< (N) COURSE_SECTIONS
  │                           │
  │                           └────< (N) COURSE_VIDEOS
  │
  ├──────────────────< (N) COURSE_MATERIALS
  │
  ├──────────────────< (N) COURSE_ACCESS_CODES
  │
  ├──────────────────< (N) COURSE_ENROLLMENTS
  │
  └──────────────────< (N) LIVE_CLASSES


COURSE_CATEGORIES (1) ────< (N) COURSES
  │
  └── (self-referencing) ──< (N) COURSE_CATEGORIES (parent-child)


COMMUNITIES (1) ──────< (N) COMMUNITY_MEMBERS
  │
  └─────────────────< (N) COMMUNITY_MESSAGES
```

---

## 3. User Flows

### 3.1 Admin User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ADMIN USER FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

[Login] ──> [Dashboard]
               │
               ├──> [Statistics Overview]
               │       ├── Total Students
               │       ├── Total Instructors
               │       ├── Total Courses
               │       ├── Total Videos
               │       ├── Active Live Classes
               │       └── Revenue (if applicable)
               │
               ├──> [User Management]
               │       ├── [List Users] ──> [Filter by Role]
               │       ├── [Create User] ──> [Assign Role]
               │       ├── [Edit User] ──> [Update Profile/Status]
               │       ├── [View User File] ──> [Student/Instructor Details]
               │       └── [Suspend/Activate User]
               │
               ├──> [Course Management]
               │       ├── [Categories]
               │       │     ├── Create Category
               │       │     ├── Edit Category
               │       │     └── Organize Hierarchy
               │       ├── [Courses]
               │       │     ├── List All Courses
               │       │     ├── Approve/Reject Course
               │       │     └── Feature Course
               │       └── [Access Codes]
               │             ├── Generate Course Codes
               │             ├── Generate Video Codes
               │             ├── View Code Usage
               │             └── Deactivate Codes
               │
               ├──> [Live Classes]
               │       ├── View All Scheduled
               │       ├── Assign Instructors
               │       └── Monitor Attendance
               │
               ├──> [Follow-Up Department]
               │       ├── View All Records
               │       ├── Assign Students to Instructors
               │       └── Generate Reports
               │
               ├──> [Blog Management]
               │       ├── Create/Edit Posts
               │       ├── Manage Categories
               │       └── Moderate Comments
               │
               ├──> [Community Management]
               │       ├── Create Communities
               │       ├── Assign Moderators
               │       └── Monitor Activity
               │
               ├──> [Admin Chat]
               │       └── Communicate with Other Admins
               │
               └──> [System Settings]
                       ├── General Settings
                       ├── Email Templates
                       ├── Payment Settings
                       └── Security Settings
```

### 3.2 Instructor User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INSTRUCTOR USER FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

[Login] ──> [Dashboard]
               │
               ├──> [My Statistics]
               │       ├── Total Students
               │       ├── Active Courses
               │       ├── Upcoming Live Classes
               │       └── Rating/Reviews
               │
               ├──> [Course Management]
               │       ├── [My Courses]
               │       │     ├── Create New Course
               │       │     │     ├── Add Title/Description
               │       │     │     ├── Set Category
               │       │     │     ├── Add Sections
               │       │     │     └── Submit for Review
               │       │     ├── Edit Existing Course
               │       │     └── View Course Analytics
               │       │
               │       ├── [Add Videos]
               │       │     ├── Upload to Server
               │       │     ├── Add YouTube Private Link
               │       │     └── Set Video Order
               │       │
               │       └── [Add Materials]
               │             ├── Upload PDFs
               │             ├── Upload Documents
               │             └── Add External Resources
               │
               ├──> [Live Classes]
               │       ├── Schedule New Class
               │       │     ├── Set Date/Time
               │       │     ├── Add Meeting Link
               │       │     └── Invite Students
               │       ├── Start Live Class
               │       └── View Attendance Reports
               │
               ├──> [Student Follow-Up]
               │       ├── View Assigned Students
               │       ├── View Student Files
               │       │     ├── Progress Overview
               │       │     ├── Attendance Records
               │       │     └── Course Performance
               │       ├── Add Follow-Up Notes
               │       └── Private Chat with Student
               │
               ├──> [Messages]
               │       ├── Student Conversations
               │       └── Admin Communications
               │
               └──> [Profile Settings]
                       ├── Update Profile
                       ├── Qualifications
                       └── Notification Preferences
```

### 3.3 Student User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STUDENT USER FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

[Register/Login] ──> [Dashboard]
                        │
                        ├──> [My Progress Overview]
                        │       ├── Enrolled Courses
                        │       ├── Overall Progress
                        │       ├── Upcoming Live Classes
                        │       └── Recent Activity
                        │
                        ├──> [Browse Courses]
                        │       ├── Filter by Category
                        │       ├── Search Courses
                        │       └── View Course Details
                        │             ├── Description
                        │             ├── Curriculum
                        │             ├── Instructor Info
                        │             └── Reviews
                        │
                        ├──> [Enroll in Course]
                        │       ├── [If Code Required]
                        │       │     └── Enter Access Code ──> Validate ──> Enroll
                        │       └── [If Free/Purchased]
                        │             └── Direct Enrollment
                        │
                        ├──> [My Courses]
                        │       └── [Select Course]
                        │             ├── View Sections
                        │             ├── Watch Videos
                        │             │     ├── [If Code Required]
                        │             │     │     └── Enter Video Code ──> Watch
                        │             │     └── [If No Code]
                        │             │           └── Watch Directly
                        │             ├── Track Progress
                        │             └── Download Materials
                        │
                        ├──> [Live Classes]
                        │       ├── View Schedule
                        │       ├── Join Live Class (via secure link)
                        │       └── View Recordings
                        │
                        ├──> [My Follow-Up]
                        │       ├── View Assigned Instructor
                        │       ├── View Progress Reports
                        │       └── Chat with Instructor
                        │
                        ├──> [Community]
                        │       ├── Join Communities
                        │       │     ├── Programmers
                        │       │     ├── Designers
                        │       │     └── Traders
                        │       ├── Post Messages
                        │       └── Interact with Others
                        │
                        ├──> [Blog]
                        │       ├── Browse Articles
                        │       └── Read Full Articles
                        │
                        └──> [Profile]
                                ├── Update Information
                                ├── View My File
                                └── Notification Settings
```

---

## 4. Recommended Tech Stack

### 4.1 Frontend

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Framework** | Next.js 14+ (App Router) | SSR, SEO, API routes, excellent DX |
| **Language** | TypeScript | Type safety, better maintainability |
| **UI Library** | shadcn/ui + Tailwind CSS | Customizable, accessible components |
| **State Management** | Zustand / TanStack Query | Lightweight, powerful data fetching |
| **Forms** | React Hook Form + Zod | Performant forms with validation |
| **Real-time** | Socket.io Client | WebSocket for chat & notifications |
| **Video Player** | Video.js / React Player | Flexible video playback |
| **Charts** | Recharts / Chart.js | Dashboard visualizations |
| **Rich Text Editor** | TipTap / Lexical | Blog content editing |

### 4.2 Backend

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Runtime** | Node.js 20+ | JavaScript ecosystem, async I/O |
| **Framework** | NestJS | Modular architecture, TypeScript native |
| **Language** | TypeScript | Consistency with frontend |
| **API Style** | REST + WebSocket | Standard REST, real-time for chat |
| **ORM** | Prisma | Type-safe database queries |
| **Validation** | class-validator | DTO validation |
| **Documentation** | Swagger/OpenAPI | Auto-generated API docs |

### 4.3 Database & Storage

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Primary DB** | PostgreSQL 15+ | Relational data, JSONB support |
| **Cache** | Redis | Sessions, caching, pub/sub |
| **Search** | Meilisearch / Algolia | Fast course/blog search |
| **File Storage** | AWS S3 / MinIO | Video & material storage |
| **CDN** | CloudFlare / AWS CloudFront | Fast content delivery |

### 4.4 DevOps & Infrastructure

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Containerization** | Docker + Docker Compose | Consistent environments |
| **Orchestration** | Kubernetes (optional) | Scaling for production |
| **CI/CD** | GitHub Actions | Automated testing & deployment |
| **Hosting** | Vercel (Frontend) + Railway/AWS (Backend) | Scalable, managed infrastructure |
| **Monitoring** | Sentry + Grafana | Error tracking & metrics |
| **Logging** | Winston + ELK Stack | Centralized logging |

### 4.5 External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| **Email** | SendGrid / AWS SES | Transactional emails |
| **Video Hosting** | YouTube (Private) + Bunny.net | Video delivery |
| **Live Classes** | Zoom API / Jitsi | Video conferencing |
| **Payment** | Stripe | Payment processing (future) |
| **SMS** | Twilio | OTP verification |

### 4.6 Development Tools

```
├── Package Manager: pnpm (fast, efficient)
├── Monorepo: Turborepo (shared code)
├── Linting: ESLint + Prettier
├── Testing: Jest + React Testing Library + Cypress
├── API Testing: Insomnia / Postman
└── Database Tools: pgAdmin / DBeaver
```

---

## 5. Security & Access Control

### 5.1 Role-Based Access Control (RBAC) Matrix

| Resource | Admin | Instructor | Student |
|----------|-------|------------|---------|
| **Dashboard** | Full | Own Stats | Own Stats |
| **Users - View All** | ✅ | ❌ | ❌ |
| **Users - Create** | ✅ | ❌ | ❌ |
| **Users - Edit Any** | ✅ | ❌ | ❌ |
| **Users - Edit Own** | ✅ | ✅ | ✅ |
| **Courses - View All** | ✅ | Own Only | Enrolled Only |
| **Courses - Create** | ✅ | ✅ | ❌ |
| **Courses - Edit Any** | ✅ | ❌ | ❌ |
| **Courses - Edit Own** | ✅ | ✅ | ❌ |
| **Courses - Delete** | ✅ | Own Only | ❌ |
| **Access Codes - Generate** | ✅ | Own Courses | ❌ |
| **Access Codes - View** | ✅ | Own Courses | ❌ |
| **Live Classes - Create** | ✅ | ✅ | ❌ |
| **Live Classes - Join** | ✅ | ✅ | If Invited |
| **Follow-Up - View All** | ✅ | ❌ | ❌ |
| **Follow-Up - Assigned** | ✅ | ✅ | Own Only |
| **Blog - Create** | ✅ | ❌ | ❌ |
| **Blog - Edit** | ✅ | ❌ | ❌ |
| **Blog - Read** | ✅ | ✅ | ✅ |
| **Community - Admin Chat** | ✅ | ❌ | ❌ |
| **Community - Join Public** | ✅ | ✅ | ✅ |
| **Settings - System** | ✅ | ❌ | ❌ |

### 5.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

[User Login Request]
       │
       ▼
[Validate Credentials]
       │
       ├── Invalid ──> [Return 401 Error]
       │
       └── Valid
            │
            ▼
[Generate Tokens]
       │
       ├── Access Token (JWT, 15min expiry)
       │     - user_id
       │     - role
       │     - permissions
       │     - iat, exp
       │
       └── Refresh Token (UUID, 7 days, stored in Redis)
            │
            ▼
[Set HTTP-Only Cookies]
       │
       ▼
[Return User Data + Tokens]


[Protected Request]
       │
       ▼
[Extract Access Token]
       │
       ├── Missing ──> [Return 401]
       │
       └── Present
            │
            ▼
[Verify JWT Signature]
       │
       ├── Invalid ──> [Return 401]
       │
       └── Valid
            │
            ▼
[Check Token Expiry]
       │
       ├── Expired ──> [Try Refresh Flow]
       │                     │
       │                     ▼
       │               [Validate Refresh Token in Redis]
       │                     │
       │                     ├── Invalid ──> [Return 401, Force Logout]
       │                     │
       │                     └── Valid ──> [Generate New Access Token]
       │
       └── Valid
            │
            ▼
[Check RBAC Permissions]
       │
       ├── Denied ──> [Return 403]
       │
       └── Allowed ──> [Process Request]
```

### 5.3 Security Rules

#### 5.3.1 Password Security
```typescript
// Password Requirements
const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  preventCommon: true,  // Check against common password list
  preventUserInfo: true // Prevent using email/name in password
};

// Hashing: bcrypt with cost factor 12
// Storage: Only hashed passwords stored
```

#### 5.3.2 Access Code Security
```typescript
// Code Generation
const codeConfig = {
  length: 12,
  charset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // No ambiguous chars (0/O, 1/I)
  format: 'XXXX-XXXX-XXXX',
  uniqueness: 'database-level unique constraint',
  rateLimit: '5 attempts per minute per IP'
};

// Code Validation
- Check code exists and is active
- Check usage limits not exceeded
- Check expiration date
- Log all redemption attempts
- Invalidate on suspicious activity
```

#### 5.3.3 API Security
```typescript
// Security Headers
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// Rate Limiting
const rateLimits = {
  login: '5 requests per minute',
  codeRedemption: '5 requests per minute',
  api: '100 requests per minute',
  upload: '10 requests per minute'
};

// Input Validation
- Sanitize all user inputs
- Validate file uploads (type, size, content)
- Use parameterized queries (Prisma handles this)
- Escape output in templates
```

#### 5.3.4 Video Security
```typescript
// Video Access Control
const videoSecurity = {
  signedUrls: true,           // Time-limited signed URLs
  urlExpiry: '4 hours',       // URL expires after 4 hours
  domainRestriction: true,    // Only allow from our domain
  tokenValidation: true,      // Validate user token with each request
  watermarking: false,        // Optional: Add user-specific watermark
  downloadPrevention: true    // Disable download where possible
};
```

### 5.4 Data Protection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA PROTECTION LAYERS                               │
└─────────────────────────────────────────────────────────────────────────────┘

1. ENCRYPTION AT REST
   ├── Database: PostgreSQL TDE (Transparent Data Encryption)
   ├── Files: S3 Server-Side Encryption (AES-256)
   └── Backups: Encrypted backup storage

2. ENCRYPTION IN TRANSIT
   ├── TLS 1.3 for all connections
   ├── HTTPS enforced (HSTS)
   └── Secure WebSocket (WSS)

3. DATA ISOLATION
   ├── Row-Level Security in PostgreSQL
   ├── Tenant isolation in queries
   └── Separate admin database access

4. AUDIT LOGGING
   ├── All CRUD operations logged
   ├── Login/logout events
   ├── Access code usage
   └── Sensitive data access

5. DATA RETENTION
   ├── Automatic deletion of expired codes
   ├── Log rotation (90 days)
   └── User data deletion on account removal
```

---

## 6. API Structure

### 6.1 API Endpoints Overview

```
/api/v1
│
├── /auth
│   ├── POST   /register          - User registration
│   ├── POST   /login             - User login
│   ├── POST   /logout            - User logout
│   ├── POST   /refresh           - Refresh access token
│   ├── POST   /forgot-password   - Request password reset
│   ├── POST   /reset-password    - Reset password with token
│   └── POST   /verify-email      - Verify email address
│
├── /users
│   ├── GET    /                  - List users (Admin)
│   ├── GET    /me                - Get current user
│   ├── GET    /:id               - Get user by ID
│   ├── PATCH  /:id               - Update user
│   ├── DELETE /:id               - Delete user (Admin)
│   ├── GET    /:id/file          - Get student/instructor file
│   └── GET    /:id/progress      - Get user progress
│
├── /courses
│   ├── GET    /                  - List courses
│   ├── POST   /                  - Create course
│   ├── GET    /:id               - Get course details
│   ├── PATCH  /:id               - Update course
│   ├── DELETE /:id               - Delete course
│   ├── GET    /:id/sections      - Get course sections
│   ├── POST   /:id/sections      - Add section
│   ├── GET    /:id/videos        - Get course videos
│   ├── POST   /:id/enroll        - Enroll in course
│   └── GET    /:id/students      - List enrolled students
│
├── /sections
│   ├── GET    /:id               - Get section
│   ├── PATCH  /:id               - Update section
│   ├── DELETE /:id               - Delete section
│   └── POST   /:id/videos        - Add video to section
│
├── /videos
│   ├── GET    /:id               - Get video details
│   ├── PATCH  /:id               - Update video
│   ├── DELETE /:id               - Delete video
│   ├── GET    /:id/stream        - Get video stream URL
│   └── POST   /:id/progress      - Update watch progress
│
├── /materials
│   ├── GET    /                  - List materials
│   ├── POST   /                  - Upload material
│   ├── GET    /:id               - Get material
│   ├── DELETE /:id               - Delete material
│   └── GET    /:id/download      - Download material
│
├── /access-codes
│   ├── GET    /                  - List codes (Admin/Instructor)
│   ├── POST   /generate          - Generate codes
│   ├── POST   /redeem            - Redeem a code
│   ├── GET    /:id               - Get code details
│   ├── PATCH  /:id               - Update code
│   └── DELETE /:id               - Deactivate code
│
├── /categories
│   ├── GET    /                  - List categories
│   ├── POST   /                  - Create category
│   ├── GET    /:id               - Get category
│   ├── PATCH  /:id               - Update category
│   └── DELETE /:id               - Delete category
│
├── /live-classes
│   ├── GET    /                  - List live classes
│   ├── POST   /                  - Schedule class
│   ├── GET    /:id               - Get class details
│   ├── PATCH  /:id               - Update class
│   ├── DELETE /:id               - Cancel class
│   ├── POST   /:id/invite        - Invite students
│   ├── POST   /:id/join          - Join class
│   └── GET    /:id/attendance    - Get attendance
│
├── /follow-up
│   ├── GET    /                  - List follow-up records
│   ├── POST   /                  - Create follow-up record
│   ├── GET    /:id               - Get record details
│   ├── PATCH  /:id               - Update record
│   ├── POST   /:id/entries       - Add entry/note
│   └── GET    /:id/entries       - Get all entries
│
├── /reports
│   ├── GET    /dashboard         - Dashboard statistics
│   ├── GET    /students/:id      - Student report
│   ├── GET    /courses/:id       - Course report
│   ├── GET    /instructors/:id   - Instructor report
│   └── POST   /generate          - Generate custom report
│
├── /blog
│   ├── GET    /posts             - List blog posts
│   ├── POST   /posts             - Create post
│   ├── GET    /posts/:slug       - Get post by slug
│   ├── PATCH  /posts/:id         - Update post
│   ├── DELETE /posts/:id         - Delete post
│   └── GET    /categories        - List blog categories
│
├── /communities
│   ├── GET    /                  - List communities
│   ├── POST   /                  - Create community
│   ├── GET    /:id               - Get community
│   ├── POST   /:id/join          - Join community
│   ├── POST   /:id/leave         - Leave community
│   ├── GET    /:id/messages      - Get messages
│   └── POST   /:id/messages      - Send message
│
├── /conversations
│   ├── GET    /                  - List conversations
│   ├── POST   /                  - Start conversation
│   ├── GET    /:id/messages      - Get messages
│   └── POST   /:id/messages      - Send message
│
├── /notifications
│   ├── GET    /                  - List notifications
│   ├── PATCH  /:id/read          - Mark as read
│   └── POST   /read-all          - Mark all as read
│
├── /upload
│   ├── POST   /video             - Upload video
│   ├── POST   /image             - Upload image
│   └── POST   /file              - Upload file
│
└── /settings
    ├── GET    /                  - Get settings
    └── PATCH  /                  - Update settings
```

### 6.2 WebSocket Events

```
SOCKET EVENTS
│
├── CONNECTION
│   ├── connect                   - Client connected
│   └── disconnect                - Client disconnected
│
├── CHAT
│   ├── community:join            - Join community room
│   ├── community:leave           - Leave community room
│   ├── community:message         - New community message
│   ├── community:typing          - User typing indicator
│   ├── private:message           - New private message
│   └── private:typing            - Private typing indicator
│
├── NOTIFICATIONS
│   ├── notification:new          - New notification
│   └── notification:read         - Notification read
│
├── LIVE CLASS
│   ├── class:starting            - Class starting soon
│   ├── class:started             - Class has started
│   └── class:ended               - Class has ended
│
└── PRESENCE
    ├── user:online               - User came online
    └── user:offline              - User went offline
```

---

## 7. Future Improvements

### 7.1 Phase 2 Enhancements

| Feature | Description | Priority |
|---------|-------------|----------|
| **Mobile App** | React Native app for iOS/Android | High |
| **Payment Integration** | Stripe/PayPal for paid courses | High |
| **Certificates** | Auto-generated completion certificates | Medium |
| **Quizzes & Exams** | Built-in assessment system | High |
| **Discussion Forums** | Course-specific discussion boards | Medium |
| **Gamification** | Points, badges, leaderboards | Low |
| **Multi-language** | i18n support for UI & content | Medium |

### 7.2 Phase 3 Enhancements

| Feature | Description | Priority |
|---------|-------------|----------|
| **AI Tutor** | AI-powered learning assistance | High |
| **Video Analytics** | Heatmaps, engagement tracking | Medium |
| **Learning Paths** | Curated course sequences | Medium |
| **White-labeling** | Custom branding for organizations | Low |
| **API Marketplace** | Third-party integrations | Low |
| **Offline Mode** | Download videos for offline viewing | Medium |
| **Live Collaboration** | Real-time code editor, whiteboard | High |

### 7.3 Technical Improvements

```
SCALABILITY
├── Microservices migration for high-traffic modules
├── Event-driven architecture with Kafka/RabbitMQ
├── Read replicas for database
└── Horizontal scaling with Kubernetes

PERFORMANCE
├── GraphQL for complex queries
├── Server-side caching with Redis
├── Image optimization with Sharp
├── Video transcoding with FFmpeg
└── CDN caching strategies

OBSERVABILITY
├── Distributed tracing (Jaeger)
├── Custom metrics dashboard
├── Automated alerting
└── Performance budgets

TESTING
├── E2E testing with Playwright
├── Load testing with k6
├── Security scanning (OWASP ZAP)
└── Chaos engineering practices
```

### 7.4 Recommended Development Phases

```
PHASE 1 (MVP) - 3-4 months
├── User authentication & RBAC
├── Basic course CRUD
├── Video upload & playback
├── Access code system
├── Basic admin dashboard
└── Student enrollment & progress

PHASE 2 - 2-3 months
├── Live classes integration
├── Follow-up department
├── Blog module
├── Community chat
└── Advanced reporting

PHASE 3 - 2-3 months
├── Mobile app
├── Payment integration
├── Certificates
├── Quizzes & assessments
└── Advanced analytics

PHASE 4 - Ongoing
├── AI features
├── Performance optimization
├── Scale infrastructure
└── New feature requests
```

---

## 8. Project Structure

### 8.1 Monorepo Structure

```
elearning-platform/
├── apps/
│   ├── web/                    # Next.js student/instructor app
│   │   ├── app/
│   │   │   ├── (auth)/         # Auth pages
│   │   │   ├── (student)/      # Student pages
│   │   │   ├── (instructor)/   # Instructor pages
│   │   │   ├── blog/           # Public blog
│   │   │   └── api/            # API routes
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── styles/
│   │
│   ├── admin/                  # Admin panel (Next.js)
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── courses/
│   │   │   ├── codes/
│   │   │   ├── live-classes/
│   │   │   ├── follow-up/
│   │   │   ├── blog/
│   │   │   ├── communities/
│   │   │   └── settings/
│   │   └── components/
│   │
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── courses/
│       │   │   ├── videos/
│       │   │   ├── materials/
│       │   │   ├── access-codes/
│       │   │   ├── live-classes/
│       │   │   ├── follow-up/
│       │   │   ├── blog/
│       │   │   ├── communities/
│       │   │   ├── chat/
│       │   │   ├── notifications/
│       │   │   ├── reports/
│       │   │   └── upload/
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   ├── filters/
│       │   │   └── pipes/
│       │   ├── config/
│       │   └── prisma/
│       └── test/
│
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── types/                  # Shared TypeScript types
│   ├── utils/                  # Shared utilities
│   ├── validators/             # Shared validation schemas
│   └── config/                 # Shared configurations
│
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   └── terraform/
│
├── docs/
│   ├── api/
│   ├── architecture/
│   └── guides/
│
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 9. Quick Start Commands

```bash
# Clone and setup
git clone <repo-url>
cd elearning-platform
pnpm install

# Environment setup
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env

# Database setup
pnpm db:migrate
pnpm db:seed

# Development
pnpm dev              # Run all apps
pnpm dev:web          # Run web app only
pnpm dev:admin        # Run admin panel only
pnpm dev:api          # Run API only

# Testing
pnpm test             # Run all tests
pnpm test:e2e         # Run E2E tests

# Build
pnpm build            # Build all apps
pnpm build:web        # Build web app
pnpm build:admin      # Build admin panel
pnpm build:api        # Build API

# Production
pnpm start            # Start production servers
```

---

*Document Version: 1.0*
*Last Updated: February 2026*
*Author: System Architect*
