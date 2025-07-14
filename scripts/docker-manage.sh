#!/bin/bash

# Docker Management Script for Scheduler App
# This script helps manage the Docker services including the WebSocket service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running"
        exit 1
    fi
}

# Function to check service status
check_service_status() {
    local service=$1
    local status=$(docker-compose ps -q $service 2>/dev/null)
    
    if [ -z "$status" ]; then
        echo "stopped"
    else
        local running=$(docker inspect --format='{{.State.Status}}' $status 2>/dev/null)
        echo "$running"
    fi
}

# Function to show service logs
show_logs() {
    local service=$1
    local lines=${2:-50}
    
    print_header "Recent $service Logs"
    
    if [ "$(check_service_status $service)" = "running" ]; then
        docker-compose logs --tail=$lines $service
    else
        print_warning "Service $service is not running"
    fi
}

# Function to show service status
show_status() {
    print_header "Service Status"
    
    services=("app" "websocket" "redis")
    
    for service in "${services[@]}"; do
        status=$(check_service_status $service)
        case $status in
            "running")
                echo -e "  ${GREEN}✓${NC} $service: running"
                ;;
            "stopped")
                echo -e "  ${RED}✗${NC} $service: stopped"
                ;;
            *)
                echo -e "  ${YELLOW}?${NC} $service: $status"
                ;;
        esac
    done
}

# Function to start services
start_services() {
    print_header "Starting Services"
    
    check_docker
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_status ".env file created from .env.example"
        else
            print_error ".env.example file not found"
            exit 1
        fi
    fi
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 5
    
    # Check service health
    show_status
    
    print_status "Services started successfully!"
    print_status "App: http://localhost:3000"
    print_status "WebSocket: http://localhost:3004"
    print_status "Redis Commander: http://localhost:8081"
}

# Function to stop services
stop_services() {
    print_header "Stopping Services"
    docker-compose down
    print_status "Services stopped"
}

# Function to restart services
restart_services() {
    print_header "Restarting Services"
    docker-compose down
    docker-compose up -d
    show_status
    print_status "Services restarted"
}

# Function to build services
build_services() {
    print_header "Building Services"
    docker-compose build --no-cache
    print_status "Services built successfully"
}

# Function to show help
show_help() {
    echo "Docker Management Script for Scheduler App"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start all services"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  build     Build all services"
    echo "  status    Show service status"
    echo "  logs      Show logs for all services"
    echo "  logs-app  Show app service logs"
    echo "  logs-ws   Show websocket service logs"
    echo "  logs-redis Show redis service logs"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs-ws"
    echo "  $0 restart"
}

# Main script logic
case "${1:-help}" in
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "build")
        build_services
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "app"
        show_logs "websocket"
        show_logs "redis"
        ;;
    "logs-app")
        show_logs "app"
        ;;
    "logs-ws"|"logs-websocket")
        show_logs "websocket"
        ;;
    "logs-redis")
        show_logs "redis"
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 