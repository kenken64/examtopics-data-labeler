@echo off
REM MongoDB Backup Script for Windows
REM This script creates a backup of the awscert database from localhost

echo 🔄 Starting MongoDB backup process...
echo Database: awscert
echo Host: localhost:27017
echo Output directory: ./backup/

REM Create backup directory if it doesn't exist
if not exist "backup" mkdir backup

REM Get current timestamp for backup logging
for /f "tokens=1-4 delims=/ " %%i in ('date /t') do set BACKUP_DATE=%%k-%%j-%%i
for /f "tokens=1-2 delims=: " %%i in ('time /t') do set BACKUP_TIME=%%i:%%j
echo Backup started at: %BACKUP_DATE% %BACKUP_TIME%

REM Run mongodump command
mongodump --host localhost:27017 --db awscert --out ./backup/

REM Check if backup was successful
if %ERRORLEVEL% equ 0 (
    echo ✅ Backup completed successfully!
    echo Backup location: ./backup/awscert/
    
    REM Show backup exists
    if exist "./backup/awscert" (
        echo Backup directory created successfully
    )
    
    for /f "tokens=1-2 delims=: " %%i in ('time /t') do set END_TIME=%%i:%%j
    echo Backup finished at: %BACKUP_DATE% %END_TIME%
) else (
    echo ❌ Backup failed with exit code: %ERRORLEVEL%
    exit /b 1
)

echo.
echo 📋 Backup Summary:
echo - Database: awscert
echo - Source: localhost:27017
echo - Destination: ./backup/awscert/
echo - Status: Complete

pause
