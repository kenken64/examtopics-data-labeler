@echo off
echo Preparing Telegram Bot for Railway deployment...

REM Remove existing lockfile
if exist package-lock.json del package-lock.json

REM Reinstall packages to generate fresh lockfile
echo Installing dependencies...
npm install

REM Validate the bot code
echo Validating bot code...
npm run validate

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Telegram Bot is ready for Railway deployment!
    echo - Dependencies installed
    echo - Lockfile updated
    echo - Code validated
) else (
    echo.
    echo ❌ Validation failed. Please check the bot code.
    exit /b 1
)
