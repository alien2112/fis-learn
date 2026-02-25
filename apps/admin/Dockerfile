# Multi-stage build for Admin
FROM node:20-alpine AS builder

WORKDIR /app

# Pin pnpm version for reproducible builds
RUN npm install -g pnpm@8.15.0

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/admin ./apps/admin
COPY apps/admin/tsconfig.json ./apps/admin/

# Accept build-time env vars (NEXT_PUBLIC_* must be set at build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:3011/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
RUN pnpm --filter admin build

# Production stage — minimal image
FROM node:20-alpine AS production

WORKDIR /app

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nodejs

# Pin pnpm version
RUN npm install -g pnpm@8.15.0

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/

# Production-only dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/apps/admin/.next    ./apps/admin/.next
COPY --from=builder /app/apps/admin/messages ./apps/admin/messages
COPY --from=builder /app/apps/admin/package.json ./apps/admin/

RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/', (r) => r.statusCode < 500 ? process.exit(0) : process.exit(1))"

# Start the application
CMD ["pnpm", "--filter", "admin", "start"]

