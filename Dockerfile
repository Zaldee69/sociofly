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
RUN \
  if [ -f yarn.lock ]; then \
    echo "Installing with yarn (using corepack)" && \
    # Enable corepack and prepare yarn \
    corepack enable && \
    corepack prepare --activate && \
    # Verify yarn version \
    echo "Yarn version: $(yarn --version)" && \
    # Install dependencies with network timeout and retry \
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

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache netcat-openbsd curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy initialization script
COPY --chown=nextjs:nodejs scripts/docker-init.sh ./docker-init.sh
RUN chmod +x ./docker-init.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use the initialization script as entrypoint
ENTRYPOINT ["./docker-init.sh"]
CMD ["node", "server.js"]