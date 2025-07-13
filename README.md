# CI/CD with GitHub Actions

This project uses GitHub Actions for Continuous Integration and Deployment.

## Workflows

The following GitHub Actions workflows are available:

### 1. CI/CD Pipeline (`ci-cd.yml`)

Full pipeline that runs on push to `main` branch and pull requests:

- Builds and tests the application
- Builds and pushes Docker image (on `main` branch only)
- Deploys the application (on `main` branch only)

### 2. Docker Build and Publish (`docker-publish.yml`)

Specialized workflow for building and publishing Docker images:

- Builds Docker image
- Pushes to Docker Hub (on `main` branch and tags)
- Tags images properly based on Git references
- Scans for vulnerabilities using Trivy

### 3. Test (`test.yml`)

Runs tests on push to `main` and `develop` branches and pull requests:

- Sets up Redis service for testing
- Runs linting and type checking
- Runs unit and integration tests
- Uploads test coverage to Codecov

### 4. Deploy to VPS (`deploy-vps.yml`)

Deploys the application to a VPS:

- Triggered after successful Docker build or manually
- Uses SSH to connect to the server
- Pulls the latest Docker image
- Updates the running containers
- Sends notifications on success/failure

## Required Secrets

To use these workflows, add the following secrets to your GitHub repository:

### Docker Hub

- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub password or access token

### VPS Deployment

- `SSH_HOST`: Your VPS hostname or IP
- `SSH_USERNAME`: SSH username
- `SSH_PRIVATE_KEY`: SSH private key
- `SSH_PORT`: SSH port (optional, defaults to 22)
- `APP_DIR`: Application directory on the server (optional, defaults to `/opt/my-scheduler-app`)

### Database

- `DATABASE_URL`: Production database URL
- `DIRECT_URL`: Direct database URL
- `TEST_DATABASE_URL`: Test database URL

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

### Notifications

- `SLACK_WEBHOOK`: Slack webhook URL for notifications
