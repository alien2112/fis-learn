# Admin Dashboard Missing Pages - Implementation Guide

## ✅ Completed: Subscription Management (Task #1)
**Location:** `apps/admin/src/app/(admin)/subscriptions/page.tsx`
**Status:** DONE - Fully functional with stats, CRUD operations, toast notifications

---

## Remaining Tasks (7 pages)

### Task #2: Enrollment Management Page

**File to create:** `apps/admin/src/app/(admin)/enrollments/page.tsx`

**Backend APIs (already exist):**
- `GET /courses/enrollments/all` (Need to add admin endpoint - currently only `/courses/enrollments/my` exists)
- Alternative: Use `GET /courses/:id` with includes to get enrollments

**Features needed:**
- Stats cards: Total Enrollments, Active, Completed, Average Progress
- Data table columns: Student Name, Course Title, Enrolled Date, Progress %, Status (ACTIVE/COMPLETED/CANCELLED/EXPIRED), Actions
- Filters: Course dropdown, Status dropdown, Date range
- Actions: View Progress Details, Cancel Enrollment, Extend Expiry Date
- Search by student name or course title

**Pattern to follow:** Similar to subscriptions page with data table + filters

**First step:** Add backend endpoint `GET /enrollments` in `apps/api/src/modules/courses/courses.controller.ts` that returns all enrollments with joined user + course data

---

### Task #3: Extend User Management with Role/Status Controls

**File to modify:** `apps/admin/src/app/(admin)/users/page.tsx` (existing)

**Backend APIs (already exist):**
- `PUT /users/:id/role` - Change user role (SUPER_ADMIN only)
- `PUT /users/:id/status` - Change status (ACTIVE/SUSPENDED/BANNED)

**Changes needed:**
1. Add "Role" column to the users table showing current role with badge
2. Add "Status" column showing ACTIVE/SUSPENDED/BANNED with color-coded badges
3. In the Actions dropdown menu, add:
   - "Change Role" submenu → STUDENT/INSTRUCTOR/ADMIN/SUPER_ADMIN options
   - "Change Status" submenu → Activate/Suspend/Ban options
4. Add confirmation dialogs for role/status changes
5. Add toast notifications for success/error
6. Use react-query mutations for API calls

**Component to add:** `apps/admin/src/components/users/ChangeRoleDialog.tsx` and `ChangeStatusDialog.tsx`

**API client to extend:** `apps/admin/src/lib/api/users.ts` - add `changeRole()` and `changeStatus()` methods

---

### Task #4: Live Streaming Management Page

**File to create:** `apps/admin/src/app/(admin)/streaming/page.tsx`

**Backend APIs (already exist):**
- `GET /streaming/all` (may need to add - check if exists)
- `POST /streaming` - Create stream
- `PATCH /streaming/:id` - Update stream
- `DELETE /streaming/:id` - Delete stream
- `GET /streaming/course/:courseId` - Get streams for course

**Features needed:**
- Stats cards: Total Streams, Live Now, Scheduled, Total Viewers (today)
- Data table columns: Stream Title, Course, Scheduled Start, Status (SCHEDULED/LIVE/ENDED/CANCELLED), Viewers, Duration, Actions
- Create Stream dialog: Title, Course (dropdown), Scheduled Start/End (datetime pickers), Description
- Filters: Status dropdown, Course dropdown, Date range
- Actions: Edit, Start Stream (manual), End Stream, View Recording, Delete
- Status badges with colors: LIVE (red pulse), SCHEDULED (blue), ENDED (gray)
- Show "🔴 LIVE" indicator for active streams

**Additional component:** `apps/admin/src/components/streaming/CreateStreamDialog.tsx`

**API client to create:** `apps/admin/src/lib/api/streaming.ts`

---

### Task #5: Community Moderation Dashboard

**File to create:** `apps/admin/src/app/(admin)/community/page.tsx`

**Backend APIs (already exist):**
- `GET /community/messages/reported` (may need to add)
- `POST /community/messages/:messageId/pin` - Pin message
- `POST /community/messages/:messageId/lock` - Lock thread
- `DELETE /community/messages/:messageId` - Hide message
- `POST /community/messages/:messageId/restore` - Restore message

**Features needed:**
- Tabs: "Reported Content", "Pinned Messages", "Locked Threads"
- Reported Content table: Message Preview, Author, Channel, Reported By, Reason, Report Date, Actions (Hide/Ignore)
- Pinned Messages table: Message, Channel, Pinned By, Date, Actions (Unpin)
- Locked Threads table: Thread Title, Channel, Locked By, Date, Actions (Unlock)
- Quick moderation actions with confirmation dialogs
- Toast notifications for all actions
- Auto-refresh on mutation success

**Additional API endpoint needed:** `GET /community/reports` in backend to list reported messages

**API client to create:** `apps/admin/src/lib/api/community.ts`

---

### Task #6: Audit Logs Viewer Page

**File to create:** `apps/admin/src/app/(admin)/audit-logs/page.tsx`

**Backend APIs:**
- **MISSING** - Need to add `GET /audit-logs` endpoint in `apps/api/src/modules/audit-logs/audit-logs.controller.ts`
- The `AuditLogService` exists at `apps/api/src/common/services/audit-log.service.ts` with `queryLogs()` method
- Need to create controller + module to expose it as REST endpoint

**Features needed:**
- Filters: Action type dropdown, User search, Entity type dropdown, Date range picker
- Data table columns: Timestamp, User, Action, Entity Type, Entity ID, IP Address, Metadata (expandable)
- Pagination (server-side)
- Export to CSV button
- Real-time updates (optional - use polling or WebSocket)
- Expandable rows to show full metadata JSON

**Backend work required:**
1. Create `apps/api/src/modules/audit-logs/audit-logs.controller.ts`
2. Create `apps/api/src/modules/audit-logs/audit-logs.module.ts`
3. Add `GET /audit-logs` endpoint with query params: action, userId, entityType, startDate, endDate, page, limit
4. Register module in `apps/api/src/app.module.ts`

**API client to create:** `apps/admin/src/lib/api/audit-logs.ts`

---

### Task #7: Notification Management Page

**File to create:** `apps/admin/src/app/(admin)/notifications/page.tsx`

**Backend APIs:**
- **MISSING** - Need to add `POST /notifications/send-bulk` endpoint
- Existing: `GET /notifications`, `POST /notifications` (individual)

**Features needed:**
- "Send Bulk Notification" button → opens dialog
- Bulk send form:
  - Recipients: Radio buttons (All Users / All Students / All Instructors / Custom Selection)
  - Custom selection: Multi-select user picker with search
  - Subject (required)
  - Message (required, textarea)
  - Type (INFO/SUCCESS/WARNING/ERROR)
  - Send immediately OR Schedule for later (datetime picker)
- Preview pane showing how notification will look
- History table: Past bulk notifications sent, Date, Recipients count, Subject, Status
- Stats cards: Total Sent (today), Total Recipients (today), Delivery Rate

**Backend work required:**
1. Add `POST /notifications/send-bulk` in `apps/api/src/modules/notifications/notifications.controller.ts`
2. Use BullMQ to queue bulk notification sending (avoid timeout)
3. Add `BulkNotification` model to Prisma schema to track sent bulk notifications
4. Run migration

**API client to create:** `apps/admin/src/lib/api/notifications.ts`

---

### Task #8: Analytics/Reports Dashboard

**File to create:** `apps/admin/src/app/(admin)/analytics/page.tsx`

**Backend APIs (already exist):**
- `GET /analytics/dashboard` - Get analytics data
- `GET /analytics/course/:courseId` - Course-specific analytics
- `GET /dashboard/enrollment-trend` - Already used in main dashboard
- `GET /dashboard/user-growth` - User growth trends

**Features needed:**
- Date range selector (7 days / 30 days / 90 days / Custom)
- Top section: 4 KPI cards
  - Active Users (with % change)
  - Course Completion Rate (with % change)
  - Avg Session Duration (with % change)
  - Revenue (with % change)
- Charts section (grid layout):
  - User Engagement line chart (daily active users over time)
  - Course Performance bar chart (top 10 courses by enrollment)
  - Revenue trend area chart (daily/monthly revenue)
  - Completion funnel chart (enrolled → started → 50% → completed)
- Tables section:
  - Top Courses table: Course, Enrollments, Completion Rate, Revenue, Rating
  - Top Instructors table: Instructor, Courses, Students, Avg Rating, Revenue
- Export to PDF/CSV button

**Charts library:** Use `recharts` (already in dependencies - used in dashboard page)

**API client extensions:** Extend existing `apps/admin/src/lib/api/dashboard.ts`

---

## Implementation Order (Recommended)

1. ✅ **Subscriptions** - DONE
2. **User Role/Status** - Easiest (modify existing page)
3. **Enrollments** - Medium (needs 1 new backend endpoint)
4. **Streaming** - Medium (backend mostly exists)
5. **Analytics** - Medium (backend exists, just charts)
6. **Audit Logs** - Medium-Hard (needs backend controller + module)
7. **Notifications** - Hard (needs backend endpoint + BullMQ queue + Prisma migration)
8. **Community Moderation** - Medium-Hard (needs backend endpoint for reports)

---

## Global Setup Needed for Remaining Pages

### 1. Add Navigation Links

**File:** `apps/admin/src/components/layout/sidebar.tsx` or `admin-layout.tsx`

Add menu items:
```typescript
const menuItems = [
  // ... existing items
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/enrollments', label: 'Enrollments', icon: GraduationCap },
  { href: '/streaming', label: 'Live Streaming', icon: Video },
  { href: '/community', label: 'Community', icon: MessageSquare },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/audit-logs', label: 'Audit Logs', icon: FileText },
];
```

### 2. Backend Endpoints to Add

**Priority 1 (Blockers):**
- `GET /enrollments` - List all enrollments
- `GET /audit-logs` - List audit logs (create controller + module)
- `POST /notifications/send-bulk` - Send bulk notifications
- `GET /community/reports` - List reported messages

**Priority 2 (Nice to have):**
- `GET /streaming/all` - List all streams (if not exists)
- `GET /subscriptions/admin/stats` - Subscription statistics (if not exists)

### 3. Prisma Schema Additions (if needed)

For bulk notifications tracking:
```prisma
model BulkNotification {
  id          String   @id @default(cuid())
  subject     String
  message     String
  type        String   // INFO, SUCCESS, WARNING, ERROR
  recipients  String[] // Array of user IDs or "ALL_USERS", "ALL_STUDENTS", etc.
  sentBy      String
  sentAt      DateTime @default(now())
  recipientCount Int
  deliveredCount Int @default(0)

  sentByUser User @relation(fields: [sentBy], references: [id])

  @@map("bulk_notifications")
}
```

---

## Translation Strategy (Future)

Once all pages are implemented with English hardcoded strings, we can add i18n in a second pass:

1. Install `next-intl` in admin app
2. Update `apps/admin/next.config.js` to use `withNextIntl`
3. Restructure routes to `apps/admin/src/app/[locale]/(admin)/...`
4. Update all pages to use `useTranslations()` hook
5. Add translation files from `apps/admin/messages/en.json` and `messages/ar.json` (already created)

---

## Testing Checklist (Per Page)

- [ ] Page renders without errors
- [ ] Stats cards show correct data
- [ ] Data table populates from API
- [ ] Create/Edit dialogs open and close
- [ ] Form validation works (required fields)
- [ ] API mutations succeed and show toast notifications
- [ ] Optimistic updates work (UI updates before server response)
- [ ] Loading states show during data fetch
- [ ] Empty states show when no data
- [ ] Error states show when API fails
- [ ] Responsive design works on mobile/tablet
- [ ] Search/filter functionality works
- [ ] Pagination works (if applicable)
- [ ] Actions menu dropdown works
- [ ] Confirmation dialogs prevent accidental actions

---

## Estimated Development Time

| Task | Backend Work | Frontend Work | Total |
|------|-------------|---------------|-------|
| ✅ Subscriptions | 0h (exists) | 4h | 4h |
| User Role/Status | 0h (exists) | 2h | 2h |
| Enrollments | 1h (1 endpoint) | 3h | 4h |
| Streaming | 0.5h (verify) | 3h | 3.5h |
| Analytics | 0h (exists) | 4h (charts) | 4h |
| Audit Logs | 2h (controller+module) | 3h | 5h |
| Notifications | 3h (endpoint+queue+migration) | 4h | 7h |
| Community Moderation | 1h (1 endpoint) | 3h | 4h |
| **Total** | **7.5h** | **26h** | **33.5h** |

Add 20% buffer = ~40 hours total for a single developer

---

## Quick Start Command for Each Page

For tasks #2-#8, use Claude Code with this pattern:

```
Create the [PAGE_NAME] admin page following the implementation guide in ADMIN_PAGES_IMPLEMENTATION_GUIDE.md Task #[N].

Use the subscription management page at apps/admin/src/app/(admin)/subscriptions/page.tsx as a reference for code style, patterns, and component usage.

Match the existing admin UI design and use the same components from @/components/ui.
```

---

## Support & Questions

If you encounter issues:
1. Check the subscription page implementation as reference
2. Verify backend API endpoints exist using Swagger docs at `http://localhost:3011/api`
3. Check API client setup in `apps/admin/src/lib/api/client.ts`
4. Ensure toast notifications are working (test with subscriptions page first)

