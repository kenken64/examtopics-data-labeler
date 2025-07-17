# Docker GitHub Actions Authentication Fix

## Problem
The Docker build GitHub Actions were failing with Azure Blob Storage authentication errors:
```
ERROR CODE: AuthenticationFailed
Signature not valid in the specified time frame
```

## Root Cause
- GitHub Actions cache (`type=gha`) uses Azure Blob Storage with time-limited authentication tokens
- Multi-platform builds (linux/amd64,linux/arm64) take longer and can exceed token validity period
- Clock skew between GitHub runners and Azure storage can cause premature token expiration

## Solution Applied

### 1. Switched from GHA Cache to Registry Cache
**Before:**
```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

**After:**
```yaml
cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ secrets.DOCKER_HUB_USERNAME }}/${{ env.IMAGE_NAME }}:buildcache
cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ secrets.DOCKER_HUB_USERNAME }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
```

### 2. Added Build Optimizations
- Added `provenance: false` and `sbom: false` to reduce build time and artifacts
- Added `timeout-minutes: 45` to prevent indefinite hangs
- Enhanced Docker Buildx configuration with `driver-opts`

### 3. Added Fallback Build Job
- Fallback job runs without cache if main build fails
- Single platform (linux/amd64) for faster builds
- Uses `no-cache: true` to avoid any caching issues

## Files Modified
1. `.github/workflows/backend-docker.yml`
2. `.github/workflows/frontend-docker.yml` 
3. `.github/workflows/telegram-bot-docker.yml`

## Benefits
- **Reliability**: Registry cache is more stable than GHA cache
- **Performance**: Cache is preserved across builds and branches
- **Resilience**: Fallback builds ensure deployments don't fail completely
- **Debugging**: Better error handling and build summaries

## Alternative Solutions Considered
1. **Local cache**: `type=local` - but doesn't persist across runners
2. **No cache**: `no-cache: true` - slower builds but more reliable
3. **Single platform**: Only linux/amd64 - faster but less compatibility

The registry cache approach provides the best balance of performance and reliability.
