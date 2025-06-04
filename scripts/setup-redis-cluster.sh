#!/bin/bash

# Redis Cluster Setup Script for High Availability
# This script sets up a Redis cluster with 3 master nodes and 3 slave nodes

set -e

echo "🚀 Setting up Redis Cluster for High Availability..."

# Configuration
REDIS_VERSION="7.2"
CLUSTER_DIR="./redis-cluster"
NODES=6
MASTERS=3
REPLICAS=1

# Ports for cluster nodes
PORTS=(7001 7002 7003 7004 7005 7006)

# Create cluster directory
mkdir -p $CLUSTER_DIR
cd $CLUSTER_DIR

echo "📁 Created cluster directory: $CLUSTER_DIR"

# Function to check if Redis is installed
check_redis() {
    if ! command -v redis-server &> /dev/null; then
        echo "❌ Redis not found. Installing Redis..."
        
        # Install Redis based on OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                brew install redis
            else
                echo "❌ Homebrew not found. Please install Redis manually."
                exit 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y redis-server redis-tools
            elif command -v yum &> /dev/null; then
                sudo yum install -y redis
            else
                echo "❌ Package manager not supported. Please install Redis manually."
                exit 1
            fi
        else
            echo "❌ OS not supported. Please install Redis manually."
            exit 1
        fi
    else
        echo "✅ Redis is already installed"
        redis-server --version
    fi
}

# Function to create node configuration
create_node_config() {
    local port=$1
    local config_file="redis-$port.conf"
    
    cat > $config_file << EOF
# Redis Cluster Node Configuration - Port $port
port $port
cluster-enabled yes
cluster-config-file nodes-$port.conf
cluster-node-timeout 15000
cluster-announce-ip 127.0.0.1
cluster-announce-port $port
cluster-announce-bus-port $(($port + 10000))

# Persistence
appendonly yes
appendfilename "appendonly-$port.aof"
dbfilename "dump-$port.rdb"

# Logging
logfile "redis-$port.log"
loglevel notice

# Security
protected-mode no
bind 127.0.0.1

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Performance
tcp-keepalive 300
timeout 0

# Cluster settings
cluster-require-full-coverage no
cluster-allow-reads-when-down no

# Replication
replica-read-only yes
replica-serve-stale-data yes

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128
EOF

    echo "📝 Created configuration for node on port $port"
}

# Function to start a Redis node
start_node() {
    local port=$1
    local config_file="redis-$port.conf"
    
    echo "🚀 Starting Redis node on port $port..."
    redis-server $config_file --daemonize yes
    
    # Wait for node to start
    sleep 2
    
    # Check if node is running
    if redis-cli -p $port ping > /dev/null 2>&1; then
        echo "✅ Node on port $port started successfully"
    else
        echo "❌ Failed to start node on port $port"
        exit 1
    fi
}

# Function to stop all nodes
stop_nodes() {
    echo "🛑 Stopping all Redis nodes..."
    for port in "${PORTS[@]}"; do
        if redis-cli -p $port ping > /dev/null 2>&1; then
            redis-cli -p $port shutdown nosave > /dev/null 2>&1 || true
            echo "🛑 Stopped node on port $port"
        fi
    done
}

# Function to clean up cluster files
cleanup() {
    echo "🧹 Cleaning up cluster files..."
    rm -f *.conf *.log *.aof *.rdb nodes-*.conf
    echo "✅ Cleanup completed"
}

# Function to create the cluster
create_cluster() {
    echo "🔗 Creating Redis cluster..."
    
    # Build the cluster create command
    local cluster_nodes=""
    for port in "${PORTS[@]}"; do
        cluster_nodes="$cluster_nodes 127.0.0.1:$port"
    done
    
    # Create cluster with replicas
    echo "yes" | redis-cli --cluster create $cluster_nodes --cluster-replicas $REPLICAS
    
    if [ $? -eq 0 ]; then
        echo "✅ Redis cluster created successfully!"
    else
        echo "❌ Failed to create Redis cluster"
        exit 1
    fi
}

# Function to check cluster status
check_cluster() {
    echo "📊 Checking cluster status..."
    redis-cli -p 7001 cluster info
    echo ""
    echo "📋 Cluster nodes:"
    redis-cli -p 7001 cluster nodes
}

# Function to test cluster
test_cluster() {
    echo "🧪 Testing cluster functionality..."
    
    # Test basic operations
    redis-cli -c -p 7001 set test_key "Hello Redis Cluster" > /dev/null
    local result=$(redis-cli -c -p 7002 get test_key)
    
    if [ "$result" = "Hello Redis Cluster" ]; then
        echo "✅ Cluster test passed - data replication working"
    else
        echo "❌ Cluster test failed - data replication not working"
        exit 1
    fi
    
    # Clean up test key
    redis-cli -c -p 7001 del test_key > /dev/null
}

# Function to show cluster information
show_info() {
    echo ""
    echo "🎉 Redis Cluster Setup Complete!"
    echo "=================================="
    echo ""
    echo "📊 Cluster Information:"
    echo "  • Nodes: $NODES (${MASTERS} masters, $((NODES - MASTERS)) replicas)"
    echo "  • Ports: ${PORTS[*]}"
    echo "  • Directory: $(pwd)"
    echo ""
    echo "🔧 Environment Variables for your app:"
    echo "  REDIS_USE_CLUSTER=true"
    echo "  REDIS_CLUSTER_HOST_1=localhost"
    echo "  REDIS_CLUSTER_PORT_1=7001"
    echo "  REDIS_CLUSTER_HOST_2=localhost"
    echo "  REDIS_CLUSTER_PORT_2=7002"
    echo "  REDIS_CLUSTER_HOST_3=localhost"
    echo "  REDIS_CLUSTER_PORT_3=7003"
    echo ""
    echo "📝 Useful Commands:"
    echo "  • Check status: redis-cli -p 7001 cluster info"
    echo "  • List nodes: redis-cli -p 7001 cluster nodes"
    echo "  • Connect: redis-cli -c -p 7001"
    echo "  • Stop cluster: $0 stop"
    echo ""
    echo "🔍 Monitor cluster:"
    echo "  • Logs: tail -f redis-*.log"
    echo "  • Health: redis-cli -p 7001 ping"
    echo ""
}

# Function to create systemd service (Linux only)
create_systemd_service() {
    if [[ "$OSTYPE" == "linux-gnu"* ]] && command -v systemctl &> /dev/null; then
        echo "🔧 Creating systemd service..."
        
        local service_file="/etc/systemd/system/redis-cluster.service"
        local cluster_path=$(pwd)
        
        sudo tee $service_file > /dev/null << EOF
[Unit]
Description=Redis Cluster
After=network.target

[Service]
Type=forking
User=redis
Group=redis
WorkingDirectory=$cluster_path
ExecStart=$cluster_path/start-cluster.sh
ExecStop=$cluster_path/stop-cluster.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

        # Create start/stop scripts
        cat > start-cluster.sh << 'EOF'
#!/bin/bash
for port in 7001 7002 7003 7004 7005 7006; do
    redis-server redis-$port.conf --daemonize yes
done
EOF

        cat > stop-cluster.sh << 'EOF'
#!/bin/bash
for port in 7001 7002 7003 7004 7005 7006; do
    redis-cli -p $port shutdown nosave > /dev/null 2>&1 || true
done
EOF

        chmod +x start-cluster.sh stop-cluster.sh
        
        sudo systemctl daemon-reload
        sudo systemctl enable redis-cluster
        
        echo "✅ Systemd service created. Use: sudo systemctl start redis-cluster"
    fi
}

# Main execution
case "${1:-setup}" in
    "setup")
        echo "🚀 Starting Redis Cluster setup..."
        check_redis
        
        # Stop any existing nodes
        stop_nodes
        
        # Clean up old files
        cleanup
        
        # Create configurations for all nodes
        for port in "${PORTS[@]}"; do
            create_node_config $port
        done
        
        # Start all nodes
        for port in "${PORTS[@]}"; do
            start_node $port
        done
        
        # Wait a bit for all nodes to be ready
        sleep 3
        
        # Create the cluster
        create_cluster
        
        # Test the cluster
        test_cluster
        
        # Check cluster status
        check_cluster
        
        # Create systemd service (Linux only)
        create_systemd_service
        
        # Show information
        show_info
        ;;
        
    "stop")
        echo "🛑 Stopping Redis Cluster..."
        stop_nodes
        echo "✅ All nodes stopped"
        ;;
        
    "start")
        echo "🚀 Starting Redis Cluster..."
        for port in "${PORTS[@]}"; do
            start_node $port
        done
        echo "✅ All nodes started"
        ;;
        
    "restart")
        echo "🔄 Restarting Redis Cluster..."
        stop_nodes
        sleep 2
        for port in "${PORTS[@]}"; do
            start_node $port
        done
        echo "✅ Cluster restarted"
        ;;
        
    "status")
        echo "📊 Redis Cluster Status:"
        check_cluster
        ;;
        
    "test")
        echo "🧪 Testing Redis Cluster..."
        test_cluster
        ;;
        
    "clean")
        echo "🧹 Cleaning up Redis Cluster..."
        stop_nodes
        cleanup
        echo "✅ Cleanup completed"
        ;;
        
    "info")
        show_info
        ;;
        
    *)
        echo "Usage: $0 {setup|start|stop|restart|status|test|clean|info}"
        echo ""
        echo "Commands:"
        echo "  setup   - Initial cluster setup (default)"
        echo "  start   - Start all cluster nodes"
        echo "  stop    - Stop all cluster nodes"
        echo "  restart - Restart all cluster nodes"
        echo "  status  - Show cluster status"
        echo "  test    - Test cluster functionality"
        echo "  clean   - Stop and clean all cluster files"
        echo "  info    - Show cluster information"
        exit 1
        ;;
esac 