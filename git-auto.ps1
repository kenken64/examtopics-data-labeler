# Git automation script for PowerShell
# Usage: .\git-auto.ps1
# Reads commit message from commit-message.txt file

param(
    [Parameter(Mandatory=$false)]
    [string]$CommitMessageFile = "commit-message.txt"
)

# Check if commit message file exists
if (-not (Test-Path $CommitMessageFile)) {
    Write-Host "Error: Commit message file '$CommitMessageFile' not found" -ForegroundColor Red
    Write-Host "Please create a '$CommitMessageFile' file with your commit message" -ForegroundColor Yellow
    exit 1
}

# Read commit message from file
$CommitMessage = Get-Content $CommitMessageFile -Raw
$CommitMessage = $CommitMessage.Trim()

if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    Write-Host "Error: Commit message file '$CommitMessageFile' is empty" -ForegroundColor Red
    Write-Host "Please add your commit message to '$CommitMessageFile'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Checking git status..." -ForegroundColor Cyan
git status

Write-Host ""
Write-Host "Adding all changes..." -ForegroundColor Cyan
git add .

Write-Host ""
Write-Host "Committing changes with message from '$CommitMessageFile':" -ForegroundColor Cyan
Write-Host "$CommitMessage" -ForegroundColor White
git commit -F "$CommitMessageFile"

Write-Host ""
Write-Host "Getting current branch name..." -ForegroundColor Cyan
$CurrentBranch = git branch --show-current
Write-Host "Current branch: $CurrentBranch" -ForegroundColor Green

Write-Host ""
Write-Host "Pushing to origin/$CurrentBranch..." -ForegroundColor Cyan
git push origin $CurrentBranch

Write-Host ""
Write-Host "Git workflow completed!" -ForegroundColor Green
