# MongoDB Cleanup Environment Variables Setup
# Copy this file to .env or set these variables in your shell

# Required environment variables for cleanup scripts
# Replace the values with your actual MongoDB connection details

# MongoDB host and port
export MONGO_CLEANUP_HOST=metro.proxy.rlwy.net:20769

# MongoDB authentication
export MONGO_CLEANUP_USER=mongo
export MONGO_CLEANUP_PASS=your-password-here

# Target database name to cleanup (ALL COLLECTIONS WILL BE DELETED!)
export MONGO_CLEANUP_DB=test

# Authentication settings (optional - will use defaults if not set)
export MONGO_CLEANUP_AUTH_DB=admin
export MONGO_CLEANUP_AUTH_MECHANISM=SCRAM-SHA-256

# Alternative mechanisms you can try:
# export MONGO_CLEANUP_AUTH_MECHANISM=SCRAM-SHA-1
# export MONGO_CLEANUP_AUTH_MECHANISM=MONGODB-CR
# export MONGO_CLEANUP_AUTH_MECHANISM=PLAIN

# WARNING: The cleanup script will DELETE ALL COLLECTIONS in the specified database!

# Usage:
# 1. Update the values above with your credentials
# 2. Source this file: source cleanup-env-vars.sh
# 3. Run the cleanup script: ./mongodb-cleanup.sh or ./mongodb-cleanup.ps1
