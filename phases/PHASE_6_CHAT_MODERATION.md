# Phase 6: Real-Time Chat System - Moderation & Compliance

## Executive Summary

This phase defines the moderation tools, role-based access control, audit logging, and data privacy compliance for the real-time chat system, ensuring a safe learning environment while meeting regulatory requirements.

---

## 1. Moderation Tools

### 1.1 Moderation Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        MODERATION SYSTEM ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  INCOMING MESSAGE                                                               │
│       │                                                                          │
│       ▼                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    PRE-MODERATION PIPELINE                               │    │
│  │                                                                          │    │
│  │   ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐ │    │
│  │   │ Profanity  │───>│   Spam     │───>│   Link     │───>│    AI      │ │    │
│  │   │  Filter    │    │ Detection  │    │ Validator  │    │ Toxicity   │ │    │
│  │   │            │    │            │    │            │    │ (Optional) │ │    │
│  │   └────────────┘    └────────────┘    └────────────┘    └────────────┘ │    │
│  │         │                 │                 │                 │        │    │
│  │         ▼                 ▼                 ▼                 ▼        │    │
│  │   ┌─────────────────────────────────────────────────────────────────┐ │    │
│  │   │                    MODERATION DECISION                          │ │    │
│  │   │                                                                 │ │    │
│  │   │   ALLOW ─────────> Message proceeds to delivery                │ │    │
│  │   │   BLOCK ─────────> Message rejected, user notified             │ │    │
│  │   │   FLAG ──────────> Message delivered + flagged for review      │ │    │
│  │   │   SHADOW_BAN ───> Message appears sent, not delivered          │ │    │
│  │   │                                                                 │ │    │
│  │   └─────────────────────────────────────────────────────────────────┘ │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  POST-MODERATION (Async)                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                          │    │
│  │   ┌────────────┐    ┌────────────┐    ┌────────────┐                   │    │
│  │   │  Pattern   │    │   User     │    │  Alert     │                   │    │
│  │   │  Analysis  │    │  Scoring   │    │ Generation │                   │    │
│  │   │            │    │            │    │            │                   │    │
│  │   │ • Repeated │    │ • Trust    │    │ • Notify   │                   │    │
│  │   │   offenses │    │   score    │    │   mods     │                   │    │
│  │   │ • Behavior │    │ • Risk     │    │ • Escalate │                   │    │
│  │   │   trends   │    │   level    │    │   severe   │                   │    │
│  │   └────────────┘    └────────────┘    └────────────┘                   │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  MODERATOR DASHBOARD                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                          │    │
│  │   ┌────────────────────────────────────────────────────────────────┐    │    │
│  │   │  Flagged Messages Queue                                        │    │    │
│  │   │  • Message content + context                                   │    │    │
│  │   │  • User history summary                                        │    │    │
│  │   │  • Quick actions: Approve / Delete / Warn / Ban               │    │    │
│  │   └────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                          │    │
│  │   ┌────────────────────────────────────────────────────────────────┐    │    │
│  │   │  User Reports Queue                                            │    │    │
│  │   │  • Reporter info                                               │    │    │
│  │   │  • Reported content                                            │    │    │
│  │   │  • Actions: Dismiss / Action + Feedback                       │    │    │
│  │   └────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                          │    │
│  │   ┌────────────────────────────────────────────────────────────────┐    │    │
│  │   │  Moderation Analytics                                          │    │    │
│  │   │  • Actions taken per day                                       │    │    │
│  │   │  • Common violation types                                      │    │    │
│  │   │  • Response times                                              │    │    │
│  │   └────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Content Filtering Implementation

```typescript
// Moderation service with multiple filters
class ModerationService {
  private profanityFilter: ProfanityFilter;
  private spamDetector: SpamDetector;
  private linkValidator: LinkValidator;
  private toxicityDetector: ToxicityDetector;

  async moderate(request: ModerationRequest): Promise<ModerationResult> {
    const results: FilterResult[] = [];
    const startTime = Date.now();

    // Run filters in parallel for speed
    const [profanity, spam, links, toxicity] = await Promise.all([
      this.profanityFilter.check(request.content),
      this.spamDetector.check(request),
      this.linkValidator.check(request.content),
      this.toxicityDetector.check(request.content),
    ]);

    results.push(profanity, spam, links, toxicity);

    // Aggregate results
    const decision = this.aggregateDecision(results);

    // Log moderation event
    await this.logModerationEvent({
      messageId: request.messageId,
      userId: request.userId,
      channelId: request.channelId,
      decision,
      filters: results,
      processingTimeMs: Date.now() - startTime,
    });

    // Update user trust score if needed
    if (decision.action !== 'allow') {
      await this.updateUserTrustScore(request.userId, decision);
    }

    return decision;
  }

  private aggregateDecision(results: FilterResult[]): ModerationResult {
    // Priority: block > flag > allow
    const blocked = results.find(r => r.action === 'block');
    if (blocked) {
      return {
        action: 'block',
        reason: blocked.reason,
        filter: blocked.filter,
        confidence: blocked.confidence,
      };
    }

    const flagged = results.find(r => r.action === 'flag');
    if (flagged) {
      return {
        action: 'flag',
        reason: flagged.reason,
        filter: flagged.filter,
        confidence: flagged.confidence,
      };
    }

    return { action: 'allow' };
  }
}

// Profanity filter with context awareness
class ProfanityFilter {
  private blocklist: Set<string>;
  private contextualRules: ContextualRule[];

  constructor() {
    this.blocklist = new Set(PROFANITY_LIST);
    this.contextualRules = CONTEXTUAL_RULES;
  }

  async check(content: string): Promise<FilterResult> {
    const normalizedContent = this.normalize(content);

    // Direct match check
    const directMatches = this.findDirectMatches(normalizedContent);
    if (directMatches.length > 0) {
      return {
        filter: 'profanity',
        action: 'block',
        reason: 'Profanity detected',
        confidence: 1.0,
        matches: directMatches,
      };
    }

    // Obfuscation detection (l33t speak, etc.)
    const obfuscatedMatches = this.detectObfuscation(normalizedContent);
    if (obfuscatedMatches.length > 0) {
      return {
        filter: 'profanity',
        action: 'flag',
        reason: 'Possible obfuscated profanity',
        confidence: 0.7,
        matches: obfuscatedMatches,
      };
    }

    return { filter: 'profanity', action: 'allow' };
  }

  private normalize(content: string): string {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')  // Remove punctuation
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }

  private findDirectMatches(content: string): string[] {
    const words = content.split(' ');
    return words.filter(word => this.blocklist.has(word));
  }

  private detectObfuscation(content: string): string[] {
    const matches: string[] = [];

    // Common substitutions: a=4, e=3, i=1, o=0, etc.
    const deobfuscated = content
      .replace(/4/g, 'a')
      .replace(/3/g, 'e')
      .replace(/1/g, 'i')
      .replace(/0/g, 'o')
      .replace(/@/g, 'a')
      .replace(/\$/g, 's');

    const words = deobfuscated.split(' ');
    for (const word of words) {
      if (this.blocklist.has(word)) {
        matches.push(word);
      }
    }

    return matches;
  }
}

// Spam detection
class SpamDetector {
  private redis: Redis;

  async check(request: ModerationRequest): Promise<FilterResult> {
    const checks = await Promise.all([
      this.checkRepetition(request),
      this.checkMessageRate(request),
      this.checkSimilarity(request),
      this.checkPatterns(request.content),
    ]);

    const spamScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;

    if (spamScore > 0.8) {
      return {
        filter: 'spam',
        action: 'block',
        reason: 'Spam detected',
        confidence: spamScore,
      };
    }

    if (spamScore > 0.5) {
      return {
        filter: 'spam',
        action: 'flag',
        reason: 'Possible spam',
        confidence: spamScore,
      };
    }

    return { filter: 'spam', action: 'allow', confidence: spamScore };
  }

  private async checkRepetition(request: ModerationRequest): Promise<SpamCheck> {
    // Check if user is repeating the same message
    const key = `spam:repetition:${request.userId}:${this.hashContent(request.content)}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 300); // 5 minute window

    return {
      check: 'repetition',
      score: Math.min(count / 3, 1), // 3+ repetitions = spam
    };
  }

  private async checkMessageRate(request: ModerationRequest): Promise<SpamCheck> {
    // Check message frequency
    const key = `spam:rate:${request.userId}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 60);

    return {
      check: 'rate',
      score: Math.min(count / 30, 1), // 30+ messages/min = spam
    };
  }

  private async checkSimilarity(request: ModerationRequest): Promise<SpamCheck> {
    // Compare with user's recent messages
    const recentKey = `spam:recent:${request.userId}`;
    const recentMessages = await this.redis.lrange(recentKey, 0, 9);

    let maxSimilarity = 0;
    for (const recent of recentMessages) {
      const similarity = this.calculateSimilarity(request.content, recent);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    // Store current message
    await this.redis.lpush(recentKey, request.content);
    await this.redis.ltrim(recentKey, 0, 9);
    await this.redis.expire(recentKey, 300);

    return {
      check: 'similarity',
      score: maxSimilarity > 0.9 ? 1 : maxSimilarity,
    };
  }

  private checkPatterns(content: string): SpamCheck {
    const spamPatterns = [
      /(.)\1{5,}/,                    // Repeated characters
      /https?:\/\/\S+.*https?:\/\S+/, // Multiple links
      /\b(buy|sale|discount|free)\b/i, // Commercial spam
      /\b(click here|act now)\b/i,     // Call to action spam
    ];

    let score = 0;
    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        score += 0.3;
      }
    }

    return {
      check: 'patterns',
      score: Math.min(score, 1),
    };
  }

  private calculateSimilarity(a: string, b: string): number {
    // Jaccard similarity on word sets
    const setA = new Set(a.toLowerCase().split(/\s+/));
    const setB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }

  private hashContent(content: string): string {
    return crypto.createHash('md5').update(content.toLowerCase()).digest('hex').slice(0, 8);
  }
}

// Link validation
class LinkValidator {
  private allowedDomains: Set<string>;
  private blockedDomains: Set<string>;

  async check(content: string): Promise<FilterResult> {
    const urls = this.extractUrls(content);

    if (urls.length === 0) {
      return { filter: 'links', action: 'allow' };
    }

    for (const url of urls) {
      const domain = this.extractDomain(url);

      // Check blocked domains
      if (this.blockedDomains.has(domain)) {
        return {
          filter: 'links',
          action: 'block',
          reason: 'Blocked domain',
          confidence: 1.0,
        };
      }

      // Check for URL shorteners (potential for hiding malicious links)
      if (this.isUrlShortener(domain)) {
        return {
          filter: 'links',
          action: 'flag',
          reason: 'URL shortener detected',
          confidence: 0.6,
        };
      }
    }

    // Check for excessive links
    if (urls.length > 3) {
      return {
        filter: 'links',
        action: 'flag',
        reason: 'Multiple links detected',
        confidence: 0.5,
      };
    }

    return { filter: 'links', action: 'allow' };
  }

  private extractUrls(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return content.match(urlRegex) || [];
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  private isUrlShortener(domain: string): boolean {
    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly'];
    return shorteners.some(s => domain.includes(s));
  }
}
```

### 1.3 User Reporting System

```typescript
// Report handling system
interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  messageId?: string;
  channelId: string;
  reason: ReportReason;
  description?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: ReportResolution;
}

enum ReportReason {
  HARASSMENT = 'harassment',
  SPAM = 'spam',
  HATE_SPEECH = 'hate_speech',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  IMPERSONATION = 'impersonation',
  THREATS = 'threats',
  OTHER = 'other',
}

class ReportService {
  private db: Database;
  private notificationService: NotificationService;

  async createReport(data: CreateReportInput): Promise<Report> {
    // Validate reporter can report
    await this.validateReporter(data.reporterId);

    // Check for duplicate reports
    const existing = await this.findDuplicateReport(data);
    if (existing) {
      throw new DuplicateReportError('You have already reported this content');
    }

    // Create report
    const report = await this.db.reports.create({
      id: generateUUID(),
      ...data,
      status: 'pending',
      createdAt: new Date(),
    });

    // Auto-escalate severe reports
    if (this.isSevereReport(data.reason)) {
      await this.escalateReport(report);
    }

    // Notify moderators
    await this.notificationService.notifyModerators({
      type: 'new_report',
      reportId: report.id,
      channelId: data.channelId,
      severity: this.isSevereReport(data.reason) ? 'high' : 'normal',
    });

    // Log for audit
    await this.auditLog.log({
      action: 'report_created',
      actorId: data.reporterId,
      targetId: data.reportedUserId,
      metadata: { reportId: report.id, reason: data.reason },
    });

    return report;
  }

  async resolveReport(
    reportId: string,
    moderatorId: string,
    resolution: ReportResolution
  ): Promise<Report> {
    const report = await this.db.reports.findById(reportId);
    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Apply resolution actions
    await this.applyResolutionActions(report, resolution);

    // Update report status
    const updated = await this.db.reports.update(reportId, {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: moderatorId,
      resolution,
    });

    // Notify reporter of outcome (if configured)
    if (resolution.notifyReporter) {
      await this.notificationService.notifyUser(report.reporterId, {
        type: 'report_resolved',
        message: `Your report has been reviewed. ${resolution.feedbackMessage || ''}`,
      });
    }

    // Log for audit
    await this.auditLog.log({
      action: 'report_resolved',
      actorId: moderatorId,
      targetId: report.reportedUserId,
      metadata: { reportId, resolution },
    });

    return updated;
  }

  private async applyResolutionActions(
    report: Report,
    resolution: ReportResolution
  ) {
    for (const action of resolution.actions) {
      switch (action.type) {
        case 'delete_message':
          await this.messageService.delete(report.messageId!, {
            reason: 'moderation',
            moderatorId: resolution.moderatorId,
          });
          break;

        case 'warn_user':
          await this.userService.warn(report.reportedUserId, {
            reason: report.reason,
            message: action.message,
          });
          break;

        case 'mute_user':
          await this.userService.mute(report.reportedUserId, {
            channelId: report.channelId,
            duration: action.duration,
            reason: report.reason,
          });
          break;

        case 'ban_user':
          await this.userService.ban(report.reportedUserId, {
            channelId: action.global ? undefined : report.channelId,
            duration: action.duration,
            reason: report.reason,
          });
          break;
      }
    }
  }

  private isSevereReport(reason: ReportReason): boolean {
    return [
      ReportReason.HATE_SPEECH,
      ReportReason.THREATS,
      ReportReason.HARASSMENT,
    ].includes(reason);
  }
}
```

### 1.4 Moderator Dashboard API

```typescript
// Moderator dashboard endpoints
class ModeratorController {
  // Get pending reports
  @Get('/moderation/reports')
  @RequireRole(['moderator', 'admin'])
  async getReports(
    @Query('status') status: string = 'pending',
    @Query('channelId') channelId?: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ): Promise<PaginatedResponse<Report>> {
    return this.reportService.list({
      status,
      channelId,
      limit,
      offset,
    });
  }

  // Get flagged messages
  @Get('/moderation/flagged')
  @RequireRole(['moderator', 'admin'])
  async getFlaggedMessages(
    @Query('channelId') channelId?: string,
    @Query('limit') limit: number = 20,
  ): Promise<FlaggedMessage[]> {
    return this.moderationService.getFlaggedMessages({
      channelId,
      limit,
    });
  }

  // Take action on user
  @Post('/moderation/users/:userId/action')
  @RequireRole(['moderator', 'admin'])
  async takeAction(
    @Param('userId') userId: string,
    @Body() action: ModerationAction,
    @CurrentUser() moderator: User,
  ): Promise<ActionResult> {
    // Validate moderator can take this action
    await this.validateModeratorPermission(moderator, action);

    // Execute action
    const result = await this.userService.executeAction(userId, action);

    // Audit log
    await this.auditLog.log({
      action: `user_${action.type}`,
      actorId: moderator.id,
      targetId: userId,
      metadata: action,
    });

    return result;
  }

  // Get moderation statistics
  @Get('/moderation/stats')
  @RequireRole(['admin'])
  async getStats(
    @Query('period') period: 'day' | 'week' | 'month' = 'week',
  ): Promise<ModerationStats> {
    return this.moderationService.getStats(period);
  }

  // Get user moderation history
  @Get('/moderation/users/:userId/history')
  @RequireRole(['moderator', 'admin'])
  async getUserHistory(
    @Param('userId') userId: string,
  ): Promise<UserModerationHistory> {
    return this.moderationService.getUserHistory(userId);
  }
}

// Moderation statistics
interface ModerationStats {
  period: string;
  reports: {
    total: number;
    pending: number;
    resolved: number;
    byReason: Record<ReportReason, number>;
    avgResolutionTimeMinutes: number;
  };
  actions: {
    warnings: number;
    mutes: number;
    bans: number;
    deletedMessages: number;
  };
  autoModeration: {
    blocked: number;
    flagged: number;
    allowed: number;
    falsePositiveRate: number;
  };
}
```

---

## 2. Role-Based Access Control

### 2.1 Permission Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ROLE PERMISSION MATRIX                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ROLE HIERARCHY:                                                                │
│                                                                                  │
│     Platform Admin                                                              │
│          │                                                                       │
│          ▼                                                                       │
│     Course Instructor                                                           │
│          │                                                                       │
│          ▼                                                                       │
│     Channel Moderator                                                           │
│          │                                                                       │
│          ▼                                                                       │
│     Subscriber (Paid)                                                           │
│          │                                                                       │
│          ▼                                                                       │
│     Free User (Limited)                                                         │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                         PERMISSION DETAILS                                  │ │
│  ├───────────────────┬────────┬────────┬───────┬────────┬──────┬────────────┤ │
│  │ Permission        │ Admin  │Instruct│ Mod   │ Subscr │ Free │   Notes    │ │
│  ├───────────────────┼────────┼────────┼───────┼────────┼──────┼────────────┤ │
│  │ CHANNEL ACCESS                                                             │ │
│  ├───────────────────┼────────┼────────┼───────┼────────┼──────┼────────────┤ │
│  │ View channels     │   ✅   │   ✅   │  ✅   │   ✅   │  ⚠️  │ Free: limit│ │
│  │ Join channels     │   ✅   │   ✅   │  ✅   │   ✅   │  ⚠️  │ Free: limit│ │
│  │ Create channels   │   ✅   │   ✅   │  ❌   │   ❌   │  ❌  │            │ │
│  │ Delete channels   │   ✅   │   ✅   │  ❌   │   ❌   │  ❌  │ Own course │ │
│  │ Archive channels  │   ✅   │   ✅   │  ✅   │   ❌   │  ❌  │            │ │
│  ├───────────────────┼────────┼────────┼───────┼────────┼──────┼────────────┤ │
│  │ MESSAGING                                                                  │ │
│  ├───────────────────┼────────┼────────┼───────┼────────┼──────┼────────────┤ │
│  │ Send messages     │   ✅   │   ✅   │  ✅   │   ✅   │  ⚠️  │ Rate limit │ │
│  │ Edit own messages │   ✅   │   ✅   │  ✅   │   ✅   │  ✅  │ 15 min     │ │
│  │ Delete own msgs   │   ✅   │   ✅   │  ✅   │   ✅   │  ✅  │            │ │
│  │ Delete any msg    │   ✅   │   ✅   │  ✅   │   ❌   │  ❌  │            │ │
│  │ Pin messages      │   ✅   │   ✅   │  ✅   │   ❌   │  ❌  │            │ │
│  │ Send files        │   ✅   │   ✅   │  ✅   │   ✅   │  ❌  │            │ │
│  │ Send code blocks  │   ✅   │   ✅   │  ✅   │   ✅   │  ✅  │            │ │
│  │ @everyone mention │   ✅   │   ✅   │  ✅   │   ❌   │  ❌  │            │ │
│  ├───────────────────┼────────┼────────┼───────┼────────┼──────┼────────────┤ │
│  │ DIRECT MESSAGES                                                            │ │
│  ├───────────────────┼────────┼────────┼───────┼────────┼──────┼────────────┤ │
│  │ Send DMs          │   ✅   │   ✅   │  ✅   │   ✅   │  ❌  │            │ │
│  │ DM to instructor  │   ✅   │   ✅   │  ✅   │   ✅   │  ❌  │            │ │
│  ├───────────────────┼────────┼────────┼───────┼────────┼──────┼────────────┤ │
│  │ MODERATION                                                                 │ │
│  ├───────────────────┼────────┼────────┼───────┼────────┼──────┼────────────┤ │
│  │ View reports      │   ✅   │   ✅   │  ✅   │   ❌   │  ❌  │            │ │
│  │ Resolve reports   │   ✅   │   ✅   │  ✅   │   ❌   │  ❌  │            │ │
│  │ Warn users        │   ✅   │   ✅   │  ✅   │   ❌   │  ❌  │            │ │
│  │ Mute users        │   ✅   │   ✅   │  ✅   │   ❌   │  ❌  │ Channel    │ │
│  │ Ban users         │   ✅   │   ✅   │  ⚠️   │   ❌   │  ❌  │ Mod: temp  │ │
│  │ Unban users       │   ✅   │   ✅   │  ❌   │   ❌   │  ❌  │            │ │
│  │ Set slow mode     │   ✅   │   ✅   │  ✅   │   ❌   │  ❌  │            │ │
│  ├───────────────────┼────────┼────────┼───────┼────────┼──────┼────────────┤ │
│  │ ADMINISTRATION                                                             │ │
│  ├───────────────────┼────────┼────────┼───────┼────────┼──────┼────────────┤ │
│  │ Manage roles      │   ✅   │   ✅   │  ❌   │   ❌   │  ❌  │ Own course │ │
│  │ View audit logs   │   ✅   │   ✅   │  ⚠️   │   ❌   │  ❌  │ Mod: limit │ │
│  │ Export data       │   ✅   │   ✅   │  ❌   │   ❌   │  ❌  │            │ │
│  │ Platform settings │   ✅   │   ❌   │  ❌   │   ❌   │  ❌  │            │ │
│  └───────────────────┴────────┴────────┴───────┴────────┴──────┴────────────┘ │
│                                                                                  │
│  Legend: ✅ = Full access | ⚠️ = Limited/Conditional | ❌ = No access           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 RBAC Implementation

```typescript
// Permission definitions
enum Permission {
  // Channel permissions
  CHANNEL_VIEW = 'channel:view',
  CHANNEL_JOIN = 'channel:join',
  CHANNEL_CREATE = 'channel:create',
  CHANNEL_DELETE = 'channel:delete',
  CHANNEL_ARCHIVE = 'channel:archive',
  CHANNEL_SETTINGS = 'channel:settings',

  // Message permissions
  MESSAGE_SEND = 'message:send',
  MESSAGE_EDIT_OWN = 'message:edit:own',
  MESSAGE_DELETE_OWN = 'message:delete:own',
  MESSAGE_DELETE_ANY = 'message:delete:any',
  MESSAGE_PIN = 'message:pin',
  MESSAGE_FILE = 'message:file',
  MESSAGE_MENTION_ALL = 'message:mention:all',

  // Direct message permissions
  DM_SEND = 'dm:send',
  DM_INSTRUCTOR = 'dm:instructor',

  // Moderation permissions
  MODERATION_VIEW_REPORTS = 'moderation:reports:view',
  MODERATION_RESOLVE_REPORTS = 'moderation:reports:resolve',
  MODERATION_WARN = 'moderation:warn',
  MODERATION_MUTE = 'moderation:mute',
  MODERATION_BAN = 'moderation:ban',
  MODERATION_UNBAN = 'moderation:unban',
  MODERATION_SLOW_MODE = 'moderation:slowmode',

  // Admin permissions
  ADMIN_ROLES = 'admin:roles',
  ADMIN_AUDIT_LOGS = 'admin:auditlogs',
  ADMIN_EXPORT = 'admin:export',
  ADMIN_SETTINGS = 'admin:settings',
}

// Role definitions
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: Object.values(Permission), // All permissions

  instructor: [
    // Channel
    Permission.CHANNEL_VIEW,
    Permission.CHANNEL_JOIN,
    Permission.CHANNEL_CREATE,
    Permission.CHANNEL_DELETE,
    Permission.CHANNEL_ARCHIVE,
    Permission.CHANNEL_SETTINGS,

    // Messages
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_EDIT_OWN,
    Permission.MESSAGE_DELETE_OWN,
    Permission.MESSAGE_DELETE_ANY,
    Permission.MESSAGE_PIN,
    Permission.MESSAGE_FILE,
    Permission.MESSAGE_MENTION_ALL,

    // DM
    Permission.DM_SEND,
    Permission.DM_INSTRUCTOR,

    // Moderation
    Permission.MODERATION_VIEW_REPORTS,
    Permission.MODERATION_RESOLVE_REPORTS,
    Permission.MODERATION_WARN,
    Permission.MODERATION_MUTE,
    Permission.MODERATION_BAN,
    Permission.MODERATION_UNBAN,
    Permission.MODERATION_SLOW_MODE,

    // Admin (limited)
    Permission.ADMIN_ROLES,
    Permission.ADMIN_AUDIT_LOGS,
    Permission.ADMIN_EXPORT,
  ],

  moderator: [
    Permission.CHANNEL_VIEW,
    Permission.CHANNEL_JOIN,
    Permission.CHANNEL_ARCHIVE,

    Permission.MESSAGE_SEND,
    Permission.MESSAGE_EDIT_OWN,
    Permission.MESSAGE_DELETE_OWN,
    Permission.MESSAGE_DELETE_ANY,
    Permission.MESSAGE_PIN,
    Permission.MESSAGE_FILE,
    Permission.MESSAGE_MENTION_ALL,

    Permission.DM_SEND,
    Permission.DM_INSTRUCTOR,

    Permission.MODERATION_VIEW_REPORTS,
    Permission.MODERATION_RESOLVE_REPORTS,
    Permission.MODERATION_WARN,
    Permission.MODERATION_MUTE,
    Permission.MODERATION_SLOW_MODE,
  ],

  subscriber: [
    Permission.CHANNEL_VIEW,
    Permission.CHANNEL_JOIN,

    Permission.MESSAGE_SEND,
    Permission.MESSAGE_EDIT_OWN,
    Permission.MESSAGE_DELETE_OWN,
    Permission.MESSAGE_FILE,

    Permission.DM_SEND,
    Permission.DM_INSTRUCTOR,
  ],

  free_user: [
    Permission.CHANNEL_VIEW,
    Permission.CHANNEL_JOIN,

    Permission.MESSAGE_SEND,
    Permission.MESSAGE_EDIT_OWN,
    Permission.MESSAGE_DELETE_OWN,
  ],
};

// Permission checker
class PermissionService {
  async hasPermission(
    userId: string,
    permission: Permission,
    context?: PermissionContext
  ): Promise<boolean> {
    // Get user's role
    const user = await this.userService.getById(userId);
    const basePermissions = ROLE_PERMISSIONS[user.role] || [];

    // Check base permissions
    if (!basePermissions.includes(permission)) {
      return false;
    }

    // Check context-specific permissions
    if (context?.channelId) {
      const channelRole = await this.getChannelRole(userId, context.channelId);
      if (channelRole) {
        const channelPermissions = ROLE_PERMISSIONS[channelRole] || [];
        if (!channelPermissions.includes(permission)) {
          return false;
        }
      }

      // Check if user is channel member
      const isMember = await this.isChannelMember(userId, context.channelId);
      if (!isMember && permission !== Permission.CHANNEL_JOIN) {
        return false;
      }
    }

    // Check subscription status for certain permissions
    if (this.requiresSubscription(permission)) {
      const hasSubscription = await this.subscriptionService.isActive(userId);
      if (!hasSubscription && user.role === 'free_user') {
        return false;
      }
    }

    return true;
  }

  private requiresSubscription(permission: Permission): boolean {
    return [
      Permission.MESSAGE_FILE,
      Permission.DM_SEND,
      Permission.DM_INSTRUCTOR,
    ].includes(permission);
  }
}

// Permission middleware for API routes
function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const context: PermissionContext = {
      channelId: req.params.channelId || req.body.channelId,
      messageId: req.params.messageId,
    };

    const hasPermission = await permissionService.hasPermission(
      userId,
      permission,
      context
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing permission: ${permission}`,
      });
    }

    next();
  };
}

// Usage in routes
router.post(
  '/channels/:channelId/messages',
  requirePermission(Permission.MESSAGE_SEND),
  messageController.create
);

router.delete(
  '/messages/:messageId',
  requirePermission(Permission.MESSAGE_DELETE_ANY),
  messageController.delete
);
```

### 2.3 Channel-Level Permission Overrides

```typescript
// Channel-specific permission overrides
interface ChannelPermissionOverride {
  channelId: string;
  roleOrUserId: string;
  type: 'role' | 'user';
  permission: Permission;
  allow: boolean;
}

class ChannelPermissionService {
  async setOverride(override: ChannelPermissionOverride): Promise<void> {
    await this.db.channelPermissions.upsert({
      channelId: override.channelId,
      roleOrUserId: override.roleOrUserId,
      type: override.type,
      permission: override.permission,
      allow: override.allow,
    });

    // Invalidate cache
    await this.invalidateCache(override.channelId);
  }

  async checkChannelPermission(
    userId: string,
    channelId: string,
    permission: Permission
  ): Promise<boolean> {
    // Check user-specific override first
    const userOverride = await this.getOverride(channelId, userId, 'user');
    if (userOverride !== null) {
      return userOverride;
    }

    // Get user's channel role
    const membership = await this.getChannelMembership(userId, channelId);
    if (!membership) {
      return false;
    }

    // Check role override
    const roleOverride = await this.getOverride(channelId, membership.role, 'role');
    if (roleOverride !== null) {
      return roleOverride;
    }

    // Fall back to default role permissions
    return ROLE_PERMISSIONS[membership.role]?.includes(permission) ?? false;
  }

  private async getOverride(
    channelId: string,
    roleOrUserId: string,
    type: 'role' | 'user'
  ): Promise<boolean | null> {
    const override = await this.db.channelPermissions.findOne({
      channelId,
      roleOrUserId,
      type,
    });

    return override?.allow ?? null;
  }
}
```

---

## 3. Audit Logging

### 3.1 Audit Log Schema

```sql
-- Comprehensive audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What happened
    action VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'moderation', 'access', 'content', 'admin'

    -- Who did it
    actor_id UUID REFERENCES chat_users(id),
    actor_type VARCHAR(20) NOT NULL, -- 'user', 'system', 'admin'
    actor_ip INET,
    actor_user_agent TEXT,

    -- What was affected
    target_type VARCHAR(50), -- 'user', 'message', 'channel', 'report'
    target_id UUID,

    -- Context
    channel_id UUID REFERENCES channels(id),
    course_id UUID REFERENCES courses(id),

    -- Details
    metadata JSONB DEFAULT '{}',
    old_value JSONB,
    new_value JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Retention
    retention_days INTEGER DEFAULT 365
);

-- Indexes for common queries
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id, created_at DESC);
CREATE INDEX idx_audit_logs_channel ON audit_logs(channel_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_category ON audit_logs(category, created_at DESC);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Partitioning for large scale (by month)
CREATE TABLE audit_logs_partitioned (
    LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 3.2 Audit Events

```typescript
// Audit event definitions
const AUDIT_EVENTS = {
  // Access events
  'access.login': { category: 'access', retention: 90 },
  'access.logout': { category: 'access', retention: 90 },
  'access.token_refresh': { category: 'access', retention: 30 },
  'access.channel_join': { category: 'access', retention: 90 },
  'access.channel_leave': { category: 'access', retention: 90 },

  // Content events
  'content.message_send': { category: 'content', retention: 365 },
  'content.message_edit': { category: 'content', retention: 365 },
  'content.message_delete': { category: 'content', retention: 365 },
  'content.file_upload': { category: 'content', retention: 365 },

  // Moderation events
  'moderation.report_create': { category: 'moderation', retention: 730 },
  'moderation.report_resolve': { category: 'moderation', retention: 730 },
  'moderation.user_warn': { category: 'moderation', retention: 730 },
  'moderation.user_mute': { category: 'moderation', retention: 730 },
  'moderation.user_unmute': { category: 'moderation', retention: 730 },
  'moderation.user_ban': { category: 'moderation', retention: 730 },
  'moderation.user_unban': { category: 'moderation', retention: 730 },
  'moderation.message_flag': { category: 'moderation', retention: 730 },
  'moderation.auto_block': { category: 'moderation', retention: 730 },

  // Admin events
  'admin.role_change': { category: 'admin', retention: 730 },
  'admin.permission_change': { category: 'admin', retention: 730 },
  'admin.channel_create': { category: 'admin', retention: 730 },
  'admin.channel_delete': { category: 'admin', retention: 730 },
  'admin.settings_change': { category: 'admin', retention: 730 },
  'admin.data_export': { category: 'admin', retention: 730 },
  'admin.data_delete': { category: 'admin', retention: 730 },
};

// Audit logger
class AuditLogger {
  private db: Database;
  private queue: Queue;

  async log(event: AuditEvent): Promise<void> {
    const eventConfig = AUDIT_EVENTS[event.action];
    if (!eventConfig) {
      console.warn(`Unknown audit event: ${event.action}`);
      return;
    }

    const logEntry = {
      id: generateUUID(),
      action: event.action,
      category: eventConfig.category,
      actorId: event.actorId,
      actorType: event.actorType || 'user',
      actorIp: event.actorIp,
      actorUserAgent: event.actorUserAgent,
      targetType: event.targetType,
      targetId: event.targetId,
      channelId: event.channelId,
      courseId: event.courseId,
      metadata: event.metadata || {},
      oldValue: event.oldValue,
      newValue: event.newValue,
      createdAt: new Date(),
      retentionDays: eventConfig.retention,
    };

    // Async write for performance
    await this.queue.add('audit_log', logEntry);
  }

  // Batch processor
  async processLogBatch(logs: AuditLogEntry[]): Promise<void> {
    await this.db.auditLogs.insertMany(logs);
  }

  // Query interface for moderators/admins
  async query(filters: AuditQueryFilters): Promise<PaginatedResult<AuditLogEntry>> {
    const query = this.db.auditLogs
      .where(filters.category ? { category: filters.category } : {})
      .where(filters.action ? { action: filters.action } : {})
      .where(filters.actorId ? { actorId: filters.actorId } : {})
      .where(filters.targetId ? { targetId: filters.targetId } : {})
      .where(filters.channelId ? { channelId: filters.channelId } : {})
      .where(filters.startDate ? { createdAt: { $gte: filters.startDate } } : {})
      .where(filters.endDate ? { createdAt: { $lte: filters.endDate } } : {})
      .orderBy('createdAt', 'desc')
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    const [results, total] = await Promise.all([
      query.execute(),
      query.count(),
    ]);

    return {
      data: results,
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }
}
```

### 3.3 Audit Trail for Moderation

```typescript
// Detailed moderation audit trail
class ModerationAuditService {
  async logModerationAction(action: ModerationActionLog): Promise<void> {
    await this.auditLogger.log({
      action: `moderation.${action.type}`,
      actorId: action.moderatorId,
      actorType: 'admin',
      targetType: 'user',
      targetId: action.targetUserId,
      channelId: action.channelId,
      metadata: {
        reason: action.reason,
        duration: action.duration,
        relatedReportId: action.reportId,
        relatedMessageIds: action.messageIds,
        notes: action.notes,
      },
    });

    // Also store in moderation history for quick access
    await this.db.moderationHistory.insert({
      moderatorId: action.moderatorId,
      targetUserId: action.targetUserId,
      actionType: action.type,
      channelId: action.channelId,
      reason: action.reason,
      duration: action.duration,
      expiresAt: action.duration ? new Date(Date.now() + action.duration * 1000) : null,
      createdAt: new Date(),
    });
  }

  async getUserModerationHistory(userId: string): Promise<ModerationHistoryEntry[]> {
    return this.db.moderationHistory
      .where({ targetUserId: userId })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .execute();
  }

  async getModeratorActionHistory(
    moderatorId: string,
    period: 'day' | 'week' | 'month'
  ): Promise<ModeratorStats> {
    const startDate = this.getPeriodStart(period);

    const actions = await this.db.moderationHistory
      .where({ moderatorId })
      .where({ createdAt: { $gte: startDate } })
      .execute();

    return {
      moderatorId,
      period,
      totalActions: actions.length,
      byType: this.groupBy(actions, 'actionType'),
      avgResponseTime: await this.calculateAvgResponseTime(moderatorId, startDate),
    };
  }
}
```

---

## 4. Data Privacy (GDPR-Style)

### 4.1 Privacy Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        DATA PRIVACY ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  DATA CLASSIFICATION                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐              │   │
│  │   │   PUBLIC    │     │  INTERNAL   │     │ SENSITIVE   │              │   │
│  │   │             │     │             │     │             │              │   │
│  │   │ • Username  │     │ • Messages  │     │ • Email     │              │   │
│  │   │ • Avatar    │     │ • DMs       │     │ • IP addr   │              │   │
│  │   │ • Status    │     │ • Files     │     │ • Location  │              │   │
│  │   │             │     │ • Activity  │     │ • Payment   │              │   │
│  │   └─────────────┘     └─────────────┘     └─────────────┘              │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  DATA SUBJECT RIGHTS                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   Right to Access ────────> Data Export API                             │   │
│  │   Right to Rectification ─> Profile Edit API                            │   │
│  │   Right to Erasure ───────> Account Deletion API                        │   │
│  │   Right to Portability ───> Data Export (machine-readable)              │   │
│  │   Right to Object ────────> Marketing preferences                       │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  RETENTION POLICIES                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   Data Type          │ Retention     │ After Deletion                   │   │
│  │   ────────────────────────────────────────────────────────────────────  │   │
│  │   Chat messages      │ Course + 1yr  │ Anonymize                        │   │
│  │   Direct messages    │ 2 years       │ Delete                           │   │
│  │   User profiles      │ Active + 3yr  │ Delete                           │   │
│  │   Audit logs         │ 2 years       │ Archive                          │   │
│  │   Access logs        │ 90 days       │ Delete                           │   │
│  │   Files/attachments  │ Course + 1yr  │ Delete                           │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Data Export Implementation

```typescript
// GDPR data export service
class DataExportService {
  async requestExport(userId: string): Promise<ExportRequest> {
    // Create export request
    const request = await this.db.exportRequests.create({
      userId,
      status: 'pending',
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Queue export job
    await this.queue.add('data_export', {
      requestId: request.id,
      userId,
    });

    // Audit log
    await this.auditLogger.log({
      action: 'admin.data_export',
      actorId: userId,
      targetId: userId,
      targetType: 'user',
    });

    return request;
  }

  async processExport(requestId: string, userId: string): Promise<void> {
    // Collect all user data
    const data = await this.collectUserData(userId);

    // Generate export file
    const exportPath = await this.generateExportFile(userId, data);

    // Upload to secure storage
    const downloadUrl = await this.uploadExport(exportPath);

    // Update request
    await this.db.exportRequests.update(requestId, {
      status: 'completed',
      completedAt: new Date(),
      downloadUrl,
    });

    // Notify user
    await this.notificationService.sendEmail(userId, {
      template: 'data_export_ready',
      data: { downloadUrl },
    });
  }

  private async collectUserData(userId: string): Promise<UserDataExport> {
    const [
      profile,
      messages,
      directMessages,
      reactions,
      files,
      channelMemberships,
      reports,
      moderationHistory,
    ] = await Promise.all([
      this.db.users.findById(userId),
      this.db.messages.where({ userId }).execute(),
      this.db.directMessages.where({ senderId: userId }).execute(),
      this.db.reactions.where({ userId }).execute(),
      this.db.attachments.where({ uploadedBy: userId }).execute(),
      this.db.channelMembers.where({ userId }).execute(),
      this.db.reports.where({ reporterId: userId }).execute(),
      this.db.moderationHistory.where({ targetUserId: userId }).execute(),
    ]);

    return {
      exportDate: new Date().toISOString(),
      userId,
      profile: this.sanitizeProfile(profile),
      messages: messages.map(m => this.sanitizeMessage(m)),
      directMessages: directMessages.map(m => this.sanitizeMessage(m)),
      reactions,
      files: files.map(f => ({ id: f.id, filename: f.filename, uploadedAt: f.createdAt })),
      channelMemberships,
      reportsSubmitted: reports.length,
      moderationActions: moderationHistory,
    };
  }

  private async generateExportFile(userId: string, data: UserDataExport): Promise<string> {
    const exportDir = path.join(os.tmpdir(), 'exports', userId);
    await fs.mkdir(exportDir, { recursive: true });

    // Write JSON data
    await fs.writeFile(
      path.join(exportDir, 'data.json'),
      JSON.stringify(data, null, 2)
    );

    // Create ZIP archive
    const zipPath = path.join(os.tmpdir(), 'exports', `${userId}-export.zip`);
    await this.createZipArchive(exportDir, zipPath);

    return zipPath;
  }
}
```

### 4.3 Account Deletion & Anonymization

```typescript
// Account deletion service
class AccountDeletionService {
  async requestDeletion(userId: string): Promise<DeletionRequest> {
    // Create deletion request with cooling-off period
    const request = await this.db.deletionRequests.create({
      userId,
      status: 'pending',
      requestedAt: new Date(),
      scheduledFor: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    });

    // Notify user
    await this.notificationService.sendEmail(userId, {
      template: 'deletion_request_confirmation',
      data: {
        scheduledDate: request.scheduledFor,
        cancellationLink: this.generateCancellationLink(request.id),
      },
    });

    return request;
  }

  async processDeletion(requestId: string): Promise<void> {
    const request = await this.db.deletionRequests.findById(requestId);
    if (!request || request.status !== 'pending') {
      return;
    }

    const userId = request.userId;

    // Start deletion transaction
    await this.db.transaction(async (tx) => {
      // 1. Anonymize messages (don't delete - preserve conversation context)
      await tx.messages.updateMany(
        { userId },
        {
          userId: DELETED_USER_ID,
          content: '[Message from deleted user]',
          contentHtml: '<p>[Message from deleted user]</p>',
        }
      );

      // 2. Delete direct messages
      await tx.directMessages.deleteMany({ senderId: userId });
      await tx.dmConversations.deleteMany({
        $or: [{ user1Id: userId }, { user2Id: userId }],
      });

      // 3. Delete reactions
      await tx.reactions.deleteMany({ userId });

      // 4. Remove from channels
      await tx.channelMembers.deleteMany({ userId });

      // 5. Delete files from storage
      const files = await tx.attachments.where({ uploadedBy: userId }).execute();
      for (const file of files) {
        await this.storageService.delete(file.url);
      }
      await tx.attachments.deleteMany({ uploadedBy: userId });

      // 6. Anonymize reports (preserve for moderation history)
      await tx.reports.updateMany(
        { reporterId: userId },
        { reporterId: DELETED_USER_ID }
      );

      // 7. Delete user profile
      await tx.users.delete(userId);

      // 8. Update deletion request
      await tx.deletionRequests.update(requestId, {
        status: 'completed',
        completedAt: new Date(),
      });
    });

    // Audit log (using system actor since user is deleted)
    await this.auditLogger.log({
      action: 'admin.data_delete',
      actorId: 'system',
      actorType: 'system',
      targetId: userId,
      targetType: 'user',
      metadata: { requestId },
    });
  }

  async cancelDeletion(requestId: string, userId: string): Promise<void> {
    const request = await this.db.deletionRequests.findById(requestId);

    if (!request || request.userId !== userId || request.status !== 'pending') {
      throw new BadRequestError('Cannot cancel this deletion request');
    }

    await this.db.deletionRequests.update(requestId, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });
  }
}
```

### 4.4 Message Retention Policies

```typescript
// Retention policy enforcement
class RetentionPolicyService {
  private policies: RetentionPolicy[] = [
    {
      dataType: 'channel_messages',
      condition: 'course_ended',
      retentionDays: 365,
      action: 'anonymize',
    },
    {
      dataType: 'direct_messages',
      condition: 'age',
      retentionDays: 730, // 2 years
      action: 'delete',
    },
    {
      dataType: 'access_logs',
      condition: 'age',
      retentionDays: 90,
      action: 'delete',
    },
    {
      dataType: 'audit_logs',
      condition: 'age',
      retentionDays: 730,
      action: 'archive',
    },
  ];

  async enforceRetentionPolicies(): Promise<RetentionReport> {
    const report: RetentionReport = {
      executedAt: new Date(),
      policies: [],
    };

    for (const policy of this.policies) {
      const result = await this.enforcePolicy(policy);
      report.policies.push({
        policy: policy.dataType,
        recordsAffected: result.count,
        action: policy.action,
      });
    }

    return report;
  }

  private async enforcePolicy(policy: RetentionPolicy): Promise<{ count: number }> {
    const cutoffDate = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000);

    switch (policy.dataType) {
      case 'channel_messages':
        return this.enforceMessageRetention(cutoffDate, policy);

      case 'direct_messages':
        return this.enforceDMRetention(cutoffDate);

      case 'access_logs':
        return this.enforceAccessLogRetention(cutoffDate);

      case 'audit_logs':
        return this.enforceAuditLogRetention(cutoffDate);

      default:
        return { count: 0 };
    }
  }

  private async enforceMessageRetention(
    cutoffDate: Date,
    policy: RetentionPolicy
  ): Promise<{ count: number }> {
    // Find messages in ended courses older than retention period
    const endedCourses = await this.db.courses
      .where({ endedAt: { $lt: cutoffDate } })
      .execute();

    const courseIds = endedCourses.map(c => c.id);

    if (courseIds.length === 0) {
      return { count: 0 };
    }

    // Get channels for these courses
    const channels = await this.db.channels
      .where({ courseId: { $in: courseIds } })
      .execute();

    const channelIds = channels.map(c => c.id);

    if (policy.action === 'anonymize') {
      const result = await this.db.messages.updateMany(
        {
          channelId: { $in: channelIds },
          createdAt: { $lt: cutoffDate },
          userId: { $ne: DELETED_USER_ID },
        },
        {
          content: '[Message archived due to retention policy]',
          contentHtml: '<p>[Message archived due to retention policy]</p>',
          metadata: { archived: true, archivedAt: new Date() },
        }
      );

      return { count: result.modifiedCount };
    }

    return { count: 0 };
  }
}
```

### 4.5 Consent Management

```typescript
// User consent management
interface ConsentRecord {
  userId: string;
  consentType: string;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  version: string;
  ipAddress?: string;
}

class ConsentService {
  private consentTypes = {
    'terms_of_service': { required: true, version: '2024-01' },
    'privacy_policy': { required: true, version: '2024-01' },
    'marketing_emails': { required: false, version: '2024-01' },
    'analytics': { required: false, version: '2024-01' },
    'third_party_sharing': { required: false, version: '2024-01' },
  };

  async recordConsent(
    userId: string,
    consentType: string,
    granted: boolean,
    ipAddress?: string
  ): Promise<ConsentRecord> {
    const typeConfig = this.consentTypes[consentType];
    if (!typeConfig) {
      throw new BadRequestError(`Unknown consent type: ${consentType}`);
    }

    const record = await this.db.consents.upsert({
      userId,
      consentType,
      granted,
      grantedAt: granted ? new Date() : undefined,
      revokedAt: !granted ? new Date() : undefined,
      version: typeConfig.version,
      ipAddress,
    });

    // Audit log
    await this.auditLogger.log({
      action: granted ? 'consent.granted' : 'consent.revoked',
      actorId: userId,
      metadata: { consentType, version: typeConfig.version },
    });

    return record;
  }

  async getUserConsents(userId: string): Promise<Record<string, ConsentRecord>> {
    const consents = await this.db.consents
      .where({ userId })
      .execute();

    return consents.reduce((acc, consent) => {
      acc[consent.consentType] = consent;
      return acc;
    }, {});
  }

  async hasRequiredConsents(userId: string): Promise<boolean> {
    const consents = await this.getUserConsents(userId);

    for (const [type, config] of Object.entries(this.consentTypes)) {
      if (config.required) {
        const consent = consents[type];
        if (!consent || !consent.granted || consent.version !== config.version) {
          return false;
        }
      }
    }

    return true;
  }
}
```

---

## 5. GDPR Compliance Checklist

```yaml
gdpr_compliance_checklist:
  lawful_basis:
    - item: "Document lawful basis for processing"
      status: required
      implementation: "Consent + Legitimate interest"

    - item: "Obtain explicit consent for marketing"
      status: required
      implementation: "Consent service"

  data_subject_rights:
    - item: "Right to access (Article 15)"
      status: required
      implementation: "Data export API"

    - item: "Right to rectification (Article 16)"
      status: required
      implementation: "Profile edit API"

    - item: "Right to erasure (Article 17)"
      status: required
      implementation: "Account deletion service"

    - item: "Right to data portability (Article 20)"
      status: required
      implementation: "Machine-readable export"

    - item: "Right to object (Article 21)"
      status: required
      implementation: "Consent management"

  data_protection:
    - item: "Encryption at rest"
      status: required
      implementation: "PostgreSQL TDE, S3 encryption"

    - item: "Encryption in transit"
      status: required
      implementation: "TLS 1.3 everywhere"

    - item: "Access controls"
      status: required
      implementation: "RBAC system"

    - item: "Data minimization"
      status: required
      implementation: "Collect only necessary data"

    - item: "Storage limitation"
      status: required
      implementation: "Retention policies"

  accountability:
    - item: "Data processing records"
      status: required
      implementation: "Audit logging"

    - item: "Data protection impact assessment"
      status: required
      implementation: "DPIA document"

    - item: "Data breach notification process"
      status: required
      implementation: "Incident response plan"

    - item: "DPO appointment (if required)"
      status: conditional
      implementation: "Designated DPO"

  third_parties:
    - item: "Data processing agreements"
      status: required
      implementation: "DPAs with all processors"

    - item: "Sub-processor list"
      status: required
      implementation: "Documented and published"

    - item: "International transfer safeguards"
      status: required
      implementation: "SCCs or adequacy decision"
```

---

## 6. Deliverables Summary

| Deliverable | Status | Location |
|-------------|--------|----------|
| Moderation Workflow Diagrams | ✅ Complete | Section 1.1 |
| RBAC Permission Matrix | ✅ Complete | Section 2.1 |
| Data Retention Policy Template | ✅ Complete | Section 4.4 |
| GDPR Compliance Checklist | ✅ Complete | Section 5 |
| Audit Logging System | ✅ Complete | Section 3 |
| Content Filtering Implementation | ✅ Complete | Section 1.2 |
| User Reporting System | ✅ Complete | Section 1.3 |
| Data Export Implementation | ✅ Complete | Section 4.2 |
| Account Deletion Process | ✅ Complete | Section 4.3 |
| Consent Management | ✅ Complete | Section 4.5 |
