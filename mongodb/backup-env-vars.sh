# MongoDB Backup Environment Variables Setup
# Copy this file to .env or set these variables in your shell

# Required environment variables for backup scripts
# Replace the values with your actual MongoDB connection details

# MongoDB host and port
export MONGO_BACKUP_HOST=metro.proxy.rlwy.net:20769

# MongoDB authentication
export MONGO_BACKUP_USER=mongo
export MONGO_BACKUP_PASS=your-password-here

# Source database name to backup
export MONGO_BACKUP_DB=test

# Authentication settings (optional - will use defaults if not set)
export MONGO_BACKUP_AUTH_DB=admin
export MONGO_BACKUP_AUTH_MECHANISM=SCRAM-SHA-256

# Alternative mechanisms you can try:
# export MONGO_BACKUP_AUTH_MECHANISM=SCRAM-SHA-1
# export MONGO_BACKUP_AUTH_MECHANISM=MONGODB-CR
# export MONGO_BACKUP_AUTH_MECHANISM=PLAIN

# Usage:
# 1. Update the values above with your credentials
# 2. Source this file: source backup-env-vars.sh
# 3. Run the backup script: ./mongodb-backup.sh or ./mongodb-backup.ps1
