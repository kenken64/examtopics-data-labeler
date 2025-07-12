#!/bin/bash

# MongoDB Backup Script
# This script creates a backup of the awscert database from localhost

echo "🔄 Starting MongoDB backup process..."
echo "Database: awscert"
echo "Host: localhost:27017"
echo "Output directory: ./backup/"

# Create backup directory if it doesn't exist
mkdir -p ./backup/

# Get current timestamp for backup logging
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "Backup started at: $TIMESTAMP"

# Run mongodump command
mongodump --host localhost:27017 --db awscert --out ./backup/

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully!"
    echo "Backup location: ./backup/awscert/"
    
    # Show backup size
    if [ -d "./backup/awscert" ]; then
        BACKUP_SIZE=$(du -sh ./backup/awscert | cut -f1)
        echo "Backup size: $BACKUP_SIZE"
    fi
    
    echo "Backup finished at: $(date '+%Y-%m-%d %H:%M:%S')"
else
    echo "❌ Backup failed with exit code: $?"
    exit 1
fi

echo ""
echo "📋 Backup Summary:"
echo "- Database: awscert"
echo "- Source: localhost:27017"
echo "- Destination: ./backup/awscert/"
echo "- Status: Complete"
