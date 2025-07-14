# WebSocket Docker Service Setup

## Overview

The WebSocket service has been separated into its own Docker container to provide better isolation, scalability, and easier debugging. This setup resolves the previous issue where WebSocket logs were not accessible as a separate service.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App Service   │    │ WebSocket Service│    │  Redis Service  │
│   Port: 3000    │◄──►│   Port: 3004     │◄──►│   Port: 6379    │
│   Next.js App   │    │ Socket.IO Server │    │  Cache & Queue  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Service Configuration

### App Service

- **Port**: 3000
- **Purpose**: Main Next.js application
- **Environment**:
  - `NEXT_PUBLIC_WEBSOCKET_URL=http://websocket:3004`
  - `NEXT_PUBLIC_WEBSOCKET_PORT=3004`

### WebSocket Service

- **Port**: 3004
- **Purpose**: Standalone Socket.IO server for real-time notifications
- **Dockerfile**: `Dockerfile.websocket`
- **Health Check**: `curl -f http://localhost:3004/api/status`

### Redis Service

- **Port**: 6379
- **Purpose**: Cache and job queue backend
- **Health Check**: `redis-cli ping`

## Docker Files

### 1. docker-compose.yml (Production)

```yaml
services:
  app:
    # ... app configuration
    environment:
      - NEXT_PUBLIC_WEBSOCKET_URL=http://websocket:3004
    depends_on:
      - websocket
      - redis

  websocket:
    build:
      context: .
      dockerfile: Dockerfile.websocket
    ports:
      - "3004:3004"
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/api/status"]
```

### 2. docker-compose.dev.yml (Development)

Similar to production but uses pre-built images for faster development cycles.

### 3. Dockerfile.websocket

Dedicated Dockerfile for the WebSocket service that:

- Uses Node.js 18 Alpine base image
- Installs only necessary dependencies
- Runs the standalone `websocket-server.js`
- Includes health checks

## Usage

### Using the Management Script

We've created a convenient script to manage all Docker services:

```bash
# Start all services
./scripts/docker-manage.sh start

# Check service status
./scripts/docker-manage.sh status

# View WebSocket logs
./scripts/docker-manage.sh logs-ws

# View all logs
./scripts/docker-manage.sh logs

# Stop all services
./scripts/docker-manage.sh stop

# Restart services
./scripts/docker-manage.sh restart

# Build services
./scripts/docker-manage.sh build
```

### Manual Docker Commands

```bash
# Start services
docker-compose up -d

# View WebSocket logs (this now works!)
docker-compose logs websocket

# Check service status
docker-compose ps

# Stop services
docker-compose down
```

## Service Endpoints

### App Service (Port 3000)

- **Main App**: http://localhost:3000
- **API Routes**: http://localhost:3000/api/\*

### WebSocket Service (Port 3004)

- **Status Check**: http://localhost:3004/api/status
- **WebSocket Connection**: ws://localhost:3004
- **Notification API**: http://localhost:3004/api/notify

### Redis Service (Port 6379)

- **Redis Commander**: http://localhost:8081 (if enabled)
- **Direct Redis**: redis://localhost:6379

## Health Checks

Each service includes health checks to ensure proper startup order and monitoring:

### WebSocket Health Check

```bash
curl -f http://localhost:3004/api/status
```

Expected response:

```json
{
  "status": "active",
  "connectedUsers": 0,
  "totalConnections": 0
}
```

### Redis Health Check

```bash
redis-cli ping
```

Expected response: `PONG`

## Troubleshooting

### Common Issues

1. **"no such service: websocket"**

   - **Solution**: Use the new Docker Compose configuration with the WebSocket service
   - **Command**: `docker-compose up -d` (rebuilds with new config)

2. **WebSocket connection refused**

   - **Check**: Ensure WebSocket service is running
   - **Command**: `docker-compose logs websocket`

3. **Port conflicts**
   - **Solution**: Change ports in docker-compose.yml
   - **Default Ports**: App (3000), WebSocket (3004), Redis (6379)

### Debugging Commands

```bash
# Check if WebSocket service is running
docker-compose ps websocket

# View WebSocket service logs
docker-compose logs -f websocket

# Check WebSocket health
curl http://localhost:3004/api/status

# Test WebSocket connection
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3004');
socket.on('connect', () => console.log('Connected!'));
socket.on('disconnect', () => console.log('Disconnected!'));
"
```

## Environment Variables

### Required for WebSocket Service

```env
WEBSOCKET_PORT=3004
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
```

### Required for App Service

```env
NEXT_PUBLIC_WEBSOCKET_PORT=3004
NEXT_PUBLIC_WEBSOCKET_URL=http://websocket:3004
```

## Benefits of This Setup

1. **Isolated Services**: Each service runs in its own container
2. **Better Logging**: WebSocket logs are now accessible via `docker-compose logs websocket`
3. **Scalability**: WebSocket service can be scaled independently
4. **Health Monitoring**: Each service has its own health checks
5. **Development**: Easier to debug WebSocket issues in isolation
6. **Production**: Better resource management and deployment flexibility

## Migration from Previous Setup

If you're upgrading from the previous setup:

1. **Update Docker Compose**: Use the new configuration files
2. **Rebuild Services**: Run `docker-compose build --no-cache`
3. **Update Environment**: Add new WebSocket environment variables
4. **Test Connection**: Verify WebSocket service is accessible

```bash
# Migration steps
docker-compose down
docker-compose build --no-cache
docker-compose up -d
./scripts/docker-manage.sh status
```

## Monitoring

### Service Status

```bash
# Check all services
./scripts/docker-manage.sh status

# Check specific service
docker-compose ps websocket
```

### Real-time Logs

```bash
# Follow WebSocket logs
docker-compose logs -f websocket

# Follow all logs
docker-compose logs -f
```

### Performance Monitoring

The WebSocket service includes performance tracking and memory monitoring built-in. Check the logs for performance metrics and connection statistics.
