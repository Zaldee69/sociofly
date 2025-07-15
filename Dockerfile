FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install system dependencies and enable corepack globally
RUN apk add --no-cache libc6-compat netcat-openbsd curl && \
    corepack enable

# Copy package files
COPY package.json package-lock.json* yarn.lock* .yarnrc.yml* ./

# Debug: List copied files and check corepack status
RUN echo "=== Debug Info ===" && \
    ls -la && \
    echo "Node version: $(node --version)" && \
    echo "NPM version: $(npm --version)" && \
    echo "Corepack status: $(corepack --version)" && \
    echo "================="

# Install dependencies based on the preferred package manager
# Use cache mount for faster builds
RUN --mount=type=cache,target=/root/.yarn \
  if [ -f yarn.lock ]; then \
    echo "Installing with yarn (using corepack)" && \
    corepack enable && \
    corepack prepare --activate && \
    echo "Yarn version: $(yarn --version)" && \
    yarn install --immutable --network-timeout 300000; \
  elif [ -f package-lock.json ]; then \
    echo "Installing with npm ci" && \
    npm ci; \
  else \
    echo "Installing with npm i" && \
    npm i; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments for environment variables
ARG NODE_ENV=production
ARG SKIP_ENV_VALIDATION=true
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL
ARG NEXT_PUBLIC_WEBSOCKET_PORT
ARG NEXT_PUBLIC_FACEBOOK_CLIENT_ID

# Set environment variables for build time
ENV NODE_ENV=$NODE_ENV
ENV SKIP_ENV_VALIDATION=$SKIP_ENV_VALIDATION
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_WEBSOCKET_URL=$NEXT_PUBLIC_WEBSOCKET_URL
ENV NEXT_PUBLIC_WEBSOCKET_PORT=$NEXT_PUBLIC_WEBSOCKET_PORT
ENV NEXT_PUBLIC_FACEBOOK_CLIENT_ID=$NEXT_PUBLIC_FACEBOOK_CLIENT_ID

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma Client
RUN npx prisma generate

# Ensure scripts directory exists and verify files
RUN mkdir -p ./scripts

# Debug: Verify files are available in builder stage
RUN echo "=== Builder Stage File Check ===" && \
    echo "Scripts directory:" && \
    ls -la ./scripts/ || echo "Scripts directory not found" && \
    echo "start-with-redis.sh:" && \
    ls -la ./scripts/start-with-redis.sh || echo "start-with-redis.sh not found" && \
    echo "websocket-server.js:" && \
    ls -la ./websocket-server.js || echo "websocket-server.js not found" && \
    echo "=============================="

# Build with cache mount for faster builds
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Debug: Check if standalone output was created
RUN echo "=== Build Output Debug ===" && \
    ls -la .next/ && \
    echo "=== Standalone Directory ===" && \
    ls -la .next/standalone/ && \
    echo "=== Server.js Check ===" && \
    if [ -f ".next/standalone/server.js" ]; then \
      echo "✅ server.js found in standalone output"; \
      ls -la .next/standalone/server.js; \
    else \
      echo "❌ server.js NOT found in standalone output"; \
    fi && \
    echo "========================"

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache netcat-openbsd curl redis

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create scripts directory and copy startup script from builder stage
RUN mkdir -p ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/start-with-redis.sh ./scripts/
COPY --from=builder --chown=nextjs:nodejs /app/websocket-server.js ./
RUN chmod +x ./scripts/start-with-redis.sh

# Debug: Verify server.js was copied to runner stage
RUN echo "=== Runner Stage Debug ===" && \
    echo "Files in /app:" && \
    ls -la && \
    echo "=== Server.js Check ===" && \
    if [ -f "server.js" ]; then \
      echo "✅ server.js found in runner stage"; \
      ls -la server.js; \
    else \
      echo "❌ server.js NOT found in runner stage"; \
      echo "Looking for server.js in subdirectories:"; \
      find . -name "server.js" -type f 2>/dev/null || echo "No server.js found anywhere"; \
    fi && \
    echo "========================"

# Debug: Verify script and websocket server were copied correctly
RUN echo "=== Script Copy Debug ===" && \
    echo "Scripts directory contents:" && \
    ls -la ./scripts/ && \
    echo "Script permissions:" && \
    ls -la ./scripts/start-with-redis.sh && \
    echo "WebSocket server:" && \
    ls -la ./websocket-server.js && \
    echo "Script first few lines:" && \
    head -5 ./scripts/start-with-redis.sh && \
    echo "Testing script readability:" && \
    test -r /app/scripts/start-with-redis.sh && echo "✅ Script is readable" || echo "❌ Script is not readable" && \
    echo "========================"



USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Default command with Redis job initialization
# Use exec form to avoid shell interpretation issues
CMD ["/bin/sh", "/app/scripts/start-with-redis.sh"]