#!/bin/bash

# Auto Recovery Redis Script
echo "🔧 Auto Redis Recovery System..."

API_KEY="${CRON_API_KEY:-test-scheduler-key}"
BASE_URL="http://localhost:3000/api/queue-status"

# Function to check system status
check_system_status() {
  local status=$(curl -s "$BASE_URL?action=status&apiKey=$API_KEY")
  
  if echo "$status" | grep -q '"redisAvailable":true'; then
    return 0  # System is healthy
  else
    return 1  # System needs recovery
  fi
}

# Function to check Redis directly
check_redis_direct() {
  if command -v redis-cli >/dev/null 2>&1; then
    if redis-cli ping > /dev/null 2>&1; then
      return 0  # Redis is running
    fi
  fi
  return 1  # Redis is down
}

# Function to recover system
recover_system() {
  echo "🚨 System recovery needed..."
  
  # Step 1: Check Redis directly
  if ! check_redis_direct; then
    echo "❌ Redis server is down! Please start Redis:"
    echo "   brew services start redis"
    return 1
  fi
  
  echo "✅ Redis server is running"
  
  # Step 2: Initialize system
  echo "🔄 Reinitializing Enhanced Cron Manager..."
  local init_response=$(curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d "{\"action\": \"initialize\", \"apiKey\": \"$API_KEY\"}")
  
  if echo "$init_response" | grep -q "success.*true"; then
    echo "✅ System reinitialized"
  else
    echo "❌ Failed to reinitialize system: $init_response"
    return 1
  fi
  
  # Step 3: Resume all queues
  echo "🔄 Resuming all queues..."
  local queues=("high-priority" "scheduler" "notifications" "webhooks" "reports" "social-sync" "maintenance")
  
  for queue in "${queues[@]}"; do
    local resume_response=$(curl -s -X POST "$BASE_URL" \
      -H "Content-Type: application/json" \
      -d "{\"action\": \"resume_queue\", \"queueName\": \"$queue\", \"apiKey\": \"$API_KEY\"}")
    
    if echo "$resume_response" | grep -q "success.*true"; then
      echo "✅ Queue $queue resumed"
    else
      echo "⚠️  Failed to resume queue $queue"
    fi
  done
  
  return 0
}

# Main function
main() {
  if [ "$1" = "check" ]; then
    # One-time check
    if check_system_status; then
      echo "✅ System is healthy"
      exit 0
    else
      echo "❌ System needs recovery"
      if recover_system; then
        echo "🎉 Recovery completed successfully!"
        exit 0
      else
        echo "💥 Recovery failed!"
        exit 1
      fi
    fi
  elif [ "$1" = "monitor" ]; then
    # Continuous monitoring
    echo "👁️  Starting continuous monitoring..."
    echo "🛑 Press Ctrl+C to stop"
    
    while true; do
      if ! check_system_status; then
        echo "$(date): 🚨 System unhealthy - starting recovery..."
        if recover_system; then
          echo "$(date): 🎉 Recovery completed"
        else
          echo "$(date): 💥 Recovery failed - will retry in 60s"
        fi
      else
        echo "$(date): ✅ System healthy"
      fi
      
      sleep 60  # Check every minute
    done
  else
    # Default: single recovery attempt
    echo "🔍 Checking system status..."
    if check_system_status; then
      echo "✅ System is already healthy"
    else
      echo "🚨 System needs recovery"
      if recover_system; then
        echo "🎉 Recovery completed successfully!"
      else
        echo "💥 Recovery failed!"
        exit 1
      fi
    fi
  fi
}

# Show usage if no arguments
if [ $# -eq 0 ]; then
  echo "Usage: $0 [check|monitor]"
  echo "  check   - One-time health check and recovery"
  echo "  monitor - Continuous monitoring (runs forever)"
  echo "  (no args) - Single recovery attempt"
  echo ""
fi

main "$@"