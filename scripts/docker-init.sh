#!/bin/bash

# Docker initialization script for my-scheduler-app
# This script runs inside the Docker container to initialize the application

set -e

echo "🚀 Initializing application in Docker environment..."

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
until nc -z redis 6379; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "✅ Redis is up and running"

# Initialize Redis jobs if enabled
if [ "$ENABLE_SCHEDULED_JOBS" = "true" ]; then
  echo "🔧 Initializing Redis jobs..."
  
  # Wait for Next.js server to be ready
  until curl -s http://localhost:3000/api/health > /dev/null; do
    echo "Waiting for Next.js server to be ready..."
    sleep 2
  done
  
  # Initialize jobs
  curl -s -X POST http://localhost:3000/api/queue-status \
    -H "Content-Type: application/json" \
    -d "{\"action\": \"initialize\", \"apiKey\": \"$CRON_API_KEY\"}"
  
  echo "✅ Redis jobs initialized"
fi

# Start the application
echo "🌐 Starting Next.js server..."
exec "$@" 