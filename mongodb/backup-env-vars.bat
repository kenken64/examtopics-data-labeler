REM MongoDB Backup Environment Variables Setup (Windows)
REM Run this batch file to set environment variables for the current session

REM Required environment variables for backup scripts
REM Replace the values with your actual MongoDB connection details

REM MongoDB host and port
set MONGO_BACKUP_HOST=metro.proxy.rlwy.net:20769

REM MongoDB authentication  
set MONGO_BACKUP_USER=mongo
set MONGO_BACKUP_PASS=your-password-here

REM Source database name to backup
set MONGO_BACKUP_DB=test

REM Authentication settings (optional - will use defaults if not set)
set MONGO_BACKUP_AUTH_DB=admin
set MONGO_BACKUP_AUTH_MECHANISM=SCRAM-SHA-256

REM Alternative mechanisms you can try:
REM set MONGO_BACKUP_AUTH_MECHANISM=SCRAM-SHA-1
REM set MONGO_BACKUP_AUTH_MECHANISM=MONGODB-CR
REM set MONGO_BACKUP_AUTH_MECHANISM=PLAIN

REM Usage:
REM 1. Update the values above with your credentials
REM 2. Run this file: backup-env-vars.bat
REM 3. Run the backup script: mongodb-backup.bat or mongodb-backup.ps1

echo Environment variables set for MongoDB backup
echo Host: %MONGO_BACKUP_HOST%
echo User: %MONGO_BACKUP_USER%
echo Database: %MONGO_BACKUP_DB%
echo Auth Database: %MONGO_BACKUP_AUTH_DB%
echo Auth Mechanism: %MONGO_BACKUP_AUTH_MECHANISM%
