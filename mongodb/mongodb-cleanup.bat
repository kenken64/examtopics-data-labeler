@echo off
REM MongoDB Cleanup Script (Windows Batch)
REM This script removes all collections from a MongoDB database

setlocal enabledelayedexpansion

if "%1"=="/?" goto :help
if "%1"=="--help" goto :help
if "%1"=="-h" goto :help

REM Parse command line arguments
set DATABASE=
set FORCE=false

:parse_args
if "%1"=="" goto :done_parsing
if "%1"=="-d" (
    set DATABASE=%2
    shift
    shift
    goto :parse_args
)
if "%1"=="--database" (
    set DATABASE=%2
    shift
    shift
    goto :parse_args
)
if "%1"=="-f" (
    set FORCE=true
    shift
    goto :parse_args
)
if "%1"=="--force" (
    set FORCE=true
    shift
    goto :parse_args
)
echo Unknown option: %1
goto :help

:done_parsing

echo 🧹 MongoDB Database Cleanup Script (Windows)
echo ==========================================
echo ⚠️  WARNING: This will DELETE ALL COLLECTIONS!

REM Check if mongosh is available
mongosh --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: mongosh not found in PATH!
    echo Please install MongoDB Shell: https://www.mongodb.com/try/download/shell
    exit /b 1
)

echo ✅ mongosh found

REM Validate required environment variables
if "%MONGO_CLEANUP_HOST%"=="" (
    echo ❌ Error: MONGO_CLEANUP_HOST environment variable not set!
    exit /b 1
)

if "%MONGO_CLEANUP_USER%"=="" (
    echo ❌ Error: MONGO_CLEANUP_USER environment variable not set!
    exit /b 1
)

if "%MONGO_CLEANUP_PASS%"=="" (
    echo ❌ Error: MONGO_CLEANUP_PASS environment variable not set!
    exit /b 1
)

REM Determine target database
if not "%DATABASE%"=="" (
    set TARGET_DB=%DATABASE%
) else if not "%MONGO_CLEANUP_DB%"=="" (
    set TARGET_DB=%MONGO_CLEANUP_DB%
) else (
    echo ❌ Error: Database not specified!
    echo Provide -d parameter or set MONGO_CLEANUP_DB environment variable
    exit /b 1
)

REM Set defaults for optional variables
if "%MONGO_CLEANUP_AUTH_DB%"=="" (
    set MONGO_CLEANUP_AUTH_DB=admin
    echo Using default authentication database: admin
)

if "%MONGO_CLEANUP_AUTH_MECHANISM%"=="" (
    set MONGO_CLEANUP_AUTH_MECHANISM=SCRAM-SHA-256
    echo Using default authentication mechanism: SCRAM-SHA-256
)

REM Display configuration
echo.
echo 📋 Cleanup Configuration:
echo Host: %MONGO_CLEANUP_HOST%
echo Target Database: %TARGET_DB%
echo User: %MONGO_CLEANUP_USER%
echo Auth DB: %MONGO_CLEANUP_AUTH_DB%
echo Auth Mechanism: %MONGO_CLEANUP_AUTH_MECHANISM%

REM Construct MongoDB URI
set MONGO_URI=mongodb://%MONGO_CLEANUP_USER%:%MONGO_CLEANUP_PASS%@%MONGO_CLEANUP_HOST%/%TARGET_DB%?authSource=%MONGO_CLEANUP_AUTH_DB%^&authMechanism=%MONGO_CLEANUP_AUTH_MECHANISM%

REM Confirmation prompt
if not "%FORCE%"=="true" (
    echo.
    echo ⚠️  DANGER ZONE ⚠️
    echo This will permanently delete ALL COLLECTIONS in database: %TARGET_DB%
    set /p confirmation="Type 'DELETE ALL' to confirm: "
    
    if not "!confirmation!"=="DELETE ALL" (
        echo ❌ Operation cancelled
        exit /b 0
    )
)

echo.
echo 🚀 Starting cleanup process...

REM Create temporary JavaScript file
set TEMP_JS=%TEMP%\mongodb_cleanup_%RANDOM%.js
echo try { > "%TEMP_JS%"
echo     const db = db.getSiblingDB('%TARGET_DB%'); >> "%TEMP_JS%"
echo     const collections = db.listCollectionNames(); >> "%TEMP_JS%"
echo     if (collections.length === 0) { >> "%TEMP_JS%"
echo         print('✅ Database is already empty - no collections found'); >> "%TEMP_JS%"
echo     } else { >> "%TEMP_JS%"
echo         print('📋 Found ' + collections.length + ' collections:'); >> "%TEMP_JS%"
echo         collections.forEach(name =^> print('  - ' + name)); >> "%TEMP_JS%"
echo         print('\\n🗑️  Dropping collections...'); >> "%TEMP_JS%"
echo         let dropped = 0; >> "%TEMP_JS%"
echo         let failed = 0; >> "%TEMP_JS%"
echo         collections.forEach(name =^> { >> "%TEMP_JS%"
echo             try { >> "%TEMP_JS%"
echo                 db.getCollection(name).drop(); >> "%TEMP_JS%"
echo                 print('✅ Dropped: ' + name); >> "%TEMP_JS%"
echo                 dropped++; >> "%TEMP_JS%"
echo             } catch (err) { >> "%TEMP_JS%"
echo                 print('❌ Failed to drop: ' + name + ' - ' + err.message); >> "%TEMP_JS%"
echo                 failed++; >> "%TEMP_JS%"
echo             } >> "%TEMP_JS%"
echo         }); >> "%TEMP_JS%"
echo         print('\\n📊 Cleanup Summary:'); >> "%TEMP_JS%"
echo         print('  Collections dropped: ' + dropped); >> "%TEMP_JS%"
echo         print('  Failed: ' + failed); >> "%TEMP_JS%"
echo         if (failed === 0) { >> "%TEMP_JS%"
echo             print('\\n✅ All collections successfully removed!'); >> "%TEMP_JS%"
echo         } else { >> "%TEMP_JS%"
echo             print('\\n⚠️  Some collections could not be removed'); >> "%TEMP_JS%"
echo         } >> "%TEMP_JS%"
echo     } >> "%TEMP_JS%"
echo } catch (err) { >> "%TEMP_JS%"
echo     print('❌ Error during cleanup: ' + err.message); >> "%TEMP_JS%"
echo     quit(1); >> "%TEMP_JS%"
echo } >> "%TEMP_JS%"

REM Execute the cleanup using mongosh
echo Connecting to MongoDB and executing cleanup...
mongosh "%MONGO_URI%" --quiet --file "%TEMP_JS%"

REM Clean up temporary file
del "%TEMP_JS%" 2>nul

if errorlevel 1 (
    echo ❌ Cleanup failed!
    echo.
    echo 💡 Troubleshooting tips:
    echo 1. Verify MongoDB connection details
    echo 2. Check username and password
    echo 3. Ensure database exists and is accessible
    echo 4. Try different authentication mechanism
    echo 5. Check user permissions for dropping collections
    exit /b 1
) else (
    echo.
    echo ✅ Cleanup process completed!
)

exit /b 0

:help
echo MongoDB Cleanup Script (Windows Batch)
echo.
echo Usage: %0 [OPTIONS]
echo.
echo Options:
echo     -d, --database DATABASE    Database name to cleanup
echo     -f, --force               Skip confirmation prompt
echo     -h, --help               Show this help message
echo.
echo Environment Variables Required:
echo     MONGO_CLEANUP_HOST       - MongoDB host and port
echo     MONGO_CLEANUP_USER       - MongoDB username
echo     MONGO_CLEANUP_PASS       - MongoDB password
echo     MONGO_CLEANUP_DB         - Database name (used if -d not provided)
echo     MONGO_CLEANUP_AUTH_DB    - Authentication database (optional)
echo.
echo WARNING: This script will DELETE ALL COLLECTIONS in the specified database!
echo.
echo Examples:
echo     %0 -d test -f
echo     %0 --database mydb --force
exit /b 0
