# Git automation script for PowerShell
# Usage: .\git-auto.ps1 "Your commit message"

param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage
)

if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    Write-Host "Error: Please provide a commit message" -ForegroundColor Red
    Write-Host "Usage: .\git-auto.ps1 `"Your commit message`"" -ForegroundColor Yellow
    exit 1
}

Write-Host "Checking git status..." -ForegroundColor Cyan
git status

Write-Host ""
Write-Host "Adding all changes..." -ForegroundColor Cyan
git add .

Write-Host ""
Write-Host "Committing changes with message: '$CommitMessage'" -ForegroundColor Cyan
git commit -m "$CommitMessage"

Write-Host ""
Write-Host "Getting current branch name..." -ForegroundColor Cyan
$CurrentBranch = git branch --show-current
Write-Host "Current branch: $CurrentBranch" -ForegroundColor Green

Write-Host ""
Write-Host "Pushing to origin/$CurrentBranch..." -ForegroundColor Cyan
git push origin $CurrentBranch

Write-Host ""
Write-Host "Git workflow completed!" -ForegroundColor Green
