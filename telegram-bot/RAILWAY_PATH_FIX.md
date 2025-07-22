# Railway Deployment Path Fix

## Problem
The Telegram bot was failing to deploy on Railway with the following error:
```
Error: Cannot find module '/app/srcbot.js'
MODULE_NOT_FOUND
```

## Root Cause
The `package.json` scripts were using Windows-style backslashes (`src\\bot.js`) instead of Unix-style forward slashes. When deployed on Railway's Linux containers, the path was incorrectly interpreted as `srcbot.js` (missing the forward slash separator).

## Solution
Updated the `package.json` scripts to use Unix-style forward slashes:

**Before:**
```json
{
  "scripts": {
    "start": "node src\\bot.js",
    "dev": "node src\\bot.js",
    "validate": "node -c src\\bot.js"
  }
}
```

**After:**
```json
{
  "scripts": {
    "start": "node src/bot.js",
    "dev": "node src/bot.js", 
    "validate": "node -c src/bot.js"
  }
}
```

## Files Modified
- `package.json` - Fixed path separators in npm scripts

## Verification
- ✅ Local validation passes: `npm run validate`
- ✅ Path resolves correctly: `src/bot.js`
- ✅ Railway deployment should now work properly

## Key Learnings
- Always use forward slashes (`/`) in npm scripts for cross-platform compatibility
- Windows-style backslashes (`\`) don't work in Linux containers
- Railway uses Linux containers, so Unix path conventions are required

## Next Steps
1. Deploy to Railway to verify the fix
2. Monitor deployment logs for successful startup
3. Test bot functionality after deployment
