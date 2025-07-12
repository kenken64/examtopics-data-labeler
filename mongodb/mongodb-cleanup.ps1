# MongoDB Cleanup Script (PowerShell)
# This script removes all collections from a MongoDB database

param(
    [string]$Database,
    [switch]$Help,
    [switch]$Force
)

if ($Help) {
    Write-Host @"
MongoDB Cleanup Script (PowerShell)

Usage: .\mongodb-cleanup.ps1 [-Database <name>] [-Force] [-Help]

Parameters:
  -Database     Database name to cleanup (optional, uses env var if not provided)
  -Force        Skip confirmation prompt
  -Help         Show this help message

Environment Variables Required:
  MONGO_CLEANUP_HOST       - MongoDB host and port (e.g., localhost:27017)
  MONGO_CLEANUP_USER       - MongoDB username
  MONGO_CLEANUP_PASS       - MongoDB password
  MONGO_CLEANUP_DB         - Database name (used if -Database not provided)
  MONGO_CLEANUP_AUTH_DB    - Authentication database (optional, default: admin)

WARNING: This script will DELETE ALL COLLECTIONS in the specified database!

Example:
  .\mongodb-cleanup.ps1 -Database "test" -Force
"@
    exit 0
}

Write-Host "🧹 MongoDB Database Cleanup Script (PowerShell)" -ForegroundColor Red
Write-Host "===============================================" -ForegroundColor Red
Write-Host "⚠️  WARNING: This will DELETE ALL COLLECTIONS!" -ForegroundColor Yellow

# Check if mongosh is available
try {
    $null = Get-Command mongosh -ErrorAction Stop
    Write-Host "✅ mongosh found" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: mongosh not found in PATH!" -ForegroundColor Red
    Write-Host "Please install MongoDB Shell: https://www.mongodb.com/try/download/shell" -ForegroundColor Yellow
    exit 1
}

# Validate required environment variables
$requiredVars = @('MONGO_CLEANUP_HOST', 'MONGO_CLEANUP_USER', 'MONGO_CLEANUP_PASS')
foreach ($var in $requiredVars) {
    if (-not (Get-Variable -Name $var -ValueOnly -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Error: $var environment variable not set!" -ForegroundColor Red
        exit 1
    }
}

# Determine target database
if ($Database) {
    $targetDb = $Database
} elseif ($env:MONGO_CLEANUP_DB) {
    $targetDb = $env:MONGO_CLEANUP_DB
} else {
    Write-Host "❌ Error: Database not specified!" -ForegroundColor Red
    Write-Host "Provide -Database parameter or set MONGO_CLEANUP_DB environment variable" -ForegroundColor Yellow
    exit 1
}

# Set defaults for optional variables
if (-not $env:MONGO_CLEANUP_AUTH_DB) {
    $env:MONGO_CLEANUP_AUTH_DB = "admin"
    Write-Host "Using default authentication database: admin" -ForegroundColor Yellow
}

if (-not $env:MONGO_CLEANUP_AUTH_MECHANISM) {
    $env:MONGO_CLEANUP_AUTH_MECHANISM = "SCRAM-SHA-256"
    Write-Host "Using default authentication mechanism: SCRAM-SHA-256" -ForegroundColor Yellow
}

# Display configuration
Write-Host "`n📋 Cleanup Configuration:" -ForegroundColor Blue
Write-Host "Host: $env:MONGO_CLEANUP_HOST" -ForegroundColor White
Write-Host "Target Database: $targetDb" -ForegroundColor Red
Write-Host "User: $env:MONGO_CLEANUP_USER" -ForegroundColor White
Write-Host "Auth DB: $env:MONGO_CLEANUP_AUTH_DB" -ForegroundColor White
Write-Host "Auth Mechanism: $env:MONGO_CLEANUP_AUTH_MECHANISM" -ForegroundColor White

# Construct MongoDB URI
$mongoUri = "mongodb://$($env:MONGO_CLEANUP_USER):$($env:MONGO_CLEANUP_PASS)@$($env:MONGO_CLEANUP_HOST)/$targetDb?authSource=$($env:MONGO_CLEANUP_AUTH_DB)&authMechanism=$($env:MONGO_CLEANUP_AUTH_MECHANISM)"

# Confirmation prompt
if (-not $Force) {
    Write-Host "`n⚠️  DANGER ZONE ⚠️" -ForegroundColor Red
    Write-Host "This will permanently delete ALL COLLECTIONS in database: $targetDb" -ForegroundColor Yellow
    $confirmation = Read-Host "Type 'DELETE ALL' to confirm"
    
    if ($confirmation -ne 'DELETE ALL') {
        Write-Host "❌ Operation cancelled" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "`n🚀 Starting cleanup process..." -ForegroundColor Red

# Create JavaScript command to list and drop all collections
$jsCommand = @"
try {
    const db = db.getSiblingDB('$targetDb');
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
"@

try {
    # Execute the cleanup using mongosh
    Write-Host "Connecting to MongoDB and executing cleanup..." -ForegroundColor Yellow
    
    $tempScript = [System.IO.Path]::GetTempFileName() + ".js"
    $jsCommand | Out-File -FilePath $tempScript -Encoding UTF8
    
    $mongoshArgs = @(
        $mongoUri
        '--quiet'
        '--file', $tempScript
    )
    
    & mongosh @mongoshArgs
    
    Remove-Item $tempScript -Force -ErrorAction SilentlyContinue
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Cleanup process completed!" -ForegroundColor Green
    } else {
        throw "mongosh failed with exit code $LASTEXITCODE"
    }
    
} catch {
    Write-Host "❌ Cleanup failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`n💡 Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Verify MongoDB connection details" -ForegroundColor White
    Write-Host "2. Check username and password" -ForegroundColor White
    Write-Host "3. Ensure database exists and is accessible" -ForegroundColor White
    Write-Host "4. Try different authentication mechanism" -ForegroundColor White
    Write-Host "5. Check user permissions for dropping collections" -ForegroundColor White
    exit 1
}
