@echo off
echo 🚀 Deploying CORS fixes to Railway...
echo ==================================

REM Check if we're in the frontend directory
if not exist "next.config.ts" (
    echo ❌ Error: Please run this script from the frontend directory
    exit /b 1
)

echo 📋 Pre-deployment checklist:
echo ✅ Enhanced next.config.ts with comprehensive CORS headers
echo ✅ Updated middleware.ts with OPTIONS handler
echo ✅ Enhanced file serving endpoint with CORS headers
echo ✅ Created railway.json configuration

echo.
echo 🔧 Building application...
npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed. Please fix build errors before deploying.
    exit /b 1
)

echo ✅ Build successful
echo.
echo 📦 Deployment commands for Railway:
echo 1. Commit these changes:
echo    git add .
echo    git commit -m "Fix CORS issues for Railway deployment"
echo.
echo 2. Push to Railway:
echo    git push origin main
echo.
echo 3. Monitor deployment in Railway dashboard

echo.
echo 🧪 Post-deployment testing:
echo 1. Open your Railway app URL
echo 2. Open browser developer tools (F12)
echo 3. Run the CORS test script from frontend/scripts/test-cors-fix.js
echo 4. Check Network tab for CORS errors

echo.
echo 🔍 Troubleshooting CORS issues:
echo - Check that all API responses include Access-Control-Allow-Origin header
echo - Verify OPTIONS requests return 200 status
echo - Ensure image requests include proper CORS headers
echo - Check Railway logs for any server-side errors

echo.
echo 📝 Common CORS fixes:
echo 1. If images still fail: Check Cloudinary CORS settings
echo 2. If API calls fail: Verify middleware.ts is working
echo 3. If preflight fails: Check OPTIONS handlers

echo.
echo ✅ CORS fix deployment preparation complete!
echo Deploy using the commands above and test with the provided script.
pause
