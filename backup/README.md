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
- **Host**: `metro.proxy.rlwy.net:20769`
- **Database**: `test`
- **Authentication**: Embedded in connection string
- **Username**: `mongo`
- **Password**: `LljBYulYQHFmXxYZVFjhYHyJtosRSnaN`

## Safety Features

- ✅ **Backup verification**: Checks if backup completed successfully
- ✅ **Directory validation**: Ensures backup exists before restore
- ✅ **User confirmation**: Prompts before executing restore
- ✅ **Error handling**: Provides clear error messages
- ✅ **Logging**: Shows timestamps and operation status

## Example Usage

```bash
# 1. Create backup
./mongodb-backup.sh

# 2. Verify backup
ls -la ./backup/awscert/

# 3. Restore to remote
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

⚠️ **Important**: The restore script contains database credentials. Ensure:
- Scripts are not committed to public repositories with real credentials
- File permissions restrict access to authorized users only
- Consider using environment variables for sensitive information
