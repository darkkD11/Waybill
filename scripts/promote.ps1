<#
.SYNOPSIS
    Promote dev branch to production (main).

.DESCRIPTION
    Safely merges the dev branch into main and pushes to origin.
    Checks for uncommitted changes before proceeding.

.USAGE
    .\scripts\promote.ps1
    .\scripts\promote.ps1 -Message "Release v1.2"
#>

param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Promote Dev -> Production (main)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check we're on the dev branch
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "dev") {
    Write-Host "[ERROR] You must be on the 'dev' branch to promote." -ForegroundColor Red
    Write-Host "  Current branch: $currentBranch" -ForegroundColor Yellow
    Write-Host "  Run: git checkout dev" -ForegroundColor Yellow
    exit 1
}

# 2. Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "[ERROR] You have uncommitted changes:" -ForegroundColor Red
    Write-Host $status -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Commit or stash your changes first, then re-run this script." -ForegroundColor Yellow
    exit 1
}

# 3. Pull latest dev
Write-Host "[1/5] Pulling latest dev..." -ForegroundColor Green
git pull origin dev

# 4. Switch to main
Write-Host "[2/5] Switching to main..." -ForegroundColor Green
git checkout main

# 5. Pull latest main
Write-Host "[3/5] Pulling latest main..." -ForegroundColor Green
git pull origin main

# 6. Merge dev into main
Write-Host "[4/5] Merging dev into main..." -ForegroundColor Green
if ($Message) {
    git merge dev -m $Message
} else {
    git merge dev -m "chore: promote dev to production"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Merge conflict detected!" -ForegroundColor Red
    Write-Host "  Resolve conflicts, commit, then push manually:" -ForegroundColor Yellow
    Write-Host "    git add ." -ForegroundColor Yellow
    Write-Host "    git commit" -ForegroundColor Yellow
    Write-Host "    git push origin main" -ForegroundColor Yellow
    Write-Host "    git checkout dev" -ForegroundColor Yellow
    exit 1
}

# 7. Push to origin
Write-Host "[5/5] Pushing to origin..." -ForegroundColor Green
git push origin main

# 8. Switch back to dev
Write-Host ""
Write-Host "Switching back to dev branch..." -ForegroundColor Green
git checkout dev

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Successfully promoted to production!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
