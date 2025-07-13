FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat netcat-openbsd curl

# Install specific yarn version as specified in package.json
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Verify files are copied correctly
RUN ls -la && echo "Checking yarn.lock:" && head -10 yarn.lock

# Install dependencies based on the preferred package manager
RUN \
  if [ -f yarn.lock ]; then \
    echo "Installing with yarn --frozen-lockfile" && \
    yarn --frozen-lockfile --verbose; \
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

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# Generate Prisma Client
RUN npx prisma generate

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

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

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Use the initialization script as entrypoint
ENTRYPOINT ["./docker-init.sh"]
CMD ["node", "server.js"]