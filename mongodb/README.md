# MongoDB Backup and Restore Scripts

This directory contains scripts to backup and restore the MongoDB `awscert` database.

## Files

- `mongodb-backup.sh` - Bash script for Unix/Linux/macOS
- `mongodb-backup.bat` - Batch script for Windows
- `mongodb-restore.sh` - Bash script for Unix/Linux/macOS  
- `mongodb-restore.bat` - Batch script for Windows

## Backup Process

### Local Backup (from localhost)
```bash
# Unix/Linux/macOS
./mongodb-backup.sh

# Windows
mongodb-backup.bat
```

**What it does:**
- Connects to local MongoDB instance at `localhost:27017`
- Backs up the `awscert` database
- Saves backup to `./backup/awscert/` directory
- Provides backup status and size information

## Restore Process

### Remote Restore (to Railway MongoDB)
```bash
# Unix/Linux/macOS
./mongodb-restore.sh

# Windows
mongodb-restore.bat
```

**What it does:**
- Reads backup from `./backup/awscert/` directory
- Connects to remote MongoDB at `metro.proxy.rlwy.net:20769`
- Restores data to the `test` database
- Includes safety confirmation prompt

## Prerequisites

1. **MongoDB Tools**: Ensure `mongodump` and `mongorestore` are installed
   ```bash
   # Install MongoDB tools
   # macOS: brew install mongodb/brew/mongodb-database-tools
   # Ubuntu: sudo apt install mongodb-database-tools
   # Windows: Download from MongoDB official site
   ```

2. **Network Access**: Ensure connectivity to both local and remote MongoDB instances

3. **Permissions**: Make scripts executable (Unix/Linux/macOS)
   ```bash
   chmod +x mongodb-backup.sh
   chmod +x mongodb-restore.sh
   ```

## Connection Details

### Source (Backup)
- **Host**: `localhost:27017`
- **Database**: `awscert`
- **Authentication**: None (local instance)

### Target (Restore)
- **Host**: Set via `MONGO_RESTORE_HOST` environment variable
- **Database**: Set via `MONGO_RESTORE_DB` environment variable (defaults to 'test')
- **Authentication**: Set via `MONGO_RESTORE_USER` and `MONGO_RESTORE_PASS` environment variables

## Environment Variables Setup

The restore scripts require environment variables for security. **DO NOT hardcode credentials in scripts.**

### Method 1: Environment Variables Setup Files

Use the provided setup files:

```bash
# Unix/Linux/macOS
source restore-env-vars.sh

# Windows
restore-env-vars.bat
```

### Method 2: Manual Setup

```bash
# Unix/Linux/macOS
export MONGO_RESTORE_HOST=your-mongo-host:port
export MONGO_RESTORE_USER=your-username
export MONGO_RESTORE_PASS=your-password
export MONGO_RESTORE_DB=your-target-database

# Windows
set MONGO_RESTORE_HOST=your-mongo-host:port
set MONGO_RESTORE_USER=your-username
set MONGO_RESTORE_PASS=your-password
set MONGO_RESTORE_DB=your-target-database
```

### Method 3: .env File

1. Copy `.env.example` to `.env`
2. Update with your credentials
3. Source the file before running scripts

**⚠️ Important**: Add `.env` to your `.gitignore` to prevent committing credentials!

## Safety Features

- ✅ **Backup verification**: Checks if backup completed successfully
- ✅ **Directory validation**: Ensures backup exists before restore
- ✅ **User confirmation**: Prompts before executing restore
- ✅ **Error handling**: Provides clear error messages
- ✅ **Logging**: Shows timestamps and operation status

## Example Usage

```bash
# 1. Set up environment variables
source restore-env-vars.sh  # or restore-env-vars.bat on Windows

# 2. Create backup
./mongodb-backup.sh

# 3. Verify backup
ls -la ./backup/awscert/

# 4. Restore to remote
./mongodb-restore.sh
```

## Troubleshooting

### Common Issues

1. **Command not found**: Install MongoDB database tools
2. **Connection refused**: Check MongoDB service status
3. **Authentication failed**: Verify connection string credentials
4. **Permission denied**: Make scripts executable with `chmod +x`

### Log Output
Both scripts provide detailed logging including:
- Start/end timestamps
- Backup size information
- Success/failure status
- Error codes when applicable

## Security Notes

🔒 **IMPORTANT SECURITY PRACTICES**:

1. **Never hardcode credentials** in scripts or commit them to version control
2. **Use environment variables** for all sensitive information
3. **Add `.env` files to `.gitignore`** to prevent accidental commits
4. **Rotate credentials regularly** and use strong passwords
5. **Limit database permissions** to only what's necessary for backup/restore
6. **Use secure connections** (TLS/SSL) when available
7. **Store backup files securely** and encrypt sensitive backups

### Files and Permissions:
- Add `restore-env-vars.sh`, `restore-env-vars.bat`, and `.env` to `.gitignore`
- Set restrictive file permissions: `chmod 600 .env restore-env-vars.*`
- Ensure scripts are executable: `chmod +x *.sh`

### Environment Variables:
- `MONGO_RESTORE_HOST` - MongoDB host and port
- `MONGO_RESTORE_USER` - Username for authentication  
- `MONGO_RESTORE_PASS` - Password for authentication
- `MONGO_RESTORE_DB` - Target database name (optional, defaults to 'test')
