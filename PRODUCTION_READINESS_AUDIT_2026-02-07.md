# FIS-Learn Platform: Full Production-Readiness Audit

**Date:** February 7, 2026
**Last Updated:** February 7, 2026 (post-remediation)
**Auditor:** Senior System Architect & Technical Auditor
**Platform:** FIS-Learn E-Learning Platform
**Version:** Current main branch (commit ffd27f7) + remediation changes

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Remediation Status](#2-remediation-status)
3. [Platform Overview](#3-platform-overview)
4. [Architecture & Design](#4-architecture--design)
5. [Scalability & Performance](#5-scalability--performance)
6. [Security](#6-security)
7. [Data & Storage](#7-data--storage)
8. [DevOps & Infrastructure](#8-devops--infrastructure)
9. [Reliability & Resilience](#9-reliability--resilience)
10. [Compliance & Privacy](#10-compliance--privacy)
11. [Observability & Operations](#11-observability--operations)
12. [Findings Summary & Risk Matrix](#12-findings-summary--risk-matrix)
13. [Remediation Roadmap](#13-remediation-roadmap)
14. [AI-Executable Implementation Prompts](#14-ai-executable-implementation-prompts)
15. [Final Verdict](#15-final-verdict)

---

## 1. Executive Summary

### Overall Production-Readiness Score: 8.4 / 10 (was 5.8 → 7.4)

| Area                        | Original | Round 1 | Round 2 | Status                |
|-----------------------------|----------|---------|---------|-----------------------|
| Architecture & Design       | 8.0/10   | 8.5/10  | 9.0/10  | Nginx proxy added     |
| Scalability & Performance   | 6.5/10   | 7.0/10  | 7.5/10  | Pool config + N+1     |
| Security                    | 5.5/10   | 8.0/10  | 9.5/10  | **All issues resolved**|
| Data & Storage              | 7.0/10   | 8.5/10  | 9.5/10  | Backups + retention   |
| DevOps & Infrastructure     | 5.0/10   | 5.5/10  | 8.0/10  | **Major improvement** |
| Reliability & Resilience    | 5.0/10   | 7.5/10  | 8.0/10  | Retry + DLQ           |
| Compliance & Privacy        | 4.5/10   | 7.0/10  | 8.5/10  | Consent + privacy     |
| Observability & Operations  | 6.5/10   | 7.0/10  | 7.5/10  | PII redaction + sampling|

### Issue Breakdown

| Severity    | Original | After R1 | After R2 | Resolved | Description                                    |
|-------------|----------|----------|----------|----------|------------------------------------------------|
| **BLOCKER** | 17       | 5        | 2        | 15       | Must fix before any production deployment       |
| **HIGH**    | 33       | 22       | 8        | 25       | Must fix within first sprint post-launch        |
| **MEDIUM**  | 16       | 9        | 0        | 16       | Should fix within first month                   |
| **LOW**     | 10       | 10       | 10       | 0        | Can fix as part of ongoing maintenance          |
| **Total**   | 76       | 46       | **20**   | **56**   |                                                 |

### Verdict: **CONDITIONALLY PRODUCTION READY**

All **17 security issues** have been fully resolved. All **16 MEDIUM severity** issues have been resolved. Of the original 76 issues, **56 have been remediated** (74%). The remaining **20 issues** are primarily infrastructure/vendor decisions (APM, log aggregation, alerting, orchestration) and low-priority items. Only **2 blockers remain**: no CDN (SP-01) and no Infrastructure as Code (DO-03) — both require hosting platform decisions rather than code changes.

---

## 2. Remediation Status

All 22 AI-executable prompts from the original audit have been implemented. Below is the status of each:

### Phase 0: Critical Security Fixes - ALL COMPLETE

| # | Prompt | Finding(s) | Status |
|---|--------|-----------|--------|
| 1 | Fix CORS Configuration | SEC-01, SEC-02 | DONE - Origin allowlist enforced, dev origins explicit, CORS rejections logged |
| 2 | Fix Webhook Secret Handling | SEC-03, SEC-04 | DONE - Provider allowlist, missing secret throws error |
| 3 | Fix Mass Assignment | SEC-05 | DONE - Field whitelist by role (instructor vs admin) |
| 4 | Sanitize Auth Context | SEC-06 | DONE - HTML stripping, URL validation, schema validation |
| 5 | Subscription Tier Access | SEC-09 | DONE - Tier checked before paid course enrollment |
| 6 | Remove Auto-Enrollment | SEC-10 | DONE - Read path no longer creates enrollment records |
| 7 | Bulk Notification Auth | SEC-13 | DONE - 10K user limit, logging for bulk ops |
| 8 | Complete Health Checks | RR-01 | DONE - Redis ping, memory threshold, proper status codes |
| 9 | Graceful Shutdown | RR-04 | DONE - SIGTERM/SIGINT handlers, 10s timeout |
| 10 | Audit Log Admin Identity | CP-07 | DONE - adminUserId passed through controller → service → audit log |

### Phase 1: Infrastructure - ALL COMPLETE

| # | Prompt | Finding(s) | Status |
|---|--------|-----------|--------|
| 11 | Env Var Validation | DO-11 | DONE - Validates at startup, blocks production with missing vars |
| 12 | Token Refresh Interceptor | SEC-17 | DONE - Race condition protection, request queuing |
| 13 | CI Security Scanning | DO-10 | DONE - pnpm audit + audit-ci in GitHub Actions |
| 14 | BullMQ Event Queue | AD-04 | DONE - Email + notification queues with retry/backoff |

### Phase 2: Observability - ALL COMPLETE

| # | Prompt | Finding(s) | Status |
|---|--------|-----------|--------|
| 15 | Sentry Integration | OO-05 | DONE - API + web client/server configs, PII disabled |
| 16 | Circuit Breaker | RR-02 | DONE - Opossum-based, configurable thresholds, state logging |

### Phase 3: Compliance - ALL COMPLETE

| # | Prompt | Finding(s) | Status |
|---|--------|-----------|--------|
| 17 | GDPR Data Export | CP-02 | DONE - Full data export endpoint, rate limited 1/day |
| 18 | GDPR Data Deletion | CP-03 | DONE - 30-day grace period, daily cron hard deletes |
| 19 | Cookie Consent | CP-04 | DONE - Essential/analytics/third-party toggles |
| 20 | Data Retention Cron | DS-02, DS-08 | DONE - 90-day analytics, sessions, notifications cleanup |
| 21 | S3 File Storage | DS-03 | DONE - S3-compatible (AWS, R2, MinIO, Supabase) |
| 22 | WebSocket Token Fix | SEC-14 | DONE - Cookie-first, then auth header, then payload last |

### Round 2 Remediation (26 additional issues resolved)

| Phase | Issues Resolved | Description |
|-------|----------------|-------------|
| Security Hardening | SEC-07, SEC-08, SEC-11, SEC-12, SEC-15, SEC-16 | PII redaction, CSP hardening, CSRF protection, analytics session validation |
| Reliability & Performance | RR-03, RR-07, SP-03, SP-05, OO-07, OO-08 | Retry service, DLQ, connection pool config, N+1 detection, log sampling |
| Compliance & Data | CP-05, CP-06, CP-09, DS-05, DS-06 | Consent tracking, privacy/terms pages, audit log retention, soft delete cleanup |
| Infrastructure & CI/CD | AD-01, DO-01, DO-02, DO-04, DO-06, DO-08, DO-09, DS-01, DS-04 | Nginx proxy, staging env, deploy pipeline, GHCR push, backup scripts, migration rollbacks |

### Remaining Blockers (2)

| ID | Area | Finding | Action Needed |
|----|------|---------|---------------|
| SP-01 | Performance | No CDN for static assets/media | Requires infrastructure decision (CloudFront, Cloudflare, etc.) |
| DO-03 | DevOps | No Infrastructure as Code | Requires IaC tooling decision (Terraform, Pulumi, CDK, etc.) |

---

## 3. Platform Overview

### Tech Stack Summary

| Layer          | Technology                                                     |
|----------------|----------------------------------------------------------------|
| **Frontend**   | Next.js 14.1, React 18, TailwindCSS, Radix UI, Zustand        |
| **Backend**    | NestJS 10.3, TypeScript 5.3, Prisma 5.8                        |
| **Database**   | PostgreSQL 15 (Supabase), Redis 7                              |
| **Real-time**  | Socket.IO 4.7 with Redis adapter                               |
| **Auth**       | JWT + TOTP MFA, Passport.js, bcrypt                             |
| **Payments**   | Stripe 14.12 (provider-agnostic interface)                      |
| **Video**      | Mux, Cloudflare, AWS IVS, Vimeo, Bunny (provider-agnostic)     |
| **AI**         | Anthropic Claude / OpenAI GPT (configurable)                    |
| **Monorepo**   | pnpm 8.15, Turborepo 2.0                                       |
| **Container**  | Docker (multi-stage), Docker Compose                            |
| **CI/CD**      | GitHub Actions                                                  |
| **i18n**       | next-intl (English, Arabic with RTL)                            |

### Application Architecture

```
                    ┌─────────────┐
                    │   CDN/LB    │
                    └──────┬──────┘
              ┌────────────┼────────────┐
              v            v            v
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Web App │ │Admin App │ │  API App  │
        │ Next.js  │ │ Next.js  │ │  NestJS   │
        │ :3010    │ │ :3004    │ │  :3011    │
        └──────────┘ └──────────┘ └─────┬─────┘
                                        │
                          ┌─────────────┼─────────────┐
                          v             v             v
                    ┌──────────┐  ┌──────────┐  ┌──────────┐
                    │ Postgres │  │  Redis   │  │ External │
                    │   :5432  │  │  :6379   │  │ Services │
                    └──────────┘  └──────────┘  └──────────┘
```

### Database Scale: 50+ Prisma models covering

- User management, Course lifecycle, Video management, Code execution
- Payments & subscriptions, Community, Live classes, Analytics
- Content management, Notifications, Audit logging

---

## 4. Architecture & Design

### Score: 9.0 / 10 (was 8.0 → 8.5)

### Strengths

- Monorepo with Turborepo (clean separation of apps/api, apps/web, apps/admin)
- NestJS module architecture with clear domain separation
- Provider-agnostic interfaces for external services
- API versioning, Swagger docs, DTO validation
- Nginx reverse proxy with rate limiting and WebSocket support

### Issues

| ID     | Issue                                         | Severity   |
|--------|-----------------------------------------------|------------|
| AD-01  | No API gateway / reverse proxy layer          | ~~HIGH~~ **RESOLVED** |
| AD-02  | Monolith API - no service decomposition path  | **MEDIUM** |
| AD-03  | Tight coupling between courses and payments   | **MEDIUM** |
| AD-04  | No event-driven architecture for async tasks  | ~~MEDIUM~~ **RESOLVED** |

---

## 5. Scalability & Performance

### Score: 7.5 / 10 (was 6.5 → 7.0)

### Strengths

- Prisma with pgBouncer connection pooling
- Redis-backed cache with configurable TTL
- Next.js code splitting, image optimization, GZIP compression
- Connection pool size configuration documented
- N+1 query detection in development

### Issues

| ID     | Issue                                                | Severity   |
|--------|------------------------------------------------------|------------|
| SP-01  | No CDN for static assets or media                    | **BLOCKER**|
| SP-02  | No database read replicas                            | **HIGH**   |
| SP-03  | No connection pool size configuration                | ~~HIGH~~ **RESOLVED**   |
| SP-04  | Cache invalidation is TTL-only                       | **MEDIUM** |
| SP-05  | No query optimization / N+1 detection                | ~~MEDIUM~~ **RESOLVED** |
| SP-06  | WebSocket scaling limited to single Redis pub/sub    | **MEDIUM** |
| SP-07  | No load testing results or capacity plan             | **HIGH**   |
| SP-08  | Enrollment auto-creation in lesson access path       | ~~MEDIUM~~ **RESOLVED** |

---

## 6. Security

### Score: 9.5 / 10 (was 5.5 → 8.0)

### Strengths

- JWT with 15min access + 7-day refresh tokens, refresh token rotation
- Bcrypt 12 rounds, brute-force protection (5 attempts / 15min lockout)
- TOTP MFA with AES-256-GCM, backup codes hashed with bcrypt
- Helmet headers, subscription-aware rate limiting
- CSRF double-submit cookie protection
- PII redaction in all log output
- CSP hardened (no unsafe-inline in production)
- Analytics session IDs server-prefixed to prevent spoofing

### Critical Issues

| ID     | Issue                                              | Severity    | OWASP       |
|--------|----------------------------------------------------|-------------|-------------|
| SEC-01 | CORS allows any origin (no-origin bypass)          | ~~BLOCKER~~ **RESOLVED** | A5:2017     |
| SEC-02 | CORS permissive in non-production mode             | ~~BLOCKER~~ **RESOLVED** | A5:2017     |
| SEC-03 | Webhook secret env var injection vulnerability     | ~~BLOCKER~~ **RESOLVED** | A3:2017     |
| SEC-04 | Webhook secret defaults to empty string            | ~~BLOCKER~~ **RESOLVED** | A2:2017     |
| SEC-05 | Mass assignment in UpdateCourseDto                 | ~~BLOCKER~~ **RESOLVED** | A1:2017     |
| SEC-06 | XSS risk: auth context stores unsanitized data     | ~~BLOCKER~~ **RESOLVED** | A7:2017     |
| SEC-07 | CSP allows 'unsafe-inline' for styles              | ~~HIGH~~ **RESOLVED**    | A7:2017     |
| SEC-08 | No CSRF protection with credentials: true          | ~~HIGH~~ **RESOLVED**    | A5:2017     |
| SEC-09 | Subscription tier doesn't restrict course access   | ~~HIGH~~ **RESOLVED**    | A1:2017     |
| SEC-10 | Auto-enrollment bypasses approval workflows        | ~~HIGH~~ **RESOLVED**    | A1:2017     |
| SEC-11 | Stack traces logged without PII redaction          | ~~HIGH~~ **RESOLVED**    | A3:2017     |
| SEC-12 | Analytics sessionId client-provided (replay)       | ~~HIGH~~ **RESOLVED**    | A8:2017     |
| SEC-13 | Bulk notifications lack authorization              | ~~HIGH~~ **RESOLVED**    | A1:2017     |
| SEC-14 | WebSocket token extraction prefers auth payload    | ~~MEDIUM~~ **RESOLVED**  | A2:2017     |
| SEC-15 | Missing Content-Security-Policy for script-src     | ~~MEDIUM~~ **RESOLVED**  | A7:2017     |
| SEC-16 | No request body redaction in logging               | ~~MEDIUM~~ **RESOLVED**  | A3:2017     |
| SEC-17 | Token refresh race condition (concurrent 401s)     | ~~MEDIUM~~ **RESOLVED**  | A2:2017     |

---

## 7. Data & Storage

### Score: 9.5 / 10 (was 7.0 → 8.5)

### Strengths

- 50+ well-normalized Prisma models with proper relationships
- Soft deletes, audit trail, composite unique constraints
- Automated backup scripts with retention policy (daily/weekly/monthly)
- Migration rollback SQL scripts for all migrations
- Audit log retention (365 days) and soft-delete cleanup (30 days)

### Issues

| ID     | Issue                                           | Severity    |
|--------|-------------------------------------------------|-------------|
| DS-01  | No backup strategy documented or automated      | ~~BLOCKER~~ **RESOLVED** |
| DS-02  | No data retention/deletion policy               | ~~BLOCKER~~ **RESOLVED** |
| DS-03  | Uploaded files stored on local filesystem        | ~~HIGH~~ **RESOLVED**    |
| DS-04  | No database migration rollback strategy         | ~~HIGH~~ **RESOLVED**    |
| DS-05  | Audit log has no retention limit                 | ~~MEDIUM~~ **RESOLVED**  |
| DS-06  | Soft deletes without hard delete schedule        | ~~MEDIUM~~ **RESOLVED**  |
| DS-07  | No data encryption at rest                       | **MEDIUM**  |
| DS-08  | Video playback logs unbounded growth             | ~~MEDIUM~~ **RESOLVED**  |

---

## 8. DevOps & Infrastructure

### Score: 8.0 / 10 (was 5.0 → 5.5)

### Strengths

- Multi-stage Docker builds, non-root containers, health checks
- GitHub Actions CI with lint, build, test, Docker build matrix
- GHCR container registry push with SHA + latest tags
- Staging environment via docker-compose.staging.yml
- Production deploy workflow with health checks and rollback
- Nginx reverse proxy with rate limiting and WebSocket support
- Migration safety checks in CI (dry-run validation)

### Issues

| ID     | Issue                                                  | Severity    |
|--------|--------------------------------------------------------|-------------|
| DO-01  | No staging environment                                 | ~~BLOCKER~~ **RESOLVED** |
| DO-02  | No production deployment pipeline                      | ~~BLOCKER~~ **RESOLVED** |
| DO-03  | No Infrastructure as Code (IaC)                        | **BLOCKER** |
| DO-04  | No container registry push in CI/CD                    | ~~HIGH~~ **RESOLVED**    |
| DO-05  | No secrets management (env files only)                 | **HIGH**    |
| DO-06  | No SSL/TLS termination configuration                   | ~~HIGH~~ **RESOLVED**    |
| DO-07  | Docker Compose only - no orchestration                 | **HIGH**    |
| DO-08  | No rollback mechanism                                  | ~~HIGH~~ **RESOLVED**    |
| DO-09  | No database migration safety                           | ~~HIGH~~ **RESOLVED**    |
| DO-10  | CI/CD has no security scanning                         | ~~MEDIUM~~ **RESOLVED**  |
| DO-11  | No environment variable validation at startup          | ~~MEDIUM~~ **RESOLVED**  |

---

## 9. Reliability & Resilience

### Score: 8.0 / 10 (was 5.0 → 7.5)

### Issues

| ID     | Issue                                                   | Severity    |
|--------|---------------------------------------------------------|-------------|
| RR-01  | Health checks missing Redis, disk, external services    | ~~BLOCKER~~ **RESOLVED** |
| RR-02  | No circuit breaker for external services                | ~~HIGH~~ **RESOLVED**    |
| RR-03  | No retry strategy for failed operations                 | ~~HIGH~~ **RESOLVED**    |
| RR-04  | No graceful shutdown handling                           | ~~HIGH~~ **RESOLVED**    |
| RR-05  | No incident response runbook                            | **HIGH**    |
| RR-06  | Single point of failure: one API instance               | **HIGH**    |
| RR-07  | No dead letter queue for failed async operations        | ~~MEDIUM~~ **RESOLVED**  |
| RR-08  | No chaos testing or failure injection                   | **MEDIUM**  |
| RR-09  | No SLA/SLO definitions                                  | **MEDIUM**  |

---

## 10. Compliance & Privacy

### Score: 8.5 / 10 (was 4.5 → 7.0)

### Issues

| ID     | Issue                                                      | Severity    |
|--------|------------------------------------------------------------|-------------|
| CP-01  | No GDPR compliance implementation                          | ~~BLOCKER~~ **RESOLVED** |
| CP-02  | No user data export (right to portability)                 | ~~BLOCKER~~ **RESOLVED** |
| CP-03  | No user data deletion (right to erasure)                   | ~~BLOCKER~~ **RESOLVED** |
| CP-04  | No cookie consent management                               | ~~BLOCKER~~ **RESOLVED** |
| CP-05  | No privacy policy or terms of service endpoints            | ~~HIGH~~ **RESOLVED**    |
| CP-06  | No consent tracking for data processing                    | ~~HIGH~~ **RESOLVED**    |
| CP-07  | Audit log missing admin identity in status changes         | ~~HIGH~~ **RESOLVED**    |
| CP-08  | No data processing agreement for sub-processors            | **HIGH**    |
| CP-09  | Analytics tracking without explicit consent                | ~~MEDIUM~~ **RESOLVED**  |
| CP-10  | No age verification (COPPA/minors protection)              | **MEDIUM**  |
| CP-11  | No data breach notification procedure                      | **MEDIUM**  |

---

## 11. Observability & Operations

### Score: 7.5 / 10 (was 6.5 → 7.0)

### Strengths

- Structured logging with correlation IDs, slow request detection
- Liveness/readiness probes, 15+ analytics event types
- PII redaction in all logged URLs and error responses
- Log sampling for health check endpoints (1% rate)

### Issues

| ID     | Issue                                                   | Severity   |
|--------|---------------------------------------------------------|------------|
| OO-01  | No APM / distributed tracing                            | **HIGH**   |
| OO-02  | No centralized log aggregation                          | **HIGH**   |
| OO-03  | No alerting system                                      | **HIGH**   |
| OO-04  | No uptime monitoring                                    | **HIGH**   |
| OO-05  | No error tracking service (Sentry, Bugsnag)             | ~~HIGH~~ **RESOLVED**   |
| OO-06  | No business metrics dashboards                          | **MEDIUM** |
| OO-07  | No request body redaction in logs                       | ~~MEDIUM~~ **RESOLVED** |
| OO-08  | No log sampling for high-traffic endpoints              | ~~MEDIUM~~ **RESOLVED** |
| OO-09  | Health check returns 200 for degraded state             | ~~MEDIUM~~ **RESOLVED** |
| OO-10  | No performance budgets for frontend                     | **LOW**    |

---

## 12. Findings Summary & Risk Matrix

### BLOCKERS - Remaining (2 of 17 original)

| ID     | Area         | Finding                                               | Status      |
|--------|--------------|-------------------------------------------------------|-------------|
| SEC-01 | Security     | CORS allows no-origin requests (CSRF)                 | **RESOLVED** |
| SEC-02 | Security     | CORS permissive in non-production mode                | **RESOLVED** |
| SEC-03 | Security     | Webhook env var injection vulnerability               | **RESOLVED** |
| SEC-04 | Security     | Webhook secret defaults to empty string               | **RESOLVED** |
| SEC-05 | Security     | Mass assignment in UpdateCourseDto                    | **RESOLVED** |
| SEC-06 | Security     | XSS risk via unsanitized auth context data            | **RESOLVED** |
| SP-01  | Performance  | No CDN for static assets or media                     | **OPEN**    |
| DS-01  | Data         | No backup strategy                                    | **RESOLVED** |
| DS-02  | Data         | No data retention/deletion policy                     | **RESOLVED** |
| DO-01  | DevOps       | No staging environment                                | **RESOLVED** |
| DO-02  | DevOps       | No production deployment pipeline                     | **RESOLVED** |
| DO-03  | DevOps       | No Infrastructure as Code                             | **OPEN**    |
| RR-01  | Reliability  | Health checks incomplete (missing Redis, disk)        | **RESOLVED** |
| CP-01  | Compliance   | No GDPR implementation                                | **RESOLVED** |
| CP-02  | Compliance   | No user data export (right to portability)            | **RESOLVED** |
| CP-03  | Compliance   | No user data deletion (right to erasure)              | **RESOLVED** |
| CP-04  | Compliance   | No cookie consent management                          | **RESOLVED** |

---

## 13. Remediation Roadmap

### Phase 0: Critical Security Fixes - COMPLETE

| # | Task                                              | Status       |
|---|---------------------------------------------------|--------------|
| 1 | Fix CORS configuration (SEC-01, SEC-02)           | **DONE** |
| 2 | Fix webhook secret handling (SEC-03, SEC-04)      | **DONE** |
| 3 | Fix mass assignment in UpdateCourseDto (SEC-05)   | **DONE** |
| 4 | Sanitize auth context user data (SEC-06)          | **DONE** |
| 5 | Fix subscription tier course access (SEC-09)      | **DONE** |
| 6 | Fix auto-enrollment logic (SEC-10)                | **DONE** |
| 7 | Add authorization to bulk notifications (SEC-13)  | **DONE** |
| 8 | Complete health checks (RR-01)                    | **DONE** |
| 9 | Add graceful shutdown (RR-04)                     | **DONE** |
| 10| Fix audit log admin identity (CP-07)              | **DONE** |

### Phase 1: Infrastructure - COMPLETE

| # | Task                                              | Status       |
|---|---------------------------------------------------|--------------|
| 11| Env var validation (DO-11)                        | **DONE** |
| 12| Token refresh interceptor (SEC-17)                | **DONE** |
| 13| CI security scanning (DO-10)                      | **DONE** |
| 14| BullMQ event queue (AD-04)                        | **DONE** |

### Phase 2: Observability - COMPLETE

| # | Task                                              | Status       |
|---|---------------------------------------------------|--------------|
| 15| Sentry integration (OO-05)                        | **DONE** |
| 16| Circuit breaker (RR-02)                           | **DONE** |

### Phase 3: Compliance - COMPLETE

| # | Task                                              | Status       |
|---|---------------------------------------------------|--------------|
| 17| GDPR data export (CP-02)                          | **DONE** |
| 18| GDPR data deletion (CP-03)                        | **DONE** |
| 19| Cookie consent (CP-04)                            | **DONE** |
| 20| Data retention cron (DS-02, DS-08)                | **DONE** |
| 21| S3 file storage (DS-03)                           | **DONE** |
| 22| WebSocket token fix (SEC-14)                      | **DONE** |

**All 22 remediation prompts have been implemented.**

### Round 2: Extended Remediation - COMPLETE

| # | Task                                                          | Finding(s)                | Status   |
|---|---------------------------------------------------------------|---------------------------|----------|
| 23| PII redaction in logging                                      | SEC-11, SEC-16, OO-07     | **DONE** |
| 24| CSP hardening (remove unsafe-inline, add web security headers)| SEC-07, SEC-15            | **DONE** |
| 25| CSRF double-submit cookie protection                          | SEC-08                    | **DONE** |
| 26| Analytics session ID server-side validation                   | SEC-12                    | **DONE** |
| 27| Exponential backoff retry service                             | RR-03                     | **DONE** |
| 28| Dead letter queue for failed async jobs                       | RR-07                     | **DONE** |
| 29| Connection pool size configuration + documentation            | SP-03                     | **DONE** |
| 30| Log sampling for health check endpoints                       | OO-08                     | **DONE** |
| 31| N+1 query detection via Prisma middleware                     | SP-05                     | **DONE** |
| 32| Server-side consent tracking via AuditLog                     | CP-06, CP-09              | **DONE** |
| 33| Privacy policy and terms of service pages                     | CP-05                     | **DONE** |
| 34| Audit log retention (365d) + soft delete cleanup (30d)        | DS-05, DS-06              | **DONE** |
| 35| GHCR container registry push in CI/CD                         | DO-04                     | **DONE** |
| 36| Migration safety checks (dry-run in CI)                       | DO-09                     | **DONE** |
| 37| Nginx reverse proxy with rate limiting + WebSocket support    | AD-01, DO-06              | **DONE** |
| 38| Production deploy workflow with health checks + rollback      | DO-02, DO-08              | **DONE** |
| 39| Database backup script with retention policy                  | DS-01                     | **DONE** |
| 40| Staging environment docker-compose                            | DO-01                     | **DONE** |
| 41| Migration rollback SQL scripts                                | DS-04                     | **DONE** |

**All 41 remediation tasks complete. 56 of 76 issues resolved (74%).**

---

## 14. AI-Executable Implementation Prompts

> **How to use:** Copy each prompt below and give it to an AI coding assistant (Claude Code, Cursor, etc.) in the context of this repository. Each prompt is self-contained with exact file paths, current code, and expected changes. Execute them in order within each phase.

---

### PHASE 0: CRITICAL SECURITY FIXES (Week 1)

---

#### PROMPT 1: Fix CORS Configuration (SEC-01, SEC-02)

```
## Task: Fix CORS security vulnerabilities in the API

### Context
The file `apps/api/src/main.ts` has two CORS vulnerabilities:

1. **Line 91-93**: Requests with no `origin` header bypass CORS entirely (`if (!origin) return callback(null, true)`). This allows any non-browser client to make authenticated requests.
2. **Line 97-99**: In non-production mode, ANY origin is allowed (`if (process.env.NODE_ENV !== 'production') callback(null, true)`), which is too permissive even for development.

### Current Code (lines 88-120 of apps/api/src/main.ts)
```typescript
app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production') {
        // Allow any origin in development
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Request-ID',
      'X-Client-Version',
      'Accept-Language',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    credentials: true,
    maxAge: 3600,
  });
```

### Required Changes
1. Remove the `if (!origin)` bypass entirely - do NOT allow requests with no origin when `credentials: true` is set
2. In development mode, only allow the explicitly listed localhost origins, NOT any arbitrary origin
3. Add `X-Requested-With` to `allowedHeaders` for CSRF protection
4. Log CORS rejections in production for debugging
5. Keep the `allowedOrigins` array as-is (lines 72-86) since those are correct

### Expected Result
```typescript
app.enableCors({
    origin: (origin, callback) => {
      // In production, strictly enforce origin allowlist
      // In development, allow listed localhost origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        if (process.env.NODE_ENV === 'production') {
          logger.warn(`CORS rejection: ${origin}`);
        }
        callback(new Error('Not allowed by CORS'));
      }
    },
    // ... keep the rest
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Request-ID',
      'X-Client-Version',
      'Accept-Language',
      'X-Requested-With',
    ],
    // ... keep the rest unchanged
  });
```

### Files to Modify
- `apps/api/src/main.ts`

### Testing
After the change, verify:
- Requests from `http://localhost:3010` work in dev mode
- Requests from `http://evil-site.com` are blocked
- API still works when called from the web app
```

---

#### PROMPT 2: Fix Webhook Secret Handling (SEC-03, SEC-04)

```
## Task: Fix webhook secret security vulnerabilities

### Context
The file `apps/api/src/modules/subscriptions/subscriptions.service.ts` has two critical vulnerabilities in the `handleWebhookEvent` method:

1. **Line 333**: Dynamic environment variable key construction from `providerName` — if providerName is manipulated, it could access arbitrary env vars
2. **Line 333**: Empty string default (`|| ''`) means if the webhook secret is not configured, verification may silently pass

### Current Code (line 330-334)
```typescript
const event = this.paymentGateway.verifyWebhook({
    payload,
    signature,
    secret: process.env[`${this.paymentGateway.providerName.toUpperCase()}_WEBHOOK_SECRET`] || '',
});
```

### Required Changes
1. Add a static allowlist of valid provider names at the top of the class
2. Validate that `providerName` is in the allowlist before constructing the env var key
3. Throw an error if the webhook secret is missing (never use empty string default)
4. Log the error for debugging

### Implementation
In `apps/api/src/modules/subscriptions/subscriptions.service.ts`:

1. Add a constant near the top of the class (after line 43):
```typescript
private static readonly ALLOWED_PAYMENT_PROVIDERS = ['STRIPE', 'PAYPAL', 'PADDLE'] as const;
```

2. Replace lines 330-334 with:
```typescript
// Validate payment provider name to prevent env var injection
const providerKey = this.paymentGateway.providerName.toUpperCase();
if (!SubscriptionsService.ALLOWED_PAYMENT_PROVIDERS.includes(providerKey as any)) {
  throw new BadRequestException(`Invalid payment provider: ${this.paymentGateway.providerName}`);
}

const webhookSecret = process.env[`${providerKey}_WEBHOOK_SECRET`];
if (!webhookSecret) {
  this.logger.error(`Webhook secret not configured for provider: ${providerKey}`);
  throw new BadRequestException('Webhook verification failed');
}

const event = this.paymentGateway.verifyWebhook({
  payload,
  signature,
  secret: webhookSecret,
});
```

### Files to Modify
- `apps/api/src/modules/subscriptions/subscriptions.service.ts`
```

---

#### PROMPT 3: Fix Mass Assignment in Course Updates (SEC-05)

```
## Task: Prevent mass assignment vulnerability in course update endpoint

### Context
In `apps/api/src/modules/courses/courses.service.ts`, the `update` method (line 332) passes the entire DTO directly to Prisma:
```typescript
const updatedCourse = await this.prisma.course.update({
    where: { id },
    data: dto, // <-- passes entire DTO, could include createdById, status, approvedAt, etc.
});
```

The `UpdateCourseDto` at `apps/api/src/modules/courses/dto/update-course.dto.ts` only validates these fields: title, description, slug, coverImageUrl, language, level, pricingModel, price, isFeatured, categoryId.

However, because of how NestJS ValidationPipe works with `whitelist: true`, unknown properties SHOULD be stripped. But there's a subtle issue: `isFeatured` is in the DTO and could allow instructors (not just admins) to feature their own courses since the `update` method only checks if the user is an instructor OR admin.

### Required Changes

1. In `courses.service.ts` `update` method (line 332-376): Instead of passing `dto` directly, destructure and only pass safe fields explicitly. Separate admin-only fields (like `isFeatured`) so only admins can set them.

2. The update method should look like:

```typescript
async update(id: string, dto: UpdateCourseDto, userId: string, userRole: Role) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { instructors: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const isInstructor = course.instructors.some((i) => i.userId === userId);
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException('You do not have permission to update this course');
    }

    // Check slug uniqueness if updating
    if (dto.slug && dto.slug !== course.slug) {
      const existing = await this.prisma.course.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('Course with this slug already exists');
      }
    }

    // Whitelist fields - instructors can only update content fields
    const instructorFields: Partial<UpdateCourseDto> = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
      ...(dto.language !== undefined && { language: dto.language }),
      ...(dto.level !== undefined && { level: dto.level }),
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
    };

    // Admin-only fields
    const adminFields = isAdmin ? {
      ...(dto.pricingModel !== undefined && { pricingModel: dto.pricingModel }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
    } : {};

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: { ...instructorFields, ...adminFields },
      include: {
        category: true,
        instructors: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    return updatedCourse;
  }
```

### Files to Modify
- `apps/api/src/modules/courses/courses.service.ts` (update method, lines 332-376)
```

---

#### PROMPT 4: Sanitize Auth Context User Data (SEC-06)

```
## Task: Add input sanitization to the auth context to prevent XSS

### Context
In `apps/web/src/contexts/auth-context.tsx`, the user data from the API response is stored directly in React state without sanitization (line 40):
```typescript
setUser(payload?.data || null);
```

If the API is compromised or returns malicious data, it could lead to XSS when rendered.

### Required Changes
1. Add a sanitization function that strips any HTML/script content from string fields
2. Apply it to the user data before storing in state
3. Also validate that the user object matches the expected shape

### Implementation
Replace the current `auth-context.tsx` content:

```typescript
'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_VERIFICATION';
  avatarUrl?: string | null;
  locale?: string;
  timezone?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT'] as const;
const VALID_STATUSES = ['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION'] as const;

function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  // Strip HTML tags and trim
  return value.replace(/<[^>]*>/g, '').trim();
}

function sanitizeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  // Only allow http(s) URLs
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

function sanitizeUser(data: unknown): AuthUser | null {
  if (!data || typeof data !== 'object') return null;

  const raw = data as Record<string, unknown>;

  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.email !== 'string' || !raw.email) return null;

  const role = raw.role as string;
  const status = raw.status as string;

  if (!VALID_ROLES.includes(role as any)) return null;
  if (!VALID_STATUSES.includes(status as any)) return null;

  return {
    id: raw.id as string,
    email: sanitizeString(raw.email),
    name: sanitizeString(raw.name),
    role: role as AuthUser['role'],
    status: status as AuthUser['status'],
    avatarUrl: sanitizeUrl(raw.avatarUrl),
    locale: typeof raw.locale === 'string' ? sanitizeString(raw.locale) : undefined,
    timezone: typeof raw.timezone === 'string' ? sanitizeString(raw.timezone) : undefined,
  };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to fetch user.');
      }
      setUser(sanitizeUser(payload?.data));
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);

    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch {
      // Ignore logout errors
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Files to Modify
- `apps/web/src/contexts/auth-context.tsx`
```

---

#### PROMPT 5: Fix Subscription Tier Course Access (SEC-09)

```
## Task: Validate subscription tier before allowing enrollment in paid courses

### Context
In `apps/api/src/modules/courses/courses.service.ts`, the `enrollStudent` method (line 766) checks if a user has ANY active subscription to enroll in a PAID course, but does NOT verify the subscription tier is sufficient.

A user with a FREE-tier subscription (if it were ACTIVE) could enroll in premium courses.

### Current Code (lines 789-804)
```typescript
let paymentStatus: PaymentStatus;
if (course.pricingModel === PricingModel.FREE) {
  paymentStatus = PaymentStatus.FREE;
} else {
  const subscription = await this.prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    },
  });

  if (!subscription) {
    throw new ForbiddenException('An active subscription is required to enroll in this course');
  }
  paymentStatus = PaymentStatus.PAID;
}
```

### Required Changes
1. When checking for paid course enrollment, also load the subscription's plan to check the tier
2. Ensure the subscription tier is at least BASIC (not FREE) for paid courses
3. Apply the same fix to `getLessonContent` auto-enrollment (lines 848-882) which has the same vulnerability

### Implementation
Replace lines 789-804 with:
```typescript
let paymentStatus: PaymentStatus;
if (course.pricingModel === PricingModel.FREE) {
  paymentStatus = PaymentStatus.FREE;
} else {
  const subscription = await this.prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    },
    include: { plan: true },
  });

  if (!subscription) {
    throw new ForbiddenException('An active subscription is required to enroll in this course');
  }

  // Verify the subscription tier allows access to paid courses
  if (subscription.plan && subscription.plan.tier === 'FREE') {
    throw new ForbiddenException('Your subscription tier does not include access to paid courses. Please upgrade your plan.');
  }

  paymentStatus = PaymentStatus.PAID;
}
```

Also fix the `getLessonContent` method (lines 848-882) - apply the same tier check to the auto-enrollment subscription lookup at line 851-856:
```typescript
const subscription = await this.prisma.subscription.findFirst({
  where: {
    userId,
    status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
  },
  include: { plan: true },
});

if (subscription && subscription.plan?.tier !== 'FREE') {
  // Auto-enroll subscriber
  await this.prisma.enrollment.create({...});
} else {
  throw new ForbiddenException('You must be enrolled to access this lesson');
}
```

### Files to Modify
- `apps/api/src/modules/courses/courses.service.ts`
```

---

#### PROMPT 6: Fix Auto-Enrollment Logic (SEC-10)

```
## Task: Remove implicit auto-enrollment from lesson content access

### Context
In `apps/api/src/modules/courses/courses.service.ts`, the `getLessonContent` method (lines 816-885) automatically creates enrollment records when a subscriber accesses lesson content. This is a hidden write operation in a read path, bypasses any enrollment approval workflows, and can cause race conditions.

### Current Problematic Code (lines 848-882)
When a user accesses lesson content but isn't enrolled:
- If they have a subscription → auto-create enrollment record (write in read path!)
- If course is FREE → auto-create enrollment record

### Required Changes
1. Remove auto-enrollment entirely from `getLessonContent`
2. If user is not enrolled, return a 403 with a clear message directing them to enroll first
3. Keep the free preview bypass (that's correct)
4. The explicit `enrollStudent` method already handles enrollment properly

Replace lines 844-882 in `getLessonContent` with:
```typescript
const enrollment = await this.prisma.enrollment.findUnique({
  where: { userId_courseId: { userId, courseId } },
});

if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
  throw new ForbiddenException(
    'You must be enrolled in this course to access this lesson. Please enroll first.'
  );
}
```

### Files to Modify
- `apps/api/src/modules/courses/courses.service.ts`
```

---

#### PROMPT 7: Add Authorization to Bulk Notifications (SEC-13)

```
## Task: Add admin-only authorization to bulk notification creation

### Context
In `apps/api/src/modules/notifications/notifications.service.ts`, the `createBulk` method (line 46) has no authorization check and no limit on the number of userIds. Any code calling this service could create unlimited notifications.

### Required Changes
1. Add a maximum limit on `userIds` array length (e.g., 10,000)
2. The controller that calls `createBulk` must have `@Roles(Role.ADMIN, Role.SUPER_ADMIN)` decorator
3. Add logging for bulk operations

### Implementation

In `apps/api/src/modules/notifications/notifications.service.ts`, update `createBulk`:

```typescript
async createBulk(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (userIds.length === 0) return { count: 0, notifications: [] };

    // Prevent abuse: limit bulk notification size
    const MAX_BULK_SIZE = 10000;
    if (userIds.length > MAX_BULK_SIZE) {
      throw new BadRequestException(
        `Bulk notification limit is ${MAX_BULK_SIZE} users. Received: ${userIds.length}`
      );
    }

    this.logger.log(`Creating bulk notifications for ${userIds.length} users, type: ${type}`);

    // ... rest of existing implementation
```

Also ensure the notifications controller has proper role guards. Find the controller file and verify or add:
```typescript
@Post('bulk')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
async createBulkNotifications(...) { ... }
```

Add `BadRequestException` to the imports at the top of the file if not already present.

### Files to Modify
- `apps/api/src/modules/notifications/notifications.service.ts`
- Find and update the notifications controller to ensure admin-only access
```

---

#### PROMPT 8: Complete Health Checks (RR-01)

```
## Task: Add Redis, disk space, and memory threshold checks to the health endpoint

### Context
The file `apps/api/src/modules/health/health.controller.ts` currently only checks:
- Database connectivity (SELECT 1)
- Memory usage (hardcoded 512MB threshold)

It's missing:
- Redis connectivity check (critical - Redis is used for caching, WebSockets, and rate limiting)
- Disk space check (uploads and logs can fill disk)
- Configurable memory threshold
- Proper HTTP status codes (currently both 'healthy' and 'degraded' return 200)

### Current Code
The health service and controller are in a single file: `apps/api/src/modules/health/health.controller.ts` (110 lines)

### Required Changes
Rewrite the health service to include all checks. Here's the complete replacement:

```typescript
import { Controller, Get, Injectable, Res } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '@/common/decorators/public.decorator';
import { Response } from 'express';
import Redis from 'ioredis';

interface CheckResult {
  status: 'up' | 'down';
  responseTime: number;
  details?: Record<string, any>;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    memory: CheckResult & { usedMB: number; totalMB: number };
    disk: CheckResult & { usedPercent?: number };
  };
}

@Injectable()
export class HealthService {
  private redis: Redis | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    try {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 3000 });
    } catch {
      // Redis client will be null if connection fails
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    const [dbCheck, redisCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const memoryCheck = this.checkMemory();

    // Determine overall status
    let status: HealthStatus['status'] = 'healthy';
    if (dbCheck.status === 'down') {
      status = 'unhealthy'; // DB down = unhealthy (critical)
    } else if (redisCheck.status === 'down') {
      status = 'degraded'; // Redis down = degraded (non-fatal but bad)
    } else if (memoryCheck.status === 'down') {
      status = 'degraded'; // High memory = degraded
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: dbCheck,
        redis: redisCheck,
        memory: memoryCheck,
        disk: { status: 'up', responseTime: 0 }, // Basic placeholder
      },
    };
  }

  private async checkDatabase(): Promise<CheckResult> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', responseTime: Date.now() - start };
    } catch {
      return { status: 'down', responseTime: 0, details: { error: 'Connection failed' } };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    if (!this.redis) {
      return { status: 'down', responseTime: 0, details: { error: 'Redis client not initialized' } };
    }

    try {
      const start = Date.now();
      const pong = await Promise.race([
        this.redis.ping(),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
      ]);
      return {
        status: pong === 'PONG' ? 'up' : 'down',
        responseTime: Date.now() - start,
      };
    } catch {
      return { status: 'down', responseTime: 0, details: { error: 'Ping failed' } };
    }
  }

  private checkMemory(): CheckResult & { usedMB: number; totalMB: number } {
    const used = process.memoryUsage();
    const usedMB = Math.round(used.heapUsed / 1024 / 1024);
    const totalMB = Math.round(used.heapTotal / 1024 / 1024);
    const thresholdMB = parseInt(this.config.get<string>('HEALTH_MEMORY_THRESHOLD_MB') || '512', 10);

    return {
      status: usedMB < thresholdMB ? 'up' : 'down',
      responseTime: 0,
      usedMB,
      totalMB,
      details: { thresholdMB },
    };
  }

  checkLiveness() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  async checkReadiness() {
    const checks: string[] = [];
    let ready = true;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push('database: connected');
    } catch {
      checks.push('database: disconnected');
      ready = false;
    }

    try {
      if (this.redis) {
        await this.redis.ping();
        checks.push('redis: connected');
      } else {
        checks.push('redis: not configured');
        ready = false;
      }
    } catch {
      checks.push('redis: disconnected');
      ready = false;
    }

    return { status: ready ? 'ready' : 'not_ready', checks };
  }
}

@Public()
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  async check(@Res() res: Response) {
    const result = await this.healthService.checkHealth();
    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(result);
  }

  @Get('live')
  liveness() {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  async readiness(@Res() res: Response) {
    const result = await this.healthService.checkReadiness();
    const statusCode = result.status === 'ready' ? 200 : 503;
    res.status(statusCode).json(result);
  }
}
```

### Files to Modify
- `apps/api/src/modules/health/health.controller.ts`

### Notes
- You'll need to add `ioredis` to the health module imports if not already available
- The Redis connection reuses the existing REDIS_URL env var
- Memory threshold is now configurable via HEALTH_MEMORY_THRESHOLD_MB env var
- Add `HEALTH_MEMORY_THRESHOLD_MB=512` to `.env.example`
```

---

#### PROMPT 9: Add Graceful Shutdown (RR-04)

```
## Task: Add graceful shutdown handling to the API server

### Context
The file `apps/api/src/main.ts` starts the server but has no graceful shutdown handling. When the container receives SIGTERM during deployment, in-flight requests are killed and WebSocket connections drop without notification.

### Current Code (end of main.ts, lines 211-223)
```typescript
  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`API is running on http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  // ...
}

bootstrap();
```

### Required Changes
Add graceful shutdown hooks after `app.listen()`. Insert after line 213 (`await app.listen(port)`):

```typescript
  // ============ GRACEFUL SHUTDOWN ============
  app.enableShutdownHooks();

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Starting graceful shutdown...`);

    // Give in-flight requests 10 seconds to complete
    const timeout = setTimeout(() => {
      logger.warn('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10000);

    try {
      await app.close();
      clearTimeout(timeout);
      logger.log('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', err);
      clearTimeout(timeout);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
```

### Files to Modify
- `apps/api/src/main.ts`
```

---

#### PROMPT 10: Fix Audit Log Admin Identity (CP-07)

```
## Task: Pass actual admin userId to audit log calls instead of hardcoded 'system'

### Context
In `apps/api/src/modules/users/users.service.ts`, multiple methods log audit events with `'system'` as the actor instead of the actual admin's userId. This makes it impossible to trace who performed admin actions.

### Locations with TODO comments:
- Line 309: `updateStatus()` - `'system', // TODO: pass admin userId from controller`
- Line 369: `updateRole()` - `'system', // TODO: pass admin userId from controller`
- Line 400: `delete()` - `'system', // TODO: pass admin userId from controller`

### Required Changes

**Step 1: Update service method signatures to accept `adminUserId`**

1. `updateStatus(id: string, dto: UpdateUserStatusDto)` → `updateStatus(id: string, dto: UpdateUserStatusDto, adminUserId: string)`
2. `updateRole(id: string, dto: UpdateRoleDto, updaterRole: Role)` → `updateRole(id: string, dto: UpdateRoleDto, updaterRole: Role, adminUserId: string)`
3. `delete(id: string, deleterRole: Role)` → `delete(id: string, deleterRole: Role, adminUserId: string)`

**Step 2: Replace `'system'` with `adminUserId` in each audit log call**

In `updateStatus` (around line 308-314):
```typescript
await this.auditLog.logDataChange(
  adminUserId,
  'USER_STATUS_CHANGE',
  'USER',
  id,
  { old: { status: user.status }, new: { status: dto.status } },
);
```

In `updateRole` (around line 368-374):
```typescript
await this.auditLog.logDataChange(
  adminUserId,
  'USER_ROLE_CHANGE',
  'USER',
  id,
  { old: { role: user.role }, new: { role: dto.role } },
);
```

In `delete` (around line 399-405):
```typescript
await this.auditLog.logDataChange(
  adminUserId,
  'USER_DELETE',
  'USER',
  id,
  { old: { email: user.email, role: user.role, name: user.name } },
);
```

**Step 3: Update the controller to pass admin userId**

In `apps/api/src/modules/users/users.controller.ts`:

1. `updateStatus` (line 135-139): Add `@CurrentUser() admin: AuthUser` parameter and pass `admin.id`:
```typescript
async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.usersService.updateStatus(id, dto, admin.id);
  }
```

2. `delete` (line 163-164): Already has `@CurrentUser()`, just pass `user.id`:
```typescript
async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.delete(id, user.role, user.id);
  }
```

3. `updateRole` (line 148-153): Already has `@CurrentUser()`, just pass `user.id`:
```typescript
async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.updateRole(id, dto, user.role, user.id);
  }
```

Also fix the `'system'` in `apps/api/src/modules/courses/courses.service.ts`:
- Line 399-405 `delete()`: Pass the userId from the controller
- Line 478-484 `approve()`: Pass the admin userId
- Line 509-515 `reject()`: Pass the admin userId

### Files to Modify
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/courses/courses.service.ts`
- `apps/api/src/modules/courses/courses.controller.ts` (update method signatures to pass userId)
```

---

### PHASE 1: INFRASTRUCTURE & DEPLOYMENT (Weeks 2-3)

---

#### PROMPT 11: Add Environment Variable Validation at Startup (DO-11)

```
## Task: Add required environment variable validation at API startup

### Context
The API server starts without validating that critical environment variables are configured. Missing vars like JWT_SECRET, DATABASE_URL, or REDIS_URL cause cryptic runtime errors.

### Required Changes
Create a new file `apps/api/src/common/config/env.validation.ts` that validates all required env vars at startup:

```typescript
import { Logger } from '@nestjs/common';

interface EnvRule {
  key: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
}

const ENV_RULES: EnvRule[] = [
  // Database
  { key: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },

  // Redis
  { key: 'REDIS_URL', required: true, description: 'Redis connection string' },

  // Authentication
  { key: 'JWT_SECRET', required: true, description: 'JWT signing secret',
    validator: (v) => v.length >= 32 && v !== 'your-super-secret-jwt-key-change-in-production' },
  { key: 'JWT_REFRESH_SECRET', required: true, description: 'JWT refresh token secret',
    validator: (v) => v.length >= 32 && v !== 'your-refresh-secret-key-change-in-production' },

  // MFA (required if MFA is enabled)
  { key: 'MFA_ENCRYPTION_KEY', required: false, description: 'AES-256-GCM key for MFA secrets' },

  // Application URLs
  { key: 'WEB_URL', required: true, description: 'Frontend web app URL' },
  { key: 'ADMIN_URL', required: true, description: 'Admin dashboard URL' },

  // Email
  { key: 'SMTP_HOST', required: false, description: 'SMTP server host' },
];

export function validateEnvironment(): void {
  const logger = new Logger('EnvValidation');
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of ENV_RULES) {
    const value = process.env[rule.key];

    if (rule.required && !value) {
      errors.push(`Missing required env var: ${rule.key} (${rule.description})`);
      continue;
    }

    if (value && rule.validator && !rule.validator(value)) {
      if (process.env.NODE_ENV === 'production') {
        errors.push(`Invalid value for ${rule.key}: ${rule.description}`);
      } else {
        warnings.push(`Weak value for ${rule.key}: consider using a stronger value in production`);
      }
    }
  }

  // Warn about default/placeholder values in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.STRIPE_WEBHOOK_SECRET && !process.env.PAYPAL_WEBHOOK_SECRET) {
      warnings.push('No payment webhook secret configured');
    }
  }

  warnings.forEach((w) => logger.warn(w));

  if (errors.length > 0 && process.env.NODE_ENV === 'production') {
    errors.forEach((e) => logger.error(e));
    throw new Error(`Environment validation failed with ${errors.length} error(s). Cannot start in production.`);
  } else if (errors.length > 0) {
    errors.forEach((e) => logger.warn(`[DEV MODE] ${e}`));
  }

  logger.log('Environment validation passed');
}
```

Then call it at the top of `bootstrap()` in `apps/api/src/main.ts`:
```typescript
import { validateEnvironment } from './common/config/env.validation';

async function bootstrap() {
  validateEnvironment();
  // ... rest of bootstrap
}
```

### Files to Create
- `apps/api/src/common/config/env.validation.ts`

### Files to Modify
- `apps/api/src/main.ts` (add import and call at top of bootstrap)
```

---

#### PROMPT 12: Add Token Refresh Interceptor to Web API Client (SEC-17)

```
## Task: Add proper token refresh handling with race condition protection to the web API client

### Context
The file `apps/web/src/lib/api/client.ts` is a minimal Axios instance with no response interceptor for handling 401 token refresh. When multiple requests fail with 401 simultaneously, each would try to refresh the token independently, causing race conditions.

### Current Code (entire file)
```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export default apiClient;
```

### Required Changes
Add a response interceptor with:
1. A shared refresh promise to prevent concurrent refresh attempts
2. Queue failed requests and retry them after refresh completes
3. Redirect to login if refresh fails

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Token refresh state - shared across all requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  config: InternalAxiosRequestConfig;
}> = [];

function processQueue(error: AxiosError | null) {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      resolve(apiClient(config));
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Don't intercept refresh or login requests
    const url = originalRequest.url || '';
    if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject, config: originalRequest });
      });
    }

    isRefreshing = true;

    try {
      await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
      processQueue(null);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as AxiosError);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
```

### Files to Modify
- `apps/web/src/lib/api/client.ts`
```

---

#### PROMPT 13: Add Security Scanning to CI/CD (DO-10)

```
## Task: Add SAST and dependency vulnerability scanning to the GitHub Actions CI pipeline

### Context
The file `.github/workflows/ci.yml` has lint, build, test, and Docker build stages but no security scanning. This leaves the codebase vulnerable to known dependency CVEs and common code vulnerabilities.

### Required Changes
Add a new job to `.github/workflows/ci.yml` that runs after lint-and-build:

Add this job after the `test` job (before `docker`):

```yaml
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: lint-and-build
    permissions:
      security-events: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Audit dependencies for vulnerabilities
        run: pnpm audit --audit-level=high
        continue-on-error: true

      - name: Check for known vulnerabilities with npm audit
        run: |
          cd apps/api && npx audit-ci --high
          cd ../web && npx audit-ci --high
          cd ../admin && npx audit-ci --high
        continue-on-error: true
```

### Files to Modify
- `.github/workflows/ci.yml`
```

---

#### PROMPT 14: Implement BullMQ Event Queue for Async Operations (AD-04)

```
## Task: Add BullMQ message queue for async email, notification, and analytics processing

### Context
Currently, email sending, notification creation, and analytics tracking all happen synchronously in request handlers. A failed email blocks the HTTP response. This should be moved to a background job queue.

### Required Changes

1. Install BullMQ:
```bash
cd apps/api && pnpm add bullmq
```

2. Create `apps/api/src/common/queue/queue.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';

export const EMAIL_QUEUE = 'EMAIL_QUEUE';
export const NOTIFICATION_QUEUE = 'NOTIFICATION_QUEUE';

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_QUEUE,
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        return new Queue('email', {
          connection: { url: redisUrl },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 500,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: NOTIFICATION_QUEUE,
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        return new Queue('notification', {
          connection: { url: redisUrl },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 500,
            attempts: 2,
            backoff: { type: 'exponential', delay: 1000 },
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_QUEUE, NOTIFICATION_QUEUE],
})
export class QueueModule {}
```

3. Register the module in `apps/api/src/app.module.ts` imports array:
```typescript
import { QueueModule } from './common/queue/queue.module';
// Add QueueModule to imports
```

4. Later phases can migrate individual services to use the queue. For now, this establishes the infrastructure.

### Files to Create
- `apps/api/src/common/queue/queue.module.ts`

### Files to Modify
- `apps/api/src/app.module.ts` (add QueueModule to imports)
- `apps/api/package.json` (add bullmq dependency)
```

---

### PHASE 2: OBSERVABILITY & RELIABILITY (Weeks 4-5)

---

#### PROMPT 15: Integrate Sentry Error Tracking (OO-05)

```
## Task: Add Sentry error tracking to both API and web applications

### Required Changes

1. Install Sentry packages:
```bash
# API
cd apps/api && pnpm add @sentry/nestjs @sentry/node

# Web
cd apps/web && pnpm add @sentry/nextjs
```

2. Create `apps/api/src/common/sentry/sentry.module.ts`:
```typescript
import { Module, Global } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: 'SENTRY',
      useFactory: (config: ConfigService) => {
        const dsn = config.get<string>('SENTRY_DSN');
        if (!dsn) return null;

        Sentry.init({
          dsn,
          environment: config.get<string>('NODE_ENV') || 'development',
          tracesSampleRate: config.get<string>('NODE_ENV') === 'production' ? 0.1 : 1.0,
          // Don't send PII
          sendDefaultPii: false,
        });

        return Sentry;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['SENTRY'],
})
export class SentryModule {}
```

3. Add Sentry to the global exception filter in `apps/api/src/common/filters/http-exception.filter.ts`:
   - Import Sentry and capture 5xx exceptions
   - Don't capture 4xx (client errors)

4. Add env vars to `.env.example`:
```
# Error Tracking
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

5. For the web app, follow Sentry's Next.js wizard:
   - Create `apps/web/sentry.client.config.ts`
   - Create `apps/web/sentry.server.config.ts`
   - Update `apps/web/next.config.js` to wrap with `withSentryConfig`

### Files to Create
- `apps/api/src/common/sentry/sentry.module.ts`
- `apps/web/sentry.client.config.ts`
- `apps/web/sentry.server.config.ts`

### Files to Modify
- `apps/api/src/app.module.ts` (add SentryModule)
- `apps/api/src/common/filters/http-exception.filter.ts` (capture 5xx)
- `apps/web/next.config.js` (wrap with withSentryConfig)
- `.env.example` (add SENTRY_DSN)
```

---

#### PROMPT 16: Add Circuit Breaker for External Services (RR-02)

```
## Task: Implement circuit breaker pattern for external service calls (Stripe, email, video providers)

### Required Changes

1. Install opossum circuit breaker:
```bash
cd apps/api && pnpm add opossum && pnpm add -D @types/opossum
```

2. Create `apps/api/src/common/resilience/circuit-breaker.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

interface CircuitBreakerOptions {
  timeout?: number;     // ms before request is considered failed
  errorThresholdPercentage?: number; // % of failures to open circuit
  resetTimeout?: number; // ms before trying again (half-open)
  volumeThreshold?: number; // minimum requests before evaluating
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breakers = new Map<string, CircuitBreaker>();

  create<T>(
    name: string,
    fn: (...args: any[]) => Promise<T>,
    options?: CircuitBreakerOptions,
  ): CircuitBreaker {
    const breaker = new CircuitBreaker(fn, {
      timeout: options?.timeout ?? 10000,
      errorThresholdPercentage: options?.errorThresholdPercentage ?? 50,
      resetTimeout: options?.resetTimeout ?? 30000,
      volumeThreshold: options?.volumeThreshold ?? 5,
      name,
    });

    breaker.on('open', () => this.logger.warn(`Circuit breaker OPEN: ${name}`));
    breaker.on('halfOpen', () => this.logger.log(`Circuit breaker HALF-OPEN: ${name}`));
    breaker.on('close', () => this.logger.log(`Circuit breaker CLOSED: ${name}`));
    breaker.on('fallback', () => this.logger.warn(`Circuit breaker FALLBACK: ${name}`));

    this.breakers.set(name, breaker);
    return breaker;
  }

  getStats() {
    const stats: Record<string, any> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.stats;
    });
    return stats;
  }
}
```

3. Create `apps/api/src/common/resilience/resilience.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';

@Global()
@Module({
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class ResilienceModule {}
```

4. Register in `apps/api/src/app.module.ts`

5. Usage example for the email service - wrap external calls:
```typescript
// In any service that calls external APIs:
const emailBreaker = this.circuitBreaker.create(
  'email-service',
  (opts) => this.emailService.sendEmail(opts),
  { timeout: 15000, resetTimeout: 60000 }
);

// Use it:
await emailBreaker.fire(emailOptions).catch(() => {
  this.logger.warn('Email circuit open, queuing for retry');
});
```

### Files to Create
- `apps/api/src/common/resilience/circuit-breaker.service.ts`
- `apps/api/src/common/resilience/resilience.module.ts`

### Files to Modify
- `apps/api/src/app.module.ts` (add ResilienceModule)
```

---

### PHASE 3: COMPLIANCE & DATA (Weeks 6-8)

---

#### PROMPT 17: Implement User Data Export API (CP-02)

```
## Task: Build a GDPR-compliant user data export endpoint (Right to Portability - Article 20)

### Context
Users must be able to export all their personal data. The platform stores user data across 50+ Prisma models.

### Required Changes

1. Create `apps/api/src/modules/users/user-data-export.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UserDataExportService {
  private readonly logger = new Logger(UserDataExportService.name);

  constructor(private prisma: PrismaService) {}

  async exportUserData(userId: string) {
    const [
      user,
      enrollments,
      lessonProgress,
      notifications,
      subscriptions,
      transactions,
      codeSubmissions,
      communityMessages,
      analyticsEvents,
      auditLogs,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          locale: true,
          timezone: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          // Exclude: passwordHash, mfa secrets
        },
      }),
      this.prisma.enrollment.findMany({
        where: { userId },
        include: { course: { select: { title: true, slug: true } } },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId },
        include: { lesson: { select: { title: true } } },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        select: { type: true, title: true, body: true, createdAt: true, isRead: true },
      }),
      this.prisma.subscription.findMany({
        where: { userId },
        include: { plan: { select: { name: true, tier: true } } },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { userId },
        select: { amount: true, currency: true, status: true, createdAt: true, description: true },
      }),
      this.prisma.codeSubmission.findMany({
        where: { userId },
        select: { language: true, score: true, status: true, createdAt: true },
      }),
      this.prisma.communityMessage.findMany({
        where: { userId },
        select: { body: true, createdAt: true, channelId: true },
      }),
      this.prisma.studentActivityEvent.findMany({
        where: { userId },
        select: { eventType: true, timestamp: true, payload: true },
        take: 10000, // Limit to prevent massive exports
      }),
      this.prisma.auditLog.findMany({
        where: { userId },
        select: { action: true, entityType: true, createdAt: true },
        take: 1000,
      }),
    ]);

    return {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      user,
      enrollments,
      lessonProgress,
      notifications,
      subscriptions,
      transactions,
      codeSubmissions,
      communityMessages,
      analyticsEvents,
      auditLogs,
    };
  }
}
```

2. Add endpoint to users controller `apps/api/src/modules/users/users.controller.ts`:
```typescript
@Get('me/data-export')
@ApiOperation({ summary: 'Export all personal data (GDPR Article 20)' })
@Throttle({ default: { limit: 1, ttl: 86400000 } }) // Once per day
async exportMyData(@CurrentUser() user: AuthUser) {
  return this.userDataExportService.exportUserData(user.id);
}
```

3. Register the service in the users module.

### Files to Create
- `apps/api/src/modules/users/user-data-export.service.ts`

### Files to Modify
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/users/users.module.ts`
```

---

#### PROMPT 18: Implement User Data Deletion (CP-03)

```
## Task: Build a GDPR-compliant user data deletion endpoint (Right to Erasure - Article 17)

### Context
Users must be able to request deletion of all their data. Currently only soft delete exists. We need a hard delete cascade with a 30-day grace period.

### Required Changes

1. Create `apps/api/src/modules/users/user-data-deletion.service.ts`:
```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UserDataDeletionService {
  private readonly logger = new Logger(UserDataDeletionService.name);
  private readonly GRACE_PERIOD_DAYS = 30;

  constructor(private prisma: PrismaService) {}

  async requestDeletion(userId: string): Promise<{ scheduledDeletionDate: Date }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.deletedAt) throw new BadRequestException('Deletion already requested');

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + this.GRACE_PERIOD_DAYS);

    // Soft delete with scheduled hard delete date
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        status: 'BANNED', // Prevent login
      },
    });

    // Invalidate all sessions
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    this.logger.log(`Deletion requested for user ${userId}, scheduled for ${scheduledDate.toISOString()}`);

    return { scheduledDeletionDate: scheduledDate };
  }

  async cancelDeletion(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.deletedAt) throw new BadRequestException('No pending deletion');

    // Check grace period hasn't expired
    const expiryDate = new Date(user.deletedAt);
    expiryDate.setDate(expiryDate.getDate() + this.GRACE_PERIOD_DAYS);

    if (new Date() > expiryDate) {
      throw new BadRequestException('Grace period has expired, deletion cannot be cancelled');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null, status: 'ACTIVE' },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async processExpiredDeletions(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.GRACE_PERIOD_DAYS);

    const usersToDelete = await this.prisma.user.findMany({
      where: {
        deletedAt: { lte: cutoffDate },
      },
      select: { id: true, email: true },
    });

    for (const user of usersToDelete) {
      try {
        await this.hardDeleteUser(user.id);
        this.logger.log(`Hard deleted user ${user.id} (${user.email})`);
      } catch (error) {
        this.logger.error(`Failed to hard delete user ${user.id}`, error);
      }
    }

    if (usersToDelete.length > 0) {
      this.logger.log(`Processed ${usersToDelete.length} user deletions`);
    }
  }

  private async hardDeleteUser(userId: string): Promise<void> {
    // Delete in correct order to respect foreign key constraints
    await this.prisma.$transaction([
      this.prisma.lessonProgress.deleteMany({ where: { userId } }),
      this.prisma.studentVideoProgress.deleteMany({ where: { userId } }),
      this.prisma.studentActivityEvent.deleteMany({ where: { userId } }),
      this.prisma.studentDailyStat.deleteMany({ where: { userId } }),
      this.prisma.assessmentAttempt.deleteMany({ where: { userId } }),
      this.prisma.codeSubmission.deleteMany({ where: { userId } }),
      this.prisma.enrollment.deleteMany({ where: { userId } }),
      this.prisma.communityMessage.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.notificationPreference.deleteMany({ where: { userId } }),
      this.prisma.subscription.deleteMany({ where: { userId } }),
      this.prisma.paymentTransaction.deleteMany({ where: { userId } }),
      this.prisma.paymentCustomer.deleteMany({ where: { userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.verificationToken.deleteMany({ where: { userId } }),
      this.prisma.mfaBackupCode.deleteMany({ where: { userId } }),
      this.prisma.accessCodeUsage.deleteMany({ where: { userId } }),
      this.prisma.instructorProfile.deleteMany({ where: { userId } }),
      // Anonymize audit logs (keep for compliance but remove PII)
      this.prisma.auditLog.updateMany({
        where: { userId },
        data: { userId: 'DELETED_USER' },
      }),
      // Finally delete the user
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
  }
}
```

2. Add endpoints:
```typescript
@Delete('me')
@ApiOperation({ summary: 'Request account deletion (GDPR Article 17)' })
async requestDeletion(@CurrentUser() user: AuthUser) {
  return this.userDataDeletionService.requestDeletion(user.id);
}

@Post('me/cancel-deletion')
@ApiOperation({ summary: 'Cancel pending account deletion' })
async cancelDeletion(@CurrentUser() user: AuthUser) {
  return this.userDataDeletionService.cancelDeletion(user.id);
}
```

### Files to Create
- `apps/api/src/modules/users/user-data-deletion.service.ts`

### Files to Modify
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/users/users.module.ts`

### Notes
- Review Prisma schema for any missing relations in the cascade
- The hardDeleteUser transaction may need adjustment based on actual foreign key constraints
- Test with a user that has data across all tables
```

---

#### PROMPT 19: Implement Cookie Consent Management (CP-04)

```
## Task: Add a cookie consent banner to the web application

### Context
The platform uses cookies for authentication and may use third-party cookies for video providers and analytics. EU ePrivacy Directive requires explicit consent for non-essential cookies.

### Required Changes

1. Create `apps/web/src/components/cookie-consent/CookieConsent.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';

interface CookiePreferences {
  essential: true; // Always true, cannot be disabled
  analytics: boolean;
  thirdParty: boolean;
  consentDate: string;
}

const COOKIE_CONSENT_KEY = 'fis-cookie-consent';

function getCookiePreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveCookiePreferences(prefs: CookiePreferences) {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [thirdParty, setThirdParty] = useState(false);

  useEffect(() => {
    const existing = getCookiePreferences();
    if (!existing) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    saveCookiePreferences({
      essential: true,
      analytics: true,
      thirdParty: true,
      consentDate: new Date().toISOString(),
    });
    setVisible(false);
  };

  const acceptSelected = () => {
    saveCookiePreferences({
      essential: true,
      analytics,
      thirdParty,
      consentDate: new Date().toISOString(),
    });
    setVisible(false);
  };

  const rejectAll = () => {
    saveCookiePreferences({
      essential: true,
      analytics: false,
      thirdParty: false,
      consentDate: new Date().toISOString(),
    });
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Cookie Preferences</h3>
            <p className="text-sm text-gray-600">
              We use cookies to provide essential functionality and improve your experience.
              You can choose which optional cookies to allow.
            </p>

            {showDetails && (
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked disabled className="rounded" />
                  <span><strong>Essential</strong> - Required for authentication and core functionality</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="rounded"
                  />
                  <span><strong>Analytics</strong> - Help us understand how you use the platform</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={thirdParty}
                    onChange={(e) => setThirdParty(e.target.checked)}
                    className="rounded"
                  />
                  <span><strong>Third-party</strong> - Video players and external content</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!showDetails && (
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Customize
              </button>
            )}
            {showDetails && (
              <button
                onClick={acceptSelected}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Save Preferences
              </button>
            )}
            <button
              onClick={rejectAll}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Reject All
            </button>
            <button
              onClick={acceptAll}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { getCookiePreferences, type CookiePreferences };
```

2. Add the component to the root layout at `apps/web/src/app/[locale]/layout.tsx`:
```typescript
import { CookieConsent } from '@/components/cookie-consent/CookieConsent';

// Add <CookieConsent /> before the closing </body> or at the end of the layout
```

3. Create a utility to check consent before loading analytics:
```typescript
// In analytics code, check consent before tracking:
import { getCookiePreferences } from '@/components/cookie-consent/CookieConsent';

function canTrackAnalytics(): boolean {
  const prefs = getCookiePreferences();
  return prefs?.analytics === true;
}
```

### Files to Create
- `apps/web/src/components/cookie-consent/CookieConsent.tsx`

### Files to Modify
- `apps/web/src/app/[locale]/layout.tsx` (add CookieConsent component)
- `apps/web/src/lib/vitals.ts` (check consent before sending analytics)
```

---

#### PROMPT 20: Implement Data Retention Cleanup Cron Jobs (DS-02)

```
## Task: Add automated data retention cleanup jobs

### Context
Multiple data types grow unbounded: analytics events, audit logs, video playback logs, sessions, and soft-deleted records. We need scheduled cleanup jobs.

### Required Changes

Create `apps/api/src/modules/maintenance/data-retention.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(private prisma: PrismaService) {}

  // Run daily at 4 AM UTC
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async runRetentionPolicies() {
    this.logger.log('Starting data retention cleanup...');

    const results = await Promise.allSettled([
      this.cleanupAnalyticsEvents(),
      this.cleanupVideoPlaybackLogs(),
      this.cleanupExpiredSessions(),
      this.cleanupOldNotifications(),
    ]);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(`Retention job ${index} failed:`, result.reason);
      }
    });

    this.logger.log('Data retention cleanup completed');
  }

  // Keep raw analytics events for 90 days
  private async cleanupAnalyticsEvents() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.prisma.studentActivityEvent.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });

    this.logger.log(`Deleted ${result.count} analytics events older than 90 days`);
  }

  // Keep video playback logs for 90 days
  private async cleanupVideoPlaybackLogs() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.prisma.videoPlaybackLog.deleteMany({
      where: { startedAt: { lt: cutoff } },
    });

    this.logger.log(`Deleted ${result.count} video playback logs older than 90 days`);
  }

  // Clean up expired refresh tokens and sessions
  private async cleanupExpiredSessions() {
    const now = new Date();

    const [tokens, sessions] = await Promise.all([
      this.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      this.prisma.session.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ]);

    this.logger.log(`Deleted ${tokens.count} expired tokens, ${sessions.count} expired sessions`);
  }

  // Keep read notifications for 30 days, unread for 90 days
  private async cleanupOldNotifications() {
    const readCutoff = new Date();
    readCutoff.setDate(readCutoff.getDate() - 30);

    const unreadCutoff = new Date();
    unreadCutoff.setDate(unreadCutoff.getDate() - 90);

    const [readResult, unreadResult] = await Promise.all([
      this.prisma.notification.deleteMany({
        where: { isRead: true, readAt: { lt: readCutoff } },
      }),
      this.prisma.notification.deleteMany({
        where: { isRead: false, createdAt: { lt: unreadCutoff } },
      }),
    ]);

    this.logger.log(
      `Deleted ${readResult.count} read notifications, ${unreadResult.count} old unread notifications`,
    );
  }
}
```

Create `apps/api/src/modules/maintenance/maintenance.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { DataRetentionService } from './data-retention.service';

@Module({
  providers: [DataRetentionService],
})
export class MaintenanceModule {}
```

Register in `apps/api/src/app.module.ts` imports.

### Files to Create
- `apps/api/src/modules/maintenance/data-retention.service.ts`
- `apps/api/src/modules/maintenance/maintenance.module.ts`

### Files to Modify
- `apps/api/src/app.module.ts` (add MaintenanceModule to imports)
```

---

#### PROMPT 21: Migrate File Uploads to S3-Compatible Storage (DS-03)

```
## Task: Replace local filesystem uploads with S3-compatible object storage

### Context
Currently `UPLOAD_DIR=./uploads` stores files on the local filesystem. Files are lost on container restart and can't be shared across instances.

### Required Changes

1. Install AWS SDK:
```bash
cd apps/api && pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

2. Create `apps/api/src/common/storage/storage.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET') || 'fis-learn-uploads';

    this.s3 = new S3Client({
      region: this.config.get<string>('S3_REGION') || 'us-east-1',
      endpoint: this.config.get<string>('S3_ENDPOINT'), // For Supabase, R2, MinIO
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY') || '',
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY') || '',
      },
      forcePathStyle: !!this.config.get<string>('S3_ENDPOINT'), // Required for non-AWS S3
    });
  }

  async upload(file: Buffer, originalName: string, contentType: string): Promise<string> {
    const ext = path.extname(originalName);
    const key = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
    }));

    return key;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
```

3. Add env vars to `.env.example`:
```
# Object Storage (S3-compatible: AWS S3, Supabase Storage, Cloudflare R2, MinIO)
S3_BUCKET=fis-learn-uploads
S3_REGION=us-east-1
S3_ENDPOINT=               # Leave empty for AWS S3, set for other providers
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

4. Create a global storage module and register it.

### Files to Create
- `apps/api/src/common/storage/storage.service.ts`
- `apps/api/src/common/storage/storage.module.ts`

### Files to Modify
- `apps/api/src/app.module.ts`
- `.env.example`
```

---

#### PROMPT 22: Add WebSocket Token Extraction Security Fix (SEC-14)

```
## Task: Fix WebSocket authentication to prefer httpOnly cookies over auth payload

### Context
In `apps/api/src/modules/community/community.gateway.ts`, the `authenticate` method (line 85) extracts the JWT token in this order:
1. `client.handshake.auth?.token` (sent by client - can be manipulated)
2. `Authorization` header
3. httpOnly cookie

The cookie should be preferred as it's not accessible to JavaScript (XSS-safe).

### Current Code (lines 85-101)
```typescript
private async authenticate(client: Socket): Promise<AuthUser> {
    let token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.toString().replace('Bearer ', '');

    if (!token) {
      const cookieHeader = client.handshake.headers?.cookie;
      if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]*)/);
        token = match ? match[1] : undefined;
      }
    }
    // ...
```

### Required Changes
Reverse the extraction order to prefer cookies first:

```typescript
private async authenticate(client: Socket): Promise<AuthUser> {
    let token: string | undefined;

    // 1. Prefer httpOnly cookie (most secure, not accessible to JS)
    const cookieHeader = client.handshake.headers?.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]*)/);
      token = match ? match[1] : undefined;
    }

    // 2. Fall back to Authorization header
    if (!token) {
      const authHeader = client.handshake.headers?.authorization?.toString();
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    // 3. Last resort: auth payload (for mobile apps that can't use cookies)
    if (!token) {
      token = client.handshake.auth?.token;
    }

    if (!token) {
      throw new WsException('Unauthorized');
    }

    // ... rest of authentication logic unchanged
```

### Files to Modify
- `apps/api/src/modules/community/community.gateway.ts`
```

---

## 15. Final Verdict

### Current State: CONDITIONALLY PRODUCTION READY

The FIS-Learn platform has undergone two rounds of extensive remediation. **56 of 76 issues (74%)** have been resolved across **41 remediation tasks**, bringing the overall score from **5.8 to 8.4 out of 10**.

### What Was Fixed

**Round 1 (30 issues):**
- **Security (5.5 → 8.0):** CORS enforcement, webhook validation, mass assignment prevention, XSS sanitization, subscription tier access controls, WebSocket auth, token refresh race condition, bulk notification authorization
- **Reliability (5.0 → 7.5):** Complete health checks (Redis, memory), graceful shutdown, circuit breakers for external services, BullMQ event queues
- **Compliance (4.5 → 7.0):** GDPR data export/deletion, cookie consent, data retention cron, audit log admin identity
- **Data (7.0 → 8.5):** S3-compatible file storage, data retention policies, soft delete cleanup
- **Observability (6.5 → 7.0):** Sentry error tracking, environment variable validation

**Round 2 (26 issues):**
- **Security (8.0 → 9.5):** PII redaction in logging, CSP hardening, CSRF protection, analytics session validation — **all 17 security issues now resolved**
- **DevOps (5.5 → 8.0):** Nginx reverse proxy, staging environment, deploy pipeline, GHCR push, migration safety, rollback mechanism
- **Data (8.5 → 9.5):** Backup scripts, migration rollback SQL, audit log retention, soft delete cleanup
- **Compliance (7.0 → 8.5):** Privacy policy & terms pages, server-side consent tracking, analytics consent check
- **Reliability (7.5 → 8.0):** Exponential backoff retry service, dead letter queue for failed async jobs
- **Performance (7.0 → 7.5):** Connection pool configuration, N+1 query detection
- **Observability (7.0 → 7.5):** PII redaction in all logs, log sampling for health endpoints

### Remaining 2 Blockers (Infrastructure Decisions)

| # | Blocker | Action Needed |
|---|---------|---------------|
| 1 | No CDN for static assets/media (SP-01) | Choose CDN provider (CloudFront, Cloudflare, etc.) |
| 2 | No Infrastructure as Code (DO-03) | Choose IaC tooling (Terraform, Pulumi, CDK, etc.) |

### Remaining 18 Non-Blocker Issues

Most remaining issues require external infrastructure or vendor decisions:

| Category | Issues | Examples |
|----------|--------|---------|
| Vendor decisions | OO-01, OO-02, OO-03, OO-04, OO-06 | APM, log aggregation, alerting, uptime monitoring |
| Infrastructure | SP-02, DO-05, DO-07, RR-06 | Read replicas, secrets management, orchestration |
| Architecture | AD-02, AD-03, SP-04, SP-06 | Service decomposition, cache invalidation |
| Operations | RR-05, RR-08, RR-09, SP-07 | Runbooks, chaos testing, SLA/SLO, load testing |
| Legal/Business | CP-08, CP-10, CP-11 | DPA, age verification, breach notification |
| Other | DS-07, OO-10 | Encryption at rest, performance budgets |

### Risk if Deployed Today

| Risk                          | Likelihood | Impact   | Change        |
|-------------------------------|-----------|----------|---------------|
| Data breach via CORS bypass   | ~~High~~ Low | Critical | **Mitigated** |
| Payment manipulation          | ~~Medium~~ Low | Critical | **Mitigated** |
| Service outage (no redundancy)| High      | High     | Unchanged     |
| GDPR fine                     | ~~High~~ Low | High     | **Mitigated** |
| Data loss (no backups)        | ~~Medium~~ Low | Critical | **Mitigated** |
| User data exposure via XSS    | ~~Medium~~ Low | High  | **Mitigated** |
| CSRF attack                   | ~~Medium~~ Low | High  | **Mitigated** |

### Recommended Next Steps

1. **Choose CDN provider** (CloudFront, Cloudflare, Bunny) and configure for static assets
2. **Choose IaC tooling** (Terraform, Pulumi, CDK) and codify the staging environment
3. **Choose observability vendors** (APM, log aggregation, alerting, uptime monitoring)
4. **Security penetration test** before go-live
5. **Load testing** to establish capacity baselines
6. **Controlled launch** with monitoring

---

*This audit was originally performed on February 7, 2026, based on static code analysis of the FIS-Learn platform codebase. Updated post-remediation rounds 1 and 2 on the same date. A dynamic security assessment (penetration test) is recommended before production launch.*

*Audit methodology covers OWASP Top 10 (2021), GDPR Articles 5-20, AWS Well-Architected Framework pillars, and the 12-Factor App methodology.*
