@echo off
echo Verifying Python version for Railway deployment...

python --version
echo.

echo Checking Python version compatibility...
python verify-python-version.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Backend is ready for Railway deployment!
) else (
    echo.
    echo ❌ Please fix Python version issues before deploying.
    exit /b 1
)
