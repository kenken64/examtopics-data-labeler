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

REM Set authentication database (defaults to admin if not specified)
if "%MONGO_RESTORE_AUTH_DB%"=="" (
    set MONGO_RESTORE_AUTH_DB=admin
    echo Using default authentication database: admin
)

REM Set authentication mechanism (optional)
if "%MONGO_RESTORE_AUTH_MECHANISM%"=="" (
    set MONGO_RESTORE_AUTH_MECHANISM=SCRAM-SHA-256
    echo Using default authentication mechanism: SCRAM-SHA-256
)

echo Target Host: %MONGO_RESTORE_HOST%
echo Target Database: %MONGO_RESTORE_DB%
echo Target User: %MONGO_RESTORE_USER%
echo Auth Database: %MONGO_RESTORE_AUTH_DB%
echo Auth Mechanism: %MONGO_RESTORE_AUTH_MECHANISM%

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

REM Build MongoDB URI with authentication database and mechanism
set MONGO_URI=mongodb://%MONGO_RESTORE_USER%:%MONGO_RESTORE_PASS%@%MONGO_RESTORE_HOST%/?authSource=%MONGO_RESTORE_AUTH_DB%^&authMechanism=%MONGO_RESTORE_AUTH_MECHANISM%

REM Run mongorestore command using URI format
echo Running: mongorestore --uri "[HIDDEN_CREDENTIALS]" --db %MONGO_RESTORE_DB% ./backup/awscert/
echo.
echo Attempting connection with:
echo - Host: %MONGO_RESTORE_HOST%
echo - User: %MONGO_RESTORE_USER%
echo - Auth DB: %MONGO_RESTORE_AUTH_DB%
echo - Auth Mechanism: %MONGO_RESTORE_AUTH_MECHANISM%
echo - Target DB: %MONGO_RESTORE_DB%
echo.

REM Try URI method first
mongorestore --uri "%MONGO_URI%" --db %MONGO_RESTORE_DB% ./backup/awscert/

REM If URI method fails, try separate parameters method
if %ERRORLEVEL% neq 0 (
    echo.
    echo URI method failed. Trying separate parameters method...
    echo.
    mongorestore --host %MONGO_RESTORE_HOST% --username %MONGO_RESTORE_USER% --password %MONGO_RESTORE_PASS% --authenticationDatabase %MONGO_RESTORE_AUTH_DB% --authenticationMechanism %MONGO_RESTORE_AUTH_MECHANISM% --db %MONGO_RESTORE_DB% ./backup/awscert/
)

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
