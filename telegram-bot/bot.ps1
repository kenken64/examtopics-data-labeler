param(
    [Parameter(Position=0)]
    [ValidateSet("kill", "start", "restart", "status")]
    [string]$Action = "help"
)

function Show-Help {
    Write-Host "Telegram Bot Manager for Windows PowerShell" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\bot.ps1 kill     - Kill any existing bot processes" -ForegroundColor Green
    Write-Host "  .\bot.ps1 start    - Kill existing processes and start fresh bot" -ForegroundColor Green
    Write-Host "  .\bot.ps1 restart  - Restart the bot (kill + start)" -ForegroundColor Green
    Write-Host "  .\bot.ps1 status   - Check if bot is running" -ForegroundColor Green
    Write-Host ""
    Write-Host "Recommended: Use '.\bot.ps1 start' to avoid conflicts" -ForegroundColor Magenta
}

function Get-BotProcesses {
    $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*bot.js*" -or $_.ProcessName -eq "telegram-aws-cert-bot"
    }
    return $processes
}

function Stop-BotProcesses {
    Write-Host "Searching for existing bot processes..." -ForegroundColor Yellow
    
    $botProcesses = Get-BotProcesses
    
    if ($botProcesses.Count -eq 0) {
        Write-Host "No existing bot processes found." -ForegroundColor Green
        return
    }
    
    Write-Host "Found $($botProcesses.Count) bot process(es). Terminating..." -ForegroundColor Yellow
    
    foreach ($process in $botProcesses) {
        try {
            Write-Host "Stopping process $($process.Id) ($($process.ProcessName))" -ForegroundColor Red
            Stop-Process -Id $process.Id -Force
            Write-Host "Successfully terminated process $($process.Id)" -ForegroundColor Green
        }
        catch {
            Write-Host "Failed to terminate process $($process.Id): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Start-Sleep -Seconds 2
}

function Show-BotStatus {
    $botProcesses = Get-BotProcesses
    
    if ($botProcesses.Count -eq 0) {
        Write-Host "Bot Status: NOT RUNNING" -ForegroundColor Red
    } else {
        Write-Host "Bot Status: RUNNING ($($botProcesses.Count) process(es))" -ForegroundColor Green
        foreach ($process in $botProcesses) {
            Write-Host "  - Process ID: $($process.Id), Name: $($process.ProcessName)" -ForegroundColor Cyan
        }
    }
}

function Start-Bot {
    Write-Host "Starting Telegram Bot..." -ForegroundColor Yellow
    try {
        & node bot.js
    }
    catch {
        Write-Host "Failed to start bot: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Main logic
switch ($Action) {
    "kill" {
        Stop-BotProcesses
    }
    "start" {
        Write-Host "Starting bot with cleanup..." -ForegroundColor Cyan
        Stop-BotProcesses
        Start-Sleep -Seconds 1
        Start-Bot
    }
    "restart" {
        Write-Host "Restarting bot..." -ForegroundColor Cyan
        Stop-BotProcesses
        Start-Sleep -Seconds 2
        Start-Bot
    }
    "status" {
        Show-BotStatus
    }
    default {
        Show-Help
    }
}
