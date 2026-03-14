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

# Install Docker CLI for container management and curl for health checks
RUN apk add --no-cache docker-cli curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set environment to ensure Next.js knows we're in standalone mode
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0

# Copy necessary files from builder
# IMPORTANT: Copy standalone files FIRST, then copy our custom files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Next.js standalone server files to the working directory
# Next.js standalone expects the static files at .next/static relative to where server.js runs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/server.js ./standalone-server.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/node_modules ./node_modules

# Copy the .next directory structure
# First copy the standalone .next directory (contains manifests and required files)
RUN mkdir -p .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/.next ./.next

# IMPORTANT: Next.js standalone mode requires static files to be copied separately
# These are NOT included in the standalone output and must be copied from .next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy our custom auth server as a separate file
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./custom-auth-server.js
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

# Create workspace directory for container configs
RUN mkdir -p /app/workspace && \
    chown -R nextjs:nodejs /app

# Expose port
EXPOSE 3000

# Start the application using the custom auth wrapper
# This will check AUTH_TOKEN and then start the Next.js standalone server
CMD ["node", "custom-auth-server.js"]
