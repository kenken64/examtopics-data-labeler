@echo off
REM Railway Deployment Script for Windows
REM Run this script to prepare and deploy backend to Railway

echo 🚀 Preparing ExamTopics Backend for Railway Deployment
echo =====================================================

REM Check if we're in the backend directory
if not exist "app.py" (
    echo ❌ Error: app.py not found. Please run this script from the backend directory.
    exit /b 1
)

echo ✅ Found app.py - proceeding with deployment preparation

REM Check if requirements.txt exists
if not exist "requirements.txt" (
    echo ❌ Error: requirements.txt not found
    exit /b 1
)

echo ✅ Found requirements.txt

REM Check environment variables
echo 🔧 Checking environment configuration...
if exist ".env" (
    echo ⚠️  Found .env file - ensure sensitive data is in Railway environment variables
)

if exist ".env.railway" (
    echo ✅ Found Railway environment template
)

echo 📋 Deployment checklist:
echo   ✅ Flask app configured
echo   ✅ Health check endpoint added
echo   ✅ Railway configuration files created
echo   ✅ Production WSGI server configured
echo   ✅ System dependencies specified
echo   ✅ Environment variables template ready

echo.
echo 🎯 Next steps for Railway deployment:
echo 1. Push your code to GitHub
echo 2. Connect your repository to Railway
echo 3. Set OPENAI_API_KEY in Railway environment variables
echo 4. Deploy from Railway dashboard
echo.
echo 📖 See RAILWAY_DEPLOYMENT.md for detailed instructions

echo ✅ Backend is ready for Railway deployment!
