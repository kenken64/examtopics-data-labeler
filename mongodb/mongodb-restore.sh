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

echo "Target Host: $MONGO_RESTORE_HOST"
echo "Target Database: $MONGO_RESTORE_DB"
echo "Target User: $MONGO_RESTORE_USER"

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

# Build connection string
CONNECTION_STRING="$MONGO_RESTORE_USER:$MONGO_RESTORE_PASS@$MONGO_RESTORE_HOST"

# Run mongorestore command
mongorestore --host "$CONNECTION_STRING" --db "$MONGO_RESTORE_DB" ./backup/awscert/

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
