# Phase 8: Integration Architecture & API Design

## Executive Summary

This phase defines the unified API architecture, service communication patterns, API gateway configuration, and security standards that integrate all platform components into a cohesive system.

---

## 1. API Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PLATFORM API ARCHITECTURE                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  CLIENTS                                                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                       │
│  │  Web    │  │ Mobile  │  │ Desktop │  │  CLI    │  │ Third   │                       │
│  │  App    │  │  Apps   │  │  App    │  │  Tool   │  │ Party   │                       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                       │
│       │            │            │            │            │                             │
│       └────────────┴────────────┴────────────┴────────────┘                             │
│                                 │                                                        │
│                                 ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              CDN / EDGE                                          │   │
│  │                     (CloudFront / Cloudflare)                                    │   │
│  │                                                                                  │   │
│  │  • Static assets caching                                                        │   │
│  │  • DDoS protection                                                              │   │
│  │  • Geographic routing                                                           │   │
│  │  • SSL termination                                                              │   │
│  └───────────────────────────────────┬─────────────────────────────────────────────┘   │
│                                      │                                                  │
│                                      ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           API GATEWAY (Kong)                                     │   │
│  │                                                                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │   │
│  │  │    Auth     │  │    Rate     │  │   Request   │  │   Logging   │            │   │
│  │  │  Validation │  │   Limiting  │  │  Transform  │  │  & Metrics  │            │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │   │
│  │                                                                                  │   │
│  │  Routes:                                                                        │   │
│  │  • /api/v1/*      → REST API Services                                          │   │
│  │  • /ws/*          → WebSocket Services                                         │   │
│  │  • /graphql       → GraphQL Gateway (optional)                                 │   │
│  │                                                                                  │   │
│  └───────────────────────────────────┬─────────────────────────────────────────────┘   │
│                                      │                                                  │
│              ┌───────────────────────┼───────────────────────┐                         │
│              │                       │                       │                         │
│              ▼                       ▼                       ▼                         │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐                  │
│  │    REST APIs      │  │  WebSocket Server │  │  GraphQL Gateway  │                  │
│  │                   │  │                   │  │   (Optional)      │                  │
│  │  • Auth Service   │  │  • Chat           │  │                   │                  │
│  │  • User Service   │  │  • Notifications  │  │  • Federated      │                  │
│  │  • Course Service │  │  • Presence       │  │    schema         │                  │
│  │  • Code Runner    │  │  • Code output    │  │  • Subscriptions  │                  │
│  │  • Chat Service   │  │                   │  │                   │                  │
│  │  • File Service   │  │                   │  │                   │                  │
│  └─────────┬─────────┘  └─────────┬─────────┘  └─────────┬─────────┘                  │
│            │                      │                      │                            │
│            └──────────────────────┼──────────────────────┘                            │
│                                   │                                                    │
│                                   ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                          SERVICE MESH (Optional)                                 │  │
│  │                                                                                  │  │
│  │  • Service discovery                                                            │  │
│  │  • Load balancing                                                               │  │
│  │  • Circuit breaking                                                             │  │
│  │  • mTLS                                                                         │  │
│  │                                                                                  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                   │                                                    │
│     ┌─────────────────────────────┼─────────────────────────────┐                     │
│     │                             │                             │                     │
│     ▼                             ▼                             ▼                     │
│  ┌──────────┐              ┌──────────┐              ┌──────────┐                     │
│  │PostgreSQL│              │  Redis   │              │   S3     │                     │
│  │          │              │  Cluster │              │  (Files) │                     │
│  └──────────┘              └──────────┘              └──────────┘                     │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 API Design Approach

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Primary API Style** | REST | Industry standard, wide tooling support |
| **Secondary** | GraphQL (optional) | Better for complex data fetching |
| **Real-time** | WebSocket (Socket.IO) | Bidirectional, low latency |
| **Versioning** | URL path (`/api/v1/`) | Clear, explicit versioning |
| **Authentication** | Bearer JWT | Stateless, scalable |
| **Format** | JSON | Universal support |
| **Naming** | kebab-case for URLs | REST convention |
| **Pagination** | Cursor-based | Better performance at scale |

### 1.3 URL Structure

```yaml
# API URL Structure
base_url: https://api.fislearn.com

# Versioning
versioning:
  strategy: path
  format: /api/v{major}/
  current: v1
  supported: [v1]
  deprecated: []

# Resource naming conventions
naming:
  style: kebab-case
  pluralization: plural for collections
  nesting: max 2 levels deep

# URL patterns
patterns:
  # Collections
  collection: /api/v1/{resources}
  # Single resource
  resource: /api/v1/{resources}/{id}
  # Nested resource
  nested: /api/v1/{resources}/{id}/{sub-resources}
  # Actions (non-CRUD operations)
  action: /api/v1/{resources}/{id}/{action}
  # Search/filter
  search: /api/v1/{resources}/search

# Examples
examples:
  # User resources
  - GET    /api/v1/users                    # List users (admin)
  - GET    /api/v1/users/me                 # Current user
  - PATCH  /api/v1/users/me                 # Update current user

  # Course resources
  - GET    /api/v1/courses                  # List courses
  - GET    /api/v1/courses/{id}             # Get course
  - POST   /api/v1/courses                  # Create course (instructor)
  - GET    /api/v1/courses/{id}/lessons     # List lessons in course
  - POST   /api/v1/courses/{id}/enroll      # Enroll in course (action)

  # Chat resources
  - GET    /api/v1/channels                 # List user's channels
  - GET    /api/v1/channels/{id}            # Get channel
  - GET    /api/v1/channels/{id}/messages   # List messages
  - POST   /api/v1/channels/{id}/messages   # Send message

  # Code execution
  - POST   /api/v1/executions               # Execute code
  - GET    /api/v1/executions/{id}          # Get execution result
  - GET    /api/v1/executions/{id}/output   # Stream output (SSE)

  # File uploads
  - POST   /api/v1/files                    # Upload file
  - GET    /api/v1/files/{id}               # Get file info
  - DELETE /api/v1/files/{id}               # Delete file
```

### 1.4 Request/Response Standards

```typescript
// Standard request headers
interface RequestHeaders {
  'Authorization': `Bearer ${string}`;
  'Content-Type': 'application/json';
  'Accept': 'application/json';
  'X-Request-ID'?: string;           // For tracing
  'X-Client-Version'?: string;       // Client version tracking
  'Accept-Language'?: string;        // i18n
}

// Standard success response
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    rateLimit?: RateLimitMeta;
  };
}

// Pagination metadata
interface PaginationMeta {
  cursor?: string;
  nextCursor?: string;
  prevCursor?: string;
  hasMore: boolean;
  total?: number;           // Only for small datasets
}

// Rate limit metadata
interface RateLimitMeta {
  limit: number;
  remaining: number;
  resetAt: string;          // ISO 8601
}

// Standard error response
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable code
    message: string;        // Human-readable message
    details?: unknown;      // Additional context
    field?: string;         // For validation errors
    requestId?: string;     // For support
  };
}

// Validation error response
interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: 'Validation failed';
    details: ValidationError[];
  };
}

interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: unknown;
}

// Example responses
const successExample: SuccessResponse<Course> = {
  success: true,
  data: {
    id: 'course_123',
    title: 'Introduction to Python',
    instructor: {
      id: 'user_456',
      displayName: 'Jane Instructor',
    },
    // ...
  },
  meta: {
    rateLimit: {
      limit: 100,
      remaining: 99,
      resetAt: '2024-01-15T12:00:00Z',
    },
  },
};

const errorExample: ErrorResponse = {
  success: false,
  error: {
    code: 'SUBSCRIPTION_REQUIRED',
    message: 'This feature requires an active subscription',
    details: {
      requiredTier: 'basic',
      currentTier: 'free',
      upgradeUrl: '/pricing',
    },
    requestId: 'req_abc123',
  },
};

const validationErrorExample: ValidationErrorResponse = {
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: [
      {
        field: 'email',
        code: 'INVALID_FORMAT',
        message: 'Invalid email format',
        value: 'not-an-email',
      },
      {
        field: 'password',
        code: 'TOO_SHORT',
        message: 'Password must be at least 12 characters',
      },
    ],
  },
};
```

### 1.5 HTTP Status Codes

```yaml
status_codes:
  # Success
  200_OK:
    description: "Request succeeded"
    use_for: "GET, PUT, PATCH, DELETE success"

  201_CREATED:
    description: "Resource created"
    use_for: "POST success that creates a resource"
    headers:
      Location: "/api/v1/resources/{new-id}"

  202_ACCEPTED:
    description: "Request accepted for processing"
    use_for: "Async operations (code execution)"

  204_NO_CONTENT:
    description: "Success with no body"
    use_for: "DELETE success, some PUT/PATCH"

  # Client Errors
  400_BAD_REQUEST:
    description: "Invalid request"
    use_for: "Malformed JSON, invalid parameters"

  401_UNAUTHORIZED:
    description: "Authentication required"
    use_for: "Missing or invalid token"

  403_FORBIDDEN:
    description: "Access denied"
    use_for: "Valid auth but insufficient permissions"

  404_NOT_FOUND:
    description: "Resource not found"
    use_for: "Non-existent resource"

  409_CONFLICT:
    description: "Conflict with current state"
    use_for: "Duplicate creation, optimistic lock failure"

  422_UNPROCESSABLE_ENTITY:
    description: "Validation failed"
    use_for: "Valid JSON but semantic errors"

  429_TOO_MANY_REQUESTS:
    description: "Rate limit exceeded"
    use_for: "Rate limiting"
    headers:
      Retry-After: "seconds until reset"
      X-RateLimit-Limit: "requests per window"
      X-RateLimit-Remaining: "requests remaining"
      X-RateLimit-Reset: "Unix timestamp of reset"

  # Server Errors
  500_INTERNAL_SERVER_ERROR:
    description: "Unexpected error"
    use_for: "Unhandled exceptions"

  502_BAD_GATEWAY:
    description: "Upstream service error"
    use_for: "Downstream service failure"

  503_SERVICE_UNAVAILABLE:
    description: "Service temporarily unavailable"
    use_for: "Maintenance, overload"
    headers:
      Retry-After: "seconds or HTTP-date"

  504_GATEWAY_TIMEOUT:
    description: "Upstream timeout"
    use_for: "Downstream service timeout"
```

---

## 2. Service Communication

### 2.1 Service Dependency Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE DEPENDENCY MAP                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                              ┌─────────────────┐                                │
│                              │   API Gateway   │                                │
│                              └────────┬────────┘                                │
│                                       │                                         │
│         ┌─────────────────────────────┼─────────────────────────────┐          │
│         │                             │                             │          │
│         ▼                             ▼                             ▼          │
│  ┌─────────────┐             ┌─────────────┐             ┌─────────────┐       │
│  │    Auth     │             │    User     │             │   Course    │       │
│  │   Service   │◄────────────│   Service   │────────────►│   Service   │       │
│  │             │             │             │             │             │       │
│  │ • Login     │             │ • Profile   │             │ • Courses   │       │
│  │ • Register  │             │ • Settings  │             │ • Lessons   │       │
│  │ • Token     │             │ • Avatar    │             │ • Progress  │       │
│  │ • MFA       │             │             │             │             │       │
│  └──────┬──────┘             └──────┬──────┘             └──────┬──────┘       │
│         │                           │                           │              │
│         │                           │                           │              │
│         ▼                           ▼                           ▼              │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         SHARED INFRASTRUCTURE                            │  │
│  │                                                                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │PostgreSQL│  │  Redis   │  │  Kafka   │  │    S3    │  │   SES    │  │  │
│  │  │          │  │          │  │          │  │          │  │  (Email) │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  │                                                                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│         │                           │                           │              │
│         │                           │                           │              │
│         ▼                           ▼                           ▼              │
│  ┌─────────────┐             ┌─────────────┐             ┌─────────────┐       │
│  │    Chat     │             │    Code     │             │   File      │       │
│  │   Service   │◄───────────►│   Runner    │◄───────────►│   Service   │       │
│  │             │             │   Service   │             │             │       │
│  │ • Channels  │             │             │             │ • Upload    │       │
│  │ • Messages  │             │ • Execute   │             │ • Download  │       │
│  │ • Presence  │             │ • Languages │             │ • Process   │       │
│  │ • WebSocket │             │ • Output    │             │             │       │
│  └─────────────┘             └─────────────┘             └─────────────┘       │
│         │                           │                           │              │
│         │                           │                           │              │
│         └───────────────────────────┴───────────────────────────┘              │
│                                     │                                          │
│                                     ▼                                          │
│                          ┌─────────────────┐                                   │
│                          │  Notification   │                                   │
│                          │    Service      │                                   │
│                          │                 │                                   │
│                          │ • Push          │                                   │
│                          │ • Email         │                                   │
│                          │ • In-app        │                                   │
│                          └─────────────────┘                                   │
│                                                                                  │
│  DEPENDENCY LEGEND:                                                             │
│  ─────────────────                                                              │
│  ──────►  Sync call (REST/gRPC)                                                │
│  ──────>  Async event (Kafka/Redis pub/sub)                                    │
│  ◄──────► Bidirectional                                                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Synchronous vs Asynchronous Communication

```yaml
communication_patterns:
  synchronous:
    protocol: HTTP/REST or gRPC
    use_cases:
      - User authentication
      - Real-time data fetching
      - Transactional operations
      - Request/response workflows
    considerations:
      - Timeout handling required
      - Circuit breaker essential
      - Retry with backoff

  asynchronous:
    protocol: Kafka / Redis Pub/Sub
    use_cases:
      - Notifications
      - Audit logging
      - Analytics events
      - Email sending
      - Subscription webhooks
    considerations:
      - Eventual consistency
      - Message ordering
      - Idempotency required

# Service communication matrix
service_matrix:
  auth_service:
    calls:
      - user_service: sync  # Get user data for token
    events:
      - publishes: [user.login, user.logout, mfa.enabled]

  user_service:
    calls:
      - file_service: sync  # Avatar upload
      - auth_service: sync  # Password change triggers token invalidation
    events:
      - publishes: [user.created, user.updated, user.deleted]
      - subscribes: [subscription.changed]

  course_service:
    calls:
      - user_service: sync  # Instructor info
      - file_service: sync  # Course materials
    events:
      - publishes: [course.created, enrollment.created, progress.updated]
      - subscribes: [user.deleted]

  chat_service:
    calls:
      - user_service: sync  # User profiles for messages
      - file_service: sync  # Attachment uploads
      - moderation_service: sync  # Content check
    events:
      - publishes: [message.sent, channel.created, user.mentioned]
      - subscribes: [user.deleted, subscription.changed]

  code_runner_service:
    calls:
      - user_service: sync  # Check entitlements
    events:
      - publishes: [execution.started, execution.completed, execution.failed]
      - subscribes: [subscription.changed]

  notification_service:
    calls:
      - user_service: sync  # Notification preferences
    events:
      - subscribes: [message.sent, user.mentioned, execution.completed, ...]
```

### 2.3 Circuit Breaker Implementation

```typescript
// Circuit breaker for service calls
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures = 0;
  private lastFailureTime: number = 0;
  private successCount = 0;

  private readonly config = {
    failureThreshold: 5,      // Failures before opening
    resetTimeout: 30000,      // Time before trying again (30s)
    halfOpenRequests: 3,      // Successful requests to close
  };

  async call<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new CircuitOpenError('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenRequests) {
        this.state = 'closed';
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime,
    };
  }
}

// Service client with circuit breaker
class UserServiceClient {
  private circuitBreaker = new CircuitBreaker();
  private httpClient: HttpClient;

  async getUser(userId: string): Promise<User> {
    return this.circuitBreaker.call(async () => {
      const response = await this.httpClient.get(`/users/${userId}`, {
        timeout: 5000,
      });
      return response.data;
    });
  }

  async getUserWithFallback(userId: string): Promise<User | CachedUser> {
    try {
      return await this.getUser(userId);
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        // Return cached data as fallback
        const cached = await this.cache.get(`user:${userId}`);
        if (cached) {
          return { ...cached, _stale: true };
        }
      }
      throw error;
    }
  }
}
```

### 2.4 Retry Policies

```typescript
// Retry configuration by operation type
const RETRY_POLICIES = {
  // Idempotent reads - safe to retry
  read: {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 2000,
    backoffMultiplier: 2,
    retryableErrors: [502, 503, 504, 'ECONNRESET', 'ETIMEDOUT'],
  },

  // Idempotent writes - safe if idempotency key used
  idempotentWrite: {
    maxRetries: 3,
    baseDelay: 200,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryableErrors: [502, 503, 504],
    requireIdempotencyKey: true,
  },

  // Non-idempotent writes - no retry
  write: {
    maxRetries: 0,
  },

  // Critical operations - limited retry
  critical: {
    maxRetries: 1,
    baseDelay: 1000,
    maxDelay: 1000,
    retryableErrors: [503],
  },
};

// Retry implementation with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy
): Promise<T> {
  let lastError: Error;
  let delay = policy.baseDelay;

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryable(error, policy.retryableErrors)) {
        throw error;
      }

      // Check if we have retries left
      if (attempt === policy.maxRetries) {
        throw error;
      }

      // Wait before retry with jitter
      const jitter = Math.random() * 0.3 * delay;
      await sleep(delay + jitter);

      // Increase delay for next attempt
      delay = Math.min(delay * policy.backoffMultiplier, policy.maxDelay);

      console.log(`Retry attempt ${attempt + 1}/${policy.maxRetries} after ${delay}ms`);
    }
  }

  throw lastError!;
}

function isRetryable(error: any, retryableErrors: (number | string)[]): boolean {
  // Check HTTP status
  if (error.response?.status) {
    return retryableErrors.includes(error.response.status);
  }

  // Check error code
  if (error.code) {
    return retryableErrors.includes(error.code);
  }

  return false;
}
```

---

## 3. API Gateway

### 3.1 Gateway Configuration (Kong)

```yaml
# Kong API Gateway configuration
_format_version: "2.1"

# Services
services:
  - name: auth-service
    url: http://auth-service.internal:3000
    connect_timeout: 5000
    read_timeout: 30000
    write_timeout: 30000

  - name: user-service
    url: http://user-service.internal:3000
    connect_timeout: 5000
    read_timeout: 30000
    write_timeout: 30000

  - name: course-service
    url: http://course-service.internal:3000
    connect_timeout: 5000
    read_timeout: 30000
    write_timeout: 30000

  - name: chat-service
    url: http://chat-service.internal:3000
    connect_timeout: 5000
    read_timeout: 30000
    write_timeout: 30000

  - name: code-runner-service
    url: http://code-runner-service.internal:3000
    connect_timeout: 5000
    read_timeout: 60000  # Longer for code execution
    write_timeout: 60000

  - name: websocket-service
    url: http://websocket-service.internal:3000
    connect_timeout: 5000
    read_timeout: 3600000  # 1 hour for WebSocket
    write_timeout: 3600000

# Routes
routes:
  # Auth routes (public)
  - name: auth-login
    service: auth-service
    paths:
      - /api/v1/auth/login
      - /api/v1/auth/register
      - /api/v1/auth/refresh
      - /api/v1/auth/forgot-password
      - /api/v1/auth/reset-password
    methods: [POST]
    strip_path: false

  # Auth routes (protected)
  - name: auth-protected
    service: auth-service
    paths:
      - /api/v1/auth/logout
      - /api/v1/auth/mfa
      - /api/v1/auth/sessions
    methods: [GET, POST, DELETE]
    strip_path: false
    plugins:
      - name: jwt

  # User routes
  - name: user-routes
    service: user-service
    paths:
      - /api/v1/users
    methods: [GET, POST, PATCH, DELETE]
    strip_path: false
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 60

  # Course routes
  - name: course-routes
    service: course-service
    paths:
      - /api/v1/courses
    methods: [GET, POST, PATCH, DELETE]
    strip_path: false
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 100

  # Chat routes
  - name: chat-routes
    service: chat-service
    paths:
      - /api/v1/channels
      - /api/v1/messages
      - /api/v1/dm
    methods: [GET, POST, PATCH, DELETE]
    strip_path: false
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 120

  # Code execution routes
  - name: code-runner-routes
    service: code-runner-service
    paths:
      - /api/v1/executions
    methods: [GET, POST]
    strip_path: false
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 30  # Stricter for code execution

  # WebSocket upgrade
  - name: websocket-routes
    service: websocket-service
    paths:
      - /ws
    protocols: [http, https, ws, wss]
    strip_path: false
    plugins:
      - name: jwt

# Plugins (global)
plugins:
  # CORS
  - name: cors
    config:
      origins:
        - https://fislearn.com
        - https://app.fislearn.com
      methods:
        - GET
        - POST
        - PUT
        - PATCH
        - DELETE
        - OPTIONS
      headers:
        - Authorization
        - Content-Type
        - X-Request-ID
      credentials: true
      max_age: 3600

  # Request ID
  - name: correlation-id
    config:
      header_name: X-Request-ID
      generator: uuid
      echo_downstream: true

  # Logging
  - name: http-log
    config:
      http_endpoint: http://logging-service.internal:3000/logs
      method: POST
      content_type: application/json
      flush_timeout: 2
      retry_count: 3

  # Prometheus metrics
  - name: prometheus
    config:
      per_consumer: false
      status_code_metrics: true
      latency_metrics: true
      bandwidth_metrics: true

  # Request size limiting
  - name: request-size-limiting
    config:
      allowed_payload_size: 10  # MB

  # Response rate limiting
  - name: response-ratelimiting
    config:
      limits:
        video:
          minute: 10
```

### 3.2 Rate Limiting Strategy

```yaml
# Tiered rate limiting configuration
rate_limits:
  # By subscription tier
  tiers:
    free:
      default:
        requests_per_minute: 30
        requests_per_hour: 500
      code_execution:
        requests_per_day: 5
      file_upload:
        requests_per_hour: 0  # Disabled

    basic:
      default:
        requests_per_minute: 60
        requests_per_hour: 2000
      code_execution:
        requests_per_day: 100
      file_upload:
        requests_per_hour: 20

    pro:
      default:
        requests_per_minute: 120
        requests_per_hour: 5000
      code_execution:
        requests_per_day: 1000
      file_upload:
        requests_per_hour: 100

    enterprise:
      default:
        requests_per_minute: 300
        requests_per_hour: 20000
      code_execution:
        requests_per_day: 10000
      file_upload:
        requests_per_hour: 500

  # By endpoint category
  endpoints:
    auth:
      login:
        per_ip_per_minute: 5
        per_ip_per_hour: 20
      register:
        per_ip_per_minute: 3
        per_ip_per_hour: 10
      password_reset:
        per_email_per_hour: 3

    api:
      read:
        multiplier: 1.0  # Base rate
      write:
        multiplier: 0.5  # Half of base rate
      delete:
        multiplier: 0.25 # Quarter of base rate

  # Burst handling
  burst:
    enabled: true
    multiplier: 2  # Allow 2x burst
    window: 10     # Over 10 seconds
```

```typescript
// Rate limiter implementation
class TieredRateLimiter {
  private redis: Redis;

  async checkLimit(
    userId: string,
    tier: SubscriptionTier,
    endpoint: string
  ): Promise<RateLimitResult> {
    const config = this.getConfig(tier, endpoint);
    const key = `ratelimit:${userId}:${endpoint}`;

    // Use Redis sliding window
    const now = Date.now();
    const windowStart = now - config.window * 1000;

    // Remove old entries
    await this.redis.zremrangebyscore(key, '-inf', windowStart);

    // Count current requests
    const count = await this.redis.zcard(key);

    // Check limit
    if (count >= config.limit) {
      const oldestEntry = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldestEntry.length > 0
        ? parseInt(oldestEntry[1]) + config.window * 1000
        : now + config.window * 1000;

      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetAt: new Date(resetAt),
        retryAfter: Math.ceil((resetAt - now) / 1000),
      };
    }

    // Add current request
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.expire(key, config.window);

    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - count - 1,
      resetAt: new Date(now + config.window * 1000),
    };
  }

  private getConfig(tier: SubscriptionTier, endpoint: string): RateLimitConfig {
    const tierConfig = RATE_LIMITS.tiers[tier];
    const endpointConfig = this.getEndpointConfig(endpoint);

    return {
      limit: Math.floor(tierConfig.default.requests_per_minute * endpointConfig.multiplier),
      window: 60, // 1 minute
    };
  }
}

// Rate limit middleware
function rateLimitMiddleware(endpoint: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id || req.ip;
    const tier = req.user?.subscription?.tier || 'free';

    const result = await rateLimiter.checkLimit(userId, tier, endpoint);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: result.retryAfter,
          limit: result.limit,
          resetAt: result.resetAt.toISOString(),
        },
      });
    }

    next();
  };
}
```

### 3.3 Request Validation

```typescript
// Request validation with Zod
import { z } from 'zod';

// Common schemas
const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// API schemas
const schemas = {
  // Auth
  'POST /api/v1/auth/login': z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(8),
      mfaCode: z.string().length(6).optional(),
    }),
  }),

  'POST /api/v1/auth/register': z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(12),
      displayName: z.string().min(2).max(50),
      acceptedTerms: z.literal(true),
    }),
  }),

  // Users
  'GET /api/v1/users/me': z.object({
    query: z.object({}),
  }),

  'PATCH /api/v1/users/me': z.object({
    body: z.object({
      displayName: z.string().min(2).max(50).optional(),
      avatarUrl: z.string().url().optional(),
      bio: z.string().max(500).optional(),
      preferences: z.object({
        theme: z.enum(['light', 'dark', 'system']).optional(),
        language: z.string().length(2).optional(),
        notifications: z.object({
          email: z.boolean().optional(),
          push: z.boolean().optional(),
        }).optional(),
      }).optional(),
    }),
  }),

  // Courses
  'GET /api/v1/courses': z.object({
    query: paginationSchema.merge(sortSchema).merge(z.object({
      category: z.string().optional(),
      level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      search: z.string().optional(),
    })),
  }),

  'POST /api/v1/courses': z.object({
    body: z.object({
      title: z.string().min(5).max(200),
      description: z.string().min(20).max(5000),
      category: z.string(),
      level: z.enum(['beginner', 'intermediate', 'advanced']),
      price: z.number().min(0).optional(),
      thumbnailUrl: z.string().url().optional(),
    }),
  }),

  // Chat
  'GET /api/v1/channels/:channelId/messages': z.object({
    params: z.object({
      channelId: z.string().uuid(),
    }),
    query: paginationSchema.merge(z.object({
      before: z.string().uuid().optional(),
      after: z.string().uuid().optional(),
    })),
  }),

  'POST /api/v1/channels/:channelId/messages': z.object({
    params: z.object({
      channelId: z.string().uuid(),
    }),
    body: z.object({
      content: z.string().min(1).max(4000),
      type: z.enum(['text', 'code']).default('text'),
      replyToId: z.string().uuid().optional(),
      attachments: z.array(z.string().uuid()).max(10).optional(),
    }),
  }),

  // Code execution
  'POST /api/v1/executions': z.object({
    body: z.object({
      language: z.enum(['python', 'javascript', 'java', 'go', 'cpp', 'rust']),
      version: z.string().optional(),
      code: z.string().min(1).max(100000),
      stdin: z.string().max(10000).optional(),
      timeout: z.number().min(1).max(60).default(10),
    }),
  }),
};

// Validation middleware factory
function validate(schemaKey: string) {
  const schema = schemas[schemaKey];

  if (!schema) {
    throw new Error(`No schema found for: ${schemaKey}`);
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace with validated/transformed data
      req.body = result.body;
      req.query = result.query;
      req.params = result.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              code: e.code,
              message: e.message,
            })),
          },
        });
      }
      next(error);
    }
  };
}

// Usage
router.post(
  '/api/v1/auth/login',
  validate('POST /api/v1/auth/login'),
  authController.login
);
```

---

## 4. API Security

### 4.1 Security Checklist

```yaml
api_security_checklist:
  authentication:
    - item: "JWT validation on all protected endpoints"
      status: required
      implementation: "Kong JWT plugin + middleware"

    - item: "Token expiration enforcement"
      status: required
      implementation: "15-minute access tokens"

    - item: "Refresh token rotation"
      status: required
      implementation: "Single-use refresh tokens"

  authorization:
    - item: "Role-based access control"
      status: required
      implementation: "Middleware permission checks"

    - item: "Resource ownership validation"
      status: required
      implementation: "Check user owns resource before action"

    - item: "Subscription entitlement checks"
      status: required
      implementation: "Feature flags per tier"

  input_validation:
    - item: "Schema validation for all inputs"
      status: required
      implementation: "Zod schemas"

    - item: "SQL injection prevention"
      status: required
      implementation: "Parameterized queries only"

    - item: "NoSQL injection prevention"
      status: required
      implementation: "Input sanitization"

    - item: "Request size limits"
      status: required
      implementation: "Kong request-size-limiting"

  output_encoding:
    - item: "JSON output encoding"
      status: required
      implementation: "JSON.stringify"

    - item: "No sensitive data in responses"
      status: required
      implementation: "DTO transformation"

    - item: "Error message sanitization"
      status: required
      implementation: "Generic errors in production"

  transport_security:
    - item: "TLS 1.3 only"
      status: required
      implementation: "ALB/CloudFront configuration"

    - item: "HSTS headers"
      status: required
      implementation: "Strict-Transport-Security header"

    - item: "Certificate pinning (mobile)"
      status: recommended
      implementation: "Mobile app configuration"

  cors:
    - item: "Whitelist allowed origins"
      status: required
      implementation: "Kong CORS plugin"

    - item: "Restrict allowed methods"
      status: required
      implementation: "Only necessary HTTP methods"

    - item: "Restrict allowed headers"
      status: required
      implementation: "Explicit header whitelist"

  rate_limiting:
    - item: "Per-user rate limits"
      status: required
      implementation: "Tiered rate limiting"

    - item: "Per-IP rate limits for auth"
      status: required
      implementation: "Brute force protection"

    - item: "Per-endpoint rate limits"
      status: required
      implementation: "Endpoint-specific limits"

  logging_monitoring:
    - item: "Log all API requests"
      status: required
      implementation: "Kong http-log plugin"

    - item: "Log authentication events"
      status: required
      implementation: "Audit logging"

    - item: "Alert on suspicious patterns"
      status: required
      implementation: "Anomaly detection"
```

### 4.2 CORS Configuration

```typescript
// CORS configuration
const corsOptions: CorsOptions = {
  // Allowed origins
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://fislearn.com',
      'https://app.fislearn.com',
      'https://admin.fislearn.com',
    ];

    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Development origins
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:5173',
      );
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },

  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Allowed headers
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'X-Request-ID',
    'X-Client-Version',
    'Accept-Language',
  ],

  // Exposed headers (available to client)
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],

  // Allow credentials (cookies, auth headers)
  credentials: true,

  // Preflight cache duration
  maxAge: 3600, // 1 hour

  // Don't pass preflight to next handler
  preflightContinue: false,

  // Success status for legacy browsers
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
```

### 4.3 Security Headers

```typescript
// Security headers middleware
import helmet from 'helmet';

app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://cdn.fislearn.com'],
      connectSrc: ["'self'", 'https://api.fislearn.com', 'wss://ws.fislearn.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },

  // Prevent clickjacking
  frameguard: {
    action: 'deny',
  },

  // HSTS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // Prevent MIME sniffing
  noSniff: true,

  // XSS protection
  xssFilter: true,

  // Referrer policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // Disable DNS prefetching
  dnsPrefetchControl: {
    allow: false,
  },

  // Hide X-Powered-By
  hidePoweredBy: true,
}));

// Additional custom headers
app.use((req, res, next) => {
  // Prevent caching of API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Prevent embedding in iframes
  res.setHeader('X-Frame-Options', 'DENY');

  // Request ID for tracing
  const requestId = req.headers['x-request-id'] || generateUUID();
  res.setHeader('X-Request-ID', requestId);

  next();
});
```

---

## 5. Documentation

### 5.1 OpenAPI Specification Structure

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: FIS Learn API
  description: |
    API documentation for the FIS Learn e-learning platform.

    ## Authentication
    All endpoints (except auth) require a valid JWT token in the Authorization header:
    ```
    Authorization: Bearer <token>
    ```

    ## Rate Limiting
    Rate limits are enforced per user and vary by subscription tier.
    Rate limit headers are included in all responses.

    ## Errors
    Errors follow a consistent format with machine-readable codes.
  version: 1.0.0
  contact:
    name: API Support
    email: api-support@fislearn.com
    url: https://developers.fislearn.com

servers:
  - url: https://api.fislearn.com
    description: Production
  - url: https://api.staging.fislearn.com
    description: Staging
  - url: http://localhost:3000
    description: Local development

tags:
  - name: Auth
    description: Authentication and authorization
  - name: Users
    description: User management
  - name: Courses
    description: Course operations
  - name: Chat
    description: Real-time chat
  - name: Executions
    description: Code execution
  - name: Files
    description: File uploads

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    # Common schemas
    Error:
      type: object
      required:
        - success
        - error
      properties:
        success:
          type: boolean
          enum: [false]
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
              example: "VALIDATION_ERROR"
            message:
              type: string
              example: "Validation failed"
            details:
              type: array
              items:
                type: object
            requestId:
              type: string
              example: "req_abc123"

    Pagination:
      type: object
      properties:
        cursor:
          type: string
        nextCursor:
          type: string
        hasMore:
          type: boolean

    # Domain schemas
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        displayName:
          type: string
        avatarUrl:
          type: string
          format: uri
        role:
          type: string
          enum: [admin, instructor, moderator, subscriber, free_user]
        subscription:
          $ref: '#/components/schemas/Subscription'
        createdAt:
          type: string
          format: date-time

    Subscription:
      type: object
      properties:
        tier:
          type: string
          enum: [free, basic, pro, enterprise]
        status:
          type: string
          enum: [active, past_due, cancelled, expired]
        expiresAt:
          type: string
          format: date-time

    Course:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        description:
          type: string
        instructor:
          $ref: '#/components/schemas/User'
        category:
          type: string
        level:
          type: string
          enum: [beginner, intermediate, advanced]
        lessonCount:
          type: integer
        enrollmentCount:
          type: integer
        createdAt:
          type: string
          format: date-time

    Message:
      type: object
      properties:
        id:
          type: string
          format: uuid
        channelId:
          type: string
          format: uuid
        user:
          $ref: '#/components/schemas/User'
        content:
          type: string
        type:
          type: string
          enum: [text, code, file, system]
        createdAt:
          type: string
          format: date-time
        reactions:
          type: array
          items:
            $ref: '#/components/schemas/Reaction'

    Execution:
      type: object
      properties:
        id:
          type: string
          format: uuid
        language:
          type: string
        status:
          type: string
          enum: [queued, running, completed, failed, timeout]
        exitCode:
          type: integer
        stdout:
          type: string
        stderr:
          type: string
        executionTimeMs:
          type: integer
        memoryUsedBytes:
          type: integer
        createdAt:
          type: string
          format: date-time

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            success: false
            error:
              code: "UNAUTHORIZED"
              message: "Authentication required"

    Forbidden:
      description: Access denied
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            success: false
            error:
              code: "FORBIDDEN"
              message: "Insufficient permissions"

    RateLimited:
      description: Rate limit exceeded
      headers:
        Retry-After:
          schema:
            type: integer
          description: Seconds until rate limit resets
        X-RateLimit-Limit:
          schema:
            type: integer
        X-RateLimit-Remaining:
          schema:
            type: integer
        X-RateLimit-Reset:
          schema:
            type: integer
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

paths:
  # Auth endpoints
  /api/v1/auth/login:
    post:
      tags: [Auth]
      summary: Login
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
                mfaCode:
                  type: string
                  pattern: '^\d{6}$'
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    enum: [true]
                  data:
                    type: object
                    properties:
                      accessToken:
                        type: string
                      refreshToken:
                        type: string
                      expiresIn:
                        type: integer
                      user:
                        $ref: '#/components/schemas/User'
        '401':
          $ref: '#/components/responses/Unauthorized'

  # More endpoints...
```

### 5.2 API Changelog

```markdown
# API Changelog

## [v1.2.0] - 2024-02-01

### Added
- `POST /api/v1/executions/{id}/cancel` - Cancel running code execution
- `GET /api/v1/users/me/usage` - Get current usage statistics
- Support for Rust language in code execution

### Changed
- Increased default execution timeout from 10s to 30s
- Pagination now uses cursor-based pagination (previously offset-based)
- Rate limits adjusted: Pro tier increased to 120 requests/minute

### Deprecated
- `offset` parameter in pagination (will be removed in v2.0)
- `GET /api/v1/users/{id}` for non-admin users (use `/users/me`)

### Fixed
- File upload now correctly validates MIME types
- WebSocket reconnection no longer duplicates channel subscriptions

---

## [v1.1.0] - 2024-01-15

### Added
- `POST /api/v1/channels/{id}/archive` - Archive a channel
- Thread replies support in chat messages
- Code syntax highlighting in messages

### Changed
- Message content limit increased to 4000 characters
- File attachments now support up to 10 files per message

### Security
- Added rate limiting to password reset endpoint
- Improved JWT validation to check issuer and audience

---

## [v1.0.0] - 2024-01-01

Initial API release.
```

---

## 6. Service Dependency Map

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              COMPLETE SERVICE DEPENDENCY MAP                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                   EXTERNAL                                           │   │
│  │                                                                                      │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │   │
│  │   │  Stripe  │  │  Auth0   │  │SendGrid/ │  │  GitHub  │  │ Firebase │             │   │
│  │   │(Payments)│  │  (Auth)  │  │   SES    │  │  (OAuth) │  │  (Push)  │             │   │
│  │   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘             │   │
│  │        │             │             │             │             │                    │   │
│  └────────┼─────────────┼─────────────┼─────────────┼─────────────┼────────────────────┘   │
│           │             │             │             │             │                        │
│           ▼             ▼             ▼             ▼             ▼                        │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                PLATFORM SERVICES                                     │   │
│  │                                                                                      │   │
│  │                              ┌─────────────────┐                                    │   │
│  │                              │   API GATEWAY   │                                    │   │
│  │                              │     (Kong)      │                                    │   │
│  │                              └────────┬────────┘                                    │   │
│  │                                       │                                             │   │
│  │    ┌──────────────┬──────────────┬────┴─────┬──────────────┬──────────────┐        │   │
│  │    │              │              │          │              │              │        │   │
│  │    ▼              ▼              ▼          ▼              ▼              ▼        │   │
│  │ ┌──────┐     ┌──────┐     ┌──────┐    ┌──────┐     ┌──────┐     ┌──────┐         │   │
│  │ │ Auth │────►│ User │◄────│Course│    │ Chat │────►│ Code │     │ File │         │   │
│  │ │ Svc  │     │ Svc  │────►│ Svc  │    │ Svc  │     │Runner│     │ Svc  │         │   │
│  │ └──┬───┘     └──┬───┘     └──┬───┘    └──┬───┘     └──┬───┘     └──┬───┘         │   │
│  │    │            │            │           │            │            │             │   │
│  │    │            │            │           │            │            │             │   │
│  │    │   ┌────────┴────────┐   │           │            │            │             │   │
│  │    │   │                 │   │           │            │            │             │   │
│  │    ▼   ▼                 ▼   ▼           ▼            ▼            ▼             │   │
│  │ ┌────────────────────────────────────────────────────────────────────────────┐   │   │
│  │ │                          NOTIFICATION SERVICE                              │   │   │
│  │ │                                                                            │   │   │
│  │ │  Subscribes to events from all services, sends notifications via:         │   │   │
│  │ │  • Push (Firebase)  • Email (SES)  • In-app (WebSocket)                   │   │   │
│  │ └────────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                                    │
│                                       ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              INFRASTRUCTURE                                          │   │
│  │                                                                                      │   │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │   │
│  │   │  PostgreSQL  │  │    Redis     │  │    Kafka     │  │      S3      │           │   │
│  │   │              │  │   Cluster    │  │              │  │              │           │   │
│  │   │ • Users      │  │              │  │ • Events     │  │ • Files      │           │   │
│  │   │ • Courses    │  │ • Sessions   │  │ • Audit logs │  │ • Avatars    │           │   │
│  │   │ • Messages   │  │ • Cache      │  │ • Analytics  │  │ • Exports    │           │   │
│  │   │ • Executions │  │ • Pub/Sub    │  │              │  │              │           │   │
│  │   │ • Audit logs │  │ • Rate limits│  │              │  │              │           │   │
│  │   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘           │   │
│  │                                                                                      │   │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                              │   │
│  │   │ Elasticsearch│  │  Prometheus  │  │    Grafana   │                              │   │
│  │   │              │  │              │  │              │                              │   │
│  │   │ • Search     │  │ • Metrics    │  │ • Dashboards │                              │   │
│  │   │ • Logs       │  │              │  │ • Alerts     │                              │   │
│  │   └──────────────┘  └──────────────┘  └──────────────┘                              │   │
│  │                                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                              │
│  COMMUNICATION TYPES:                                                                       │
│  ───────────────────                                                                        │
│  ────────►  Synchronous (HTTP/gRPC)                                                        │
│  - - - - ►  Asynchronous (Kafka events)                                                    │
│  ════════►  Data store connection                                                          │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Deliverables Summary

| Deliverable | Status | Location |
|-------------|--------|----------|
| API Architecture Diagram | ✅ Complete | Section 1.1 |
| Service Dependency Map | ✅ Complete | Section 6 |
| API Security Checklist | ✅ Complete | Section 4.1 |
| Rate Limiting Specifications | ✅ Complete | Section 3.2 |
| OpenAPI Specification | ✅ Complete | Section 5.1 |
| Request/Response Standards | ✅ Complete | Section 1.4 |
| Circuit Breaker Implementation | ✅ Complete | Section 2.3 |
| CORS Configuration | ✅ Complete | Section 4.2 |
| Security Headers | ✅ Complete | Section 4.3 |
| API Changelog Template | ✅ Complete | Section 5.2 |
