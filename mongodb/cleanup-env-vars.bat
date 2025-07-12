REM MongoDB Cleanup Environment Variables Setup (Windows)
REM Run this batch file to set environment variables for the current session

REM Required environment variables for cleanup scripts
REM Replace the values with your actual MongoDB connection details

REM MongoDB host and port
set MONGO_CLEANUP_HOST=metro.proxy.rlwy.net:20769

REM MongoDB authentication  
set MONGO_CLEANUP_USER=mongo
set MONGO_CLEANUP_PASS=your-password-here

REM Target database name to cleanup (ALL COLLECTIONS WILL BE DELETED!)
set MONGO_CLEANUP_DB=test

REM Authentication settings (optional - will use defaults if not set)
set MONGO_CLEANUP_AUTH_DB=admin
set MONGO_CLEANUP_AUTH_MECHANISM=SCRAM-SHA-256

REM Alternative mechanisms you can try:
REM set MONGO_CLEANUP_AUTH_MECHANISM=SCRAM-SHA-1
REM set MONGO_CLEANUP_AUTH_MECHANISM=MONGODB-CR
REM set MONGO_CLEANUP_AUTH_MECHANISM=PLAIN

REM WARNING: The cleanup script will DELETE ALL COLLECTIONS in the specified database!

REM Usage:
REM 1. Update the values above with your credentials
REM 2. Run this file: cleanup-env-vars.bat
REM 3. Run the cleanup script: mongodb-cleanup.bat or mongodb-cleanup.ps1

echo Environment variables set for MongoDB cleanup
echo Host: %MONGO_CLEANUP_HOST%
echo User: %MONGO_CLEANUP_USER%
echo Database: %MONGO_CLEANUP_DB%
echo Auth Database: %MONGO_CLEANUP_AUTH_DB%
echo Auth Mechanism: %MONGO_CLEANUP_AUTH_MECHANISM%
echo.
echo WARNING: This will DELETE ALL COLLECTIONS in database: %MONGO_CLEANUP_DB%
