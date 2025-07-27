# Docker GitHub Actions Authentication Fix

## Problem
The Docker build GitHub Actions were failing with authentication errors:

1. **Azure Blob Storage authentication errors** (401 Unauthorized with expired signatures)
2. **DockerHub authentication errors** (401 Unauthorized when accessing registry cache)

## Root Causes
1. **GitHub Actions cache (`type=gha`)** uses Azure Blob Storage with time-limited authentication tokens
2. **Missing or incorrect DockerHub credentials** for registry cache operations
3. **Multi-platform builds** taking longer and exceeding token validity periods

## Solutions Applied

### 1. Fixed Cache Strategy
**Before:**
```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

**After (with fallback):**
```yaml
cache-from: |
  type=registry,ref=${{ env.REGISTRY }}/${{ secrets.DOCKER_HUB_USERNAME }}/${{ env.IMAGE_NAME }}:buildcache
  type=gha,scope=fallback
cache-to: |
  type=registry,ref=${{ env.REGISTRY }}/${{ secrets.DOCKER_HUB_USERNAME }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
  type=gha,mode=max,scope=fallback
```

### 2. Added Authentication Verification
```yaml
- name: Check Docker secrets
  run: |
    if [ -z "${{ secrets.DOCKER_HUB_USERNAME }}" ]; then
      echo "❌ DOCKER_HUB_USERNAME secret is not set"
      exit 1
    fi
    if [ -z "${{ secrets.DOCKER_HUB_PAT }}" ]; then
      echo "❌ DOCKER_HUB_PAT secret is not set"
      exit 1
    fi
```

### 3. Separated Test and Production Cache
- **Test builds**: Use GitHub Actions cache (`type=gha,scope=test`) - no DockerHub auth needed
- **Production builds**: Use registry cache with proper authentication

### 4. Added Fallback Build Job
- Runs without cache if main build fails
- Single platform (linux/amd64) for faster recovery
- Ensures deployments don't fail completely

## Required GitHub Secrets

The following secrets must be configured in your GitHub repository:

### 1. DOCKER_HUB_USERNAME
- **Value**: Your DockerHub username
- **Location**: GitHub Repository → Settings → Secrets and variables → Actions
- **Example**: `myusername`

### 2. DOCKER_HUB_PAT
- **Value**: DockerHub Personal Access Token
- **How to create**:
  1. Go to https://hub.docker.com/settings/security
  2. Click "New Access Token"
  3. Name: `GitHub Actions`
  4. Permissions: `Read, Write, Delete`
  5. Copy the generated token
- **Location**: GitHub Repository → Settings → Secrets and variables → Actions

## Files Modified
1. `.github/workflows/backend-docker.yml` - Fixed cache + added secret verification
2. `.github/workflows/frontend-docker.yml` - Fixed cache configuration  
3. `.github/workflows/telegram-bot-docker.yml` - Fixed cache configuration

## Testing the Fix

1. **Check secrets are set**: The workflow will now fail early with clear messages if secrets are missing
2. **Monitor build logs**: Look for "✅ Docker secrets are configured" message
3. **Verify authentication**: Check for "🔍 Testing docker auth..." output
4. **Cache fallback**: If registry cache fails, GHA cache will be used as backup

## Benefits
- **Reliability**: Multiple cache layers prevent single points of failure
- **Performance**: Registry cache is faster and more persistent
- **Debugging**: Clear error messages for missing configuration
- **Resilience**: Fallback mechanisms ensure builds can complete

## Troubleshooting

### "401 Unauthorized" Error
1. Verify `DOCKER_HUB_USERNAME` and `DOCKER_HUB_PAT` secrets are set
2. Ensure PAT has correct permissions (Read, Write, Delete)
3. Check if PAT has expired and regenerate if needed

### "Authentication Failed" Error  
1. Verify DockerHub username is correct
2. Try logging in manually: `docker login docker.io`
3. Regenerate Personal Access Token

### Cache Miss Issues
1. Check if registry cache exists: `docker pull username/repo:buildcache`
2. Fallback to GHA cache will be automatic
3. First build may be slower (no cache available)
