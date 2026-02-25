# Production Dockerfile for FIS Learn API
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

# Install pnpm and dependencies
RUN npm install -g pnpm@8.15.0
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/api/prisma ./apps/api/prisma

# Copy source code
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api

# Install prisma explicitly for build stage
RUN pnpm add -D prisma --filter api

# Generate Prisma client
RUN pnpm --filter api exec prisma generate

# Build the application
RUN pnpm --filter api exec nest build

# Stage 3: Runner (Production)
FROM node:20-alpine AS production
# dumb-init: lightweight init that properly forwards OS signals to Node.js.
# Without it, Node.js runs as PID 1 and never receives SIGTERM from Docker,
# causing 10-second forced kills instead of graceful shutdown.
RUN apk add --no-cache libc6-compat openssl dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

# Copy node_modules from builder stage (includes all dependencies)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Set environment
ENV NODE_ENV=production
ENV PORT=3011
ENV NODE_PATH=/app/node_modules:/app/node_modules/.pnpm/node_modules

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3011

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3011/api/v1/health/live', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# dumb-init wraps Node.js so SIGTERM/SIGINT are properly forwarded,
# enabling NestJS graceful shutdown hooks to run before the process exits.
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "--max-old-space-size=512", "--max-semi-space-size=64", "apps/api/dist/src/main.js"]
