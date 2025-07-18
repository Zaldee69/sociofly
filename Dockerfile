# Dockerfile Optimized
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat netcat-openbsd curl

# Copy package files
COPY package.json yarn.lock ./

# Install all dependencies (including devDependencies) for build
RUN yarn install --network-timeout 300000

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy only necessary files for build (exclude unnecessary files)
COPY package.json yarn.lock ./
COPY next.config.ts ./
COPY tailwind.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY components.json ./
COPY sentry.server.config.ts ./
COPY sentry.edge.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY public ./public
COPY scripts/start-with-redis.sh ./scripts/
COPY websocket-server.js ./

# Accept build arguments for environment variables with default values
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
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN yarn build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install only runtime dependencies
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

# Copy node_modules for WebSocket server dependencies
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy startup script and websocket server
RUN mkdir -p ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/start-with-redis.sh ./scripts/
COPY --from=builder --chown=nextjs:nodejs /app/websocket-server.js ./
RUN chmod +x ./scripts/start-with-redis.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/bin/sh", "/app/scripts/start-with-redis.sh"]