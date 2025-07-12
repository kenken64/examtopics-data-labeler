#!/bin/bash

# MongoDB Cleanup Script (Bash)
# This script removes all collections from a MongoDB database

set -e

show_help() {
    cat << EOF
MongoDB Cleanup Script (Bash)

Usage: $0 [OPTIONS]

Options:
    -d, --database DATABASE    Database name to cleanup (optional, uses env var if not provided)
    -f, --force               Skip confirmation prompt
    -h, --help               Show this help message

Environment Variables Required:
    MONGO_CLEANUP_HOST       - MongoDB host and port (e.g., localhost:27017)
    MONGO_CLEANUP_USER       - MongoDB username
    MONGO_CLEANUP_PASS       - MongoDB password
    MONGO_CLEANUP_DB         - Database name (used if -d not provided)
    MONGO_CLEANUP_AUTH_DB    - Authentication database (optional, default: admin)

WARNING: This script will DELETE ALL COLLECTIONS in the specified database!

Examples:
    $0 -d test -f
    $0 --database mydb --force
EOF
}

# Default values
DATABASE=""
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--database)
            DATABASE="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

echo "🧹 MongoDB Database Cleanup Script (Bash)"
echo "========================================="
echo "⚠️  WARNING: This will DELETE ALL COLLECTIONS!"

# Check if mongosh is available
if ! command -v mongosh &> /dev/null; then
    echo "❌ Error: mongosh not found in PATH!"
    echo "Please install MongoDB Shell: https://www.mongodb.com/try/download/shell"
    exit 1
fi

echo "✅ mongosh found"

# Validate required environment variables
required_vars=("MONGO_CLEANUP_HOST" "MONGO_CLEANUP_USER" "MONGO_CLEANUP_PASS")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var environment variable not set!"
        exit 1
    fi
done

# Determine target database
if [ -n "$DATABASE" ]; then
    TARGET_DB="$DATABASE"
elif [ -n "$MONGO_CLEANUP_DB" ]; then
    TARGET_DB="$MONGO_CLEANUP_DB"
else
    echo "❌ Error: Database not specified!"
    echo "Provide -d parameter or set MONGO_CLEANUP_DB environment variable"
    exit 1
fi

# Set defaults for optional variables
if [ -z "$MONGO_CLEANUP_AUTH_DB" ]; then
    MONGO_CLEANUP_AUTH_DB="admin"
    echo "Using default authentication database: admin"
fi

if [ -z "$MONGO_CLEANUP_AUTH_MECHANISM" ]; then
    MONGO_CLEANUP_AUTH_MECHANISM="SCRAM-SHA-256"
    echo "Using default authentication mechanism: SCRAM-SHA-256"
fi

# Display configuration
echo ""
echo "📋 Cleanup Configuration:"
echo "Host: $MONGO_CLEANUP_HOST"
echo "Target Database: $TARGET_DB"
echo "User: $MONGO_CLEANUP_USER"
echo "Auth DB: $MONGO_CLEANUP_AUTH_DB"
echo "Auth Mechanism: $MONGO_CLEANUP_AUTH_MECHANISM"

# Construct MongoDB URI
MONGO_URI="mongodb://$MONGO_CLEANUP_USER:$MONGO_CLEANUP_PASS@$MONGO_CLEANUP_HOST/$TARGET_DB?authSource=$MONGO_CLEANUP_AUTH_DB&authMechanism=$MONGO_CLEANUP_AUTH_MECHANISM"

# Confirmation prompt
if [ "$FORCE" != true ]; then
    echo ""
    echo "⚠️  DANGER ZONE ⚠️"
    echo "This will permanently delete ALL COLLECTIONS in database: $TARGET_DB"
    echo -n "Type 'DELETE ALL' to confirm: "
    read -r confirmation
    
    if [ "$confirmation" != "DELETE ALL" ]; then
        echo "❌ Operation cancelled"
        exit 0
    fi
fi

echo ""
echo "🚀 Starting cleanup process..."

# Create JavaScript command to list and drop all collections
JS_COMMAND="
try {
    const db = db.getSiblingDB('$TARGET_DB');
    const collections = db.listCollectionNames();
    
    if (collections.length === 0) {
        print('✅ Database is already empty - no collections found');
    } else {
        print('📋 Found ' + collections.length + ' collections:');
        collections.forEach(name => print('  - ' + name));
        
        print('\\n🗑️  Dropping collections...');
        let dropped = 0;
        let failed = 0;
        
        collections.forEach(name => {
            try {
                db.getCollection(name).drop();
                print('✅ Dropped: ' + name);
                dropped++;
            } catch (err) {
                print('❌ Failed to drop: ' + name + ' - ' + err.message);
                failed++;
            }
        });
        
        print('\\n📊 Cleanup Summary:');
        print('  Collections dropped: ' + dropped);
        print('  Failed: ' + failed);
        
        if (failed === 0) {
            print('\\n✅ All collections successfully removed!');
        } else {
            print('\\n⚠️  Some collections could not be removed');
        }
    }
} catch (err) {
    print('❌ Error during cleanup: ' + err.message);
    quit(1);
}
"

# Execute the cleanup using mongosh
echo "Connecting to MongoDB and executing cleanup..."

if echo "$JS_COMMAND" | mongosh "$MONGO_URI" --quiet; then
    echo ""
    echo "✅ Cleanup process completed!"
else
    echo "❌ Cleanup failed!"
    echo ""
    echo "💡 Troubleshooting tips:"
    echo "1. Verify MongoDB connection details"
    echo "2. Check username and password"
    echo "3. Ensure database exists and is accessible"
    echo "4. Try different authentication mechanism (SCRAM-SHA-1)"
    echo "5. Check user permissions for dropping collections"
    exit 1
fi
