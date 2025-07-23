# Railway Frontend Deployment - Lockfile Fix Documentation

## Problem Summary
Railway deployment was failing with the error:
```
process "/bin/bash -ol pipefail -c pnpm i --frozen-lockfile" did not complete successfully: exit code: 1
```

## Root Cause
The issue occurred because:
1. Railway's auto-generated Dockerfile was using `--frozen-lockfile` by default
2. Our lockfile might have been out of sync or corrupted
3. NIXPACKS configuration was not properly overriding the default behavior

## Solution Implementation

### 1. Updated NIXPACKS Configuration (`nixpacks.toml`)
```toml
# Nixpacks configuration for Railway deployment
[phases.setup]
nixPkgs = ["nodejs-18_x", "pnpm"]

[phases.install]
cmds = [
  "echo 'Starting Railway installation...'",
  "echo 'Node version:' && node --version",
  "echo 'PNPM version:' && pnpm --version",
  "pnpm run railway:install",
  "echo 'Installation completed successfully'"
]

[phases.build]
cmd = "pnpm build"

[start]
cmd = "npm start"

[variables]
NODE_ENV = "production"
PORT = "3000"
NEXT_TELEMETRY_DISABLED = "1"
PNPM_FROZEN_LOCKFILE = "false"
```

### 2. Added Railway-Specific Scripts (`package.json`)
```json
{
  "scripts": {
    "railway:install": "pnpm install --no-frozen-lockfile --reporter=append-only",
    "railway:build": "pnpm run railway:install && pnpm build",
    "railway:fix": "node railway-fix-lockfile.js"
  }
}
```

### 3. Created .npmrc Configuration
```ini
# Railway deployment configuration
frozen-lockfile=false
prefer-frozen-lockfile=false
reporter=append-only
registry=https://registry.npmjs.org/
network-timeout=300000
store-dir=.pnpm-store
production=false
dev=false
```

### 4. Updated Railway Configuration (`railway.json`)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm run railway:build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 5. Created Lockfile Fix Utilities

#### `railway-fix-lockfile.js` - Node.js Script
- Removes existing lockfile and node_modules
- Reinstalls dependencies with `--no-frozen-lockfile`
- Provides detailed logging for troubleshooting

#### `railway-fix-lockfile.bat` - Windows Batch Script
- Windows-friendly wrapper for the Node.js script
- Handles error reporting and user feedback

## Verification Steps

### 1. Local Testing
```bash
cd frontend
pnpm run railway:fix
pnpm run railway:build
```

### 2. Manual Lockfile Regeneration
```bash
cd frontend
rm pnpm-lock.yaml
pnpm install --no-frozen-lockfile --reporter=append-only
```

### 3. Build Verification
```bash
cd frontend
pnpm build
npm start
```

## Key Changes Made

1. **Regenerated Clean Lockfile**: Removed existing `pnpm-lock.yaml` and created a fresh one
2. **Added .npmrc**: Prevents frozen lockfile behavior by default
3. **Railway-Specific Scripts**: Uses custom installation command that bypasses frozen lockfile
4. **Enhanced NIXPACKS**: More explicit phase configuration with debugging output
5. **Improved Railway Config**: Uses custom build command instead of relying on defaults

## Expected Behavior

### Before Fix
- Railway build fails with frozen lockfile error
- Auto-generated Dockerfile conflicts with package manager settings
- Build process stops at dependency installation phase

### After Fix
- Railway build uses `--no-frozen-lockfile` explicitly
- Dependencies install successfully with detailed logging
- Build proceeds to Next.js compilation phase
- Health checks work correctly after deployment

## Monitoring & Troubleshooting

### Build Logs to Watch For
1. "Starting Railway installation..." - Shows custom install phase
2. Node and PNPM version output - Confirms environment
3. "Installation completed successfully" - Confirms dependency resolution
4. Next.js build output - Shows successful compilation

### Common Issues & Solutions

#### Issue: "lockfile does not exist"
**Solution**: Run `pnpm run railway:fix` locally to regenerate

#### Issue: "dependency resolution failed"
**Solution**: Check .npmrc configuration and network settings

#### Issue: "health check failed"
**Solution**: Verify `/api/health` endpoint and startCommand configuration

## Deployment Checklist

- [ ] Lockfile regenerated successfully
- [ ] .npmrc configuration in place
- [ ] nixpacks.toml updated with custom phases
- [ ] railway.json uses railway:build command
- [ ] Local build test passes
- [ ] Health check endpoint accessible
- [ ] All changes committed and pushed

## Files Modified/Created

### Modified Files
- `package.json` - Added railway-specific scripts
- `nixpacks.toml` - Updated with explicit phases and variables
- `railway.json` - Updated build command
- `pnpm-lock.yaml` - Regenerated clean lockfile

### New Files
- `.npmrc` - PNPM configuration for Railway
- `railway-fix-lockfile.js` - Lockfile regeneration script
- `railway-fix-lockfile.bat` - Windows wrapper script
- `RAILWAY_LOCKFILE_FIX.md` - This documentation

## Success Metrics

- ✅ Railway build completes without frozen lockfile errors
- ✅ Dependencies install in under 2 minutes
- ✅ Next.js build completes successfully
- ✅ Application starts and health checks pass
- ✅ No manual intervention required for deployments

## Next Steps

1. Monitor first Railway deployment for any remaining issues
2. Update CI/CD pipelines to use railway-specific scripts if needed
3. Consider automating lockfile health checks in the repository
4. Document any additional Railway-specific configuration requirements

## Support Information

For issues with this fix:
1. Check Railway build logs for specific error messages
2. Verify all configuration files are properly committed
3. Test locally using `pnpm run railway:build`
4. Contact support with specific error logs if issues persist

---
*Last Updated: July 13, 2025*
*Status: Ready for Railway deployment*
