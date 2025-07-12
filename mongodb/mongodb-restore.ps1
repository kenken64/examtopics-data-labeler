# MongoDB Restore Script (PowerShell)
# This script restores MongoDB database from backup using mongorestore

param(
    [string]$BackupPath,
    [switch]$Help,
    [switch]$Drop
)

if ($Help) {
    Write-Host @"
MongoDB Restore Script (PowerShell)

Usage: .\mongodb-restore.ps1 -BackupPath <path> [-Drop] [-Help]

Parameters:
  -BackupPath   Path to backup directory (required)
  -Drop         Drop existing collections before restore
  -Help         Show this help message

Environment Variables Required:
  MONGO_RESTORE_HOST       - MongoDB host and port (e.g., localhost:27017)
  MONGO_RESTORE_USER       - MongoDB username
  MONGO_RESTORE_PASS       - MongoDB password
  MONGO_RESTORE_DB         - Target database name (optional, default: test)
  MONGO_RESTORE_AUTH_DB    - Authentication database (optional, default: admin)

Example:
  .\mongodb-restore.ps1 -BackupPath "C:\backups\mongodb\mydb_20240713_143022" -Drop
"@
    exit 0
}

Write-Host "🔄 MongoDB Database Restore Script (PowerShell)" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Validate BackupPath parameter
if (-not $BackupPath) {
    Write-Host "❌ Error: BackupPath parameter is required!" -ForegroundColor Red
    Write-Host "Use -Help for usage information" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $BackupPath)) {
    Write-Host "❌ Error: Backup path does not exist: $BackupPath" -ForegroundColor Red
    exit 1
}

# Check if mongorestore is available
try {
    $null = Get-Command mongorestore -ErrorAction Stop
    Write-Host "✅ mongorestore found" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: mongorestore not found in PATH!" -ForegroundColor Red
    Write-Host "Please install MongoDB Database Tools: https://www.mongodb.com/try/download/database-tools" -ForegroundColor Yellow
    exit 1
}

# Validate required environment variables
$requiredVars = @('MONGO_RESTORE_HOST', 'MONGO_RESTORE_USER', 'MONGO_RESTORE_PASS')
foreach ($var in $requiredVars) {
    if (-not (Get-Variable -Name $var -ValueOnly -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Error: $var environment variable not set!" -ForegroundColor Red
        Write-Host "💡 Note: Use 'mongo' as username when authSource=admin" -ForegroundColor Yellow
        exit 1
    }
}

# Set defaults for optional variables
if (-not $env:MONGO_RESTORE_DB) {
    $env:MONGO_RESTORE_DB = "test"
    Write-Host "Using default target database: test" -ForegroundColor Yellow
}

if (-not $env:MONGO_RESTORE_AUTH_DB) {
    $env:MONGO_RESTORE_AUTH_DB = "admin"
    Write-Host "Using default authentication database: admin" -ForegroundColor Yellow
}

if (-not $env:MONGO_RESTORE_AUTH_MECHANISM) {
    $env:MONGO_RESTORE_AUTH_MECHANISM = "SCRAM-SHA-256"
    Write-Host "Using default authentication mechanism: SCRAM-SHA-256" -ForegroundColor Yellow
}

# Display configuration
Write-Host "`n📋 Restore Configuration:" -ForegroundColor Blue
Write-Host "Host: $env:MONGO_RESTORE_HOST" -ForegroundColor White
Write-Host "Target Database: $env:MONGO_RESTORE_DB" -ForegroundColor White
Write-Host "User: $env:MONGO_RESTORE_USER" -ForegroundColor White
Write-Host "Auth DB: $env:MONGO_RESTORE_AUTH_DB" -ForegroundColor White
Write-Host "Auth Mechanism: $env:MONGO_RESTORE_AUTH_MECHANISM" -ForegroundColor White
Write-Host "Backup Path: $BackupPath" -ForegroundColor White
Write-Host "Drop Collections: $(if ($Drop) { 'Yes' } else { 'No' })" -ForegroundColor White

# Construct MongoDB URI
$mongoUri = "mongodb://$($env:MONGO_RESTORE_USER):$($env:MONGO_RESTORE_PASS)@$($env:MONGO_RESTORE_HOST)/$($env:MONGO_RESTORE_DB)?authSource=$($env:MONGO_RESTORE_AUTH_DB)&authMechanism=$($env:MONGO_RESTORE_AUTH_MECHANISM)"

Write-Host "`n🚀 Starting restore process..." -ForegroundColor Green

try {
    # Primary restore method using URI
    Write-Host "Attempting restore with URI authentication..." -ForegroundColor Yellow
    
    $mongorestoreArgs = @(
        '--uri', $mongoUri
        '--dir', $BackupPath
        '--verbose'
    )
    
    if ($Drop) {
        $mongorestoreArgs += '--drop'
    }
    
    & mongorestore @mongorestoreArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Restore completed successfully!" -ForegroundColor Green
        Write-Host "🎯 Database '$($env:MONGO_RESTORE_DB)' restored from: $BackupPath" -ForegroundColor Blue
        exit 0
    } else {
        throw "mongorestore failed with exit code $LASTEXITCODE"
    }
    
} catch {
    Write-Host "⚠️  Primary method failed, trying fallback method..." -ForegroundColor Yellow
    
    try {
        # Fallback method using separate parameters
        $mongorestoreArgs = @(
            '--host', $env:MONGO_RESTORE_HOST
            '--authenticationDatabase', $env:MONGO_RESTORE_AUTH_DB
            '--authenticationMechanism', $env:MONGO_RESTORE_AUTH_MECHANISM
            '--username', $env:MONGO_RESTORE_USER
            '--password', $env:MONGO_RESTORE_PASS
            '--db', $env:MONGO_RESTORE_DB
            '--dir', $BackupPath
            '--verbose'
        )
        
        if ($Drop) {
            $mongorestoreArgs += '--drop'
        }
        
        & mongorestore @mongorestoreArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Restore completed successfully with fallback method!" -ForegroundColor Green
            Write-Host "🎯 Database '$($env:MONGO_RESTORE_DB)' restored from: $BackupPath" -ForegroundColor Blue
        } else {
            throw "Fallback mongorestore failed with exit code $LASTEXITCODE"
        }
        
    } catch {
        Write-Host "❌ Both restore methods failed!" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host "`n💡 Troubleshooting tips:" -ForegroundColor Yellow
        Write-Host "1. Verify MongoDB connection details" -ForegroundColor White
        Write-Host "2. Check username and password" -ForegroundColor White
        Write-Host "3. Ensure target database is accessible" -ForegroundColor White
        Write-Host "4. Try different authentication mechanism (SCRAM-SHA-1)" -ForegroundColor White
        Write-Host "5. Verify backup directory structure" -ForegroundColor White
        exit 1
    }
}
