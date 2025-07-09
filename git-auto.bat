@echo off
REM Git automation script for Windows Batch
REM Usage: git-auto.bat "Your commit message"

if "%~1"=="" (
    echo Error: Please provide a commit message
    echo Usage: git-auto.bat "Your commit message"
    exit /b 1
)

set COMMIT_MESSAGE=%~1

echo 🔍 Checking git status...
git status

echo.
echo 📝 Adding all changes...
git add .

echo.
echo 💾 Committing changes with message: '%COMMIT_MESSAGE%'
git commit -m "%COMMIT_MESSAGE%"

echo.
echo 🚀 Getting current branch name...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%

echo.
echo 📤 Pushing to origin/%CURRENT_BRANCH%...
git push origin %CURRENT_BRANCH%

echo.
echo ✅ Git workflow completed!
