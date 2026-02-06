# Phase 4: Real-Time Chat System - Architecture & Messaging

## Executive Summary

This phase defines the architecture for a real-time chat system supporting educational communities with course-based channels, direct messaging, and rich features like code sharing and threaded discussions.

---

## 1. Messaging Architecture

### 1.1 Protocol Comparison

| Protocol | Latency | Scalability | Browser Support | Use Case Fit | Recommendation |
|----------|---------|-------------|-----------------|--------------|----------------|
| **WebSocket** | ~50ms | High (with Redis) | Excellent | ✅ Best for chat | **PRIMARY** |
| **Server-Sent Events** | ~100ms | Medium | Good | Notifications only | Secondary |
| **WebRTC** | ~20ms | Complex | Good | Video/voice | Future feature |
| **Long Polling** | ~500ms | Low | Universal | Fallback only | Not recommended |

**Primary Choice: WebSocket with Socket.IO**

Reasons:
- Bidirectional real-time communication
- Built-in reconnection and fallback
- Room/namespace support for channels
- Excellent ecosystem and tooling

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        REAL-TIME CHAT ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CLIENTS                                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                                          │
│  │ Web App │  │ Mobile  │  │ Desktop │                                          │
│  │ (React) │  │  App    │  │  App    │                                          │
│  └────┬────┘  └────┬────┘  └────┬────┘                                          │
│       │            │            │                                                │
│       └────────────┼────────────┘                                                │
│                    │ WebSocket (wss://)                                          │
│                    ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                      LOAD BALANCER (L7)                                  │    │
│  │              • Sticky sessions (by connection ID)                        │    │
│  │              • WebSocket upgrade support                                 │    │
│  │              • Health checks                                             │    │
│  └─────────────────────────────────┬───────────────────────────────────────┘    │
│                                    │                                             │
│              ┌─────────────────────┼─────────────────────┐                      │
│              │                     │                     │                      │
│              ▼                     ▼                     ▼                      │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐             │
│  │  WebSocket Server │ │  WebSocket Server │ │  WebSocket Server │             │
│  │      Node #1      │ │      Node #2      │ │      Node #N      │             │
│  │                   │ │                   │ │                   │             │
│  │  • Socket.IO      │ │  • Socket.IO      │ │  • Socket.IO      │             │
│  │  • Auth middleware│ │  • Auth middleware│ │  • Auth middleware│             │
│  │  • Rate limiting  │ │  • Rate limiting  │ │  • Rate limiting  │             │
│  └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘             │
│            │                     │                     │                        │
│            └─────────────────────┼─────────────────────┘                        │
│                                  │                                              │
│                                  ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         REDIS CLUSTER                                    │   │
│  │                                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │   │
│  │  │   Pub/Sub    │  │   Presence   │  │   Message    │                   │   │
│  │  │  (Adapter)   │  │    Store     │  │    Cache     │                   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                   │   │
│  │                                                                          │   │
│  └─────────────────────────────────┬───────────────────────────────────────┘   │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      MESSAGE PROCESSING                                  │   │
│  │                                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │   │
│  │  │  Moderation  │  │   Storage    │  │  Indexing    │                   │   │
│  │  │   Service    │  │   Service    │  │   Service    │                   │   │
│  │  │              │  │              │  │              │                   │   │
│  │  │ • Profanity  │  │ • PostgreSQL │  │ • Elastic    │                   │   │
│  │  │ • Spam       │  │ • S3 (files) │  │   search     │                   │   │
│  │  │ • Toxicity   │  │              │  │              │                   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                   │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Message Broker Selection

| Broker | Throughput | Persistence | Complexity | Recommendation |
|--------|------------|-------------|------------|----------------|
| **Redis Pub/Sub** | Very High | No (ephemeral) | Low | **Chat delivery** |
| **Redis Streams** | High | Yes | Medium | Message history |
| **Kafka** | Very High | Yes | High | Analytics/audit |
| **NATS** | Very High | Optional | Low | Alternative |

**Hybrid Approach:**
- Redis Pub/Sub: Real-time message delivery
- Redis Streams: Recent message buffer (last 1000 per channel)
- PostgreSQL: Persistent message storage
- Kafka: Analytics and audit trail (async)

### 1.4 Connection Management

```typescript
// Socket.IO server configuration
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
  },

  // Connection settings
  pingTimeout: 60000,
  pingInterval: 25000,

  // Transport settings
  transports: ['websocket', 'polling'],
  allowUpgrades: true,

  // Performance settings
  perMessageDeflate: {
    threshold: 1024, // Compress messages > 1KB
  },

  // Security
  maxHttpBufferSize: 1e6, // 1MB max message size
});

// Redis adapter for horizontal scaling
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));

// Connection handling
io.on('connection', async (socket) => {
  const user = socket.data.user; // From auth middleware

  // Track connection
  await trackUserConnection(user.id, socket.id);

  // Join user's channels
  const channels = await getUserChannels(user.id);
  for (const channel of channels) {
    socket.join(`channel:${channel.id}`);
  }

  // Handle disconnect
  socket.on('disconnect', async (reason) => {
    await trackUserDisconnection(user.id, socket.id, reason);
  });
});
```

### 1.5 Reconnection Strategy

```typescript
// Client-side reconnection configuration
const socket = io(WEBSOCKET_URL, {
  // Reconnection settings
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  randomizationFactor: 0.5,

  // Timeout settings
  timeout: 20000,

  // Auth
  auth: {
    token: getAuthToken(),
  },

  // Transport
  transports: ['websocket'],
  upgrade: false, // Start with WebSocket directly
});

// Reconnection handling
socket.on('reconnect', async (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);

  // Fetch missed messages
  const lastMessageId = getLastKnownMessageId();
  const missedMessages = await fetchMessagesSince(lastMessageId);

  // Apply missed messages
  for (const message of missedMessages) {
    handleIncomingMessage(message);
  }
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection error:', error);

  // Show offline indicator to user
  setConnectionStatus('offline');
});

socket.on('reconnect_failed', () => {
  // All reconnection attempts failed
  showReconnectPrompt();
});
```

---

## 2. Data Model

### 2.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA MODEL                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐            │
│  │    User      │         │   Channel    │         │   Message    │            │
│  ├──────────────┤         ├──────────────┤         ├──────────────┤            │
│  │ id           │         │ id           │         │ id           │            │
│  │ email        │────────<│ course_id    │>────────│ channel_id   │            │
│  │ display_name │         │ type         │         │ user_id      │            │
│  │ avatar_url   │         │ name         │         │ content      │            │
│  │ role         │         │ description  │         │ type         │            │
│  │ subscription │         │ settings     │         │ metadata     │            │
│  │ created_at   │         │ created_at   │         │ thread_id    │            │
│  └──────────────┘         └──────────────┘         │ reply_to_id  │            │
│         │                        │                 │ created_at   │            │
│         │                        │                 │ updated_at   │            │
│         │                        │                 │ deleted_at   │            │
│         │                        │                 └──────────────┘            │
│         │                        │                        │                     │
│         ▼                        ▼                        ▼                     │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐            │
│  │ChannelMember │         │   Thread     │         │  Reaction    │            │
│  ├──────────────┤         ├──────────────┤         ├──────────────┤            │
│  │ channel_id   │         │ id           │         │ message_id   │            │
│  │ user_id      │         │ channel_id   │         │ user_id      │            │
│  │ role         │         │ root_msg_id  │         │ emoji        │            │
│  │ joined_at    │         │ reply_count  │         │ created_at   │            │
│  │ last_read_at │         │ last_reply   │         └──────────────┘            │
│  │ muted_until  │         │ created_at   │                                     │
│  │ notifications│         └──────────────┘                                     │
│  └──────────────┘                                                               │
│                                                                                  │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐            │
│  │ DirectMessage│         │  Attachment  │         │   Mention    │            │
│  ├──────────────┤         ├──────────────┤         ├──────────────┤            │
│  │ id           │         │ id           │         │ message_id   │            │
│  │ user1_id     │         │ message_id   │         │ user_id      │            │
│  │ user2_id     │         │ type         │         │ type         │            │
│  │ last_msg_at  │         │ url          │         │ created_at   │            │
│  │ created_at   │         │ filename     │         └──────────────┘            │
│  └──────────────┘         │ size_bytes   │                                     │
│                           │ metadata     │                                     │
│                           └──────────────┘                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Database Schema

```sql
-- Users (extended from auth)
CREATE TABLE chat_users (
    id UUID PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id),
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'offline', -- online, away, dnd, offline
    status_message VARCHAR(200),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channels
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    type VARCHAR(20) NOT NULL, -- 'course', 'topic', 'announcement', 'private'
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    -- Settings include: slow_mode_seconds, member_limit, auto_archive_days
    is_archived BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES chat_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(course_id, slug)
);

CREATE INDEX idx_channels_course ON channels(course_id);
CREATE INDEX idx_channels_type ON channels(type);

-- Channel Members
CREATE TABLE channel_members (
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES chat_users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'moderator', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_message_id UUID,
    muted_until TIMESTAMP WITH TIME ZONE,
    notification_preference VARCHAR(20) DEFAULT 'all', -- 'all', 'mentions', 'none'

    PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX idx_channel_members_user ON channel_members(user_id);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES chat_users(id),
    content TEXT NOT NULL,
    content_html TEXT, -- Rendered HTML for display
    type VARCHAR(20) DEFAULT 'text', -- 'text', 'code', 'file', 'system'
    metadata JSONB DEFAULT '{}',
    -- Metadata: language (for code), file_info, embed_info

    thread_id UUID REFERENCES messages(id),
    reply_to_id UUID REFERENCES messages(id),
    reply_count INTEGER DEFAULT 0,

    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_pinned BOOLEAN DEFAULT FALSE,
    pinned_by UUID REFERENCES chat_users(id),
    pinned_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete

    -- Full-text search
    search_vector TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(content, '')), 'A')
    ) STORED
);

CREATE INDEX idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_thread ON messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);
CREATE INDEX idx_messages_user ON messages(user_id);

-- Reactions
CREATE TABLE reactions (
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES chat_users(id) ON DELETE CASCADE,
    emoji VARCHAR(50) NOT NULL, -- Unicode emoji or custom emoji code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (message_id, user_id, emoji)
);

-- Mentions
CREATE TABLE mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES chat_users(id) ON DELETE CASCADE,
    mention_type VARCHAR(20) DEFAULT 'user', -- 'user', 'channel', 'everyone', 'here'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mentions_user ON mentions(user_id, created_at DESC);

-- Attachments
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'image', 'file', 'code', 'link'
    url TEXT NOT NULL,
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    metadata JSONB DEFAULT '{}',
    -- Metadata: width, height (images), preview_url, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Direct Message Conversations
CREATE TABLE dm_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES chat_users(id),
    user2_id UUID REFERENCES chat_users(id),
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user1_id, user2_id),
    CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

CREATE INDEX idx_dm_user1 ON dm_conversations(user1_id);
CREATE INDEX idx_dm_user2 ON dm_conversations(user2_id);

-- Direct Messages
CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES dm_conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES chat_users(id),
    content TEXT NOT NULL,
    content_html TEXT,
    type VARCHAR(20) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',

    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_dm_conversation ON direct_messages(conversation_id, created_at DESC);
```

### 2.3 Message Schema (Wire Format)

```typescript
// Message types
interface BaseMessage {
  id: string;
  channelId: string;
  userId: string;
  createdAt: string; // ISO 8601
  updatedAt?: string;
}

interface TextMessage extends BaseMessage {
  type: 'text';
  content: string;
  contentHtml: string;
  mentions: Mention[];
  reactions: ReactionSummary[];
  replyTo?: MessageReference;
  threadId?: string;
  replyCount?: number;
}

interface CodeMessage extends BaseMessage {
  type: 'code';
  content: string;
  language: string;
  filename?: string;
  highlightedHtml: string;
}

interface FileMessage extends BaseMessage {
  type: 'file';
  content: string; // Caption
  attachments: Attachment[];
}

interface SystemMessage extends BaseMessage {
  type: 'system';
  content: string;
  action: 'join' | 'leave' | 'pin' | 'unpin' | 'settings_change';
  metadata: Record<string, unknown>;
}

type Message = TextMessage | CodeMessage | FileMessage | SystemMessage;

// Supporting types
interface Mention {
  userId: string;
  displayName: string;
  type: 'user' | 'channel' | 'everyone' | 'here';
}

interface ReactionSummary {
  emoji: string;
  count: number;
  includesMe: boolean;
  recentUsers: string[]; // User IDs
}

interface Attachment {
  id: string;
  type: 'image' | 'file' | 'video';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dimensions?: { width: number; height: number };
}

interface MessageReference {
  id: string;
  userId: string;
  displayName: string;
  content: string; // Truncated preview
}
```

### 2.4 Presence Tracking

```typescript
// Redis-based presence tracking
class PresenceManager {
  private redis: Redis;
  private readonly PRESENCE_TTL = 60; // seconds
  private readonly HEARTBEAT_INTERVAL = 30000; // ms

  async setUserOnline(userId: string, socketId: string, metadata: UserPresenceMetadata) {
    const key = `presence:${userId}`;
    const connectionKey = `presence:connections:${userId}`;

    // Store presence data
    await this.redis.hset(key, {
      status: 'online',
      lastSeen: Date.now(),
      ...metadata,
    });
    await this.redis.expire(key, this.PRESENCE_TTL);

    // Track multiple connections (multi-device)
    await this.redis.sadd(connectionKey, socketId);
    await this.redis.expire(connectionKey, this.PRESENCE_TTL);

    // Publish presence update
    await this.publishPresenceChange(userId, 'online');
  }

  async setUserOffline(userId: string, socketId: string) {
    const connectionKey = `presence:connections:${userId}`;

    // Remove this connection
    await this.redis.srem(connectionKey, socketId);

    // Check if user has other active connections
    const remainingConnections = await this.redis.scard(connectionKey);

    if (remainingConnections === 0) {
      // User is fully offline
      const key = `presence:${userId}`;
      await this.redis.hset(key, {
        status: 'offline',
        lastSeen: Date.now(),
      });
      await this.redis.expire(key, 86400); // Keep for 24h for "last seen"

      await this.publishPresenceChange(userId, 'offline');
    }
  }

  async getChannelPresence(channelId: string): Promise<PresenceInfo[]> {
    // Get channel members
    const memberIds = await this.getChannelMemberIds(channelId);

    // Batch fetch presence
    const pipeline = this.redis.pipeline();
    for (const userId of memberIds) {
      pipeline.hgetall(`presence:${userId}`);
    }
    const results = await pipeline.exec();

    return memberIds.map((userId, index) => ({
      userId,
      ...results[index][1] as PresenceData,
    }));
  }

  async heartbeat(userId: string) {
    const key = `presence:${userId}`;
    const connectionKey = `presence:connections:${userId}`;

    await this.redis.expire(key, this.PRESENCE_TTL);
    await this.redis.expire(connectionKey, this.PRESENCE_TTL);
    await this.redis.hset(key, 'lastSeen', Date.now());
  }

  private async publishPresenceChange(userId: string, status: string) {
    await this.redis.publish('presence:changes', JSON.stringify({
      userId,
      status,
      timestamp: Date.now(),
    }));
  }
}
```

### 2.5 Typing Indicators

```typescript
// Typing indicator implementation
class TypingIndicatorManager {
  private redis: Redis;
  private readonly TYPING_TTL = 5; // seconds

  async setTyping(channelId: string, userId: string) {
    const key = `typing:${channelId}`;

    // Add user to typing set with score = timestamp
    await this.redis.zadd(key, Date.now(), userId);
    await this.redis.expire(key, this.TYPING_TTL);

    // Broadcast to channel
    await this.broadcastTyping(channelId, userId, true);
  }

  async clearTyping(channelId: string, userId: string) {
    const key = `typing:${channelId}`;
    await this.redis.zrem(key, userId);
    await this.broadcastTyping(channelId, userId, false);
  }

  async getTypingUsers(channelId: string): Promise<string[]> {
    const key = `typing:${channelId}`;
    const cutoff = Date.now() - (this.TYPING_TTL * 1000);

    // Remove stale entries and get current
    await this.redis.zremrangebyscore(key, '-inf', cutoff);
    return this.redis.zrange(key, 0, -1);
  }

  private async broadcastTyping(channelId: string, userId: string, isTyping: boolean) {
    await this.redis.publish(`channel:${channelId}:typing`, JSON.stringify({
      userId,
      isTyping,
      timestamp: Date.now(),
    }));
  }
}

// Client-side debounced typing indicator
class TypingHandler {
  private typingTimeout: NodeJS.Timeout | null = null;
  private isTyping = false;

  handleInput(channelId: string) {
    if (!this.isTyping) {
      this.isTyping = true;
      socket.emit('typing:start', { channelId });
    }

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Set new timeout to clear typing
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      socket.emit('typing:stop', { channelId });
    }, 3000);
  }

  handleSend() {
    // Clear typing on message send
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    if (this.isTyping) {
      this.isTyping = false;
      socket.emit('typing:stop', { channelId });
    }
  }
}
```

---

## 3. Message Flow

### 3.1 Send Message Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           MESSAGE SEND FLOW                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  CLIENT                                                                       │
│     │                                                                         │
│     │ 1. User types message                                                   │
│     │    • Client-side validation                                             │
│     │    • Generate client-side ID (for optimistic UI)                        │
│     │                                                                         │
│     ▼                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                    WEBSOCKET SERVER                                  │     │
│  │                                                                      │     │
│  │  2. Receive message event                                           │     │
│  │     • Validate authentication                                        │     │
│  │     • Check channel membership                                       │     │
│  │     • Check rate limits                                              │     │
│  │     • Check slow mode                                                │     │
│  │                                                                      │     │
│  └─────────────────────────────┬───────────────────────────────────────┘     │
│                                │                                              │
│                                ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                    MODERATION SERVICE                                │     │
│  │                                                                      │     │
│  │  3. Content moderation                                              │     │
│  │     • Profanity filter                                              │     │
│  │     • Spam detection                                                 │     │
│  │     • Link validation                                                │     │
│  │     • (Optional) AI toxicity check                                  │     │
│  │                                                                      │     │
│  │  Result: ALLOW / BLOCK / FLAG                                       │     │
│  │                                                                      │     │
│  └─────────────────────────────┬───────────────────────────────────────┘     │
│                                │                                              │
│                    ┌───────────┴───────────┐                                 │
│                    │                       │                                 │
│               [BLOCKED]               [ALLOWED]                              │
│                    │                       │                                 │
│                    ▼                       ▼                                 │
│              Return error         ┌─────────────────────────────────────┐   │
│              to client            │         MESSAGE PROCESSOR           │   │
│                                   │                                     │   │
│                                   │  4. Process message                 │   │
│                                   │     • Parse mentions (@user)        │   │
│                                   │     • Parse links (auto-embed)      │   │
│                                   │     • Syntax highlight (code)       │   │
│                                   │     • Generate HTML                 │   │
│                                   │     • Assign server ID              │   │
│                                   │                                     │   │
│                                   └─────────────────┬───────────────────┘   │
│                                                     │                        │
│                    ┌────────────────────────────────┼────────────────────┐   │
│                    │                                │                    │   │
│                    ▼                                ▼                    ▼   │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐   │
│  │   REDIS PUB/SUB      │  │     POSTGRESQL       │  │     KAFKA       │   │
│  │                      │  │                      │  │                 │   │
│  │  5a. Broadcast to    │  │  5b. Persist         │  │  5c. Audit      │   │
│  │      all channel     │  │      message         │  │      log        │   │
│  │      subscribers     │  │                      │  │                 │   │
│  │                      │  │                      │  │                 │   │
│  └──────────┬───────────┘  └──────────────────────┘  └─────────────────┘   │
│             │                                                               │
│             ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │               ALL WEBSOCKET SERVERS (via Redis)                      │   │
│  │                                                                      │   │
│  │  6. Deliver to connected clients                                    │   │
│  │     • Find sockets in channel room                                  │   │
│  │     • Send message event                                            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│             │                                                               │
│             ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NOTIFICATION SERVICE                              │   │
│  │                                                                      │   │
│  │  7. Send notifications (async)                                      │   │
│  │     • Push notifications (mobile)                                   │   │
│  │     • Email digest (offline users)                                  │   │
│  │     • Mention notifications                                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Message Handler Implementation

```typescript
// Server-side message handler
class MessageHandler {
  constructor(
    private moderationService: ModerationService,
    private messageProcessor: MessageProcessor,
    private messageStore: MessageStore,
    private notificationService: NotificationService,
    private redis: Redis,
  ) {}

  async handleSendMessage(
    socket: Socket,
    data: SendMessageRequest
  ): Promise<SendMessageResponse> {
    const user = socket.data.user;
    const startTime = Date.now();

    try {
      // 1. Validate request
      this.validateRequest(data);

      // 2. Check permissions
      const membership = await this.checkMembership(user.id, data.channelId);
      if (!membership) {
        throw new ForbiddenError('Not a member of this channel');
      }

      // 3. Check rate limits
      await this.checkRateLimit(user.id, data.channelId);

      // 4. Check slow mode
      await this.checkSlowMode(user.id, data.channelId);

      // 5. Moderate content
      const moderationResult = await this.moderationService.check({
        content: data.content,
        userId: user.id,
        channelId: data.channelId,
      });

      if (moderationResult.blocked) {
        return {
          success: false,
          error: {
            code: 'CONTENT_BLOCKED',
            message: moderationResult.reason,
          },
        };
      }

      // 6. Process message
      const processedMessage = await this.messageProcessor.process({
        content: data.content,
        type: data.type || 'text',
        channelId: data.channelId,
        userId: user.id,
        replyToId: data.replyToId,
        threadId: data.threadId,
        attachments: data.attachments,
      });

      // 7. Persist message
      const savedMessage = await this.messageStore.save(processedMessage);

      // 8. Broadcast to channel (via Redis pub/sub)
      await this.broadcastMessage(data.channelId, savedMessage);

      // 9. Handle notifications (async, don't await)
      this.notificationService.processMessage(savedMessage).catch(console.error);

      // 10. Update metrics
      metrics.messagesSent.inc({ channel_type: membership.channelType });
      metrics.messageLatency.observe(Date.now() - startTime);

      return {
        success: true,
        message: savedMessage,
      };

    } catch (error) {
      metrics.messageErrors.inc({ error_type: error.name });
      throw error;
    }
  }

  private async broadcastMessage(channelId: string, message: Message) {
    // Publish to Redis for all WebSocket servers
    await this.redis.publish(
      `channel:${channelId}:messages`,
      JSON.stringify({
        event: 'message:new',
        data: message,
      })
    );
  }

  private async checkRateLimit(userId: string, channelId: string) {
    const key = `ratelimit:messages:${userId}`;
    const limit = 30; // 30 messages per minute
    const window = 60; // 1 minute

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, window);
    }

    if (current > limit) {
      throw new RateLimitError('Message rate limit exceeded');
    }
  }

  private async checkSlowMode(userId: string, channelId: string) {
    const channel = await this.getChannel(channelId);
    const slowModeSeconds = channel.settings?.slow_mode_seconds;

    if (!slowModeSeconds || slowModeSeconds === 0) {
      return; // Slow mode not enabled
    }

    const key = `slowmode:${channelId}:${userId}`;
    const lastMessage = await this.redis.get(key);

    if (lastMessage) {
      const elapsed = Date.now() - parseInt(lastMessage);
      const remaining = slowModeSeconds * 1000 - elapsed;

      if (remaining > 0) {
        throw new SlowModeError(`Please wait ${Math.ceil(remaining / 1000)} seconds`);
      }
    }

    await this.redis.setex(key, slowModeSeconds, Date.now().toString());
  }
}
```

### 3.3 Persistence Strategy

```typescript
// Write-through caching with async persistence
class MessageStore {
  constructor(
    private db: PostgresPool,
    private redis: Redis,
    private kafka: KafkaProducer,
  ) {}

  async save(message: ProcessedMessage): Promise<Message> {
    // 1. Generate server-side ID
    const id = generateUUID();
    const now = new Date();

    const fullMessage: Message = {
      ...message,
      id,
      createdAt: now,
    };

    // 2. Write to PostgreSQL (primary store)
    await this.db.query(`
      INSERT INTO messages (
        id, channel_id, user_id, content, content_html, type,
        metadata, thread_id, reply_to_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      id,
      message.channelId,
      message.userId,
      message.content,
      message.contentHtml,
      message.type,
      JSON.stringify(message.metadata),
      message.threadId,
      message.replyToId,
      now,
    ]);

    // 3. Cache in Redis (for recent message retrieval)
    const cacheKey = `channel:${message.channelId}:messages`;
    await this.redis.zadd(cacheKey, now.getTime(), JSON.stringify(fullMessage));

    // Trim to keep only last 1000 messages in cache
    await this.redis.zremrangebyrank(cacheKey, 0, -1001);

    // 4. Publish to Kafka (for analytics and audit)
    await this.kafka.send({
      topic: 'chat.messages',
      messages: [{
        key: message.channelId,
        value: JSON.stringify({
          ...fullMessage,
          eventType: 'MESSAGE_CREATED',
          eventTime: now.toISOString(),
        }),
      }],
    });

    return fullMessage;
  }

  async getRecentMessages(
    channelId: string,
    limit: number = 50,
    before?: string
  ): Promise<Message[]> {
    const cacheKey = `channel:${channelId}:messages`;

    // Try cache first
    let messages: Message[];
    const maxScore = before
      ? await this.getMessageTimestamp(before)
      : '+inf';

    const cached = await this.redis.zrevrangebyscore(
      cacheKey,
      maxScore,
      '-inf',
      'LIMIT', 0, limit
    );

    if (cached.length === limit) {
      // Cache hit
      messages = cached.map(m => JSON.parse(m));
    } else {
      // Cache miss or partial - fetch from DB
      messages = await this.db.query(`
        SELECT * FROM messages
        WHERE channel_id = $1
          AND deleted_at IS NULL
          ${before ? 'AND created_at < (SELECT created_at FROM messages WHERE id = $2)' : ''}
        ORDER BY created_at DESC
        LIMIT $3
      `, before ? [channelId, before, limit] : [channelId, limit]);

      // Repopulate cache
      if (messages.length > 0) {
        const pipeline = this.redis.pipeline();
        for (const msg of messages) {
          pipeline.zadd(cacheKey, msg.createdAt.getTime(), JSON.stringify(msg));
        }
        await pipeline.exec();
      }
    }

    return messages;
  }
}
```

### 3.4 Offline Message Handling

```typescript
// Fetch messages missed while offline
class OfflineMessageSync {
  async syncMessages(
    userId: string,
    channels: ChannelSyncState[]
  ): Promise<SyncResult> {
    const results: ChannelMessages[] = [];

    for (const channel of channels) {
      const missedMessages = await this.getMissedMessages(
        channel.channelId,
        channel.lastMessageId,
        100 // Max messages to sync per channel
      );

      // Get unread count
      const unreadCount = await this.getUnreadCount(
        userId,
        channel.channelId,
        channel.lastReadAt
      );

      results.push({
        channelId: channel.channelId,
        messages: missedMessages,
        unreadCount,
        hasMore: missedMessages.length === 100,
      });
    }

    // Also sync any new channels user was added to
    const newChannels = await this.getNewChannels(userId, channels.map(c => c.channelId));

    return {
      channels: results,
      newChannels,
      syncedAt: new Date().toISOString(),
    };
  }

  private async getMissedMessages(
    channelId: string,
    lastMessageId: string,
    limit: number
  ): Promise<Message[]> {
    return this.db.query(`
      SELECT * FROM messages
      WHERE channel_id = $1
        AND id > $2
        AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT $3
    `, [channelId, lastMessageId, limit]);
  }

  private async getUnreadCount(
    userId: string,
    channelId: string,
    lastReadAt: Date
  ): Promise<number> {
    const result = await this.db.query(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE channel_id = $1
        AND created_at > $2
        AND user_id != $3
        AND deleted_at IS NULL
    `, [channelId, lastReadAt, userId]);

    return parseInt(result.rows[0].count);
  }
}
```

---

## 4. Features

### 4.1 Feature Matrix

| Feature | Priority | Implementation | Status |
|---------|----------|----------------|--------|
| Text messages | P0 | WebSocket + PostgreSQL | Core |
| Channels (course-based) | P0 | Channel model + membership | Core |
| Direct messages | P0 | DM conversation model | Core |
| Presence (online/offline) | P0 | Redis + heartbeat | Core |
| Typing indicators | P1 | Redis pub/sub | Core |
| Message reactions | P1 | Reactions table | Core |
| Thread replies | P1 | Thread model | Core |
| File sharing | P1 | S3 + CDN | Core |
| Code snippets | P1 | Syntax highlighting | Core |
| Message search | P2 | PostgreSQL FTS / Elasticsearch | Enhanced |
| Message editing | P2 | Edit history tracking | Enhanced |
| Pinned messages | P2 | Pin flag + list | Enhanced |
| Mentions (@user) | P1 | Mention parsing + notifications | Core |
| Link previews | P2 | OpenGraph fetching | Enhanced |
| Read receipts | P2 | Last read tracking | Enhanced |
| Voice messages | P3 | Audio upload | Future |
| Video calls | P3 | WebRTC integration | Future |

### 4.2 Code Snippet Sharing

```typescript
// Code snippet processing
class CodeSnippetProcessor {
  private highlighter: Highlighter;

  constructor() {
    this.highlighter = new shiki.Highlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'javascript', 'typescript', 'python', 'java', 'go',
        'rust', 'c', 'cpp', 'csharp', 'ruby', 'php', 'swift',
        'kotlin', 'sql', 'html', 'css', 'json', 'yaml', 'bash',
      ],
    });
  }

  async processCodeBlock(
    code: string,
    language: string,
    filename?: string
  ): Promise<ProcessedCodeBlock> {
    // Detect language if not specified
    const detectedLang = language || this.detectLanguage(code, filename);

    // Syntax highlight
    const highlightedHtml = this.highlighter.codeToHtml(code, {
      lang: detectedLang,
      theme: 'github-dark',
    });

    // Extract metadata
    const lineCount = code.split('\n').length;
    const charCount = code.length;

    return {
      code,
      language: detectedLang,
      filename,
      highlightedHtml,
      lineCount,
      charCount,
      // Truncate preview if too long
      preview: lineCount > 20 ? code.split('\n').slice(0, 20).join('\n') + '\n...' : code,
      isCollapsed: lineCount > 20,
    };
  }

  private detectLanguage(code: string, filename?: string): string {
    // Try filename extension
    if (filename) {
      const ext = filename.split('.').pop()?.toLowerCase();
      const langMap: Record<string, string> = {
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'rb': 'ruby',
        'go': 'go',
        'rs': 'rust',
        'java': 'java',
        'kt': 'kotlin',
        'swift': 'swift',
        'cs': 'csharp',
        'php': 'php',
        'sql': 'sql',
        'sh': 'bash',
        'bash': 'bash',
        'yml': 'yaml',
        'yaml': 'yaml',
        'json': 'json',
        'html': 'html',
        'css': 'css',
      };
      if (ext && langMap[ext]) {
        return langMap[ext];
      }
    }

    // Simple heuristic detection
    if (code.includes('def ') && code.includes(':')) return 'python';
    if (code.includes('func ') && code.includes('package ')) return 'go';
    if (code.includes('fn ') && code.includes('let ')) return 'rust';
    if (code.includes('public class ')) return 'java';
    if (code.includes('const ') || code.includes('function ')) return 'javascript';

    return 'plaintext';
  }
}

// Message format for code blocks
// Users can use triple backticks like markdown:
// ```python
// def hello():
//     print("Hello")
// ```

const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;

function parseCodeBlocks(content: string): ParsedContent {
  const blocks: CodeBlock[] = [];
  let lastIndex = 0;
  const parts: ContentPart[] = [];

  let match;
  while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }

    // Code block
    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  return { parts };
}
```

### 4.3 File/Image Sharing

```typescript
// File upload and sharing
class FileUploadService {
  constructor(
    private s3: S3Client,
    private cdn: CDNService,
    private imageProcessor: ImageProcessor,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    channelId: string
  ): Promise<UploadedFile> {
    // Validate file
    this.validateFile(file);

    // Generate unique key
    const key = `chat/${channelId}/${Date.now()}-${generateId()}-${file.originalname}`;

    // Process based on type
    if (this.isImage(file.mimetype)) {
      return this.uploadImage(file, key, userId);
    } else {
      return this.uploadGenericFile(file, key, userId);
    }
  }

  private async uploadImage(
    file: Express.Multer.File,
    key: string,
    userId: string
  ): Promise<UploadedFile> {
    // Generate thumbnail
    const thumbnail = await this.imageProcessor.resize(file.buffer, {
      width: 400,
      height: 400,
      fit: 'inside',
    });

    // Get dimensions
    const metadata = await this.imageProcessor.getMetadata(file.buffer);

    // Upload original
    const originalKey = key;
    await this.s3.putObject({
      Bucket: process.env.S3_BUCKET,
      Key: originalKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000',
    });

    // Upload thumbnail
    const thumbnailKey = key.replace(/(\.\w+)$/, '-thumb$1');
    await this.s3.putObject({
      Bucket: process.env.S3_BUCKET,
      Key: thumbnailKey,
      Body: thumbnail,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000',
    });

    return {
      id: generateId(),
      type: 'image',
      url: this.cdn.getUrl(originalKey),
      thumbnailUrl: this.cdn.getUrl(thumbnailKey),
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      dimensions: {
        width: metadata.width,
        height: metadata.height,
      },
    };
  }

  private validateFile(file: Express.Multer.File) {
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    const ALLOWED_TYPES = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/markdown',
      'application/zip',
      'application/json',
    ];

    if (file.size > MAX_SIZE) {
      throw new ValidationError('File size exceeds 25MB limit');
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new ValidationError('File type not allowed');
    }
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }
}
```

### 4.4 Thread Replies

```typescript
// Thread management
class ThreadService {
  async createThread(
    channelId: string,
    rootMessageId: string,
    replyContent: string,
    userId: string
  ): Promise<{ thread: Thread; reply: Message }> {
    // Get root message
    const rootMessage = await this.messageStore.get(rootMessageId);
    if (!rootMessage) {
      throw new NotFoundError('Message not found');
    }

    // Check if thread already exists
    let thread = await this.getThreadByRootMessage(rootMessageId);

    if (!thread) {
      // Create new thread
      thread = await this.db.query(`
        INSERT INTO threads (channel_id, root_message_id, created_at)
        VALUES ($1, $2, NOW())
        RETURNING *
      `, [channelId, rootMessageId]);
    }

    // Create reply message
    const reply = await this.messageStore.save({
      channelId,
      userId,
      content: replyContent,
      type: 'text',
      threadId: thread.id,
    });

    // Update thread stats
    await this.db.query(`
      UPDATE threads
      SET reply_count = reply_count + 1,
          last_reply_at = NOW(),
          last_reply_by = $1
      WHERE id = $2
    `, [userId, thread.id]);

    // Update root message
    await this.db.query(`
      UPDATE messages
      SET reply_count = reply_count + 1
      WHERE id = $1
    `, [rootMessageId]);

    // Notify thread participants
    await this.notifyThreadParticipants(thread.id, reply, userId);

    return { thread, reply };
  }

  async getThreadMessages(
    threadId: string,
    limit: number = 50,
    before?: string
  ): Promise<{ thread: Thread; messages: Message[] }> {
    const thread = await this.db.query(`
      SELECT t.*, m.content as root_content, m.user_id as root_user_id
      FROM threads t
      JOIN messages m ON t.root_message_id = m.id
      WHERE t.id = $1
    `, [threadId]);

    if (!thread) {
      throw new NotFoundError('Thread not found');
    }

    const messages = await this.db.query(`
      SELECT * FROM messages
      WHERE thread_id = $1
        AND deleted_at IS NULL
        ${before ? 'AND created_at < (SELECT created_at FROM messages WHERE id = $2)' : ''}
      ORDER BY created_at ASC
      LIMIT $3
    `, before ? [threadId, before, limit] : [threadId, limit]);

    return { thread, messages };
  }

  private async notifyThreadParticipants(
    threadId: string,
    newReply: Message,
    senderId: string
  ) {
    // Get all participants except sender
    const participants = await this.db.query(`
      SELECT DISTINCT user_id
      FROM messages
      WHERE thread_id = $1
        AND user_id != $2
    `, [threadId, senderId]);

    for (const participant of participants) {
      await this.notificationService.send({
        userId: participant.user_id,
        type: 'thread_reply',
        data: {
          threadId,
          messageId: newReply.id,
          senderId,
          preview: newReply.content.slice(0, 100),
        },
      });
    }
  }
}
```

---

## 5. Delivery Guarantees

### 5.1 Message Delivery Model

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        MESSAGE DELIVERY GUARANTEES                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  DELIVERY SEMANTIC: AT-LEAST-ONCE                                               │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         MESSAGE LIFECYCLE                                │    │
│  │                                                                          │    │
│  │   1. CLIENT SENDS                                                       │    │
│  │      • Generate client-side ID (UUID)                                   │    │
│  │      • Store in local pending queue                                     │    │
│  │      • Display optimistic UI                                            │    │
│  │                                                                          │    │
│  │   2. SERVER RECEIVES                                                    │    │
│  │      • Validate and process                                             │    │
│  │      • Assign server ID                                                 │    │
│  │      • Persist to PostgreSQL                                            │    │
│  │      • Send ACK with server ID                                          │    │
│  │                                                                          │    │
│  │   3. SERVER BROADCASTS                                                  │    │
│  │      • Publish to Redis pub/sub                                         │    │
│  │      • Deliver to all connected clients                                 │    │
│  │                                                                          │    │
│  │   4. CLIENT RECEIVES ACK                                                │    │
│  │      • Update local message with server ID                              │    │
│  │      • Remove from pending queue                                        │    │
│  │      • Mark as confirmed                                                │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  FAILURE HANDLING:                                                              │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                          │    │
│  │   • No ACK within 5s → Retry send (up to 3 times)                       │    │
│  │   • Connection lost → Queue locally, retry on reconnect                 │    │
│  │   • Server error → Show error to user, allow retry                      │    │
│  │   • Duplicate detection → Server ignores by client-side ID              │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ORDERING:                                                                      │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                          │    │
│  │   • Messages ordered by server timestamp (created_at)                   │    │
│  │   • Client-side ordering preserved within same user                     │    │
│  │   • Cross-user ordering determined by server arrival                    │    │
│  │   • Reordering handled on client after sync                             │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Client-Side Queue Implementation

```typescript
// Client-side message queue for reliability
class MessageQueue {
  private pending: Map<string, PendingMessage> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  async send(channelId: string, content: string): Promise<void> {
    // Generate client-side ID
    const clientId = generateUUID();

    // Create pending message
    const pendingMessage: PendingMessage = {
      clientId,
      channelId,
      content,
      status: 'sending',
      attempts: 0,
      createdAt: Date.now(),
    };

    // Store in pending queue
    this.pending.set(clientId, pendingMessage);

    // Show optimistic UI
    this.onOptimisticMessage(pendingMessage);

    // Send to server
    await this.sendToServer(pendingMessage);
  }

  private async sendToServer(message: PendingMessage) {
    message.attempts++;

    try {
      // Emit with timeout
      const response = await this.emitWithTimeout('message:send', {
        clientId: message.clientId,
        channelId: message.channelId,
        content: message.content,
      }, 5000);

      if (response.success) {
        // Success - update with server data
        this.handleSuccess(message.clientId, response.message);
      } else {
        // Server rejected
        this.handleError(message.clientId, response.error);
      }

    } catch (error) {
      // Timeout or network error
      this.handleFailure(message, error);
    }
  }

  private handleSuccess(clientId: string, serverMessage: Message) {
    const pending = this.pending.get(clientId);
    if (pending) {
      this.pending.delete(clientId);
      this.onMessageConfirmed(clientId, serverMessage);
    }
  }

  private handleFailure(message: PendingMessage, error: Error) {
    if (message.attempts < 3) {
      // Retry with exponential backoff
      const delay = Math.pow(2, message.attempts) * 1000;

      const timeout = setTimeout(() => {
        this.sendToServer(message);
      }, delay);

      this.retryTimeouts.set(message.clientId, timeout);
      this.onMessageRetrying(message.clientId, message.attempts);

    } else {
      // Give up - show error
      message.status = 'failed';
      this.onMessageFailed(message.clientId, error);
    }
  }

  // Called on reconnect
  async retryPending() {
    for (const [clientId, message] of this.pending) {
      if (message.status === 'failed') {
        message.attempts = 0;
        message.status = 'sending';
        await this.sendToServer(message);
      }
    }
  }

  private emitWithTimeout(event: string, data: any, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timeout'));
      }, timeout);

      socket.emit(event, data, (response: any) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }
}
```

### 5.3 Deduplication

```typescript
// Server-side deduplication
class MessageDeduplicator {
  private redis: Redis;
  private readonly DEDUP_TTL = 300; // 5 minutes

  async isDuplicate(clientId: string, userId: string): Promise<boolean> {
    const key = `dedup:${userId}:${clientId}`;

    // Try to set key (returns null if already exists)
    const result = await this.redis.set(key, '1', 'EX', this.DEDUP_TTL, 'NX');

    return result === null; // Key existed = duplicate
  }

  async markProcessed(clientId: string, userId: string, serverId: string) {
    const key = `dedup:${userId}:${clientId}`;

    // Store server ID for client to retrieve if needed
    await this.redis.setex(key, this.DEDUP_TTL, serverId);
  }

  async getServerId(clientId: string, userId: string): Promise<string | null> {
    const key = `dedup:${userId}:${clientId}`;
    return this.redis.get(key);
  }
}

// In message handler
async handleSendMessage(socket: Socket, data: SendMessageRequest) {
  const userId = socket.data.user.id;

  // Check for duplicate
  if (await this.deduplicator.isDuplicate(data.clientId, userId)) {
    // Get existing server ID
    const serverId = await this.deduplicator.getServerId(data.clientId, userId);

    return {
      success: true,
      duplicate: true,
      message: { id: serverId, clientId: data.clientId },
    };
  }

  // Process message...
  const savedMessage = await this.messageStore.save(processedMessage);

  // Mark as processed
  await this.deduplicator.markProcessed(data.clientId, userId, savedMessage.id);

  return { success: true, message: savedMessage };
}
```

---

## 6. API Endpoint Specifications

### 6.1 REST API Endpoints

```yaml
# Channel APIs
channels:
  # List channels for user
  GET /api/v1/channels:
    auth: required
    query:
      course_id: string (optional)
      type: 'course' | 'topic' | 'private' (optional)
    response:
      channels: Channel[]

  # Get channel details
  GET /api/v1/channels/{channelId}:
    auth: required
    response:
      channel: Channel
      membership: ChannelMember

  # Get channel messages (paginated)
  GET /api/v1/channels/{channelId}/messages:
    auth: required
    query:
      limit: number (default: 50, max: 100)
      before: string (message ID for pagination)
      after: string (message ID for newer messages)
    response:
      messages: Message[]
      hasMore: boolean

  # Search messages in channel
  GET /api/v1/channels/{channelId}/messages/search:
    auth: required
    query:
      q: string (search query)
      limit: number (default: 20)
      offset: number
    response:
      messages: Message[]
      total: number

  # Get pinned messages
  GET /api/v1/channels/{channelId}/pins:
    auth: required
    response:
      messages: Message[]

  # Get channel members
  GET /api/v1/channels/{channelId}/members:
    auth: required
    query:
      limit: number
      offset: number
    response:
      members: ChannelMember[]
      total: number

# Message APIs
messages:
  # Get single message
  GET /api/v1/messages/{messageId}:
    auth: required
    response:
      message: Message

  # Edit message
  PATCH /api/v1/messages/{messageId}:
    auth: required (owner only)
    body:
      content: string
    response:
      message: Message

  # Delete message
  DELETE /api/v1/messages/{messageId}:
    auth: required (owner or moderator)
    response:
      success: boolean

  # Add reaction
  POST /api/v1/messages/{messageId}/reactions:
    auth: required
    body:
      emoji: string
    response:
      success: boolean

  # Remove reaction
  DELETE /api/v1/messages/{messageId}/reactions/{emoji}:
    auth: required
    response:
      success: boolean

  # Pin message
  POST /api/v1/messages/{messageId}/pin:
    auth: required (moderator+)
    response:
      success: boolean

# Thread APIs
threads:
  # Get thread messages
  GET /api/v1/threads/{threadId}/messages:
    auth: required
    query:
      limit: number
      before: string
    response:
      thread: Thread
      messages: Message[]
      hasMore: boolean

# Direct Message APIs
dm:
  # List DM conversations
  GET /api/v1/dm:
    auth: required
    response:
      conversations: DMConversation[]

  # Get or create DM conversation
  POST /api/v1/dm:
    auth: required
    body:
      userId: string
    response:
      conversation: DMConversation

  # Get DM messages
  GET /api/v1/dm/{conversationId}/messages:
    auth: required
    query:
      limit: number
      before: string
    response:
      messages: DirectMessage[]
      hasMore: boolean

# File Upload APIs
files:
  # Upload file
  POST /api/v1/upload:
    auth: required
    content-type: multipart/form-data
    body:
      file: File
      channelId: string
    response:
      file: UploadedFile
```

### 6.2 WebSocket Events

```yaml
# Client -> Server Events
client_events:
  # Send message
  message:send:
    payload:
      clientId: string
      channelId: string
      content: string
      type: 'text' | 'code'
      replyToId?: string
      threadId?: string
      attachments?: string[] # Uploaded file IDs
    response:
      success: boolean
      message?: Message
      error?: { code: string, message: string }

  # Join channel
  channel:join:
    payload:
      channelId: string
    response:
      success: boolean
      channel?: Channel
      recentMessages?: Message[]

  # Leave channel
  channel:leave:
    payload:
      channelId: string

  # Mark as read
  channel:read:
    payload:
      channelId: string
      messageId: string # Last read message

  # Typing indicator
  typing:start:
    payload:
      channelId: string

  typing:stop:
    payload:
      channelId: string

  # Presence update
  presence:update:
    payload:
      status: 'online' | 'away' | 'dnd'
      statusMessage?: string

# Server -> Client Events
server_events:
  # New message
  message:new:
    payload:
      message: Message

  # Message updated
  message:updated:
    payload:
      message: Message

  # Message deleted
  message:deleted:
    payload:
      channelId: string
      messageId: string

  # Reaction added
  reaction:added:
    payload:
      messageId: string
      emoji: string
      userId: string

  # Reaction removed
  reaction:removed:
    payload:
      messageId: string
      emoji: string
      userId: string

  # Typing indicator
  typing:update:
    payload:
      channelId: string
      userId: string
      isTyping: boolean

  # Presence change
  presence:change:
    payload:
      userId: string
      status: 'online' | 'away' | 'dnd' | 'offline'
      lastSeen?: string

  # User joined channel
  member:joined:
    payload:
      channelId: string
      member: ChannelMember

  # User left channel
  member:left:
    payload:
      channelId: string
      userId: string

  # Channel updated
  channel:updated:
    payload:
      channel: Channel

  # Error event
  error:
    payload:
      code: string
      message: string
      details?: any
```

---

## 7. Technology Comparison Matrix

| Requirement | Option A | Option B | Option C | Selected |
|-------------|----------|----------|----------|----------|
| **Real-time Protocol** | WebSocket (Socket.IO) | SSE | WebRTC | **Socket.IO** |
| **Message Broker** | Redis Pub/Sub | Kafka | NATS | **Redis** |
| **Primary Database** | PostgreSQL | MongoDB | CockroachDB | **PostgreSQL** |
| **Cache** | Redis | Memcached | - | **Redis** |
| **Search** | PostgreSQL FTS | Elasticsearch | Meilisearch | **PG FTS → ES** |
| **File Storage** | S3 + CloudFront | GCS + CDN | Cloudflare R2 | **S3 + CloudFront** |
| **Push Notifications** | FCM + APNs | OneSignal | Pusher | **FCM + APNs** |

---

## 8. Deliverables Summary

| Deliverable | Status | Location |
|-------------|--------|----------|
| Messaging Architecture Diagram | ✅ Complete | Section 1.2 |
| Technology Comparison Matrix | ✅ Complete | Section 7 |
| Data Model Schemas | ✅ Complete | Section 2.2 |
| API Endpoint Specifications | ✅ Complete | Section 6 |
| Message Flow Diagram | ✅ Complete | Section 3.1 |
| Presence Tracking | ✅ Complete | Section 2.4 |
| Delivery Guarantees | ✅ Complete | Section 5 |
| Feature Implementation | ✅ Complete | Section 4 |
