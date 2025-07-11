#!/bin/bash

# Resume All Queues Script
echo "🔄 Resuming all Redis job queues..."

API_KEY="${CRON_API_KEY:-test-scheduler-key}"
BASE_URL="http://localhost:3000/api/queue-status"

# List of all queues to resume
QUEUES=(
  "high-priority"
  "scheduler"
  "notifications"
  "webhooks"
  "reports"
  "social-sync"
  "maintenance"
)

echo "📋 Resuming ${#QUEUES[@]} queues..."

# Resume each queue
for queue in "${QUEUES[@]}"; do
  echo "▶️  Resuming queue: $queue"
  response=$(curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d "{\"action\": \"resume_queue\", \"queueName\": \"$queue\", \"apiKey\": \"$API_KEY\"}")
  
  if echo "$response" | grep -q "success.*true"; then
    echo "✅ Queue $queue resumed successfully"
  else
    echo "❌ Failed to resume queue $queue: $response"
  fi
done

echo ""
echo "🎯 Checking final queue status..."
sleep 2

# Check status
status=$(curl -s "$BASE_URL?action=status&apiKey=$API_KEY")
if echo "$status" | grep -q "success.*true"; then
  running_jobs=$(echo "$status" | grep -o '"running":true' | wc -l)
  total_jobs=$(echo "$status" | grep -o '"running":\(true\|false\)' | wc -l)
  echo "📊 Result: $running_jobs/$total_jobs jobs running"
  
  if [ "$running_jobs" -eq "$total_jobs" ]; then
    echo "🎉 All queues resumed successfully!"
  else
    echo "⚠️  Some jobs may still be paused. Check admin dashboard."
  fi
else
  echo "❌ Failed to get system status"
fi

echo "📝 Dashboard: http://localhost:3000/admin/cron"