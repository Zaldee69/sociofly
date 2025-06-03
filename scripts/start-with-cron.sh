#!/bin/bash

# Start Development Server with Cron Jobs
echo "🚀 Starting development server with cron jobs..."

# Set environment variables
export ENABLE_CRON_JOBS=true
export CRON_API_KEY=test-scheduler-key
export NEXT_PUBLIC_CRON_API_KEY=test-scheduler-key
export TZ=Asia/Jakarta

# Function to check if server is running
check_server() {
    curl -s localhost:3000/api/health > /dev/null 2>&1
    return $?
}

# Function to initialize cron jobs
initialize_cron() {
    echo "🔧 Initializing cron jobs..."
    sleep 5  # Wait for server to be ready
    
    # Try to initialize cron jobs
    response=$(curl -s -X POST localhost:3000/api/cron-manager \
        -H "Content-Type: application/json" \
        -d '{"action": "initialize", "apiKey": "test-scheduler-key"}' 2>/dev/null)
    
    if echo "$response" | grep -q "success.*true"; then
        echo "✅ Cron jobs initialized successfully"
        
        # Check status
        status=$(curl -s "localhost:3000/api/cron-manager?action=status&apiKey=test-scheduler-key" 2>/dev/null)
        running_count=$(echo "$status" | grep -o '"running":true' | wc -l)
        echo "📊 Running jobs: $running_count/5"
        
        return 0
    else
        echo "❌ Failed to initialize cron jobs"
        echo "Response: $response"
        return 1
    fi
}

# Start Next.js development server in background
echo "🌐 Starting Next.js development server..."
npm run dev &
DEV_PID=$!

# Wait for server to be ready and initialize cron jobs
echo "⏳ Waiting for server to be ready..."
for i in {1..30}; do
    if check_server; then
        echo "✅ Server is ready"
        if initialize_cron; then
            break
        fi
    fi
    echo "⏳ Waiting... ($i/30)"
    sleep 2
done

# Keep script running and monitor cron jobs
echo "🎯 Monitoring cron jobs..."
echo "📝 Logs: Check admin dashboard at http://localhost:3000/admin/cron"
echo ""
echo "🛑 Press Ctrl+C to stop"

# Monitor and auto-restart if needed
while true; do
    sleep 60  # Check every minute
    
    # Check if any jobs stopped
    status=$(curl -s "localhost:3000/api/cron-manager?action=status&apiKey=test-scheduler-key" 2>/dev/null)
    if [ $? -eq 0 ]; then
        running_count=$(echo "$status" | grep -o '"running":true' | wc -l)
        if [ "$running_count" -lt 5 ]; then
            echo "⚠️  Only $running_count/5 jobs running. Restarting..."
            initialize_cron
        fi
    fi
done

# Cleanup on exit
trap 'echo "🛑 Stopping..."; kill $DEV_PID 2>/dev/null; exit' INT TERM 