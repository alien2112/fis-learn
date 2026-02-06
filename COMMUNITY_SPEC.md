# Real-Time Course Community - Product + System Specification

## Goals
- Enable real-time conversations between students and instructors.
- Keep discussions organized, safe, and learning-focused.
- Support scalable, readable, and moderated community spaces per course.

## Information Architecture
Each course has a dedicated community space with three default channels:
- **Announcements** (instructor-only posting)
- **Q&A** (student questions + instructor/peer answers)
- **Discussion** (open peer discussion)

Optional: topic-based channels can be created by instructors or admins.

## Roles & Permissions
- **Student**
  - Read: all channels in enrolled courses
  - Write: Q&A and Discussion
  - Reply: Q&A and Discussion threads
  - Report: any message
- **Instructor**
  - Write: all channels (including Announcements)
  - Pin messages, mark answers, lock threads
  - Hide/restore messages
- **Moderator** (optional role or instructor delegate)
  - Same moderation rights as instructors (no course settings)
- **Admin**
  - All courses + audit access

## UX & Interaction Design
Layout (desktop):
- Left rail: channel list + course name
- Main pane: message list
- Right pane: thread drawer (when a message is selected)
Mobile:
- Tabs for channels at top
- Thread drawer slides in

Readability:
- Message grouping by author and time
- Timestamps and role badges
- Pinned section for announcements or key messages

## Message Types
Channel-driven semantics:
- **Announcements**: root messages only, instructor-only
- **Q&A**: root = question, replies = answers/comments
- **Discussion**: open threads, replies allowed

## Real-Time Behavior
- Optimistic UI for sending
- Status: sending → delivered → failed
- Subtle animations for new messages
- Connection banner for reconnecting
- Offline queue with retry

## Moderation & Trust
Instructor tools:
- Pin/unpin
- Mark/unmark answer
- Lock/unlock thread
- Hide/restore message (soft delete)

Student tools:
- Report/flag message (one per user per message)

Rate limits:
- HTTP layer has global throttling
- WebSocket layer has per-user soft limits for spam protection

## Component System (Frontend)
Core components:
- `CommunityShell`
- `ChannelList`
- `MessageList` (virtualized or paginated)
- `MessageItem`
- `ThreadPanel`
- `Composer`
- `PinnedPanel`
- `ConnectionBanner`
- `ModerationMenu`

## Backend Architecture (High Level)
Layers:
- **API** (REST): channels, messages, moderation
- **Real-time** (WebSocket): live delivery + ack
- **Storage** (Postgres via Prisma)

Scalability:
- WebSocket server horizontal scaling
- Pub/Sub for fan-out (Redis/NATS) in production
- Cursor pagination for message history

## Data Model (Summary)
- `CommunityChannel`
- `CommunityMessage` (threaded via parentId)
- `CommunityMessageFlag`
- `CommunityModerationAction`

## Access Control
Server-side enforced:
1) Course access check (enrolled student or instructor/admin)
2) Channel rules (announcements locked to instructors)
3) Moderation actions restricted to instructors/admins
