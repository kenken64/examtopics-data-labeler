REM MongoDB Restore Environment Variables Setup
REM Copy this file and modify with your actual credentials

REM Required environment variables for restore scripts
REM Replace the values with your actual MongoDB connection details

REM MongoDB host and port
set MONGO_RESTORE_HOST=metro.proxy.rlwy.net:20769

REM MongoDB authentication  
set MONGO_RESTORE_USER=mongo
set MONGO_RESTORE_PASS=your-password-here

REM Target database name (defaults to 'test' if not set)
set MONGO_RESTORE_DB=test

REM Authentication settings (optional - will use defaults if not set)
set MONGO_RESTORE_AUTH_DB=admin
set MONGO_RESTORE_AUTH_MECHANISM=SCRAM-SHA-256

REM Alternative mechanisms you can try:
REM set MONGO_RESTORE_AUTH_MECHANISM=SCRAM-SHA-1
REM set MONGO_RESTORE_AUTH_MECHANISM=MONGODB-CR
REM set MONGO_RESTORE_AUTH_MECHANISM=PLAIN

REM Usage:
REM 1. Update the values above with your credentials
REM 2. Run this file: restore-env-vars.bat
REM 3. Run the restore script: mongodb-restore.bat

echo Environment variables set for MongoDB restore
echo Host: %MONGO_RESTORE_HOST%
echo User: %MONGO_RESTORE_USER%
echo Database: %MONGO_RESTORE_DB%
echo Auth Database: %MONGO_RESTORE_AUTH_DB%
echo Auth Mechanism: %MONGO_RESTORE_AUTH_MECHANISM%
