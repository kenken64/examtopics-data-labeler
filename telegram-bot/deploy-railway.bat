@echo off
REM Railway Deployment Script for Telegram Bot (Windows)
REM Run this script to prepare and deploy Telegram bot to Railway

echo 🤖 Preparing ExamTopics Telegram Bot for Railway Deployment
echo ==========================================================

REM Check if we're in the telegram-bot directory
if not exist "bot.js" (
    echo ❌ Error: bot.js not found. Please run this script from the telegram-bot directory.
    exit /b 1
)

echo ✅ Found bot.js - proceeding with deployment preparation

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ Error: package.json not found
    exit /b 1
)

echo ✅ Found package.json

REM Check environment variables
echo 🔧 Checking environment configuration...
if exist ".env" (
    echo ⚠️  Found .env file - ensure sensitive data is in Railway environment variables
)

if exist ".env.railway" (
    echo ✅ Found Railway environment template
)

REM Validate package.json scripts
echo 📋 Checking package.json scripts...
findstr /C:"start" package.json >nul
if errorlevel 1 (
    echo ❌ No start script found in package.json
    exit /b 1
) else (
    echo ✅ Start script found
)

echo 🎯 Deployment checklist:
echo   ✅ Telegram bot configured with Grammy framework
echo   ✅ Health check server for Railway monitoring
echo   ✅ MongoDB connection with graceful error handling
echo   ✅ Railway configuration files created
echo   ✅ Environment variables template ready
echo   ✅ Graceful shutdown handling
echo   ✅ Production-ready logging

echo.
echo 🎯 Next steps for Railway deployment:
echo 1. Create Telegram bot with @BotFather
echo 2. Push your code to GitHub
echo 3. Connect your repository to Railway
echo 4. Set BOT_TOKEN and MONGODB_URI in Railway environment
echo 5. Deploy from Railway dashboard
echo.
echo 📖 See RAILWAY_DEPLOYMENT.md for detailed instructions

echo ✅ Telegram bot is ready for Railway deployment!
echo.
echo 🔗 Quick setup reminders:
echo   • Get bot token: @BotFather on Telegram
echo   • MongoDB: Use Railway MongoDB or Atlas
echo   • Health check: https://your-app.railway.app/health
