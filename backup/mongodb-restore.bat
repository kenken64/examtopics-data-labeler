@echo off
REM MongoDB Restore Script for Windows
REM This script restores the awscert database backup to a remote MongoDB instance

echo 🔄 Starting MongoDB restore process...
echo Source: ./backup/awscert/
echo Target Host: metro.proxy.rlwy.net:20769
echo Target Database: test

REM Check if backup directory exists
if not exist "./backup/awscert" (
    echo ❌ Error: Backup directory './backup/awscert' not found!
    echo Please run the backup script first or ensure backup files exist.
    pause
    exit /b 1
)

REM Get current timestamp for restore logging
for /f "tokens=1-4 delims=/ " %%i in ('date /t') do set RESTORE_DATE=%%k-%%j-%%i
for /f "tokens=1-2 delims=: " %%i in ('time /t') do set RESTORE_TIME=%%i:%%j
echo Restore started at: %RESTORE_DATE% %RESTORE_TIME%

REM Show backup info
if exist "./backup/awscert" (
    echo Backup directory found
)

echo.
echo ⚠️  WARNING: This will restore data to the 'test' database on the remote server.
echo Press Ctrl+C to cancel, or press any key to continue...
pause

REM Run mongorestore command
mongorestore --host mongo:LljBYulYQHFmXxYZVFjhYHyJtosRSnaN@metro.proxy.rlwy.net:20769 --db test ./backup/awscert/

REM Check if restore was successful
if %ERRORLEVEL% equ 0 (
    echo ✅ Restore completed successfully!
    for /f "tokens=1-2 delims=: " %%i in ('time /t') do set END_TIME=%%i:%%j
    echo Restore finished at: %RESTORE_DATE% %END_TIME%
) else (
    echo ❌ Restore failed with exit code: %ERRORLEVEL%
    pause
    exit /b 1
)

echo.
echo 📋 Restore Summary:
echo - Source: ./backup/awscert/
echo - Target Host: metro.proxy.rlwy.net:20769
echo - Target Database: test
echo - Status: Complete

pause
