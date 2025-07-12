@echo off
echo Updating npm lockfile for Railway deployment...

REM Remove existing lockfile
if exist package-lock.json del package-lock.json

REM Reinstall packages to generate fresh lockfile
npm install

echo Lockfile updated successfully!
echo Ready for Railway deployment
