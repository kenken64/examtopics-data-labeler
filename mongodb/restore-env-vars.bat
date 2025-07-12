REM MongoDB Restore Environment Variables Setup
REM Copy this file and modify with your actual credentials

REM Required environment variables for restore scripts
REM Replace the values with your actual MongoDB connection details

REM MongoDB host and port
set MONGO_RESTORE_HOST=metro.proxy.rlwy.net:20769

REM MongoDB authentication  
set MONGO_RESTORE_USER=mongo
set MONGO_RESTORE_PASS=

REM Target database name (defaults to 'test' if not set)
set MONGO_RESTORE_DB=test

REM Usage:
REM 1. Update the values above with your credentials
REM 2. Run this file: restore-env-vars.bat
REM 3. Run the restore script: mongodb-restore.bat

echo Environment variables set for MongoDB restore
echo Host: %MONGO_RESTORE_HOST%
echo User: %MONGO_RESTORE_USER%
echo Database: %MONGO_RESTORE_DB%
