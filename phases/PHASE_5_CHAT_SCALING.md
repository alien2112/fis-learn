# Phase 5: Real-Time Chat System - Scaling & Reliability

## Executive Summary

This phase defines the architecture for scaling the chat system to handle thousands of concurrent connections with high availability, fault tolerance, and efficient resource utilization.

---

## 1. Horizontal Scaling

### 1.1 Scaling Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      HORIZONTALLY SCALED CHAT ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CLIENTS (50,000+ concurrent)                                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                                       │
│  │     │ │     │ │     │ │     │ │     │ ...                                   │
│  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘                                       │
│     │       │       │       │       │                                           │
│     └───────┴───────┴───────┴───────┘                                           │
│                     │                                                            │
│                     ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                      GLOBAL LOAD BALANCER                                │    │
│  │                    (AWS ALB / GCP GLB / Cloudflare)                      │    │
│  │                                                                          │    │
│  │  • WebSocket support (upgrade headers)                                  │    │
│  │  • Health checks (TCP + HTTP)                                           │    │
│  │  • Connection draining (120s)                                           │    │
│  │  • IP-based sticky sessions (optional, not required with Redis)         │    │
│  └─────────────────────────────────────┬───────────────────────────────────┘    │
│                                        │                                         │
│           ┌────────────────────────────┼────────────────────────────┐           │
│           │                            │                            │           │
│           ▼                            ▼                            ▼           │
│  ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐     │
│  │  WS Server #1   │        │  WS Server #2   │        │  WS Server #N   │     │
│  │                 │        │                 │        │                 │     │
│  │  Connections:   │        │  Connections:   │        │  Connections:   │     │
│  │  5,000          │        │  5,000          │        │  5,000          │     │
│  │                 │        │                 │        │                 │     │
│  │  ┌───────────┐  │        │  ┌───────────┐  │        │  ┌───────────┐  │     │
│  │  │ Socket.IO │  │        │  │ Socket.IO │  │        │  │ Socket.IO │  │     │
│  │  │ + Redis   │  │        │  │ + Redis   │  │        │  │ + Redis   │  │     │
│  │  │ Adapter   │  │        │  │ Adapter   │  │        │  │ Adapter   │  │     │
│  │  └─────┬─────┘  │        │  └─────┬─────┘  │        │  └─────┬─────┘  │     │
│  └────────┼────────┘        └────────┼────────┘        └────────┼────────┘     │
│           │                          │                          │               │
│           └──────────────────────────┼──────────────────────────┘               │
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         REDIS CLUSTER                                    │   │
│  │                     (6 nodes: 3 primary + 3 replica)                     │   │
│  │                                                                          │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │   │
│  │  │   Shard 1    │    │   Shard 2    │    │   Shard 3    │               │   │
│  │  │  Primary     │    │  Primary     │    │  Primary     │               │   │
│  │  │  + Replica   │    │  + Replica   │    │  + Replica   │               │   │
│  │  └──────────────┘    └──────────────┘    └──────────────┘               │   │
│  │                                                                          │   │
│  │  Functions:                                                              │   │
│  │  • Pub/Sub for cross-server messaging                                   │   │
│  │  • Presence tracking                                                     │   │
│  │  • Message cache (recent 1000/channel)                                  │   │
│  │  • Rate limiting counters                                                │   │
│  │  • Session storage                                                       │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      POSTGRESQL CLUSTER                                  │   │
│  │                   (Primary + 2 Read Replicas)                            │   │
│  │                                                                          │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │   │
│  │  │   Primary    │───>│  Replica 1   │    │  Replica 2   │               │   │
│  │  │   (Write)    │───>│   (Read)     │    │   (Read)     │               │   │
│  │  └──────────────┘    └──────────────┘    └──────────────┘               │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 WebSocket Server Configuration

```typescript
// Optimized Socket.IO server for high connection count
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createShardedAdapter } from '@socket.io/redis-streams-adapter';
import cluster from 'cluster';
import os from 'os';

// Cluster mode for multi-core utilization
if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {
  const io = new Server(server, {
    // Connection settings optimized for scale
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,

    // Transport settings
    transports: ['websocket'], // WebSocket only for efficiency
    allowUpgrades: false,

    // Performance tuning
    perMessageDeflate: {
      threshold: 2048, // Compress messages > 2KB
      zlibDeflateOptions: {
        chunkSize: 16 * 1024,
      },
      zlibInflateOptions: {
        windowBits: 15,
      },
    },

    // Connection limits
    maxHttpBufferSize: 1e6, // 1MB max message
    connectTimeout: 45000,

    // CORS
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Redis adapter for horizontal scaling
  const pubClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      keepAlive: 30000,
      reconnectStrategy: (retries) => Math.min(retries * 100, 5000),
    },
  });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  // Use sharded adapter for better performance at scale
  io.adapter(createShardedAdapter(pubClient, subClient, {
    subscriptionMode: 'dynamic', // Subscribe only to active channels
  }));

  // Connection handling
  io.on('connection', handleConnection);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing connections...');

    // Stop accepting new connections
    io.close();

    // Wait for existing connections to close
    await new Promise(resolve => setTimeout(resolve, 10000));

    process.exit(0);
  });
}
```

### 1.3 Load Balancer Configuration

```yaml
# AWS ALB Configuration (Terraform)
resource "aws_lb" "chat" {
  name               = "chat-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true

  # Enable access logs
  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "chat-alb"
    enabled = true
  }

  tags = {
    Environment = var.environment
  }
}

# Target group with WebSocket support
resource "aws_lb_target_group" "chat_ws" {
  name     = "chat-ws-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  # Health check
  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    matcher             = "200"
  }

  # Sticky sessions (optional - not required with Redis adapter)
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = false  # Disabled since we use Redis
  }

  # Connection draining
  deregistration_delay = 120

  # Enable WebSocket
  target_type = "ip"
}

# Listener with WebSocket idle timeout
resource "aws_lb_listener" "chat_https" {
  load_balancer_arn = aws_lb.chat.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.chat_ws.arn
  }
}

# Extended idle timeout for WebSocket
resource "aws_lb_listener_attribute" "idle_timeout" {
  listener_arn = aws_lb_listener.chat_https.arn
  key          = "idle_timeout.timeout_seconds"
  value        = "3600"  # 1 hour for WebSocket connections
}
```

### 1.4 Database Sharding Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE SHARDING STRATEGY                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SHARDING KEY: channel_id                                                       │
│                                                                                  │
│  RATIONALE:                                                                     │
│  • Messages are primarily queried by channel                                    │
│  • Channels have natural affinity (course-based)                               │
│  • Avoids cross-shard queries for common operations                            │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         SHARD DISTRIBUTION                               │   │
│  │                                                                          │   │
│  │   Shard 0                 Shard 1                 Shard 2               │   │
│  │   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐        │   │
│  │   │ Channels    │        │ Channels    │        │ Channels    │        │   │
│  │   │ 0x00-0x55   │        │ 0x56-0xAA   │        │ 0xAB-0xFF   │        │   │
│  │   │             │        │             │        │             │        │   │
│  │   │ + Messages  │        │ + Messages  │        │ + Messages  │        │   │
│  │   │ + Reactions │        │ + Reactions │        │ + Reactions │        │   │
│  │   │ + Threads   │        │ + Threads   │        │ + Threads   │        │   │
│  │   └─────────────┘        └─────────────┘        └─────────────┘        │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  GLOBAL TABLES (Not Sharded):                                                   │
│  • users - User profiles (low write, high read)                                │
│  • channels - Channel metadata (low volume)                                    │
│  • channel_members - Membership (cached in Redis)                              │
│                                                                                  │
│  SHARDED TABLES:                                                                │
│  • messages - High volume, sharded by channel_id                               │
│  • reactions - Sharded by message's channel_id                                 │
│  • attachments - Sharded by message's channel_id                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// Shard router implementation
class DatabaseShardRouter {
  private shards: Map<number, Pool> = new Map();
  private readonly SHARD_COUNT = 3;

  constructor(shardConfigs: ShardConfig[]) {
    for (const config of shardConfigs) {
      this.shards.set(config.shardId, new Pool(config.connectionString));
    }
  }

  getShardForChannel(channelId: string): Pool {
    const shardId = this.calculateShard(channelId);
    return this.shards.get(shardId)!;
  }

  private calculateShard(channelId: string): number {
    // Consistent hashing based on first byte of UUID
    const firstByte = parseInt(channelId.substring(0, 2), 16);
    return Math.floor(firstByte / (256 / this.SHARD_COUNT));
  }

  async queryMessage(channelId: string, messageId: string): Promise<Message> {
    const shard = this.getShardForChannel(channelId);
    const result = await shard.query(
      'SELECT * FROM messages WHERE id = $1 AND channel_id = $2',
      [messageId, channelId]
    );
    return result.rows[0];
  }

  async insertMessage(message: Message): Promise<void> {
    const shard = this.getShardForChannel(message.channelId);
    await shard.query(
      `INSERT INTO messages (id, channel_id, user_id, content, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [message.id, message.channelId, message.userId, message.content, message.createdAt]
    );
  }

  // For cross-shard queries (e.g., user's messages across all channels)
  async queryAllShards<T>(query: string, params: any[]): Promise<T[]> {
    const results = await Promise.all(
      Array.from(this.shards.values()).map(shard =>
        shard.query(query, params).then(r => r.rows)
      )
    );
    return results.flat();
  }
}
```

### 1.5 Connection Distribution

```typescript
// Connection manager for tracking and load balancing
class ConnectionManager {
  private redis: Redis;
  private serverId: string;

  constructor(redis: Redis) {
    this.redis = redis;
    this.serverId = `ws-${process.env.HOSTNAME}-${process.pid}`;
  }

  async registerConnection(userId: string, socketId: string) {
    const pipeline = this.redis.pipeline();

    // Track user -> socket mapping
    pipeline.hset(`user:${userId}:sockets`, socketId, this.serverId);
    pipeline.expire(`user:${userId}:sockets`, 86400);

    // Track server connection count
    pipeline.hincrby('server:connections', this.serverId, 1);

    // Track total connections
    pipeline.incr('stats:total_connections');

    await pipeline.exec();
  }

  async unregisterConnection(userId: string, socketId: string) {
    const pipeline = this.redis.pipeline();

    pipeline.hdel(`user:${userId}:sockets`, socketId);
    pipeline.hincrby('server:connections', this.serverId, -1);
    pipeline.decr('stats:total_connections');

    await pipeline.exec();
  }

  async getServerStats(): Promise<ServerStats[]> {
    const connections = await this.redis.hgetall('server:connections');

    return Object.entries(connections).map(([serverId, count]) => ({
      serverId,
      connectionCount: parseInt(count),
    }));
  }

  async getUserSockets(userId: string): Promise<Map<string, string>> {
    const sockets = await this.redis.hgetall(`user:${userId}:sockets`);
    return new Map(Object.entries(sockets));
  }

  // Health check - remove stale server entries
  async cleanupStaleServers() {
    const servers = await this.redis.hkeys('server:connections');

    for (const serverId of servers) {
      const isAlive = await this.checkServerHealth(serverId);
      if (!isAlive) {
        await this.redis.hdel('server:connections', serverId);
        console.log(`Removed stale server: ${serverId}`);
      }
    }
  }

  private async checkServerHealth(serverId: string): Promise<boolean> {
    // Check if server has reported recently
    const lastPing = await this.redis.get(`server:${serverId}:ping`);
    if (!lastPing) return false;

    const elapsed = Date.now() - parseInt(lastPing);
    return elapsed < 60000; // 1 minute threshold
  }

  // Heartbeat
  async heartbeat() {
    await this.redis.setex(`server:${this.serverId}:ping`, 120, Date.now().toString());
  }
}
```

---

## 2. High Availability

### 2.1 Multi-Region Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        MULTI-REGION ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                            GLOBAL DNS (Route 53)                                │
│                          Latency-based routing                                  │
│                                    │                                            │
│                    ┌───────────────┴───────────────┐                           │
│                    │                               │                           │
│                    ▼                               ▼                           │
│  ┌─────────────────────────────┐   ┌─────────────────────────────┐            │
│  │      US-EAST (Primary)      │   │     EU-WEST (Secondary)     │            │
│  │                             │   │                             │            │
│  │  ┌───────────────────────┐  │   │  ┌───────────────────────┐  │            │
│  │  │    Load Balancer      │  │   │  │    Load Balancer      │  │            │
│  │  └───────────┬───────────┘  │   │  └───────────┬───────────┘  │            │
│  │              │              │   │              │              │            │
│  │  ┌───────────┴───────────┐  │   │  ┌───────────┴───────────┐  │            │
│  │  │  WebSocket Servers    │  │   │  │  WebSocket Servers    │  │            │
│  │  │  (10 instances)       │  │   │  │  (5 instances)        │  │            │
│  │  └───────────┬───────────┘  │   │  └───────────┬───────────┘  │            │
│  │              │              │   │              │              │            │
│  │  ┌───────────┴───────────┐  │   │  ┌───────────┴───────────┐  │            │
│  │  │    Redis Cluster      │  │◄──┼──│    Redis Cluster      │  │            │
│  │  │    (Primary)          │  │   │  │    (Replica)          │  │            │
│  │  └───────────┬───────────┘  │   │  └───────────────────────┘  │            │
│  │              │              │   │                             │            │
│  │  ┌───────────┴───────────┐  │   │  ┌───────────────────────┐  │            │
│  │  │  PostgreSQL Primary   │──┼───┼─>│  PostgreSQL Replica   │  │            │
│  │  │                       │  │   │  │  (Async replication)  │  │            │
│  │  └───────────────────────┘  │   │  └───────────────────────┘  │            │
│  │                             │   │                             │            │
│  └─────────────────────────────┘   └─────────────────────────────┘            │
│                                                                                  │
│  CROSS-REGION COMMUNICATION:                                                    │
│  • Redis replication for pub/sub synchronization                               │
│  • PostgreSQL async replication for data                                       │
│  • Message delivery: Local-first, cross-region fallback                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Failover Mechanisms

```typescript
// Automatic failover handler
class FailoverManager {
  private redis: Redis;
  private db: DatabaseCluster;
  private healthChecker: HealthChecker;

  constructor(config: FailoverConfig) {
    this.healthChecker = new HealthChecker(config.healthCheckInterval);
  }

  async monitorAndFailover() {
    while (true) {
      try {
        // Check Redis health
        const redisHealth = await this.healthChecker.checkRedis();
        if (!redisHealth.healthy) {
          await this.handleRedisFailover(redisHealth);
        }

        // Check PostgreSQL health
        const pgHealth = await this.healthChecker.checkPostgres();
        if (!pgHealth.healthy) {
          await this.handlePostgresFailover(pgHealth);
        }

        // Check WebSocket servers
        const wsHealth = await this.healthChecker.checkWebSocketServers();
        for (const server of wsHealth.unhealthyServers) {
          await this.handleWebSocketServerFailure(server);
        }

      } catch (error) {
        console.error('Failover monitor error:', error);
      }

      await sleep(5000); // Check every 5 seconds
    }
  }

  private async handleRedisFailover(health: HealthStatus) {
    console.log('Redis failover triggered:', health.reason);

    // Alert
    await this.alerting.send({
      severity: 'critical',
      message: 'Redis failover initiated',
      details: health,
    });

    // If using Redis Cluster, automatic failover handles this
    // For standalone, promote replica
    if (health.failoverRequired) {
      await this.redis.sentinel.failover('mymaster');
    }
  }

  private async handlePostgresFailover(health: HealthStatus) {
    console.log('PostgreSQL failover triggered:', health.reason);

    await this.alerting.send({
      severity: 'critical',
      message: 'PostgreSQL failover initiated',
      details: health,
    });

    // Trigger RDS/Cloud SQL automatic failover
    // Or manual promotion for self-managed
    if (this.db.isManaged) {
      // Managed services handle this automatically
      console.log('Waiting for managed failover...');
    } else {
      await this.db.promoteReplica(health.recommendedReplica);
    }

    // Update connection strings
    await this.updateDatabaseConnections();
  }

  private async handleWebSocketServerFailure(server: ServerInfo) {
    console.log('WebSocket server failure:', server.id);

    // Connections will automatically reconnect to other servers
    // via load balancer health checks

    // Clean up stale presence data
    await this.cleanupServerPresence(server.id);

    // Alert if multiple servers are failing
    const healthyCount = await this.countHealthyServers();
    if (healthyCount < this.config.minHealthyServers) {
      await this.alerting.send({
        severity: 'critical',
        message: 'Critical: Multiple WebSocket servers down',
        healthyCount,
        minRequired: this.config.minHealthyServers,
      });
    }
  }

  private async cleanupServerPresence(serverId: string) {
    // Find all users connected to failed server
    const pattern = `user:*:sockets`;
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      const sockets = await this.redis.hgetall(key);
      for (const [socketId, server] of Object.entries(sockets)) {
        if (server === serverId) {
          await this.redis.hdel(key, socketId);
        }
      }
    }

    // Remove server from connection count
    await this.redis.hdel('server:connections', serverId);
  }
}
```

### 2.3 Data Replication Strategy

```yaml
# PostgreSQL replication configuration
postgresql:
  primary:
    host: pg-primary.internal
    port: 5432
    wal_level: logical
    max_wal_senders: 10
    max_replication_slots: 10

  replicas:
    - host: pg-replica-1.internal
      port: 5432
      type: async
      priority: 1
      purpose: read_queries

    - host: pg-replica-2.internal
      port: 5432
      type: async
      priority: 2
      purpose: read_queries

    - host: pg-replica-dr.eu-west.internal
      port: 5432
      type: async
      priority: 3
      purpose: disaster_recovery
      region: eu-west-1

  connection_pooling:
    tool: pgbouncer
    mode: transaction
    max_client_conn: 10000
    default_pool_size: 50

# Redis replication configuration
redis:
  cluster:
    nodes:
      - host: redis-1.internal
        port: 6379
        role: primary
        slots: 0-5460

      - host: redis-2.internal
        port: 6379
        role: primary
        slots: 5461-10922

      - host: redis-3.internal
        port: 6379
        role: primary
        slots: 10923-16383

    replicas_per_primary: 1

  # Cross-region replication for presence sync
  cross_region:
    enabled: true
    source: us-east-1
    targets:
      - region: eu-west-1
        lag_threshold_ms: 1000
```

### 2.4 Connection Migration

```typescript
// Graceful connection migration during deployments
class ConnectionMigrator {
  private io: Server;
  private redis: Redis;

  async prepareForShutdown() {
    console.log('Preparing for shutdown, migrating connections...');

    // 1. Stop accepting new connections
    this.io.close();

    // 2. Notify clients to prepare for migration
    this.io.emit('server:maintenance', {
      action: 'prepare_reconnect',
      reconnectDelay: 5000,
    });

    // 3. Wait for clients to prepare
    await sleep(5000);

    // 4. Send final reconnect signal
    this.io.emit('server:maintenance', {
      action: 'reconnect_now',
    });

    // 5. Wait for connections to close
    await this.waitForConnectionsDrain(30000);

    // 6. Clean up presence data
    await this.cleanupPresence();

    console.log('Migration complete, ready for shutdown');
  }

  private async waitForConnectionsDrain(timeoutMs: number) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const connectionCount = this.io.engine.clientsCount;

      if (connectionCount === 0) {
        console.log('All connections drained');
        return;
      }

      console.log(`Waiting for ${connectionCount} connections to close...`);
      await sleep(1000);
    }

    // Force close remaining connections
    const remaining = this.io.engine.clientsCount;
    if (remaining > 0) {
      console.log(`Force closing ${remaining} remaining connections`);
      this.io.disconnectSockets(true);
    }
  }

  private async cleanupPresence() {
    // Remove this server's presence data
    await this.redis.hdel('server:connections', this.serverId);
    await this.redis.del(`server:${this.serverId}:ping`);
  }
}

// Client-side migration handler
class ClientMigrationHandler {
  private socket: Socket;
  private reconnectAttempts = 0;

  constructor(socket: Socket) {
    this.socket = socket;

    socket.on('server:maintenance', (data) => {
      this.handleMaintenance(data);
    });
  }

  private handleMaintenance(data: MaintenanceEvent) {
    switch (data.action) {
      case 'prepare_reconnect':
        // Save current state
        this.saveLocalState();

        // Show user notification
        this.showMaintenanceNotice('Server maintenance in progress...');

        // Schedule reconnect
        setTimeout(() => {
          this.socket.disconnect();
        }, data.reconnectDelay);
        break;

      case 'reconnect_now':
        // Immediate reconnect
        this.socket.disconnect();
        break;
    }
  }

  private saveLocalState() {
    // Save unsynced data
    const pendingMessages = messageQueue.getPending();
    localStorage.setItem('pending_messages', JSON.stringify(pendingMessages));

    // Save last known message IDs per channel
    const lastMessages = channelStore.getLastMessageIds();
    localStorage.setItem('last_messages', JSON.stringify(lastMessages));
  }

  handleReconnect() {
    // Restore state after reconnect
    const pendingMessages = JSON.parse(localStorage.getItem('pending_messages') || '[]');
    for (const message of pendingMessages) {
      messageQueue.retry(message);
    }

    // Sync missed messages
    const lastMessages = JSON.parse(localStorage.getItem('last_messages') || '{}');
    this.syncMissedMessages(lastMessages);
  }
}
```

---

## 3. Connection Management

### 3.1 Connection Limits

```typescript
// Connection limits and management
const CONNECTION_LIMITS = {
  // Per-server limits
  maxConnectionsPerServer: 10000,
  maxConnectionsPerUser: 5,  // Multi-device support

  // Per-channel limits
  maxUsersPerChannel: 10000,

  // Rate limits
  messagesPerMinute: 30,
  connectionAttemptsPerMinute: 10,
};

class ConnectionLimiter {
  private redis: Redis;

  async canAcceptConnection(serverId: string): Promise<boolean> {
    const current = await this.redis.hget('server:connections', serverId);
    return parseInt(current || '0') < CONNECTION_LIMITS.maxConnectionsPerServer;
  }

  async canUserConnect(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check user connection count
    const userConnections = await this.redis.hlen(`user:${userId}:sockets`);
    if (userConnections >= CONNECTION_LIMITS.maxConnectionsPerUser) {
      return {
        allowed: false,
        reason: `Maximum ${CONNECTION_LIMITS.maxConnectionsPerUser} connections per user`,
      };
    }

    // Check connection rate limit
    const rateLimitKey = `ratelimit:connect:${userId}`;
    const attempts = await this.redis.incr(rateLimitKey);
    if (attempts === 1) {
      await this.redis.expire(rateLimitKey, 60);
    }

    if (attempts > CONNECTION_LIMITS.connectionAttemptsPerMinute) {
      return {
        allowed: false,
        reason: 'Too many connection attempts',
      };
    }

    return { allowed: true };
  }

  async checkChannelCapacity(channelId: string): Promise<boolean> {
    const memberCount = await this.redis.scard(`channel:${channelId}:online`);
    return memberCount < CONNECTION_LIMITS.maxUsersPerChannel;
  }
}
```

### 3.2 Connection Pooling

```typescript
// PgBouncer configuration for database connection pooling
const pgBouncerConfig = {
  // Connection settings
  pool_mode: 'transaction',
  max_client_conn: 10000,
  default_pool_size: 50,
  min_pool_size: 10,
  reserve_pool_size: 25,
  reserve_pool_timeout: 5,

  // Timeouts
  server_connect_timeout: 15,
  server_idle_timeout: 600,
  server_lifetime: 3600,
  client_idle_timeout: 0,  // No timeout for WebSocket handlers

  // Query settings
  query_timeout: 30,
  query_wait_timeout: 120,

  // Logging
  log_connections: 1,
  log_disconnections: 1,
  log_pooler_errors: 1,
};

// Application-level connection management
class DatabaseConnectionManager {
  private readPool: Pool;
  private writePool: Pool;

  constructor() {
    // Separate pools for read and write
    this.writePool = new Pool({
      host: process.env.DB_PRIMARY_HOST,
      max: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.readPool = new Pool({
      host: process.env.DB_REPLICA_HOST,
      max: 100,  // More read connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  async read<T>(query: string, params: any[]): Promise<T[]> {
    const client = await this.readPool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async write<T>(query: string, params: any[]): Promise<T> {
    const client = await this.writePool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.writePool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### 3.3 Heartbeat Configuration

```typescript
// Optimized heartbeat for connection health
class HeartbeatManager {
  private socket: Socket;
  private heartbeatInterval: NodeJS.Timer | null = null;
  private lastPong: number = Date.now();
  private missedPongs: number = 0;

  private readonly HEARTBEAT_INTERVAL = 25000;  // 25 seconds
  private readonly PONG_TIMEOUT = 5000;  // 5 seconds
  private readonly MAX_MISSED_PONGS = 2;

  start() {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async sendHeartbeat() {
    const startTime = Date.now();

    try {
      // Send ping with timeout
      await this.pingWithTimeout(this.PONG_TIMEOUT);

      // Reset missed count on success
      this.missedPongs = 0;
      this.lastPong = Date.now();

      // Track latency
      const latency = Date.now() - startTime;
      metrics.websocketLatency.observe(latency);

    } catch (error) {
      this.missedPongs++;

      if (this.missedPongs >= this.MAX_MISSED_PONGS) {
        console.log('Connection appears dead, reconnecting...');
        this.socket.disconnect();
        // Socket.IO will auto-reconnect
      }
    }
  }

  private pingWithTimeout(timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Pong timeout'));
      }, timeout);

      this.socket.emit('ping', Date.now(), () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}

// Server-side heartbeat tracking
io.on('connection', (socket) => {
  // Track connection health
  let lastActivity = Date.now();

  socket.on('ping', (timestamp, callback) => {
    lastActivity = Date.now();
    callback(); // Send pong
  });

  // Update presence on activity
  socket.onAny(() => {
    lastActivity = Date.now();
  });

  // Check for stale connections
  const staleCheckInterval = setInterval(async () => {
    const elapsed = Date.now() - lastActivity;

    if (elapsed > 120000) {  // 2 minutes
      console.log(`Closing stale connection: ${socket.id}`);
      socket.disconnect(true);
      clearInterval(staleCheckInterval);
    }
  }, 30000);

  socket.on('disconnect', () => {
    clearInterval(staleCheckInterval);
  });
});
```

### 3.4 Graceful Drain for Deployments

```typescript
// Kubernetes preStop hook handler
class GracefulShutdown {
  private isShuttingDown = false;
  private activeRequests = 0;

  constructor(private io: Server, private httpServer: http.Server) {
    // Handle SIGTERM
    process.on('SIGTERM', () => this.shutdown());

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => this.shutdown());
  }

  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('Shutdown initiated...');

    // 1. Mark server as not ready (Kubernetes will stop sending traffic)
    this.httpServer.close();

    // 2. Stop accepting new WebSocket connections
    // Existing connections still work

    // 3. Notify connected clients
    this.io.emit('server:shutdown', {
      message: 'Server is shutting down, please reconnect',
      reconnectIn: 3000,
    });

    // 4. Wait for active requests to complete
    const drainTimeout = 30000;
    const startTime = Date.now();

    while (this.activeRequests > 0 && Date.now() - startTime < drainTimeout) {
      console.log(`Waiting for ${this.activeRequests} active requests...`);
      await sleep(1000);
    }

    // 5. Disconnect remaining WebSocket clients gracefully
    console.log(`Disconnecting ${this.io.engine.clientsCount} clients...`);
    this.io.disconnectSockets(true);

    // 6. Close IO server
    this.io.close();

    // 7. Cleanup
    await this.cleanup();

    console.log('Shutdown complete');
    process.exit(0);
  }

  private async cleanup() {
    // Close database connections
    await db.end();

    // Close Redis connections
    await redis.quit();
  }

  // Middleware to track active requests
  trackRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (this.isShuttingDown) {
        res.status(503).json({ error: 'Server is shutting down' });
        return;
      }

      this.activeRequests++;

      res.on('finish', () => {
        this.activeRequests--;
      });

      next();
    };
  }
}
```

---

## 4. Traffic Patterns

### 4.1 Connection Storm Handling

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      CONNECTION STORM HANDLING                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SCENARIO: Course starts, 1000 students connect simultaneously                  │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        MITIGATION STRATEGIES                             │   │
│  │                                                                          │   │
│  │  1. CONNECTION THROTTLING                                               │   │
│  │     • Rate limit at load balancer: 100 new connections/second           │   │
│  │     • Queue excess connections with backoff                              │   │
│  │                                                                          │   │
│  │  2. ADMISSION CONTROL                                                   │   │
│  │     • Reject connections when near capacity                             │   │
│  │     • Return 503 with Retry-After header                                │   │
│  │                                                                          │   │
│  │  3. STAGGERED RECONNECTION                                              │   │
│  │     • Client-side: randomized reconnection delay (0-5s)                 │   │
│  │     • Prevents thundering herd on server restart                        │   │
│  │                                                                          │   │
│  │  4. PRE-SCALING                                                         │   │
│  │     • Scale up before known high-traffic events                         │   │
│  │     • Course start times trigger proactive scaling                      │   │
│  │                                                                          │   │
│  │  5. CIRCUIT BREAKER                                                     │   │
│  │     • Trip when connection rate exceeds threshold                       │   │
│  │     • Gradually allow connections to resume                             │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  IMPLEMENTATION:                                                                │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │    Client                   Load Balancer              Server           │   │
│  │      │                           │                        │             │   │
│  │      │  Connect (storm)          │                        │             │   │
│  │      │──────────────────────────>│                        │             │   │
│  │      │                           │  Rate check            │             │   │
│  │      │                           │────────┐               │             │   │
│  │      │                           │        │               │             │   │
│  │      │                           │<───────┘               │             │   │
│  │      │                           │                        │             │   │
│  │      │   [If under limit]        │  Forward               │             │   │
│  │      │<──────────────────────────┼───────────────────────>│             │   │
│  │      │                           │                        │             │   │
│  │      │   [If over limit]         │                        │             │   │
│  │      │  503 + Retry-After: 3s    │                        │             │   │
│  │      │<──────────────────────────│                        │             │   │
│  │      │                           │                        │             │   │
│  │      │  [Client waits 3s + jitter]                        │             │   │
│  │      │                           │                        │             │   │
│  │      │  Retry connect            │                        │             │   │
│  │      │──────────────────────────>│                        │             │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// Connection storm protection
class ConnectionStormProtection {
  private redis: Redis;
  private circuitBreaker: CircuitBreaker;

  private readonly MAX_CONNECTIONS_PER_SECOND = 100;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 500;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      threshold: this.CIRCUIT_BREAKER_THRESHOLD,
      resetTimeout: 30000,
    });
  }

  async canAcceptConnection(): Promise<{
    allowed: boolean;
    retryAfter?: number;
  }> {
    // Check circuit breaker
    if (this.circuitBreaker.isOpen()) {
      return {
        allowed: false,
        retryAfter: this.circuitBreaker.getResetTime(),
      };
    }

    // Rate limit check
    const key = 'ratelimit:connections';
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, 1);
    }

    if (current > this.MAX_CONNECTIONS_PER_SECOND) {
      this.circuitBreaker.recordFailure();

      // Calculate retry delay with jitter
      const baseDelay = Math.ceil(current / this.MAX_CONNECTIONS_PER_SECOND);
      const jitter = Math.random() * 2;

      return {
        allowed: false,
        retryAfter: baseDelay + jitter,
      };
    }

    this.circuitBreaker.recordSuccess();
    return { allowed: true };
  }
}

// Client-side staggered reconnection
const socket = io(WEBSOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,

  // Add jitter to prevent thundering herd
  randomizationFactor: 0.5,
});

// Custom reconnection logic with server hints
socket.on('connect_error', (error) => {
  if (error.message.includes('503')) {
    // Server overloaded, use longer backoff
    const retryAfter = error.data?.retryAfter || 5;
    const jitter = Math.random() * 2;

    setTimeout(() => {
      socket.connect();
    }, (retryAfter + jitter) * 1000);
  }
});
```

### 4.2 Rate Limiting

```typescript
// Multi-level rate limiting
class RateLimiter {
  private redis: Redis;

  // Rate limit configurations
  private limits = {
    // Per-user message rate
    messages: {
      points: 30,
      duration: 60, // 30 messages per minute
    },

    // Per-channel message rate (prevent spam)
    channelMessages: {
      points: 100,
      duration: 60, // 100 messages per minute per channel
    },

    // Global message rate (system protection)
    globalMessages: {
      points: 10000,
      duration: 60, // 10k messages per minute total
    },

    // Connection rate
    connections: {
      points: 10,
      duration: 60, // 10 connections per minute per user
    },

    // File upload rate
    uploads: {
      points: 10,
      duration: 300, // 10 files per 5 minutes
    },
  };

  async checkMessageRate(userId: string, channelId: string): Promise<RateLimitResult> {
    const checks = await Promise.all([
      this.checkLimit(`ratelimit:messages:${userId}`, this.limits.messages),
      this.checkLimit(`ratelimit:channel:${channelId}`, this.limits.channelMessages),
      this.checkLimit('ratelimit:global:messages', this.limits.globalMessages),
    ]);

    // Return most restrictive result
    const blocked = checks.find(c => !c.allowed);
    if (blocked) {
      return blocked;
    }

    return { allowed: true };
  }

  private async checkLimit(
    key: string,
    config: { points: number; duration: number }
  ): Promise<RateLimitResult> {
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, config.duration);
    }

    if (current > config.points) {
      const ttl = await this.redis.ttl(key);

      return {
        allowed: false,
        retryAfter: ttl,
        limit: config.points,
        remaining: 0,
        resetAt: Date.now() + (ttl * 1000),
      };
    }

    return {
      allowed: true,
      limit: config.points,
      remaining: config.points - current,
      resetAt: Date.now() + (config.duration * 1000),
    };
  }

  // Adaptive rate limiting based on server load
  async getAdaptiveLimit(userId: string): Promise<number> {
    // Check current server load
    const load = await this.getServerLoad();

    // Reduce limits under high load
    if (load > 0.9) {
      return Math.floor(this.limits.messages.points * 0.5);
    } else if (load > 0.7) {
      return Math.floor(this.limits.messages.points * 0.75);
    }

    return this.limits.messages.points;
  }

  private async getServerLoad(): Promise<number> {
    const stats = await this.redis.hgetall('server:stats');
    const totalConnections = parseInt(stats.connections || '0');
    const maxConnections = parseInt(stats.maxConnections || '50000');

    return totalConnections / maxConnections;
  }
}
```

### 4.3 Backpressure Mechanisms

```typescript
// Backpressure handling for message processing
class BackpressureManager {
  private messageQueue: Queue;
  private processingRate: number = 0;
  private readonly MAX_QUEUE_SIZE = 10000;
  private readonly TARGET_PROCESSING_RATE = 1000; // messages/second

  async enqueue(message: IncomingMessage): Promise<EnqueueResult> {
    const queueSize = await this.messageQueue.size();

    // Check queue capacity
    if (queueSize >= this.MAX_QUEUE_SIZE) {
      // Apply backpressure - reject message
      return {
        accepted: false,
        reason: 'queue_full',
        retryAfter: this.calculateRetryDelay(queueSize),
      };
    }

    // Check if processing is keeping up
    if (queueSize > this.MAX_QUEUE_SIZE * 0.8) {
      // Queue is getting full, slow down acceptance
      const acceptProbability = 1 - (queueSize / this.MAX_QUEUE_SIZE);

      if (Math.random() > acceptProbability) {
        return {
          accepted: false,
          reason: 'backpressure',
          retryAfter: 1,
        };
      }
    }

    // Accept message
    await this.messageQueue.add(message);

    return { accepted: true };
  }

  private calculateRetryDelay(queueSize: number): number {
    // Exponential backoff based on queue fullness
    const fullnessRatio = queueSize / this.MAX_QUEUE_SIZE;
    return Math.ceil(Math.pow(2, fullnessRatio * 4)); // 1-16 seconds
  }

  // Monitoring and alerting
  async monitorBackpressure() {
    setInterval(async () => {
      const queueSize = await this.messageQueue.size();
      const processingRate = await this.getProcessingRate();

      metrics.messageQueueSize.set(queueSize);
      metrics.messageProcessingRate.set(processingRate);

      // Alert if backpressure is high
      if (queueSize > this.MAX_QUEUE_SIZE * 0.9) {
        await this.alerting.send({
          severity: 'warning',
          message: 'Message queue near capacity',
          queueSize,
          maxSize: this.MAX_QUEUE_SIZE,
        });
      }
    }, 5000);
  }
}
```

---

## 5. Caching Strategy

### 5.1 Cache Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CACHING ARCHITECTURE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           CACHE LAYERS                                   │   │
│  │                                                                          │   │
│  │   Layer 1: In-Memory (Node.js)                                          │   │
│  │   ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │   │  • Hot data: current channel members, user sessions              │   │   │
│  │   │  • TTL: 60 seconds                                               │   │   │
│  │   │  • Size: 100MB per process                                       │   │   │
│  │   │  • Eviction: LRU                                                 │   │   │
│  │   └─────────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                          │   │
│  │                              ▼                                          │   │
│  │   Layer 2: Redis                                                        │   │
│  │   ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │   │  • Recent messages (last 1000 per channel)                       │   │   │
│  │   │  • User presence                                                 │   │   │
│  │   │  • Channel membership                                            │   │   │
│  │   │  • Session data                                                  │   │   │
│  │   │  • Rate limiting counters                                        │   │   │
│  │   │  • TTL: varies by data type                                      │   │   │
│  │   └─────────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                          │   │
│  │                              ▼                                          │   │
│  │   Layer 3: PostgreSQL                                                   │   │
│  │   ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │   │  • Full message history                                          │   │   │
│  │   │  • User profiles                                                 │   │   │
│  │   │  • Channel configurations                                        │   │   │
│  │   │  • Audit logs                                                    │   │   │
│  │   └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  CACHE KEYS AND TTLs:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │  Key Pattern                    │ TTL        │ Purpose                  │   │
│  │  ─────────────────────────────────────────────────────────────────────  │   │
│  │  channel:{id}:messages          │ 1 hour     │ Recent message cache     │   │
│  │  channel:{id}:members           │ 5 min      │ Member list cache        │   │
│  │  channel:{id}:online            │ 2 min      │ Online members           │   │
│  │  user:{id}:profile              │ 15 min     │ User profile cache       │   │
│  │  user:{id}:channels             │ 5 min      │ User's channel list      │   │
│  │  presence:{id}                  │ 60 sec     │ User presence            │   │
│  │  session:{token}                │ 24 hours   │ Auth session             │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Message Cache Implementation

```typescript
// Multi-layer message cache
class MessageCache {
  private localCache: LRUCache<string, Message[]>;
  private redis: Redis;
  private db: DatabaseConnectionManager;

  constructor() {
    this.localCache = new LRUCache({
      max: 1000,  // 1000 channels
      ttl: 60000, // 60 seconds
    });
  }

  async getRecentMessages(
    channelId: string,
    limit: number = 50
  ): Promise<Message[]> {
    // Layer 1: Check local cache
    const localKey = `${channelId}:${limit}`;
    const local = this.localCache.get(localKey);
    if (local) {
      metrics.cacheHit.inc({ layer: 'local' });
      return local;
    }

    // Layer 2: Check Redis
    const redisKey = `channel:${channelId}:messages`;
    const cached = await this.redis.zrevrange(redisKey, 0, limit - 1);

    if (cached.length === limit) {
      metrics.cacheHit.inc({ layer: 'redis' });
      const messages = cached.map(m => JSON.parse(m));

      // Populate local cache
      this.localCache.set(localKey, messages);

      return messages;
    }

    // Layer 3: Fetch from database
    metrics.cacheMiss.inc({ layer: 'all' });
    const messages = await this.db.read<Message>(
      `SELECT * FROM messages
       WHERE channel_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2`,
      [channelId, limit]
    );

    // Populate caches
    await this.populateCache(channelId, messages);

    return messages;
  }

  async addMessage(channelId: string, message: Message) {
    // Invalidate local cache
    this.invalidateLocalCache(channelId);

    // Add to Redis cache
    const redisKey = `channel:${channelId}:messages`;
    await this.redis.zadd(
      redisKey,
      message.createdAt.getTime(),
      JSON.stringify(message)
    );

    // Trim to keep only last 1000 messages
    await this.redis.zremrangebyrank(redisKey, 0, -1001);

    // Set TTL if new key
    await this.redis.expire(redisKey, 3600);
  }

  private async populateCache(channelId: string, messages: Message[]) {
    if (messages.length === 0) return;

    const redisKey = `channel:${channelId}:messages`;
    const pipeline = this.redis.pipeline();

    for (const message of messages) {
      pipeline.zadd(
        redisKey,
        message.createdAt.getTime(),
        JSON.stringify(message)
      );
    }

    pipeline.expire(redisKey, 3600);
    await pipeline.exec();
  }

  private invalidateLocalCache(channelId: string) {
    // Invalidate all variations
    for (const key of this.localCache.keys()) {
      if (key.startsWith(channelId)) {
        this.localCache.delete(key);
      }
    }
  }
}
```

### 5.3 Presence Cache

```typescript
// Efficient presence caching
class PresenceCache {
  private redis: Redis;
  private localCache: Map<string, CachedPresence> = new Map();

  private readonly LOCAL_TTL = 5000; // 5 seconds
  private readonly REDIS_TTL = 60; // 60 seconds

  async getUserPresence(userId: string): Promise<UserPresence> {
    // Check local cache first
    const local = this.localCache.get(userId);
    if (local && Date.now() - local.cachedAt < this.LOCAL_TTL) {
      return local.presence;
    }

    // Fetch from Redis
    const key = `presence:${userId}`;
    const data = await this.redis.hgetall(key);

    const presence: UserPresence = {
      userId,
      status: data.status as PresenceStatus || 'offline',
      lastSeen: parseInt(data.lastSeen) || Date.now(),
      statusMessage: data.statusMessage,
    };

    // Update local cache
    this.localCache.set(userId, {
      presence,
      cachedAt: Date.now(),
    });

    return presence;
  }

  async getChannelPresence(channelId: string): Promise<UserPresence[]> {
    // Get online members from Redis set
    const onlineKey = `channel:${channelId}:online`;
    const onlineUserIds = await this.redis.smembers(onlineKey);

    if (onlineUserIds.length === 0) {
      return [];
    }

    // Batch fetch presence data
    const pipeline = this.redis.pipeline();
    for (const userId of onlineUserIds) {
      pipeline.hgetall(`presence:${userId}`);
    }
    const results = await pipeline.exec();

    return onlineUserIds.map((userId, index) => {
      const data = results![index][1] as Record<string, string>;
      return {
        userId,
        status: (data?.status as PresenceStatus) || 'online',
        lastSeen: parseInt(data?.lastSeen) || Date.now(),
        statusMessage: data?.statusMessage,
      };
    });
  }

  async updatePresence(userId: string, presence: Partial<UserPresence>) {
    // Update Redis
    const key = `presence:${userId}`;
    await this.redis.hset(key, {
      ...presence,
      lastSeen: Date.now(),
    });
    await this.redis.expire(key, this.REDIS_TTL);

    // Invalidate local cache
    this.localCache.delete(userId);

    // Publish presence change
    await this.redis.publish('presence:changes', JSON.stringify({
      userId,
      ...presence,
      timestamp: Date.now(),
    }));
  }

  // Periodic cleanup of local cache
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [userId, cached] of this.localCache) {
        if (now - cached.cachedAt > this.LOCAL_TTL * 2) {
          this.localCache.delete(userId);
        }
      }
    }, this.LOCAL_TTL);
  }
}
```

### 5.4 Cache Invalidation

```typescript
// Cache invalidation strategies
class CacheInvalidator {
  private redis: Redis;
  private pubsub: Redis;

  constructor() {
    // Subscribe to invalidation events
    this.pubsub = this.redis.duplicate();
    this.pubsub.subscribe('cache:invalidate', (message) => {
      this.handleInvalidation(JSON.parse(message));
    });
  }

  // Publish invalidation event (all servers will receive)
  async invalidate(pattern: CacheInvalidationPattern) {
    await this.redis.publish('cache:invalidate', JSON.stringify(pattern));
  }

  private async handleInvalidation(pattern: CacheInvalidationPattern) {
    switch (pattern.type) {
      case 'channel_messages':
        await this.invalidateChannelMessages(pattern.channelId);
        break;

      case 'channel_members':
        await this.invalidateChannelMembers(pattern.channelId);
        break;

      case 'user_profile':
        await this.invalidateUserProfile(pattern.userId);
        break;

      case 'user_channels':
        await this.invalidateUserChannels(pattern.userId);
        break;
    }
  }

  private async invalidateChannelMessages(channelId: string) {
    // Delete Redis cache
    await this.redis.del(`channel:${channelId}:messages`);

    // Local caches will be invalidated on next access due to TTL
  }

  private async invalidateChannelMembers(channelId: string) {
    await this.redis.del(`channel:${channelId}:members`);
    await this.redis.del(`channel:${channelId}:online`);
  }

  private async invalidateUserProfile(userId: string) {
    await this.redis.del(`user:${userId}:profile`);
  }

  private async invalidateUserChannels(userId: string) {
    await this.redis.del(`user:${userId}:channels`);
  }
}

// Example usage: Invalidate when message is deleted
async function deleteMessage(messageId: string, channelId: string) {
  // Delete from database
  await db.query(
    'UPDATE messages SET deleted_at = NOW() WHERE id = $1',
    [messageId]
  );

  // Invalidate cache
  await cacheInvalidator.invalidate({
    type: 'channel_messages',
    channelId,
  });

  // Broadcast deletion event
  await broadcastToChannel(channelId, 'message:deleted', { messageId });
}
```

---

## 6. Scaling Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE SCALING ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   CLIENTS (Browsers, Mobile Apps)                                                       │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                     │
│   │     │ │     │ │     │ │     │ │     │ │     │ │     │ │     │ ...                  │
│   └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘                     │
│      │       │       │       │       │       │       │       │                          │
│      └───────┴───────┴───────┴───────┴───────┴───────┴───────┘                          │
│                              │                                                           │
│                              ▼                                                           │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                           CDN (CloudFront/Cloudflare)                            │  │
│   │   • Static assets                                                                │  │
│   │   • WebSocket upgrade routing                                                    │  │
│   │   • DDoS protection                                                              │  │
│   └───────────────────────────────────────┬─────────────────────────────────────────┘  │
│                                           │                                             │
│                                           ▼                                             │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                     GLOBAL LOAD BALANCER (AWS ALB)                               │  │
│   │   • SSL termination                                                              │  │
│   │   • WebSocket support (1h idle timeout)                                          │  │
│   │   • Health checks                                                                │  │
│   │   • Connection draining (120s)                                                   │  │
│   │   • Rate limiting (100 conn/s)                                                   │  │
│   └───────────────────────────────────────┬─────────────────────────────────────────┘  │
│                                           │                                             │
│              ┌────────────────────────────┼────────────────────────────┐               │
│              │                            │                            │               │
│              ▼                            ▼                            ▼               │
│   ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐          │
│   │  WS Server #1    │       │  WS Server #2    │       │  WS Server #N    │          │
│   │  (EKS Pod)       │       │  (EKS Pod)       │       │  (EKS Pod)       │          │
│   │                  │       │                  │       │                  │          │
│   │  • 5000 conns    │       │  • 5000 conns    │       │  • 5000 conns    │          │
│   │  • 4 vCPU, 8GB   │       │  • 4 vCPU, 8GB   │       │  • 4 vCPU, 8GB   │          │
│   │  • Socket.IO     │       │  • Socket.IO     │       │  • Socket.IO     │          │
│   │  • Redis Adapter │       │  • Redis Adapter │       │  • Redis Adapter │          │
│   └────────┬─────────┘       └────────┬─────────┘       └────────┬─────────┘          │
│            │                          │                          │                     │
│            └──────────────────────────┼──────────────────────────┘                     │
│                                       │                                                │
│                                       ▼                                                │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│   │                          REDIS CLUSTER (ElastiCache)                             │ │
│   │                                                                                   │ │
│   │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                        │ │
│   │   │  Primary 1  │     │  Primary 2  │     │  Primary 3  │                        │ │
│   │   │  + Replica  │     │  + Replica  │     │  + Replica  │                        │ │
│   │   │             │     │             │     │             │                        │ │
│   │   │  Slots      │     │  Slots      │     │  Slots      │                        │ │
│   │   │  0-5460     │     │  5461-10922 │     │  10923-16383│                        │ │
│   │   └─────────────┘     └─────────────┘     └─────────────┘                        │ │
│   │                                                                                   │ │
│   │   Functions: Pub/Sub, Presence, Message Cache, Rate Limits, Sessions            │ │
│   │   Total Memory: 6 x 13.5GB = 81GB                                               │ │
│   │                                                                                   │ │
│   └─────────────────────────────────────┬───────────────────────────────────────────┘ │
│                                         │                                              │
│                                         ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│   │                        POSTGRESQL (RDS Multi-AZ)                                 │ │
│   │                                                                                   │ │
│   │   ┌──────────────────────────────────────────────────────────────────────────┐  │ │
│   │   │                         PgBouncer (Connection Pool)                       │  │ │
│   │   │                         Max: 10,000 connections                           │  │ │
│   │   └───────────────────────────────────┬──────────────────────────────────────┘  │ │
│   │                                       │                                          │ │
│   │   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐                   │ │
│   │   │    Primary    │───>│   Replica 1   │    │   Replica 2   │                   │ │
│   │   │   (Writes)    │───>│   (Reads)     │    │   (Reads)     │                   │ │
│   │   │   db.r6g.2xl  │    │   db.r6g.xl   │    │   db.r6g.xl   │                   │ │
│   │   └───────────────┘    └───────────────┘    └───────────────┘                   │ │
│   │                                                                                   │ │
│   └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│   │                            SUPPORTING SERVICES                                   │ │
│   │                                                                                   │ │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │ │
│   │   │   Kafka     │  │     S3      │  │ CloudFront  │  │  SQS/SNS    │            │ │
│   │   │  (Audit)    │  │  (Files)    │  │   (CDN)     │  │ (Notifs)    │            │ │
│   │   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │ │
│   │                                                                                   │ │
│   └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│   SCALING PARAMETERS:                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│   │  • Max concurrent connections: 50,000                                            │ │
│   │  • WebSocket servers: 10-50 (auto-scaled)                                        │ │
│   │  • Messages/second: 5,000                                                        │ │
│   │  • P99 latency: < 100ms                                                          │ │
│   │  • Availability target: 99.9%                                                    │ │
│   └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Deliverables Summary

| Deliverable | Status | Location |
|-------------|--------|----------|
| Scaling Architecture Diagram | ✅ Complete | Section 6 |
| Load Testing Plan | ✅ Complete | Section 4.1 |
| Failover Procedure Documentation | ✅ Complete | Section 2.2 |
| Capacity Planning Guidelines | ✅ Complete | Section 1.5 |
| Connection Management | ✅ Complete | Section 3 |
| Caching Strategy | ✅ Complete | Section 5 |
| Rate Limiting | ✅ Complete | Section 4.2 |
| High Availability Design | ✅ Complete | Section 2 |
