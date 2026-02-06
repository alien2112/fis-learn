# Phase 3: Code Runner IDE - Operations & Compliance

## Executive Summary

This phase defines the operational excellence framework including observability, CI/CD pipelines, security compliance, and incident response procedures for the code execution system.

---

## 1. Observability

### 1.1 Metrics Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           OBSERVABILITY ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   DATA SOURCES                           COLLECTION                              │
│   ┌─────────────────┐                   ┌─────────────────┐                     │
│   │ API Services    │──────────────────>│                 │                     │
│   │ • Request count │                   │                 │                     │
│   │ • Latency       │                   │                 │                     │
│   │ • Error rate    │                   │                 │                     │
│   └─────────────────┘                   │                 │                     │
│                                         │   Prometheus    │                     │
│   ┌─────────────────┐                   │   (Metrics)     │                     │
│   │ Worker Nodes    │──────────────────>│                 │                     │
│   │ • Execution cnt │                   │                 │                     │
│   │ • Duration      │                   │                 │                     │
│   │ • Memory usage  │                   │                 │                     │
│   └─────────────────┘                   │                 │                     │
│                                         │                 │                     │
│   ┌─────────────────┐                   │                 │                     │
│   │ Container Pools │──────────────────>│                 │                     │
│   │ • Pool size     │                   │                 │                     │
│   │ • Cold starts   │                   └────────┬────────┘                     │
│   │ • Wait time     │                            │                              │
│   └─────────────────┘                            │                              │
│                                                  ▼                              │
│   ┌─────────────────┐                   ┌─────────────────┐                     │
│   │ All Services    │──────────────────>│     Loki        │                     │
│   │ • Structured    │                   │    (Logs)       │                     │
│   │   JSON logs     │                   └────────┬────────┘                     │
│   └─────────────────┘                            │                              │
│                                                  │                              │
│   ┌─────────────────┐                            │                              │
│   │ Request Flow    │──────────────────>┌───────┴────────┐                     │
│   │ • Trace IDs     │                   │     Tempo       │                     │
│   │ • Span data     │                   │   (Traces)      │                     │
│   └─────────────────┘                   └────────┬────────┘                     │
│                                                  │                              │
│                         VISUALIZATION            │                              │
│                        ┌─────────────────────────▼──────────────────────┐       │
│                        │                  GRAFANA                        │       │
│                        │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │       │
│                        │  │Overview  │  │Execution │  │ Security     │ │       │
│                        │  │Dashboard │  │Dashboard │  │ Dashboard    │ │       │
│                        │  └──────────┘  └──────────┘  └──────────────┘ │       │
│                        └────────────────────────────────────────────────┘       │
│                                                                                  │
│                         ALERTING                                                 │
│                        ┌────────────────────────────────────────────────┐       │
│                        │              ALERTMANAGER                       │       │
│                        │                    │                            │       │
│                        │    ┌───────────────┼───────────────┐           │       │
│                        │    ▼               ▼               ▼           │       │
│                        │ PagerDuty      Slack          Email           │       │
│                        └────────────────────────────────────────────────┘       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Metrics Definitions

```yaml
# Prometheus metrics configuration
metrics:
  # Execution metrics
  execution:
    - name: code_runner_executions_total
      type: counter
      labels: [language, version, status, user_tier]
      description: "Total number of code executions"

    - name: code_runner_execution_duration_seconds
      type: histogram
      labels: [language, status]
      buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
      description: "Execution duration in seconds"

    - name: code_runner_execution_memory_bytes
      type: histogram
      labels: [language]
      buckets: [1048576, 10485760, 52428800, 104857600, 268435456]  # 1MB to 256MB
      description: "Memory used by executions"

    - name: code_runner_execution_output_bytes
      type: histogram
      labels: [language]
      description: "Size of execution output"

  # Queue metrics
  queue:
    - name: code_runner_queue_depth
      type: gauge
      labels: [queue, language]
      description: "Number of pending executions in queue"

    - name: code_runner_queue_wait_seconds
      type: histogram
      labels: [queue, language]
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5]
      description: "Time spent waiting in queue"

    - name: code_runner_queue_enqueue_total
      type: counter
      labels: [queue, language]
      description: "Total jobs enqueued"

  # Container pool metrics
  pool:
    - name: code_runner_warm_containers
      type: gauge
      labels: [language]
      description: "Available warm containers"

    - name: code_runner_cold_starts_total
      type: counter
      labels: [language]
      description: "Number of cold starts"

    - name: code_runner_cold_start_duration_seconds
      type: histogram
      labels: [language]
      buckets: [0.25, 0.5, 1, 2, 5]
      description: "Cold start duration"

    - name: code_runner_container_pool_utilization
      type: gauge
      labels: [language]
      description: "Pool utilization percentage"

  # Security metrics
  security:
    - name: code_runner_abuse_detected_total
      type: counter
      labels: [type, language]
      description: "Abuse attempts detected (crypto_mining, fork_bomb, etc)"

    - name: code_runner_timeout_kills_total
      type: counter
      labels: [language, reason]
      description: "Executions killed due to limits"

    - name: code_runner_blocked_imports_total
      type: counter
      labels: [language, module]
      description: "Blocked import attempts"

  # Infrastructure metrics
  infrastructure:
    - name: code_runner_worker_pods_ready
      type: gauge
      labels: [language]
      description: "Number of ready worker pods"

    - name: code_runner_node_count
      type: gauge
      labels: [pool]
      description: "Number of nodes in pool"
```

### 1.3 Structured Logging Format

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "service": "code-runner-worker",
  "trace_id": "abc123def456",
  "span_id": "789xyz",
  "execution_id": "exec-uuid-123",
  "user_id": "user-456",
  "event": "execution_completed",
  "language": "python",
  "version": "3.11",
  "duration_ms": 1234,
  "memory_bytes": 52428800,
  "exit_code": 0,
  "output_bytes": 256,
  "container_id": "container-abc",
  "cold_start": false,
  "queue_wait_ms": 45,
  "metadata": {
    "node": "worker-node-3",
    "pod": "worker-python-abc123",
    "region": "us-east-1"
  }
}
```

### 1.4 Log Categories

```yaml
log_categories:
  # Execution logs
  execution:
    retention: 30d
    level: info
    events:
      - execution_started
      - execution_completed
      - execution_failed
      - execution_timeout
      - output_truncated

  # Security logs
  security:
    retention: 90d
    level: warn
    events:
      - abuse_detected
      - blocked_syscall
      - blocked_import
      - resource_limit_exceeded
      - suspicious_pattern

  # Audit logs
  audit:
    retention: 365d
    level: info
    events:
      - user_execution_request
      - rate_limit_exceeded
      - authentication_failed
      - authorization_denied

  # System logs
  system:
    retention: 14d
    level: info
    events:
      - container_created
      - container_destroyed
      - pool_replenished
      - scale_event
      - health_check
```

### 1.5 Distributed Tracing

```yaml
# OpenTelemetry configuration
opentelemetry:
  service_name: code-runner

  exporters:
    otlp:
      endpoint: "tempo.monitoring.svc:4317"

  instrumentation:
    # Trace all HTTP requests
    http:
      enabled: true

    # Trace Redis operations
    redis:
      enabled: true

    # Custom spans for execution
    custom:
      - name: "code_execution"
        attributes:
          - language
          - version
          - user_id
          - execution_id

      - name: "container_lifecycle"
        attributes:
          - container_id
          - action  # create, destroy, claim
          - cold_start

# Trace context propagation
propagation:
  # Propagate trace context through Redis queue
  queue_message:
    headers:
      - traceparent
      - tracestate

  # Propagate through WebSocket messages
  websocket:
    include_trace_id: true
```

### 1.6 Dashboard Specifications

```yaml
dashboards:
  # Overview Dashboard
  overview:
    title: "Code Runner - Overview"
    refresh: 30s
    panels:
      - title: "Executions / minute"
        type: stat
        query: "rate(code_runner_executions_total[5m]) * 60"

      - title: "Success Rate"
        type: gauge
        query: "sum(rate(code_runner_executions_total{status='success'}[5m])) / sum(rate(code_runner_executions_total[5m]))"
        thresholds:
          red: 0.95
          yellow: 0.99

      - title: "P99 Latency"
        type: stat
        query: "histogram_quantile(0.99, rate(code_runner_execution_duration_seconds_bucket[5m]))"

      - title: "Queue Depth"
        type: graph
        query: "code_runner_queue_depth"

      - title: "Warm Containers"
        type: graph
        query: "code_runner_warm_containers"

  # Execution Dashboard
  execution:
    title: "Code Runner - Executions"
    panels:
      - title: "Executions by Language"
        type: pie
        query: "sum by (language) (increase(code_runner_executions_total[1h]))"

      - title: "Execution Duration Heatmap"
        type: heatmap
        query: "rate(code_runner_execution_duration_seconds_bucket[5m])"

      - title: "Cold Start Rate"
        type: graph
        query: "rate(code_runner_cold_starts_total[5m]) / rate(code_runner_executions_total[5m])"

      - title: "Memory Usage Distribution"
        type: histogram
        query: "code_runner_execution_memory_bytes"

  # Security Dashboard
  security:
    title: "Code Runner - Security"
    panels:
      - title: "Abuse Attempts"
        type: stat
        query: "sum(increase(code_runner_abuse_detected_total[24h]))"

      - title: "Abuse by Type"
        type: bar
        query: "sum by (type) (increase(code_runner_abuse_detected_total[24h]))"

      - title: "Blocked Imports"
        type: table
        query: "topk(10, sum by (module) (increase(code_runner_blocked_imports_total[24h])))"

      - title: "Timeout Kills"
        type: graph
        query: "rate(code_runner_timeout_kills_total[5m])"

  # Infrastructure Dashboard
  infrastructure:
    title: "Code Runner - Infrastructure"
    panels:
      - title: "Worker Pods by Language"
        type: graph
        query: "code_runner_worker_pods_ready"

      - title: "Node Utilization"
        type: graph
        query: "sum(rate(container_cpu_usage_seconds_total{namespace='code-runner'}[5m])) by (node)"

      - title: "Container Pool Health"
        type: table
        query: "code_runner_warm_containers / code_runner_pool_target_size"

      - title: "Queue Processing Rate"
        type: graph
        query: "rate(code_runner_queue_enqueue_total[5m])"
```

---

## 2. Alerting

### 2.1 Alert Definitions

```yaml
# Prometheus alerting rules
groups:
  - name: code_runner_critical
    rules:
      # High error rate
      - alert: CodeRunnerHighErrorRate
        expr: |
          sum(rate(code_runner_executions_total{status="error"}[5m]))
          / sum(rate(code_runner_executions_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Code runner error rate above 5%"
          description: "Error rate is {{ $value | humanizePercentage }}"
          runbook: "https://wiki/runbooks/code-runner-errors"

      # Queue backup
      - alert: CodeRunnerQueueBackup
        expr: code_runner_queue_depth > 1000
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Execution queue depth exceeds 1000"
          description: "Queue depth: {{ $value }}"
          runbook: "https://wiki/runbooks/queue-backup"

      # No warm containers
      - alert: CodeRunnerNoWarmContainers
        expr: code_runner_warm_containers == 0
        for: 2m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "No warm containers available for {{ $labels.language }}"
          runbook: "https://wiki/runbooks/container-pool"

      # All workers down
      - alert: CodeRunnerWorkersDown
        expr: code_runner_worker_pods_ready == 0
        for: 1m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "No worker pods ready for {{ $labels.language }}"
          runbook: "https://wiki/runbooks/worker-down"

  - name: code_runner_warning
    rules:
      # High latency
      - alert: CodeRunnerHighLatency
        expr: |
          histogram_quantile(0.99, rate(code_runner_execution_duration_seconds_bucket[5m])) > 10
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Code runner P99 latency above 10s"
          description: "P99 latency: {{ $value | humanizeDuration }}"

      # High cold start rate
      - alert: CodeRunnerHighColdStartRate
        expr: |
          rate(code_runner_cold_starts_total[5m])
          / rate(code_runner_executions_total[5m]) > 0.2
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Cold start rate above 20%"
          description: "Cold start rate: {{ $value | humanizePercentage }}"

      # Container pool low
      - alert: CodeRunnerContainerPoolLow
        expr: |
          code_runner_warm_containers / code_runner_pool_target_size < 0.3
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Container pool below 30% capacity"

  - name: code_runner_security
    rules:
      # Abuse spike
      - alert: CodeRunnerAbuseSpike
        expr: |
          rate(code_runner_abuse_detected_total[5m]) > 1
        for: 5m
        labels:
          severity: warning
          team: security
        annotations:
          summary: "Elevated abuse attempts detected"
          description: "Abuse type: {{ $labels.type }}"

      # Unusual execution patterns
      - alert: CodeRunnerUnusualPatterns
        expr: |
          rate(code_runner_timeout_kills_total[5m])
          / rate(code_runner_executions_total[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
          team: security
        annotations:
          summary: "High rate of execution timeouts (potential abuse)"

  - name: code_runner_sla
    rules:
      # SLA breach warning
      - alert: CodeRunnerSLAWarning
        expr: |
          (
            sum(rate(code_runner_executions_total{status="success"}[1h]))
            / sum(rate(code_runner_executions_total[1h]))
          ) < 0.995
        for: 30m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Approaching SLA breach (99.5% target)"
          description: "Current availability: {{ $value | humanizePercentage }}"

      # SLA breach
      - alert: CodeRunnerSLABreach
        expr: |
          (
            sum(rate(code_runner_executions_total{status="success"}[1h]))
            / sum(rate(code_runner_executions_total[1h]))
          ) < 0.99
        for: 15m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "SLA BREACH: Availability below 99%"
          description: "Current availability: {{ $value | humanizePercentage }}"
```

### 2.2 Alert Routing

```yaml
# Alertmanager configuration
route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'

  routes:
    # Critical alerts -> PagerDuty + Slack
    - match:
        severity: critical
      receiver: 'critical'
      continue: true

    # Security alerts -> Security team
    - match:
        team: security
      receiver: 'security'

    # SLA alerts -> Management + Platform
    - match_re:
        alertname: '.*SLA.*'
      receiver: 'sla'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#platform-alerts'
        send_resolved: true

  - name: 'critical'
    pagerduty_configs:
      - service_key: '<pagerduty-key>'
        severity: critical
    slack_configs:
      - channel: '#platform-critical'
        send_resolved: true

  - name: 'security'
    slack_configs:
      - channel: '#security-alerts'
    email_configs:
      - to: 'security@company.com'

  - name: 'sla'
    slack_configs:
      - channel: '#platform-sla'
    email_configs:
      - to: 'platform-leads@company.com'
```

---

## 3. CI/CD Pipeline

### 3.1 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CI/CD PIPELINE                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  DEVELOPER                                                                       │
│      │                                                                           │
│      │ git push                                                                  │
│      ▼                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         SOURCE CONTROL (GitHub)                          │    │
│  │  • Protected main branch                                                 │    │
│  │  • Required PR reviews (2)                                               │    │
│  │  • Required status checks                                                │    │
│  └─────────────────────────────────┬───────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                      CI PIPELINE (GitHub Actions)                        │    │
│  │                                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │    │
│  │  │    Build     │  │    Test      │  │   Security   │  │   Publish   │ │    │
│  │  │              │  │              │  │    Scan      │  │             │ │    │
│  │  │ • Compile    │─>│ • Unit tests │─>│ • SAST       │─>│ • Push to   │ │    │
│  │  │ • Lint       │  │ • Int. tests │  │ • Deps scan  │  │   ECR       │ │    │
│  │  │ • Type check │  │ • Coverage   │  │ • Container  │  │ • Sign      │ │    │
│  │  │              │  │   > 80%      │  │   scan       │  │   image     │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │    │
│  │                                                                          │    │
│  └─────────────────────────────────┬───────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                      CD PIPELINE (ArgoCD)                                │    │
│  │                                                                          │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │    │
│  │  │                        STAGING                                      │ │    │
│  │  │  • Auto-deploy on merge to main                                    │ │    │
│  │  │  • Smoke tests                                                     │ │    │
│  │  │  • Integration tests                                               │ │    │
│  │  │  • Performance baseline                                            │ │    │
│  │  └────────────────────────────────────┬───────────────────────────────┘ │    │
│  │                                       │                                  │    │
│  │                              Manual approval                             │    │
│  │                                       │                                  │    │
│  │                                       ▼                                  │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │    │
│  │  │                      PRODUCTION (Canary)                            │ │    │
│  │  │                                                                     │ │    │
│  │  │   Phase 1: 5% traffic ──> Phase 2: 25% ──> Phase 3: 100%          │ │    │
│  │  │      │                        │                  │                  │ │    │
│  │  │      ▼                        ▼                  ▼                  │ │    │
│  │  │   Monitor 15m            Monitor 30m        Full rollout           │ │    │
│  │  │   Auto-rollback          Auto-rollback      if success             │ │    │
│  │  │   on errors              on errors                                  │ │    │
│  │  │                                                                     │ │    │
│  │  └────────────────────────────────────────────────────────────────────┘ │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yaml
name: Code Runner CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ${{ secrets.ECR_REGISTRY }}
  IMAGE_NAME: code-runner

jobs:
  # Build and test
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Lint
        uses: golangci/golangci-lint-action@v3
        with:
          version: latest

      - name: Build
        run: go build -v ./...

      - name: Test
        run: |
          go test -v -race -coverprofile=coverage.out ./...
          go tool cover -func=coverage.out

      - name: Check coverage
        run: |
          COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi

  # Security scanning
  security:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      # Static analysis
      - name: Run Gosec
        uses: securego/gosec@master
        with:
          args: ./...

      # Dependency scanning
      - name: Run Trivy (dependencies)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

      # Secret scanning
      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # Build and push container images
  container:
    runs-on: ubuntu-latest
    needs: [build, security]
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        language: [python, javascript, java, go, cpp, rust]
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $REGISTRY

      - name: Build image
        run: |
          docker build \
            -f docker/${{ matrix.language }}/Dockerfile \
            -t $REGISTRY/$IMAGE_NAME-${{ matrix.language }}:${{ github.sha }} \
            -t $REGISTRY/$IMAGE_NAME-${{ matrix.language }}:latest \
            .

      - name: Scan container
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: '${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-${{ matrix.language }}:${{ github.sha }}'
          exit-code: '1'
          severity: 'CRITICAL'

      - name: Sign image
        run: |
          cosign sign --key ${{ secrets.COSIGN_KEY }} \
            $REGISTRY/$IMAGE_NAME-${{ matrix.language }}:${{ github.sha }}

      - name: Push image
        run: |
          docker push $REGISTRY/$IMAGE_NAME-${{ matrix.language }}:${{ github.sha }}
          docker push $REGISTRY/$IMAGE_NAME-${{ matrix.language }}:latest

  # Deploy to staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: container
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Update staging manifests
        run: |
          cd k8s/overlays/staging
          kustomize edit set image code-runner-*=$REGISTRY/$IMAGE_NAME-*:${{ github.sha }}

      - name: Commit and push
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git commit -am "Deploy ${{ github.sha }} to staging"
          git push

      - name: Wait for ArgoCD sync
        run: |
          argocd app wait code-runner-staging --timeout 300

      - name: Run smoke tests
        run: |
          ./scripts/smoke-tests.sh staging

  # Deploy to production (manual approval required)
  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy canary (5%)
        run: |
          kubectl apply -f k8s/overlays/production/canary-5.yaml
          sleep 900  # 15 minutes

      - name: Check canary metrics
        run: |
          ./scripts/check-canary-health.sh 5

      - name: Deploy canary (25%)
        run: |
          kubectl apply -f k8s/overlays/production/canary-25.yaml
          sleep 1800  # 30 minutes

      - name: Check canary metrics
        run: |
          ./scripts/check-canary-health.sh 25

      - name: Full rollout
        run: |
          kubectl apply -f k8s/overlays/production/full-rollout.yaml

      - name: Verify deployment
        run: |
          kubectl rollout status deployment/code-runner-workers -n production
```

### 3.3 Rollback Procedures

```yaml
# Automatic rollback configuration (Argo Rollouts)
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: code-runner-workers
spec:
  replicas: 50
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: {duration: 15m}
        - analysis:
            templates:
              - templateName: success-rate
            args:
              - name: service-name
                value: code-runner-workers
        - setWeight: 25
        - pause: {duration: 30m}
        - analysis:
            templates:
              - templateName: success-rate
        - setWeight: 100

      # Automatic rollback triggers
      analysis:
        successfulRunHistoryLimit: 3
        unsuccessfulRunHistoryLimit: 3

---
# Analysis template for canary
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 1m
      count: 5
      successCondition: result[0] >= 0.99
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(code_runner_executions_total{status="success"}[5m]))
            / sum(rate(code_runner_executions_total[5m]))
```

### 3.4 Manual Rollback Commands

```bash
#!/bin/bash
# scripts/rollback.sh

# Immediate rollback to previous version
rollback_immediate() {
  echo "Initiating immediate rollback..."

  # Get previous revision
  PREV_REVISION=$(kubectl rollout history deployment/code-runner-workers -n production | tail -2 | head -1 | awk '{print $1}')

  # Rollback
  kubectl rollout undo deployment/code-runner-workers -n production --to-revision=$PREV_REVISION

  # Wait for rollback
  kubectl rollout status deployment/code-runner-workers -n production

  echo "Rollback complete"
}

# Rollback to specific version
rollback_to_version() {
  VERSION=$1
  echo "Rolling back to version $VERSION..."

  # Update image tag
  kubectl set image deployment/code-runner-workers \
    code-runner=$REGISTRY/code-runner:$VERSION \
    -n production

  kubectl rollout status deployment/code-runner-workers -n production
}

# Rollback with traffic drain
rollback_graceful() {
  echo "Initiating graceful rollback..."

  # Scale down canary
  kubectl scale deployment/code-runner-workers-canary --replicas=0 -n production

  # Wait for in-flight requests
  sleep 30

  # Rollback stable
  kubectl rollout undo deployment/code-runner-workers -n production

  kubectl rollout status deployment/code-runner-workers -n production
}
```

---

## 4. Security Compliance

### 4.1 OWASP Top 10 Mitigations for Code Execution

| OWASP Category | Risk in Code Runner | Mitigation |
|----------------|---------------------|------------|
| **A01: Broken Access Control** | Unauthorized code execution | JWT validation, subscription checks, rate limiting |
| **A02: Cryptographic Failures** | Exposed execution results | TLS everywhere, encrypted storage, no sensitive data in logs |
| **A03: Injection** | Code injection via input | Input validation, sandboxed execution, output sanitization |
| **A04: Insecure Design** | Architecture flaws | Defense in depth, least privilege, threat modeling |
| **A05: Security Misconfiguration** | Exposed services, weak defaults | Hardened containers, network policies, security scanning |
| **A06: Vulnerable Components** | CVEs in dependencies | Dependency scanning, regular updates, minimal images |
| **A07: Auth Failures** | Token theft, session hijacking | Short-lived tokens, secure storage, MFA for admins |
| **A08: Software/Data Integrity** | Tampered containers | Image signing, admission control, supply chain security |
| **A09: Logging Failures** | Missed security events | Comprehensive audit logging, SIEM integration |
| **A10: SSRF** | Outbound requests from code | Network isolation (deny all egress) |

### 4.2 Least Privilege Implementation

```yaml
# Kubernetes RBAC for workers
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: code-runner-worker
  namespace: code-execution
rules:
  # No access to secrets
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: []

  # No access to other pods
  - apiGroups: [""]
    resources: ["pods"]
    verbs: []

  # Only read configmaps
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get"]

---
# Service account with minimal permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: code-runner-worker
  namespace: code-execution
automountServiceAccountToken: false  # No K8s API access
```

### 4.3 Security Audit Logging

```python
# Comprehensive audit logging
class SecurityAuditLogger:
    def __init__(self):
        self.logger = structlog.get_logger("security.audit")

    def log_execution_request(self, user_id: str, execution_id: str, metadata: dict):
        self.logger.info(
            "execution_requested",
            user_id=user_id,
            execution_id=execution_id,
            language=metadata.get("language"),
            source_ip=metadata.get("source_ip"),
            user_agent=metadata.get("user_agent"),
            timestamp=datetime.utcnow().isoformat()
        )

    def log_security_event(self, event_type: str, severity: str, details: dict):
        self.logger.warning(
            "security_event",
            event_type=event_type,
            severity=severity,
            **details,
            timestamp=datetime.utcnow().isoformat()
        )

    def log_blocked_action(self, user_id: str, action: str, reason: str):
        self.logger.warning(
            "blocked_action",
            user_id=user_id,
            action=action,
            reason=reason,
            timestamp=datetime.utcnow().isoformat()
        )

    def log_admin_action(self, admin_id: str, action: str, target: str, details: dict):
        self.logger.info(
            "admin_action",
            admin_id=admin_id,
            action=action,
            target=target,
            **details,
            timestamp=datetime.utcnow().isoformat()
        )

# Audit events to log
AUDIT_EVENTS = [
    "user_login",
    "user_logout",
    "execution_requested",
    "execution_completed",
    "execution_failed",
    "abuse_detected",
    "rate_limit_exceeded",
    "blocked_import_attempt",
    "resource_limit_exceeded",
    "admin_user_banned",
    "admin_config_changed",
    "deployment_initiated",
    "rollback_executed",
]
```

### 4.4 Penetration Testing Checklist

```markdown
## Code Runner Penetration Testing Checklist

### Authentication & Authorization
- [ ] Test JWT token validation (expired, malformed, tampered)
- [ ] Test subscription-based access control
- [ ] Test rate limiting bypass attempts
- [ ] Test API key rotation

### Input Validation
- [ ] Test code size limits
- [ ] Test malformed code submissions
- [ ] Test injection in code comments
- [ ] Test Unicode/encoding attacks

### Sandbox Escapes
- [ ] Test process creation limits
- [ ] Test memory exhaustion
- [ ] Test filesystem escape attempts
- [ ] Test network access attempts
- [ ] Test syscall filtering
- [ ] Test container escape techniques

### Resource Exhaustion
- [ ] Test infinite loop handling
- [ ] Test fork bomb handling
- [ ] Test memory bomb handling
- [ ] Test disk fill attempts
- [ ] Test CPU exhaustion

### Information Disclosure
- [ ] Test access to host filesystem
- [ ] Test access to environment variables
- [ ] Test access to other executions
- [ ] Test error message information leakage

### API Security
- [ ] Test CORS configuration
- [ ] Test HTTP security headers
- [ ] Test WebSocket authentication
- [ ] Test request smuggling

### Infrastructure
- [ ] Test Kubernetes network policies
- [ ] Test pod security policies
- [ ] Test secrets management
- [ ] Test container image vulnerabilities
```

### 4.5 Compliance Checklist

```yaml
compliance_requirements:
  # SOC 2 Type II controls
  soc2:
    - control: CC6.1
      description: "Logical access security"
      implementation:
        - JWT-based authentication
        - RBAC authorization
        - MFA for admin access
      evidence:
        - Authentication logs
        - Access reviews

    - control: CC6.6
      description: "Restriction of logical access"
      implementation:
        - Network isolation
        - Container sandboxing
        - Least privilege
      evidence:
        - Network policies
        - Pod security policies

    - control: CC7.1
      description: "Detection of changes"
      implementation:
        - Container image scanning
        - Runtime monitoring
        - Audit logging
      evidence:
        - Scan reports
        - Monitoring dashboards

  # Data protection
  data_protection:
    - requirement: "Code execution isolation"
      implementation: "gVisor + namespace isolation"

    - requirement: "No data persistence"
      implementation: "tmpfs only, destroyed after execution"

    - requirement: "Output sanitization"
      implementation: "Truncation, encoding validation"

    - requirement: "Audit trail"
      implementation: "365-day log retention"
```

---

## 5. Incident Response

### 5.1 Incident Classification

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **SEV-1** | Complete outage or security breach | 15 min | All executions failing, container escape |
| **SEV-2** | Major degradation | 30 min | >50% error rate, significant latency |
| **SEV-3** | Minor degradation | 2 hours | Single language affected, elevated errors |
| **SEV-4** | Minimal impact | 24 hours | Monitoring gap, minor bug |

### 5.2 Runbooks

```markdown
# Runbook: High Error Rate

## Symptoms
- Alert: CodeRunnerHighErrorRate
- Error rate > 5% for 5+ minutes

## Diagnosis Steps

1. Check error distribution by language:
   ```
   sum by (language) (rate(code_runner_executions_total{status="error"}[5m]))
   ```

2. Check recent deployments:
   ```bash
   kubectl rollout history deployment/code-runner-workers -n production
   ```

3. Check container pool health:
   ```
   code_runner_warm_containers
   ```

4. Check worker logs for errors:
   ```bash
   kubectl logs -l app=code-runner-worker --tail=100 -n production | grep ERROR
   ```

## Resolution Steps

### If caused by recent deployment:
1. Initiate rollback:
   ```bash
   kubectl rollout undo deployment/code-runner-workers -n production
   ```

### If caused by container issues:
1. Force pool refresh:
   ```bash
   kubectl delete pods -l app=code-runner-pool-manager -n production
   ```

### If caused by infrastructure:
1. Check node health
2. Check Redis connectivity
3. Scale up workers if capacity issue

## Escalation
- After 15 min without resolution: Page secondary on-call
- After 30 min: Page engineering lead
```

```markdown
# Runbook: Queue Backup

## Symptoms
- Alert: CodeRunnerQueueBackup
- Queue depth > 1000

## Diagnosis Steps

1. Check queue depth by language:
   ```
   code_runner_queue_depth
   ```

2. Check worker capacity:
   ```
   code_runner_worker_pods_ready
   ```

3. Check if autoscaling is working:
   ```bash
   kubectl get hpa code-runner-workers-hpa -n production
   ```

4. Check for processing failures:
   ```
   rate(code_runner_queue_processing_errors_total[5m])
   ```

## Resolution Steps

### If workers not scaling:
1. Check HPA status and events
2. Manually scale if needed:
   ```bash
   kubectl scale deployment/code-runner-workers --replicas=100 -n production
   ```

### If processing stuck:
1. Check Redis health
2. Restart workers:
   ```bash
   kubectl rollout restart deployment/code-runner-workers -n production
   ```

### If traffic spike:
1. Enable queue admission control
2. Increase rate limits for premium users only
```

```markdown
# Runbook: Security - Abuse Detected

## Symptoms
- Alert: CodeRunnerAbuseSpike
- Elevated abuse_detected metrics

## Immediate Actions

1. Identify affected user(s):
   ```bash
   kubectl logs -l app=code-runner-worker -n production | grep "abuse_detected" | jq '.user_id' | sort | uniq -c | sort -rn | head
   ```

2. Check abuse type:
   - crypto_mining: CPU pattern abuse
   - fork_bomb: Process limit exceeded
   - memory_bomb: Memory limit exceeded
   - network_attempt: Blocked network access

## Response by Type

### Crypto Mining
1. Verify user behavior pattern
2. If confirmed, ban user temporarily:
   ```bash
   ./scripts/ban-user.sh <user_id> --duration=24h --reason="crypto_mining"
   ```

### Fork Bomb / Resource Abuse
1. Review code submissions
2. If malicious, ban user
3. If accidental, send warning

### Network Attempts
1. Review blocked requests
2. Usually indicates educational code, not malicious
3. Only escalate if repeated with unusual patterns

## Escalation
- Confirmed security breach: Immediately page security team
- Potential targeted attack: Page security lead
```

### 5.3 Post-Incident Review Template

```markdown
# Post-Incident Review: [Incident Title]

## Summary
- **Incident ID:** INC-2024-XXX
- **Severity:** SEV-X
- **Duration:** XX minutes
- **Impact:** X users affected, X executions failed

## Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert triggered |
| HH:MM | On-call acknowledged |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Service restored |

## Root Cause
[Detailed technical explanation]

## Contributing Factors
- [Factor 1]
- [Factor 2]

## What Went Well
- [Item 1]
- [Item 2]

## What Could Be Improved
- [Item 1]
- [Item 2]

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | @person | YYYY-MM-DD | Open |
| [Action 2] | @person | YYYY-MM-DD | Open |

## Lessons Learned
[Key takeaways]
```

---

## 6. Production Readiness Checklist - Code Runner

### 6.1 Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| gVisor runtime configured | ⬜ | |
| Seccomp profiles deployed | ⬜ | |
| Network policies enforced | ⬜ | |
| Container images scanned | ⬜ | |
| Container images signed | ⬜ | |
| Secrets in vault/secrets manager | ⬜ | |
| TLS everywhere | ⬜ | |
| Rate limiting configured | ⬜ | |
| Input validation implemented | ⬜ | |
| Output sanitization implemented | ⬜ | |
| Audit logging enabled | ⬜ | |
| Penetration test completed | ⬜ | |

### 6.2 Scalability Checklist

| Item | Status | Notes |
|------|--------|-------|
| Horizontal pod autoscaler configured | ⬜ | |
| Container pool manager deployed | ⬜ | |
| Cold start < 2s achieved | ⬜ | |
| Queue processing verified | ⬜ | |
| Load testing completed | ⬜ | |
| Capacity planning documented | ⬜ | |
| Cost optimization reviewed | ⬜ | |

### 6.3 Reliability Checklist

| Item | Status | Notes |
|------|--------|-------|
| Health checks configured | ⬜ | |
| Liveness/readiness probes set | ⬜ | |
| Pod disruption budgets defined | ⬜ | |
| Graceful shutdown implemented | ⬜ | |
| Retry logic implemented | ⬜ | |
| Circuit breakers configured | ⬜ | |
| Failover tested | ⬜ | |

### 6.4 Operational Readiness Checklist

| Item | Status | Notes |
|------|--------|-------|
| Prometheus metrics exported | ⬜ | |
| Grafana dashboards created | ⬜ | |
| Alerts configured | ⬜ | |
| Alert routing verified | ⬜ | |
| Runbooks written | ⬜ | |
| On-call rotation established | ⬜ | |
| Escalation paths defined | ⬜ | |
| CI/CD pipeline tested | ⬜ | |
| Rollback procedure verified | ⬜ | |
| Disaster recovery tested | ⬜ | |

### 6.5 Documentation Checklist

| Item | Status | Notes |
|------|--------|-------|
| Architecture documented | ⬜ | |
| API documentation complete | ⬜ | |
| Runbooks complete | ⬜ | |
| Security documentation | ⬜ | |
| Deployment guide | ⬜ | |
| Troubleshooting guide | ⬜ | |

---

## Deliverables Summary

| Deliverable | Status | Location |
|-------------|--------|----------|
| Monitoring Dashboard Specification | ✅ Complete | Section 1.6 |
| Alert Definitions and Thresholds | ✅ Complete | Section 2.1 |
| CI/CD Pipeline Diagram | ✅ Complete | Section 3.1 |
| Security Compliance Checklist | ✅ Complete | Section 4.5 |
| OWASP Mitigations | ✅ Complete | Section 4.1 |
| Runbooks | ✅ Complete | Section 5.2 |
| Production Readiness Checklist | ✅ Complete | Section 6 |
