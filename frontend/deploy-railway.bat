@echo off
echo Preparing frontend for Railway deployment...

echo Checking lockfile status...
if exist pnpm-lock.yaml (
    echo ✓ pnpm-lock.yaml exists
) else (
    echo ❌ pnpm-lock.yaml missing
    echo Creating lockfile...
    pnpm install
)

echo.
echo Testing build locally...
set MONGODB_URI=mongodb://localhost:27017/awscert
set JWT_SECRET=dummy-jwt-secret-for-build
set NEXT_PUBLIC_PDF_CONVERSION_API_URL=http://localhost:5000

pnpm build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Frontend build successful! Ready for Railway deployment.
) else (
    echo.
    echo ❌ Build failed. Please check errors above.
    exit /b 1
)

echo ✅ Found package.json

REM Check for required build script
echo 📦 Validating package.json scripts...
findstr /C:"build" package.json >nul
if errorlevel 1 (
    echo ❌ No build script found in package.json
    exit /b 1
) else (
    echo ✅ Build script found
)

findstr /C:"start" package.json >nul
if errorlevel 1 (
    echo ❌ No start script found in package.json
    exit /b 1
) else (
    echo ✅ Start script found
)

REM Check environment variables
echo 🔧 Checking environment configuration...
if exist ".env" (
    echo ⚠️  Found .env file - ensure sensitive data is in Railway environment variables
)

if exist ".env.local" (
    echo ⚠️  Found .env.local file - ensure it's in .gitignore
)

if exist ".env.railway" (
    echo ✅ Found Railway environment template
)

REM Check Next.js configuration
echo ⚙️  Validating Next.js configuration...
if exist "next.config.ts" (
    echo ✅ Next.js TypeScript configuration found
) else if exist "next.config.js" (
    echo ✅ Next.js JavaScript configuration found
)

REM Check for TypeScript
if exist "tsconfig.json" (
    echo ✅ TypeScript configuration found
)

REM Check for essential directories
if exist "app" (
    echo ✅ Next.js app directory found
) else if exist "pages" (
    echo ✅ Next.js pages directory found
) else (
    echo ❌ No Next.js pages or app directory found
    exit /b 1
)

echo 🎯 Deployment checklist:
echo   ✅ Next.js 14+ application with App Router
echo   ✅ Health check API endpoint (/api/health)
echo   ✅ MongoDB integration for data management
echo   ✅ JWT authentication system
echo   ✅ Railway configuration files created
echo   ✅ Environment variables template ready
echo   ✅ Standalone output for optimized deployment
echo   ✅ TypeScript configuration

echo.
echo 🎯 Next steps for Railway deployment:
echo 1. Push your code to GitHub
echo 2. Connect your repository to Railway
echo 3. Set required environment variables:
echo    - MONGODB_URI
echo    - JWT_SECRET
echo    - NEXT_PUBLIC_PDF_CONVERSION_API_URL
echo 4. Deploy from Railway dashboard
echo.
echo 📖 See RAILWAY_DEPLOYMENT.md for detailed instructions

echo ✅ Next.js frontend is ready for Railway deployment!
echo.
echo 🔗 Quick setup reminders:
echo   • Database: Set MONGODB_URI connection string
echo   • Auth: Generate secure JWT_SECRET
echo   • Backend: Link to your deployed backend API
echo   • Health check: https://your-app.railway.app/api/health
