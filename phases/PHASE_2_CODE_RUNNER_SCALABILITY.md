# Phase 2: Code Runner IDE - Scalability & Performance

## Executive Summary

This phase defines the architecture for scaling the code execution system to handle thousands of concurrent users with minimal latency, efficient resource utilization, and cost optimization.

---

## 1. Architecture Pattern

### 1.1 High-Level Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        CODE EXECUTION ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   USERS                                                                          │
│     │                                                                            │
│     ▼                                                                            │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          CDN / EDGE                                      │   │
│   │                    (Static assets, WebSocket routing)                    │   │
│   └─────────────────────────────────┬───────────────────────────────────────┘   │
│                                     │                                            │
│                                     ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                      LOAD BALANCER (L7)                                  │   │
│   │                  (AWS ALB / GCP Cloud Load Balancer)                     │   │
│   │              • WebSocket support • Health checks • SSL termination       │   │
│   └─────────────────────────────────┬───────────────────────────────────────┘   │
│                                     │                                            │
│                    ┌────────────────┼────────────────┐                          │
│                    │                │                │                          │
│                    ▼                ▼                ▼                          │
│              ┌──────────┐    ┌──────────┐    ┌──────────┐                       │
│              │ API Pod  │    │ API Pod  │    │ API Pod  │  (Horizontal scale)  │
│              │    #1    │    │    #2    │    │    #N    │                       │
│              └────┬─────┘    └────┬─────┘    └────┬─────┘                       │
│                   │               │               │                              │
│                   └───────────────┼───────────────┘                              │
│                                   │                                              │
│                                   ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                        MESSAGE QUEUE                                     │   │
│   │                    (Redis Streams / AWS SQS)                             │   │
│   │                                                                          │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│   │   │  Priority   │  │  Standard   │  │  Python     │  │  Node.js    │    │   │
│   │   │  Queue      │  │  Queue      │  │  Queue      │  │  Queue      │    │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│   │                                                                          │   │
│   └─────────────────────────────────┬───────────────────────────────────────┘   │
│                                     │                                            │
│           ┌─────────────────────────┼─────────────────────────┐                 │
│           │                         │                         │                 │
│           ▼                         ▼                         ▼                 │
│   ┌───────────────┐         ┌───────────────┐         ┌───────────────┐        │
│   │ Worker Pool   │         │ Worker Pool   │         │ Worker Pool   │        │
│   │ (Python)      │         │ (Node.js)     │         │ (Java/C++)    │        │
│   │               │         │               │         │               │        │
│   │ ┌───────────┐ │         │ ┌───────────┐ │         │ ┌───────────┐ │        │
│   │ │ Pre-warm  │ │         │ │ Pre-warm  │ │         │ │ Pre-warm  │ │        │
│   │ │ Container │ │         │ │ Container │ │         │ │ Container │ │        │
│   │ │ Pool      │ │         │ │ Pool      │ │         │ │ Pool      │ │        │
│   │ └───────────┘ │         │ └───────────┘ │         │ └───────────┘ │        │
│   └───────────────┘         └───────────────┘         └───────────────┘        │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         RESULT STORE                                     │   │
│   │                      (Redis / DynamoDB)                                  │   │
│   │              • Execution results • Metrics • WebSocket notifications     │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Breakdown

| Component | Technology | Purpose | Scaling Strategy |
|-----------|------------|---------|------------------|
| API Gateway | Kong / AWS API Gateway | Request routing, auth | Horizontal + caching |
| API Servers | Node.js / Go | Handle requests, queue jobs | Horizontal (stateless) |
| Message Queue | Redis Streams | Decouple API from workers | Cluster mode |
| Worker Nodes | Kubernetes pods | Execute code | HPA based on queue depth |
| Container Pool | Pre-warmed containers | Reduce cold starts | Per-language pools |
| Result Store | Redis | Store execution results | Cluster mode |
| WebSocket | Socket.io / ws | Real-time output | Redis adapter for clustering |

### 1.3 Queue Design

```yaml
# Redis Streams configuration
queues:
  # Priority queue for premium users
  execution:priority:
    max_length: 10000
    consumer_groups:
      - name: workers-priority
        consumers: 20

  # Standard queue
  execution:standard:
    max_length: 50000
    consumer_groups:
      - name: workers-standard
        consumers: 50

  # Per-language queues (optional, for optimization)
  execution:python:
    max_length: 20000
  execution:javascript:
    max_length: 20000
  execution:java:
    max_length: 10000

# Message schema
message:
  id: "uuid"
  user_id: "string"
  language: "python|javascript|java|cpp|go|rust"
  version: "3.11"
  code: "base64-encoded"
  stdin: "base64-encoded"
  priority: "high|normal|low"
  timeout: 30
  memory_limit: 256
  created_at: "timestamp"
  correlation_id: "uuid"  # For tracking
```

### 1.4 Container Orchestration Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Kubernetes (EKS/GKE)** | Industry standard, rich ecosystem, HPA | Complexity, cost | **PRIMARY** |
| **AWS ECS + Fargate** | Serverless, simpler ops | Less control, slower scaling | Good alternative |
| **Nomad** | Simpler, fast scheduling | Smaller ecosystem | For specific use cases |
| **AWS Lambda** | Zero ops, instant scale | Cold starts, 15min limit | Hybrid approach possible |

**Recommended: Kubernetes with custom scheduler for execution pods**

---

## 2. Cold Start Optimization

### 2.1 Cold Start Analysis

| Language | Base Cold Start | With Dependencies | Target |
|----------|-----------------|-------------------|--------|
| Python | 800ms | 1.5-2s | < 500ms |
| Node.js | 400ms | 800ms-1s | < 300ms |
| Java | 2-3s | 4-5s | < 1s |
| Go | 100ms | 200ms | < 150ms |
| C/C++ | 50ms (compile: 2s) | 50ms | < 100ms (precompile) |

### 2.2 Pre-Warmed Container Pool Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRE-WARMED CONTAINER POOL                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   POOL MANAGER                                                           │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  • Monitors pool sizes                                            │  │
│   │  • Triggers replenishment                                         │  │
│   │  • Handles language distribution                                  │  │
│   │  • Adjusts based on demand patterns                              │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    WARM CONTAINER POOLS                          │   │
│   │                                                                   │   │
│   │   Python Pool          Node.js Pool         Java Pool            │   │
│   │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │   │
│   │   │ ████████    │     │ ██████      │     │ ████        │       │   │
│   │   │ 80 ready    │     │ 60 ready    │     │ 40 ready    │       │   │
│   │   │ min: 50     │     │ min: 40     │     │ min: 20     │       │   │
│   │   │ max: 200    │     │ max: 150    │     │ max: 100    │       │   │
│   │   └─────────────┘     └─────────────┘     └─────────────┘       │   │
│   │                                                                   │   │
│   │   Go Pool              C++ Pool            Rust Pool             │   │
│   │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │   │
│   │   │ ██          │     │ ██          │     │ █           │       │   │
│   │   │ 20 ready    │     │ 20 ready    │     │ 10 ready    │       │   │
│   │   │ min: 10     │     │ min: 10     │     │ min: 5      │       │   │
│   │   │ max: 50     │     │ max: 50     │     │ max: 30     │       │   │
│   │   └─────────────┘     └─────────────┘     └─────────────┘       │   │
│   │                                                                   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   LIFECYCLE:                                                             │
│   1. Container created → Runtime initialized → Marked READY             │
│   2. Request arrives → Container claimed → Code injected → Executed     │
│   3. Execution complete → Container destroyed → Pool replenished        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Pool Manager Implementation

```python
class ContainerPoolManager:
    def __init__(self, config: PoolConfig):
        self.pools = {
            'python': ContainerPool('python', min=50, max=200),
            'javascript': ContainerPool('javascript', min=40, max=150),
            'java': ContainerPool('java', min=20, max=100),
            'go': ContainerPool('go', min=10, max=50),
            'cpp': ContainerPool('cpp', min=10, max=50),
            'rust': ContainerPool('rust', min=5, max=30),
        }
        self.metrics = MetricsCollector()

    async def get_container(self, language: str) -> Container:
        pool = self.pools[language]

        # Try to get warm container (fast path)
        container = await pool.claim_warm_container(timeout_ms=100)
        if container:
            self.metrics.record('warm_hit', language)
            return container

        # Cold start fallback
        self.metrics.record('cold_start', language)
        return await self.create_container(language)

    async def maintain_pools(self):
        """Background task to maintain pool sizes"""
        while True:
            for language, pool in self.pools.items():
                current = pool.available_count()
                target = self.calculate_target(language)

                if current < target:
                    # Replenish pool
                    to_create = min(target - current, 10)  # Batch create
                    await pool.create_batch(to_create)

                elif current > pool.max_size:
                    # Trim excess
                    await pool.trim(current - pool.max_size)

            await asyncio.sleep(1)  # Check every second

    def calculate_target(self, language: str) -> int:
        """Dynamic target based on recent demand"""
        pool = self.pools[language]
        recent_demand = self.metrics.get_demand(language, window='5m')
        base_target = pool.min_size

        # Scale target with demand
        return min(
            max(base_target, int(recent_demand * 1.5)),
            pool.max_size
        )
```

### 2.4 Container Image Optimization

```dockerfile
# Multi-stage build for minimal image size
# Stage 1: Build dependencies
FROM python:3.11-slim as builder

RUN pip install --no-cache-dir \
    numpy==1.24.0 \
    pandas==2.0.0 \
    matplotlib==3.7.0

# Stage 2: Runtime image (distroless)
FROM gcr.io/distroless/python3-debian12:nonroot

# Copy only necessary files
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Pre-compile Python files
RUN python -m compileall /usr/local/lib/python3.11/site-packages

USER 65534
WORKDIR /workspace
```

**Image Size Targets:**
| Language | Full Image | Optimized | Target |
|----------|------------|-----------|--------|
| Python | 1.2GB | 180MB | < 200MB |
| Node.js | 900MB | 120MB | < 150MB |
| Java | 600MB | 200MB | < 250MB |
| Go | 800MB | 50MB | < 100MB |
| C++ | 1.5GB | 100MB | < 150MB |

### 2.5 Snapshot/Restore (Advanced)

```yaml
# Using Firecracker with snapshots
firecracker_config:
  # Create snapshot after runtime initialization
  snapshot:
    enabled: true
    path: /snapshots/{language}/{version}/
    create_after: "runtime_init"  # Before code execution

  # Restore from snapshot for fast starts
  restore:
    enabled: true
    target_latency_ms: 50

# Snapshot lifecycle
lifecycle:
  1_create_base_vm: "Boot microVM, load runtime"
  2_initialize: "Import common libraries, warm JIT"
  3_snapshot: "Pause VM, save memory state"
  4_restore: "Load snapshot, inject code, resume"
```

---

## 3. Execution Pipeline

### 3.1 Request Flow Sequence

```
┌──────┐     ┌─────────┐     ┌─────────┐     ┌───────┐     ┌────────┐     ┌──────┐
│Client│     │API GW   │     │API Svc  │     │Queue  │     │Worker  │     │Result│
└──┬───┘     └────┬────┘     └────┬────┘     └───┬───┘     └───┬────┘     └──┬───┘
   │              │               │              │              │             │
   │ POST /execute│               │              │              │             │
   │─────────────>│               │              │              │             │
   │              │ Validate/Auth │              │              │             │
   │              │──────────────>│              │              │             │
   │              │               │              │              │             │
   │              │ 202 Accepted  │              │              │             │
   │<─────────────│ {execution_id}│              │              │             │
   │              │               │              │              │             │
   │              │               │ Enqueue job  │              │             │
   │              │               │─────────────>│              │             │
   │              │               │              │              │             │
   │              │               │              │ Claim job    │             │
   │              │               │              │<─────────────│             │
   │              │               │              │              │             │
   │              │               │              │              │ Execute     │
   │              │               │              │              │────────┐    │
   │              │               │              │              │        │    │
   │ WS: output   │               │              │              │<───────┘    │
   │<─────────────│───────────────│──────────────│──────────────│             │
   │              │               │              │              │             │
   │              │               │              │              │ Store result│
   │              │               │              │              │────────────>│
   │              │               │              │              │             │
   │ WS: complete │               │              │              │             │
   │<─────────────│───────────────│──────────────│──────────────│─────────────│
   │              │               │              │              │             │
```

### 3.2 API Request Handler

```typescript
// POST /api/v1/execute
interface ExecuteRequest {
  language: 'python' | 'javascript' | 'java' | 'go' | 'cpp' | 'rust';
  version?: string;
  code: string;
  stdin?: string;
  timeout?: number;  // 1-30 seconds
  memory_limit?: number;  // 64-512 MB
}

interface ExecuteResponse {
  execution_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  websocket_url: string;  // For real-time output
  estimated_wait_ms?: number;
}

async function handleExecute(req: ExecuteRequest, user: User): Promise<ExecuteResponse> {
  // 1. Validate request
  validateRequest(req);

  // 2. Check user entitlements
  const limits = await getUserLimits(user);
  if (limits.concurrent_executions >= limits.max_concurrent) {
    throw new TooManyRequestsError('Concurrent execution limit reached');
  }

  // 3. Generate execution ID
  const executionId = generateUUID();

  // 4. Determine queue and priority
  const queue = user.subscription === 'premium' ? 'priority' : 'standard';

  // 5. Enqueue job
  await redis.xadd(`execution:${queue}`, '*', {
    id: executionId,
    user_id: user.id,
    language: req.language,
    version: req.version || getDefaultVersion(req.language),
    code: Buffer.from(req.code).toString('base64'),
    stdin: req.stdin ? Buffer.from(req.stdin).toString('base64') : '',
    timeout: req.timeout || 10,
    memory_limit: req.memory_limit || 256,
    created_at: Date.now(),
  });

  // 6. Track execution
  await redis.hset(`execution:${executionId}`, {
    status: 'queued',
    queued_at: Date.now(),
  });

  // 7. Return response
  return {
    execution_id: executionId,
    status: 'queued',
    websocket_url: `/ws/execution/${executionId}`,
    estimated_wait_ms: await estimateWaitTime(queue),
  };
}
```

### 3.3 Worker Process

```python
class ExecutionWorker:
    def __init__(self, language: str, pool_manager: ContainerPoolManager):
        self.language = language
        self.pool = pool_manager
        self.redis = Redis()

    async def run(self):
        """Main worker loop"""
        stream = f"execution:{self.language}"
        group = f"workers-{self.language}"

        while True:
            # Claim message from stream
            messages = await self.redis.xreadgroup(
                groupname=group,
                consumername=self.worker_id,
                streams={stream: '>'},
                count=1,
                block=5000  # 5s timeout
            )

            if not messages:
                continue

            for stream_name, entries in messages:
                for entry_id, job in entries:
                    try:
                        await self.execute(job)
                        await self.redis.xack(stream, group, entry_id)
                    except Exception as e:
                        await self.handle_failure(job, e, entry_id)

    async def execute(self, job: dict):
        execution_id = job['id']

        # Update status
        await self.update_status(execution_id, 'running')

        # Get container from pool
        container = await self.pool.get_container(job['language'])

        try:
            # Inject code and execute
            result = await container.run(
                code=base64.b64decode(job['code']),
                stdin=base64.b64decode(job.get('stdin', '')),
                timeout=int(job['timeout']),
                memory_limit=int(job['memory_limit']),
                on_output=lambda chunk: self.stream_output(execution_id, chunk)
            )

            # Store result
            await self.store_result(execution_id, result)

        finally:
            # Destroy container (never reuse for security)
            await container.destroy()

    async def stream_output(self, execution_id: str, chunk: bytes):
        """Stream output to WebSocket clients via Redis pub/sub"""
        await self.redis.publish(
            f"execution:{execution_id}:output",
            json.dumps({
                'type': 'output',
                'data': chunk.decode('utf-8', errors='replace')
            })
        )
```

### 3.4 WebSocket Handler for Real-Time Output

```typescript
// WebSocket handler for execution output streaming
class ExecutionWebSocket {
  private redis: Redis;
  private subscriptions: Map<string, WebSocket[]> = new Map();

  async handleConnection(ws: WebSocket, executionId: string) {
    // Validate execution exists and user has access
    const execution = await this.redis.hgetall(`execution:${executionId}`);
    if (!execution) {
      ws.close(4004, 'Execution not found');
      return;
    }

    // Subscribe to execution output
    const channel = `execution:${executionId}:output`;

    if (!this.subscriptions.has(executionId)) {
      this.subscriptions.set(executionId, []);

      // Subscribe to Redis channel
      await this.redis.subscribe(channel, (message) => {
        const clients = this.subscriptions.get(executionId) || [];
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      });
    }

    this.subscriptions.get(executionId)!.push(ws);

    // Send current status
    ws.send(JSON.stringify({
      type: 'status',
      status: execution.status,
      queued_at: execution.queued_at,
      started_at: execution.started_at,
    }));

    // Handle disconnect
    ws.on('close', () => {
      const clients = this.subscriptions.get(executionId);
      if (clients) {
        const index = clients.indexOf(ws);
        if (index > -1) clients.splice(index, 1);
      }
    });
  }
}
```

### 3.5 Timeout Handling

```python
async def execute_with_timeout(
    container: Container,
    code: str,
    timeout_seconds: int
) -> ExecutionResult:
    """Execute code with proper timeout handling"""

    async def watchdog(pid: int, timeout: int):
        """Kill process if it exceeds timeout"""
        await asyncio.sleep(timeout)
        try:
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass  # Already finished

    # Start execution
    process = await container.start_execution(code)

    # Start watchdog
    watchdog_task = asyncio.create_task(
        watchdog(process.pid, timeout_seconds)
    )

    try:
        # Wait for completion or timeout
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=timeout_seconds + 1  # Slightly longer than watchdog
        )

        return ExecutionResult(
            status='completed',
            exit_code=process.returncode,
            stdout=stdout,
            stderr=stderr,
            execution_time_ms=process.execution_time_ms,
            memory_used_bytes=process.memory_used_bytes,
        )

    except asyncio.TimeoutError:
        return ExecutionResult(
            status='timeout',
            exit_code=-1,
            stdout=process.partial_stdout,
            stderr='Execution timed out',
            execution_time_ms=timeout_seconds * 1000,
        )

    finally:
        watchdog_task.cancel()
        await container.cleanup()
```

---

## 4. Auto-Scaling

### 4.1 Scaling Metrics

```yaml
# Kubernetes HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: code-runner-workers-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: code-runner-workers

  minReplicas: 10
  maxReplicas: 200

  metrics:
    # Primary: Queue depth
    - type: External
      external:
        metric:
          name: redis_stream_length
          selector:
            matchLabels:
              queue: execution
        target:
          type: AverageValue
          averageValue: "5"  # 5 jobs per worker

    # Secondary: CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70

    # Secondary: Memory utilization
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 100  # Double capacity
          periodSeconds: 30
        - type: Pods
          value: 20
          periodSeconds: 30
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 300  # 5 min cooldown
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
      selectPolicy: Min
```

### 4.2 Custom Metrics Exporter

```python
# Prometheus metrics exporter for scaling decisions
from prometheus_client import Gauge, Counter, Histogram

# Queue metrics
queue_depth = Gauge(
    'code_runner_queue_depth',
    'Number of pending executions',
    ['queue', 'language']
)

# Execution metrics
execution_duration = Histogram(
    'code_runner_execution_duration_seconds',
    'Execution duration',
    ['language', 'status'],
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30]
)

# Worker metrics
warm_container_available = Gauge(
    'code_runner_warm_containers',
    'Available warm containers',
    ['language']
)

cold_start_rate = Gauge(
    'code_runner_cold_start_rate',
    'Percentage of executions requiring cold start',
    ['language']
)

class MetricsExporter:
    async def collect_metrics(self):
        while True:
            # Queue depths
            for queue in ['priority', 'standard']:
                for language in LANGUAGES:
                    depth = await redis.xlen(f"execution:{queue}:{language}")
                    queue_depth.labels(queue=queue, language=language).set(depth)

            # Container pool status
            for language, pool in container_pools.items():
                warm_container_available.labels(language=language).set(
                    pool.available_count()
                )

            await asyncio.sleep(5)
```

### 4.3 Scaling Policies by Time

```yaml
# Time-based scaling adjustments
scaling_schedule:
  # Weekday patterns
  weekday:
    - time: "08:00"
      min_replicas: 30
      reason: "Morning ramp-up"
    - time: "10:00"
      min_replicas: 50
      reason: "Peak learning hours"
    - time: "14:00"
      min_replicas: 60
      reason: "Afternoon peak"
    - time: "18:00"
      min_replicas: 40
      reason: "Evening wind-down"
    - time: "22:00"
      min_replicas: 15
      reason: "Night minimum"

  # Weekend patterns
  weekend:
    - time: "10:00"
      min_replicas: 20
    - time: "22:00"
      min_replicas: 10

  # Special events
  events:
    - name: "course_launch"
      min_replicas: 100
      duration: "4h"
```

### 4.4 Cost Optimization

```yaml
# Node pool configuration for cost efficiency
node_pools:
  # On-demand for baseline
  baseline:
    machine_type: "n2-standard-4"
    min_nodes: 5
    max_nodes: 20
    labels:
      pool: baseline
      preemptible: "false"

  # Spot/preemptible for burst capacity
  burst:
    machine_type: "n2-standard-4"
    min_nodes: 0
    max_nodes: 100
    preemptible: true  # 60-90% cost savings
    labels:
      pool: burst
      preemptible: "true"

# Worker scheduling
worker_scheduling:
  # Prefer spot instances for short-lived executions
  tolerations:
    - key: "cloud.google.com/gke-preemptible"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"

  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          preference:
            matchExpressions:
              - key: preemptible
                operator: In
                values: ["true"]
```

---

## 5. Performance Targets

### 5.1 Latency Targets

| Metric | P50 | P95 | P99 | Max |
|--------|-----|-----|-----|-----|
| **Queue wait time** | 50ms | 200ms | 500ms | 2s |
| **Cold start** | N/A | 500ms | 1s | 2s |
| **Warm start** | 10ms | 50ms | 100ms | 200ms |
| **Simple execution** (print hello) | 100ms | 300ms | 500ms | 1s |
| **Medium execution** (100 lines) | 500ms | 1s | 2s | 5s |
| **Complex execution** (loops, I/O) | 2s | 5s | 10s | 30s |
| **WebSocket latency** | 20ms | 50ms | 100ms | 200ms |

### 5.2 Throughput Targets

```yaml
throughput_targets:
  # Sustained load
  sustained:
    executions_per_second: 500
    concurrent_executions: 1000

  # Peak load
  peak:
    executions_per_second: 2000
    concurrent_executions: 5000
    duration: "30m"

  # Burst handling
  burst:
    executions_per_second: 5000
    duration: "5m"
    queue_buffer: 10000
```

### 5.3 Capacity Planning

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CAPACITY PLANNING MODEL                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  INPUTS:                                                                 │
│  • Concurrent users: 5,000                                               │
│  • Execution rate: 0.5 exec/user/minute (during active session)         │
│  • Active session rate: 20% of users                                     │
│  • Average execution time: 2s                                            │
│  • Peak multiplier: 3x                                                   │
│                                                                          │
│  CALCULATIONS:                                                           │
│                                                                          │
│  Base load:                                                              │
│  • Active users: 5,000 × 20% = 1,000 users                              │
│  • Executions/min: 1,000 × 0.5 = 500 exec/min = 8.3 exec/sec           │
│  • Concurrent executions: 8.3 × 2s = ~17 concurrent                     │
│                                                                          │
│  Peak load (3x):                                                         │
│  • Executions/sec: 25 exec/sec                                          │
│  • Concurrent executions: ~50 concurrent                                │
│                                                                          │
│  With safety margin (2x):                                                │
│  • Target capacity: 100 concurrent executions                           │
│  • Workers needed: 100 (1 execution per worker)                         │
│  • Warm containers: 150 (50% buffer)                                    │
│                                                                          │
│  RESOURCE REQUIREMENTS:                                                  │
│  • Worker pods: 100 × 2 vCPU = 200 vCPU                                │
│  • Worker memory: 100 × 512MB = 50GB RAM                                │
│  • Nodes (4 vCPU each): 50 nodes baseline                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Performance Benchmarking Plan

```yaml
benchmark_scenarios:
  # Scenario 1: Warm start performance
  warm_start:
    description: "Measure execution time with pre-warmed containers"
    setup:
      - Ensure container pools are full
      - No queued jobs
    test:
      - Submit 100 "hello world" executions
      - Measure time from request to first output
    success_criteria:
      p50: < 100ms
      p99: < 300ms

  # Scenario 2: Cold start performance
  cold_start:
    description: "Measure execution time with cold containers"
    setup:
      - Empty container pools
    test:
      - Submit 10 executions per language
      - Measure total time including container creation
    success_criteria:
      python_p99: < 1s
      java_p99: < 2s

  # Scenario 3: Sustained load
  sustained_load:
    description: "Verify system handles sustained load"
    test:
      - Ramp to 500 exec/sec over 5 minutes
      - Maintain for 30 minutes
      - Monitor queue depth, latency, errors
    success_criteria:
      error_rate: < 0.1%
      queue_depth: < 100
      p99_latency: < 2s

  # Scenario 4: Burst handling
  burst_handling:
    description: "Verify system handles traffic spikes"
    test:
      - Baseline: 100 exec/sec
      - Spike to 1000 exec/sec for 2 minutes
      - Return to baseline
    success_criteria:
      max_queue_depth: < 5000
      recovery_time: < 5 minutes
      no_dropped_requests: true

  # Scenario 5: Auto-scaling response
  auto_scaling:
    description: "Verify scaling responds appropriately"
    test:
      - Start with minimum replicas
      - Gradually increase load
      - Verify scale-up triggers
      - Reduce load
      - Verify scale-down after cooldown
    success_criteria:
      scale_up_time: < 2 minutes
      scale_down_time: < 10 minutes
```

---

## 6. Scalability Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         SCALABLE CODE EXECUTION ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  REGION: us-east-1                              REGION: eu-west-1 (future)          │
│  ┌─────────────────────────────────────────┐   ┌─────────────────────────────────┐  │
│  │                                         │   │                                 │  │
│  │   ┌─────────────────────────────────┐   │   │   (Mirror architecture)        │  │
│  │   │        GLOBAL LOAD BALANCER     │   │   │                                 │  │
│  │   │    (AWS Global Accelerator)     │   │   │                                 │  │
│  │   └───────────────┬─────────────────┘   │   └─────────────────────────────────┘  │
│  │                   │                     │                                        │
│  │   ┌───────────────▼─────────────────┐   │                                        │
│  │   │         APPLICATION LB          │   │                                        │
│  │   │   • SSL termination             │   │                                        │
│  │   │   • WebSocket support           │   │                                        │
│  │   │   • Health checks               │   │                                        │
│  │   └───────────────┬─────────────────┘   │                                        │
│  │                   │                     │                                        │
│  │   ┌───────────────┴───────────────┐     │                                        │
│  │   │                               │     │                                        │
│  │   ▼                               ▼     │                                        │
│  │ ┌─────────────┐             ┌─────────────┐                                      │
│  │ │ API Service │             │ WebSocket   │                                      │
│  │ │ (EKS)      │             │ Service     │                                      │
│  │ │ 5-20 pods  │             │ 3-10 pods   │                                      │
│  │ └─────┬───────┘             └──────┬──────┘                                      │
│  │       │                            │                                             │
│  │       └────────────┬───────────────┘                                             │
│  │                    │                                                             │
│  │   ┌────────────────▼────────────────┐                                           │
│  │   │         REDIS CLUSTER           │                                           │
│  │   │   • Execution queues            │                                           │
│  │   │   • Result store                │                                           │
│  │   │   • Pub/sub for WebSocket       │                                           │
│  │   │   • 6 nodes (3 primary + 3 replica)                                         │
│  │   └────────────────┬────────────────┘                                           │
│  │                    │                                                             │
│  │   ┌────────────────┴────────────────────────────────────────┐                   │
│  │   │                                                          │                   │
│  │   │              EXECUTION WORKER POOLS                      │                   │
│  │   │                                                          │                   │
│  │   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │                   │
│  │   │   │ Python Pool  │  │ Node.js Pool │  │ Java Pool    │  │                   │
│  │   │   │              │  │              │  │              │  │                   │
│  │   │   │ Workers:     │  │ Workers:     │  │ Workers:     │  │                   │
│  │   │   │ 20-100 pods  │  │ 15-80 pods   │  │ 10-50 pods   │  │                   │
│  │   │   │              │  │              │  │              │  │                   │
│  │   │   │ Warm pool:   │  │ Warm pool:   │  │ Warm pool:   │  │                   │
│  │   │   │ 50-200       │  │ 40-150       │  │ 20-100       │  │                   │
│  │   │   └──────────────┘  └──────────────┘  └──────────────┘  │                   │
│  │   │                                                          │                   │
│  │   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │                   │
│  │   │   │ Go Pool      │  │ C++ Pool     │  │ Rust Pool    │  │                   │
│  │   │   │ 5-30 pods    │  │ 5-30 pods    │  │ 3-20 pods    │  │                   │
│  │   │   └──────────────┘  └──────────────┘  └──────────────┘  │                   │
│  │   │                                                          │                   │
│  │   │   Node Pools:                                            │                   │
│  │   │   • Baseline: 10 x n2-standard-4 (on-demand)            │                   │
│  │   │   • Burst: 0-50 x n2-standard-4 (spot/preemptible)      │                   │
│  │   │                                                          │                   │
│  │   └──────────────────────────────────────────────────────────┘                   │
│  │                                                                                  │
│  │   ┌────────────────────────────────────────────────────────┐                    │
│  │   │              OBSERVABILITY STACK                        │                    │
│  │   │   • Prometheus + Grafana (metrics)                      │                    │
│  │   │   • Loki (logs)                                         │                    │
│  │   │   • Tempo (traces)                                      │                    │
│  │   │   • PagerDuty (alerting)                                │                    │
│  │   └────────────────────────────────────────────────────────┘                    │
│  │                                                                                  │
│  └──────────────────────────────────────────────────────────────────────────────────┘
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Deliverables Summary

| Deliverable | Status | Location |
|-------------|--------|----------|
| Scalability Architecture Diagram | ✅ Complete | Section 6 |
| Kubernetes/EKS Configuration | ✅ Complete | Sections 4.1, 4.4 |
| Capacity Planning Model | ✅ Complete | Section 5.3 |
| Performance Benchmarking Plan | ✅ Complete | Section 5.4 |
| Queue Design | ✅ Complete | Section 1.3 |
| Cold Start Optimization | ✅ Complete | Section 2 |
| Auto-scaling Configuration | ✅ Complete | Section 4 |
| WebSocket Real-time Output | ✅ Complete | Section 3.4 |
