#!/bin/bash

# MongoDB Restore Script
# This script restores the awscert database backup to a remote MongoDB instance

echo "🔄 Starting MongoDB restore process..."
echo "Source: ./backup/awscert/"

# Check for environment variables
if [ -z "$MONGO_RESTORE_HOST" ]; then
    echo "❌ Error: MONGO_RESTORE_HOST environment variable not set!"
    echo "Please set the following environment variables:"
    echo "  export MONGO_RESTORE_HOST=your-mongo-host:port"
    echo "  export MONGO_RESTORE_USER=your-username"
    echo "  export MONGO_RESTORE_PASS=your-password"
    echo "  export MONGO_RESTORE_DB=target-database-name"
    echo ""
    echo "Example:"
    echo "  export MONGO_RESTORE_HOST=metro.proxy.rlwy.net:20769"
    echo "  export MONGO_RESTORE_USER=mongo"
    echo "  export MONGO_RESTORE_PASS=your-password"
    echo "  export MONGO_RESTORE_DB=test"
    exit 1
fi

if [ -z "$MONGO_RESTORE_USER" ]; then
    echo "❌ Error: MONGO_RESTORE_USER environment variable not set!"
    echo "💡 Note: Use 'admin' as username when authSource=admin"
    exit 1
fi

if [ -z "$MONGO_RESTORE_PASS" ]; then
    echo "❌ Error: MONGO_RESTORE_PASS environment variable not set!"
    exit 1
fi

if [ -z "$MONGO_RESTORE_DB" ]; then
    MONGO_RESTORE_DB="test"
    echo "Using default target database: test"
fi

# Set authentication database (defaults to admin if not specified)
if [ -z "$MONGO_RESTORE_AUTH_DB" ]; then
    MONGO_RESTORE_AUTH_DB="admin"
    echo "Using default authentication database: admin"
fi

# Set authentication mechanism (optional)
if [ -z "$MONGO_RESTORE_AUTH_MECHANISM" ]; then
    MONGO_RESTORE_AUTH_MECHANISM="SCRAM-SHA-256"
    echo "Using default authentication mechanism: SCRAM-SHA-256"
fi

echo "Target Host: $MONGO_RESTORE_HOST"
echo "Target Database: $MONGO_RESTORE_DB"
echo "Target User: $MONGO_RESTORE_USER"
echo "Auth Database: $MONGO_RESTORE_AUTH_DB"
echo "Auth Mechanism: $MONGO_RESTORE_AUTH_MECHANISM"

# Check if backup directory exists
if [ ! -d "./backup/awscert" ]; then
    echo "❌ Error: Backup directory './backup/awscert' not found!"
    echo "Please run the backup script first or ensure backup files exist."
    exit 1
fi

# Get current timestamp for restore logging
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "Restore started at: $TIMESTAMP"

# Show backup info
if [ -d "./backup/awscert" ]; then
    BACKUP_SIZE=$(du -sh ./backup/awscert | cut -f1)
    echo "Backup size: $BACKUP_SIZE"
fi

echo ""
echo "⚠️  WARNING: This will restore data to the '$MONGO_RESTORE_DB' database on the remote server."
echo "Press Ctrl+C to cancel, or press Enter to continue..."
read -r

# Build MongoDB URI with authentication database and mechanism
MONGO_URI="mongodb://$MONGO_RESTORE_USER:$MONGO_RESTORE_PASS@$MONGO_RESTORE_HOST/?authSource=$MONGO_RESTORE_AUTH_DB&authMechanism=$MONGO_RESTORE_AUTH_MECHANISM"

# Run mongorestore command using URI format
echo "Running: mongorestore --uri \"[HIDDEN_CREDENTIALS]\" --db $MONGO_RESTORE_DB ./backup/awscert/"
echo ""
echo "Attempting connection with:"
echo "- Host: $MONGO_RESTORE_HOST"
echo "- User: $MONGO_RESTORE_USER"
echo "- Auth DB: $MONGO_RESTORE_AUTH_DB"
echo "- Auth Mechanism: $MONGO_RESTORE_AUTH_MECHANISM"
echo "- Target DB: $MONGO_RESTORE_DB"
echo ""

# Try URI method first
mongorestore --uri "$MONGO_URI" --db "$MONGO_RESTORE_DB" ./backup/awscert/

# If URI method fails, try separate parameters method
if [ $? -ne 0 ]; then
    echo ""
    echo "URI method failed. Trying separate parameters method..."
    echo ""
    mongorestore --host "$MONGO_RESTORE_HOST" --username "$MONGO_RESTORE_USER" --password "$MONGO_RESTORE_PASS" --authenticationDatabase "$MONGO_RESTORE_AUTH_DB" --authenticationMechanism "$MONGO_RESTORE_AUTH_MECHANISM" --db "$MONGO_RESTORE_DB" ./backup/awscert/
fi

# Check if restore was successful
if [ $? -eq 0 ]; then
    echo "✅ Restore completed successfully!"
    echo "Restore finished at: $(date '+%Y-%m-%d %H:%M:%S')"
else
    echo "❌ Restore failed with exit code: $?"
    exit 1
fi

echo ""
echo "📋 Restore Summary:"
echo "- Source: ./backup/awscert/"
echo "- Target Host: $MONGO_RESTORE_HOST"
echo "- Target Database: $MONGO_RESTORE_DB"
echo "- Status: Complete"
