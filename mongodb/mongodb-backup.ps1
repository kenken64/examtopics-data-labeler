# MongoDB Backup Script (PowerShell)
# This script creates a backup of MongoDB database using mongodump

param(
    [string]$BackupPath = "backup",
    [switch]$Help
)

if ($Help) {
    Write-Host @"
MongoDB Backup Script (PowerShell)

Usage: .\mongodb-backup.ps1 [-BackupPath <path>] [-Help]

Parameters:
  -BackupPath   Directory to store backup files (default: backup)
  -Help         Show this help message

Environment Variables Required:
  MONGO_BACKUP_HOST     - MongoDB host and port (e.g., localhost:27017)
  MONGO_BACKUP_USER     - MongoDB username
  MONGO_BACKUP_PASS     - MongoDB password
  MONGO_BACKUP_DB       - Database name to backup
  MONGO_BACKUP_AUTH_DB  - Authentication database (optional, default: admin)

Example:
  .\mongodb-backup.ps1 -BackupPath "C:\backups\mongodb"
"@
    exit 0
}

Write-Host "🔄 MongoDB Database Backup Script (PowerShell)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Check if mongodump is available
try {
    $null = Get-Command mongodump -ErrorAction Stop
    Write-Host "✅ mongodump found" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: mongodump not found in PATH!" -ForegroundColor Red
    Write-Host "Please install MongoDB Database Tools: https://www.mongodb.com/try/download/database-tools" -ForegroundColor Yellow
    exit 1
}

# Validate required environment variables
$requiredVars = @('MONGO_BACKUP_HOST', 'MONGO_BACKUP_USER', 'MONGO_BACKUP_PASS', 'MONGO_BACKUP_DB')
foreach ($var in $requiredVars) {
    if (-not (Get-Variable -Name $var -ValueOnly -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Error: $var environment variable not set!" -ForegroundColor Red
        exit 1
    }
}

# Set defaults for optional variables
if (-not $env:MONGO_BACKUP_AUTH_DB) {
    $env:MONGO_BACKUP_AUTH_DB = "admin"
    Write-Host "Using default authentication database: admin" -ForegroundColor Yellow
}

if (-not $env:MONGO_BACKUP_AUTH_MECHANISM) {
    $env:MONGO_BACKUP_AUTH_MECHANISM = "SCRAM-SHA-256"
    Write-Host "Using default authentication mechanism: SCRAM-SHA-256" -ForegroundColor Yellow
}

# Create backup directory with timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$fullBackupPath = Join-Path $BackupPath "$($env:MONGO_BACKUP_DB)_$timestamp"

Write-Host "📁 Creating backup directory: $fullBackupPath" -ForegroundColor Blue
New-Item -ItemType Directory -Path $fullBackupPath -Force | Out-Null

# Display configuration
Write-Host "`n📋 Backup Configuration:" -ForegroundColor Blue
Write-Host "Host: $env:MONGO_BACKUP_HOST" -ForegroundColor White
Write-Host "Database: $env:MONGO_BACKUP_DB" -ForegroundColor White
Write-Host "User: $env:MONGO_BACKUP_USER" -ForegroundColor White
Write-Host "Auth DB: $env:MONGO_BACKUP_AUTH_DB" -ForegroundColor White
Write-Host "Auth Mechanism: $env:MONGO_BACKUP_AUTH_MECHANISM" -ForegroundColor White
Write-Host "Backup Path: $fullBackupPath" -ForegroundColor White

# Construct MongoDB URI
$mongoUri = "mongodb://$($env:MONGO_BACKUP_USER):$($env:MONGO_BACKUP_PASS)@$($env:MONGO_BACKUP_HOST)/$($env:MONGO_BACKUP_DB)?authSource=$($env:MONGO_BACKUP_AUTH_DB)&authMechanism=$($env:MONGO_BACKUP_AUTH_MECHANISM)"

Write-Host "`n🚀 Starting backup process..." -ForegroundColor Green

try {
    # Primary backup method using URI
    Write-Host "Attempting backup with URI authentication..." -ForegroundColor Yellow
    
    $mongodumpArgs = @(
        '--uri', $mongoUri
        '--out', $fullBackupPath
        '--verbose'
    )
    
    & mongodump @mongodumpArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
        Write-Host "📁 Backup location: $fullBackupPath" -ForegroundColor Blue
        
        # Display backup size
        $backupSize = (Get-ChildItem -Recurse $fullBackupPath | Measure-Object -Property Length -Sum).Sum
        $backupSizeMB = [math]::Round($backupSize / 1MB, 2)
        Write-Host "📊 Backup size: $backupSizeMB MB" -ForegroundColor Blue
        
        exit 0
    } else {
        throw "mongodump failed with exit code $LASTEXITCODE"
    }
    
} catch {
    Write-Host "⚠️  Primary method failed, trying fallback method..." -ForegroundColor Yellow
    
    try {
        # Fallback method using separate parameters
        $mongodumpArgs = @(
            '--host', $env:MONGO_BACKUP_HOST
            '--authenticationDatabase', $env:MONGO_BACKUP_AUTH_DB
            '--authenticationMechanism', $env:MONGO_BACKUP_AUTH_MECHANISM
            '--username', $env:MONGO_BACKUP_USER
            '--password', $env:MONGO_BACKUP_PASS
            '--db', $env:MONGO_BACKUP_DB
            '--out', $fullBackupPath
            '--verbose'
        )
        
        & mongodump @mongodumpArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Backup completed successfully with fallback method!" -ForegroundColor Green
            Write-Host "📁 Backup location: $fullBackupPath" -ForegroundColor Blue
        } else {
            throw "Fallback mongodump failed with exit code $LASTEXITCODE"
        }
        
    } catch {
        Write-Host "❌ Both backup methods failed!" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host "`n💡 Troubleshooting tips:" -ForegroundColor Yellow
        Write-Host "1. Verify MongoDB connection details" -ForegroundColor White
        Write-Host "2. Check username and password" -ForegroundColor White
        Write-Host "3. Ensure database exists" -ForegroundColor White
        Write-Host "4. Try different authentication mechanism" -ForegroundColor White
        exit 1
    }
}
