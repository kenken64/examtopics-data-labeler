@echo off
REM MongoDB Restore Script for Windows
REM This script restores the awscert database backup to a remote MongoDB instance

echo 🔄 Starting MongoDB restore process...
echo Source: ./backup/awscert/

REM Check for environment variables or use defaults
if "%MONGO_RESTORE_HOST%"=="" (
    echo ❌ Error: MONGO_RESTORE_HOST environment variable not set!
    echo Please set the following environment variables:
    echo   MONGO_RESTORE_HOST=your-mongo-host:port
    echo   MONGO_RESTORE_USER=your-username
    echo   MONGO_RESTORE_PASS=your-password
    echo   MONGO_RESTORE_DB=target-database-name
    echo.
    echo Example:
    echo   set MONGO_RESTORE_HOST=metro.proxy.rlwy.net:20769
    echo   set MONGO_RESTORE_USER=mongo
    echo   set MONGO_RESTORE_PASS=your-password
    echo   set MONGO_RESTORE_DB=test
    pause
    exit /b 1
)

if "%MONGO_RESTORE_USER%"=="" (
    echo ❌ Error: MONGO_RESTORE_USER environment variable not set!
    pause
    exit /b 1
)

if "%MONGO_RESTORE_PASS%"=="" (
    echo ❌ Error: MONGO_RESTORE_PASS environment variable not set!
    pause
    exit /b 1
)

if "%MONGO_RESTORE_DB%"=="" (
    set MONGO_RESTORE_DB=test
    echo Using default target database: test
)

echo Target Host: %MONGO_RESTORE_HOST%
echo Target Database: %MONGO_RESTORE_DB%
echo Target User: %MONGO_RESTORE_USER%

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
echo ⚠️  WARNING: This will restore data to the '%MONGO_RESTORE_DB%' database on the remote server.
echo Press Ctrl+C to cancel, or press any key to continue...
pause

REM Build connection string
set CONNECTION_STRING=%MONGO_RESTORE_USER%:%MONGO_RESTORE_PASS%@%MONGO_RESTORE_HOST%

REM Run mongorestore command
mongorestore --host %CONNECTION_STRING% --db %MONGO_RESTORE_DB% ./backup/awscert/

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
echo - Target Host: %MONGO_RESTORE_HOST%
echo - Target Database: %MONGO_RESTORE_DB%
echo - Status: Complete

pause
