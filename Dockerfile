# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install Docker CLI for container management
RUN apk add --no-cache docker-cli

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy server.js and other runtime files
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/src ./src

# Create workspace directory for container configs
RUN mkdir -p /app/workspace && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production \
    HOST_UID=1001 \
    HOST_GID=1001 \
    WORKSPACE_ROOT=/app/workspace

# Start the application
CMD ["node", "server.js", "start"]
