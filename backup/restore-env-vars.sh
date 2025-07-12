# MongoDB Restore Environment Variables Setup
# Copy this file to .env or set these variables in your shell

# Required environment variables for restore scripts
# Replace the values with your actual MongoDB connection details

# MongoDB host and port
export MONGO_RESTORE_HOST=metro.proxy.rlwy.net:20769

# MongoDB authentication
export MONGO_RESTORE_USER=mongo
export MONGO_RESTORE_PASS=LljBYulYQHFmXxYZVFjhYHyJtosRSnaN

# Target database name (defaults to 'test' if not set)
export MONGO_RESTORE_DB=test

# Usage:
# 1. Update the values above with your credentials
# 2. Source this file: source restore-env-vars.sh
# 3. Run the restore script: ./mongodb-restore.sh
