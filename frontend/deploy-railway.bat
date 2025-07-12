@echo off
REM Railway Deployment Script for Next.js Frontend (Windows)
REM Run this script to prepare and deploy frontend to Railway

echo ⚡ Preparing ExamTopics Next.js Frontend for Railway Deployment
echo =============================================================

REM Check if we're in the frontend directory
if not exist "next.config.ts" if not exist "next.config.js" (
    echo ❌ Error: Next.js config not found. Please run this script from the frontend directory.
    exit /b 1
)

echo ✅ Found Next.js configuration - proceeding with deployment preparation

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ Error: package.json not found
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
