# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build the application (type checking)
RUN bun run typecheck || true

# Production stage
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S bunuser && \
    adduser -S bunuser -u 1001 -G bunuser

# Copy package files and install production dependencies only
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY --from=builder /app/src ./src

# Set ownership
RUN chown -R bunuser:bunuser /app

# Switch to non-root user
USER bunuser

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["bun", "run", "src/index.ts"]
