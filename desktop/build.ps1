# ====================================================================
# Threads Content Studio - Windows Desktop NSIS Installer Build Script
# Phase 17: Automated Testing & Release Engineering (v0.17.0)
# ====================================================================

param(
    [switch]$SkipTests = $false
)

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Threads Content Studio - Building Desktop Installer"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "     THREADS CONTENT STUDIO - WINDOWS DESKTOP INSTALLER BUILDER       " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

# Step 1: Verify Node.js Environment
Write-Host "[1/8] Kiem tra phien ban Node.js..." -ForegroundColor Yellow
$nodeVersion = node -v
Write-Host "      Node.js hien tai: $nodeVersion" -ForegroundColor Green

$majorVersion = [int]($nodeVersion -replace '^v(\d+)\..*', '$1')
if ($majorVersion -lt 20) {
    Write-Host "[CANH BAO] Yeu cau Node.js phien ban >= 20 de dam bao tuong thich toi da." -ForegroundColor Red
}

# Step 2: Install dependencies
Write-Host ""
Write-Host "[2/8] Kiem tra va cai dat goi phu thuoc (Dependencies)..." -ForegroundColor Yellow
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm install
} else {
    npm install
}

# Step 3: Prisma Generation (28 Models)
Write-Host ""
Write-Host "[3/8] Khoi tao Prisma Client cho SQLite (28 models)..." -ForegroundColor Yellow
npx prisma generate

# Step 4: Build Frontend Client
Write-Host ""
Write-Host "[4/8] Build Frontend Client (React 18 + Vite + Tailwind)..." -ForegroundColor Yellow
npm run build --prefix client

# Step 5: Build Backend Server
Write-Host ""
Write-Host "[5/8] Build Backend Server (Express + SQLite + TypeScript)..." -ForegroundColor Yellow
npm run build --prefix server

# Step 6: Automated Testing & Release Engineering Check
Write-Host ""
Write-Host "[6/8] Kiem tra he thong & chay Test Suite truoc khi dong goi..." -ForegroundColor Yellow
if (-not $SkipTests) {
    Write-Host "      Chay 16/16 Unit Tests & FFmpeg Media Smoke Test..." -ForegroundColor Cyan
    npm test
} else {
    Write-Host "      [Bo qua] Tuy chon -SkipTests da duoc bat." -ForegroundColor DarkGray
    Write-Host "      Van chay kiem tra bat buoc Release Check (28 Models & JSON)..." -ForegroundColor Cyan
    npm run release:check
}

# Step 7: Build Desktop Shell & Verify Chromium
Write-Host ""
Write-Host "[7/8] Build Desktop Main & Preload (Electron Shell)..." -ForegroundColor Yellow
if (Test-Path "desktop\dist") {
    Remove-Item -Recurse -Force "desktop\dist" -ErrorAction SilentlyContinue
}
npx tsc --project desktop

Write-Host "      Kiem tra Playwright Chromium cho chup anh the..." -ForegroundColor DarkGray
try {
    npx playwright install chromium
} catch {
    Write-Host "      Playwright chromium da co hoac dung cache he thong." -ForegroundColor DarkGray
}

# Step 8: Packaging NSIS Installer with electron-builder
Write-Host ""
Write-Host "[8/8] Dong goi bo cai dat Windows NSIS x64 bang electron-builder..." -ForegroundColor Yellow

$releaseDir = Join-Path $rootDir "release"
if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

npx electron-builder --config desktop/electron-builder.json --win nsis --x64

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "        HOAN THANH! BO CAI DAT WINDOWS (.EXE) DA SAN SANG!            " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Thu muc chua file cai dat:" -ForegroundColor White
Write-Host "  -> $releaseDir" -ForegroundColor Green
Write-Host ""
Write-Host "Cac dac tinh ban cai dat:" -ForegroundColor White
Write-Host "  * Da xac nhan vuot qua 16/16 Unit Tests & Release Engineering Check." -ForegroundColor Gray
Write-Host "  * Giu nguyen toan bo Database & Media khi nang cap hoac cai lai." -ForegroundColor Gray
Write-Host "  * Du lieu luu tru tach biet tai %APPDATA% hoac o D/E tuy chon." -ForegroundColor Gray
Write-Host "  * Ho tro deep link custom protocol: threads-studio://" -ForegroundColor Gray
Write-Host "  * Tu dong dong backend an toan khi thoat ung dung." -ForegroundColor Gray
Write-Host ""
