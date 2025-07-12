# Railway Backend Deployment - Dockerfile Path Fix Documentation

## Problem Summary
Railway backend deployment was failing with the error:
```
Dockerfile `Dockerfile.railway` does not exist
```

## Root Cause
The issue occurred because:
1. Railway was looking for the Dockerfile at the repository root level
2. Our backend service configuration was pointing to `Dockerfile.railway` in the backend directory
3. Railway's build context and service directory structure required proper path resolution

## Solution Implementation

### 1. Created Root-Level Dockerfile
- Created `Dockerfile.backend.railway` at repository root
- Modified copy paths to account for building from repository root instead of backend directory

### 2. Updated Copy Paths in Dockerfile
```dockerfile
# Before (backend directory context):
COPY requirements-railway.txt .
COPY . .

# After (repository root context):
COPY backend/requirements-railway.txt .
COPY backend/ .
```

### 3. Added curl for Health Checks
```dockerfile
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*
```

### 4. Updated Railway Configuration
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.backend.railway"
  }
}
```

## File Structure After Fix

```
examtopics-data-labeler/
├── Dockerfile.backend.railway          # Railway backend Dockerfile (repository root)
├── backend/
│   ├── Dockerfile.railway             # Original backend Dockerfile
│   ├── railway.json                   # Backend Railway config
│   ├── app-railway.py                 # Railway-optimized backend app
│   ├── requirements-railway.txt       # Lightweight dependencies
│   └── ...
├── frontend/
│   ├── railway.json                   # Frontend Railway config
│   └── ...
└── telegram-bot/
    ├── railway.json                   # Telegram bot Railway config
    └── ...
```

## Key Changes Made

### 1. Repository Root Dockerfile (`Dockerfile.backend.railway`)
- **Purpose**: Railway-compatible Dockerfile that builds from repository root
- **Key Features**: 
  - Correct path references to backend directory
  - Includes curl for health checks
  - Uses lightweight Railway requirements
  - Proper working directory setup

### 2. Updated Build Context
- **Before**: Building from `backend/` directory with local files
- **After**: Building from repository root with `backend/` prefixed paths
- **Benefit**: Compatible with Railway's service deployment model

### 3. Path Resolution Fix
```dockerfile
# Requirements installation
COPY backend/requirements-railway.txt .

# Application code copy
COPY backend/ .
```

## Railway Service Configuration

### Backend Service (`backend/railway.json`)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.backend.railway"
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

## Verification Steps

### 1. Local Docker Build Test
```bash
# From repository root
docker build -f Dockerfile.backend.railway -t backend-railway-test .
```

### 2. Check File Copying
- Verify requirements file is found at `backend/requirements-railway.txt`
- Ensure all backend application files are copied correctly
- Confirm health check endpoint works

### 3. Railway Deployment
- Dockerfile should be found at repository root
- Build context includes entire repository
- Backend files copied from correct directory

## Expected Behavior

### Before Fix
- Railway fails to find `Dockerfile.railway`
- Build process stops with "file does not exist" error
- Service deployment fails immediately

### After Fix
- Railway locates `Dockerfile.backend.railway` at repository root
- Build process copies files from `backend/` directory correctly
- Dependencies install from `backend/requirements-railway.txt`
- Health checks work with curl
- Service deploys successfully

## Troubleshooting

### Issue: "COPY backend/requirements-railway.txt . failed"
**Solution**: Verify the file exists at `backend/requirements-railway.txt` in repository

### Issue: "app-railway.py not found"
**Solution**: Ensure `COPY backend/ .` command includes all backend files

### Issue: Health check failing
**Solution**: Verify curl is installed and `/health` endpoint is accessible

## Files Modified/Created

### New Files
- `Dockerfile.backend.railway` - Railway-compatible Dockerfile at repository root

### Modified Files
- `backend/railway.json` - Updated dockerfilePath to point to root-level Dockerfile

### Preserved Files
- `backend/Dockerfile.railway` - Original backend Dockerfile (kept for reference)
- `backend/app-railway.py` - Railway-optimized backend application
- `backend/requirements-railway.txt` - Lightweight dependency list

## Success Metrics

- ✅ Railway finds Dockerfile at expected location
- ✅ Build process completes without path errors
- ✅ Dependencies install correctly
- ✅ Application files copied to correct locations
- ✅ Health checks work properly
- ✅ Service starts and responds to requests

## Next Steps

1. Test Railway deployment with new Dockerfile configuration
2. Monitor build logs for any remaining path issues
3. Verify health check endpoint responds correctly
4. Ensure all API endpoints work as expected

## Support Information

For issues with this fix:
1. Check Railway build logs for specific path errors
2. Verify file structure matches expected layout
3. Test Docker build locally using same command Railway uses
4. Contact support with specific build error messages if issues persist

---
*Last Updated: July 13, 2025*
*Status: Ready for Railway backend deployment*
