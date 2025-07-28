# Docker Deployment Guide

This document describes the Docker containerization and deployment setup for the AWS Certification Web Application project.

## Overview

We have automated Docker build and publish workflows for all three sub-projects:
- **Frontend (Next.js)**: Multi-stage build with optimized production image
- **Backend (Python Flask)**: Full-featured Python environment with ML/OCR dependencies
- **Telegram Bot (Node.js)**: Lightweight Alpine-based container

## Required GitHub Secrets

To use these workflows, you need to configure the following secrets in your GitHub repository:

### 1. DockerHub Authentication
- **`DOCKER_HUB_USERNAME`**: Your DockerHub username
- **`DOCKER_HUB_PAT`**: DockerHub Personal Access Token

### Setting Up DockerHub Secrets

1. **Create DockerHub Personal Access Token**:
   ```bash
   # Go to: https://hub.docker.com/settings/security
   # Click "New Access Token"
   # Name: "GitHub Actions"
   # Permissions: Read, Write, Delete
   # Copy the generated token
   ```

2. **Add Secrets to GitHub Repository**:
   ```bash
   # Go to: Repository → Settings → Secrets and variables → Actions
   # Click "New repository secret"
   
   # Add DOCKER_HUB_USERNAME
   Name: DOCKER_HUB_USERNAME
   Value: your-dockerhub-username
   
   # Add DOCKER_HUB_PAT
   Name: DOCKER_HUB_PAT
   Value: your-personal-access-token
   ```

## Docker Images

### Frontend Image
- **Repository**: `your-username/awscert-frontend`
- **Base Image**: node:18-alpine
- **Build Strategy**: Multi-stage (deps → builder → runner)
- **Port**: 3000
- **Size**: ~150MB (optimized with standalone output)

### Backend Image
- **Repository**: `your-username/awscert-backend`
- **Base Image**: python:3.12.4-slim
- **Build Strategy**: Single-stage with system dependencies
- **Port**: 5000
- **Size**: ~2GB (includes ML/OCR libraries)

### Telegram Bot Image
- **Repository**: `your-username/awscert-telegram-bot`
- **Base Image**: node:18-alpine
- **Build Strategy**: Production dependencies only
- **Port**: 8080
- **Size**: ~100MB

## Workflow Triggers

All workflows are triggered by:
- **Push** to `master` or `q-labeler` branches
- **Pull Requests** to `master` (build test only, no publish)
- **Releases** (tagged versions)

### Path-based Triggering
Each workflow only runs when files in the relevant directory change:
- Frontend: `frontend/**`
- Backend: `backend/**`
- Telegram Bot: `telegram-bot/**`

## Build Process

### 1. Test Build Stage
- Builds Docker image without pushing
- Runs container smoke tests
- Validates basic functionality
- Uses GitHub Actions cache for faster builds

### 2. Build and Publish Stage
- Only runs for non-PR events
- Authenticates with DockerHub using secrets
- Builds multi-platform images (linux/amd64, linux/arm64)
- Pushes to DockerHub with multiple tags
- Updates repository descriptions

## Container Tags

Each image is tagged with:
- **Branch name**: `master`, `q-labeler`
- **Git SHA**: `master-abc1234`
- **Latest**: `latest` (only for default branch)
- **Semantic versions**: `v1.0.0`, `v1.0`, `v1` (for releases)

## Environment Variables

### Frontend Container
```bash
# Required for runtime
MONGODB_URI=mongodb://localhost:27017/awscert
JWT_SECRET=your-jwt-secret
NEXT_PUBLIC_PDF_CONVERSION_API_URL=http://backend:5000

# Optional
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
```

### Backend Container
```bash
# Required for runtime
MONGODB_URI=mongodb://localhost:27017/awscert
FLASK_ENV=production

# Optional
PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1
PORT=5000
```

### Telegram Bot Container
```bash
# Required for runtime
BOT_TOKEN=your-telegram-bot-token
MONGODB_URI=mongodb://localhost:27017/awscert
FRONTEND_URL=http://frontend:3000

# Optional
NODE_ENV=production
PORT=8080
```

## Local Development

### Building Images Locally
```bash
# Frontend
docker build -t awscert-frontend ./frontend

# Backend
docker build -t awscert-backend ./backend

# Telegram Bot
docker build -t awscert-telegram-bot ./telegram-bot
```

### Running Containers Locally
```bash
# Frontend
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/awscert \
  -e JWT_SECRET=local-secret \
  awscert-frontend

# Backend
docker run -p 5000:5000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/awscert \
  awscert-backend

# Telegram Bot
docker run -p 8080:8080 \
  -e BOT_TOKEN=your-bot-token \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/awscert \
  -e FRONTEND_URL=http://host.docker.internal:3000 \
  awscert-telegram-bot
```

## Docker Compose Example

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  backend:
    image: your-username/awscert-backend:latest
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://mongodb:27017/awscert
      FLASK_ENV: production
    depends_on:
      - mongodb

  frontend:
    image: your-username/awscert-frontend:latest
    ports:
      - "3000:3000"
    environment:
      MONGODB_URI: mongodb://mongodb:27017/awscert
      JWT_SECRET: your-jwt-secret
      NEXT_PUBLIC_PDF_CONVERSION_API_URL: http://backend:5000
    depends_on:
      - backend

  telegram-bot:
    image: your-username/awscert-telegram-bot:latest
    ports:
      - "8080:8080"
    environment:
      BOT_TOKEN: your-telegram-bot-token
      MONGODB_URI: mongodb://mongodb:27017/awscert
      FRONTEND_URL: http://frontend:3000
    depends_on:
      - mongodb
      - frontend

volumes:
  mongodb_data:
```

## Production Deployment

### Using DockerHub Images
```bash
# Pull latest images
docker pull your-username/awscert-frontend:latest
docker pull your-username/awscert-backend:latest
docker pull your-username/awscert-telegram-bot:latest

# Run with docker-compose
docker-compose up -d
```

### Health Checks
- **Backend**: `http://localhost:5000/health`
- **Telegram Bot**: `http://localhost:8080/health`
- **Frontend**: `http://localhost:3000` (application)

## Security Considerations

### Container Security
- **Non-root users**: All containers run as non-root users
- **Minimal base images**: Alpine Linux where possible
- **Production dependencies**: Only necessary packages included
- **Security scanning**: Integrated with SAST workflows

### Secrets Management
- Use Docker secrets or environment variable injection
- Never embed secrets in images
- Rotate DockerHub tokens regularly
- Use least-privilege access tokens

## Monitoring and Logging

### Container Logs
```bash
# View logs
docker logs container-name

# Follow logs
docker logs -f container-name

# Structured logging (if implemented)
docker logs container-name | jq '.'
```

### Health Monitoring
```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Health check endpoints
curl http://localhost:5000/health  # Backend
curl http://localhost:8080/health  # Telegram Bot
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Dockerfile syntax
   - Verify base image availability
   - Review build logs in GitHub Actions

2. **Container Won't Start**
   - Check environment variables
   - Verify port mappings
   - Review container logs

3. **Authentication Issues**
   - Verify DockerHub secrets are set correctly
   - Check token permissions
   - Ensure username matches exactly

4. **Network Issues**
   - Verify MongoDB connectivity
   - Check service discovery in docker-compose
   - Review firewall/security group settings

### Debug Commands
```bash
# Interactive shell in container
docker run -it --entrypoint /bin/sh image-name

# Inspect container configuration
docker inspect container-name

# Check resource usage
docker stats container-name
```

## CI/CD Integration

The workflows integrate with:
- **GitHub Actions**: Automated builds and tests
- **DockerHub**: Image registry and distribution
- **Security Scanning**: SAST workflows for vulnerabilities
- **Multi-platform**: ARM64 and AMD64 support

For questions about Docker deployment, consult the project maintainers or check the GitHub Actions logs for detailed build information.