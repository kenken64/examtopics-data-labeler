@echo off
REM Git automation script for Windows Batch
REM Usage: git-auto.bat [commit-message-file]
REM Reads commit message from commit-message.txt file by default

REM Set default commit message file
if "%~1"=="" (
    set COMMIT_MESSAGE_FILE=commit-message.txt
) else (
    set COMMIT_MESSAGE_FILE=%~1
)

REM Check if commit message file exists
if not exist "%COMMIT_MESSAGE_FILE%" (
    echo ❌ Error: Commit message file '%COMMIT_MESSAGE_FILE%' not found
    echo 📝 Please create a '%COMMIT_MESSAGE_FILE%' file with your commit message
    exit /b 1
)

REM Check if commit message file is empty
for %%A in ("%COMMIT_MESSAGE_FILE%") do set SIZE=%%~zA
if %SIZE% equ 0 (
    echo ❌ Error: Commit message file '%COMMIT_MESSAGE_FILE%' is empty
    echo 📝 Please add your commit message to '%COMMIT_MESSAGE_FILE%'
    exit /b 1
)

echo 🔍 Checking git status...
git status

echo.
echo 📝 Adding all changes...
git add .

echo.
echo 💾 Committing changes with message from '%COMMIT_MESSAGE_FILE%':
type "%COMMIT_MESSAGE_FILE%"
git commit -F "%COMMIT_MESSAGE_FILE%"

echo.
echo 🚀 Getting current branch name...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%

echo.
echo 📤 Pushing to origin/%CURRENT_BRANCH%...
git push origin %CURRENT_BRANCH%

echo.
echo ✅ Git workflow completed!
