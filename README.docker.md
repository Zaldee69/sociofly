# Docker Setup for My Scheduler App

This guide explains how to run the application using Docker and Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- Supabase account with database setup

## Configuration

1. Copy the environment variables example file (you'll need to create this first):

   ```bash
   cp .env.example .env.docker
   ```

2. Modify the `.env.docker` file with appropriate values for your environment, especially:
   - `DATABASE_URL` - Your Supabase PostgreSQL connection string
   - `DIRECT_URL` - Your Supabase direct connection string

## Running in Production Mode

To run the application in production mode:

```bash
# Build and start services
npm run docker:build
npm run docker:up

# Or directly with docker-compose
docker-compose up -d
```

This will:

- Build the Next.js application in production mode
- Start Redis server
- Initialize Redis jobs
- Connect all services together

Access the application at: http://localhost:3000

## Running in Development Mode

For development with hot-reloading:

```bash
# Build and start services in development mode
npm run docker:dev:build
npm run docker:dev:up

# Or directly with docker-compose
docker-compose -f docker-compose.dev.yml up -d
```

This will:

- Mount your local files into the container
- Enable hot-reloading
- Start Redis
- Start Redis Commander (UI) at http://localhost:8081

## Database Management

Since we're using Supabase as our database provider:

1. Database migrations should be run directly against your Supabase database
2. You can use the Supabase dashboard for database management
3. For local development with Prisma:

```bash
# Apply migrations to Supabase
npx prisma migrate deploy

# Open Prisma Studio (connects to Supabase)
npx prisma studio
```

## Redis Management

### Redis CLI

```bash
# Connect to Redis container
docker-compose exec redis redis-cli
```

### Redis Commander

When using development mode, Redis Commander is available at: http://localhost:8081

## Useful Commands

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Rebuild containers
npm run docker:build

# Remove volumes (will delete all data)
docker-compose down -v
```

## Initialization Process

The Docker setup includes an automatic initialization script that:

1. Waits for Redis to be available
2. Initializes Redis jobs (if enabled)
3. Starts the Next.js server

This ensures that all services are properly initialized before the application starts.

## Troubleshooting

### Database Connection Issues

If the application can't connect to Supabase:

1. Check your DATABASE_URL and DIRECT_URL environment variables
2. Verify that your Supabase project is running
3. Check if your IP is allowed in Supabase network settings

### Redis Connection Issues

If Redis jobs aren't running:

1. Check Redis container status:

   ```bash
   docker-compose ps redis
   ```

2. Verify Redis connection in app logs:
   ```bash
   docker-compose logs app | grep redis
   ```

## Additional Information

- The production Docker setup uses multi-stage builds for optimal image size
- Development mode mounts your local files for hot-reloading
- Redis data is persisted in Docker volumes
- Uploads are stored in a Docker volume
