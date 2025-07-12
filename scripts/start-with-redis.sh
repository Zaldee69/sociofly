#!/bin/bash

# Start Development Server with Redis Jobs
echo "🚀 Starting development server with Redis job scheduler..."

# Set environment variables
export ENABLE_SCHEDULED_JOBS=true
export CRON_API_KEY=test-scheduler-key
export NEXT_PUBLIC_CRON_API_KEY=test-scheduler-key
export TZ=Asia/Jakarta

# Function to check if server is running
check_server() {
    curl -s localhost:3000/api/health > /dev/null 2>&1
    return $?
}

# Function to check Redis availability
check_redis() {
    echo "🔍 Checking Redis availability..."
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli ping > /dev/null 2>&1; then
            echo "✅ Redis is running"
            return 0
        else
            echo "❌ Redis is not responding"
            return 1
        fi
    else
        echo "❌ Redis CLI not found"
        return 1
    fi
}

# Function to initialize Redis jobs
initialize_jobs() {
    echo "🔧 Initializing Redis-based jobs..."
    sleep 5  # Wait for server to be ready
    
    # Try to initialize jobs
    response=$(curl -s -X POST localhost:3000/api/queue-status \
        -H "Content-Type: application/json" \
        -d '{"action": "initialize", "apiKey": "test-scheduler-key"}' 2>/dev/null)
    
    if echo "$response" | grep -q "success.*true"; then
        echo "✅ Redis jobs initialized successfully"
        
        # Check status
        status=$(curl -s "localhost:3000/api/queue-status?action=status&apiKey=test-scheduler-key" 2>/dev/null)
        running_count=$(echo "$status" | grep -o '"running":true' | wc -l)
        echo "📊 Running jobs: $running_count/7"
        
        return 0
    else
        echo "❌ Failed to initialize Redis jobs"
        echo "Response: $response"
        return 1
    fi
}

# Check Redis first
if ! check_redis; then
    echo "❌ Redis is required for job scheduling"
    echo "💡 Please start Redis first:"
    echo "   brew services start redis"
    echo "   # or"
    echo "   redis-server"
    exit 1
fi

# Start WebSocket server in background
echo "🔌 Starting WebSocket server..."
node websocket-server.js &
WS_PID=$!

# Start Next.js development server in background
echo "🌐 Starting Next.js development server..."
npm run dev &
DEV_PID=$!

# Wait for server to be ready and initialize jobs
echo "⏳ Waiting for server to be ready..."
for i in {1..30}; do
    if check_server; then
        echo "✅ Server is ready"
        if initialize_jobs; then
            break
        fi
    fi
    echo "⏳ Waiting... ($i/30)"
    sleep 2
done

# Keep script running and monitor Redis jobs
echo "🎯 Monitoring Redis-based jobs..."
echo "📝 Dashboard: http://localhost:3000/admin/cron"
echo "📊 Queue Monitor: http://localhost:3000/admin/queues"
echo ""
echo "🛑 Press Ctrl+C to stop"

# Monitor and auto-restart if needed
while true; do
    sleep 60  # Check every minute
    
    # Check Redis connection
    if ! check_redis; then
        echo "⚠️  Redis connection lost! Jobs may not be running."
        continue
    fi
    
    # Check if any jobs stopped
    status=$(curl -s "localhost:3000/api/queue-status?action=status&apiKey=test-scheduler-key" 2>/dev/null)
    if [ $? -eq 0 ]; then
        running_count=$(echo "$status" | grep -o '"running":true' | wc -l)
        redis_available=$(echo "$status" | grep -o '"redisAvailable":true' | wc -l)
        
        if [ "$redis_available" -eq 0 ]; then
            echo "⚠️  Redis not available in job system. Reinitializing..."
            initialize_jobs
        elif [ "$running_count" -lt 5 ]; then
            echo "⚠️  Only $running_count/7 jobs running. Reinitializing..."
            initialize_jobs
        fi
    fi
done

# Cleanup on exit
trap 'echo "🛑 Stopping..."; kill $WS_PID $DEV_PID 2>/dev/null; exit' INT TERM