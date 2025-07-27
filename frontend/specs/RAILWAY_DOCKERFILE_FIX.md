# Railway Backend Deployment - Service Directory Context Fix

## Problem Summary
Railway backend deployment was failing with multiple errors:
1. Initial error: `Dockerfile 'Dockerfile.railway' does not exist`
2. Subsequent error: `"/backend/requirements-railway.txt": not found`
3. Build context issue: Railway building from wrong directory

## Root Cause Analysis
The issue occurred because:
1. Railway services build from their individual service directory context (e.g., `backend/`)
2. When we tried to reference `backend/` from repository root, Railway couldn't find it
3. Railway expects the Dockerfile to be in the same directory as the service files
4. The build context is isolated to the service directory, not the entire repository

## Solution Implementation

### 1. Reverted to Service-Local Dockerfile
- Use `backend/Dockerfile.railway` (in the backend directory)
- Build context is `backend/` directory, not repository root
- All file paths are relative to the backend directory

### 2. Updated Backend Dockerfile
```dockerfile
# Added curl for health checks
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Files are copied from backend directory context
COPY requirements-railway.txt .
COPY . .
```

### 3. Railway Service Configuration
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.railway"
  }
}
```

## Railway Service Directory Structure

Railway treats each service as having its own isolated build context:

```
Repository Structure:
examtopics-data-labeler/
├── backend/                    ← Railway backend service builds from here
│   ├── Dockerfile.railway     ← Railway finds this file
│   ├── railway.json           ← Service configuration
│   ├── app-railway.py
│   ├── requirements-railway.txt
│   └── ...
├── frontend/                   ← Railway frontend service builds from here
│   ├── nixpacks.toml
│   ├── railway.json
│   └── ...
└── telegram-bot/               ← Railway telegram service builds from here
    ├── railway.json
    └── ...
```

## Key Understanding: Railway Build Context

### How Railway Works
- Each service in Railway has its own build context
- Build context = the directory containing the service files
- Dockerfile paths are relative to the service directory
- Services cannot reference files outside their directory

### Our Backend Service
- **Service Directory**: `backend/`
- **Build Context**: `backend/`
- **Dockerfile Location**: `backend/Dockerfile.railway`
- **File References**: Relative to `backend/` (e.g., `COPY . .` copies from `backend/`)

## File Structure After Fix

```
examtopics-data-labeler/
├── backend/
│   ├── Dockerfile.railway         # ✅ Railway backend Dockerfile (service-local)
│   ├── railway.json               # ✅ Points to local Dockerfile
│   ├── app-railway.py            # ✅ Railway-optimized backend app
│   ├── requirements-railway.txt   # ✅ Lightweight dependencies
│   └── ...
├── Dockerfile.backend.railway     # ❌ Not used (removed from config)
└── ...
```

## Updated Railway Configuration

### Backend Service (`backend/railway.json`)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.railway"
  },
  "deploy": {
    "startCommand": "python app-railway.py",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Backend Dockerfile (`backend/Dockerfile.railway`)
```dockerfile
FROM python:3.12.4-slim

# Install system dependencies (including curl for health checks)
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies
COPY requirements-railway.txt .
RUN pip install --no-cache-dir -r requirements-railway.txt

# Copy application code
COPY . .

# Health check and startup
HEALTHCHECK CMD curl -f http://localhost:5000/health || exit 1
CMD ["python", "app-railway.py"]
```

## Expected Behavior After Fix

### Build Process
1. Railway identifies backend service in `backend/` directory
2. Uses `backend/Dockerfile.railway` for build instructions
3. Copies `requirements-railway.txt` from backend directory
4. Installs lightweight dependencies for Railway
5. Copies all backend application files
6. Sets up health checks with curl

### Deployment
- Service starts with `python app-railway.py`
- Health checks accessible at `/health`
- Restart policy handles failures gracefully
- Lightweight dependencies improve build speed

## Troubleshooting Guide

### Issue: "Dockerfile not found"
**Solution**: Ensure `Dockerfile.railway` exists in `backend/` directory

### Issue: "requirements-railway.txt not found"
**Solution**: Verify file exists in `backend/` directory, not repository root

### Issue: "curl command not found in health check"
**Solution**: Verify curl is installed in Dockerfile dependencies

### Issue: "Module not found" errors
**Solution**: Check `requirements-railway.txt` contains all needed dependencies

## Verification Steps

### 1. File Location Check
```bash
# Verify files exist in backend directory
ls backend/Dockerfile.railway
ls backend/requirements-railway.txt
ls backend/app-railway.py
```

### 2. Railway Configuration Check
- `dockerfilePath` points to `Dockerfile.railway` (not full path)
- Service directory contains all referenced files
- Health check path matches application endpoint

### 3. Dependency Check
- All imports in `app-railway.py` have corresponding packages in `requirements-railway.txt`
- No heavy ML dependencies that cause Railway build timeouts

## Success Metrics

- ✅ Railway finds Dockerfile in correct service directory
- ✅ Build process copies files without path errors
- ✅ Dependencies install successfully
- ✅ Health checks work with curl
- ✅ Application starts and responds to requests
- ✅ No build context or file reference errors

## Lessons Learned

1. **Railway Services are Isolated**: Each service builds in its own directory context
2. **Dockerfile Location Matters**: Must be in the same directory as service files
3. **File Paths are Relative**: All COPY commands relative to service directory
4. **Health Check Dependencies**: Ensure curl or alternative is available
5. **Keep It Simple**: Service-local builds are more reliable than cross-directory references

---
*Last Updated: July 13, 2025*
*Status: Fixed - Railway backend should deploy successfully from service directory*
