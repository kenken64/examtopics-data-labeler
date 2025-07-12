# MongoDB Restore Environment Variables Setup
# Copy this file to .env or set these variables in your shell

# Required environment variables for restore scripts
# Replace the values with your actual MongoDB connection details

# MongoDB host and port
export MONGO_RESTORE_HOST=metro.proxy.rlwy.net:20769

# MongoDB authentication
export MONGO_RESTORE_USER=mongo
export MONGO_RESTORE_PASS=your-password-here

# Target database name (defaults to 'test' if not set)
export MONGO_RESTORE_DB=test

# Authentication settings (optional - will use defaults if not set)
export MONGO_RESTORE_AUTH_DB=admin
export MONGO_RESTORE_AUTH_MECHANISM=SCRAM-SHA-256

# Alternative mechanisms you can try:
# export MONGO_RESTORE_AUTH_MECHANISM=SCRAM-SHA-1
# export MONGO_RESTORE_AUTH_MECHANISM=MONGODB-CR
# export MONGO_RESTORE_AUTH_MECHANISM=PLAIN

# Usage:
# 1. Update the values above with your credentials
# 2. Source this file: source restore-env-vars.sh
# 3. Run the restore script: ./mongodb-restore.sh
