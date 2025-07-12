@echo off
echo Telegram Bot Manager for Windows
echo.

if "%1"=="kill" (
    echo Killing existing bot processes...
    node bot-manager.js kill
    goto :end
)

if "%1"=="start" (
    echo Starting bot with cleanup...
    node bot-manager.js start
    goto :end
)

if "%1"=="restart" (
    echo Restarting bot...
    node bot-manager.js kill
    timeout /t 2 /nobreak >nul
    node bot-manager.js start
    goto :end
)

echo Usage:
echo   bot.bat kill     - Kill any existing bot processes
echo   bot.bat start    - Kill existing processes and start fresh bot
echo   bot.bat restart  - Restart the bot (kill + start)
echo   node bot.js      - Start bot normally (may conflict)
echo.
echo Recommended: Use "bot.bat start" to avoid conflicts

:end
