#!/bin/bash

# Redis Lock Monitoring Script
# Monitors BullMQ locks and Redis performance to prevent lock renewal issues

echo "🔍 Redis Lock Monitoring Started"
echo "================================="

# Configuration
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
CHECK_INTERVAL=30  # Check every 30 seconds
LOG_FILE="redis-lock-monitor.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check Redis health
check_redis_health() {
    local start_time=$(date +%s%N)
    local ping_result=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT ping 2>/dev/null)
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    if [ "$ping_result" = "PONG" ]; then
        if [ $response_time -gt 100 ]; then
            echo -e "${YELLOW}⚠️  Redis slow response: ${response_time}ms${NC}"
        else
            echo -e "${GREEN}✅ Redis healthy: ${response_time}ms${NC}"
        fi
        return 0
    else
        echo -e "${RED}❌ Redis unavailable${NC}"
        return 1
    fi
}

# Function to check for stalled BullMQ jobs
check_stalled_jobs() {
    local stalled_keys=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT keys "*:stalled" 2>/dev/null | wc -l)
    local active_keys=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT keys "*:active" 2>/dev/null | wc -l)
    local failed_keys=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT keys "*:failed" 2>/dev/null | wc -l)
    
    echo "📊 Queue Status: Active($active_keys) Stalled($stalled_keys) Failed($failed_keys)"
    
    if [ $stalled_keys -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $stalled_keys stalled job(s)${NC}"
        return 1
    fi
    
    if [ $failed_keys -gt 10 ]; then
        echo -e "${RED}❌ High failure rate: $failed_keys failed jobs${NC}"
        return 1
    fi
    
    return 0
}

# Function to check Redis memory usage
check_redis_memory() {
    local memory_info=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT info memory 2>/dev/null | grep used_memory_human)
    local memory_usage=$(echo $memory_info | cut -d: -f2)
    
    echo "💾 Memory Usage: $memory_usage"
    
    # Check if memory usage is above 100MB (adjust threshold as needed)
    local memory_bytes=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT info memory 2>/dev/null | grep "used_memory:" | cut -d: -f2)
    if [ -n "$memory_bytes" ] && [ $memory_bytes -gt 104857600 ]; then # 100MB
        echo -e "${YELLOW}⚠️  High memory usage: $memory_usage${NC}"
        return 1
    fi
    
    return 0
}

# Function to check application health
check_app_health() {
    local app_status=$(curl -s "http://localhost:3000/api/cron-manager?action=status&apiKey=test-scheduler-key" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local running_jobs=$(echo "$app_status" | grep -o '"running":true' | wc -l)
        local redis_available=$(echo "$app_status" | grep -o '"redisAvailable":true' | wc -l)
        
        echo "🎯 App Status: $running_jobs/7 jobs running, Redis: $redis_available"
        
        if [ $redis_available -eq 0 ]; then
            echo -e "${RED}❌ App reports Redis unavailable${NC}"
            return 1
        fi
        
        if [ $running_jobs -lt 5 ]; then
            echo -e "${YELLOW}⚠️  Low job count: $running_jobs/7${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ App unavailable${NC}"
        return 1
    fi
    
    return 0
}

# Function to auto-recover from issues
auto_recover() {
    echo "🔧 Attempting auto-recovery..."
    
    # Try to restart stalled jobs
    curl -s "http://localhost:3000/api/init" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Recovery attempt completed${NC}"
    else
        echo -e "${RED}❌ Recovery failed${NC}"
    fi
}

# Main monitoring loop
echo "Starting monitoring loop (checking every ${CHECK_INTERVAL} seconds)"
echo "Press Ctrl+C to stop"
echo ""

while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] Checking system health..."
    
    issues=0
    
    # Run health checks
    check_redis_health || ((issues++))
    check_stalled_jobs || ((issues++))
    check_redis_memory || ((issues++))
    check_app_health || ((issues++))
    
    # Log results
    echo "[$timestamp] Issues found: $issues" >> $LOG_FILE
    
    # Auto-recover if issues detected
    if [ $issues -gt 2 ]; then
        echo -e "${RED}🚨 Multiple issues detected ($issues), attempting recovery...${NC}"
        auto_recover
    elif [ $issues -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Minor issues detected ($issues)${NC}"
    else
        echo -e "${GREEN}✅ All systems healthy${NC}"
    fi
    
    echo "---"
    sleep $CHECK_INTERVAL
done 