# Multi-stage build for Web
FROM node:20-alpine AS builder

WORKDIR /app

# Pin pnpm version for reproducible builds (unpinned = non-deterministic installs)
RUN npm install -g pnpm@8.15.0

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web
COPY apps/web/tsconfig.json ./apps/web/

# Accept build-time env vars (NEXT_PUBLIC_* must be set at build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:3011/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
RUN pnpm --filter web build

# Production stage — minimal image
FROM node:20-alpine AS production

WORKDIR /app

# Non-root user — running as root inside a container is a security risk.
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nodejs

# Pin pnpm version
RUN npm install -g pnpm@8.15.0

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

# Production-only dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/apps/web/.next    ./apps/web/.next
COPY --from=builder /app/apps/web/public   ./apps/web/public
COPY --from=builder /app/apps/web/messages ./apps/web/messages
COPY --from=builder /app/apps/web/package.json ./apps/web/

RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3010

# Health check — prevents traffic being routed to a container that hasn't
# finished starting or is in a crash-loop.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/', (r) => r.statusCode < 500 ? process.exit(0) : process.exit(1))"

# Start the application
CMD ["pnpm", "--filter", "web", "start"]

