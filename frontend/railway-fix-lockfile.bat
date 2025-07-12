@echo off
echo 🔧 Railway Frontend Lockfile Fix - Windows
echo.

cd /d "%~dp0"

echo 📂 Current directory: %CD%
echo.

node railway-fix-lockfile.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Lockfile fix failed!
    pause
    exit /b 1
)

echo.
echo ✅ Lockfile fix completed successfully!
echo 💡 Ready for Railway deployment
echo.
pause
