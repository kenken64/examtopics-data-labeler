@echo off
echo Updating pnpm lockfile for Railway deployment...

REM Remove existing lockfile
if exist pnpm-lock.yaml del pnpm-lock.yaml

REM Reinstall packages to generate fresh lockfile
pnpm install

echo Lockfile updated successfully!
echo Ready for Railway deployment with --frozen-lockfile
